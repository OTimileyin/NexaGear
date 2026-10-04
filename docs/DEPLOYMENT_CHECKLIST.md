# NexaGear — Deployment Checklist

Every item must be `[x]` verified or `N/A` (with reason) before deploy. Evidence goes in `IMPLEMENTATION_PLAN.md`.

Status of this file: **resolved 2026-10-04**. Each line names the evidence that
settled it. Six lines are deliberately NOT `[x]` — three owner actions, one
ungranted credential, one unverified RLS check and the live smoke test. They are
listed at the bottom under "Not verified, and why" rather than ticked.

## Error handling & states

- [x] Server actions return typed errors; no unhandled promise rejections in checkout/auth paths — `app/checkout/actions.ts` returns a discriminated result (`invalid_items | invalid_quantity | unauthenticated | db_error | …`), never throws into the void; `tests/checkout.test.ts` asserts each code. The dev server log during the full e2e journey contains no unhandled rejection.
- [x] Loading states on: catalogue fetch, auth redirect, order submit (busy button) — `app/shop/loading.tsx`; `components/CheckoutForm.tsx:226` disables the submit control while in flight; Clerk renders its own loading state for the auth redirect.
- [x] Empty states: empty cart, no featured products — `EmptyCatalogState` rendered by `app/shop/page.tsx:42` and `app/page.tsx:30`; the cart sheet and `/cart` both show "Your cart is empty". Covered by `tests/catalog-state.test.tsx` (5 tests) and `tests/e2e/wedge.spec.ts` ("/cart still works as a deep link").
- [x] Error states: catalogue load failure, sign-in failure, order failure, Mailgun failure (logged server-side) — `CatalogErrorState` on `/`, `/shop` and product pages; Mailgun failures are logged with the order id (`lib/mailgun.ts:142`, `:151`) and never change an order's outcome.
- [x] Failed requests never show fake success (checkout failure ≠ success page) — the success route is reached only from a `success` result; `tests/checkout.test.ts` asserts the failure codes do not produce one.

## Submissions

- [x] Duplicate submission: "Place order" disabled while in-flight + server `UNIQUE(user_id, client_ref)` — button state in `components/CheckoutForm.tsx`; constraint at `supabase/migrations/0001_schema.sql:97`; the RPC inserts with `on conflict (user_id, client_ref) do nothing` and returns the existing row.
- [x] No duplicate payments — **N/A: payment processing is out of scope (PRD §32)**. Paystack test-mode settlement exists (D22) and rejects an `sk_live_` key at runtime, so this build cannot charge a card.

## Limits

- [x] Rate limiting / API limits / spending caps — **implemented (D26), currently inert.** `lib/rate-limit.ts` limits checkout and the payment callback through Upstash's REST API; it fails **open** when `UPSTASH_REDIS_REST_URL`/`_TOKEN` are unset (`lib/rate-limit.ts:113`) because it is abuse protection, not an authorisation control. Documented in `SECURITY.md` §5. No public API exists.
- [x] Quantity bounds enforced client + server (1–99, ≤50 lines) — `MAX_QTY = 99` and `clampQuantity` in `lib/cart/math.ts`; the same bound is re-checked server-side in `lib/checkout.ts:76-78`; `MAX_ORDER_ITEMS = 50` at `lib/checkout.ts:13`; the RPC raises `invalid_quantity` independently, which `app/checkout/actions.ts` maps to a typed code.

## Data

- [x] Indexes: `orders(user_id)`, `orders(user_id, client_ref) UNIQUE`, `products(slug) UNIQUE`, `order_items(order_id)` — `orders_user_id_idx` (`0001_schema.sql:100`), `unique (user_id, client_ref)` (`:97`), `slug text not null unique` (`:21`), `order_items_order_id_idx` (`:118`).
- [x] Pagination — **N/A: catalogue is 8–12 products; documented revisit point >100 products**.
- [x] Uploads — **N/A: no user uploads (SECURITY.md §7)**.
- [x] Caching — **N/A: no read-heavy hot path at demo scale**; catalogue routes carry `export const revalidate = 60` and the rest run at framework defaults.

## Monitoring & operations

