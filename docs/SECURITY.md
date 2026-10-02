# NexaGear — Security

**Risk level: Medium** (auth, personal data, server secrets, public deployment; no payments/crypto/admin) → trust boundaries defined here; `THREAT_MODEL.md` not required. Derived from PRD §8, §13, §15, §22–§23.

## 1. Authentication

- **Provider:** **Clerk** with Google OAuth (DECISION_LOG D18). Google credentials originate in Google Cloud Console; Supabase Auth (GoTrue) is no longer used.
- Sessions are managed by Clerk and refreshed by `clerkMiddleware()` in `proxy.ts` (the Next.js 16 middleware convention). No session data is stored in `localStorage`.
- There is **no app OAuth callback route** — Clerk completes the OAuth handshake and issues the session.
- Sign-out clears the Clerk session.
- Browsing never requires auth; `/checkout` (and order reads) do.
- Supabase requests carry the Clerk session token (Clerk⇄Supabase third-party auth); RLS reads `auth.jwt()->>'sub'`. **This trust path is currently `BLOCKED BY EXTERNAL PROVIDER: Supabase, Clerk` (DECISION_LOG D19): PostgREST rejects the token during key resolution with HTTP 401 `PGRST301 "No suitable key or wrong key type"`, before any claim or RLS evaluation. Cross-user isolation is therefore designed and SQL-reviewed but not yet live-verified.**

## 2. Authorization

| Resource | Anonymous | Authenticated owner | Other user |
|---|---|---|---|
| products | read | read | read |
| own profile | — | read/update (own rows) | **deny (RLS)** |
| create order | **deny** | create own rows only | — |
| read orders | **deny** | read **own** rows only | **deny (RLS)** |
| order_items | — | via owned order | **deny (RLS)** |
| Mailgun send | **deny** (server action post-persist only) | — | — |

RLS policies: `orders.user_id = auth.jwt()->>'sub'` (select/insert); `order_items` restricted through `order_id` ownership; `products` public read, no public write. **No application code uses the `service_role` key** — every request runs as the caller's `anon`/`authenticated` role, so RLS is always in force; a `service_role` bypass is also an explicit do-not-attempt guardrail while D19 is open. **`auth.uid()` is deliberately not used** — it casts the `sub` claim to `uuid`, and Clerk user IDs are text.

## 3. Validation

- **Checkout form:** required full name, phone, delivery address; email taken from the authenticated session (not client input); length caps (name ≤120, phone ≤32, address ≤400).
- **Order payload:** product IDs must be valid UUIDs; quantities integers 1–99; item count ≤50.
- **Server recomputation:** every price/total comes from `products` rows inside the `create_order` RPC — client-sent amounts are ignored entirely (PRD §13).

## 4. Secrets

| Secret | Where it lives | Never |
|---|---|---|
| `MAILGUN_API_KEY` | server env only | `NEXT_PUBLIC_*`, client code, git |
| `SUPABASE_SERVICE_ROLE_KEY` | server env only | same |
| `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` | browser-safe by design | treated as private |
| Google client secret | Supabase dashboard config | anywhere in app code |

- `.env.example` holds placeholders only; `.env*` (except `.env.example`) is git-ignored.
- Verification: grep the production bundle for each secret name/value (Phase 8 checklist).
- Rotation: if any key is ever committed, rotate it at the provider immediately — history rewrite does not un-leak a key.

## 5. API limits and abuse prevention

- No public API surface beyond same-origin server actions; server actions reject unauthenticated calls.
- Order creation is rate-bounded in practice by auth + form flow; add per-user throttle if abuse appears (documented, not built — demo scale).
- Mailgun sending is triggered once per completed order, server-side — clients cannot trigger arbitrary email.
- No webhooks, no third-party inbound endpoints → no webhook signature surface.

## 6. Session security

- Supabase SSR cookies: `HttpOnly`, `Secure`, `SameSite=Lax`.
- OAuth `redirect_to` is restricted to the configured site URL — no open redirects.
- Session validated in the order server action on every call (never trusted from the client).

## 7. Uploads

- **N/A** — users upload nothing. Product images are stored assets referenced by URL (licensed/original only, PRD §29).

## 8. Logging & sensitive data

- Log: order id, outcome, Mailgun success/failure — never full addresses/phones in client-visible logs.
- No analytics, trackers, or marketing storage (PRD §30).
- PII held: name, email, phone, address (checkout), Google profile data — only what the flow needs (PRD §30).

## 9. Invariants (security-relevant, see ARCHITECTURE §6 for full table)

1. Mailgun key never enters a client bundle. 2. Service-role key never enters a client bundle. 3. Users access only their own orders. 4. Prices come only from DB records. 5. Failed email never erases an order. 6. One interaction ≠ duplicate orders. 7. Snapshots preserve history. 8. Auth validated before order creation. 9. No fake payment state.

## 10. Trust boundaries (summary)

`browser → server` (IDs/quantities only) · `server → Supabase` (keyed) · `app → Mailgun` (keyed, server) · `public → authenticated` (checkout gate) · `user → own rows` (RLS). Full table: `ARCHITECTURE.md` §4.
