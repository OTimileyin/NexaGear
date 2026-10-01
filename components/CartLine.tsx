"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { useCart } from "@/lib/cart/cart-context";
import { MAX_QTY, MIN_QTY, clampQuantity } from "@/lib/cart/math";
import { formatMoney } from "@/lib/format";
import type { CartItem } from "@/lib/types";

export function CartLine({ item }: { item: CartItem }) {
  const { increment, decrement, setQuantity, removeItem } = useCart();
  const [draft, setDraft] = useState(String(item.quantity));

  const lineTotal = Math.round(item.price * 100) * item.quantity / 100;

  function commitDraft() {
    const parsed = Number.parseInt(draft, 10);
    if (Number.isNaN(parsed)) {
      setQuantity(item.productId, MIN_QTY);
      setDraft(String(MIN_QTY));
      return;
    }
    const clamped = clampQuantity(parsed);
    setQuantity(item.productId, clamped);
    setDraft(String(clamped));
  }

  return (
    <li className="flex flex-col gap-4 border-b border-steel/40 py-6 sm:flex-row sm:items-center">
      <div className="relative h-20 w-24 shrink-0 overflow-hidden border border-ink/15 bg-white">
        {item.imageUrl && (
          <Image
            src={item.imageUrl}
            alt=""
            fill
            sizes="96px"
            className="object-cover"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <Link
          href={`/product/${item.slug}`}
          className="font-medium hover:text-drafting"
        >
          {item.name}
        </Link>
        <p className="font-mono text-[11px] text-steel">
          {item.sku} · {formatMoney(item.price)} each
        </p>
      </div>

      <div
        className="flex items-center gap-1"
        role="group"
        aria-label={`Quantity for ${item.name}`}
      >
        <button
          type="button"
          onClick={() => decrement(item.productId)}
          aria-label={`Decrease quantity of ${item.name}`}
          className="size-9 border border-ink/30 font-mono hover:bg-ink hover:text-paper"
        >
          −
        </button>
        <input
          type="number"
          min={MIN_QTY}
          max={MAX_QTY}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitDraft();
          }}
          aria-label={`Quantity for ${item.name}`}
          className="h-9 w-14 border border-ink/30 bg-white text-center font-mono"
        />
        <button
          type="button"
          onClick={() => increment(item.productId)}
          aria-label={`Increase quantity of ${item.name}`}
          className="size-9 border border-ink/30 font-mono hover:bg-ink hover:text-paper"
        >
          +
        </button>
      </div>

      <p className="w-24 text-right font-mono" aria-label={`Line total for ${item.name}`}>
        {formatMoney(lineTotal)}
      </p>

      <button
        type="button"
        onClick={() => removeItem(item.productId)}
        className="w-24 text-left text-sm text-ink/70 underline hover:text-signal"
      >
        Remove
      </button>
    </li>
  );
}
