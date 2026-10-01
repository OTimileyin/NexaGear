import Link from "next/link";

import { CatalogErrorState, EmptyCatalogState } from "@/components/CatalogState";
import { ProductGrid } from "@/components/ProductGrid";
import { getCategories, getFeaturedProducts } from "@/lib/catalog";

export const revalidate = 60;

async function getData() {
  const [featured, categories] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
  ]);
  return { featured, categories };
}

export default async function HomePage() {
  let data: Awaited<ReturnType<typeof getData>>;
  try {
    data = await getData();
  } catch {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16">
        <CatalogErrorState />
      </div>
    );
  }

  const isEmpty = data.featured.length === 0 && data.categories.length === 0;

  return (
    <div className="mx-auto max-w-5xl px-6">
      {/* Hero */}
      <section className="border-b border-ink/15 py-16 sm:py-24">
        <p className="font-mono text-xs tracking-wide text-steel">
          CATALOGUE 2026 · 7 CATEGORIES · SPEC-FIRST GEAR
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Gear that earns its desk space.
        </h1>
        <p className="mt-4 max-w-xl text-ink/75">
          Keyboards, hubs, power, audio, and electronics kits for developers,
          makers, and robotics learners — described like the datasheets you
          already read.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/shop"
            className="bg-signal px-5 py-3 text-sm font-semibold text-white hover:bg-signal/90"
          >
            Browse the catalogue
          </Link>
          <Link
            href="/shop"
            className="border border-ink px-5 py-3 text-sm font-medium hover:bg-ink hover:text-paper"
          >
            All categories
          </Link>
        </div>
      </section>

      {isEmpty ? (
        <section className="py-12">
          <EmptyCatalogState />
        </section>
      ) : (
        <>
          {/* Featured */}
          {data.featured.length > 0 && (
            <section className="py-12" aria-labelledby="featured-heading">
              <div className="flex items-baseline justify-between border-b border-steel/50 pb-2">
                <h2 id="featured-heading" className="text-lg font-semibold">
                  Featured parts
                </h2>
                <span className="font-mono text-[11px] text-steel">
                  SELECTED BY THE BENCH
                </span>
              </div>
              <div className="mt-8">
                <ProductGrid products={data.featured} />
              </div>
            </section>
          )}

          {/* Categories */}
          <section className="py-12" aria-labelledby="categories-heading">
            <div className="flex items-baseline justify-between border-b border-steel/50 pb-2">
              <h2 id="categories-heading" className="text-lg font-semibold">
                Categories
              </h2>
              <span className="font-mono text-[11px] text-steel">
                {String(data.categories.length).padStart(2, "0")} GROUPS
              </span>
            </div>
            <ul className="mt-4 divide-y divide-steel/40">
              {data.categories.map((category) => (
                <li key={category}>
                  <Link
                    href="/shop"
                    className="flex items-center justify-between py-4 hover:text-drafting"
                  >
                    <span className="font-medium">{category}</span>
                    <span className="font-mono text-xs text-steel">
                      VIEW →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {/* Brand story */}
      <section className="border-t border-ink/15 py-12" aria-labelledby="story-heading">
        <h2 id="story-heading" className="text-lg font-semibold">
          Why NexaGear
        </h2>
        <p className="mt-3 max-w-2xl text-ink/75">
          Most tech stores bury the three facts you actually need. NexaGear puts
          part numbers, specs, and prices where your eyes already go — then
          gets out of the way. Sign in with Google, place an order, and get a
          confirmation email that matches what you bought.
        </p>
      </section>
    </div>
  );
}
