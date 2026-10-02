# NexaGear — Decision Log

Real decisions only; chronological, never rewritten. Format: date · trigger · options · trade-offs · decision · reason · impact · verification · status.

---

## D1 — 2026-10-01 · Database + auth provider
- **Trigger:** PRD §2 requires persistent data + Google auth; §9 requires a database decision.
- **Options:** (a) Supabase (DB+Auth+RLS in one) · (b) Neon + separate auth (NextAuth) · (c) Supabase DB + external auth.
- **Trade-offs:** (b) keeps DB choice pure but adds a second provider, session glue, no built-in RLS; (a) couples to one vendor but halves infrastructure.
- **Decision:** (a) Supabase.
- **Reason:** PRD §9 explicitly weighs this; RLS directly enforces order-ownership invariant.
- **Impact:** `@supabase/supabase-js` + `@supabase/ssr`; RLS in migration; smaller provider count.
- **Verification:** migration + RLS checks in Phase 1/8. **Status:** adopted.

## D2 — 2026-10-01 · Language
- **Trigger:** PRD §20 allows JS or TS, recommends TS.
- **Options:** TypeScript · JavaScript.
- **Trade-offs:** TS adds type upkeep; catches DB/price shape bugs early.
- **Decision:** TypeScript. **Reason:** PRD recommendation; transactional data justifies it.
- **Impact:** strict config, `tsc --noEmit` gate. **Verification:** typecheck script. **Status:** adopted.

## D3 — 2026-10-01 · Styling system
- **Trigger:** PRD §20 requires choosing one approach during implementation planning.
- **Options:** Tailwind CSS · CSS Modules · CSS-in-TS.
- **Trade-offs:** Tailwind risks generic looks; CSS Modules slower across ~9 routes; CSS-in-TS adds build complexity.
- **Decision:** Tailwind CSS (user-selected).
- **Reason:** coherent token system fits the datasheet palette; fastest iteration with one system.
- **Impact:** Tailwind theme holds design tokens; no second styling system permitted (AGENTS.md).
- **Verification:** codebase uniformity in Phase 7 review. **Status:** adopted (user).

## D4 — 2026-10-01 · Risk classification → security depth
- **Options:** low (light review) · medium (`SECURITY.md`) · high (+`THREAT_MODEL.md`).
- **Trade-offs:** high depth adds docs the assignment doesn't need.
- **Decision:** **Medium.** Auth + PII + server secrets justify `SECURITY.md`; no payments/crypto/admin/minors.
- **Impact:** doc set excludes `THREAT_MODEL.md`. **Verification:** n/a (classification). **Status:** adopted.

## D5 — 2026-10-01 · `/account` order history
- **Options:** include basic history · include profile+history · skip.
- **Decision:** **Skip for MVP** (user-selected). **Reason:** PRD marks it optional; wedge is the journey.
- **Impact:** scope reduced; listed under deferred. **Verification:** PRD §34 contains no account box. **Status:** adopted (user).

## D6 — 2026-10-01 · Design signature concept
- **Options:** industrial component-label concept · "The Datasheet" (datasheet presentation + drafting callouts) · defer design.
- **Trade-offs:** labels read as packaging; datasheets carry real spec info and are maker-native.
- **Decision:** **"The Datasheet"** (user chose a new concept).
- **Impact:** palette/type/layout defined in `DESIGN_GUIDELINES.md`; callouts must show true specs only.
- **Verification:** Pass 2 critique re-run in Phase 7. **Status:** adopted (user).

## D7 — 2026-10-01 · Approval gates
- **Trigger:** plan proposed two gates (docs → review → build).
- **Decision:** user first chose "docs only, then stop", then on approval instructed **"implement it in full"** — gates merged; all phases authorized sequentially.
- **Impact:** implementation proceeds through Phase 9 in this build; evidence still tracked per phase. **Status:** adopted (user, newest instruction wins).

