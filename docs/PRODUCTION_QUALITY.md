# NexaGear — Production Quality

Checklist for the deployed Vercel app. `[x]` verified or `N/A` with reason; evidence recorded in `IMPLEMENTATION_PLAN.md`.

Status of this file: **resolved 2026-10-04.** Two rows changed materially during
this pass and are called out inline: the social-metadata row was **not** true
when this was last checked, and the bundle row is now a **measured number that
is over its own budget**.

## Identity & discovery

| Item | Status | Notes |
|---|---|---|
| Custom domain | **N/A (assignment)** | Vercel-provided URL satisfies HNG; revisit for real use |
| Page titles (unique per route) | `[x]` | Root template `%s · NexaGear` plus a per-route title; the homepage opts out with `absolute` so the brand line is not doubled. Verified on `/`, `/shop`, `/cart`, `/privacy`, `/terms`, product pages. |
| Meta descriptions | `[x]` | Homepage, shop and product detail each publish one, and `og:description` matches |
| Canonical URLs | `[x]` **fixed this pass** | `/` and `/shop` emitted **no canonical at all** before; `/shop`, `/privacy`, `/terms` told crawlers their URL was the homepage. All page metadata now goes through `pageMetadata()` in `lib/seo.ts`, which derives the canonical and `og:url` from one path. Verified by fetching the rendered HTML. |
| Favicon | `[x]` | `app/icon.svg` — a real NexaGear mark, no placeholder emoji |
| `sitemap.xml` | `[x]` | `app/sitemap.ts`: static routes + every product slug from the database; private surfaces excluded to match `robots.ts` |
| `robots.txt` | `[x]` | `app/robots.ts` disallows `/checkout`, `/order/`, `/admin`, `/sign-in`, `/sign-up`; now resolved through `siteUrl()` so the advertised sitemap origin cannot differ from the pages' canonicals |
| `llms.txt` | **N/A** | Not a content site; no AI-crawl requirement stated |
| Social metadata (OG/Twitter) | `[x]` **fixed this pass** | Product pages published **no `og:image` at all**, and their `twitter:title` was the site's rather than the product's. Root card existed (`app/opengraph-image.tsx`), but a page-level `openGraph` suppresses the inherited card. Added `app/product/[slug]/opengraph-image.tsx`, which draws the real part number, name, price, category and stock state. Twitter card corrected to `summary_large_image` (the asset is 1200×630). Verified by decoding each card in the browser: 1200×630 PNG containing the paper ground, ink text and signal accent. |
| Structured data (JSON-LD) | `[x]` optional, done | `Product` JSON-LD from catalogue fields only — no ratings, reviews or stock counts, since inventing them is forbidden and a lying rich result is worse than none |

## Navigation & content

- [x] Custom 404 page with a route back to the shop (no framework default) — `app/not-found.tsx`; `tests/e2e/wedge.spec.ts` clicks "Browse the catalogue" and lands on `/shop`
- [x] Internal links all resolve (home ↔ shop ↔ product ↔ cart ↔ checkout) — **verified by crawling**: `tests/e2e/quality.spec.ts` collects every internal `href` rendered across seven routes and asserts none returns ≥400
- [x] Breadcrumbs — **N/A: shallow route depth (≤2)** makes them noise
- [x] Alt text on every product image (describes the actual product) — the artwork is a `role="img"` mask, so the name is `aria-label`; asserted non-empty, non-generic and actually masked for every card on `/shop`
- [x] No framework placeholder content (no "Lorem ipsum", no create-next-app default copy/svgs anywhere) — sweep over `app/`, `components/` and `public/` returns nothing; `public/` holds only the 11 product SVGs

## Runtime health

- [x] Browser console clean on all six routes (no errors/warnings) — measured across `/`, `/shop`, `/cart`, `/checkout`, `/order/track`, `/privacy`, `/terms`. **One message appears on every route and is deliberately ignored**: Clerk's "loaded with development keys" warning. It is true, it is not ours to fix without a production Clerk instance, and ignoring it by pattern is stated in the spec rather than hidden.
- [x] Server logs clean during full journey (no unhandled errors) — the only server-side entries are that same Clerk notice relayed from the browser; no unhandled rejection, no 500 in `.next/dev/logs/next-development.log` during the e2e runs
- [x] Bundle size reasonable: first load JS budget — **MEASURED, OVER BUDGET, FLAGGED.** 405 KB transferred (≈1.35 MB decoded) per route, against the 200 KB budget. Measured by `scripts/measure-first-load.mjs` against a production server (`next build && next start`), reading the browser's own encoded transfer sizes. **Cause: 215 KB of the 405 KB is Clerk's prebuilt UI bundle** (`ui-common` 129.5 KB, `framework_ui` 42.6 KB, `vendors_ui` 37.6 KB, `subscriptionDetails_ui` 5.1 KB), loaded on routes that never render a Clerk component — `/`, `/shop` and `/cart` use only headless hooks. Flagged for review rather than changed late: deferring Clerk's UI would alter the auth path, which cannot be verified against a signed-in session here. Re-measure with `MEASURE_DETAIL=1`.
- [x] Source maps: leave Vercel defaults (off in production) — map crash reports only if a logger is added later
- [x] Images optimized via next/image — **changed, and the deviation is deliberate.** There are **no bitmap images**: `public/` is 11 hand-authored SVGs totalling 48 KB. `next/image` is used **nowhere**, because it does not transform SVG and enabling `dangerouslyAllowSVG` to make it try is an XSS vector. The artwork renders as a CSS mask instead (D33), which is what lets one file follow all four themes. The intent of this row — correct formats, no layout shift — is verified rather than assumed: transfer is 48 KB total, and **Cumulative Layout Shift is measured in-browser and asserted < 0.1** (`tests/e2e/quality.spec.ts`).

## Copy & honesty

- [x] Headlines name NexaGear/gear (no generic marketing language) — "Gear that earns its desk space", "Shop", product names from the catalogue
- [x] No invented testimonials, ratings, user counts, logos, or statistics — none exist anywhere in the tree; the JSON-LD publishes no ratings either
- [x] Demo status stated where it matters (legal pages, README) — `/privacy` and `/terms` carry a "DRAFT · DEMO PROJECT" marker, the README states it, and sample orders are labelled in the UI (`SampleDataNotice`)
- [x] Every number on screen (prices, totals) derives from real data, not mocks — prices come from `products.price` rows; subtotals are recomputed server-side by the `create_order` RPC from those rows and never trusted from the client (PRD §13). A tampered-price request has been exercised live (D20)

## Changed since this file was last reviewed

- **`CatalogErrorState` copy was wrong for its audience.** It told a shopper to
  "check the app's database connection" — instruction aimed at a developer,
  shown to a visitor, which `DESIGN_GUIDELINES.md` §Product language forbids. Now:
  "The product list did not load. Try again — if it keeps failing, the store is
  temporarily unavailable. Nothing was changed." A test asserts the internals
  never reappear (`tests/catalog-state.test.tsx`).
- **Catalogue states gained their first test.** Empty and error states are
  unreachable without breaking the database, which is exactly why they rot.
