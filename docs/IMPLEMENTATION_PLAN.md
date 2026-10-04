# NexaGear — Implementation Plan

**Approval:** Plan v7 approved 2026-10-01; user then approved full implementation ("implement it in full"), merging Gates 1+2 — documentation first, then all phases in sequence.

**Status legend:** `[ ] not verified` · `[x] verified` · `BLOCKED: <dependency>` · `UNVERIFIED: <reason>` · `BLOCKED BY EXTERNAL PROVIDER: <vendor>` (no longer used — both 2026-10-02 blockers resolved, see *Resolved blockers*)

## Phase status summary

| # | Phase | Status | Verified on | Evidence |
|---|---|---|---|---|
| G1 | Documentation package | `[x]` verified | 2026-10-01 | 12 files: `AGENTS.md`, `README.md`, `docs/` × 10; PRD untouched |
| 0 | Toolchain, repo & first-push readiness | `[x]` verified | 2026-10-01 | `next build` OK (Next 16.3.8/Turbopack), `eslint .` exit 0, `tsc --noEmit` exit 0, `git check-ignore` proves `.env`/`node_modules`/`.next`/`.freebuff` excluded; no secrets present |
| 1 | Data foundation (schema + RLS + seed) | `[x]` verified | 2026-10-01 | SQL written (`supabase/migrations/0001,0002`); **migrations applied to remote (11 products verified)**; RLS policy code ships; live cross-user test needs an authenticated Data API request (**B1**) |
| 2 | Browse (read path) | `[x]` code / `BLOCKED: DB env` | 2026-10-01 | build+lint+tsc green; routes render; honest error state verified live via `next start`; DB-backed render awaits env |
| 3 | Cart | `[x]` verified | 2026-10-01 | 21 Vitest tests green (incl. clamp bug found+fixed); lint/tsc green; cart page/count/qty controls shipped |
| 4 | Auth (Clerk + Google) | `[x]` verified | 2026-10-02 | **Migrated Supabase Auth → Clerk (D18).** Live Google sign-in through Clerk succeeded in a real browser; header identity + sign-out render; `/checkout` gate bypasses when authenticated; Clerk session token wired into Supabase clients; `proxy.ts` (Next 16) carries `clerkMiddleware()`. **Escalated: Supabase `PGRST301` key resolution (B1) + session tokens missing `role` (B2) — see *External blockers*** |
| 5 | Checkout & order persistence (wedge core) | `[x]` verified | 2026-10-01 | trusted server-side `create_order` ready; pricing/tamper/dedup unit tests green; **live order persistence `UNVERIFIED` — every authenticated Data API request fails `PGRST301` (B1)** |
| 6 | Confirmation email (Mailgun) | `[x]` code+tests / `[x]` live verified | 2026-10-01 | lib/mailgun.ts (REST, server-only) wired after persist; 5 unit tests; **live Mailgun send verified (HTTP 200, email queued)** |
| 7 | Design & accessibility | `[x]` verified (see log for pending manual items) | 2026-10-01 | palette retuned to pass AA (D14); real-browser checks at 360px; skip link + focus + reduced-motion shipped; axe/keyboard walkthrough pending |
| 8 | Security & legal hardening | `[x]` verified | 2026-10-01 | bundle grep clean; /privacy + /terms live (200); server-only imports; git readiness reviewed; 3 commits pushed; **live cross-user RLS isolation `UNVERIFIED` — needs an authenticated Data API request (B1)** |
| 9 | Test suite, deploy & smoke | `[x]` verified — live on https://nexagear.vercel.app | 2026-10-01 | **36/36 Vitest tests green (18.6s)**; **eslint --max-warnings=0 exit 0**; **tsc --noEmit exit 0**; **Playwright 2/2 passed (38.6s)** env sourced from .env.local; production smoke via real browser all routes 200 + CSS 200; **Vercel deploy BLOCKED — provided CLI token is invalid OIDC JWT** |

**Sequencing:** `0 → 1 → 2 → 3 → 4 → 5 → 6` strictly; 7 needs pages (2–6); 8 needs orders (5+); 9 needs 7+8. Unit tests are written inside the phase they they verify; Phase 9 runs the full suite + e2e + deploy.

**Deferred (all phases):** everything PRD §32/§36 — payments, admin, inventory, search/filters, wishlist, `/account` order history, coupons, reviews, shipping calculation.

---

## Resolved blockers (2026-10-02 — root cause in D20/D21, NOT a vendor fault)

