import "server-only";

import { getCurrentUser } from "@/lib/auth";
import { isUuid } from "@/lib/checkout";
import { sendPaymentReceipt } from "@/lib/mailgun";
import { toKobo, verifyTransaction } from "@/lib/paystack";
import { enforceForRequest } from "@/lib/rate-limit";
import { getSupabaseServerClient } from "@/lib/supabase/server";


/** Shared authenticated, RLS-scoped verification for browser and native checkout. */
export async function verifyOrderPayment(reference: string): Promise<Record<string, string>> {
  if (!isUuid(reference)) return { paid: "0", payment: "unknown" };
  const user = await getCurrentUser();
  if (!user) {
    return { paid: "0", payment: "unauthenticated" };
  }

  // Counted against the signed-in purchaser. Without this the callback is a
  // free, unauthenticated-shaped way to hammer Paystack's verify API.
  const limit = await enforceForRequest("payment-verify", user.id);
  if (limit.limited) {
    console.warn(
      `[paystack] rate limit hit for user ${user.id} on reference ${reference}`,
    );
    return ({ order: reference, paid: "0", payment: "unknown" });
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return ({ order: reference, paid: "0", payment: "store_not_configured" });
  }

  const { data } = await supabase
    .from("orders")
    .select(
      "id, subtotal, customer_name, customer_email, created_at, payment_status, order_items(*)",
    )
    .eq("id", reference)
    .maybeSingle();

  if (!data) {
    return ({ order: reference, paid: "0", payment: "unknown" });
  }

  // Database column names (snake_case); ConfirmationOrder is camelCase.
  const row = data as unknown as {
    id: string;
    subtotal: number | string;
    customer_name: string;
    customer_email: string;
    created_at: string;
    payment_status: string;
    order_items: {
      product_name_snapshot: string;
      quantity: number;
      line_total: number | string;
    }[];
  };

  if (row.payment_status === "paid") {
    // Callback replayed — already settled, don't re-charge or re-email.
    return ({ order: row.id, paid: "1" });
  }

  const amountKobo = toKobo(Number(row.subtotal));
  const verification = await verifyTransaction(reference, amountKobo);

  if (!verification.ok) {
    const paymentStatus =
      verification.reason === "not_configured" ||
      verification.reason === "live_key_rejected"
        ? "not_configured"
        : "failed";

    await supabase
      .from("orders")
      .update({ payment_status: paymentStatus })
      .eq("id", row.id);

    console.error(
      `[paystack] verification failed for order ${row.id}: ${verification.reason}`,
      verification.detail ?? "",
    );

    return ({ order: row.id, paid: "0", payment: verification.reason });
  }

  const paidAt = verification.paidAt ?? new Date().toISOString();

  // `status` is deliberately NOT written here. It is the fulfilment lifecycle
  // (pending -> processing -> shipped -> delivered, migration 0008) and the
  // authenticated role has no UPDATE grant on it at all — writing it would both
  // fail the constraint and re-open the hole where a buyer advances their own
  // order. Payment lives in payment_status/paid_at and nowhere else.
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      payment_status: "paid",
      payment_reference: verification.reference,
      paid_at: paidAt,
    })
    .eq("id", row.id);

  if (updateError) {
    console.error(`[paystack] could not mark order ${row.id} paid:`, updateError.message);
    return ({ order: row.id, paid: "0", payment: "save_failed" });
  }

  // Best-effort receipt — a mail failure never un-pays a paid order.
  let emailSent = false;
  try {
    const result = await sendPaymentReceipt({
      id: row.id,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      subtotal: Number(row.subtotal),
      createdAt: row.created_at,
      items: row.order_items.map((item) => ({
        name: item.product_name_snapshot,
        quantity: item.quantity,
        lineTotal: Number(item.line_total),
      })),
      paymentReference: verification.reference,
    });
    emailSent = result.sent;
    if (!result.sent) {
      console.error(`[paystack] receipt not sent for ${row.id}: ${result.reason}`);
    }
  } catch (error) {
    console.error(
      `[paystack] receipt threw for ${row.id}:`,
      error instanceof Error ? error.message : error,
    );
  }

  return ({
    order: row.id,
    paid: "1",
    email: emailSent ? "receipt_sent" : "receipt_failed",
  });
}