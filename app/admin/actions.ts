"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { isUuid } from "@/lib/checkout";
import { isOrderStatus, type OrderStatus } from "@/lib/orders";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type UpdateStatusResult =
  | { ok: true; status: OrderStatus }
  | {
      ok: false;
      code:
        | "unauthenticated"
        | "not_authorised"
        | "invalid_request"
        | "order_not_found"
        | "invalid_transition"
        | "server_error";
      message: string;
    };

/**
 * Advances an order's fulfilment status.
 *
 * Two independent checks happen here, and neither of them is the important
 * one. This action confirms the caller is an admin so the UI can report a
 * clean error, but `set_order_status` re-checks `is_admin()` and the transition
 * table inside Postgres — so calling this action with a forged payload, or
 * PATCHing the REST API directly, still cannot advance an order. The database
 * is the gate; this function is the door.
 */
export async function updateOrderStatus(
  orderId: string,
  next: string,
): Promise<UpdateStatusResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      code: "unauthenticated",
      message: "Sign in with an administrator account to update orders.",
    };
  }

  if (!isUuid(orderId) || !isOrderStatus(next)) {
    return {
      ok: false,
      code: "invalid_request",
      message: "That status change isn't valid. Reload the page and try again.",
    };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      code: "server_error",
      message: "The store isn't configured. Try again later.",
    };
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || isAdmin !== true) {
    return {
      ok: false,
      code: "not_authorised",
      message: "Your account doesn't have admin access.",
    };
  }

  const { data, error } = await supabase.rpc("set_order_status", {
    p_order_id: orderId,
    p_status: next,
  });

  if (error) {
    const detail = error.message;

    if (detail.includes("not_authorised")) {
      return {
        ok: false,
        code: "not_authorised",
        message: "Your account doesn't have admin access.",
      };
    }
    if (detail.includes("order_not_found")) {
      return {
        ok: false,
        code: "order_not_found",
        message: "That order no longer exists. Reload the page.",
      };
    }
    if (detail.includes("invalid_transition")) {
      return {
        ok: false,
        code: "invalid_transition",
        message: "That order can't move to that step — it may have already moved on.",
      };
    }

    console.error(`[admin] could not set order ${orderId} to ${next}:`, detail);
    return {
      ok: false,
      code: "server_error",
      message: "The order wasn't updated. Try again.",
    };
  }

  revalidatePath("/admin");

  // The RPC returns the updated row, so report the status the database
  // actually stored rather than the one we asked for.
  const status = (data as { status?: string } | null)?.status ?? next;
  return { ok: true, status: isOrderStatus(status) ? status : next };
}