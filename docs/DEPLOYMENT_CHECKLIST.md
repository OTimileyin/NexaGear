# NexaGear — Deployment Checklist

Every item must be `[x]` verified or `N/A` (with reason) before deploy. Evidence goes in `IMPLEMENTATION_PLAN.md`.

## Error handling & states

- [ ] Server actions return typed errors; no unhandled promise rejections in checkout/auth paths
- [ ] Loading states on: catalogue fetch, auth redirect, order submit (busy button)
- [ ] Empty states: empty cart, no featured products
- [ ] Error states: catalogue load failure, sign-in failure, order failure, Mailgun failure (logged server-side)
- [ ] Failed requests never show fake success (checkout failure ≠ success page)

## Submissions

- [ ] Duplicate submission: "Place order" disabled while in-flight + server `UNIQUE(user_id, client_ref)`
- [ ] No duplicate payments — **N/A: payment processing is out of scope (PRD §32)**

## Limits

- [ ] Rate limiting / API limits / spending caps — **N/A at demo scale: no public API, email sent once per order server-side**; revisit threshold: automated abuse of order creation (needs auth first, low risk). Documented in `SECURITY.md` §5.
- [ ] Quantity bounds enforced client + server (1–99, ≤50 lines)

## Data

- [ ] Indexes: `orders(user_id)`, `orders(user_id, client_ref) UNIQUE`, `products(slug) UNIQUE`, `order_items(order_id)` — in migration
- [ ] Pagination — **N/A: catalogue is 8–12 products; documented revisit point >100 products**
- [ ] Uploads — **N/A: no user uploads (SECURITY.md §7)**
- [ ] Caching — **N/A: no read-heavy hot path at demo scale**; default Next.js caching left at framework defaults

## Monitoring & operations

- [ ] Uptime monitoring — **N/A for assignment** (Vercel dashboard sufficient); revisit for real use
- [ ] Error logging: order/Mailgun failures logged server-side with order id (implemented); no third-party logger (dependency budget)
- [ ] Backups — **N/A: demo-scale Supabase project**; note: data loss acceptable only while demo, escalate before real use
- [ ] Simultaneous-user testing: two browsers, two accounts, concurrent checkouts — must not cross data (RLS check)

## Environment & config

- [ ] All env vars set in Vercel project settings (7 vars in `.env.example`)
- [ ] `NEXT_PUBLIC_SITE_URL` matches the deployed URL (OAuth redirect correctness)
- [ ] Google Cloud Console authorized redirect URIs include deployed origin
- [ ] Supabase Auth redirect URLs include deployed origin
- [ ] Mailgun domain verified and sending authorized
- [ ] `.env*` git-ignored; `.env.example` placeholders only; `git status` clean of secrets

## Verification gates

- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] Bundle grep: no `MAILGUN_API_KEY`, no `SUPABASE_SERVICE_ROLE_KEY` in `.next` static output
- [ ] Production smoke test (`TESTING.md` §10) on the live URL
