# NexaGear — Legal & Compliance

**Framing:** NexaGear is an HNG internship assignment demonstration, not a registered commercial business. Nothing here is legal advice, and no document may invent commitments on the project's behalf (MASTER §18).

## 1. Privacy

**Data collected (only what the flow needs — PRD §30):**

| Data | Source | Purpose | Where it lives |
|---|---|---|---|
| Google profile (name, email, avatar) | Google sign-in via Supabase Auth | identity at checkout | Supabase `profiles` / `auth.users` |
| Order contact (name, email, phone, address) | checkout form | order representation + confirmation email | Supabase `orders` |
| Cart contents | browser | pre-checkout convenience | `localStorage` (device-local, never uploaded before order) |

**Not collected:** analytics, marketing trackers, cookies beyond the auth session, payment data (there is no payment). Adding any tracker later requires: provider documented → this file updated → consent requirements reviewed (PRD §30).

**Auth storage:** session cookies (HttpOnly) are strictly necessary for the sign-in feature — the only persistent browser storage beyond the cart.

## 2. Required disclosures (before any public demo link is shared)

Create simple pages (`/privacy`, `/terms`) that **state the truth**:

- This is a student/assignment demonstration, not a real store; no purchases occur and no payment information is requested.
- What little data is collected (above), for what purpose, retained while the demo database exists.
- Contact/exit: orders can be removed by request during the demo (simple promise — only include if the team will honor it; otherwise state "data persists in the demo database until the project is retired").
- No cookies for tracking; localStorage cart is local to the browser.

**Must NOT appear:** registered-business claims, refund/guarantee policies for real sales, fake company registration numbers, "trusted by" claims, or any invented testimonial/statistic (PRD §31).

## 3. Refunds / returns

**N/A while no payment exists.** If the project later represents real sales: a returns/refund section must be written *before* launch and reviewed for local law.

## 4. Copyright & licensing

- Product images: original, properly licensed, or licensed generated imagery — **never scraped from retailers**; source + license logged (PRD §29).
- Product names: original/generic seed concepts — no brand claims implying affiliation (PRD §28).
- Code dependencies: MIT/Apache-2.0 only (see `RESOURCES.md`).
- Fonts/icons: open-license (OFL etc.).

## 5. Accessibility obligations

Target **WCAG 2.2 AA** (PRD §25) — it is both an assignment requirement and the project's stated accessibility commitment. Verification lives in `TESTING.md` §7.

## 6. Consent

- Google sign-in: explicit user action; sign-out available.
- No cookie banners needed beyond necessary-session disclosure (no tracking cookies exist).
- Re-assess if analytics, embedded third-party content, or marketing is ever added (PRD §31).

## 7. Pre-launch legal checklist

- [ ] `/privacy` page written, demo-status stated honestly
- [ ] `/terms` page written, demo-status stated honestly
- [ ] Storage/localStorage disclosure present (auth cookie + cart)
- [ ] Image sources/licenses logged; no scraped assets
- [ ] No real-business or commercial-commitment claims anywhere
- [ ] Accessibility statement matches actual verification (do not claim AA untested)
- [ ] Local-law review: flagged as **not performed** — assignment scope; recommended before any real commercial use

**Applicable local law:** not yet assessed — the correct honest status for a demo. Escalate before real commercial deployment.
