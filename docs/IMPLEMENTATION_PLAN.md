# NexaGear — Implementation Plan

**Approval:** Plan v7 approved 2026-10-01; user then approved full implementation ("implement it in full"), merging Gates 1+2 — documentation first, then all phases in sequence.

**Status legend:** `[ ] not verified` · `[x] verified` · `BLOCKED: <dependency>` · `UNVERIFIED: <reason>`

## Phase status summary

| # | Phase | Status | Verified on | Evidence |
|---|---|---|---|---|
| G1 | Documentation package | `[x]` verified | 2026-10-01 | 12 files: `AGENTS.md`, `README.md`, `docs/` × 10; PRD untouched |
| 0 | Toolchain, repo & first-push readiness | `[x]` verified | 2026-10-01 | `next build` OK (Next 16.3.8/Turbopack), `eslint .` exit 0, `tsc --noEmit` exit 0, `git check-ignore` proves `.env`/`node_modules`/`.next`/`.freebuff` excluded; no secrets present |
| 1 | Data foundation (schema + RLS + seed) | `BLOCKED` | — | SQL written (`supabase/migrations/0001,0002`); applying needs Supabase env (not present in workspace) |
| 2 | Browse (read path) | `[x]` code / `BLOCKED: DB env` | 2026-10-01 | build+lint+tsc green; routes render; honest error state verified live via `next start`; DB-backed render awaits env |
| 3 | Cart | `[x]` verified | 2026-10-01 | 21 Vitest tests green (incl. clamp bug found+fixed); lint/tsc green; cart page/count/qty controls shipped |
| 4 | Auth (Google) | `[x]` code / `BLOCKED: OAuth env` | 2026-10-01 | proxy.ts registered (`ƒ Proxy` in build), callback route + gates ship; live Google sign-in awaits credentials |
| 5 | Checkout & order persistence | `[x]` code+tests / `BLOCKED: DB env` live | 2026-10-01 | server action + create_order RPC ship; checkout validation/payload tests green (27→36 suite); live rows need Supabase env |
| 6 | Confirmation email (Mailgun) | `[x]` code+tests / `BLOCKED: Mailgun env` | 2026-10-01 | lib/mailgun.ts (REST, server-only) wired after persist; 5 unit tests (body contents + failure isolation); live send needs key/domain |
| 7 | Design & accessibility | `[x]` verified (see log for pending manual items) | 2026-10-01 | palette retuned to pass AA (D14); real-browser checks at 360px; skip link + focus + reduced-motion shipped; axe/keyboard walkthrough pending |
| 8 | Security & legal hardening | `[x]` code / `BLOCKED: SQL env` for RLS live test | 2026-10-01 | bundle grep clean (no MAILGUN/service-role strings); /privacy + /terms live; RLS cross-user SQL needs DB env |
| 9 | Test suite, deploy & smoke | `[x]` local gates / `BLOCKED: Vercel + env` deploy | 2026-10-01 | 36/36 tests, lint, tsc, clean rebuild; all 10 routes 200 + CSS 200 in real browser; Playwright spec written, needs env+browsers; deploy needs Vercel auth |

**Sequencing:** `0 → 1 → 2 → 3 → 4 → 5 → 6` strictly; 7 needs pages (2–6); 8 needs orders (5+); 9 needs 7+8. Unit tests are written inside the phase they they verify; Phase 9 runs the full suite + e2e + deploy.

**Deferred (all phases):** everything PRD §32/§36 — payments, admin, inventory, search/filters, wishlist, `/account` order history, coupons, reviews, shipping calculation.

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
- **Evidence log:** `[ ]` migration applied · `[ ]` RLS check · `[ ]` seed visible

## Phase 2 — Browse (read path)

- **Goal:** products render from the database.
- **Outputs:** `app/page.tsx` (hero, featured, categories, brand story) · `app/shop/page.tsx` · `app/product/[slug]/page.tsx` · Supabase server data helpers · loading/empty/error states.
- **Acceptance:** all products load by direct route + refresh; images render; empty/error states work; still anonymous.
- **Tests:** component tests for product card · route smoke in build.
- **Blockers:** runtime verification needs Phase 1 env. **Deferred:** search, filters, pagination.
- **Evidence log:** `[ ]` routes · `[ ]` states · `[ ]` screenshot

## Phase 3 — Cart

