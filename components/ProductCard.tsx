import Image from "next/image";
import Link from "next/link";

import { formatMoney, inventoryLabel } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const status = inventoryLabel(product.inventoryStatus);

  return (
    <article>
      <Link href={`/product/${product.slug}`} className="group block">
        <div className="relative aspect-[4/3] overflow-hidden border border-ink/15 bg-white">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover"
            />
          ) : (
            <div
              className="flex h-full items-center justify-center font-mono text-xs text-steel"
              aria-hidden="true"
            >
              NO IMAGE
            </div>
          )}
        </div>

        {/* annotation strip: part no. · category · availability */}
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-steel/50 pt-2 font-mono text-[11px] text-steel">
          <span>
            {product.sku} · {product.category}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className={`inline-block size-2 rounded-full ${status.dotClass}`}
              aria-hidden="true"
            />
            {status.text}
          </span>
        </div>

        <div className="mt-1 flex items-baseline justify-between gap-3">
          <h3 className="font-medium group-hover:text-drafting">
            {product.name}
          </h3>
          <p className="font-mono text-signal">{formatMoney(product.price)}</p>
        </div>
      </Link>
    </article>
  );
}
