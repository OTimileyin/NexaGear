"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { isUuid } from "@/lib/checkout";
import {
  checkStatusChange,
  isCancellationReason,
  isOrderStatus,
  type CancellationReason,
  type OrderStatus,
} from "@/lib/orders";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type UpdateStatusResult =
  | { ok: true; status: OrderStatus; reason: CancellationReason | null }
  | {
      ok: false;
      code:
        | "unauthenticated"
        | "not_authorised"
        | "invalid_request"
        | "invalid_status"
        | "order_not_found"
        | "invalid_transition"
        | "reason_required"
        | "invalid_reason"
        | "reason_not_allowed"
        | "server_error";
      message: string;
    };

/**
 * Advances an order's fulfilment status.
 *
 * Two independent checks happen here, and neither of them is the important
 * one. This action confirms the caller is an admin so the UI can report a
 * clean error, but `set_order_status` re-checks `is_admin()`, the transition
 * table and the cancellation-reason rule inside Postgres — so calling this
 * action with a forged payload, or PATCHing the REST API directly, still
 * cannot advance an order. The database is the gate; this function is the door.
 *
 * `currentStatus` is sent by the caller only so `checkStatusChange` can refuse
 * an impossible move with a readable message. It is not trusted: the database
 * reads the real status under `FOR UPDATE` and applies the transition table
 * itself, so passing a stale or fabricated value here cannot widen what is
 * permitted.
 */
export async function updateOrderStatus(
  orderId: string,
  currentStatus: string,
  next: string,
  reason?: string | null,
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

  const check = checkStatusChange(currentStatus, next, reason);
  if (!check.ok) {
    return { ok: false, code: check.code, message: check.message };
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
    p_cancellation_reason: check.reason,
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
    // Raised by migration 0010. The checks above should already have caught
    // these, so reaching them means the database and this action disagree —
    // which is worth surfacing rather than hiding behind a generic message.
    if (detail.includes("cancellation_reason_required")) {
      return {
        ok: false,
        code: "reason_required",
        message: "Choose why this order is being cancelled.",
      };
    }
    if (detail.includes("invalid_cancellation_reason")) {
      return {
        ok: false,
        code: "invalid_reason",
        message: "That cancellation reason isn't one of the listed options.",
      };
    }
    if (detail.includes("cancellation_reason_not_allowed")) {
      return {
        ok: false,
        code: "reason_not_allowed",
        message: "Only a cancelled order can carry a cancellation reason.",
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

  // The RPC returns the updated row, so report what the database actually
  // stored rather than what we asked for.
  const row = data as { status?: string; cancellation_reason?: string } | null;
  const status = row?.status ?? next;
  const storedReason = row?.cancellation_reason ?? null;
  return {
    ok: true,
    status: isOrderStatus(status) ? status : next,
    reason: storedReason !== null && isCancellationReason(storedReason)
      ? storedReason
      : check.reason,
  };
}