import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CartItem } from "@/lib/types";

/**
 * The cart's server mode (D35).
 *
 * Two of these assertions exist because getting them wrong is silent and
 * expensive:
 *
 *   - `guestItems()` must be EMPTY once the server cart is attached. It is the
 *     input to the sign-in merge, so returning the account's own cart would
 *     send it back through merge_guest_cart, which SUMS — every sign-in would
 *     double every quantity.
 *   - decrementing the last unit must DELETE the row, not write a quantity of
 *     zero. `cart_items.quantity` has `check (quantity between 1 and 99)`, so a
 *     zero would be rejected by the database and the line would come back on
 *     the next realtime event.
 *
 * The store is a module singleton, so each test imports a fresh copy.
 */

const item = (productId: string, quantity = 1): CartItem => ({
  productId,
  slug: `slug-${productId}`,
  name: `Product ${productId}`,
  sku: `NG-${productId}`,
  price: 10,
  imageUrl: null,
  quantity,
});

async function freshStore() {
  vi.resetModules();
  const { cartStore } = await import("@/lib/cart/store");
  return cartStore;
}

/** A new store instance still reads the shared jsdom localStorage, so the
 *  storage has to be cleared between tests or one test's cart leaks into the
 *  next one's "empty" assertion. */
beforeEach(() => {
  window.localStorage.clear();
});

const newItem = (productId: string): Omit<CartItem, "quantity"> => ({
  productId,
  slug: `slug-${productId}`,
  name: `Product ${productId}`,
  sku: `NG-${productId}`,
  price: 10,
  imageUrl: null,
});

function fakeBridge() {
  return {
    upsert: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  };
}

describe("cart store — local mode is unchanged", () => {
  it("persists to localStorage when nobody is signed in", async () => {
    const store = await freshStore();
    store.addItem(newItem("1"));
    expect(store.isServerBacked()).toBe(false);
    expect(window.localStorage.getItem("nexagear:cart")).toContain("slug-1");
  });

  it("ignores server items while the cart is local", async () => {
    const store = await freshStore();
    store.applyServerItems([item("9", 5)]);
    expect(store.getSnapshot()).toEqual([]);
  });
});

describe("cart store — server mode", () => {
  it("hands the cart to the account and clears the local copy", async () => {
    const store = await freshStore();
    store.addItem(newItem("1"));

    const bridge = fakeBridge();
    store.attachServer(bridge, [item("2", 3)]);

    expect(store.isServerBacked()).toBe(true);
    expect(store.getSnapshot()).toEqual([item("2", 3)]);
    // The guest cart is gone locally: otherwise signing out on a shared device
    // would hand the next visitor the previous customer's cart.
    expect(window.localStorage.getItem("nexagear:cart")).toBeNull();
  });

  it("stops reporting guest items once attached, so a merge cannot run twice", async () => {
    const store = await freshStore();
    store.addItem(newItem("1"));
    expect(store.guestItems()).toHaveLength(1);

    store.attachServer(fakeBridge(), [item("2", 3)]);

    // Empty, NOT the two server items — this is the double-quantity guard.
    expect(store.guestItems()).toEqual([]);
  });

  it("mirrors an add as an upsert, and a repeat add as the new quantity", async () => {
    const store = await freshStore();
    const bridge = fakeBridge();
    store.attachServer(bridge, []);

    store.addItem(newItem("1"));
    expect(bridge.upsert).toHaveBeenLastCalledWith("1", 1);

    store.addItem(newItem("1"));
    expect(bridge.upsert).toHaveBeenLastCalledWith("1", 2);
  });

  it("DELETES rather than writing zero when the last unit is decremented", async () => {
    const store = await freshStore();
    const bridge = fakeBridge();
    store.attachServer(bridge, [item("1", 1)]);

    store.decrement("1");

    expect(store.getSnapshot()).toEqual([]);
    expect(bridge.remove).toHaveBeenCalledWith("1");
    // The assertion that matters: never upsert(0), which the CHECK constraint
    // would reject, leaving the row to reappear on the next sync.
    expect(bridge.upsert).not.toHaveBeenCalled();
  });

  it("mirrors a decrement that keeps the line", async () => {
    const store = await freshStore();
    const bridge = fakeBridge();
    store.attachServer(bridge, [item("1", 3)]);

    store.decrement("1");

    expect(bridge.upsert).toHaveBeenCalledWith("1", 2);
    expect(bridge.remove).not.toHaveBeenCalled();
  });

  it("mirrors removals and clearing", async () => {
    const store = await freshStore();
    const bridge = fakeBridge();
    store.attachServer(bridge, [item("1", 2), item("2", 4)]);

    store.removeItem("1");
    expect(bridge.remove).toHaveBeenCalledWith("1");

    store.clear();
    expect(bridge.clear).toHaveBeenCalled();
    expect(store.getSnapshot()).toEqual([]);
  });

  it("replaces the visible cart when the server reports new items", async () => {
    const store = await freshStore();
    const bridge = fakeBridge();
    store.attachServer(bridge, [item("1", 1)]);

    // What a realtime event from the phone looks like on the website.
    store.applyServerItems([item("1", 1), item("7", 2)]);

    expect(store.getSnapshot().map((i) => i.productId)).toEqual(["1", "7"]);
    expect(bridge.upsert).not.toHaveBeenCalled(); // applying must not echo back
  });

  it("returns to a local, empty cart on sign-out", async () => {
    const store = await freshStore();
    store.attachServer(fakeBridge(), [item("1", 2)]);

    store.detachServer();

    expect(store.isServerBacked()).toBe(false);
    expect(store.getSnapshot()).toEqual([]);
  });

  it("notifies subscribers when the server cart changes", async () => {
    const store = await freshStore();
    store.attachServer(fakeBridge(), []);
    const listener = vi.fn();
    store.subscribe(listener);

    store.applyServerItems([item("1", 1)]);

    expect(listener).toHaveBeenCalled();
  });
});