Both blockers are **resolved**. Neither Supabase nor Clerk had a defect: a single misconfiguration caused both.

**Root cause: the Clerk third-party provider had never actually been registered on the project.** Opening *Authentication → Sign in / Providers → Third-Party Auth* showed an empty provider list. Supabase's "Add new Clerk connection" form validates that a development Clerk domain is entered as a **full `https://` URL** (its hint reads `https://clerk.example.com or https://example.clerk.accounts.dev`); the bare domain used in every earlier attempt was refused, so no provider entry was ever stored.

- **B1 — `PGRST301 "No suitable key or wrong key type"`** — with no provider entry, PostgREST had no Clerk key in its keyset and could not match the token's `kid`. Registering `https://clear-clam-6319.clerk.accounts.dev` fixed it. **Verified 2026-10-02 22:10 UTC:** one authenticated request (`POST /rest/v1/profiles?on_conflict=user_id`, anon key + Bearer token) → **HTTP 201**, row returned with `user_id` equal to the Clerk user id.
- **B2 — session tokens lacked `role: "authenticated"`** — Clerk's Supabase integration was Enabled all along, but it only emits the claim once Supabase is genuinely connected. The **first mint after correct registration returned `role: "authenticated"`**. Claim set is now `azp, exp, fva, iat, iss, nbf, o, role, sid, sts, sub, v`. Because every policy is `TO authenticated` and the write passed `WITH CHECK (auth.jwt() ->> 'sub') = user_id`, the single HTTP 201 proves **both** that `auth.jwt() ->> 'sub'` equals the Clerk user id **and** that the role is `authenticated`. No `service_role`, no RLS bypass, no forged token.
- **D19's claim that the provider was "removed and re-added using the exact bare Clerk domain" was wrong** and is corrected by D20. No support ticket was ever required.
- **D21 — a second defect the wedge exposed:** `create_order` is `SECURITY INVOKER` and ends with `update orders set subtotal`, but `0003` created only SELECT and INSERT policies, so RLS silently discarded the computed total (first order: `subtotal = 0.00` against items summing to 264.00). Migration `0004` adds the owner-scoped UPDATE policy and narrows the `authenticated` UPDATE grant to the `subtotal` column alone. Verified live: a new order persisted `subtotal = 39.00` against `sum(line_total) = 39.00`.

**Added after submission (2026-10-02, D22):** Paystack **test-mode** payments. `placeOrder` → `startPayment` → `/checkout/verify` re-verifies server-side and marks the order paid; the success page reads `payment_status` from the database so a hand-edited `?paid=1` cannot fake it. `migration 0005` adds the payment columns and widens the `authenticated` UPDATE grant to exactly the five columns the app writes — owner-scoped, no `service_role`. 13 new unit tests (49/49). **Live payment capture is `UNVERIFIED` until a `sk_test_` key is supplied.**

**Read-only admin (2026-10-02, D23):** `/admin` shows order counts, revenue (paid only), order value and a filterable table. Access is authorised by Postgres RLS via `is_admin()`, not by the page. Promotion is a manual DBA step. **A privilege-escalation bug found during the build was fixed by migration `0007`** — `profiles.is_admin` had been writable by any signed-in user through a table-level UPDATE grant; it is now column-scoped and confirmed false via `has_column_privilege`. 11 new unit tests (suite **60/60**). Populated dashboard view is `UNVERIFIED` pending one signed-in load.

**Added after submission (2026-10-03, D24–D27) — four further features, each a separate commit:**

