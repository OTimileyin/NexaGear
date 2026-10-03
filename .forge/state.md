# Project State

Maintained by the owner. FORGE reads this; it does not regenerate it.

## Current stage

Build — the MVP is implemented, verified locally, and deployed.

## Completed

- FORGE initialized; `.forge/context/project.yaml` populated from `docs/PRD.md`.
- Storefront, catalogue, cart, Google sign-in, checkout, order confirmation, and
  order-status tracking implemented (decisions D24–D25).
- Read-only admin dashboard plus an admin-only order-status write path, authorised by RLS.
- Tagged, removable sample orders so a demo is not empty (D25).
- Rate limiting on checkout and the payment callback via Upstash Redis REST (D26).
- Accessibility and SEO defects found by scanning 11 real routes, all fixed (D27).
- Project verification gates declared in `.forge/verification/gates.json` and
  passing via `npm run verify`.

## In progress

- Six commits are unpushed; live routes `/admin` and `/order/track` do not exist
  on the deployment until the owner pushes.
- Provider-dependent paths cannot be exercised until credentials are supplied.

## Open questions

- Which Clerk account is the admin, and is cross-user RLS isolation proven? It
  still needs a second signed-in account to test.
- Is Paystack test mode actually configured, so the settlement path can be exercised?
- Should sample data remain in the production database after the demo window?

## Material risks

- Supabase legacy JWT secret, `sb_secret_` key, `service_role` JWT key, Clerk
  secret key, and the Vercel token were exposed and must be rotated. Until they
  are, this repository cannot be called production-ready.
- `NEXT_PUBLIC_SITE_URL` is `http://localhost:64820` locally, so canonical URLs
  and the sitemap advertise localhost unless set in Vercel.
- Clerk allowed origins must include `https://nexagear.vercel.app` or live Google
  sign-in fails.
- Mailgun has no authorized recipient, so confirmation email returns 403.
- The verification gates are load-sensitive on this machine: a back-to-back full
  `npm run verify` can time out a Vitest worker. Run gates individually or on an
  idle machine, and treat a worker timeout as `UNVERIFIED`, not as a pass.