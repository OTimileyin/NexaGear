-- NexaGear — 0008: order fulfilment lifecycle, advanced by admins only
--
-- 0001 gave orders a `status` of ('pending','confirmed') that nothing ever
-- wrote, while 0005's Paystack callback writes `status = 'paid'` — a value
-- that CHECK rejects. That path had never run (no `sk_test_` key had been
-- configured), so the contradiction was latent rather than observed. Two
-- separate facts were being stored in one column.
--
-- This migration separates them:
--   * `payment_status` (0005) is the ONLY payment truth: unpaid / paid /
--     failed / not_configured. The callback no longer writes `status`.
--   * `status` becomes the fulfilment lifecycle:
--         pending -> processing -> shipped -> delivered
--         pending | processing -> cancelled
--     shipped, delivered and cancelled are terminal; there is no backwards
--     path and no way to skip a step.
--
-- Who may advance it: not the customer. 0005 granted the authenticated role
-- UPDATE on `status`, which combined with the owner-scoped UPDATE policy from
-- 0004 meant a signed-in buyer could PATCH their own order straight to
-- 'delivered'. `status` is removed from the column grant entirely, so the Data
-- API cannot reach it for any role. The only write path is
-- `set_order_status`, which re-checks `is_admin()` and the transition table
-- inside the database. RLS remains the authority — the admin page is a
-- convenience, not a gate.
--
-- `status_changed_at` records when the order last moved, so the customer-facing
-- tracking page can say when rather than only where.
--
-- See docs/DECISION_LOG.md D24.

begin;

-- ---------- 1. fulfilment vocabulary ----------
alter table public.orders
  add column if not exists status_changed_at timestamptz;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('pending', 'processing', 'shipped', 'delivered', 'cancelled'));

-- Existing rows are all pending (verified before applying), so backfilling the
-- move timestamp from created_at is exact, not an approximation.
update public.orders
   set status_changed_at = created_at
 where status_changed_at is null;

-- ---------- 2. the customer cannot write status ----------
-- 0004 revoked the table-level grant; 0005 re-granted five columns including
-- `status`. Re-grant the narrower set: subtotal is written by create_order,
-- the payment columns by the verification route, and nothing else.
revoke update on public.orders from authenticated;
grant update (subtotal, payment_status, payment_reference, paid_at)
  on public.orders to authenticated;

-- ---------- 3. the only write path for status ----------
create or replace function public.set_order_status(p_order_id uuid, p_status text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current text;
  v_row     public.orders;
begin
  -- auth.jwt() reads the request's claims, so this is still the CALLER's
  -- identity even though the function runs with the table owner's rights.
  if not public.is_admin() then
    raise exception 'not_authorised';
  end if;

  if p_status is null
     or p_status not in ('processing', 'shipped', 'delivered', 'cancelled') then
    raise exception 'invalid_status';
  end if;

  select status into v_current
    from public.orders
   where id = p_order_id
     for update;

  if v_current is null then
    raise exception 'order_not_found';
  end if;

  -- Transitions are forward-only and cannot skip a step.
  if not (
       (v_current = 'pending'    and p_status in ('processing', 'cancelled'))
    or (v_current = 'processing' and p_status in ('shipped', 'cancelled'))
    or (v_current = 'shipped'    and p_status = 'delivered')
  ) then
    raise exception 'invalid_transition';
  end if;

  update public.orders
     set status = p_status,
         status_changed_at = now()
   where id = p_order_id
   returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.set_order_status(uuid, text) from public;
revoke all on function public.set_order_status(uuid, text) from anon;
grant execute on function public.set_order_status(uuid, text) to authenticated;

commit;