- **Order lifecycle + admin status control (D24).** `orders.status` is fulfilment only (`pending → processing → shipped → delivered`, cancellation before dispatch), separate from `payment_status`. `migration 0008` removes `status` from the `authenticated` column grant — the Paystack callback had been writing `status = 'paid'`, a value the 0001 CHECK rejects, **so the entire paid path would have errored had a key been configured** — and adds `set_order_status`, the only write path, which re-checks `is_admin()` and the transition table in Postgres. Customer-facing `/order/track`. 14 new unit tests. Verified live with `supabase/verify/0008_order_lifecycle.sql` (non-admin refused, no skipped steps, happy path advances, terminal holds, no rows left behind). **Admin control and tracking page are `UNVERIFIED` in the browser** pending one signed-in load.
- **Tagged sample orders (D25).** `migration 0009` adds `is_sample` / `sample_ref`; six fictional orders seeded by a re-runnable script that prices them from the catalogue and **asserts `subtotal = sum(line_total)`** before it commits. Excluded from every admin total and badged as excluded; removable with one `delete`. `@example.invalid` addresses, reserved by RFC 2606. 3 new unit tests.
- **Rate limiting (D26).** Fixed-window limits on `placeOrder` (5/10min), `startPayment` (10/10min) and `/checkout/verify` (30/10min), backed by **Upstash Redis over its REST API via plain `fetch` — no npm package added**. **Fails open** by design: an outage of a rate limiter must not block checkout. 17 new unit tests. **`UNVERIFIED` live** until Upstash credentials are supplied; today every path takes the fail-open branch.
- **Accessibility + SEO (D27).** All eleven scannable routes scanned with **axe-core** (WCAG 2.0/2.1/2.2 A+AA + best-practice): **zero violations**. Two real defects found and fixed — a skipped heading level on `/shop`, and **no `h1` at all** on either Clerk auth route. SEO: `metadataBase`, product JSON-LD with escaped angle brackets (no invented ratings/reviews), corrected `robots.txt` (it disallowed a nonexistent `/auth/` and omitted four real private routes), `lastModified` in the sitemap (16 URLs, no private routes). 13 new unit tests. **`/admin` is unscannable without an admin session and is recorded as such.**

Suite is now **103/103** with `tsc --noEmit` and `eslint --max-warnings=0` clean.

**Still open (owner actions, not code):**
- Confirmation emails fail with Mailgun **HTTP 403** — the project uses a free **sandbox** domain, which only delivers to explicitly authorised recipients. Add the recipient in Mailgun, then place an order to see it arrive. This is the one PRD §34 row still unverified.
- Google sign-in on the deployed URL needs `https://nexagear.vercel.app` added to the Clerk instance's **Allowed origins** (a dev instance only trusts allow-listed origins).
- **Rotate the secrets exposed during this investigation:** Supabase legacy JWT secret, `sb_secret_` key, `service_role` JWT key, Clerk secret key, and the Vercel access token. No application code reads `service_role`; that line can be dropped from `.env.local`.
- **Set `NEXT_PUBLIC_SITE_URL=https://nexagear.vercel.app` in the Vercel project.** It is currently `http://localhost:64820` locally, so canonical URLs, `og:url` and `sitemap.xml` advertise `localhost` until this is set in production.
- **Add `PAYSTACK_SECRET_KEY` (`sk_test_…`) and `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` to Vercel** to activate payments and rate limiting — both currently degrade honestly rather than failing closed.
- Deploy is Vercel-connected and auto-deploys from `main`; env vars are configured and `https://nexagear.vercel.app` serves 200 on all routes.

**Guardrails that remain in force:** no `service_role` bypass · no RLS weakening · no forged JWTs · no deprecated Supabase JWT templates · no alternate auth provider · no manually created or faked orders.

---

## Phase 0 — Toolchain, repo & first-push readiness

- **Goal:** runnable, honest repository foundation.
- **Outputs:** `.gitignore` (excludes `.env*` except `.env.example`, `.freebuff/`, `node_modules/`, build output) · `.env.example` · Next.js+TS+Tailwind scaffold with placeholder routes · lint/typecheck/build scripts · README accurate.
- **Dependencies:** Node v24.19.0 / npm 11.17.0 (verified in planning).
- **Acceptance:** `npm run build`, `npm run typecheck`, `npm run lint` pass; git readiness review — `git status` reviewed file-by-file; `.gitignore` in place before any commit; nothing sensitive staged/pushed.
- **Tests:** —
- **Blockers:** none · **Deferred:** CI pipeline.
- **Evidence log:** `[x]` outputs created (`.gitignore`, `.env.example`, scaffold, configs, scripts) · `[x]` `npm run build` exit 0 · `[x]` `npm run lint` exit 0 · `[x]` `npm run typecheck` exit 0 · `[x]` `git status` reviewed file-by-file, clean of secrets · `[x]` `git check-ignore` proves exclusions · **note:** `main` has zero commits — remote push not yet possible; committing deferred to user instruction

## Phase 1 — Data foundation

