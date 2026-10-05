# Replit Guide — Website + Mobile Cart Sync

How to run the NexaGear shop **and** its Expo mobile app in a single Replit
workspace, with one shared Supabase cart that syncs between the browser and a
physical phone via Supabase Realtime.

This guide has two parts:

1. **The prompt** — a single block you paste into Replit's AI agent. It tells
   the agent to import the repo, install deps, set up env vars, and start both
   servers.
2. **Manual steps** — what to do if you prefer to click buttons yourself, plus
   the test sequence (web → phone → web cart sync) and the traps to avoid.

---

## Prerequisites

Before you start, you need these from your own accounts (they are not in the
repo — `.env.local` and `mobile/.env` are gitignored):

| Secret | Where it goes | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Root `.env.local` + `mobile/.env` | Supabase project settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Root `.env.local` + `mobile/.env` | Supabase API → anon public |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Root `.env.local` + `mobile/.env` | Clerk dashboard → API keys |
| `CLERK_SECRET_KEY` | Root `.env.local` only | Clerk dashboard → API keys |
| `SUPABASE_SERVICE_ROLE_KEY` | Root `.env.local` only | Supabase API → service_role |
| `MAILGUN_API_KEY` | Root `.env.local` only | Mailgun dashboard |
| `MAILGUN_DOMAIN` | Root `.env.local` only | Mailgun dashboard |
| `MAILGUN_FROM_EMAIL` | Root `.env.local` only | Your choice, e.g. `orders@mg.your-domain.com` |
| `NEXT_PUBLIC_SITE_URL` | Root `.env.local` only | The Replit preview URL (or `http://localhost:3000`) |

**Three of those values appear in two places** — the website reads
`NEXT_PUBLIC_*` and the mobile app reads `EXPO_PUBLIC_*` from the *same*
Supabase project and Clerk instance. Paste the same URL, anon key, and
publishable key into both files.

> **⚠️ Rotate first.** The investigation that built the server cart logged five
> secrets (Supabase service-role key, legacy JWT signing secret, Clerk secret
> key, a Vercel access token, and a Paystack key). They were captured in
> screenshots/paste during the PGRST301 diagnosis and are recorded in
> docs/IMPENDENT_LOG.md. Rotate them in their respective dashboards **before**
> entering fresh copies into Replit Secrets.

---

## Part 1 — The Replit AI Prompt

Paste everything between the `===` lines (inclusive) into the Replit AI agent
chat:

```
===
You are a coding assistant setting up a full-stack project in Replit. The
repository at https://github.com/OTimileyin/NexaGear.git contains two
applications sharing one Supabase backend and one Clerk auth instance:

  1. A Next.js 16 website at the repository root (package.json at root).
  2. An Expo SDK 57 mobile app in the mobile/ subdirectory (package.json at
     mobile/package.json).

A server-backed cart (cart_items table) syncs between the two via Supabase
Realtime — an item added on the website appears on the phone within seconds.
This is the Lesson 3 submission requirement.

Set up the project as follows. Ask me only for values I have not already
provided in Replit Secrets.

1. Import the repository from https://github.com/OTimileyin/NexaGear.git.

2. Install the website dependencies: `npm install` at the root.

3. Install the mobile dependencies: `cd mobile && npm install`.

4. Create the website env file at the root: `.env.local` with these keys
   (read values from the Replit Secrets I have already set — do NOT hard-code
   them, do NOT commit this file). The required keys are:
   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in,
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up, NEXT_PUBLIC_SITE_URL,
   CLERK_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, MAILGUN_API_KEY,
   MAILGUN_DOMAIN, MAILGUN_FROM_EMAIL.

5. Create the mobile env file at mobile/.env with these three keys (also from
   Secrets — same values as the website's public keys):
   EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY,
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY.

6. Start the website dev server: `npm run dev`. It listens on port 3000 and
   Replit will expose a preview URL.

7. In a SECOND shell, start the mobile dev server with tunnel support so a
   physical phone can reach it: `cd mobile && npx expo start --tunnel`. This
   prints a QR code. The phone scans it with the Expo Go app (free on the App
   Store / Play Store).

8. Do NOT run `eas build` — Replit has no Android SDK. The production APK is
   still built via EAS cloud (see docs/LESSON3_SUBMISSION.md §4 step 4). The
   `expo start --tunnel` flow is only for on-device preview and cart-sync
   testing.

9. Report back: the website preview URL, the Expo dev server QR code, and
   confirmation that both installed their dependencies without errors.

Important constraints:
- .env.local and mobile/.env are already in .gitignore — never commit real
  values.
- The three EXPO_PUBLIC_* values are safe in the APK/JS bundle: they are the
  same anon/publishable keys already in the website's client bundle by design.
  The service-role key and Clerk secret key must NEVER reach the mobile app.
- The mobile app uses Clerk's email + password flow (not Google OAuth), so no
  OAuth redirect URI is needed for the phone. The website uses Clerk's Next.js
  middleware; you may need to add the Replit preview URL to Clerk's redirect
  URI allowlist for sign-in to complete after redirect.
===

```

