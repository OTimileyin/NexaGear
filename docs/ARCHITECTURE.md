# NexaGear — Architecture

**D41 mobile checkout amendment (2026-10-05):** The phone uses a native delivery form and a secure Paystack browser session, then checks payment through authenticated Next.js API routes. Those routes reuse the website's `placeOrder`/`startPayment` actions and shared `lib/payment-verification.ts`. Supabase RPC computes the order total; RLS scopes reads and writes to the Clerk caller. Local LAN builds infer the backend host from Metro on port 3000; cloud builds need `EXPO_PUBLIC_API_URL` pointing at the updated deployment. An old Vercel deployment cannot supply these newly implemented endpoints.

**Status:** Planned (pre-build) · Derived from `docs/PRD.md` §10–§19, §22–§24.

## 1. System components

```text
Browser
   │  Storefront UI · Cart state (context + localStorage) · Google auth session
   ▼
Next.js application (App Router, TypeScript)
   │  Server actions / route handlers
   │  ├── trusted price calculation (server-side only)
   │  ├── order creation (authenticated, validated, duplicate-guarded)
   │  ├── Mailgun confirmation (fire-after-persist, failure-isolated)
   │  └── auth validation (Supabase session on every privileged call)
   ├──────────────► Supabase
   │                 ├── PostgreSQL (products, profiles, orders, order_items)
   │                 ├── Auth (Google OAuth via Google Cloud Console credentials)
   │                 └── Row Level Security
   └──────────────► Mailgun  (order-confirmation email, API key server-only)
```

**Ownership boundaries**

| Owner | Owns | Never touches |
|---|---|---|
| Browser | UI, local cart, own session | Mailgun key, service-role key, price authority |
| Next.js server | order creation, pricing, email sending, privileged DB calls | — |
| Supabase | persisted data, sessions, RLS enforcement | — |
| Mailgun | outbound confirmation email | order lifecycle |

## 2. Data flow — the order path (PRD §13/§14)

```text
User presses "Place order"
  → client guards: button disabled (in-flight), form validated
  → server action: validate Supabase session (must be authenticated)
  → server action: validate checkout form fields
  → server sends product IDs + quantities ONLY (never prices/totals)
  → server fetches trusted product records from Postgres (atomic RPC)
  → server computes unit prices + line totals + subtotal
  → create order + order_items in one transaction (with duplicate guard)
  → commit — order is now durable
  → attempt Mailgun confirmation (best-effort; failure is logged, never rolls back)
  → redirect to /order/success showing the real persisted order
```

## 3. Data model (PRD §10)

### `products`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| slug | text unique | URL key |
| description | text | |
| category | text | Developer Setup, Audio, Connectivity, Power, Electronics, Robotics, Prototyping |
| price | numeric(10,2) | trusted price authority |
| image_url | text | licensed/original assets only |
| inventory_status | text | e.g. `in_stock`, `low_stock`, `out_of_stock` |
| featured | boolean | homepage merchandising |
| created_at / updated_at | timestamptz | |

**Ownership:** catalogue data — read publicly, writable only by service role (no admin UI in MVP).
**Lifecycle:** created at seed; updated (price/name) never mutates historical orders because order items snapshot values.

### `profiles`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | = `auth.users.id` |
| user_id | uuid FK→auth.users | |
| display_name | text | from Google |
| email | text | primary identity reference |
| avatar_url | text | |
| created_at / updated_at | timestamptz | |

**Sensitive fields:** email, avatar. **Lifecycle:** created on first sign-in (trigger on auth.users).

### `orders`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK→auth.users | ownership key for RLS |
| client_ref | uuid | client-generated idempotency key, UNIQUE per user |
| status | text | `pending` \| `confirmed` (PRD §11 — no payment states) |
| subtotal | numeric(10,2) | computed server-side only |
| customer_name / customer_email / phone / shipping_address | text | checkout contact data |
| created_at / updated_at | timestamptz | |

**Sensitive fields:** name, email, phone, address (personal data — PII).
**Retention:** kept for the demo's lifetime; no automated deletion. **Audit:** `created_at` + status changes via `updated_at`.

### `order_items`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK→orders, cascade delete | |
| product_id | uuid FK→products (nullable-on-delete) | reference back to catalogue |
| product_name_snapshot | text | historical meaning preserved (PRD §10) |
| unit_price_snapshot | numeric(10,2) | historical meaning preserved |
| quantity | int > 0 | |
| line_total | numeric(10,2) | snapshot × quantity, computed server-side |

