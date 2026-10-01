import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CartProvider, useCart } from "@/lib/cart/cart-context";
import { cartSubtotal } from "@/lib/cart/math";
import { cartStore } from "@/lib/cart/store";

const productA = {
  productId: "p1",
  slug: "keyboard",
  name: "Keyboard",
  sku: "NG-001",
  price: 89,
  imageUrl: null,
};
const productB = { ...productA, productId: "p2", slug: "hub", name: "Hub", sku: "NG-005", price: 45 };

function Harness() {
  const { items, addItem, increment, decrement, setQuantity, removeItem, clearCart } = useCart();
  return (
    <div>
      <button onClick={() => addItem(productA)}>add-a</button>
      <button onClick={() => addItem(productB)}>add-b</button>
      <button onClick={() => increment("p1")}>inc-a</button>
      <button onClick={() => decrement("p1")}>dec-a</button>
      <button onClick={() => setQuantity("p1", 5000)}>set-huge</button>
      <button onClick={() => removeItem("p1")}>remove-a</button>
      <button onClick={clearCart}>clear</button>
      <output data-testid="summary">
        {items.length}:{items[0]?.quantity ?? 0}:{cartSubtotal(items)}
      </output>
    </div>
  );
}

const renderCart = () =>
  render(
    <CartProvider>
      <Harness />
    </CartProvider>,
  );

const summary = () => screen.getByTestId("summary").textContent;

afterEach(cleanup);

beforeEach(() => {
  // The cart store is a module singleton — reset it between tests.
  window.localStorage.clear();
  cartStore.clear();
});

describe("CartProvider", () => {
  it("adds items with quantity 1", () => {
    renderCart();
    fireEvent.click(screen.getByText("add-a"));
    expect(summary()).toBe("1:1:89");
    fireEvent.click(screen.getByText("add-b"));
    expect(summary()).toBe("2:1:134");
  });

  it("increments and re-adds clamp to max quantity", () => {
    renderCart();
    fireEvent.click(screen.getByText("add-a"));
    fireEvent.click(screen.getByText("inc-a"));
    expect(summary()).toBe("1:2:178");
    fireEvent.click(screen.getByText("set-huge"));
    expect(summary()).toBe("1:99:8811");
  });

  it("decrement removes the line at quantity 1", () => {
    renderCart();
    fireEvent.click(screen.getByText("add-a"));
    fireEvent.click(screen.getByText("dec-a"));
    expect(summary()).toBe("0:0:0");
  });

  it("remove and clear empty the cart", () => {
    renderCart();
    fireEvent.click(screen.getByText("add-a"));
    fireEvent.click(screen.getByText("add-b"));
    fireEvent.click(screen.getByText("remove-a"));
    expect(summary()).toBe("1:1:45");
    fireEvent.click(screen.getByText("clear"));
    expect(summary()).toBe("0:0:0");
  });

  it("writes every mutation to localStorage (survives a real reload)", () => {
    renderCart();
    fireEvent.click(screen.getByText("add-a"));
    fireEvent.click(screen.getByText("inc-a"));

    const stored = JSON.parse(
      window.localStorage.getItem("nexagear:cart") ?? "[]",
    ) as { productId: string; quantity: number }[];
    expect(stored).toHaveLength(1);
    expect(stored[0].productId).toBe("p1");
    expect(stored[0].quantity).toBe(2);
  });

  it("keeps state across provider remounts within the session", () => {
    const first = renderCart();
    fireEvent.click(screen.getByText("add-a"));
    expect(summary()).toBe("1:1:89");
    first.unmount();

    renderCart();
    expect(summary()).toBe("1:1:89");
  });
});
