"use client";

import Link from "next/link";

import { CartLine } from "@/components/CartLine";
import { useCart } from "@/lib/cart/cart-context";
import { cartSubtotal } from "@/lib/cart/math";
import { formatMoney } from "@/lib/format";

export default function CartPage() {
  const { items } = useCart();
  const subtotal = cartSubtotal(items);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-baseline justify-between border-b border-ink/15 pb-3 apple:border-b-0">
        <h1 className="text-2xl font-semibold tracking-tight apple:text-4xl">
          Cart
        </h1>
        <span className="font-mono text-[11px] text-steel apple:hidden">
          {items.length === 0
            ? "00 LINES"
            : `${String(items.length).padStart(2, "0")} ${items.length === 1 ? "LINE" : "LINES"}`}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="mt-10 border-l-4 border-drafting bg-surface px-6 py-8 apple:rounded-2xl apple:border-l-0 apple:border apple:border-drafting/30 apple:bg-surface">
          <h2 className="font-medium">Your cart is empty</h2>
          <p className="mt-2 text-sm text-ink/75">
            Nothing has been added yet. Everything in the catalogue is one
            click from here.
          </p>
          <Link
            href="/shop"
            className="mt-4 inline-block bg-signal px-5 py-3 text-sm font-semibold text-paper hover:bg-signal/90 apple:rounded-full apple:px-7 apple:py-3.5 apple:text-base"
          >
            Browse gear
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-2 @container">
            {items.map((item) => (
              <CartLine key={item.productId} item={item} />
            ))}
          </ul>

          <dl className="mt-8 ml-auto w-full max-w-sm space-y-2 font-mono text-sm apple:font-sans apple:text-base">
            <div className="flex justify-between">
              <dt className="text-steel">Subtotal</dt>
              <dd>{formatMoney(subtotal)}</dd>
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

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/checkout"
              className="bg-signal px-6 py-3 text-sm font-semibold text-paper hover:bg-signal/90 apple:rounded-full apple:px-8 apple:py-3.5 apple:text-base"
            >
              Continue to checkout
            </Link>
            <Link
              href="/shop"
              className="border border-ink px-5 py-3 text-sm font-medium hover:bg-ink hover:text-paper apple:rounded-full apple:border-0 apple:bg-surface"
            >
              Keep browsing
            </Link>
          </div>

          <p className="mt-4 font-mono text-[11px] text-steel">
            Totals shown here are display-only — checkout recalculates every
            price from the catalogue.
          </p>
        </>
      )}
    </div>
  );
}
