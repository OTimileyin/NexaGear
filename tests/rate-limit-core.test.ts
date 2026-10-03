import { describe, expect, it } from "vitest";

import {
  LIMIT_RULES,
  clientIpFromHeader,
  evaluateCounter,
  rateLimitKey,
  rateLimitMessage,
} from "@/lib/rate-limit-core";

describe("evaluateCounter", () => {
  it("allows a request below the limit and reports what is left", () => {
    const d = evaluateCounter({ count: 1, limit: 5, ttlMs: 400, windowSeconds: 600 });
    expect(d.ok).toBe(true);
    expect(d.limited).toBe(false);
    expect(d.remaining).toBe(4);
    expect(d.retryAfterSeconds).toBe(0);
  });

  it("allows the request that lands exactly on the limit", () => {
    const d = evaluateCounter({ count: 5, limit: 5, ttlMs: 100, windowSeconds: 600 });
    expect(d.ok).toBe(true);
    expect(d.remaining).toBe(0);
  });

  it("blocks the first request past the limit and waits out the window", () => {
    const d = evaluateCounter({ count: 6, limit: 5, ttlMs: 4200, windowSeconds: 600 });
    expect(d.ok).toBe(false);
    expect(d.limited).toBe(true);
    expect(d.retryAfterSeconds).toBe(5);
    expect(d.remaining).toBe(0);
  });

  it("rounds the wait up so a caller never retries a millisecond early", () => {
    const d = evaluateCounter({ count: 9, limit: 5, ttlMs: 1, windowSeconds: 600 });
    expect(d.retryAfterSeconds).toBe(1);
  });

  it("falls back to a whole window when the key has no expiry yet", () => {
    // PTTL returns -1 (exists, no TTL) or -2 (just created) on a fresh window.
    for (const ttlMs of [-1, -2]) {
      const d = evaluateCounter({ count: 7, limit: 5, ttlMs, windowSeconds: 600 });
      expect(d.limited).toBe(true);
      expect(d.retryAfterSeconds).toBe(600);
    }
  });

  it("fails open on a nonsense reading rather than blocking a customer", () => {
    const d = evaluateCounter({
      count: Number.NaN,
      limit: 5,
      ttlMs: 1000,
      windowSeconds: 600,
    });
    expect(d.ok).toBe(true);
    expect(d.limited).toBe(false);
  });

  it("fails open when the limit is misconfigured to zero or less", () => {
    expect(evaluateCounter({ count: 99, limit: 0, ttlMs: 100, windowSeconds: 600 }).ok).toBe(
      true,
    );
  });
});

describe("clientIpFromHeader", () => {
  it("takes the originating client from the first hop", () => {
    expect(clientIpFromHeader("203.0.113.7, 70.41.3.18, 150.172.238.178")).toBe(
      "203.0.113.7",
    );
  });

  it("trims and lowercases so one client cannot mint two keys", () => {
    expect(clientIpFromHeader("  2001:DB8::1  ")).toBe("2001:db8::1");
  });

  it("rejects absent, empty and oversized values", () => {
    expect(clientIpFromHeader(null)).toBeNull();
    expect(clientIpFromHeader(undefined)).toBeNull();
    expect(clientIpFromHeader("")).toBeNull();
    expect(clientIpFromHeader("   ")).toBeNull();
    expect(clientIpFromHeader("a".repeat(65))).toBeNull();
  });

  it("rejects characters that cannot appear in an address", () => {
    // Otherwise a forged header could inject separators into the key namespace.
    expect(clientIpFromHeader("evil:key*")).toBeNull();
    expect(clientIpFromHeader("1.2.3.4\nX-Injected: 1")).toBeNull();
  });
});

describe("rateLimitKey", () => {
  it("namespaces by scope so unrelated limits never share a counter", () => {
    expect(rateLimitKey("place-order", "user_1")).not.toBe(
      rateLimitKey("start-payment", "user_1"),
    );
    expect(rateLimitKey("place-order", "user_1")).toBe("nexagear:rl:place-order:user_1");
  });
});

describe("LIMIT_RULES", () => {
  it("keeps checkout tighter than the callback it redirects to", () => {
    expect(LIMIT_RULES["place-order"].limit).toBeLessThan(
      LIMIT_RULES["payment-verify"].limit,
    );
  });

  it("gives every scope a positive limit and a window", () => {
    for (const rule of Object.values(LIMIT_RULES)) {
      expect(rule.limit).toBeGreaterThan(0);
      expect(rule.windowSeconds).toBeGreaterThan(0);
    }
  });
});

describe("rateLimitMessage", () => {
  it("counts seconds in seconds", () => {
    expect(rateLimitMessage(1)).toContain("1 second");
    expect(rateLimitMessage(12)).toContain("12 seconds");
  });

  it("switches to minutes and rounds up, so it never says '0 minutes'", () => {
    expect(rateLimitMessage(60)).toContain("1 minute");
    expect(rateLimitMessage(61)).toContain("2 minutes");
  });

  it("says nothing was lost, which is true — the order is already durable", () => {
    expect(rateLimitMessage(30)).toContain("nothing was lost");
  });
});