- **Goal:** browser-local cart that survives navigation.
- **Outputs:** `lib/cart/` context + localStorage persistence · cart line/quantity components · `app/cart/page.tsx` · **Vitest cart-math tests**.
- **Acceptance:** add/increment/decrement/remove work; subtotal correct (unit-tested); cart survives reload; quantity controls keyboard-operable.
- **Tests:** unit (add/inc/dec/remove/subtotal/persistence) + component (labels, disabled bounds).
- **Blockers:** none · **Deferred:** cross-device cart, saved-for-later.
- **Evidence log:** `[ ]` actions · `[ ]` tests green · `[ ]` reload persistence · `[ ]` keyboard pass

## Phase 4 — Auth (Google)

- **Goal:** sign-in establishes a session available at checkout.
- **Outputs:** `@supabase/ssr` browser/server clients · `app/auth/callback/route.ts` · sign-in/sign-out UI in header · session refresh middleware · `/checkout` auth gate with return-to flow.
- **Acceptance:** live Google sign-in completes; session persists; sign-out works; unauthenticated checkout prompts sign-in then resumes; cart intact after auth.
- **Tests:** manual auth checklist (`TESTING.md` §4) · client helper unit tests where practical.
- **Blockers:** live verification needs Google OAuth credentials + Supabase env (expected available). **Deferred:** non-Google providers, email/password fallback.
- **Evidence log:** `[ ]` sign-in · `[ ]` callback/resume · `[ ]` session persist · `[ ]` sign-out · `[ ]` cart intact

## Phase 5 — Checkout & order persistence (wedge core)

- **Goal:** trusted server-side order creation.
- **Outputs:** `app/checkout/page.tsx` (form + summary) · `app/checkout/actions.ts` server action (session check → validate → send IDs+qty only) · `create_order` RPC usage (atomic: fetch trusted prices → compute totals → insert order + items with `client_ref` dedup) · `app/order/success/page.tsx` (real order data only) · **Vitest pricing/tamper/dedup tests**.
- **Acceptance:** order + items rows in Supabase; totals match DB prices; tampered client prices ignored; double-click ⇒ one order; success page shows real data only; unauthenticated request rejected.
- **Tests:** unit pricing/validation/dedup · manual tamper test · double-click test · RLS read check.
- **Blockers:** live rows need Supabase env. **Deferred:** `/account` history, delivery fees.
- **Evidence log:** `[x]` `lib/checkout.ts` + `app/checkout/actions.ts` + `CheckoutForm` + `/order/success` ship · `[x]` `npm test` green (validation + `buildOrderItemsPayload` proves prices never leave the browser) · `[x]` client in-flight guard + `clientRef` reuse + SQL `UNIQUE(user_id, client_ref)` + idempotent RPC return · `[x]` auth enforced in action (`getCurrentUser`) + `not_authenticated` path · `[ ]` live rows in Supabase · `[ ]` live tampered-price attempt · `[ ]` live double-click test — all **BLOCKED: Supabase env not present in workspace**

## Phase 6 — Confirmation email

- **Goal:** Mailgun confirmation, failure-isolated.
- **Outputs:** `lib/mailgun.ts` (`server-only`, REST `fetch`) · send invoked after successful persist · failure logged with order id · success message wording honest about email uncertainty if it failed.
- **Acceptance:** live email received (ref, date, items, quantities, total); simulated key failure ⇒ order still saved + success page shown + failure logged.
- **Tests:** unit message-body builder · manual broken-key simulation.
- **Blockers:** live send needs Mailgun key/domain/sender. **Deferred:** rich HTML templates, resend tooling.
- **Evidence log:** `[x]` `lib/mailgun.ts` ships `server-only`, REST `fetch`, no SDK · `[x]` 5 unit tests: body contains ref/date/items/qty/total; `not_configured`/`http_error`/`network_error` all return without throwing · `[x]` action commits order **before** send; send wrapped in try/catch; failure logged with order id · `[x]` bundle grep: no `api.mailgun.net` in client chunks · `[ ]` live email received · `[ ]` live broken-key simulation — **BLOCKED: Mailgun credentials**

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
- **Evidence log:** `[x]` bundle grep: zero hits for `MAILGUN|service_role|SUPABASE_SERVICE` in `.next/static` · `[x]` git readiness: only `.env.example` on disk, `.gitignore` excludes `.env*`/`.freebuff`/build output · `[x]` `/privacy` + `/terms` live (HTTP 200), demo-status stated, no invented commitments · `[x]` scope review: no payment UI/states anywhere (invariant 9) · `[x]` `server-only` imports on mailgun/auth/catalog modules · `[ ]` live RLS cross-user SQL test — **BLOCKED: Supabase env**

