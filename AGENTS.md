# AGENTS.md — How Coding Agents Must Behave in This Repository

Applies to every coding agent (Freebuff, Claude Code, Codex, etc.) working on NexaGear.

## 1. Source-of-truth hierarchy

Resolve conflicts in this order. Never silently pick a winner when two authoritative sources conflict — report the conflict and stop if it affects architecture, scope, security, or behavior.

1. Newest explicit user instruction
2. `docs/PRD.md` (approved requirements)
3. `docs/DECISION_LOG.md` (approved decisions)
4. `docs/ARCHITECTURE.md`, `docs/SECURITY.md`
5. `docs/IMPLEMENTATION_PLAN.md` (phases + acceptance evidence)
6. Existing working code
7. `README.md` and other supporting docs
8. Assumptions

## 2. Stack rules (fixed — do not swap without a decision-log entry)

- **Framework:** Next.js (App Router) + **TypeScript**
- **Styling:** Tailwind CSS only — no CSS Modules, styled-components, or inline style libraries
- **Database/auth:** Supabase (Postgres + Auth + RLS + Google OAuth)
- **Email:** Mailgun, called server-side over its REST API
- **Cart:** React context + `localStorage` (no state library)
- **Hosting:** Vercel
- **Tests:** Vitest (+ React Testing Library); Playwright for the critical journey

## 3. Framework-version rules

- The repository's installed versions outrank model memory. Before using any version-sensitive API:
  1. Read `package.json` and the lockfile.
  2. Read local docs/types in `node_modules` when unsure.
  3. Match documentation to the installed version.
- **Never** upgrade or add a dependency just to make remembered syntax work.

## 4. Coding standards

- TypeScript strict; no `any` without a written reason near the code.
- Secrets live only in server-side env vars, never `NEXT_PUBLIC_*`, never literals, never committed.
- Server-only modules (service-role client, Mailgun sender) import `server-only`.
- Prices/totals are always computed server-side from database records (PRD §13). Never trust a client-supplied amount.
- Every fetch has a loading, empty, and error state. Errors say what happened and what to do next.
- All UI copy follows `docs/DESIGN_GUIDELINES.md` §Product language: no apologetic/vague errors, no invented testimonials, stats, ratings, or claims.
- Accessibility bar: WCAG 2.2 AA — labeled inputs, visible focus, keyboard-operable controls, semantic headings, reduced-motion support.

## 5. Testing rules

- Unit tests live in the phase they verify (pricing math with the checkout phase, cart math with the cart phase).
- A phase is complete only with observable evidence in `docs/IMPLEMENTATION_PLAN.md` (`[x] verified`). "Looks correct" is not evidence.
- Provider-dependent flows that have not been exercised end to end are marked `IMPLEMENTED / UNVERIFIED` or `BLOCKED` — never `verified`.

## 6. Safety rules

- Never commit `.env`, `.env.local`, secrets, or `.freebuff/`.
- Never push, force-push, or rewrite history unless the user explicitly asks.
- No payment, auth-provider, or analytics additions without an explicit user instruction.
- Do not invent requirements not supported by the PRD, decisions, or current instruction.
- Never claim something was tested, deployed, or inspected unless it actually was.

## 7. Dependency discipline

Before adding a dependency, answer in the PR/description: what problem, can the stack do it natively, runtime cost, maintenance/security surface, license, overlap. Prefer existing deps and platform APIs. Do not swap stable working code for a preferred library.

## 8. Git rules

- Stage files deliberately (no blind `git add -A` until `.gitignore` is confirmed current).
- Commit messages describe why, not just what.
- Git readiness review before the first significant commit: `git status` file-by-file, secrets excluded, `.env` handling verified, build/tests run.

## 9. Production-readiness requirements

- `npm run build`, `npm run lint`, `npm run typecheck`, and `npm test` must pass before any deploy.
- No secrets in the client bundle (grep build output).
- Every box in `docs/DEPLOYMENT_CHECKLIST.md` and `docs/PRODUCTION_QUALITY.md` is `[x]` or explicitly `N/A` with a reason before calling the project done.
