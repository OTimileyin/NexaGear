"use client";

import { useRef } from "react";

import { CartCount } from "@/components/CartCount";
import { useCartSheet } from "@/lib/cart-sheet";

/**
 * Header control that opens the cart sheet.
 *
 * A button, not a link: opening a sheet is an action on the current page, not a
 * navigation. It carries `aria-expanded` and `aria-controls` so assistive
 * technology can report that it reveals a dialog and which one.
 *
 * `/cart` still exists as a real page for deep links — a sheet cannot be
 * linked to, and a shared or bookmarked cart URL must not 404.
 */
export function CartTrigger() {
  const { isOpen, open } = useCartSheet();
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => open(ref.current)}
      aria-expanded={isOpen}
      aria-controls="cart-sheet"
      className="flex items-center font-mono hover:text-drafting apple:font-sans"
    >
      Cart
      <CartCount />
    </button>
  );
}