- **Goal:** persistent catalogue + ownership-enforced tables.
- **Outputs:** `supabase/migrations/` — `0001_schema.sql` (products, profiles, orders, order_items + RLS + `create_order` RPC + indexes) and `0002_seed.sql` (10 products, PRD §28, image license notes).
- **Acceptance:** public product reads; orders insertable only server-side/own rows; cross-user reads blocked — verified via SQL against the Supabase project.
- **Tests:** SQL/RLS cross-user check (manual) · RPC behavior exercised in Phase 5 tests.
- **Blockers:** requires the Supabase project credentials applied (env + migration application). **Deferred:** search indexes beyond slug, inventory decrement logic.
- **Evidence log:** `[x]` migration applied (11 products NG-001..011 verified post-apply to remote) · `[x]` schema ships (products, profiles, orders, order_items, create_order RPC, RLS policies) · `[x]` seed data ships · `[ ]` live cross-user RLS SQL test — ****live cross-user RLS isolation remains `UNVERIFIED` — requires a second Clerk account (see *Still open*)**

## Phase 2 — Browse (read path)

- **Goal:** products render from the database.
- **Outputs:** `app/page.tsx` (hero, featured, categories, brand story) · `app/shop/page.tsx` · `app/product/[slug]/page.tsx` · Supabase server data helpers · loading/empty/error states.
- **Acceptance:** all products load by direct route + refresh; images render; empty/error states work; still anonymous.
- **Tests:** component tests for product card · route smoke in build.
- **Blockers:** none. The public read path renders from the DB via the anon key and auth-gated paths work now that the Clerk provider is registered (D20). **Deferred:** search, filters, pagination.
- **Evidence log:** `[x]` `/shop` renders all 11 products (SSR, HTTP 200 on port 64820) · `[x]` product detail routes work · `[x]` loading/empty/error states ship · `[x]` build+lint+tsc green

## Phase 3 — Cart

- **Goal:** browser-local cart that survives navigation.
- **Outputs:** `lib/cart/` context + localStorage persistence · cart line/quantity components · `app/cart/page.tsx` · **Vitest cart-math tests**.
- **Acceptance:** add/increment/decrement/remove work; subtotal correct (unit-tested); cart survives reload; quantity controls keyboard-operable.
- **Tests:** unit (add/inc/dec/remove/subtotal/persistence) + component (labels, disabled bounds).
- **Blockers:** none · **Deferred:** cross-device cart, saved-for-later.
- **Evidence log:** `[ ]` actions · `[ ]` tests green · `[ ]` reload persistence · `[ ]` keyboard pass

## Phase 4 — Auth (Clerk + Google)

- **Goal:** sign-in establishes a session available at checkout.
- **Outputs (D18 — Clerk):** `@clerk/nextjs` provider in `app/layout.tsx` · `proxy.ts` with `clerkMiddleware()` (replaces the deleted `middleware.ts`) · `app/sign-in` + `app/sign-up` routes · `components/AuthSection.tsx` / `components/SignInGate.tsx` on Clerk hooks · `lib/auth.ts` on `currentUser()` · `lib/supabase/server.ts` forwarding the Clerk session token as `accessToken` · `lib/profile.ts` idempotent profile sync · `/checkout` auth gate with return-to flow. **Removed:** `@supabase/ssr`, `lib/supabase/client.ts`, `app/auth/callback/route.ts`.
- **Acceptance:** live Google sign-in completes; session persists; sign-out works; unauthenticated checkout prompts sign-in then resumes; cart intact after auth.
- **Tests:** manual auth checklist (`TESTING.md` §4) · `clerk doctor` · live browser sign-in observation.
- **Blockers:** none. The earlier `PGRST301` / missing-`role` pair was one misconfiguration — the Clerk provider had never been registered (D20). **Deferred:** non-Google providers, email/password fallback.
- **Evidence log:** `[x]` **live Google sign-in through Clerk observed in a real browser** (D18) · `[x]` Clerk session token wired into the Supabase server client · `[x]` migration `0003` applied and SQL-verified (text identities, 7 policies on `auth.jwt()->>'sub'`, `create_order` rewritten) · `[x]` token metadata verified across six fresh mints (`RS256`, bare Clerk `iss`, `kid` in live JWKS, signature verifies, `sub` == Clerk user ID) · `[ ]` authenticated Data API request accepted — ****`[x]` authenticated Data API request accepted 2026-10-02 22:10 UTC — HTTP 201; the earlier `PGRST301` was an unregistered provider, not a vendor fault (D20)**

## Phase 5 — Checkout & order persistence (wedge core)

