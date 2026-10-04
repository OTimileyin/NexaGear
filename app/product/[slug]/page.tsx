import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { AddToCartButton } from "@/components/AddToCartButton";
import { CatalogErrorState } from "@/components/CatalogState";
import { ProductImage } from "@/components/ProductImage";
import { formatMoney, inventoryLabel } from "@/lib/format";
import { getProductBySlug } from "@/lib/catalog";
import { pageMetadata, productJsonLd, siteUrl } from "@/lib/seo";

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const canonical = `/product/${slug}`;
  try {
    const product = await getProductBySlug(slug);
    if (!product) return { title: "Product" };

    // Built through the shared helper so the canonical and og:url cannot
    // disagree. The social image comes from the sibling opengraph-image file,
    // which renders this product's real name, part number and price.
    return pageMetadata({
      title: product.name,
      description: product.description,
      path: canonical,
      // The card comes from the sibling opengraph-image file, which draws this
      // product's real part number, name and price. Passing null keeps the site
      // card from replacing it.
      image: null,
    });
  } catch {
    return { title: "Product" };
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  let product: Awaited<ReturnType<typeof getProductBySlug>>;
  try {
    product = await getProductBySlug(slug);
  } catch {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16">
        <CatalogErrorState />
      </div>
    );
  }

  if (!product) notFound();

  const status = inventoryLabel(product.inventoryStatus);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/*
        Product structured data for search engines. Built from the catalogue row
        only — no ratings, reviews or stock levels, because inventing them is
        both forbidden by the design guidelines and false. `productJsonLd`
        escapes `<` and `>`, so a description cannot close this script tag.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: productJsonLd(product, siteUrl()) }}
      />
      <nav aria-label="Breadcrumb" className="font-mono text-xs text-steel apple:font-sans apple:text-sm">
        <Link href="/shop" className="hover:text-drafting">
          SHOP
        </Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{product.sku}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* Annotated product image */}
        <div>
          <div className="relative aspect-[4/3] overflow-hidden border border-ink/15 bg-surface apple:aspect-square apple:rounded-3xl apple:border-0 apple:bg-surface apple:p-12">
            {product.imageUrl ? (
              <ProductImage
                src={product.imageUrl}
                name={product.name}
                className="h-full w-full"
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

          {/* drafting dimension rule that draws in */}
          <div className="relative mt-3 h-4 apple:hidden" aria-hidden="true">
            <div className="animate-draw-rule absolute inset-x-0 top-1/2 h-px bg-drafting" />
            <div className="absolute left-0 top-0 h-full w-px bg-drafting" />
            <div className="absolute right-0 top-0 h-full w-px bg-drafting" />
          </div>
          <p className="mt-1 font-mono text-[11px] text-steel apple:hidden">
            {product.sku} · {product.category.toUpperCase()} · REV 2026-10
          </p>
        </div>

        {/* Spec sheet */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight apple:text-4xl">
            {product.name}
          </h1>
          <p className="mt-4 text-ink/80">{product.description}</p>

          <dl className="mt-8 divide-y divide-steel/40 border-y border-steel/40 font-mono text-sm apple:mt-10 apple:divide-y-0 apple:border-y-0 apple:font-sans apple:text-base">
            <div className="flex justify-between py-3">
              <dt className="text-steel">Part no.</dt>
              <dd>{product.sku}</dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="text-steel">Category</dt>
              <dd>{product.category}</dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="text-steel">Availability</dt>
              <dd className="flex items-center gap-2">
                <span
                  className={`inline-block size-2 rounded-full ${status.dotClass}`}
                  aria-hidden="true"
                />
                {status.text}
              </dd>
            </div>
            <div className="flex justify-between py-3 apple:py-2">
              <dt className="text-steel">Price</dt>
              <dd className="text-signal apple-tabular apple:text-lg apple:font-semibold">
                {formatMoney(product.price)}
              </dd>
            </div>
          </dl>

          <AddToCartButton product={product} />

          <p className="mt-2 font-mono text-xs text-steel apple:font-sans apple:text-sm">
            Free delivery for this demo · priced from the catalogue record at
            checkout
          </p>
        </div>
      </div>
    </div>
  );
}
