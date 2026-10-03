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