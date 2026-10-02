import { describe, expect, it } from "vitest";

import {
  filterOrders,
  sortOrdersByDate,
  summariseOrders,
  type AdminOrderRow,
} from "@/lib/admin";

const row = (over: Partial<AdminOrderRow> = {}): AdminOrderRow => ({
  id: "o1",
  created_at: "2026-10-02T22:00:00.000Z",
  status: "pending",
  payment_status: "unpaid",
  subtotal: 100,
  customer_name: "Test",
  customer_email: "t@example.com",
  shipping_address: "Somewhere",
  order_items: [{ id: "i1" }],
  ...over,
});

describe("summariseOrders", () => {
  it("returns zeroes for no orders rather than NaN", () => {
    const s = summariseOrders([]);
    expect(s).toEqual({
      orderCount: 0,
      paidCount: 0,
      unpaidCount: 0,
      revenuePaid: 0,
      orderValue: 0,
      averageOrderValue: 0,
      unitsSold: 0,
    });
  });

  it("counts only paid orders as revenue", () => {
    const s = summariseOrders([
      row({ id: "a", subtotal: 100, payment_status: "paid" }),
      row({ id: "b", subtotal: 264, payment_status: "unpaid" }),
    ]);
    expect(s.revenuePaid).toBe(100);
    expect(s.orderValue).toBe(364);
    expect(s.paidCount).toBe(1);
    expect(s.unpaidCount).toBe(1);
  });

  it("does not treat failed or not_configured as revenue", () => {
    const s = summariseOrders([
      row({ payment_status: "failed" }),
      row({ payment_status: "not_configured" }),
    ]);
    expect(s.revenuePaid).toBe(0);
    expect(s.paidCount).toBe(0);
    expect(s.unpaidCount).toBe(2);
  });

  it("computes the average over all orders, not just paid ones", () => {
    const s = summariseOrders([
      row({ subtotal: 100, payment_status: "paid" }),
      row({ subtotal: 300, payment_status: "unpaid" }),
    ]);
    expect(s.averageOrderValue).toBe(200);
  });

  it("handles Postgres numeric strings and rounds to cents", () => {
    const s = summariseOrders([
      row({ subtotal: "39.00", payment_status: "paid" }),
      row({ subtotal: "10.005" as unknown as number, payment_status: "paid" }),
    ]);
    expect(s.revenuePaid).toBe(49.01);
  });

  it("ignores a non-numeric subtotal instead of producing NaN", () => {
    const s = summariseOrders([row({ subtotal: "not-a-number" })]);
    expect(s.orderValue).toBe(0);
    expect(s.averageOrderValue).toBe(0);
  });

  it("counts units from the order items", () => {
    const s = summariseOrders([
      row({ order_items: [{ id: "1" }, { id: "2" }] }),
      row({ order_items: undefined }),
    ]);
    expect(s.unitsSold).toBe(2);
  });
});

describe("sortOrdersByDate", () => {
  it("puts the newest order first without mutating the input", () => {
    const rows = [
      row({ id: "old", created_at: "2026-10-01T10:00:00.000Z" }),
      row({ id: "new", created_at: "2026-10-02T10:00:00.000Z" }),
    ];
    const sorted = sortOrdersByDate(rows);
    expect(sorted.map((r) => r.id)).toEqual(["new", "old"]);
    expect(rows[0].id).toBe("old");
  });
});

describe("filterOrders", () => {
  const rows = [
    row({ id: "paid", payment_status: "paid" }),
    row({ id: "unpaid", payment_status: "unpaid" }),
    row({ id: "failed", payment_status: "failed" }),
  ];

  it("returns everything for all", () => {
    expect(filterOrders(rows, "all")).toHaveLength(3);
  });

  it("returns only paid orders", () => {
    expect(filterOrders(rows, "paid").map((r) => r.id)).toEqual(["paid"]);
  });

  it("treats failed and not_configured as unpaid", () => {
    expect(filterOrders(rows, "unpaid").map((r) => r.id)).toEqual([
      "unpaid",
      "failed",
    ]);
  });
});