import type { CartItem } from "./types.ts";

/**
 * The web's `lib/cart/math.ts`, ported without `parseStoredCart`.
 *
 * The phone keeps no local cart — `cart_items` is the only cart — so there is
 * no persisted blob to defend against. The bounds themselves are not cosmetic:
 * migration `0011_server_cart.sql` has `check (quantity between 1 and 99)`, so
 * a phone that stepped to 100 would get a refused write instead of an error
 * message. Keeping the two implementations byte-identical in behaviour is what
 * stops the web and the phone disagreeing about a quantity.
 */
export const MIN_QTY = 1;
export const MAX_QTY = 99;

/** Clamp a requested quantity into the sellable range. */
export function clampQuantity(qty: number): number {
  if (Number.isNaN(qty)) return MIN_QTY;
  return Math.min(MAX_QTY, Math.max(MIN_QTY, Math.trunc(qty)));
}

/** Increment/decrement with bounds; returns null when the item should be removed. */
export function stepQuantity(current: number, delta: number): number | null {
  const next = clampQuantity(current) + delta;
  if (next < MIN_QTY) return null;
  return clampQuantity(next);
}

/** Cents-safe subtotal. Display only — checkout re-prices from the database. */
export function cartSubtotal(items: CartItem[]): number {
  const cents = items.reduce(
    (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
    0,
  );
  return cents / 100;
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/** Replace one line's quantity, leaving the rest of the cart alone. */
export function withQuantity(
  items: CartItem[],
  productId: string,
  quantity: number,
): CartItem[] {
  return items.map((item) =>
    item.productId === productId ? { ...item, quantity } : item,
  );
}

/** Remove a line. */
export function withoutProduct(
  items: CartItem[],
  productId: string,
): CartItem[] {
  return items.filter((item) => item.productId !== productId);
}

/** Raise a line by one, adding it at 1 when it is not in the cart yet. */
export function addOne(
  items: CartItem[],
  item: Omit<CartItem, "quantity">,
): CartItem[] {
  const existing = items.find((i) => i.productId === item.productId);
  if (!existing) return [...items, { ...item, quantity: MIN_QTY }];
  return withQuantity(items, item.productId, clampQuantity(existing.quantity + 1));
}
