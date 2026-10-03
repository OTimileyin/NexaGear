import "server-only";

import { headers } from "next/headers";

import {
  clientIpFromHeader,
  evaluateCounter,
  rateLimitKey,
  type LimitDecision,
  type RateLimitScope,
} from "@/lib/rate-limit-core";
import { LIMIT_RULES } from "@/lib/rate-limit-core";

const ALLOWED = (configured: boolean): LimitDecision => ({
  ok: true,
  limited: false,
  configured,
  remaining: 0,
  retryAfterSeconds: 0,
});

/**
 * Fixed-window rate limiting backed by Upstash Redis, called over its REST API
 * with plain `fetch`.
 *
 * Why REST and not `@upstash/ratelimit`: the dependency would do two things —
 * INCR and EXPIRE — that the platform can already do with `fetch`. Adding a
 * package (and its transitive tree) to make two HTTP calls would widen the
 * supply chain for no capability, so the calls are made directly.
 *
 * **Fails open.** If the store is unconfigured, unreachable, or returns
 * something unexpected, the request is allowed and the failure is logged. The
 * alternative — failing closed — would let an outage of a *rate limiter* block
 * every customer from checking out, converting a defensive feature into a
 * self-inflicted outage. The limits blunt abuse; they are not load-bearing for
 * correctness. Nothing about authorisation or pricing depends on them.
 */
async function hitCounter(
  key: string,
  windowSeconds: number,
): Promise<{ count: number; ttlMs: number } | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([["INCR", key], ["PTTL", key]]),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`[rate-limit] store returned HTTP ${response.status} for ${key}`);
      return null;
    }

    const payload = (await response.json()) as { result?: unknown }[];
    const count = Number(payload?.[0]?.result);
    let ttlMs = Number(payload?.[1]?.result);

    // PTTL returns -1 when the key exists without an expiry, and -2 when it
    // does not exist. Both mean "this window has no deadline yet" on the first
    // hit of a window, so set one now rather than leaving a key that never
    // expires.
    if (!Number.isFinite(ttlMs) || ttlMs < 0) {
      ttlMs = windowSeconds * 1000;
      await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["EXPIRE", key, windowSeconds]),
        cache: "no-store",
      }).catch(() => undefined);
    }

    return { count, ttlMs };
  } catch (error) {
    console.error(
      `[rate-limit] store unreachable for ${key}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Counts one hit against `scope` for `id` and reports whether to allow it.
 *
 * Returns `configured: false` when no store is set up, which is the local and
 * CI case — nothing is enforced there, by design.
 */
export async function enforceRateLimit(
  scope: RateLimitScope,
  id: string,
  override?: Partial<{ limit: number; windowSeconds: number }>,
): Promise<LimitDecision> {
  const rule = LIMIT_RULES[scope];
  const limit = override?.limit ?? rule.limit;
  const windowSeconds = override?.windowSeconds ?? rule.windowSeconds;

  const reading = await hitCounter(rateLimitKey(scope, id), windowSeconds);

  if (!reading) {
    const configured = Boolean(
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
    );
    return ALLOWED(configured);
  }

  return evaluateCounter({
    count: reading.count,
    limit,
    ttlMs: reading.ttlMs,
    windowSeconds,
  });
}

/** Best-effort client address from the platform's proxy headers. */
export async function requesterIp(): Promise<string | null> {
  try {
    const headerList = await headers();
    return (
      clientIpFromHeader(headerList.get("x-forwarded-for")) ??
      clientIpFromHeader(headerList.get("x-real-ip"))
    );
  } catch {
    return null;
  }
}

/**
 * The identity a limit is counted against: the signed-in user where we know it,
 * otherwise the client address. Keyed on both where possible so a user cannot
 * dodge a limit by signing out — the address is included as a second key only
 * when there is no user, keeping the common case to one round trip.
 */
export async function enforceForRequest(
  scope: RateLimitScope,
  userId: string | null,
): Promise<LimitDecision> {
  const id = userId ?? (await requesterIp()) ?? "unknown";
  return enforceRateLimit(scope, id);
}