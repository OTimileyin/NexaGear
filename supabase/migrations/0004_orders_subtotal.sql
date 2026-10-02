-- NexaGear — 0004: let the owner finalise their own order subtotal
--
-- Bug found by the first real end-to-end order (2026-10-02). create_order is
-- SECURITY INVOKER (so RLS applies to it) and ends with:
--
--   update public.orders set subtotal = v_subtotal where id = v_order_id;
--
-- but 0003 created only SELECT and INSERT policies on orders. With RLS enabled
-- and no UPDATE policy, Postgres silently filters the row out of the UPDATE:
-- the statement matches zero rows and raises NO error. Every order therefore
-- stored subtotal = 0.00 while its order_items summed to the real total —
-- observed live: order d14dc4df-… with items 180.00 + 84.00 but
-- orders.subtotal = 0.00, and the success page rendered "Total $0.00".
--
-- Fix:
--   1. owner-scoped UPDATE policy on orders, using the same
--      `auth.jwt() ->> 'sub'` = user_id check as the other policies;
--   2. narrow the authenticated role's UPDATE from the whole table down to the
--      single column the function writes. The public anon key is in the browser
--      bundle, so without this a signed-in visitor could PATCH their own order
--      row (status, totals, shipping address) directly against the Data API.
--
-- Rollback: drop the policy and restore the table-level grant.
-- See docs/DECISION_LOG.md D20.

begin;

create policy "orders are updatable by owner"
  on public.orders for update to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id)
  with check ((select auth.jwt() ->> 'sub') = user_id);

revoke update on public.orders from authenticated;
grant update (subtotal) on public.orders to authenticated;

commit;