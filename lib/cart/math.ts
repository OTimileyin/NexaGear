import type { CartItem } from "@/lib/types";

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

/** Cart subtotal — cents-safe rounding, authoritative inputs come from the server at checkout. */
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

/** Defensively parse persisted cart state; drops anything malformed. */
export function parseStoredCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const items: CartItem[] = [];
    for (const entry of parsed) {
      if (typeof entry !== "object" || entry === null) continue;
      const e = entry as Record<string, unknown>;
      if (
        typeof e.productId !== "string" ||
        typeof e.slug !== "string" ||
        typeof e.name !== "string" ||
        typeof e.sku !== "string" ||
        typeof e.price !== "number" ||
        !Number.isFinite(e.price) ||
        typeof e.quantity !== "number"
      ) {
        continue;
      }
      items.push({
        productId: e.productId,
        slug: e.slug,
        name: e.name,
        sku: e.sku,
        price: e.price,
        imageUrl: typeof e.imageUrl === "string" ? e.imageUrl : null,
        quantity: clampQuantity(e.quantity),
      });
    }
    return items;
  } catch {
    return [];
  }
}