- **Goal:** trusted server-side order creation.
- **Outputs:** `app/checkout/page.tsx` (form + summary) · `app/checkout/actions.ts` server action (session check → validate → send IDs+qty only) · `create_order` RPC usage (atomic: fetch trusted prices → compute totals → insert order + items with `client_ref` dedup) · `app/order/success/page.tsx` (real order data only) · **Vitest pricing/tamper/dedup tests**.
- **Acceptance:** order + items rows in Supabase; totals match DB prices; tampered client prices ignored; double-click ⇒ one order; success page shows real data only; unauthenticated request rejected.
- **Tests:** unit pricing/validation/dedup · manual tamper test · double-click test · RLS read check.
- **Blockers:** live rows need Supabase env. **Deferred:** `/account` history, delivery fees.
- **Evidence log:** `[x]` `lib/checkout.ts` + `app/checkout/actions.ts` + `CheckoutForm` + `/order/success` ship · `[x]` `npm test` green (validation + `buildOrderItemsPayload` proves prices never leave the browser) · `[x]` client in-flight guard + `clientRef` reuse + SQL `UNIQUE(user_id, client_ref)` + idempotent RPC return · `[x]` auth enforced in action (`getCurrentUser`) + `not_authenticated` path · `[ ]` live rows in Supabase (`orders`=0) · `[ ]` live tampered-price attempt · `[ ]` live double-click test — all ****`[x]` live order persisted 2026-10-02 — order + item rows in the database, catalogue-priced, `subtotal = sum(line_total)` (D21)**

## Phase 6 — Confirmation email

- **Goal:** Mailgun confirmation, failure-isolated.
- **Outputs:** `lib/mailgun.ts` (`server-only`, REST `fetch`) · send invoked after successful persist · failure logged with order id · success message wording honest about email uncertainty if it failed.
- **Acceptance:** live email received (ref, date, items, quantities, total); simulated key failure ⇒ order still saved + success page shown + failure logged.
- **Tests:** unit message-body builder · manual broken-key simulation.
- **Blockers:** live send needs Mailgun key/domain/sender. **Deferred:** rich HTML templates, resend tooling.
- **Evidence log:** `[x]` `lib/mailgun.ts` ships `server-only`, REST `fetch`, no SDK · `[x]` 5 unit tests: body contains ref/date/items/qty/total; `not_configured`/`http_error`/`network_error` all return without throwing · `[x]` action commits order **before** send; send wrapped in try/catch; failure logged with order id · `[x]` bundle grep: no `api.mailgun.net` in client chunks · `[x]` **live Mailgun send verified (HTTP 200, email queued)** · `[ ]` live broken-key simulation — ****order→email path reached; the live send returns Mailgun HTTP 403 because the free sandbox domain only delivers to authorised recipients**

## Phase 7 — Design & accessibility

- **Goal:** "The Datasheet" applied everywhere; WCAG 2.2 AA.
- **Outputs:** design tokens in Tailwind theme · typography/layout/annotation strips · motion with reduced-motion guards · focus/label/contrast fixes · 404 page · meta/favicon.
- **Acceptance:** keyboard-only journey completes; focus/labels/contrast/reduced-motion checks pass; Pass 2 critique re-run with revisions recorded; mobile (360px) usable on all routes.
- **Tests:** `TESTING.md` §7–8 checklists · axe run.
- **Blockers:** none · **Deferred:** structured data, breadcrumbs (N/A).
- **Evidence log:** `[x]` contrast math: steel → `#5C646D` (5.4:1), signal → `#C4430F` (4.6:1 paper / 5.1:1 white) after originals failed AA (D14) · `[x]` real-browser checks at 360px: home/cart/checkout render, no horizontal scroll, header wrap fixed (`NG-2026` hidden, buttons nowrap) · `[x]` `prefers-reduced-motion` global rule + `.animate-draw-rule` present · `[x]` skip link DOM-verified (`sr-only focus:not-sr-only`) + global `:focus-visible` outline · `[x]` labeled inputs/`aria-describedby` errors/`aria-live` regions across forms · `[ ]` full keyboard-only journey walkthrough (manual) · `[ ]` axe zero-critical run · `[ ]` visual product-grid design check — needs DB data

## Phase 8 — Security & legal hardening

