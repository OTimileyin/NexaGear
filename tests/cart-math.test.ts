import { describe, expect, it } from "vitest";

import {
  MAX_QTY,
  cartCount,
  cartSubtotal,
  clampQuantity,
  parseStoredCart,
  stepQuantity,
} from "@/lib/cart/math";
import type { CartItem } from "@/lib/types";

const item = (overrides: Partial<CartItem> = {}): CartItem => ({
  productId: "p1",
  slug: "slug",
  name: "Thing",
  sku: "NG-001",
  price: 10,
  imageUrl: null,
  quantity: 1,
  ...overrides,
});

describe("clampQuantity", () => {
  it("clamps into 1..99", () => {
    expect(clampQuantity(0)).toBe(1);
    expect(clampQuantity(-5)).toBe(1);
    expect(clampQuantity(50)).toBe(50);
    expect(clampQuantity(1000)).toBe(MAX_QTY);
  });

  it("truncates decimals and handles non-finite input", () => {
    expect(clampQuantity(3.9)).toBe(3);
    expect(clampQuantity(Number.NaN)).toBe(1);
    expect(clampQuantity(Infinity)).toBe(MAX_QTY);
  });
});

describe("stepQuantity", () => {
  it("increments with an upper bound", () => {
    expect(stepQuantity(1, 1)).toBe(2);
    expect(stepQuantity(99, 1)).toBe(99);
  });

  it("returns null below the minimum so the item can be removed", () => {
    expect(stepQuantity(1, -1)).toBeNull();
    expect(stepQuantity(2, -1)).toBe(1);
  });
});

describe("cartSubtotal", () => {
  it("sums price × quantity", () => {
    const items = [
      item({ price: 89, quantity: 2 }),
      item({ productId: "p2", price: 45.5, quantity: 1 }),
    ];
    expect(cartSubtotal(items)).toBe(223.5);
  });

  it("is cents-safe for fractional prices", () => {
    const items = [item({ price: 0.1, quantity: 3 }), item({ productId: "p2", price: 0.1, quantity: 3 })];
    expect(cartSubtotal(items)).toBe(0.6);
  });

  it("is 0 for an empty cart", () => {
    expect(cartSubtotal([])).toBe(0);
  });
});

describe("cartCount", () => {
  it("sums quantities across lines", () => {
    expect(cartCount([item({ quantity: 2 }), item({ productId: "p2", quantity: 3 })])).toBe(5);
    expect(cartCount([])).toBe(0);
  });
});

describe("parseStoredCart", () => {
  const valid = JSON.stringify([
    { productId: "p1", slug: "s", name: "N", sku: "NG-001", price: 10, imageUrl: null, quantity: 2 },
  ]);

  it("round-trips valid carts", () => {
    const parsed = parseStoredCart(valid);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].quantity).toBe(2);
    expect(parsed[0].price).toBe(10);
  });

  it("returns empty for null, bad JSON, and non-arrays", () => {
    expect(parseStoredCart(null)).toEqual([]);
    expect(parseStoredCart("{nope")).toEqual([]);
    expect(parseStoredCart('"string"')).toEqual([]);
    expect(parseStoredCart("{}")).toEqual([]);
  });

  it("drops malformed entries and clamps quantities", () => {
    const raw = JSON.stringify([
      { productId: 42 },
      { productId: "ok", slug: "s", name: "N", sku: "NG-002", price: 5, imageUrl: null, quantity: 5000 },
    ]);
    const parsed = parseStoredCart(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].quantity).toBe(MAX_QTY);
  });
});
