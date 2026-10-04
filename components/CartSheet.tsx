"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";

import { CartLine } from "@/components/CartLine";
import { useCart } from "@/lib/cart/cart-context";
import { cartSubtotal } from "@/lib/cart/math";
import { useCartSheet } from "@/lib/cart-sheet";
import { formatMoney } from "@/lib/format";

/**
 * The cart as a slide-over sheet.
 *
 * Built on the native `<dialog>` element and opened with `showModal()` rather
 * than a hand-rolled overlay. That is a deliberate choice: the browser already
 * provides modal semantics, a focus trap, Escape-to-close, top-layer stacking
 * above every z-index, and focus restoration to the previously focused element.
 * Re-implementing those is how overlays end up trapping focus wrongly, letting
 * Tab escape to the page behind, or losing the screen-reader position.
 *
 * Reads the cart through the existing `useCart()` and `cartSubtotal()`. The
 * data layer in `lib/cart/` is untouched.
 */
export function CartSheet() {
  const { items } = useCart();
  const { isOpen, close, takeReturnFocusTarget } = useCartSheet();
  const dialogRef = useRef<HTMLDialogElement>(null);

  // showModal() cannot be called during render, and by the time an effect runs
  // the DOM ref is available. It also throws if the dialog is already open,
  // which React 18+ StrictMode double-invokes effects for.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        // jsdom and very old browsers: fall back to the attribute so the sheet
        // is still openable and testable.
        dialog.setAttribute("open", "");
      }
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // The browser locks focus inside a modal dialog but not page scrolling, and a
  // sheet that lets the page behind it scroll is disorienting. `scrollbar-gutter`
  // reserves the scrollbar's width so locking it does not shift the layout.
  useEffect(() => {
    if (!isOpen) return;
    const root = document.documentElement;
    root.classList.add("cart-sheet-open");
    return () => root.classList.remove("cart-sheet-open");
  }, [isOpen]);

  const restoreFocus = useCallback(() => {
    const target = takeReturnFocusTarget();
    if (target && document.contains(target)) {
      target.focus();
    }
  }, [takeReturnFocusTarget]);

  /**
   * The dialog's own `close` event is the authoritative signal, not our state.
   *
   * Escape is handled by the BROWSER, not by us: it closes the dialog directly
   * and fires `close`, without React state ever changing. If this only restored
   * focus, `isOpen` would stay true after Escape — leaving the page scroll
   * locked forever, `aria-expanded` still saying "true", and the effect above
   * re-opening the dialog on the next render. Syncing here is what makes every
   * close path (Escape, the Close button, Keep browsing, a link) converge on
   * the same state.
   */
  const handleDialogClosed = useCallback(() => {
    restoreFocus();
    close();
  }, [restoreFocus, close]);

  // Clicks land on the <dialog> itself when they hit the ::backdrop, because
  // the backdrop is a pseudo-element of the dialog. Clicking the panel must not
  // close it, hence the identity check.
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDialogElement>) => {
      if (event.target === dialogRef.current) handleDialogClosed();
    },
    [handleDialogClosed],
  );

  const subtotal = cartSubtotal(items);
  const isEmpty = items.length === 0;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="cart-sheet-title"
      onClick={handleBackdropClick}
      onClose={handleDialogClosed}
      className="cart-sheet backdrop:bg-ink/40"
    >
      <div className="flex h-full flex-col bg-paper">
        <header className="flex items-center justify-between border-b border-ink/15 px-5 py-4 apple:border-b-0">
          <h2 id="cart-sheet-title" className="text-lg font-semibold">
            Your cart
          </h2>
          <button
            type="button"
            onClick={handleDialogClosed}
            className="rounded-full border border-ink/30 px-3 py-1.5 text-sm hover:bg-ink hover:text-paper apple:border-0 apple:bg-surface"
          >
            Close
          </button>
        </header>

        {isEmpty ? (
          <div className="flex flex-1 flex-col justify-center px-5 py-8">
            <p className="font-medium">Your cart is empty</p>
            <p className="mt-2 text-sm text-ink/75">
              Nothing has been added yet. Everything in the catalogue is one
              click away.
            </p>
            <Link
              href="/shop"
              onClick={handleDialogClosed}
              className="mt-4 inline-block w-fit bg-signal px-5 py-3 text-sm font-semibold text-paper hover:bg-signal/90 apple:rounded-full apple:px-7 apple:py-3.5"
            >
              Browse gear
            </Link>
          </div>
        ) : (
          <>
            <ul className="@container flex-1 overflow-y-auto px-5">
              {items.map((item) => (
                <CartLine key={item.productId} item={item} />
              ))}
            </ul>

            <div className="border-t border-ink/15 px-5 py-4 apple:border-ink/10">
              <dl className="ml-auto w-full max-w-sm space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-steel">Subtotal</dt>
                  <dd className="apple-tabular">{formatMoney(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-steel">Delivery</dt>
                  <dd className="text-stock">Free for this demo</dd>
                </div>
                <div className="flex justify-between border-t border-steel/50 pt-2 text-base">
                  <dt className="font-semibold">Total</dt>
                  <dd className="font-semibold text-signal apple-tabular">
                    {formatMoney(subtotal)}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-col gap-2">
                <Link
                  href="/checkout"
                  onClick={handleDialogClosed}
                  className="bg-signal px-6 py-3 text-center text-sm font-semibold text-paper hover:bg-signal/90 apple:rounded-full apple:py-3.5 apple:text-base"
                >
                  Continue to checkout
                </Link>
                <button
                  type="button"
                  onClick={handleDialogClosed}
                  className="border border-ink px-5 py-3 text-sm font-medium hover:bg-ink hover:text-paper apple:rounded-full apple:border-0 apple:bg-surface"
                >
                  Keep browsing
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
