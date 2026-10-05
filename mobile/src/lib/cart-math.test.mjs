/**
 * The phone's cart maths, tested with `node --test` rather than Vitest.
 *
 * There is no bundler and no transform here: Node 24 strips the types off
 * `cart-math.ts` directly, so the test imports the same file the app ships.
 * That matters for the one rule this suite exists to enforce — the phone's
 * bounds (1..99) and the website's bounds are the same numbers as migration
 * `0011_server_cart.sql`'s `check (quantity between 1 and 99)`. A phone that
 * stepped to 100 would get a refused write instead of an error message.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_QTY,
  MIN_QTY,
  addOne,
  cartCount,
  cartSubtotal,
  clampQuantity,
  stepQuantity,
  withQuantity,
  withoutProduct,
} from "./cart-math.ts";

const item = (overrides = {}) => ({
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
  it("clamps into the range the database check accepts", () => {
    assert.equal(MIN_QTY, 1);
    assert.equal(MAX_QTY, 99);
    assert.equal(clampQuantity(0), 1);
    assert.equal(clampQuantity(-5), 1);
    assert.equal(clampQuantity(50), 50);
    assert.equal(clampQuantity(1000), MAX_QTY);
  });

  it("truncates decimals and handles non-finite input", () => {
    assert.equal(clampQuantity(3.9), 3);
    assert.equal(clampQuantity(Number.NaN), 1);
    assert.equal(clampQuantity(Infinity), MAX_QTY);
  });
});

describe("stepQuantity", () => {
  it("increments with an upper bound", () => {
    assert.equal(stepQuantity(1, 1), 2);
    assert.equal(stepQuantity(99, 1), 99);
  });

  it("returns null below the minimum so the line can be removed", () => {
    assert.equal(stepQuantity(1, -1), null);
    assert.equal(stepQuantity(2, -1), 1);
  });
});

describe("cartSubtotal", () => {
  it("sums price × quantity", () => {
    const items = [
      item({ price: 89, quantity: 2 }),
      item({ productId: "p2", price: 45.5, quantity: 1 }),
    ];
    assert.equal(cartSubtotal(items), 223.5);
  });

  it("is cents-safe for fractional prices", () => {
    const items = [
      item({ price: 0.1, quantity: 3 }),
      item({ productId: "p2", price: 0.1, quantity: 3 }),
    ];
    assert.equal(cartSubtotal(items), 0.6);
  });

  it("is 0 for an empty cart", () => {
    assert.equal(cartSubtotal([]), 0);
  });
});

describe("cartCount", () => {
  it("sums quantities across lines", () => {
    assert.equal(
      cartCount([item({ quantity: 2 }), item({ productId: "p2", quantity: 3 })]),
      5,
    );
    assert.equal(cartCount([]), 0);
  });
});

describe("withQuantity", () => {
  it("changes one line and leaves the others alone", () => {
    const items = [item({ quantity: 1 }), item({ productId: "p2", quantity: 4 })];
    const next = withQuantity(items, "p2", 7);
    assert.equal(next[0].quantity, 1);
    assert.equal(next[1].quantity, 7);
    assert.equal(items[1].quantity, 4, "must not mutate the input");
  });
});

describe("withoutProduct", () => {
  it("drops exactly the named line", () => {
    const items = [item(), item({ productId: "p2" })];
    const next = withoutProduct(items, "p1");
    assert.equal(next.length, 1);
    assert.equal(next[0].productId, "p2");
  });
});

describe("addOne", () => {
  it("adds a missing line at 1", () => {
    const { productId, slug, name, sku, price, imageUrl } = item();
    const next = addOne([], { productId, slug, name, sku, price, imageUrl });
    assert.equal(next.length, 1);
    assert.equal(next[0].quantity, 1);
  });

  it("raises an existing line by one", () => {
    const next = addOne([item({ quantity: 3 })], item());
    assert.equal(next[0].quantity, 4);
  });

  it("stops at the database's ceiling", () => {
    const next = addOne([item({ quantity: MAX_QTY })], item());
    assert.equal(next[0].quantity, MAX_QTY);
  });
});
