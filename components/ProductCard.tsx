import Link from "next/link";

import { ProductImage } from "@/components/ProductImage";
import { formatMoney, inventoryLabel } from "@/lib/format";
import type { Product } from "@/lib/types";

/**
 * `headingLevel` exists so the card's heading nests correctly under whatever
 * section renders it: `h3` beneath a section `h2` on the home page, but `h2`
 * directly beneath the page `h1` on /shop. Skipping a level is a WCAG failure
 * (axe: heading-order) and it breaks the document outline for screen readers.
 */
export function ProductCard({
  product,
  headingLevel = "h3",
}: {
  product: Product;
  headingLevel?: "h2" | "h3";
}) {
  const status = inventoryLabel(product.inventoryStatus);
  const Heading = headingLevel;

  return (
    <article>
      <Link href={`/product/${product.slug}`} className="group block">
        {/* Datasheet: a bordered plate. Apple: a rounded, borderless tile on a
            raised surface — the separation comes from the surface, not a rule. */}
        <div className="relative aspect-[4/3] overflow-hidden border border-ink/15 bg-surface apple:aspect-square apple:rounded-2xl apple:border-0 apple:bg-surface apple:p-8">
          {product.imageUrl ? (
            <ProductImage src={product.imageUrl} name={product.name} className="h-full w-full" />
          ) : (
            <div
              className="flex h-full items-center justify-center font-mono text-xs text-steel"
              aria-hidden="true"
            >
              NO IMAGE
            </div>
          )}
        </div>

        {/* annotation strip: part no. · category · availability. This strip IS
            the datasheet concept, so the apple theme keeps only the part
            number — the metadata a shopper would actually need — and drops the
            rest rather than restyling it. */}
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-steel/50 pt-2 font-mono text-[11px] text-steel apple:mt-3 apple:border-0 apple:pt-0 apple:font-sans apple:text-xs">
          <span>
            {/* The part number is the datasheet's whole conceit, so it stays in
                that theme and is dropped from the apple one. */}
            <span className="apple:hidden">{product.sku} · </span>
            <span className="apple:font-medium apple:text-ink">
              {product.category}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className={`inline-block size-2 rounded-full ${status.dotClass}`}
              aria-hidden="true"
            />
            {status.text}
          </span>
        </div>

        <div className="mt-1 flex items-baseline justify-between gap-3 apple:mt-2">
          <Heading className="font-medium group-hover:text-drafting apple:text-lg apple:font-semibold">
            {product.name}
          </Heading>
          <p className="font-mono text-signal apple-tabular apple:font-sans apple:text-base">
            {formatMoney(product.price)}
          </p>
        </div>
      </Link>
    </article>
  );
}