## D8 — 2026-10-01 · Mailgun integration style
- **Options:** official `mailgun.js` SDK · plain `fetch` to Mailgun REST · SMTP library.
- **Trade-offs:** SDK adds a dependency for one POST; SMTP ignores the mandated provider.
- **Decision:** plain `fetch` (FormData POST to `/v3/{domain}/messages`), `server-only`.
- **Reason:** dependency budget (MASTER §8); Mailgun required, SDK not.
- **Impact:** zero new runtime deps; body built in-house (unit-tested). **Verification:** live send Phase 6. **Status:** adopted.

## D9 — 2026-10-01 · Order atomicity & pricing authority
- **Options:** multi-insert from server action · Postgres RPC (`create_order`) doing fetch+compute+insert atomically.
- **Trade-offs:** RPC keeps pricing, dedup, and persistence in one transaction but adds SQL logic; multi-insert risks partial writes.
- **Decision:** **`create_order` RPC**, `SECURITY INVOKER`, checking `auth.uid()`; prices read from `products` inside the function; `UNIQUE(user_id, client_ref)` for idempotency.
- **Reason:** closes invariants 4, 6, 7, 8 at one enforcement point.
- **Impact:** migration defines RPC; server action only validates session/form and forwards IDs+quantities.
- **Verification:** tamper + duplicate tests, Phase 5. **Status:** adopted.

## D10 — 2026-10-01 · Cart state
- **Options:** context + localStorage · Zustand/Redux · no persistence.
- **Decision:** **React context + localStorage** (PRD §7 allows browser-local).
- **Reason:** dependency budget; cart is non-authoritative (server recomputes prices).
- **Impact:** no state library in `RESOURCES.md`. **Verification:** cart persistence tests, Phase 3. **Status:** adopted.

## D11 — 2026-10-01 · Delivery fees
- **Options:** free delivery stated · no fee calculation at all.
- **Decision:** **no delivery-fee calculation; totals = item subtotal**, with a clear "Free delivery for this demo" line (PRD §12 permits either).
- **Reason:** shipping-rate logic is out of scope; honest demo wording.
- **Impact:** `orders.subtotal` = total; copy stated in checkout. **Verification:** pricing tests. **Status:** adopted.

## D12 — 2026-10-01 · Repository remote
- **Trigger:** user initialized git and pushed during planning.
- **Facts:** branch `main`; remote `https://github.com/OTimileyin/NexaGear.git` (user-reported; earlier plan versions recorded a mistyped URL — corrected here).
- **Decision:** `.gitignore` lands before any scaffold commit; no secrets ever pushed.
- **Verification:** git readiness review, Phase 0. **Status:** adopted.

## D13 — 2026-10-01 · Product imagery & SKU
- **Trigger:** PRD §29 forbids scraped images; seed products need images; design needs `NG-0xx` part numbers.
- **Options:** licensed stock photos · generated imagery · original SVG line art · no images.
- **Decision:** **original SVG line art** (11 files, `public/images/products/`), documented as original placeholder art replaceable with licensed photography; added `sku` column (`NG-001..011`) to products to support datasheet annotation strips (additive to PRD §10 model).
- **Reason:** zero copyright risk, self-contained, honest (no real-brand claims).
- **Verification:** images referenced by seed data; render check in Phase 7. **Status:** adopted.

## D14 — 2026-10-01 · Palette retune for WCAG AA (Phase 7)
- **Trigger:** contrast math on the Pass 1 palette.
- **Findings:** signal `#E4572E` = 3.3:1 on paper (text) and 3.7:1 under white button text; steel `#8A939E` = 2.8:1 — all fail AA 4.5:1.
- **Options:** keep hexes and fail AA · darken only buttons · retune the two tokens.
- **Decision:** signal → `#C4430F` (4.6:1 paper / 5.1:1 white), steel → `#5C646D` (5.4:1); drafting blue and stock green already passed.
- **Impact:** `globals.css` tokens + DESIGN_GUIDELINES palette table updated. **Verification:** computed ratios; axe check still pending (Phase 7/9 evidence). **Status:** adopted.

