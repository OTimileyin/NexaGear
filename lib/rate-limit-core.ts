/**
 * Rate limiting — pure logic, kept apart from the Redis transport so the
 * decisions can be unit-tested without a network (same split as
 * `lib/paystack.ts` / `lib/checkout.ts`).
 *
 * A fixed window, not a sliding one: one counter per key with a TTL. That is
 * enough to blunt scripted abuse of checkout and the payment callback, and it
 * needs one Redis round trip per request.
 */

export interface LimitDecision {
  /** May this request proceed? */
  ok: boolean;
  /** True only when the caller actually exceeded the limit. */
  limited: boolean;
  /** False when no backing store is configured — see `lib/rate-limit.ts`. */
  configured: boolean;
  remaining: number;
  /** Seconds the caller should wait. 0 when allowed. */
  retryAfterSeconds: number;
}

export interface CounterInput {
  /** Value returned by INCR — requests seen in the current window. */
  count: number;
  /** Requests permitted per window. */
  limit: number;
  /** Remaining TTL of the key in milliseconds. -1 means no expiry set. */
  ttlMs: number;
  windowSeconds: number;
}

/**
 * Turns a counter reading into a decision.
 *
 * A non-finite or nonsensical counter is treated as **allowed**: a garbage
 * reading from the store must not become an outage. A missing TTL on an
 * exceeded counter is treated as a full window rather than as unlimited, since
 * an unbounded key is exactly the state that would otherwise never expire.
 */
export function evaluateCounter({
  count,
  limit,
  ttlMs,
  windowSeconds,
}: CounterInput): LimitDecision {
  if (!Number.isFinite(count) || !Number.isFinite(limit) || limit <= 0) {
    return {
      ok: true,
      limited: false,
      configured: true,
      remaining: 0,
      retryAfterSeconds: 0,
    };
  }

  if (count <= limit) {
    return {
      ok: true,
      limited: false,
      configured: true,
      remaining: Math.max(0, Math.floor(limit - count)),
      retryAfterSeconds: 0,
    };
  }

  const retryAfterSeconds =
    Number.isFinite(ttlMs) && ttlMs > 0
      ? Math.max(1, Math.ceil(ttlMs / 1000))
      : Math.max(1, Math.floor(windowSeconds));

  return {
    ok: false,
    limited: true,
    configured: true,
    remaining: 0,
    retryAfterSeconds,
  };
}

/**
 * The first entry of `x-forwarded-for`, which is the originating client as far
 * as the platform is concerned.
 *
 * Sanitised rather than trusted: the value only becomes part of a cache key, so
 * it is length-capped and restricted to characters an address can contain. A
 * spoofed header therefore cannot mint unbounded keys, and a hostile one cannot
 * inject separators into the key namespace.
 */
export function clientIpFromHeader(value: string | null | undefined): string | null {
  if (!value) return null;

  const first = value.split(",")[0]?.trim();
  if (!first || first.length > 64) return null;
  if (!/^[0-9a-fA-F:.]{2,64}$/.test(first)) return null;

  return first.toLowerCase();
}

/** Builds a namespaced key. Scopes keep unrelated limits from colliding. */
export function rateLimitKey(scope: string, id: string): string {
  return `nexagear:rl:${scope}:${id}`;
}

export type RateLimitScope =
  | "place-order"
  | "start-payment"
  | "payment-verify";

export interface LimitRule {
  scope: RateLimitScope;
  limit: number;
  windowSeconds: number;
}

/**
 * Deliberately modest. The limits exist to stop a script, not to inconvenience
 * a person: placing five orders in ten minutes is already far past normal, and
 * the payment callback is hit once per checkout attempt.
 */
export const LIMIT_RULES: Record<RateLimitScope, LimitRule> = {
  "place-order": { scope: "place-order", limit: 5, windowSeconds: 600 },
  "start-payment": { scope: "start-payment", limit: 10, windowSeconds: 600 },
  "payment-verify": { scope: "payment-verify", limit: 30, windowSeconds: 600 },
};

/** Copy shown when a limit is hit: says what happened and what to do next. */
export function rateLimitMessage(retryAfterSeconds: number): string {
  const seconds = Math.max(1, Math.floor(retryAfterSeconds));

  if (seconds < 60) {
    return `Too many attempts from this device. Wait ${seconds} second${seconds === 1 ? "" : "s"} and try again — nothing was lost.`;
  }

  const minutes = Math.ceil(seconds / 60);
  return `Too many attempts from this device. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"} — nothing was lost.`;
}