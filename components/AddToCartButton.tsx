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
        className="w-full bg-signal px-5 py-3 text-sm font-semibold text-white hover:bg-signal/90 disabled:cursor-not-allowed disabled:bg-steel sm:w-auto"
      >
        {unavailable ? "Out of stock" : "Add to cart"}
      </button>

      <p aria-live="polite" className="mt-3 min-h-5 text-sm text-stock">
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
