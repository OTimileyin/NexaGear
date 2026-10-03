/**
 * Admin dashboard helpers — pure, so the totals are unit-tested rather than
 * trusted (same rule as the pricing maths).
 */

export interface AdminOrderRow {
  id: string;
  created_at: string;
  status: string;
  status_changed_at?: string | null;
  payment_status: string;
  subtotal: number | string;
  customer_name: string;
  customer_email: string;
  shipping_address: string;
  order_items?: { id: string }[];
}

export interface AdminSummary {
  orderCount: number;
  paidCount: number;
  unpaidCount: number;
  /** Money actually collected — only `payment_status = 'paid'` counts. */
  revenuePaid: number;
  /** Value of every order regardless of payment state. */
  orderValue: number;
  averageOrderValue: number;
  unitsSold: number;
}

function toNumber(value: number | string): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function summariseOrders(rows: AdminOrderRow[]): AdminSummary {
  let revenuePaid = 0;
  let orderValue = 0;
  let paidCount = 0;
  let unitsSold = 0;

  for (const row of rows) {
    const subtotal = toNumber(row.subtotal);
    orderValue += subtotal;
    if (row.payment_status === "paid") {
      revenuePaid += subtotal;
      paidCount += 1;
    }
    unitsSold += (row.order_items ?? []).length;
  }

  const orderCount = rows.length;

  return {
    orderCount,
    paidCount,
    unpaidCount: orderCount - paidCount,
    revenuePaid: round2(revenuePaid),
    orderValue: round2(orderValue),
    averageOrderValue: orderCount === 0 ? 0 : round2(orderValue / orderCount),
    unitsSold,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Newest first — the dashboard's default ordering. */
export function sortOrdersByDate(rows: AdminOrderRow[]): AdminOrderRow[] {
  return [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export type AdminFilter = "all" | "paid" | "unpaid";

export function filterOrders(
  rows: AdminOrderRow[],
  filter: AdminFilter,
): AdminOrderRow[] {
  if (filter === "all") return rows;
  if (filter === "paid") return rows.filter((r) => r.payment_status === "paid");
  return rows.filter((r) => r.payment_status !== "paid");
}
