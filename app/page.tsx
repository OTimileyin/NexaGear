import Image from "next/image";
import Link from "next/link";
import { CatalogErrorState, EmptyCatalogState } from "@/components/CatalogState";
import { MotionReveal } from "@/components/MotionReveal";
import { ProductGrid } from "@/components/ProductGrid";
import { SampleDataNotice } from "@/components/SampleDataNotice";
import { getFeaturedProducts } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 60;
export const metadata = pageMetadata({ title: { absolute: "NexaGear — make room for your next idea" }, description: "Desk essentials and electronics for developers and makers. Explore keyboards, audio, power, and your next build.", path: "/" });

export default async function HomePage() {
  let featured: Awaited<ReturnType<typeof getFeaturedProducts>> = [];
  let unavailable = false;
  try { featured = await getFeaturedProducts(); } catch { unavailable = true; }
  return <div>
    <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-14 lg:pb-24 lg:pt-20" aria-labelledby="hero-heading">
      <div className="hero-copy">
        <p className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.16em] text-steel"><span className="h-px w-8 bg-signal" /> For developers. For makers.</p>
        <h1 id="hero-heading" className="mt-7 max-w-xl text-[clamp(2.75rem,5.3vw,5.25rem)] font-semibold leading-[1.04] tracking-[-0.055em]">Make room<br />for your<br /><span className="text-signal">next idea.</span></h1>
        <p className="mt-7 max-w-md text-lg leading-relaxed text-steel">From the first keystroke to the final connection. Gear for the desk you work at and the things you want to build.</p>
        <div className="mt-8 flex flex-wrap items-center gap-6"><Link href="/shop" className="inline-flex min-h-12 items-center gap-8 rounded-lg bg-signal px-6 py-3 font-semibold text-paper transition-opacity duration-200 hover:opacity-90">Explore the gear <span aria-hidden="true">↗</span></Link><a href="#collections" className="inline-flex min-h-12 items-center gap-2 font-medium hover:text-signal">Find your setup <span aria-hidden="true">↓</span></a></div>
        <p className="mt-8 font-mono text-xs text-steel">DESK ESSENTIALS / ELECTRONICS / ROBOTICS</p>
      </div>
      <div className="hero-stage relative isolate min-h-[430px] sm:min-h-[520px]">
        <div className="absolute inset-x-0 bottom-8 top-3 overflow-hidden rounded-[2rem] bg-surface"><Image src="/images/photography/workspace.webp" alt="A real workspace with a mechanical keyboard, mouse, and headphones" fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="hero-photo object-cover" /></div>
        <div className="hero-label absolute bottom-0 left-4 right-4 flex items-center justify-between gap-4 rounded-xl border border-ink/10 bg-paper px-5 py-5 shadow-lg sm:left-8 sm:right-8"><div><p className="font-mono text-[11px] uppercase tracking-wider text-steel">The everyday setup</p><p className="mt-1 text-lg font-semibold tracking-tight">Less friction. More making.</p></div><span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-ink/20 text-xl" aria-hidden="true">↗</span></div>
        <span className="absolute right-5 top-7 rounded-full bg-paper px-4 py-2 font-mono text-xs">NEXAGEAR / 01</span>
      </div>
    </section>
    <div className="border-y border-ink/10"><div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 px-5 py-5 text-sm font-medium text-steel sm:px-8"><span>Thoughtful desk essentials</span><span>Parts for hands-on projects</span><span>Clear specs. Straightforward choices.</span></div></div>
    <MotionReveal><section id="collections" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-16 sm:px-8 lg:py-24" aria-labelledby="collections-heading">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-wider text-steel">Choose your starting point</p><h2 id="collections-heading" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Built around what you do.</h2></div><Link href="/shop" className="inline-flex min-h-11 items-center gap-3 font-medium hover:text-signal">All gear <span aria-hidden="true">↗</span></Link></div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">{[{ title: "Your desk, considered.", body: "Keyboards, audio, and the essentials that bring your workspace together.", image: "compact-mechanical-keyboard", category: "Developer Setup", label: "01 / DESK ESSENTIALS" }, { title: "An idea. A few good parts.", body: "Boards, sensors, and tools for learning by building.", image: "arduino-starter-kit", category: "Electronics", label: "02 / THE MAKER BENCH" }].map(collection => <Link key={collection.title} href={`/shop?category=${encodeURIComponent(collection.category)}`} className="group rounded-2xl border border-ink/10 bg-surface p-4 sm:p-6"><div className="relative aspect-[16/9] overflow-hidden rounded-xl"><Image src={`/images/photography/${collection.image}.webp`} alt="" fill sizes="(max-width: 768px) 90vw, 45vw" className="object-cover transition-transform duration-200 group-hover:scale-[1.035] motion-reduce:transform-none" /></div><p className="mt-6 font-mono text-xs text-steel">{collection.label}</p><h3 className="mt-2 text-2xl font-semibold tracking-tight">{collection.title} <span aria-hidden="true">↗</span></h3><p className="mt-3 max-w-md text-base leading-relaxed text-steel">{collection.body}</p></Link>)}</div>
    </section></MotionReveal>
    <MotionReveal><section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8 lg:pb-24" aria-labelledby="featured-heading"><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-wider text-steel">Explore the catalogue</p><h2 id="featured-heading" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">A good place to start.</h2></div><Link href="/shop" className="inline-flex min-h-11 items-center hover:text-signal">Shop all gear ↗</Link></div>{unavailable ? <CatalogErrorState /> : featured.length ? <ProductGrid products={featured} /> : <EmptyCatalogState />}</section></MotionReveal>
    <MotionReveal><section id="our-approach" className="scroll-mt-24 border-y border-ink/10 bg-surface" aria-labelledby="approach-heading"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:py-24"><div><p className="font-mono text-xs uppercase tracking-wider text-steel">The NexaGear approach</p><h2 id="approach-heading" className="mt-4 max-w-lg text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Good gear should<br />make space for<br /><span className="text-signal">good ideas.</span></h2></div><div className="lg:pt-8"><p className="max-w-lg text-lg leading-relaxed text-steel">NexaGear brings developer essentials and maker hardware into one place. Inspect the specs, choose the right parts, and get back to what you want to make.</p><div className="mt-8 divide-y divide-ink/10 border-y border-ink/10">{["Know what you’re choosing — specs alongside every product.", "Start with your workspace. Keep going with your next build."].map(text => <p key={text} className="py-5 text-base">{text}</p>)}</div></div></div></section></MotionReveal>
    <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-8"><SampleDataNotice /></div>
  </div>;
}
