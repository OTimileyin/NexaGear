# NexaGear — Resources (Approved Dependencies & Tools)

Anything not listed requires a dependency-budget review (AGENTS.md §7) and a `DECISION_LOG.md` entry.

## Runtime dependencies

| Package | Purpose | License | When NOT to use |
|---|---|---|---|
| `next` | App framework: routing, server actions, build | MIT | Never swap frameworks — PRD-mandated |
| `react`, `react-dom` | UI runtime | MIT | — |
| `@supabase/supabase-js` | Supabase client (data + auth API) | Apache-2.0 | Never for service-role use in client code |
| `@supabase/ssr` | Cookie-based session bridge for Next.js server/client | Apache-2.0 | Never store sessions in `localStorage` |

**Deliberately not used**

| Candidate | Why excluded |
|---|---|
| `mailgun.js` / `nodemon`-style SDKs | Mailgun's REST endpoint works with native `fetch` — an SDK adds bundle/maintenance surface for one POST (dependency budget) |
| Zustand / Redux / React Query | Cart is context + localStorage (PRD §7); server components cover data fetching |
| Stripe / Paystack / Flutterwave | Payments out of scope (PRD §32) |
| Any analytics/tracking SDK | Not permitted without explicit instruction + privacy review (PRD §30) |
| Form libraries (react-hook-form etc.) | One checkout form; native validation + small custom logic is enough for now |

## Development dependencies

| Package | Purpose | License | Notes |
|---|---|---|---|
| `typescript` + `@types/*` | Type checking | Apache-2.0 | `tsc --noEmit` is a gate |
| `tailwindcss` + `@tailwindcss/postcss` | Styling system (approved choice) | MIT | v4 CSS-first config |
| `eslint` + `eslint-config-next` | Lint gate | MIT | Next.js core rules |
| `vitest` | Unit/component test runner | MIT | Zero-config fit for this stack |
| `@testing-library/react`, `jsdom` | Component testing | MIT / MIT | User-centric queries only |
| `@playwright/test` | Critical-journey e2e | Apache-2.0 | One spec; needs configured env |

## Services & accounts

| Service | Purpose | Account notes |
|---|---|---|
| Supabase | Postgres + Auth + RLS | Free tier; project + service-role key kept out of git |
| Google Cloud Console | OAuth client for Google sign-in | Redirect URIs must include deployed origin |
| Mailgun | Order-confirmation email | Sender domain verified; API key server-only |
| Vercel | Hosting | Env vars set in project settings, not in repo |
| GitHub (`OTimileyin/NexaGear`) | Remote repository | `.gitignore` verified before every push |

## Asset rules

- Product images: original, properly licensed stock, or appropriately licensed generated imagery — sources/licenses logged in the seed migration or `DECISION_LOG.md` (PRD §29).
- Fonts: self-hosted or system-safe open-license fonts (OFL) — no third-party font CDNs without review.
- Icons: inline SVG or one small open-license icon set; no emoji as UI icons.