After the agent finishes, it will have started two servers:
- The website on `http://localhost:3000` (with a Replit preview URL)
- The Expo dev server on `http://localhost:8081` with a tunnel URL and QR code

---

## Part 2 — Manual Steps (no AI agent)

### Step 1 — Import the repo

In Replit, click **New Repl → Import from GitHub** and enter:
`https://github.com/OTimileyin/NexaGear.git`

### Step 2 — Set your secrets

Replit → **Tools → Secrets** → **Environment Secrets**. Add every key from the
table above. Secrets are injected as environment variables so neither
`.env.local` nor `mobile/.env` needs to be committed.

### Step 3 — Install dependencies

In the main shell:

```bash
npm install
cd mobile && npm install
```

### Step 4 — Create the env files

`cd mobile && npx expo start --tunnel` reads `EXPO_PUBLIC_*` from the
environment, so you can either:

- **Option A (preferred):** let the secrets fill them. Replit's Secrets are
  process-wide, so `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
  and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` set in Secrets flow into the Expo
  server automatically. No `mobile/.env` file is needed.

- **Option B:** create `mobile/.env` manually (matches `.env.example`).

For the website, create `.env.local` at the root with all the keys from Part 1
step 4. Replit Secrets are already available to the Next.js dev server, so you
may not even need `.env.local` — Next.js reads `process.env.*` at runtime in dev
mode. But Clerk's Next.js integration reads some env vars at import time, so
having `.env.local` is the safe path.

### Step 5 — Start the website

```bash
npm run dev
```

Replit shows a preview URL like
`https://nexagear.<your-username>.repl.co`. Open it in a browser tab.

### Step 6 — Start the mobile dev server

Open a **second shell** (Replit supports multiple shells):

```bash
cd mobile
npx expo start --tunnel
```

The `--tunnel` flag wraps the dev server in a secure tunnel so your phone can
reach it even if the phone is on a different network.

You will see a QR code in the terminal. Scan it with **Expo Go** (free app on
iOS App Store / Google Play Store) on your physical phone.

### Step 7 — Configure Clerk redirect URIs (if sign-in fails on web)

The website uses Clerk's middleware (`proxy.ts`). In dev mode it expects
`localhost:3000`, but Replit serves on a different hostname. If sign-in
redirects to a blank page or loops:

1. Go to the **Clerk Dashboard** → your application → **Configuration** →
   **Redirect URIs**.
2. Add the Replit preview URL (e.g.
   `https://nexagear.<your-username>.repl.co/*`).
3. Also add `http://localhost:3000/*` for local-only work.

The mobile app does **not** need this — it uses email + password (no browser
redirect).

### Step 8 — Test the cart sync (the 9-step demo sequence)

