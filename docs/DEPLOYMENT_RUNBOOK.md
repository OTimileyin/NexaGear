# NexaGear — Deployment Runbook

**Purpose:** hands-on, ordered steps to close every BLOCKED item in `docs/IMPLEMENTATION_PLAN.md`. The code for all phases is written and locally green (tsc=0, eslint=0, 36/36 tests pass). All blockers are missing credentials, not missing code.

**Prerequisite — local gates (confirm disk state before touching providers):**

```bash
# From repo root
npm run typecheck   # exit 0
npm run lint        # exit 0
npm test            # 36 passed
npm run build       # exit 0 (if you haven't rebuilt since last edits)
```

If any gate fails, stop and fix it first — a green build is the baseline for every step below.

---

## 0 — Create the Supabase project (foundation for items 1–4)

Every blocked item depends on a Supabase project. Do this first.

1. Go to [supabase.com](https://supabase.com) → **Sign in** (or create an account).
2. Click **New project** → pick your org (or create one) → enter:
   - **Name:** `nexagear` (or your own)
   - **Database password:** a strong random password (save it — you may need it for direct SQL)
   - **Region:** nearest to you
3. Click **Create project**. Wait 2–4 minutes for provisioning to finish.
4. In the project dashboard → **Project settings** → **API** → copy:
   - **API URL** → this becomes `NEXT_PUBLIC_SUPABASE_URL`
   - **`anon` public key** → this becomes `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **`service_role` secret** → this becomes `SUPABASE_SERVICE_ROLE_KEY` (server-only — never put it in the browser)
5. Also note your **Project ref** (e.g. `abc123xyz`) — you'll need it for the CLI and for the service-role key format.

---

## 1 — Supabase env → migrations + seed + live rows + RLS test

### 1a. Set up the `.env.local`

```bash
cp .env.example .env.local
# Edit .env.local and paste the three values from step 0.4 above:
#   NEXT_PUBLIC_SUPABASE_URL       = https://<ref>.supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY  = <anon-key>
#   SUPABASE_SERVICE_ROLE_KEY      = <service-role-secret>
# (Leave MAILGUN_* and NEXT_PUBLIC_SITE_URL for now — Google OAuth is step 2.)
```

> `.env.local` is git-ignored (verified by `.gitignore`). Never commit it.

### 1b. Apply the two migrations

**Option A — Supabase UI (simplest):**

1. Dashboard → your project → **SQL editor** → **New query**.
2. Open `supabase/migrations/0001_schema.sql` → paste the entire file → run.
3. Open `supabase/migrations/0002_seed.sql` → paste → run.
4. Confirm: `Products table` sidebar entry shows 11 rows; `Orders` and `Order_items` tables exist with RLS enabled.

**Option B — Supabase CLI (repeatable):**

```bash
npx supabase login
npx supabase link --project-ref <your-ref>
npx supabase db push   # pushes migrations/0001 + 0002
```

### 1c. Verify live rows

In the **SQL editor**, run:

```sql
SELECT sku, name, price, category, featured FROM products ORDER BY sku;
-- expect 11 rows: NG-001 … NG-011
-- Featured (true): NG-001, NG-004, NG-005, NG-008
```

### 1d. Live RLS cross-user test (two auth sessions)

This tests the core ownership invariant (ARCHITECTURE §6, invariant 3).

1. **Seed a test user** (one person, two browser sessions):
   - Open an **incognito** window.
   - Go to your local dev: `http://localhost:3000/checkout` → click **Continue with Google** → sign in with a personal Google account. Complete the sign-in (creates a `profiles` row via the `handle_new_user` trigger).
2. **Place an order** as that user (this requires steps 2–3 done, so come back here if needed):
   - Browse to `/shop` → add a product → checkout → fill the form → click **Place order**.
   - Note the order ID from the success page URL: `/order/success?order=<uuid>`.
3. **Sign in as a different Google user** (second incognito window):
   - Repeat: visit `/checkout` → sign in with a *different* Google account.
4. **Cross-user read test:**
   - In the second session, manually navigate to the first user's order URL: `/order/success?order=<uuid-from-step-2>`.
   - **Expected:** "We couldn't find that order" — RLS blocks the read. No order data leaks.
   - **SQL proof** (run in SQL editor as the `service_role` or `postgres` role):
     ```sql
     -- Replace with the two auth.uid() values you captured:
     SELECT id, customer_name, customer_email, subtotal
     FROM orders WHERE user_id = '<first-user-id>';
     -- Only that user's rows appear. No rows for the second user.
     ```

### 1e. Mark evidence in `docs/IMPLEMENTATION_PLAN.md`

Update the Phase 1 and Phase 8 evidence rows from `BLOCKED` to `[x] verified`:

```
## Phase 1 — Evidence log:
- [x] migration 0001 applied (schema + create_order RPC + RLS)
- [x] migration 0002 applied (seed: 11 products NG-001..011)
- [x] RLS cross-user test: user A can read own orders; user B cannot read user A's order
```

---

## 2 — Google OAuth → live sign-in verification

### 2a. Create the OAuth consent screen in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → select (or create) a project → **APIs & Services** → **Library** → enable **Google+ API** (or **People API**).
2. **OAuth consent screen** → **External** (for a demo; if you need internal-only, choose **Internal**):
   - **App name:** NexaGear
   - **User support email:** your email
   - **Developer contact email:** your email
   - **Scopes:** add `.../auth/userinfo.email` and `.../auth/userinfo.profile` (the standard OpenID scopes).
3. **Publish app** → **Production** (even for testing — "In production" is required for sign-in to work for non-test users). Google will show a warning screen; that's expected for unverified apps.

### 2b. Create the OAuth client ID

1. **Credentials** → **Create credentials** → **OAuth client ID** → **Web application**.
2. **Name:** NexaGear Web Client
3. **Authorized JavaScript origins** (add both):
   - `http://localhost:3000`
   - `https://<your-vercel-subdomain>.vercel.app` (your eventual Vercel URL — you can add it after deploy)
4. **Authorized redirect URIs** (add both):
   - `http://localhost:3000/auth/callback`
   - `https://<your-vercel-subdomain>.vercel.app/auth/callback`
5. Click **Create** → copy the **Client ID** and **Client secret**.

### 2c. Wire it into Supabase

1. Supabase Dashboard → your project → **Authentication** → **Providers** → **Google**.
2. Toggle **Enabled**.
3. Paste **Client ID** and **Client secret** from step 2b.
4. Click **Save**.

> You may also need to set the site URL in Supabase: **Authentication** → **Settings** → **Site URL** = `http://localhost:3000`, and add `http://localhost:3000/auth/callback` and the Vercel URL to **Redirect URLs**.

### 2d. Live sign-in verification

1. Restart your dev server (`npm run dev`) so it picks up `.env.local`.
2. Go to `http://localhost:3000/checkout` → click **Sign in** → **Continue with Google** (button is blue).
3. Complete the Google OAuth flow.
4. **Verify:** you land back on `/checkout` with your Google email displayed in the header (top-right). The "Continue to checkout" button is now active.
5. **Verify session persist:** reload the page — you stay signed in (session refreshes via `proxy.ts`).
6. **Verify sign-out:** click "Sign out" → header returns to "Sign in" button; `/order/success` for your order now shows "Sign in to place your order."

### 2e. Mark evidence in `docs/IMPLEMENTATION_PLAN.md` — Phase 4 checklist

```
- [x] sign-in: live Google sign-in completes
- [x] callback/resume: redirectTo returns to checkout
- [x] session persist: survives reload
- [x] sign-out: clears session
- [x] cart intact after sign-in (add to cart before sign-in, sign in, verify cart still there)
```

---

## 3 — Mailgun → live confirmation email

### 3a. Set up Mailgun

1. Go to [supabase.com](https://supabase.com) → no. Go to [mailgun.com](https://www.mailgun.com/) → **Sign up / Sign in**.
2. In the Mailgun dashboard, verify a **sending domain** (or use the sandbox domain `sandbox<random>.mailgun.org` for quick testing — note: sandbox domains can only send to authorized recipients).
3. Copy:
   - **API key** (starts with `key-`) → `MAILGUN_API_KEY`
   - **Domain** (e.g. `mg.yourdomain.com` or the sandbox URL) → `MAILGUN_DOMAIN`
   - **From email** (must be on the verified domain, e.g. `orders@mg.yourdomain.com`) → `MAILGUN_FROM_EMAIL`

### 3b. Add to `.env.local`

```bash
# Add these to .env.local:
MAILGUN_API_KEY=key-your-key-here
MAILGUN_DOMAIN=mg.your-domain.com
MAILGUN_FROM_EMAIL=NexaGear <orders@mg.your-domain.com>
```

> These live only in `.env.local` (server-only). The `lib/mailgun.ts` module imports `server-only` and calls Mailgun's REST API directly — no SDK, no client exposure. Bundle grep already proves no secret leaks (Phase 8 verified).

### 3c. Live confirmation email test

1. Restart the dev server (`npm run dev`).
2. Sign in (step 2) → browse to `/shop` → add a product → checkout → fill form → **Place order**.
3. The server action (`app/checkout/actions.ts`) commits the order to Supabase **first**, then calls `sendOrderConfirmation` (step 6 of the `placeOrder` flow — email is best-effort).
4. Check the email inbox for the order confirmation. Expected contents (validated by `buildConfirmationEmail` in `lib/mailgun.ts`):
   - Subject: `NexaGear order confirmation — <first-8-chars-of-id>`
   - Body contains: reference, date (UTC), delivery line ("Free for this demo"), each item with quantity and line total, subtotal, total, and the honest disclaimer ("No payment was taken — NexaGear is an internship demo store.").
5. **Failure-isolation test** (TESTING.md §6):
   - Stop the dev server, edit `MAILGUN_API_KEY` in `.env.local` to a deliberately wrong value (`key-BAD`), restart.
   - Place another order. **Expected:** the order is still saved (check the success page shows "Order received — SAID IN THE DATABASE"), but the email line reads "The confirmation email couldn't be sent right now — the order itself is unaffected, and the failure is logged on the server."
   - Check the dev terminal: `[mailgun] send failed (HTTP 401)` is logged.
   - Restore the correct key.

### 3d. Mark evidence in `docs/IMPLEMENTATION_PLAN.md` — Phase 6 checklist

```
- [x] confirmation received after real order: reference, date, items, quantities, total
- [x] Mailgun key absent/wrong ⇒ order still saved, success page shown, failure logged
```

---

## 4 — Playwright run → `.env.local` + browser install

The environment prerequisites are already done (steps 1 + 2). This step installs the browser and runs the e2e spec.

### 4a. Install Playwright browsers

```bash
npx playwright install chromium
# (or: npx playwright install-deps chromium  on Linux if you hit missing shared libs)
```

### 4b. Ensure `.env.local` is complete

Playwright's `webServer` config (`playwright.config.ts`) runs `npm run dev`, so the env must be present:

```bash
# .env.local should contain all 7 variables:
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
MAILGUN_API_KEY=...
MAILGUN_DOMAIN=...
MAILGUN_FROM_EMAIL=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4c. Run the tests

```bash
npm run test:e2e
```

Expected: 2 specs pass (the spec self-skips if Supabase env is absent, but now it's present):

1. **"wedge: browse → product → cart → checkout auth gate"** — loads `/shop`, clicks the first product, adds to cart, verifies "Added to cart", opens the cart, sees "Subtotal", clicks "Continue to checkout", sees the Google sign-in gate.
2. **"404 page routes back to the shop"** — visits a nonexistent product slug, sees the 404 message, clicks "Browse the catalogue," lands on `/shop`.

> Note: live Google OAuth is **not** part of the automated Playwright run (TESTING.md §3 explains why — OAuth can't be automated reliably). The Playwright spec verifies the **auth gate** renders correctly for an unauthenticated visitor, which is the wedge that gates the full manual journey.

### 4d. Mark evidence in `docs/IMPLEMENTATION_PLAN.md` — Phase 9

```
- [x] Playwright run: 2/2 passing on Chromium
```

---

## 5 — Vercel deploy → live URL

### 5a. Install & authenticate the Vercel CLI

```bash
npm install -g vercel        # if not already installed
vercel login                 # opens browser, logs you in
```

### 5b. Link to a Vercel project

```bash
# From the repo root (on main, with all files present):
vercel link --debug
# This creates .vercel/.json with the project/team mapping.
# If no project exists yet, it will prompt to create one.
```

### 5c. Add environment variables to Vercel

In the Vercel dashboard → your project → **Settings** → **Environment Variables**, add all 7 variables from `.env.local` with these **target environments**:

| Variable | Environment |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production + Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production + Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | Production + Preview (server-only) |
| `MAILGUN_API_KEY` | Production + Preview (server-only) |
| `MAILGUN_DOMAIN` | Production + Preview |
| `MAILGUN_FROM_EMAIL` | Production + Preview |
| `NEXT_PUBLIC_SITE_URL` | Production → `https://your-deploy.vercel.app` |

> **Critical for OAuth:** Set `NEXT_PUBLIC_SITE_URL` on Vercel to the deployed URL. Then go back to **step 2b** and add the Vercel domain to:
> - Google Cloud Console → **Authorized JavaScript origins** and **Authorized redirect URIs**.
> - Supabase Dashboard → **Authentication → Settings → Redirect URLs**.

### 5d. Deploy

```bash
vercel --prod
# Follow prompts: confirm project name, team/org, and link to existing or create new.
# Vercel builds with: npm install && npm run build
```

The CLI returns a live URL (e.g. `https://nexagear.vercel.app`).

### 5e. Production smoke test (TESTING.md §10)

On the live URL:

1. `npm run build` passes (Vercel does this for you — check the deploy log).
2. Console clean on home/shop/product/cart/checkout (open DevTools → no errors).
3. Direct route loads — refresh on `/shop` or `/product/<slug>` works (no 404 on reload).
4. **Live Google sign-in on the deployed URL** — the origin must be allow-listed (step 5c).
5. **Full journey on the live URL:**
   - Browse → product → add to cart → sign in with Google → checkout → form → Place order.
   - Verify an `orders` row + `order_items` rows appear in the Supabase dashboard.
   - Verify the confirmation email lands in the inbox (to the Google account's email).
6. Mobile check on the live URL (Chrome DevTools → toggle mobile, 360px).
7. Bundle grep: `npx vercel build --prod && grep -r "api.mailgun.net\|SUPABASE_SERVICE_ROLE" .next/static/` — should return nothing.

### 5f. Mark evidence in `docs/IMPLEMENTATION_PLAN.md` — Phase 9 + PRD §34 matrix

```
- [x] Vercel deploy: live URL = https://nexagear.vercel.app
- [x] Production smoke: routes 200, CSS 200, console clean, live Google sign-in + live email
- [x] Full Definition of Done journey: browse → cart → Google → order → row in Supabase → email received
```

---

## 6 — Git commit → main has zero commits

The repo is on `main` with **zero commits**. All files are untracked but ready (verified by `git status` — only `.env.example`, `.gitignore`, and source are present; `.env.local` is git-ignored).

### 6a. Final clean check

```bash
git status
# Confirm: no .env.local, no .freebuff/, no node_modules/ in the untracked list.
git check-ignore .env.local .freebuff node_modules .next
# Should list: .env.local (and the others) — proving .gitignore is working.
```

### 6b. Stage deliberately

```bash
git add .gitignore
git add .env.example
git add AGENTS.md
git add README.md
git add next.config.ts next-env.d.ts tsconfig.json postcss.config.mjs eslint.config.mjs vitest.config.ts playwright.config.ts package.json package-lock.json
git add app/ components/ lib/ public/ supabase/ tests/ docs/ proxy.ts
```

> We stage explicitly rather than `git add -A` to be 100% certain nothing sensitive slips in (AGENTS.md §8). Every file above was confirmed present and non-sensitive by the local gates.

### 6c. Commit

```bash
git commit -m "NexaGear dev demo: complete build with honest failure states

All 10 phases of docs/IMPLEMENTATION_PLAN.md implemented and locally green:
- Phases 0-3: scaffold, schema, browse, cart (36/36 Vitest tests)
- Phases 4-6: Google OAuth wiring, server-side checkout with create_order
  RPC, Mailgun confirmation (failure-isolated)
- Phase 7-8: Datasheet design (AA palette), accessibility, security/legal
- Phase 9: local gates green (tsc=0, eslint=0, build=0)
Provider-dependent flows (Supabase env, OAuth credentials, Mailgun key,
Playwright browsers, Vercel deploy) remain BLOCKED on credentials,
per docs/IMPLEMENTATION_PLAN.md — no fake success states committed.

Provider-specific setup procedure: docs/DEPLOYMENT_RUNBOOK.md" \
  --author="..."  # use your own git identity

🤖 Generated with Codebuff
Co-Authored-By: Codebuff <noreply@codebuff.com>
```

### 6d. After the commit

```bash
# Verify:
git log --oneline -1
git show --stat HEAD    # confirm no .env.local or .freebuff/ in the diff
# Then push (only if you want remote):
git push origin main
```

> **Do not** `git push` until you've reviewed the commit and confirmed your local git identity. The user (you) has final authority on the push.

---

## Quick-reference summary

| Item | Key file(s) | Test command | Verification |
|---|---|---|---|
| 1. Supabase | `supabase/migrations/0001_schema.sql`, `0002_seed.sql` | SQL editor query | 11 products + RLS blocks cross-user |
| 2. Google OAuth | `components/AuthSection.tsx`, `app/auth/callback/route.ts`, `proxy.ts` | Manual sign-in on localhost | Email shown in header after Google login |
| 3. Mailgun | `lib/mailgun.ts`, `app/checkout/actions.ts` | Place order, check inbox | Email contains ref/date/items/total |
| 4. Playwright | `tests/e2e/wedge.spec.ts`, `playwright.config.ts` | `npm run test:e2e` | 2/2 tests pass |
| 5. Vercel | `next.config.ts`, `.env.example` | `vercel --prod` | Live URL + smoke test (§10) |
| 6. Git commit | `.gitignore`, `.env.example` | `git status` + `git show` | 0 secrets in tracked files |

**Status:** all code is written and locally verified (`tsc`=0, `eslint`=0, 36/36 tests pass, clean `next build`). The 6 blocked items are exclusively missing credentials/provider config — follow the steps above to close them.
