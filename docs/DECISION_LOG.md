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

## D16 — 2026-10-01 · Playwright wedge test navigation timing
- **Trigger:** wedge.spec.ts failed on `getByRole('heading')` after client-side navigation — heading not found within the 5s default timeout.
- **Root cause:** dev-server RSC payload delivery + middleware Supabase getUser() call makes client-side navigation to /checkout take >5s; the test's default `toBeVisible()` timeout was insufficient.
- **Options:** (a) increase default expect timeout globally · (b) add `await page.waitForURL(...)` after each `Link.click()` · (c) both.
- **Decision:** (b) insert `page.waitForURL("**/route")` after each client-side navigation click, then assert visibility. Also fixed `.env.local` MAILGUN_FROM_EMAIL quoting (`>` was outside quotes) so `set -a; . ./.env.local` sources without shell-redirection errors.
- **Reason:** `waitForURL` explicitly waits for navigation to settle before assertions, making tests deterministic regardless of dev-server speed; no global timeout inflation needed.
- **Impact:** tests/e2e/wedge.spec.ts updated with 3 `waitForURL` calls (product → cart → checkout).
- **Verification:** `npx playwright test` — 2 passed (16.4s wedge + 4.3s 404). **Status:** adopted.

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

## D18 — 2026-10-02 · Authentication provider migration: Supabase Auth → Clerk
- **Trigger:** D17 — Supabase GoTrue is wedged at 503 on the free plan (`sessions_timebox: 0` is forced by the platform and cannot be corrected via the Management API, CLI config push, secrets, or project restart). Google sign-in cannot be verified, so the PRD §35 journey cannot be completed on Supabase Auth.
- **Options:** (a) upgrade Supabase to Pro and re-attempt the GoTrue fix · (b) authenticate with Clerk and use Clerk's first-party Supabase third-party-auth integration, keeping Supabase as the database · (c) a different standalone auth provider.
- **Trade-offs:** (a) adds cost and still depends on a platform config we cannot control; (b) introduces a second vendor but decouples auth from the broken GoTrue service and leaves the database, catalogue, cart, pricing, and Mailgun untouched; (c) is a larger change with no advantage over Clerk's native Supabase integration.
- **Decision:** **(b) Clerk.** Clerk becomes the authentication provider. **Supabase remains the PostgreSQL database.** **Google OAuth credentials still originate in Google Cloud Console** (configured as Clerk's Google SSO connection). The legacy shared-JWT-template integration is explicitly rejected; Clerk's native third-party-auth flow is used.
- **Reason:** Unblocks the mandatory Google sign-in (PRD §8) without paying for a Supabase plan change, while preserving every working part of the app. The database had zero users/orders at migration time (verified: `auth.users=0, profiles=0, orders=0, order_items=0, products=11`), so there is no identity data to migrate.
- **Impact:** auth UI (`AuthSection`, `SignInGate`) and the checkout gate move to Clerk; `app/auth/callback/route.ts` becomes obsolete; `middleware.ts` → `proxy.ts` (Next 16 convention) with `clerkMiddleware()`; Supabase session clients switch to the Clerk session token; RLS policies and `create_order` move from `auth.uid()` (uuid) to `auth.jwt()->>'sub'` (text Clerk ID); `profiles.user_id` and `orders.user_id` change `uuid → text` (FK to `auth.users` dropped); profile email/name sync via a signed Clerk webhook. The catalogue's public Supabase client is unchanged.
- **Verification (observed 2026-10-02):**
  - `[x]` Clerk auth login + `init --app` completed; `@clerk/nextjs@7.9.10` installed; keys pulled into `.env.local`; every `clerk init` change reviewed.
  - `[x]` Next.js 16.3.8 recognises `proxy.ts` (`ƒ Proxy (Middleware)` in the build); `middleware.ts` is removed and only one convention exists.
  - `[x]` **Live Google sign-in through Clerk succeeded in a real browser** — the header shows the signed-in account and a sign-out control.
  - `[x]` `/checkout` bypasses the sign-in gate once authenticated; Clerk identity flows into the form (display name + read-only email from the Clerk account); the cart survives auth.
  - `[x]` Migration `0003` applied and verified via SQL: `profiles.user_id`/`orders.user_id` are `text`, no FK to `auth.users`, `UNIQUE(user_id, client_ref)` preserved, all 7 policies read `auth.jwt()->>'sub'`, `create_order` rewritten with trusted pricing/idempotency intact.
  - `[x]` Gates: `tsc --noEmit` 0 · `eslint --max-warnings=0` 0 · `next build` OK · 36/36 unit tests · `clerk doctor` healthy (production instance not configured — expected on the dev instance).
  - `[ ]` **BLOCKED — Supabase still rejects the Clerk token.** `[profile] ensureProfile` and `[order] create_order` both fail server-side with `"No suitable key or wrong key type"`; `orders`/`order_items`/`profiles` remain at 0 rows.
  - `[x]` **Token diagnostics (verified 2026-10-02, after the Clerk integration was activated and the provider registered):** decoded metadata only — the session token is `RS256`, `iss` = `https://clear-clam-6319.clerk.accounts.dev` (matches the registered provider domain), `kid` = `ins_3K78jOMcVqWlJiAg3s2Wj8673Oa`, unexpired. Clerk's JWKS at that domain returns HTTP 200 with one RSA key containing that exact `kid`. **However the token's claim set is `azp, exp, fva, iat, iss, nbf, o, sid, sts, sub, v` — there is no `role` claim and no `aud`.** Re-minting with `getToken({ skipCache: true })` produced the same claim set, so this is not token staleness.
  - **Root cause (observed):** Clerk's Supabase integration is expected to add `"role":"authenticated"` to session tokens (Clerk docs). No such claim is present, so Supabase cannot map the JWT to a Postgres role and rejects it. The Clerk CLI/Backend API surface does not expose the Supabase-integration toggle (`clerk config pull` has no such key), so the toggle could not be confirmed programmatically. **Superseded by D19:** the missing `role` claim is *excluded* as the cause of `PGRST301` — PostgREST fails during key resolution, before any claim is read. The confirmed cause class is a vendor-side key-resolution failure (B1), with the missing claim tracked separately (B2).
  - `[ ]` Order persistence, Mailgun confirmation, duplicate-submit protection, cross-user RLS isolation, and the PRD §35 wedge remain **UNVERIFIED**.
- **Status:** adopted (user); migration in progress — **partially verified; database trust not yet established and no order/wedge success is claimed**.

## D19 — 2026-10-02 · External block: Supabase PGRST301 key resolution + Clerk `role` claim missing
- **Trigger:** D18 left the Clerk → Supabase integration failing with `"No suitable key or wrong key type"` on every authenticated request. The provider had been registered, removed and re-added on the exact bare Clerk domain, and the failure survived a wait longer than the documented ≤30-minute key-propagation window.
- **Confirmation probe (2026-10-02 20:12 UTC, one request only):** one fresh Clerk default session token (`getToken({ skipCache: true })`) was minted and its metadata verified with no token value printed or logged — `alg=RS256`, `iss=https://clear-clam-6319.clerk.accounts.dev`, `kid=ins_3K78jOMcVqWlJiAg3s2Wj8673Oa` present in the live JWKS (HTTP 200, one `use=sig` RSA key), **signature verifying cryptographically against that JWKS**, `sub` equal to the current Clerk user ID. Exactly one authenticated Data API request used it: `POST /rest/v1/profiles?on_conflict=user_id` with anon `apikey` + `Authorization: Bearer <token>` and `Prefer: resolution=merge-duplicates,return=representation`. Response: **HTTP 401** `{"code":"PGRST301","details":"No suitable key was found to decode the JWT","hint":null,"message":"No suitable key or wrong key type"}`. No rows were read or written (`profiles=0, orders=0, order_items=0, auth.users=0`); the temporary one-shot relay used to carry the request was deleted immediately.
- **Classification (verified):** **B1 — Supabase hosted third-party authentication / JWKS key-resolution failure persists after the documented propagation window.** The request reaches PostgREST and fails before claim, role, or RLS evaluation. **B2 — Clerk session tokens still lack `role: "authenticated"`** across six fresh mints; B2 is excluded as the cause of B1 but is a real second blocker for the `to authenticated` RLS policies and `create_order`.
- **Options:** (a) keep iterating locally — the only remaining levers are `service_role`, weakening RLS, forging tokens, or the deprecated JWT-template integration: all rejected as either unsafe or non-diagnostic · (b) escalate to both vendors and freeze the auth path · (c) move to yet another auth provider.
- **Decision:** **(b) `BLOCKED BY EXTERNAL PROVIDER`; no further local authentication, RLS, database, token, or checkout changes.** B1 escalated to Supabase support (ready-to-send ticket drafted with project ref, issuer domain, instance ID, `alg`, `kid`, JWKS verification, exact PGRST301 body, re-registration and propagation-window facts, and confirmation that no `service_role`/RLS bypass was used). B2 escalated to Clerk support. Option (c) is rejected: a new provider would not resolve a Supabase-side key-resolution failure and would discard working Clerk sign-in.
- **Reason:** every remaining local lever would compromise the security posture the PRD requires or produce a result that cannot diagnose a vendor-side failure. An honestly unverified order path is preferable to a faked one.
- **Impact:** phases 4, 5, 6, 8 and the PRD §34/§35 rows for order persistence, order items, live trusted-price check, duplicate-submit, order→email, and cross-user RLS isolation move to `BLOCKED BY EXTERNAL PROVIDER: Supabase, Clerk` in `IMPLEMENTATION_PLAN.md` (with a new *External blockers* section). No deploy (withheld pending explicit user authorisation). Work may continue only on work that needs no authenticated Supabase request: UI polish, accessibility, responsive checks, documentation, non-auth unit tests, SEO/metadata, static catalogue checks.
- **Durable guardrail:** do not attempt `service_role` bypass, RLS weakening, JWT forging, the deprecated Supabase JWT templates, alternate auth providers, manual order creation, or a fake checkout success. Do not deploy.
- **Status:** blocked externally — awaiting Supabase and Clerk support responses. Working tree preserved uncommitted; no destructive git operation performed.

## D20 — 2026-10-02 · Root cause of PGRST301 (provider never registered) + orders subtotal fix
- **Trigger:** D19 escalated `PGRST301 "No suitable key or wrong key type"` to Supabase and Clerk as a suspected vendor-side fault. Opening **Project Settings → Authentication → Sign in / Providers → Third-Party Auth** showed the provider list **empty**. The Clerk provider had never actually been registered.
- **Root cause (verified):** Supabase's "Add new Clerk connection" form rejects a bare domain — its hint is `https://clerk.example.com or https://example.clerk.accounts.dev` and it validates that development Clerk domains must be entered **as a full `https://` URL**. Every previous attempt (including the re-registration described in D19) was refused by that validation, so no provider entry was ever stored. PostgREST therefore had no Clerk key in its keyset and could not match the token's `kid` — hence "no suitable key". D18/D19's belief that the provider was registered and re-registered on the bare domain was **wrong**; it is corrected here.
- **Same cause, second symptom:** Clerk's session tokens also lacked `role: "authenticated"`. Clerk's Supabase integration had been Enabled all along, but it only emits the claim once Supabase is genuinely connected. Immediately after the domain was registered correctly, the next `getToken({ skipCache: true })` mint returned a claim set containing `role: "authenticated"` for the first time. One misconfiguration, two blockers.
- **Verification (2026-10-02 22:09–22:10 UTC):** fresh session token `RS256`, `kid=ins_3K78jOMcVqWlJiAg3s2Wj8673Oa`, `iss=https://clear-clam-6319.clerk.accounts.dev`, signature verified against the live JWKS, `sub` = the Clerk user id, `role=authenticated` present. Exactly one authenticated Data API request (`POST /rest/v1/profiles?on_conflict=user_id`, anon key + Bearer token) → **HTTP 201**, one row returned with `user_id` equal to the Clerk user id. Because the write passed the RLS `WITH CHECK (auth.jwt()->>'sub') = user_id` on `profiles`, and every policy is `TO authenticated`, this single request proves **both** that `auth.jwt()->>'sub'` matches the Clerk user id **and** that the role is `authenticated`. No `service_role`, no RLS bypass, no forged token.
- **No support ticket was required.** Supabase and Clerk were not at fault.
- **Wedge reached:** the first real end-to-end order (22:12 UTC) persisted an `orders` row plus two `order_items` rows with catalogue prices. That exposed a second defect — see D21.
- **Security:** several secrets were captured in screenshots/paste during this investigation (Supabase legacy JWT secret, `sb_secret_` key, `service_role` JWT key, Clerk secret key, and a Vercel access token). All remain to be rotated by the owner; recorded in `IMPLEMENTATION_PLAN.md` "External blockers".

## D21 — 2026-10-02 · create_order could not persist subtotal (missing RLS UPDATE policy)
- **Trigger:** the first real order stored `subtotal = 0.00` while its `order_items` summed to 264.00, and the success page rendered "Total $0.00". Caught by the live wedge, not by tests — no test exercised the RPC as a Supabase-role caller.
- **Root cause:** `create_order` is `SECURITY INVOKER` (deliberate: RLS must apply) and finishes with `update public.orders set subtotal = v_subtotal where id = v_order_id;`. Migration `0003` created only SELECT and INSERT policies on `orders`. With RLS enabled and **no UPDATE policy**, Postgres filters the row out of the UPDATE: the statement matches **zero rows and raises no error**. The order therefore committed with `subtotal = 0` and the computed total was silently discarded. Verified with `pg_policies` on the live project (SELECT + INSERT only) before the fix.
- **Decision:** migration `0004` — (1) add the owner-scoped UPDATE policy using the same `auth.jwt() ->> 'sub' = user_id` check as every other policy; (2) narrow the `authenticated` role's UPDATE grant from the whole table to the single column the function writes (`revoke update … ; grant update (subtotal) …`). The anon key ships in the browser bundle, so without (2) a signed-in visitor could PATCH their own order row — status, totals, shipping address — directly against the Data API. Least privilege costs nothing here because the app never updates any other column.
- **Applied and verified 2026-10-02:** `orders are updatable by owner` present for UPDATE; `information_schema.column_privileges` shows `authenticated` may UPDATE exactly `subtotal`. Applied statement-by-statement because `supabase db query --linked` silently no-ops a multi-statement `begin; … commit;` block — the policy was absent after the first attempt and only appeared on re-run, so the verification query is the load-bearing part of this entry.
- **Evidence:** a fresh order placed through the real UI after the fix persisted `subtotal = 39.00` against `order_items` summing to 39.00 (`subtotal = sum(line_total)` → true), and `/order/success` rendered Subtotal $39.00 / Total $39.00. The two pre-fix orders were backfilled from their own `order_items` (`subtotal = sum(line_total)`); no order was deleted or fabricated.
- **Test gap (accepted, recorded):** unit tests cover the payload builder and validation but not the database's RLS behaviour, so this class of bug is only caught by a live wedge. A SQL-level regression check is listed in `IMPLEMENTATION_PLAN.md` rather than pretended to be covered.
- **Status:** fixed and verified live.

## D22 — 2026-10-02 · Paystack test-mode payments added (scope change, owner-instructed)
- **Trigger:** after the assignment form was submitted, the owner asked for Paystack to be added. Payments are **not** in the task brief and this repo had treated them as out of scope (`PRD.md` §32/§36 deferred them; invariant 9 recorded "no payment UI/states" as verified evidence). Per the source-of-truth hierarchy a newest explicit user instruction outranks the PRD, so the change was made deliberately and the PRD was amended rather than the conflict being ignored. The owner chose "proceed and amend" over "branch only".
- **Decision:** integrate **Paystack in test mode only**. A live `sk_live_…` key is **rejected at runtime** (`isLiveKey`) rather than trusted by convention, so this build cannot charge a real card even if misconfigured.
- **Flow:** `placeOrder` creates the order first (unchanged, `create_order`, trusted catalogue pricing) → `startPayment(orderId)` initialises a Paystack transaction → the customer pays → Paystack returns to `/checkout/verify` → that route **re-verifies the transaction against Paystack's API** and requires the verified amount to equal `toKobo(orders.subtotal)` → on success the order is marked `status=paid, payment_status=paid` and a receipt email is sent.
- **Money rule preserved:** the amount sent to Paystack comes from `orders.subtotal`, which `create_order` computed from the `products` table. No client-supplied amount is ever used, and the browser is never trusted — a hand-edited `?paid=1` cannot show a paid state because the success page reads `payment_status` from the database, not the query string.
- **No privileged bypass:** verification runs in a route handler using the Clerk session and the RLS-scoped Supabase client, so it can only ever touch the signed-in owner's own order. Migration `0005` adds `payment_reference` / `payment_status` / `paid_at`, a CHECK constraint, a partial unique index on `payment_reference`, and widens the `authenticated` UPDATE grant from `subtotal` alone to exactly the five columns the app writes. The owner-scoped policy from `0004` still applies; no `service_role`, no RLS weakening.
- **Honest degradation:** with no `PAYSTACK_SECRET_KEY` the order is still created and the success page says plainly that the store isn't set up to take online payment. No fake payment state is ever displayed.
- **Tests:** `tests/paystack.test.ts` — 13 unit tests over the pure helpers (kobo conversion and rounding, the live-key guard, initialize parsing, and verify parsing including amount-mismatch, abandoned, not-found and malformed bodies). Suite is 49/49. Full suite + `tsc --noEmit` + `eslint --max-warnings=0` green.
- **Status:** implemented and gated. **Live payment capture is `UNVERIFIED`** — no Paystack test key has been supplied yet, so the end-to-end pay-and-settle path has not been exercised. The verified-without-keys path (order created, honest "not configured" state) is what has been tested.
- **Also fixed here:** `vercel link` had added a blanket `.env*` rule to `.gitignore`, which would have prevented `.env.example` from ever being re-added. Negated with `!.env.example`.

## D23 — 2026-10-02 · Read-only admin dashboard, and a privilege-escalation fix found while building it
- **Trigger:** the owner asked for an admin page. Admin was deferred in `PRD.md` and was added afterwards at their instruction, with the PRD amended rather than the conflict left standing.
- **Decision:** **read-only** admin at `/admin`. The owner chose read-only over full CRUD when offered.
- **The important property: the page is not the gate.** Access is granted by Postgres, not by the application deciding to render rows. `profiles.is_admin` is the flag; `public.is_admin()` is a `SECURITY DEFINER` `STABLE` helper (owner-scoped `search_path`, execute revoked from `PUBLIC`/`anon`, granted only to `authenticated`) used by two new SELECT policies — `orders are readable by admins` and `order items are readable by admins`. A non-admin session therefore receives **zero rows from the Data API** whether it reaches `/admin` through the UI or by hand-crafting a REST request.
  - `SECURITY DEFINER` is load-bearing: the inner read of `profiles` runs as the owner and so is not itself subject to RLS, which is what stops a policy that calls `is_admin()` from recursing into itself.
  - There is deliberately **no admin INSERT/UPDATE/DELETE policy**, so even an admin session cannot alter data through the Data API.
  - Promotion is a manual DBA statement. There is no self-service toggle: `update public.profiles set is_admin = true where user_id = '<clerk id>';`
- **Vulnerability found and fixed (migration 0007).** While auditing the grant surface before shipping, `profiles` turned out to carry a **table-level UPDATE grant** for `authenticated` from 0001 plus an owner UPDATE policy from 0003. RLS policies are row-level, so "you may update YOUR row" combined with "you may update ANY column" meant **any signed-in visitor could PATCH their own profile and set `is_admin = true`**, granting themselves every admin read policy in 0006. The admin page was never the hole — the grant was. Fixed by revoking the table-level UPDATE and replacing it with a column-level grant on exactly `(email, display_name, avatar_url)`, which is what `lib/profile.ts` writes (`user_id` is the conflict key, not an updated column).
  - Verified with `has_column_privilege`, the authoritative check: table-level UPDATE on `profiles` = **false**, `can_write_is_admin` = **false**, `can_write_display_name` = **true** (the app still works). Note `information_schema.column_privileges` over-reports here because it also lists inherited `postgres`/`service_role` rows; `has_column_privilege` is the check that counts.
- **Wider grant audit (same pass):** `products` and `order_items` carry broad table grants but **no** INSERT/UPDATE/DELETE policies, so RLS blocks those writes — confirmed by listing every policy in the schema. `orders` UPDATE was already column-scoped to five columns, and `has_column_privilege('authenticated','public.orders','customer_email','UPDATE')` = **false**, so order totals and the customer email cannot be tampered with client-side.
- **Residual, accepted and recorded:** `profiles.email` is still self-writable on your own row. Clerk is the source of truth and `ensureProfile()` re-syncs it on every order, so it cannot be used to redirect another user's order; noted rather than papered over.
- **Tests:** `tests/admin.test.ts` — 11 unit tests over the pure dashboard maths (`summariseOrders`, `sortOrdersByDate`, `filterOrders`): revenue counts only `payment_status = 'paid'`, `failed`/`not_configured` are never revenue, the average is over all orders, Postgres `numeric` strings are handled and rounded to cents, a non-numeric subtotal yields 0 rather than `NaN`, and filtering treats failed as unpaid. Suite **60/60**; `tsc --noEmit` and `eslint --max-warnings=0` clean.
- **Verification honesty:** `is_admin()` was confirmed to **fail closed** (returns `false` with no JWT in context) and the page renders its signed-out and no-access states honestly. The populated dashboard view is **`UNVERIFIED`** — the owner's Clerk session had expired and completing a Google sign-in is theirs to do, not the agent's.
- **Status:** implemented and gated. Live admin visibility is `UNVERIFIED` pending one signed-in load by the owner.

## D24 — 2026-10-03 · Order fulfilment lifecycle, admin status control, and a latent break in the payment callback
- **Trigger:** the owner asked for four post-submission features together; the first was a customer-facing order tracking page. Tracking needs a status that actually moves, and `orders.status` did not have one.
- **Latent bug found first.** D22's `/checkout/verify` writes `status = 'paid'`, but 0001's CHECK constraint allows only `('pending','confirmed')`. **The entire paid path would have failed on the constraint** — the UPDATE would raise and the order would stay unpaid. This was never observed because no Paystack key had ever been configured, so that route had never completed. It was a contradiction between two migrations, not a runtime observation.
- **Root design error:** two unrelated facts shared one column. *Payment received* is not *parcel dispatched*. Split them — `payment_status` (D22) is the only payment truth; `status` becomes fulfilment only: `pending → processing → shipped → delivered`, with `cancelled` from `pending`/`processing`. `shipped`, `delivered`, `cancelled` are terminal, steps cannot be skipped, and nothing moves backwards. The callback no longer writes `status` at all.
- **Second vulnerability, same migration.** D22 widened the `authenticated` UPDATE grant to five columns **including `status`**. Combined with D21's owner-scoped UPDATE policy, that meant **any signed-in buyer could PATCH their own order straight to `delivered`** against the public Data API. `status` is now removed from the column grant entirely, so no role can reach it that way. Verified with `has_column_privilege('authenticated','public.orders','status','UPDATE')` = **false**, while `subtotal` and `payment_status` remain **true** (so `create_order` and the callback still work).
- **The only write path is `set_order_status(uuid, text)`** — `SECURITY DEFINER`, `search_path = public`, execute revoked from `PUBLIC`/`anon` and granted to `authenticated`. It re-checks `is_admin()` (still the caller's identity: `auth.jwt()` reads request claims, not the function's definer) **and** the transition table inside Postgres. No admin UPDATE policy was added, so this function is the only route in and the page remains a convenience rather than a gate.
- **Scope change, owner-instructed:** the owner chose "admin can set status" over D23's strictly read-only dashboard, with the transition table enforced in SQL. `PRD.md` amended.
- **Applied and verified 2026-10-03,** statement by statement. Two live-environment traps worth recording: `supabase db query --linked` **truncates multi-line SQL at the first newline** (a `create function` sent from a file fails with the misleading `42P13: no language specified`; the identical single-line statement succeeds), and it **parses a leading `--` comment as a flag**. Both cost real time and will bite again.
- **Behavioural verification:** `supabase/verify/0008_order_lifecycle.sql` proves, in one self-cleaning transaction, that (1) a non-admin caller is refused, (2) an admin cannot skip a step, (3) the happy path advances, (4) a delivered order is terminal, and (5) no verification row survives. Every assertion raises on failure, so a clean exit is the pass signal. It uses reserved `user_local_verify_%` ids and `@example.invalid` addresses and deletes them; post-run state confirms **3 real orders, all still `pending`, 0 leftovers**.
- **Tests:** `tests/orders.test.ts` — 14 tests over the pure lifecycle (forward-only transitions, no skipping, cancellation only before dispatch, terminal states, refusal of the legacy `paid`/`confirmed` values, labels, timeline position, sample-ref format). Suite **74/74**; `tsc --noEmit` and `eslint --max-warnings=0` clean.
- **Also corrected here:** `lib/supabase/server.ts` still carried the D19 "CURRENTLY BLOCKED BY EXTERNAL PROVIDER" banner, which D20 proved wrong. Rewritten to describe the verified state.
- **Status:** implemented, gated, migration applied and verified. **The admin status control is `UNVERIFIED` in the browser** — it needs one signed-in load by the owner, since completing a Google sign-in is theirs to do.

## D25 — 2026-10-03 · Tagged sample orders (demo data)
- **Trigger:** the owner asked for demo data so a reviewer sees a populated site and admin dashboard instead of an empty-looking one. They chose **live database, tagged and removable** over local-only seeding or an opt-in env flag, on the understanding that demo rows must never be mistakable for real business.
- **Three conditions, enforced rather than promised:** every sample row carries `is_sample`; the admin dashboard **excludes sample rows from every figure** (revenue, order value, unit counts, averages) and badges each one `SAMPLE · EXCLUDED FROM TOTALS`; and `delete from public.orders where is_sample;` removes the lot in one statement, cascading to `order_items` via the existing FK.
- **No invented customers.** Sample customers use `@example.invalid` addresses — RFC 2606 reserves `.invalid`, so they can never reach a real mailbox — and an address line that says it is demo data. No real customer, address or payment reference is ever copied into a sample row, and `payment_reference` is left NULL.
- **Pricing is derived, never hard-coded.** `supabase/sample-data/seed.sql` reads each product's price from `products` by slug and sums the line totals into `subtotal`, so the D21 invariant (`subtotal = sum(order_items.line_total)`) holds **by construction**. The seeder asserts the invariant across every seeded row and raises if it ever fails, rather than trusting the arithmetic. Verified live: all six seeded orders show `subtotal = lines_sum` = true, and the 3 real orders are untouched (`not is_sample`, count 3).
- **Why sample rows are readable by anyone signed in.** That is what makes `/order/track?ref=NGX-1001` demonstrable without buying anything. It is safe because the flag is DBA-controlled: `is_sample` and `sample_ref` have **no INSERT/UPDATE policy and no column grant for any application role**, so no user can promote a real order into a public sample one. The `authenticated` column grant was restated in `0009` to exactly `(subtotal, payment_status, payment_reference, paid_at)` to keep that guarantee explicit. Policies are `to authenticated`, so anonymous visitors still see nothing.
- **Visible, not hidden.** `SampleDataNotice` on the home page names the fictional refs for a signed-in visitor and links to them; the tracking page labels a sample order `SAMPLE ORDER · NOT REAL` above its timeline; the admin table shows the sample reference instead of a truncated id. The design-guideline rule against fabricated claims is satisfied by labelling demo data as demo data rather than by omitting it.
- **Statuses seeded directly, not through `set_order_status`.** The seeder runs as the database owner building demo history, not as an admin moving a live order; the CHECK constraint still applies. Documented in the file so it does not read as an oversight.
- **Docs:** `supabase/sample-data/README.md` records both CLI traps hit here — multi-line SQL truncated at the first newline, and a leading `--` comment parsed as a flag — plus the seed and remove commands.
- **Tests:** `tests/admin.test.ts` grew 3 tests proving sample rows are excluded from revenue, order value, counts, units sold and the average, and that an all-sample set yields an average of 0 rather than `NaN`. Suite **77/77**; `tsc --noEmit` and `eslint --max-warnings=0` clean. A lint error caught during this work (JSX constructed inside a `try`, which would not have caught a render error anyway) is fixed by scoping the `try` to the query.
- **Status:** migration applied, sample data seeded, unit-tested. **The notices and sample tracking view are `UNVERIFIED` in the browser** pending one signed-in load by the owner.
