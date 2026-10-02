import { describe, expect, it } from "vitest";

import {
  isLiveKey,
  parseInitResponse,
  parseVerifyResponse,
  toKobo,
} from "@/lib/paystack";

describe("toKobo", () => {
  it("converts naira to kobo", () => {
    expect(toKobo(39)).toBe(3900);
    expect(toKobo(264)).toBe(26400);
  });

  it("rounds to whole kobo rather than sending a float", () => {
    expect(toKobo(19.99)).toBe(1999);
    expect(toKobo(0.1 + 0.2)).toBe(30); // 0.30000000000000004 -> 30
  });

  it("never produces a negative or fractional amount", () => {
    expect(toKobo(0)).toBe(0);
    expect(Number.isInteger(toKobo(12.345))).toBe(true);
  });
});

describe("isLiveKey", () => {
  it("accepts test keys only", () => {
    expect(isLiveKey("sk_test_abc123")).toBe(false);
  });

  it("rejects live keys so the store cannot charge real cards", () => {
    expect(isLiveKey("sk_live_abc123")).toBe(true);
    expect(isLiveKey("abc123")).toBe(true);
  });
});

describe("parseInitResponse", () => {
  it("returns the authorization url on success", () => {
    const result = parseInitResponse({
      status: true,
      data: {
        authorization_url: "https://checkout.paystack.com/abc",
        reference: "ref-1",
        access_code: "code-1",
      },
    });
    expect(result).toEqual({
      ok: true,
      authorizationUrl: "https://checkout.paystack.com/abc",
      reference: "ref-1",
      accessCode: "code-1",
    });
  });

  it("surfaces Paystack's error message", () => {
    const result = parseInitResponse({ status: false, message: "Invalid key" });
    expect(result).toEqual({ ok: false, reason: "http_error", detail: "Invalid key" });
  });

  it("rejects a body with no authorization url", () => {
    expect(parseInitResponse({ status: true, data: {} })).toEqual({
      ok: false,
      reason: "malformed_response",
    });
    expect(parseInitResponse(null)).toEqual({
      ok: false,
      reason: "malformed_response",
    });
  });
});

describe("parseVerifyResponse", () => {
  it("accepts a successful transaction matching the expected amount", () => {
    const result = parseVerifyResponse(
      {
        status: true,
        data: {
          reference: "ref-1",
          amount: 3900,
          status: "success",
          paid_at: "2026-10-02T22:00:00Z",
        },
      },
      3900,
    );
    expect(result).toEqual({
      ok: true,
      reference: "ref-1",
      amountKobo: 3900,
      paidAt: "2026-10-02T22:00:00Z",
    });
  });

  it("rejects an amount that does not match what we charged", () => {
    const result = parseVerifyResponse(
      { status: true, data: { reference: "ref-1", amount: 1, status: "success" } },
      3900,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("amount_mismatch");
  });

  it("treats a non-success transaction as abandoned, not paid", () => {
    const result = parseVerifyResponse(
      { status: true, data: { reference: "ref-1", amount: 3900, status: "abandoned" } },
      3900,
    );
    expect(result).toEqual({
      ok: false,
      reason: "abandoned",
      detail: "abandoned",
    });
  });

  it("reports an unknown reference as not found", () => {
    const result = parseVerifyResponse({ status: false, message: "not found" }, 3900);
    expect(result).toEqual({
      ok: false,
      reason: "not_found",
      detail: "not found",
    });
  });

  it("rejects a malformed body instead of assuming success", () => {
    expect(parseVerifyResponse({ status: true }, 3900)).toEqual({
      ok: false,
      reason: "malformed_response",
    });
  });
});