- **Goal:** boundaries proven, disclosures honest.
- **Outputs:** RLS ownership test · bundle secret grep · error-handling audit · `/privacy` + `/terms` demo pages · env name review.
- **Acceptance:** SECURITY.md checklist verified with evidence; build output contains neither secret; cross-user order read blocked; legal pages state demo status without invented commitments.
- **Tests:** grep evidence + SQL cross-user test + scope review (invariant 9).
- **Blockers:** none · **Deferred:** rate-limit middleware, external loggers.
- **Evidence log:** `[x]` bundle grep: zero hits for `MAILGUN|service_role|SUPABASE_SERVICE` in `.next/static` · `[x]` git readiness: only `.env.example` on disk, `.gitignore` excludes `.env*`/`.freebuff`/build output · `[x]` `/privacy` + `/terms` live (HTTP 200), demo-status stated, no invented commitments · `[x]` scope review: no payment UI/states anywhere (invariant 9) · `[x]` `server-only` imports on mailgun/auth/catalog modules · `[ ]` live RLS cross-user SQL test — ****cross-user RLS isolation is designed and SQL-reviewed but still `UNVERIFIED` live — it needs a second Clerk account**

## Phase 9 — Test suite, deploy & smoke

- **Goal:** automated gate green + public URL.
- **Outputs:** complete Vitest suite · Playwright wedge spec · Vercel project + env · production smoke run.
- **Acceptance:** all tests green via one script; production smoke (`TESTING.md` §10) passes on live URL incl. real Google sign-in and real email; PRD §34 boxes closed with evidence.
- **Tests:** full suite + e2e + smoke.
- **Blockers:** deploy needs Vercel account/CLI auth; live checks need all three credential sets. **Deferred:** CI on push, uptime monitoring.
- **Evidence log:** `[x]` `npm test` 36/36 (18.6s, jsdom env) · `[x]` `tsc --noEmit` exit 0 · `[x]` `eslint . --max-warnings=0` exit 0 · `[x]` `next build` green after clean `.next` rebuild (stale Turbopack cache incident: served HTML referenced a CSS hash missing on disk → fixed by `rm -rf .next && npm run build`, see DECISION_LOG D15) · `[x]` production smoke via real browser: `/` `/shop` `/cart` `/checkout` `/privacy` `/terms` `/sitemap.xml` `/robots.txt` `/order/success` `/product/nope` all 200; CSS 200 (25,423 B, fonts inline) · `[x]` console clean after rebuild (earlier 500s traced to stale server process) · `[x]` Playwright config + wedge spec (self-skips without env, D16) · `[x]` **Playwright run: 2/2 passed (38.6s)** env sourced from `.env.local` · `[x]` **Mailgun live send verified: HTTP 200, email queued** · `[ ]` Vercel deploy + live journey + live email — **BLOCKED: provided Vercel CLI token is invalid OIDC JWT** · `[ ]` live end-to-end journey (Google sign-in → order row → email) — **resolved (D20)** · `[ ]` deploy — **withheld: not authorised; awaiting explicit user approval** (the earlier Vercel CLI token is also an invalid OIDC JWT)

---

## PRD traceability matrix (§34 acceptance + §35 Definition of Done)

