-- NexaGear — 0009: tagged sample orders (demo data)
--
-- A reviewer opening this site sees a catalogue but an empty-looking order
-- history and an admin dashboard with three orders, all identical in shape.
-- Sample rows fix that, on three conditions the owner chose explicitly:
--
--   1. Tagged, never mixed. `is_sample` marks the row; the admin dashboard
--      excludes it from revenue and order-value maths and badges it, so a
--      demo order can never be mistaken for money taken.
--   2. Removable in one statement. `delete from public.orders where is_sample;`
--      cascades to order_items via the existing FK, and touches nothing else.
--   3. Obvious, not subtle. Sample customers use `@example.invalid` addresses
--      and an address line that says it is demo data. No real person, address
--      or payment reference is ever copied into a sample row.
--
-- RLS: sample rows are readable by ANY signed-in visitor, which is what makes
-- the tracking page demonstrable without placing an order. That is safe
-- precisely because the flag is DBA-controlled — `is_sample` and `sample_ref`
-- have no INSERT/UPDATE policy and no column grant for any app role, so no
-- user can ever turn a real order into a public sample one. Only someone
-- running SQL against the database can.
--
-- Anonymous visitors still see nothing: the policies are `to authenticated`.
--
-- See docs/DECISION_LOG.md D25.

begin;

alter table public.orders
  add column if not exists is_sample boolean not null default false,
  add column if not exists sample_ref text;

-- Human-quotable reference so a reviewer can try tracking without an order id.
create unique index if not exists orders_sample_ref_key
  on public.orders (sample_ref)
  where sample_ref is not null;

create policy "sample orders are readable by any signed-in visitor"
  on public.orders for select to authenticated
  using (is_sample);

create policy "sample order items are readable by any signed-in visitor"
  on public.order_items for select to authenticated
  using (exists (
    select 1 from public.orders o
     where o.id = order_id and o.is_sample
  ));

-- Restated for clarity: the app writes these four columns and nothing else.
-- is_sample and sample_ref are not among them, by design.
revoke update on public.orders from authenticated;
grant update (subtotal, payment_status, payment_reference, paid_at)
  on public.orders to authenticated;

commit;