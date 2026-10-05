# Codex Prompt — Local Environment Setup

Run this from the repository root **after** importing/pushing to GitHub:

```bash
codex prompt "$(cat docs/CODEX_PROMPT.md)"
```

Or paste the prompt block between `===` directly into a Codex session.

The prompt below sets up the local dev environment so the website and the
Expo mobile app can run side by side, sharing the same Supabase cart.

---

===
You are an autonomous agent working in a Git repository at the workspace root.
The repo contains two apps sharing one Supabase backend and one Clerk auth
instance:

  1. A Next.js 16 website at the repository root (package.json at root).
  2. An Expo SDK 57 mobile app in the mobile/ subdirectory (package.json at
     mobile/package.json).

A server-backed cart (cart_items table) syncs between the two via Supabase
Realtime — an item added on the website appears on the phone within seconds.

You have READ-ONLY access to this prompt. The actual secrets (Supabase keys,
Clerk keys, etc.) are provided to you as shell environment variables by the
user — do NOT hard-code them, do NOT commit any env file.

Your task: set up the local dev environment so the user can start both apps
and test cart sync on a physical phone. Do NOT attempt to build a production
APK — there is no Android SDK here and the APK is built via EAS cloud.

Steps:

1. Read the following files to understand the project structure:
   - package.json (root)
   - mobile/package.json
   - mobile/app.json (for the Expo config, runtimeVersion, scheme)
   - .env.example (root) — template for website secrets
   - mobile/.env.example — template for mobile secrets
   - mobile/src/lib/env.ts — how the mobile app reads EXPO_PUBLIC_* values
   - docs/REPLIT_GUIDE.md — secrets mapping table

2. Check whether the required environment variables are already set in the
   shell. Look for these variable names:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
   - CLERK_SECRET_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - MAILGUN_API_KEY
   - MAILGUN_DOMAIN
   - MAILGUN_FROM_EMAIL
   - NEXT_PUBLIC_SITE_URL
   - NEXT_PUBLIC_CLERK_SIGN_IN_URL
   - NEXT_PUBLIC_CLERK_SIGN_UP_URL

3. Create the website env file at the root: `.env.local`. Write the values
   from the shell environment into it in KEY=value format. The file is
   gitignored — do NOT commit it.

4. Create the mobile env file at mobile/.env with these three keys (same
   values as the website's public keys):
   EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY,
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. This file is also gitignored.

5. Install the website dependencies: `npm install` at the root.

6. Install the mobile dependencies: `cd mobile && npm install`.

7. Start the website dev server in the BACKGROUND: `npm run dev`. This
   listens on port 3000. Wait for it to be ready (HTTP 200 on
   http://localhost:3000).

8. Start the Expo dev server in the BACKGROUND: `cd mobile && npx expo start
   --tunnel`. This creates a tunnel and prints a QR code. Wait for the QR
   code to appear in stderr/stdout.

9. Do NOT run `eas build` (no Android SDK). Do NOT run `npm run build` for
   the website (dev mode is sufficient for cart-sync testing).

10. Report back:
    - Confirmation that .env.local and mobile/.env were created from the
      shell environment.
    - Confirmation that both `npm install` (root and mobile/) succeeded.
    - The website is running and responding at http://localhost:3000.
    - The Expo dev server is running with a tunnel URL and QR code.
    - The exact shell commands you ran.
    - Any errors encountered.

11. DO NOT commit anything. DO NOT push. DO NOT install any new npm packages
    beyond what is in the existing package.json files. DO NOT modify any
    application source code. DO NOT read or use the SUPABASE_SERVICE_ROLE_KEY
    or CLERK_SECRET_KEY for anything other than writing them into .env.local.

Constraint: the three EXPO_PUBLIC_* values are public (same as the anon key
and publishable key already in the website bundle). The service-role key and
Clerk secret key must NEVER be written to mobile/.env.
===
```

---

## Quick reference: running it

```bash
# 1. Export your secrets into the shell (from your dashboards)
export NEXT_PUBLIC_SUPABASE_URL="https://..."
export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
export CLERK_SECRET_KEY="sk_test_..."
export SUPABASE_SERVICE_ROLE_KEY="..."
export MAILGUN_API_KEY="..."
export MAILGUN_DOMAIN="mg.your-domain.com"
export MAILGUN_FROM_EMAIL="orders@mg.your-domain.com"
export NEXT_PUBLIC_SITE_URL="http://localhost:3000"
export NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
export NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# 2. Run Codex with this prompt
codex prompt "$(cat docs/CODEX_PROMPT.md)"
```

After Codex finishes, both servers will be running:
- Website: `http://localhost:3000`
- Expo dev server: tunnel URL + QR code (scan with Expo Go on your phone)

Then sign in with the same email + password on both, add an item to the cart
on the website, open the app on your phone, and confirm the item appears.
