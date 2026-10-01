# NexaGear — Testing

**Principle:** a phase closes only on observable evidence (`[x] verified` in `IMPLEMENTATION_PLAN.md`). Unexercised provider flows are `IMPLEMENTED / UNVERIFIED` or `BLOCKED` — never "verified."

## 1. Unit testing (Vitest)

Scope — pure logic, no network:

- **Pricing:** line totals, subtotal, quantity bounds; tampered client prices must be ignored by the server-side computation path.
- **Cart math:** add/increment/decrement/remove; subtotal from unit price × quantity; persistence round-trip (localStorage save/load).
- **Validation:** checkout field rules (required, length caps, email from session).
- **Duplicate guard logic:** same `client_ref` twice ⇒ one order (RPC-level behavior tested against schema constraints or mocked DB).

Run: `npm test`.

## 2. Component/integration testing (Vitest + Testing Library)

- Product card renders name/price/annotation strip; link target correct.
- Quantity control: disabled bounds, accessible labels.
- Checkout form: inline errors appear/resolve; submit disabled while busy.
- Empty states render their next-action copy.

## 3. End-to-end testing (Playwright — critical journey only)

One spec: `shop → product → add to cart → (mocked/exchange-supplied auth session) → checkout submit → success`.

- Runs against the dev server with a configured Supabase env (or staging project).
- **Auth in CI:** session injected via Supabase test helper or a seeded test user — live Google OAuth is verified manually (OAuth cannot be automated reliably without third-party credentials).
- Requires: `NEXT_PUBLIC_SUPABASE_URL`, anon key, and a seeded DB. If env is absent: spec exists but is marked `BLOCKED` and not claimed as passing.

## 4. Authentication testing (manual + assisted)

- [ ] Google sign-in completes with real credentials (Google Cloud Console config correct)
- [ ] Callback returns to the intended checkout with session established
- [ ] Session persists across reload/new tab
- [ ] Sign-out clears access to order-protected pages
- [ ] Unauthenticated `/checkout` prompts sign-in, then resumes the flow; cart intact
- [ ] Cart survives a failed sign-in attempt

## 5. Checkout & order testing

- [ ] Form validation blocks incomplete input with useful errors
- [ ] Successful order produces `orders` + `order_items` rows
- [ ] Totals equal DB price × quantity (spot-check in SQL)
- [ ] Tampered price/total sent by client is ignored (devtools edit → DB truth wins)
- [ ] Double-click "Place order" ⇒ exactly one order
- [ ] Two rapid submits with same `client_ref` ⇒ one order (UNIQUE constraint)
- [ ] Unauthenticated create-order request ⇒ rejected
- [ ] Another user's order id ⇒ not readable (RLS cross-user check)

## 6. Email testing

- [ ] Confirmation received after real order: reference, date, items, quantities, total
- [ ] Mailgun key absent/wrong ⇒ order still saved, success page still shown, failure logged (simulate by breaking `MAILGUN_API_KEY` locally)
- [ ] Email address = authenticated Google email

## 7. Accessibility testing

- [ ] Keyboard-only: browse → cart → checkout → place order (no traps; visible focus everywhere)
- [ ] Labels + `aria-describedby` errors on all fields
- [ ] Contrast ≥4.5:1 text (spot-check palette pairs)
- [ ] Reduced-motion honored (callouts/row collapse become instant)
- [ ] axe run (browser extension or `@axe-core/playwright`) with zero serious/critical issues on home, product, cart, checkout

## 8. Mobile testing

- [ ] 360px viewport: home/shop/product/cart/checkout all usable, no horizontal scroll
- [ ] Touch targets ≥44px for quantity controls and CTAs
- [ ] Checkout single-column, total and CTA visible without hunting

## 9. Failure-mode tests (map to ARCHITECTURE §7)

- [ ] Supabase unreachable (bad URL) ⇒ retryable error, no fake success
- [ ] Product deleted after being carted ⇒ "cart needs review" path blocks the order
- [ ] Price changed after display ⇒ trusted price used, user informed before final confirmation
- [ ] Mailgun down ⇒ order persists (see §6)
- [ ] Network drop mid-submit ⇒ safe error; retry does not duplicate

## 10. Production smoke test (after deploy)

- [ ] `npm run build` passes locally and on Vercel
- [ ] Console clean on home/shop/product/cart/checkout
- [ ] Direct route loads (refresh on deep links works)
- [ ] Live Google sign-in on the deployed URL (origin allow-listed in Supabase)
- [ ] Full journey once on the live URL: order row in Supabase + email received
- [ ] Mobile check on the live URL
- [ ] No secrets in bundle (grep build output)
