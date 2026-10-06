import { CatalogErrorState, EmptyCatalogState } from "@/components/CatalogState";
import { ProductGrid } from "@/components/ProductGrid";
import { getProducts } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";

export const revalidate = 60;

export const metadata = pageMetadata({
  title: "Shop",
  description:
    "Browse creator gadgets, developer setups, audio, storage, networking, smart home and home appliances at NexaGear.",
  path: "/shop",
});

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string; sort?: string }> }) {
  const { category, q = "", sort = "name" } = await searchParams;
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

  const categories = [...new Set(products.map(product => product.category))];
  const selected = category && categories.includes(category) ? category : null;
  const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const visible = products.filter(product => (!selected || product.category === selected) && terms.every(term => `${product.name} ${product.category} ${product.sku}`.toLowerCase().includes(term))).sort((a, b) => sort === "price-low" ? a.price - b.price : sort === "price-high" ? b.price - a.price : a.name.localeCompare(b.name));
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="font-mono text-xs uppercase tracking-wider text-steel">The NexaGear catalogue</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Find your next essential.</h1><p className="mt-4 max-w-xl text-base leading-relaxed text-steel">Gear for a better workspace. Parts for whatever you’re building next.</p></div>
        <p className="font-mono text-sm text-steel">{visible.length} {visible.length === 1 ? "product" : "products"}</p>
      </div>
      <form action="/shop" className="mt-7 flex flex-wrap items-end gap-3">
        {selected ? <input type="hidden" name="category" value={selected} /> : null}
        <label className="min-w-0 flex-1"><span className="mb-2 block text-sm font-medium">Search products</span><input name="q" defaultValue={q} placeholder="Creator gadgets, appliances and more" className="min-h-12 w-full rounded-full border border-ink/20 bg-surface px-5 text-base" /></label>
        <label><span className="mb-2 block text-sm font-medium">Sort by</span><select name="sort" defaultValue={sort} className="min-h-12 rounded-full border border-ink/20 bg-surface px-4"><option value="name">Name</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label>
        <button type="submit" className="min-h-12 rounded-full bg-ink px-6 font-medium text-paper">Search</button>
      </form>
      <nav aria-label="Product categories" className="mt-8 flex flex-wrap gap-2 border-y border-ink/10 py-5">
        {["All gear", ...categories].map(label => {
          const active = label === (selected ?? "All gear");
          const query = new URLSearchParams({ ...(label === "All gear" ? {} : { category: label }), ...(q ? { q } : {}), ...(sort === "name" ? {} : { sort }) });
          return <Link key={label} href={`/shop${query.size ? `?${query}` : ""}`} aria-current={active ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors duration-200 ${active ? "border-ink bg-ink text-paper" : "border-ink/15 hover:border-ink/50"}`}>{label}</Link>;
        })}
      </nav>
      <p className="mt-4 text-xs leading-relaxed text-steel">Demo catalogue · photographs show representative gear, not exact stock items.</p>

      <div className="mt-10">
        {products.length === 0 ? (
          <EmptyCatalogState />
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-ink/15 p-8"><h2 className="text-xl font-semibold">No products found</h2><p className="mt-3 text-steel">Try another search or category.</p><Link href="/shop" className="mt-4 inline-flex min-h-11 items-center text-signal underline">Clear filters</Link></div>
        ) : (
          <ProductGrid products={visible} headingLevel="h2" />
        )}
      </div>
    </div>
  );
}