**Relationships:** 1 order → N items; N items → N products (by reference) + frozen snapshots.

## 4. Trust boundaries (PRD §22)

| Crossing | What may cross | What must never cross |
|---|---|---|
| browser → server | product IDs, quantities, checkout contact fields, session cookie | prices, totals, forged identity |
| server → Supabase | service-role key (privileged ops); anon+session (user ops) | leaking either to client |
| app → Mailgun | API key + message payload server-side | key in any client bundle |
| public → authenticated | browsing, cart | order creation, order reads |
| authenticated → own data | own orders/profile via RLS | other users' rows |

## 5. Privileged operations

| Operation | Requires | Defense |
|---|---|---|
| Create order | authenticated session | server action only; RLS `user_id = auth.uid()`; atomic RPC |
| Read order(s) | authenticated, owner | RLS select policy |
| Send confirmation email | successful order insert | server-only module; failure isolated |
| Insert/update products | service role | no public path; migrations only |
| Service-role queries | server runtime | `server-only` import guard |

## 6. System invariants (PRD §23 — enforced & tested)

| # | Invariant | Enforced where | How tested | Impact if violated |
|---|---|---|---|---|
| 1 | Mailgun key never in frontend | no `NEXT_PUBLIC_` name; `server-only` module | bundle grep of `.next` output | key compromise, email abuse |
| 2 | Service-role key never in frontend | `server-only` admin client | bundle grep of `.next` output | full DB compromise |
| 3 | Users access only their own orders | RLS: `user_id = auth.uid()` on orders/order_items | SQL test with second user | PII exposure |
| 4 | Final prices from trusted DB records | `create_order` RPC recomputes from `products` | Vitest RPC/pricing tests + tampered-payload test | fraud / corrupt revenue |
| 5 | Failed email never erases an order | order committed before Mailgun call; send in try/catch | simulated Mailgun failure | lost orders |
| 6 | No accidental duplicate orders | disabled button + in-flight guard + `UNIQUE(user_id, client_ref)` | double-click test + duplicate-request test | duplicate fulfillment/records |
| 7 | Order items keep name/price snapshots | items written from server-fetched product rows | price-change-after-order test | corrupted order history |
| 8 | Auth validated before order creation | session read in server action; RPC checks `auth.uid()` | unauthenticated request rejected | spoofed orders |
| 9 | No fake payment success state | no payment UI/states exist anywhere | scope review in security pass | deceptive UX |

## 7. Failure-mode catalogue (PRD §24)

| Failure | Detection | User experience | Data impact | Recovery |
|---|---|---|---|---|
| Google sign-in fails | OAuth/callback error | clear auth error + retry; cart intact | none | retry sign-in |
| Supabase unavailable | query error/timeout | retryable error; checkout never faked | none | retry |
| Product removed | RPC finds missing product | "cart needs review" message; order blocked | none | remove item |
| Price changed before checkout | client display ≠ DB price | trusted DB price used; user told before final confirm | none | user re-confirms |
| Duplicate click | in-flight guard + unique `client_ref` | "Placing order…" disabled state | exactly one order | safe |
| Mailgun unavailable | send throws | success page stands (order received); email failure logged | order saved, email unsent | later resend / log |
| Invalid checkout form | client + server validation | inline errors; submit blocked | none | fix fields |
| Network drop mid-submit | request error/timeout | safe error + retry; dedup prevents doubles | at most one order | retry with same `client_ref` |

## 8. Architecture decisions

Recorded with options/trade-offs in `docs/DECISION_LOG.md`. Summary: Next.js+TS single deployable · Supabase replaces DB+auth+session · Mailgun over plain REST (no SDK) · atomic `create_order` RPC so pricing + insert + dedup happen in one transaction · free delivery stated, no shipping-rate logic (PRD §12).

## 9. Deferred decisions

- Real shipping-rate calculation
- Payment provider integration (out of scope — PRD §32)
- Order history / `/account` (deferred per user decision)
- Email template design beyond a simple confirmation body
- CI pipeline beyond local scripts (revisit if the project continues past the assignment)

## 10. Migration considerations

- SQL migrations live in `supabase/migrations/` and are applied to Supabase (CLI or SQL editor). Never edit an applied migration — add a new one.
- Schema changes are additive where possible; `order_items` snapshots insulate history from catalogue migrations.
- Seed data is idempotent (`ON CONFLICT (slug) DO UPDATE`) so re-running does not duplicate products.
