"use client";

import { useCart } from "@/lib/cart/cart-context";
import { cartCount } from "@/lib/cart/math";

/** Live item count for the header — renders nothing until the cart hydrates. */
export function CartCount() {
  const { items } = useCart();
  const count = cartCount(items);
  if (count === 0) return null;

  return (
    <span
      className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-signal px-1 font-mono text-[11px] leading-5 text-white"
      aria-hidden="true"
    >
      {count}
    </span>
  );
}