## Phase 9 — Test suite, deploy & smoke

- **Goal:** automated gate green + public URL.
- **Outputs:** complete Vitest suite · Playwright wedge spec · Vercel project + env · production smoke run.
- **Acceptance:** all tests green via one script; production smoke (`TESTING.md` §10) passes on live URL incl. real Google sign-in and real email; PRD §34 boxes closed with evidence.
- **Tests:** full suite + e2e + smoke.
- **Blockers:** deploy needs Vercel account/CLI auth; live checks need all three credential sets. **Deferred:** CI on push, uptime monitoring.
- **Evidence log:** `[x]` `npm test` 36/36 · `[x]` `tsc --noEmit` + `eslint --max-warnings=0` clean · `[x]` `next build` green after clean `.next` rebuild (stale Turbopack cache incident: served HTML referenced a CSS hash missing on disk → fixed by `rm -rf .next && npm run build`, see DECISION_LOG D15) · `[x]` production smoke via real browser: `/` `/shop` `/cart` `/checkout` `/privacy` `/terms` `/sitemap.xml` `/robots.txt` `/order/success` `/product/nope` all 200; CSS 200 (25,423 B, fonts inline) · `[x]` console clean after rebuild (earlier 500s traced to stale server process) · `[x]` Playwright config + wedge spec written (self-skips without env) · `[ ]` Playwright run — **BLOCKED: needs `.env.local` + `npx playwright install`** · `[ ]` Vercel deploy + live journey + live email — **BLOCKED: Vercel auth + provider credentials**

---

## PRD traceability matrix (§34 acceptance + §35 Definition of Done)

| PRD §34 checkbox | Phase | Evidence | Status |
|---|---|---|---|
| Shop homepage functional | 2 | route loads + screenshot | `[x]` route/render + honest error state verified live; product content `BLOCKED: DB env` |
| Products displayed from persistent data | 1+2 | DB rows → rendered; direct-route/reload | `BLOCKED: DB env` (migrations written, not applied) |
| Users can add products to cart | 3 | interaction pass | `[x]` integration tests; live click needs DB product |
| Cart totals update correctly | 3 | Vitest subtotal + manual | `[x]` Vitest (subtotal/clamp/cents-safe) |
| Checkout page exists and works | 5 | journey pass | `[x]` code+gates; live journey `BLOCKED: DB env` |
| Google auth via Google Cloud Console | 4 | live sign-in observed | `BLOCKED: OAuth credentials` (proxy+callback+gates ship) |
| Order persisted in Supabase | 5 | row inspection | `BLOCKED: DB env` |
| Order items persisted | 5 | row inspection | `BLOCKED: DB env` |
| Totals from trusted product records | 5 | Vitest + tampered-price test | `[x]` payload unit test (ids+qty only) + RPC recomputes; live tamper `BLOCKED: DB env` |
| Duplicate order submission prevented | 5 | double-click test | `[x]` guard code + UNIQUE constraint + idempotent RPC; live double-click `BLOCKED: DB env` |
| Mailgun sends confirmation | 6 | received email | `BLOCKED: Mailgun credentials` (sender+body unit-tested) |
| Mailgun secrets server-only | 8 | bundle grep evidence | `[x]` bundle grep clean |
| Email failure ≠ order rollback | 6 | simulated-failure result | `[x]` code path + 5 unit tests (never throws; send after commit); live sim `BLOCKED: env` |
| Mobile layout works | 7 | viewport checks | `[x]` real-browser 360px checks |
| Keyboard interaction works | 7 | keyboard-only journey | `[ ]` controls labeled/focus styled/skip link present; full manual walkthrough pending |
| Production build passes | 9 | `npm run build` output | `[x]` clean-rebuild build=0 |
| No secrets committed | 0+8 | git readiness + grep | `[x]` reviewed (repo still has zero commits — nothing could leak) |
| Live URL (if HNG requires) | 9 | public smoke test | `BLOCKED: Vercel auth` |

**§35 Definition of Done** (open → browse → cart → Google → order → success → row in Supabase → email received; no fake states, no hard-coded success, no exposed secrets) = composite evidence of Phases 4, 5, 6, 9.