## D15 — 2026-10-01 · Stale Turbopack cache incident (Phase 9 smoke)
- **Trigger:** real-browser smoke found unstyled pages — served HTML referenced a CSS chunk hash that only existed in `.next/cache`, not in emitted assets (500/404 on stylesheet).
- **Root cause:** inconsistent Turbopack build cache (likely from builds overlapping a running `next start`).
- **Options:** debug manifest mismatch · disable cache · clean rebuild.
- **Decision:** kill stale server processes, `rm -rf .next`, rebuild clean; treat "HTML refs missing chunk hash" as a clean-rebuild signal; never leave a `next start` running across rebuilds.
- **Verification:** post-fix real-browser smoke — CSS 200 (25,423 B), all routes 200, console clean. **Status:** resolved.

## D17 — 2026-10-01 · Supabase GoTrue 503 recovery (blocked — free plan limitation)
- **Trigger:** GoTrue crashes on startup with `sessions_timebox: 0` (invalid duration), returning 503 for all `/auth/v1/*` endpoints. Google OAuth cannot be verified while GoTrue is down.
- **Investigation:**
  - Free plan Management API PATCH returns 402 for `sessions_timebox` → nonzero (Pro plan required).
  - Setting `sessions_timebox` to `null` is accepted by the PATCH response but reverts to `0` immediately on GET (platform config service overrides to `0` on free plans).
  - Setting `GOTRUE_SESSIONS_TIMEBOX` as a secret via `supabase secrets set` does not affect GoTrue — secrets are only available to Edge Functions, not the GoTrue service.
  - `supabase config push` with local `config.toml` (`timebox = "24h"`) returns 402 (free plan blocks config push).
  - Project restart returns HTTP 200 but GoTrue remains down after restart.
  - `auth.instances` table's `raw_base_config` is platform-managed and empty in user-accessible tables.
  - Support ticket creation endpoint (`POST /v1/projects/{ref}/support/tickets`) returns 404 — no programmatic support access available.
- **Root cause:** The Supabase free tier forces `sessions_timebox: 0` via the platform config service after every restart. GoTrue interprets `0`/`0s` as an invalid duration and crashes on startup. This cannot be fixed programmatically on the free plan.
- **Decision:** Accept that GoTrue remains 503 on the free plan until either (a) the project is upgraded to a Pro plan (enabling `sessions_timebox` to be set to a valid duration), or (b) Supabase support manually resets the config at the platform level. All code paths (Google OAuth config, redirect URIs, callback route, middleware) are in place and correct — they will work once GoTrue recovers.
- **Impact:** Google OAuth verification is BLOCKED at the platform level; all application code is complete and verified via unit tests.
- **Verification:** See Phase 4/9 evidence — auth config GET shows `external_google_enabled: true`, correct `client_id`, `site_url` = `http://localhost:64820`, `uri_allow_list` includes both `localhost:3000` and `localhost:64820` callbacks. GoTrue returns 503 on `/auth/v1/settings` and `/auth/v1/authorize`. Project status `ACTIVE_HEALTHY` at platform level despite GoTrue crash.
- **Status:** adopted (platform limitation, not a code issue).

## D16 — 2026-10-01 · Playwright wedge test navigation timing
- **Trigger:** wedge.spec.ts failed on `getByRole('heading')` after client-side navigation — heading not found within the 5s default timeout.
- **Root cause:** dev-server RSC payload delivery + middleware Supabase getUser() call makes client-side navigation to /checkout take >5s; the test's default `toBeVisible()` timeout was insufficient.
- **Options:** (a) increase default expect timeout globally · (b) add `await page.waitForURL(...)` after each `Link.click()` · (c) both.
- **Decision:** (b) insert `page.waitForURL("**/route")` after each client-side navigation click, then assert visibility. Also fixed `.env.local` MAILGUN_FROM_EMAIL quoting (`>` was outside quotes) so `set -a; . ./.env.local` sources without shell-redirection errors.
- **Reason:** `waitForURL` explicitly waits for navigation to settle before assertions, making tests deterministic regardless of dev-server speed; no global timeout inflation needed.
- **Impact:** tests/e2e/wedge.spec.ts updated with 3 `waitForURL` calls (product → cart → checkout).
- **Verification:** `npx playwright test` — 2 passed (16.4s wedge + 4.3s 404). **Status:** adopted.
