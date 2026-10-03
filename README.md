# NexaGear

A modern shop for developer, electronics, robotics, and workspace gear with a simple authenticated checkout and reliable order confirmation experience.

**Assignment:** HNG Internship Assignment 2 · **Status:** Documentation complete, pre-build — see `docs/IMPLEMENTATION_PLAN.md` for phase status.

## What it does

Browse products → add to cart → sign in with Google → checkout → the order is priced and persisted server-side → an order-confirmation email arrives via Mailgun.

- Persistent catalogue and orders: **Supabase (PostgreSQL)**
- Sign-in: **Google OAuth** via Clerk (credentials configured in Clerk and Google Cloud Console)
- Confirmation email: **Mailgun** (server-side only)
- Deployment: **Vercel**

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Database + Auth | Supabase (Postgres, Auth, RLS) |
| Email | Mailgun REST API |
| Cart | React context + localStorage (pre-checkout only) |
| Tests | Vitest + Testing Library; Playwright (critical journey) |

## Getting started (after scaffolding)

```bash
npm install
cp .env.example .env.local   # then fill in real values — never commit .env.local
npm run dev
```

Required environment variables (see `.env.example`):

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY      # server-only
MAILGUN_API_KEY                # server-only
MAILGUN_DOMAIN
MAILGUN_FROM_EMAIL
NEXT_PUBLIC_SITE_URL
```

Database schema and seed data live in `supabase/migrations/`.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Local development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit/component tests |
| `npm run test:e2e` | Playwright critical-journey test (requires configured env) |

## Documentation

| Document | Purpose |
|---|---|
| [docs/PRD.md](docs/PRD.md) | Product requirements (source of truth) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Components, data model, invariants, failure modes |
| [docs/DESIGN_GUIDELINES.md](docs/DESIGN_GUIDELINES.md) | "The Datasheet" design system, a11y, product language |
| [docs/SECURITY.md](docs/SECURITY.md) | Trust boundaries, auth, secrets, RLS |
| [docs/TESTING.md](docs/TESTING.md) | Test strategy and checklists |
| [docs/RESOURCES.md](docs/RESOURCES.md) | Approved dependencies and licenses |
| [docs/LEGAL_COMPLIANCE.md](docs/LEGAL_COMPLIANCE.md) | Privacy, demo disclosures, image licensing |
| [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) | Phases, acceptance criteria, evidence logs |
| [docs/DECISION_LOG.md](docs/DECISION_LOG.md) | Real project decisions and their rationale |
| [docs/DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md) | Pre-deploy checks |
| [docs/PRODUCTION_QUALITY.md](docs/PRODUCTION_QUALITY.md) | Production polish checks |
| [AGENTS.md](AGENTS.md) | Rules for coding agents |

## Notes

This is a demonstration project for an internship assignment. It is not a registered commercial store; no payment processing occurs, and legal pages state their demo status plainly. Product names are original/generic seed concepts, not claims about real inventory or brands.

## Engineering process

Built with gODtECH FORGE — Framework for Orchestrated Reasoning, Governance & Engineering.

FORGE governs this repository's engineering process: project context lives in
`.forge/context/`, and `npm run verify` executes the gates declared in
`.forge/verification/gates.json` so completion claims are backed by evidence.
See [.forge/verification/PROJECT-GATES.md](.forge/verification/PROJECT-GATES.md).
