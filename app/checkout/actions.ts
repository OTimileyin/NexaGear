"use server";

import { getCurrentUser } from "@/lib/auth";
import {
  buildOrderItemsPayload,
  hasFieldErrors,
  isSendablePayload,
  validateCheckoutFields,
  type CheckoutFields,
} from "@/lib/checkout";
import {
  sendOrderConfirmation,
  type ConfirmationOrder,
} from "@/lib/mailgun";
import { ensureProfile } from "@/lib/profile";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type PlaceOrderResult =
  | { ok: true; orderId: string; emailSent: boolean }
  | { ok: false; code: PlaceOrderErrorCode; message: string };

export type PlaceOrderErrorCode =
  | "unauthenticated"
  | "invalid_form"
  | "empty_cart"
  | "product_issue"
  | "auth_verification"
  | "server_error";

interface PlaceOrderInput {
  clientRef: string;
  fields: CheckoutFields;
  items: Array<{ productId: string; quantity: number }>;
}

function fail(code: PlaceOrderErrorCode, message: string): PlaceOrderResult {
  return { ok: false, code, message };
}

function mapRpcError(message: string): PlaceOrderResult {
  if (message.includes("product_not_found") || message.includes("product_unavailable")) {
    return fail(
      "product_issue",
      "An item in your cart is no longer available. Review your cart and try again.",
    );
  }
  if (
    message.includes("invalid_name") ||
    message.includes("invalid_phone") ||
    message.includes("invalid_address") ||
    message.includes("invalid_quantity") ||
    message.includes("invalid_items") ||
    message.includes("missing_client_ref")
  ) {
    return fail("invalid_form", "Some checkout details aren't valid. Check the highlighted fields.");
  }
  if (message.includes("not_authenticated") || message.includes("profile_missing")) {
    return fail("unauthenticated", "Your session expired. Sign in with Google again to place the order.");
  }
  // Supabase could not verify the Clerk session token — the Clerk third-party
  // auth provider is missing/mismatched, or the key it presents is wrong. This
  // is a store configuration fault, not the visitor's account, so say so rather
  // than implying their order attempt was the problem.
  if (
    /suitable key|wrong key type|invalid jwt|jwse|invalid authentication credentials/i.test(
      message,
    )
  ) {
    console.error("[order] Supabase rejected the auth token:", message);
    return fail(
      "auth_verification",
      "Your sign-in couldn't be verified by the store's database, so nothing was saved. This is a store configuration issue, not your account — try again later.",
    );
  }
  console.error("[order] create_order failed:", message);
  return fail(
    "server_error",
    "The order couldn't be placed. Nothing was saved — try again.",
  );
}

/**
 * Creates the order from trusted server-side data.
 * The browser sends product IDs + quantities only; prices/totals are
 * computed inside the create_order RPC from the products table (PRD §13).
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const user = await getCurrentUser();
  if (!user) {
    return fail("unauthenticated", "Sign in with Google to place your order.");
  }

  // Keep the profile (trusted email) in sync with the Clerk account before the
  // RPC reads it. Idempotent and server-side only — no unsigned webhook surface.
  const profile = await ensureProfile();
  if (!profile.ok && profile.reason === "not_configured") {
    return fail("server_error", "The store isn't configured. Try again later.");
  }

  const fieldErrors = validateCheckoutFields(input.fields);
  if (hasFieldErrors(fieldErrors)) {
    return fail("invalid_form", "Check the highlighted checkout fields.");
  }

  const payload = buildOrderItemsPayload(input.items);
  if (payload.length === 0) {
    return fail("empty_cart", "Your cart is empty. Add something before checking out.");
  }
  if (!isSendablePayload(payload, input.clientRef)) {
    return fail("invalid_form", "The order details aren't valid. Refresh and try again.");
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return fail("server_error", "The store isn't configured. Try again later.");
  }

  const { data, error } = await supabase.rpc("create_order", {
    p_client_ref: input.clientRef,
    p_customer_name: input.fields.customerName.trim(),
    p_phone: input.fields.phone.trim(),
    p_shipping_address: input.fields.shippingAddress.trim(),
    p_items: payload,
  });

  if (error) {
    return mapRpcError(error.message);
  }

  const orderId = String(data);

  // The order is durable now. Email is best-effort: any failure is logged
  // and reported, never rolled back (PRD §15, invariant 5).
  let emailSent = false;
  try {
    const { data: orderRow } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .maybeSingle();

    if (orderRow) {
      const row = orderRow as {
        id: string;
        customer_name: string;
        customer_email: string;
        subtotal: number | string;
        created_at: string;
        order_items: {
          product_name_snapshot: string;
          quantity: number;
          line_total: number | string;
        }[];
      };

      const confirmation: ConfirmationOrder = {
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
      };

      const result = await sendOrderConfirmation(confirmation);
      emailSent = result.sent;
      if (!result.sent) {
        console.error(
          `[order] confirmation email not sent for order ${orderId}: ${result.reason}`,
        );
      }
    } else {
      console.error(`[order] could not reload order ${orderId} for email`);
    }
  } catch (error) {
    // Email failure must never surface as an order failure.
    console.error(
      `[order] confirmation email threw for order ${orderId}:`,
      error instanceof Error ? error.message : error,
    );
  }

  return { ok: true, orderId, emailSent };
}
