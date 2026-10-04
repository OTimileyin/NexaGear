import { CatalogErrorState, EmptyCatalogState } from "@/components/CatalogState";
import { ProductGrid } from "@/components/ProductGrid";
import { getProducts } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 60;

export const metadata = pageMetadata({
  title: "Shop",
  description:
    "Browse the full NexaGear catalogue: developer setup, audio, connectivity, power, electronics, robotics, and prototyping gear.",
  path: "/shop",
});

export default async function ShopPage() {
  let products: Awaited<ReturnType<typeof getProducts>>;
  try {
    products = await getProducts();
  } catch {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16">
        <CatalogErrorState />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 apple:max-w-6xl apple:py-16">
      <div className="flex items-baseline justify-between border-b border-ink/15 pb-3 apple:border-b-0">
        <h1 className="text-2xl font-semibold tracking-tight apple:text-4xl">
          Shop
        </h1>
        <span className="font-mono text-[11px] text-steel apple:hidden">
          {products.length === 0
            ? "00 PARTS"
            : `${String(products.length).padStart(2, "0")} PARTS`}
        </span>
      </div>

      <div className="mt-10">
        {products.length === 0 ? (
          <EmptyCatalogState />
        ) : (
          <ProductGrid products={products} headingLevel="h2" />
        )}
      </div>
    </div>
  );
}
