"use client";

import Link from "next/link";
import { useState } from "react";

import { useCart } from "@/lib/cart/cart-context";
import type { Product } from "@/lib/types";

export function AddToCartButton({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const unavailable = product.inventoryStatus === "out_of_stock";

  function handleAdd() {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      price: product.price,
      imageUrl: product.imageUrl,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2500);
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={handleAdd}
        disabled={unavailable}
        className="w-full bg-signal px-5 py-3 text-sm font-semibold text-paper hover:bg-signal/90 disabled:cursor-not-allowed disabled:bg-steel sm:w-auto apple:rounded-full apple:px-7 apple:py-3.5 apple:text-base"
      >
        {unavailable ? "Out of stock" : "Add to cart"}
      </button>

      <p aria-live="polite" className="mt-3 min-h-5 text-sm text-stock apple:text-base">
        {added && (
          <>
            Added to cart.{" "}
            <Link href="/cart" className="underline hover:text-drafting">
              Review cart
            </Link>
            .
          </>
        )}
      </p>
    </div>
  );
}