- [x] Uptime monitoring — **N/A for assignment** (Vercel dashboard sufficient); revisit for real use.
- [x] Error logging: order/Mailgun failures logged server-side with order id (implemented); no third-party logger (dependency budget) — `lib/mailgun.ts:142,151` include `order.id`; Mailgun is called over REST so there is no SDK to swallow the failure.
- [x] Backups — **N/A: demo-scale Supabase project**; data loss acceptable only while demo, escalate before real use.
- [ ] Simultaneous-user testing: two browsers, two accounts, concurrent checkouts — must not cross data (RLS check) — **UNVERIFIED.** RLS is written and reviewed (orders are readable only where `auth.jwt() ->> 'sub'` matches, or `is_admin()`), and a single authenticated request has been verified live (D20/D21), but no second signed-in account has ever been used to prove isolation between two real users. Needs a second Clerk account; the procedure is in `TESTING.md`.

## Environment & config

- [x] All env vars set in Vercel project settings (7 vars in `.env.example`) — **`.env.example` now lists 14**, not 7. Verified working live: Supabase URL/anon key (catalogue and order pages render server-side from the live database) and `NEXT_PUBLIC_SITE_URL` (live canonicals read `https://nexagear.vercel.app`). Clerk publishable/secret keys work (the OAuth flow starts with no origin error). Deliberately unset: `PAYSTACK_SECRET_KEY`, `UPSTASH_REDIS_REST_*` (features inert by design) and the Mailgun pair (see below).
- [x] `NEXT_PUBLIC_SITE_URL` matches the deployed URL (OAuth redirect correctness) — verified on the live site: canonicals and `og:url` resolve to `https://nexagear.vercel.app`. Locally it is `http://localhost:64820`, which is why the two never mix.
- [x] Google Cloud Console authorized redirect URIs include deployed origin — **N/A: Google OAuth is brokered by Clerk (D18)**, so the redirect URI is Clerk's callback, not the app's. The app origin is configured in Clerk's allowed origins instead, and `https://nexagear.vercel.app` is already present (verified 2026-10-04 by starting the flow without an origin error).
- [x] Supabase Auth redirect URLs include deployed origin — **N/A: Supabase Auth is no longer used (D18).** Supabase is the database only; identity comes from Clerk.
- [ ] Mailgun domain verified and sending authorized — **BLOCKED: owner action.** No authorised recipient is configured, so a live send returns 403. The sender is correct and the failure path is logged and non-fatal; the recipient has to be added in the Mailgun dashboard.
- [x] `.env*` git-ignored; `.env.example` placeholders only; `git status` clean of secrets — `.gitignore:12-17` and the later `.env*` block with `!.env.example`; `.env.example` contains only placeholder strings; a secret-shape scan over the staged diff and the built client bundle is clean.

## Verification gates

- [x] `npm run build` passes
- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] `npm test` passes
- [x] Bundle grep: no `MAILGUN_API_KEY`, no `SUPABASE_SERVICE_ROLE_KEY` in `.next` static output
- [ ] Production smoke test (`TESTING.md` §10) on the live URL — **BLOCKED: not pushed yet.** The commit carrying this file is one of nine unpushed commits; the live site is still the older build. Run the smoke test immediately after `git push origin main`.

The five gate lines above are the `npm run verify` gates
(`.forge/verification/gates.json`). Last run on the committed state:
`typecheck · lint · unit · color-contrast-audit · build · apple-variant-compiles ·
dark-scheme-tokens-compile · secrets-in-bundle → release_decision: pass`, exit 0.

## Not verified, and why

| Item | State | What it needs |
|---|---|---|
| Simultaneous-user RLS isolation | UNVERIFIED | a second Clerk account, two browsers, concurrent checkouts |
| Mailgun live send | BLOCKED | an authorised recipient in Mailgun |
| Production smoke test on the live URL | BLOCKED | `git push origin main` (owner; `gh` is not logged in here) |
| `/admin` with a signed-in session | UNVERIFIED | an admin Clerk account; the page has never been loaded signed-in |
| Paystack settlement | IMPLEMENTED / UNVERIFIED | `PAYSTACK_SECRET_KEY` (test key) and a webhook the payment provider must call |
| Cross-user order isolation end to end | UNVERIFIED | same as the second account above |
