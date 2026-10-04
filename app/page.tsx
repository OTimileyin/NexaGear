import Link from "next/link";

import { CatalogErrorState, EmptyCatalogState } from "@/components/CatalogState";
import { ProductGrid } from "@/components/ProductGrid";
import { SampleDataNotice } from "@/components/SampleDataNotice";
import { getCategories, getFeaturedProducts } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 60;

/**
 * Declared here rather than only in the root layout so the homepage emits its
 * own canonical. A canonical set on the root layout would be inherited by
 * every route that does not override it, which would tell crawlers that
 * /checkout and /admin are copies of the homepage.
 */
export const metadata = pageMetadata({
  title: { absolute: "NexaGear — gear for developers and makers" },
  description:
    "Mechanical keyboards, precision mice, USB-C hubs, power, Arduino kits, sensors, and prototyping tools for developers, makers, and robotics learners.",
  path: "/",
});

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
    <div className="mx-auto max-w-5xl px-6 apple:max-w-6xl">
      <div className="pt-8">
        <SampleDataNotice />
      </div>

      {/* Hero */}
      <section className="border-b border-ink/15 py-16 sm:py-24 apple:border-b-0 apple:py-24 apple:text-center">
        <p className="font-mono text-xs tracking-wide text-steel apple:hidden">
          CATALOGUE 2026 · 7 CATEGORIES · SPEC-FIRST GEAR
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl apple:mx-auto apple:mt-0 apple:max-w-4xl apple:text-6xl apple:leading-[1.05]">
          Gear that earns its desk space.
        </h1>
        <p className="mt-4 max-w-xl text-ink/75 apple:mx-auto apple:mt-6 apple:max-w-2xl apple:text-lg">
          Keyboards, hubs, power, audio, and electronics kits for developers,
          makers, and robotics learners — described like the datasheets you
          already read.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 apple:justify-center">
          <Link
            href="/shop"
            className="bg-signal px-5 py-3 text-sm font-semibold text-paper hover:bg-signal/90 apple:rounded-full apple:px-7 apple:py-3.5 apple:text-base"
          >
            Browse the catalogue
          </Link>
          <Link
            href="/shop"
            className="border border-ink px-5 py-3 text-sm font-medium hover:bg-ink hover:text-paper apple:rounded-full apple:border-0 apple:bg-surface apple:text-base"
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
            <section className="py-12" aria-labelledby="featured-heading"><div className="flex items-baseline justify-between border-b border-steel/50 pb-2 apple:border-b-0">
                  <h2 id="featured-heading" className="text-lg font-semibold apple:text-2xl">
                    Featured parts
                  </h2>
                  <span className="font-mono text-[11px] text-steel apple:hidden">
                    SELECTED BY THE BENCH
                  </span>
                </div>
              <div className="mt-8">
                <ProductGrid products={data.featured} />
              </div>
            </section>
          )}

          {/* Categories */}
          <section className="py-12" aria-labelledby="categories-heading"><div className="flex items-baseline justify-between border-b border-steel/50 pb-2 apple:border-b-0">
                <h2 id="categories-heading" className="text-lg font-semibold">
                  Categories
                </h2>
                <span className="font-mono text-[11px] text-steel apple:hidden">
                  {String(data.categories.length).padStart(2, "0")} GROUPS
                </span>
              </div>
              {/* Datasheet: a ruled index. Apple: a wrap of pill chips — the
                  same content, laid out the way that language sets it. */}
              <ul className="mt-4 divide-y divide-steel/40 apple:mt-6 apple:flex apple:flex-wrap apple:gap-3 apple:divide-y-0">
                {data.categories.map((category) => (
                  <li key={category}>
                    <Link
                      href="/shop"
                      className="flex items-center justify-between py-4 hover:text-drafting apple:rounded-full apple:bg-surface apple:px-5 apple:py-2.5 apple:text-sm apple:hover:bg-ink apple:hover:text-paper"
                    >
                      <span className="font-medium">{category}</span>
                      <span className="font-mono text-xs text-steel apple:hidden">
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
