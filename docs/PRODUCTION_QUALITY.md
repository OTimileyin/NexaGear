# NexaGear — Production Quality

Checklist for the deployed Vercel app. `[x]` verified or `N/A` with reason; evidence recorded in `IMPLEMENTATION_PLAN.md`.

## Identity & discovery

| Item | Status target | Notes |
|---|---|---|
| Custom domain | **N/A (assignment)** | Vercel-provided URL satisfies HNG; revisit for real use |
| Page titles (unique per route) | required | Root title template + per-page titles |
| Meta descriptions | required | Homepage, shop, product detail |
| Canonical URLs | required | `NEXT_PUBLIC_SITE_URL`-based canonicals |
| Favicon | required | Simple NexaGear mark; no placeholder emoji |
| `sitemap.xml` | required | Static routes + product slugs (App Router sitemap) |
| `robots.txt` | required | Allow app pages |
| `llms.txt` | **N/A** | Not a content site; no AI-crawl requirement stated |
| Social metadata (OG/Twitter) | required | Title + description + representative product image |
| Structured data (JSON-LD) | optional | `Store` + `Product` schema if time allows — not an assignment requirement |

## Navigation & content

- [ ] Custom 404 page with a route back to the shop (no framework default)
- [ ] Internal links all resolve (home ↔ shop ↔ product ↔ cart ↔ checkout)
- [ ] Breadcrumbs — **N/A: shallow route depth (≤2)** makes them noise
- [ ] Alt text on every product image (describes the actual product)
- [ ] No framework placeholder content (no "Lorem ipsum", no create-next-app default copy/svgs anywhere)

## Runtime health

- [ ] Browser console clean on all six routes (no errors/warnings)
- [ ] Server logs clean during full journey (no unhandled errors)
- [ ] Bundle size reasonable: first load JS budget — record actual number; flag >200KB gzipped first-load for review
- [ ] Source maps: leave Vercel defaults (off in production) — map crash reports only if a logger is added later
- [ ] Images optimized via `next/image` (correct sizes/formats; no layout shift)

## Copy & honesty

- [ ] Headlines name NexaGear/gear (no generic marketing language)
- [ ] No invented testimonials, ratings, user counts, logos, or statistics
- [ ] Demo status stated where it matters (legal pages, README)
- [ ] Every number on screen (prices, totals) derives from real data, not mocks