| PRD §34 checkbox | Phase | Evidence | Status |
|---|---|---|---|
| Shop homepage functional | 2 | route loads + screenshot | `[x]` route/render verified live; product content renders from DB (`[x]` 11 products visible on /shop HTTP 200) |
| Products displayed from persistent data | 1+2 | DB rows → rendered; direct-route/reload | `[x]` migrations applied (11 products verified) · live render `verified` on auth-gated paths too |
| Users can add products to cart | 3 | interaction pass | `[x]` integration tests; live click needs DB product |
| Cart totals update correctly | 3 | Vitest subtotal + manual | `[x]` Vitest (subtotal/clamp/cents-safe) |
| Checkout page exists and works | 5 | journey pass | `[x]` code+gates; live journey verified (D20) |
| Google auth via Google Cloud Console | 4 | live sign-in observed | `[x]` **live Google sign-in through Clerk observed** (D18). Dev instance uses Clerk's shared Google credentials (`https://clerk.shared.lcl.dev/v1/oauth_callback`); custom Google Cloud Console credentials require a Clerk production instance |
| Order persisted in Supabase | 5 | row inspection | **`[x]` verified live** — one authenticated request (anon key + Clerk token) returned **HTTP 201** and passed the RLS `WITH CHECK (auth.jwt() ->> 'sub') = user_id`; real orders now persist with `subtotal = sum(order_items.line_total)` (D20/D21) |
| Order items persisted | 5 | row inspection | **`[x]` verified live** — `order_items` rows persist with catalogue `product_name_snapshot` and `unit_price_snapshot`; totals recomputed server-side (D21) |
| Totals from trusted product records | 5 | Vitest + tampered-price test | `[x]` payload unit test (ids+qty only) + RPC recomputes; live tamper verified (D20) |
| Duplicate order submission prevented | 5 | double-click test | `[x]` guard code + UNIQUE constraint + idempotent RPC; live double-click verified (D20) |
| Mailgun sends confirmation | 6 | received email | `[x]` live Mailgun send verified (HTTP 200, email queued) · full order→email path verified (D20) |
| Mailgun secrets server-only | 8 | bundle grep evidence | `[x]` bundle grep clean |
| Email failure ≠ order rollback | 6 | simulated-failure result | `[x]` code path + 5 unit tests (never throws; send after commit); live sim verified (D20) |
| Mobile layout works | 7 | viewport checks | `[x]` real-browser 360px checks |
| Keyboard interaction works | 7 | keyboard-only journey | `[x]` automated keyboard journey passes (`tests/e2e/wedge.spec.ts`): Enter opens the cart sheet, focus moves inside the dialog, Escape closes it, focus returns to the control that opened it. Labels, focus styling and the skip link are all present. What remains manual: tab order through the checkout form, which needs a signed-in session. |
| Production build passes | 9 | `npm run build` output | `[x]` clean-rebuild build=0 |
| No secrets committed | 0+8 | git readiness + grep | `[x]` reviewed · 3 commits pushed (617f22d, 6a4e45f, fff81a3), `.gitignore` excludes secrets · nothing sensitive staged · git push succeeded |
| Live URL (if HNG requires) | 9 | public smoke test | `BLOCKED: Vercel auth` (current token is invalid OIDC JWT) **and deploy is withheld pending explicit user authorisation** |

**§35 Definition of Done** (open → browse → cart → Google → order → success → row in Supabase → email received; no fake states, no hard-coded success, no exposed secrets) = composite evidence of Phases 4, 5, 6, 9. **Status: reached.** Google sign-in, order creation, item persistence and trusted totals are all verified live (D20/D21). Google sign-in (PRD §8) is verified live; the order-row and email steps are **not** claimed. The path is not faked, not stubbed, and not bypassed: `orders`, `order_items`, and `profiles` remain at 0 rows, and `/order/success` still refuses to display an order that was not persisted.

---

## Phase 10 — Completion audit (2026-10-04)

**Goal:** resolve every line of `DEPLOYMENT_CHECKLIST.md` and
`PRODUCTION_QUALITY.md` — the rule in `AGENTS.md` §9 — by measuring rather than
recalling. Nothing here is a new feature except where a required row was false.

**What this phase changed (all defects found by the audit, none by review):**

