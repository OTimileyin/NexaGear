/**
 * Order lifecycle — pure, and the single source of truth in TypeScript.
 *
 * The same transition table is enforced again inside the database by
 * `set_order_status` (migration 0008). Duplication is deliberate: this copy
 * decides which buttons the admin page renders, and the SQL copy is what
 * actually holds. A status nobody can reach from here is refused there, so
 * hand-crafting a request cannot skip a step.
 *
 * `payment_status` (migration 0005) is a separate concern and lives in its own
 * column — money received is not the same fact as "your parcel is on its way".
 */

export const ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Forward-only. `shipped` cannot be cancelled (the parcel has left), and
 * `delivered`/`cancelled` are terminal.
 */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

/** The happy path, in order — used to render the tracking timeline. */
export const FULFILMENT_PATH = [
  "pending",
  "processing",
  "shipped",
  "delivered",
] as const satisfies readonly OrderStatus[];

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function isTerminalStatus(status: string): boolean {
  return isOrderStatus(status) && TRANSITIONS[status].length === 0;
}

/** An unrecognised status yields no actions — never a guess. */
export function nextOrderStatuses(status: string): OrderStatus[] {
  return isOrderStatus(status) ? [...TRANSITIONS[status]] : [];
}

/**
 * Why an order was cancelled — a controlled vocabulary, not free text.
 *
 * This list is duplicated in `set_order_status` (migration 0010) and in the
 * `orders_cancellation_reason_check` constraint. The duplication is the same
 * deliberate trade as the transition table above: this copy decides what the
 * admin can choose, and the SQL copy is what actually holds.
 *
 * There is deliberately no `other`. Free text collects "n/a", "cust. cancel"
 * and the empty string — values nobody can group or report on. A genuine case
 * that does not fit is fixed by adding the value in a migration, which is
 * reviewable; vague data cannot be un-vagged later.
 */
export const CANCELLATION_REASONS = [
  "out_of_stock",
  "customer_request",
  "payment_failed",
  "address_unreachable",
  "suspected_fraud",
] as const;

export type CancellationReason = (typeof CANCELLATION_REASONS)[number];

const REASON_LABELS: Record<CancellationReason, string> = {
  out_of_stock: "Out of stock",
  customer_request: "Customer request",
  payment_failed: "Payment failed",
  address_unreachable: "Address unreachable",
  suspected_fraud: "Suspected fraud",
};

export function isCancellationReason(
  value: string,
): value is CancellationReason {
  return (CANCELLATION_REASONS as readonly string[]).includes(value);
}

/** Plain language for the admin; an unknown value is never guessed at. */
export function cancellationReasonLabel(reason: string): string {
  return isCancellationReason(reason) ? REASON_LABELS[reason] : "Unknown reason";
}

/**
 * The reasons an admin may pick for a given target status, or null when the
 * target is not a cancellation and therefore takes no reason.
 */
export function cancellationReasonsFor(
  target: string,
): CancellationReason[] | null {
  return target === "cancelled" ? [...CANCELLATION_REASONS] : null;
}

export type StatusChangeCheck =
  | { ok: true; reason: CancellationReason | null }
  | {
      ok: false;
      code:
        | "invalid_status"
        | "invalid_transition"
        | "reason_required"
        | "invalid_reason"
        | "reason_not_allowed";
      message: string;
    };

/**
 * Mirrors `set_order_status` (migration 0010) before anything is sent.
 *
 * The database re-checks every one of these rules, so this is the door and the
 * function is the gate — but an admin who picks a cancelled order and no
 * reason should be told plainly, rather than discovering it via a failed write.
 * A blank string is rejected here for the same reason it is rejected in SQL:
 * `'   '` is not a reason, and `btrim` is what proves it.
 */
export function checkStatusChange(
  from: string,
  to: string,
  reason: string | null | undefined,
): StatusChangeCheck {
  if (!isOrderStatus(to)) {
    return {
      ok: false,
      code: "invalid_status",
      message: "That status change isn't valid. Reload the page and try again.",
    };
  }

  if (!canTransition(from, to)) {
    return {
      ok: false,
      code: "invalid_transition",
      message:
        "That order can't move to that step — it may have already moved on.",
    };
  }

  if (to === "cancelled") {
    if (reason == null || reason.trim() === "") {
      return {
        ok: false,
        code: "reason_required",
        message: "Choose why this order is being cancelled.",
      };
    }
    if (!isCancellationReason(reason)) {
      return {
        ok: false,
        code: "invalid_reason",
        message: "That cancellation reason isn't one of the listed options.",
      };
    }
    return { ok: true, reason };
  }

  if (reason != null && reason.trim() !== "") {
    return {
      ok: false,
      code: "reason_not_allowed",
      message: "Only a cancelled order can carry a cancellation reason.",
    };
  }

  return { ok: true, reason: null };
}

export function canTransition(from: string, to: string): boolean {
  return isOrderStatus(from) && isOrderStatus(to) && TRANSITIONS[from].includes(to);
}

/** Plain-language labels: the state, and what an admin can do about it. */
const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Placed",
  processing: "Being prepared",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const ACTION_LABELS: Record<OrderStatus, string> = {
  pending: "Awaiting payment",
  processing: "Start preparing",
  shipped: "Mark shipped",
  delivered: "Mark delivered",
  cancelled: "Cancel order",
};

export function statusLabel(status: string): string {
  return isOrderStatus(status) ? STATUS_LABELS[status] : "Unknown status";
}

export function statusActionLabel(target: OrderStatus): string {
  return ACTION_LABELS[target];
}

export type StatusTone = "neutral" | "progress" | "good" | "bad";

export function statusTone(status: string): StatusTone {
  switch (status) {
    case "processing":
    case "shipped":
      return "progress";
    case "delivered":
      return "good";
    case "cancelled":
      return "bad";
    default:
      return "neutral";
  }
}

/**
 * Where an order sits on the happy-path timeline, or -1 when it left the
 * timeline (cancelled). The tracking page renders this as an ordered list
 * rather than a progress bar, so the position is readable as text.
 */
export function timelineIndex(status: string): number {
  return (FULFILMENT_PATH as readonly string[]).indexOf(status);
}

export function isSampleRef(value: string): boolean {
  return /^NGX-\d{4}$/.test(value);
}

/**
 * Steps the timeline should show. Cancelled orders stop tracking, so a
 * cancelled order never renders a misleading "on its way" list.
 */
export function timelineSteps(status: string): OrderStatus[] {
  return status === "cancelled" ? [] : [...FULFILMENT_PATH];
}