This is the core of the assignment. Run it with **one account** on the same
Supabase project.

| # | Action | What you should see |
|---|---|---|
| 1 | On the website, sign in with email + password (or create an account). | Header shows your email. |
| 2 | Show the signed-in state. | Cart icon has the right count. |
| 3 | **Add a product to the cart on the website.** | Cart badge updates. |
| 4 | Open the mobile app on your phone (Expo Go). | Shop screen loads. |
| 5 | **Sign in on the phone with the same email + password.** | "Signed in as ..." appears. |
| 6 | **The web-added item is in the mobile cart.** | Open the cart tab — the item from step 3 is there. This works because the app loads the cart on open AND subscribes to Supabase Realtime. |
| 7 | Add another item from the mobile app. | Quantity updates instantly. |
| 8 | Return to the website, refresh the cart (or just revisit it). | The item added in step 7 appears. The website has a realtime subscription (components/CartSync.tsx) but a manual refresh is the safe move for a recording. |
| 9 | Physical phone on camera, one continuous recording. | Both screens visible. |

> **Trap to avoid:** do not record before confirming the push was deployed. The
> live site `https://nexagear.vercel.app` already has the server cart, but if
> you are running a local Replit dev build, make sure the code is the latest
> (the push is done — all 5 commits including `682ecdb` are on `origin/main`).

### Step 9 — Production APK (still needed for the final submission)

The `expo start --tunnel` + Expo Go flow proves the sync works, but it is not
an installable APK. For the actual deliverable:

1. The corrected build `418d08b7` should be finished in the EAS queue (see
   docs/LESSON3_SUBMISSION.md §2).
2. Once it finishes, download the APK, inspect its JS bundle to confirm the
   three public keys are present (see docs/DECISION_LOG.md D38), then upload to
   Google Drive.
3. Install that APK on the phone for the final video.

Replit cannot build the APK — that stays on EAS.

---

## What is already on disk

All of this is committed and pushed to `origin/main`:

- `mobile/src/app/` — Expo Router routes: `_layout.tsx`, `index.tsx`,
  `cart.tsx`, `sign-in.tsx`.
- `mobile/src/cart/cart-context.tsx` — the phone's cart context (load +
  subscribe + optimistic writes).
- `mobile/src/lib/cart-api.ts` — the phone's Supabase cart client (no
  `mergeGuest` — the phone has no local cart).
- `mobile/src/lib/cart-math.ts` + `cart-math.test.mjs` — 13 tests, all
  passing with `node --test`.
- `components/CartSync.tsx` — the website's cart bridge (also live on Vercel).
- `lib/cart/store.ts` + `lib/cart/server-bridge.ts` — the shared cart logic.
- `supabase/migrations/0011_server_cart.sql` — the `cart_items` table, RLS
  policies, and the Realtime publication entry.

The git push was completed on 2026-10-05: all 5 commits (including `682ecdb`
feat: the shop gets a phone app) are on `origin/main`.

---

## Secrets mapping summary

Set these in **Replit → Tools → Secrets** (process-wide, injected as
environment variables):

| Secret name | Used by | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Website + Mobile | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Website + Mobile | Public |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Website + Mobile | Public |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Website | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Website | `/sign-up` |
| `NEXT_PUBLIC_SITE_URL` | Website | Replit preview URL or `http://localhost:3000` |
| `CLERK_SECRET_KEY` | Website only | Server-side — never reaches the mobile app |
| `SUPABASE_SERVICE_ROLE_KEY` | Website only | Server-side — never reaches the mobile app |
| `MAILGUN_API_KEY` | Website only | Server-side |
| `MAILGUN_DOMAIN` | Website only | Server-side |
| `MAILGUN_FROM_EMAIL` | Website only | Server-side |

Optional (only needed if you want rate limiting + payments to work):
`PAYSTACK_SECRET_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
Leave unset and those features degrade gracefully (orders are still created;
rate limiting fails open).