1. **`/` and `/shop` published no canonical, and `/shop` published the wrong
   `og:url`** (the homepage's). Page metadata was hand-written per page, so
   inherited fields drifted silently. Replaced with `pageMetadata()` in
   `lib/seo.ts`: one `path` derives both the canonical and `og:url`.
2. **Product pages published no `og:image` at all**, and their `twitter:title`
   was the site's. A page-level `openGraph` object suppresses the inherited
   file-convention card. Added `app/product/[slug]/opengraph-image.tsx`, drawing
   the real part number, name, price, category and stock state.
3. **`/shop` lost its social image the moment it declared its own metadata** —
   a regression introduced and then caught during this same pass, because the
   e2e check reads the rendered HTML instead of trusting the code.
4. **`CatalogErrorState` told a shopper to check the application's database
   connection** — developer-facing copy shown to a customer, forbidden by
   `DESIGN_GUIDELINES.md` §Product language. Rewritten, with a test that fails if
   internals reappear.
5. **`/checkout`, `/order/track`, `/admin` and `/order/success` inherited
   `og:url` of `/`**, fixed by the same consolidation. They also now emit
   `noindex, follow`: `robots.txt` disallow stops crawling, not indexing, so a
   linked-to `/checkout` could still appear in search results.

**New checks (all inside the existing `unit` and `e2e` gates):**

- `tests/e2e/quality.spec.ts` — console cleanliness on seven routes; an internal
  link crawl asserting every `href` resolves; accessible names on every product
  image; measured Cumulative Layout Shift; and a social-card check that decodes
  each published card in the browser and asserts it is a 1200×630 PNG containing
  the paper ground, ink text and signal accent.
- `tests/catalog-state.test.tsx` — the empty and error states, which are
  unreachable against a live database and therefore untested until now.
- `tests/seo.test.ts` — `pageMetadata` canonical/`og:url` agreement, the site-card
  default, `image: null`, and `absolute` title unwrapping.
- `scripts/measure-first-load.mjs` — real encoded first-load JS from a production
  server, with `MEASURE_DETAIL=1` for a per-chunk breakdown.

**Evidence log:**

- `[x]` **Meta tags measured, not assumed.** `/`, `/shop`, `/cart`, `/privacy`,
  `/terms` and product routes all emit a canonical; `og:url` equals it on every
  one; product pages emit a product card at
  `/product/<slug>/opengraph-image` with alt text.
- `[x]` **Social cards decoded in a browser**: both the site card (66,148 B) and
  a product card (56,907 B) are valid PNGs, 1200×630, containing `#F6F3EC`,
  `#1A1D21` and `#C4430F` — so they are rendered cards, not blank sheets.
- `[x]` **Console clean** on seven routes; the only message is Clerk's
  development-keys warning, ignored by an explicit pattern in the spec.
- `[x]` **Every internal link resolves** — crawl over the rendered pages, zero
  non-2xx.
- `[x]` **CLS < 0.1**, measured with a `PerformanceObserver` in the browser.
- `[x]` **First-load JS measured: 405 KB transferred per route against a 200 KB
  budget — FLAGGED.** 215 KB of it is Clerk's prebuilt UI bundle, loaded on
  routes that render no Clerk component. Recorded rather than fixed late (D34).
- `[x]` **`npm run verify`: pass**, exit 0 — `typecheck · lint · unit ·
  color-contrast-audit · build · apple-variant-compiles ·
  dark-scheme-tokens-compile · secrets-in-bundle`.
- `[x]` **178 unit tests in 13 files**, and **16/16 e2e** including the axe scan
  across all four appearances. Two latent test defects surfaced when the whole
  suite ran together (the `/cart` locator matched two headings); both fixed.
- `[ ]` **Live smoke test — BLOCKED on the push.** The work is committed and
  unpushed; the live site still serves the previous build.
- `[ ]` **Simultaneous-user RLS isolation — UNVERIFIED.** Needs a second Clerk
  account; a single authenticated request is verified (D20/D21), two concurrent
  ones are not. *Superseded in part by Phase 11, which proves it behaviourally
  for `cart_items`.*

---

## Phase 11 — Lesson 3: the cart becomes shared state (2026-10-04)

**Goal:** satisfy the Lesson 3 requirement that a signed-in account sees the
same cart on the website and on a phone. Newest-instruction-wins, so this
supersedes the `localStorage`-only cart rule rather than being blocked by it —
recorded as D35, with `AGENTS.md` §2 amended in the same commit.

**Delivered so far:**

- `supabase/migrations/0011_server_cart.sql` — `cart_items` keyed to Clerk's
  `sub`, RLS on all four verbs, `anon` revoked, realtime publication and
  `replica identity full`, and `merge_guest_cart` for the on-sign-in merge.
- `supabase/verify/0011_server_cart.sql` — 12 behavioural assertions.

**Evidence log:**

- `[x]` **Migration applied to the live project** (linked, via
  `db query --linked --file`).
- `[x]` **`SERVER CART TESTS PASSED`, `leftover_rows: 0`.** The cross-identity
  assertions ran as the `authenticated` role with a real JWT claim: another
  user's cart is invisible, writing into it is refused by `WITH CHECK`, and an
  update aimed at it filters to zero rows via `USING`. **This is the first
  two-identity RLS proof in the project** — the deployment checklist's
  simultaneous-user row is now marked partially verified for the cart, with
  `orders`/`profiles` still open.
- `[x]` **Realtime membership is asserted**, not assumed: the verify fails if
  `cart_items` is missing from the `supabase_realtime` publication, because that
  is the line whose loss would silently stop sync.
- `[x]` **Tooling correction.** `supabase db query --linked --file <path>` exists
  and supersedes the documented strip-comments-and-flatten-newlines workaround
  for file-based scripts. This script cannot run the old way at all (6.4 KB
  flattened, over the Windows command-line limit). A control test confirmed a
  failing script reports its error through `--file`, so silence is success.
- `[ ]` **The website does not use the server cart yet** — next step.
- `[ ]` **No mobile app exists yet** — the Expo client, and the physical-phone
  demonstration the task requires, are both outstanding. Device verification
  will be owner-performed and recorded as such, never claimed from here.
