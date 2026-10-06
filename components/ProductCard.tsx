import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { formatMoney, inventoryLabel } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductCard({ product, headingLevel = "h3" }: {
  product: Product; headingLevel?: "h2" | "h3";
}) {
  const status = inventoryLabel(product.inventoryStatus);
  const Heading = headingLevel;
  return <article><Link href={`/product/${product.slug}`} className="group block rounded-xl">
    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface">
      {product.imageUrl ? <ProductImage src={product.imageUrl} name={product.name} className="h-full w-full" /> : <div className="flex h-full items-center justify-center text-sm text-steel">Image unavailable</div>}
      <span className="absolute bottom-3 left-3 rounded-full bg-paper px-3 py-1 text-xs font-medium text-ink">{status.text}</span>
    </div>
    <p className="mt-4 text-sm text-steel">{product.category}</p>
    <Heading className="mt-1 text-lg font-semibold leading-snug tracking-tight group-hover:text-signal">{product.name}</Heading>
    <div className="mt-2 flex items-center justify-between"><p className="font-mono text-base font-medium">{formatMoney(product.price)}</p><span className="text-sm text-steel group-hover:text-signal" aria-hidden="true">Explore ↗</span></div>
  </Link></article>;
}
