import { afterEach, describe, expect, it, vi } from "vitest";

import { buildConfirmationEmail, sendOrderConfirmation } from "@/lib/mailgun";
import type { ConfirmationOrder } from "@/lib/mailgun";

const order: ConfirmationOrder = {
  id: "abcd1234-eeee-4fff-8aaa-bbbbccccdddd",
  customerName: "Ada Lovelace",
  customerEmail: "ada@example.com",
  subtotal: 178,
  createdAt: "2026-10-01T12:00:00.000Z",
  items: [
    { name: "Compact Mechanical Keyboard", quantity: 2, lineTotal: 178 },
  ],
};

describe("buildConfirmationEmail (PRD §15 contents)", () => {
  const { subject, text } = buildConfirmationEmail(order);

  it("includes the order reference", () => {
    expect(text).toContain(order.id);
    expect(subject).toContain(order.id.slice(0, 8));
  });

  it("includes the order date", () => {
    expect(text).toContain("Oct 1, 2026");
    expect(text).toContain("UTC");
  });

  it("includes products, quantities, and line totals", () => {
    expect(text).toContain("Compact Mechanical Keyboard x 2");
    expect(text).toContain("$178.00");
  });

  it("includes subtotal and total", () => {
    expect(text).toContain("Subtotal: $178.00");
    expect(text).toContain("Total: $178.00");
  });

  it("includes a confirmation message and honest demo framing", () => {
    expect(text).toContain("received and saved");
    expect(text).toContain("Payment status: awaiting payment");
  });
});

describe("sendOrderConfirmation failure isolation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns not_configured (never throws) when env is missing", async () => {
    vi.stubEnv("MAILGUN_API_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await sendOrderConfirmation(order);
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("not_configured");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("reports HTTP errors without throwing", async () => {
    vi.stubEnv("MAILGUN_API_KEY", "key-test");
    vi.stubEnv("MAILGUN_DOMAIN", "mg.example.com");
    vi.stubEnv("MAILGUN_FROM_EMAIL", "NexaGear <orders@mg.example.com>");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "unauthorized" }),
    );

    const result = await sendOrderConfirmation(order);
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("http_error");
  });

  it("reports network failures without throwing", async () => {
    vi.stubEnv("MAILGUN_API_KEY", "key-test");
    vi.stubEnv("MAILGUN_DOMAIN", "mg.example.com");
    vi.stubEnv("MAILGUN_FROM_EMAIL", "NexaGear <orders@mg.example.com>");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
    );

    const result = await sendOrderConfirmation(order);
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("network_error");
  });

  it("sends with server-built auth header when configured", async () => {
    vi.stubEnv("MAILGUN_API_KEY", "key-test");
    vi.stubEnv("MAILGUN_DOMAIN", "mg.example.com");
    vi.stubEnv("MAILGUN_FROM_EMAIL", "NexaGear <orders@mg.example.com>");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendOrderConfirmation(order);
    expect(result.sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.mailgun.net/v3/mg.example.com/messages");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toMatch(/^Basic /);
    const body = init.body as URLSearchParams;
    expect(body.get("to")).toBe("ada@example.com");
    expect(body.get("subject")).toContain("order confirmation");
  });
});
