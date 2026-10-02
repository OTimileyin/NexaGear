import "server-only";

/**
 * Paystack integration (test mode). Server-only: the secret key never reaches
 * the browser.
 *
 * Money rule (PRD §13, same rule as the catalogue totals): the amount sent to
 * Paystack is derived from `orders.subtotal`, which `create_order` computed
 * from the `products` table. No client-supplied amount is ever used.
 *
 * Test mode only by instruction — the store must not be able to move real
 * money. `PAYSTACK_SECRET_KEY` is expected to be a `sk_test_…` key; the
 * helper refuses a live key outright rather than trusting convention.
 */

const API = "https://api.paystack.co";

export type PaymentInitFailure =
  | "not_configured"
  | "live_key_rejected"
  | "http_error"
  | "network_error"
  | "malformed_response";

export type PaymentInitResult =
  | { ok: true; authorizationUrl: string; reference: string; accessCode: string }
  | { ok: false; reason: PaymentInitFailure; detail?: string };

export type VerifyFailure =
  | PaymentInitFailure
  | "not_found"
  | "abandoned"
  | "amount_mismatch";

export type VerifyResult =
  | { ok: true; reference: string; amountKobo: number; paidAt: string | null }
  | { ok: false; reason: VerifyFailure; detail?: string };

/** Naira → kobo. Paystack amounts are integers in the currency's minor unit. */
export function toKobo(amount: number): number {
  return Math.round(amount * 100);
}

/** Guard: this build must never be able to charge a real card. */
export function isLiveKey(secretKey: string): boolean {
  return !secretKey.startsWith("sk_test_");
}

/** Pure: turn Paystack's /transaction/initialize body into a result. */
export function parseInitResponse(json: unknown): PaymentInitResult {
  if (typeof json !== "object" || json === null) {
    return { ok: false, reason: "malformed_response" };
  }
  const body = json as Record<string, unknown>;
  if (body.status !== true) {
    const message =
      typeof body.message === "string" ? body.message : "unknown error";
    return { ok: false, reason: "http_error", detail: message };
  }
  const data = body.data as Record<string, unknown> | undefined;
  const url = data?.authorization_url;
  const reference = data?.reference;
  const accessCode = data?.access_code;
  if (typeof url !== "string" || typeof reference !== "string") {
    return { ok: false, reason: "malformed_response" };
  }
  return {
    ok: true,
    authorizationUrl: url,
    reference,
    accessCode: typeof accessCode === "string" ? accessCode : "",
  };
}

/**
 * Pure: turn Paystack's /transaction/verify body into a result.
 * `expectedKobo` guards against a tampered or mismatched transaction — the
 * verified amount must equal what we asked for.
 */
export function parseVerifyResponse(
  json: unknown,
  expectedKobo: number,
): VerifyResult {
  if (typeof json !== "object" || json === null) {
    return { ok: false, reason: "malformed_response" };
  }
  const body = json as Record<string, unknown>;
  if (body.status !== true) {
    const message =
      typeof body.message === "string" ? body.message : "unknown error";
    return { ok: false, reason: "not_found", detail: message };
  }
  const data = body.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== "object") {
    return { ok: false, reason: "malformed_response" };
  }
  const reference = data.reference;
  const amount = data.amount;
  const status = data.status;
  const paidAt = data.paid_at;

  if (typeof reference !== "string" || typeof amount !== "number") {
    return { ok: false, reason: "malformed_response" };
  }
  if (status !== "success") {
    return { ok: false, reason: "abandoned", detail: String(status) };
  }
  if (amount !== expectedKobo) {
    return {
      ok: false,
      reason: "amount_mismatch",
      detail: `${amount} != ${expectedKobo}`,
    };
  }
  return {
    ok: true,
    reference,
    amountKobo: amount,
    paidAt: typeof paidAt === "string" ? paidAt : null,
  };
}

function secretKey(): string | null {
  const key = process.env.PAYSTACK_SECRET_KEY;
  return key && key.length > 0 ? key : null;
}

export interface InitializeInput {
  reference: string;
  email: string;
  /** Naira amount, already computed server-side from the database. */
  amount: number;
  callbackUrl: string;
}

export async function initializeTransaction(
  input: InitializeInput,
): Promise<PaymentInitResult> {
  const key = secretKey();
  if (!key) return { ok: false, reason: "not_configured" };
  if (isLiveKey(key)) {
    console.error("[paystack] refusing to initialise with a non-test key");
    return { ok: false, reason: "live_key_rejected" };
  }

  try {
    const response = await fetch(`${API}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: input.email,
        amount: toKobo(input.amount),
        currency: "NGN",
        reference: input.reference,
        callback_url: input.callbackUrl,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        `[paystack] initialize failed (HTTP ${response.status}):`,
        detail.slice(0, 300),
      );
      return { ok: false, reason: "http_error", detail: String(response.status) };
    }

    return parseInitResponse(await response.json());
  } catch (error) {
    console.error(
      "[paystack] initialize network failure:",
      error instanceof Error ? error.message : error,
    );
    return { ok: false, reason: "network_error" };
  }
}

export async function verifyTransaction(
  reference: string,
  expectedKobo: number,
): Promise<VerifyResult> {
  const key = secretKey();
  if (!key) return { ok: false, reason: "not_configured" };
  if (isLiveKey(key)) {
    console.error("[paystack] refusing to verify with a non-test key");
    return { ok: false, reason: "live_key_rejected" };
  }

  try {
    const response = await fetch(
      `${API}/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${key}` } },
    );

    if (response.status === 404) {
      return { ok: false, reason: "not_found" };
    }
    if (!response.ok) {
      return { ok: false, reason: "http_error", detail: String(response.status) };
    }

    return parseVerifyResponse(await response.json(), expectedKobo);
  } catch (error) {
    console.error(
      "[paystack] verify network failure:",
      error instanceof Error ? error.message : error,
    );
    return { ok: false, reason: "network_error" };
  }
}