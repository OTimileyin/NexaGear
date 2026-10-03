-- NexaGear — 0010: structured cancellation reasons
--
-- 0008 made cancellation possible but did not say WHY. An admin could move an
-- order to `cancelled` and the only record was the status itself, which answers
-- "is it cancelled?" and never "why?". That is the vague-state failure the
-- design guidelines forbid, and it is unfixible after the fact.
--
-- This migration adds `cancellation_reason` as a CONTROLLED vocabulary rather
-- than free text, and enforces a biconditional in the database:
--
--     status = 'cancelled'  <=>  cancellation_reason is a known value
--
-- A cancellation with no reason is refused, and so is a reason on an order
-- that is not cancelled. Because `cancelled` is terminal (0008), that pairing
-- can never become inconsistent later.
--
-- Why a constrained list rather than free text:
--   * free text collects "customer changed mind", "cust. cancel", "n/a", "" —
--     values that cannot be grouped or reported on;
--   * there is deliberately NO `other` bucket. If a real case does not fit, the
--     fix is a migration that adds the value, which is reviewable. Vague data
--     cannot be un-vagged later.
--
-- The vocabulary is deliberately short and every value is one an operator can
-- act on. `suspected_fraud` exists because an order can be cancelled for a
-- reason that is not the customer's fault and must not be reported as such.
--
-- *** The function signature changes. ***
-- `set_order_status(uuid, text)` becomes
-- `set_order_status(uuid, text, text default null)`.
--
-- This is the one genuinely dangerous part of this migration. In Postgres,
-- `CREATE OR REPLACE FUNCTION` with a DIFFERENT argument list does not replace
-- anything — it silently creates a second OVERLOAD. Had the old two-argument
-- function simply been left in place, two write paths to `status` would exist,
-- the old one still granted to `authenticated`, still accepting a cancellation
-- with no reason and bypassing the biconditional entirely. So the old
-- overload is DROPPED explicitly below and the new signature is granted in its
-- place. Dropping a function does not drop its privileges — they are
-- re-issued against the new signature, and 0008's column grants are untouched.
--
-- `cancellation_reason` is NOT added to the authenticated column grant. The
-- customer cannot write it, exactly as they cannot write `status`.
--
-- Existing cancelled rows are backfilled from `payment_status`, which is a fact
-- already recorded rather than a new guess: a cancelled order whose payment
-- failed is `payment_failed`, anything else predates this column and is recorded
-- as `customer_request`. That default is a migration convenience, not observed
-- truth, and is called out in the decision log.
--
-- See docs/DECISION_LOG.md D28.

begin;

-- ---------- 1. the column ----------
alter table public.orders
  add column if not exists cancellation_reason text;

-- ---------- 2. backfill before the constraint can be added ----------
-- A CHECK is validated against existing rows, so this must run first.
update public.orders
   set cancellation_reason = case
         when payment_status = 'failed' then 'payment_failed'
         else 'customer_request'
       end
 where status = 'cancelled'
   and cancellation_reason is null;

-- ---------- 3. the biconditional ----------
-- The explicit `cancellation_reason is not null` is LOAD-BEARING, not
-- decoration. Without it the first branch evaluates as
--     (TRUE AND NULL) OR (FALSE AND TRUE)  =  NULL
-- and a CHECK constraint accepts a row whose expression is NULL — it only
-- rejects FALSE. So `status='cancelled'` with a NULL reason would sail
-- straight through this constraint. This was not theoretical: the first run
-- of supabase/verify/0010 caught exactly that, by writing a cancellation
-- directly and watching it succeed. Adding the is-not-null test makes every
-- reachable outcome TRUE or FALSE and never NULL.
alter table public.orders drop constraint if exists orders_cancellation_reason_check;
alter table public.orders
  add constraint orders_cancellation_reason_check
  check (
        (status = 'cancelled'
         and cancellation_reason is not null
         and cancellation_reason in (
           'out_of_stock',
           'customer_request',
           'payment_failed',
           'address_unreachable',
           'suspected_fraud'
         ))
     or (status <> 'cancelled' and cancellation_reason is null)
  );

-- ---------- 4. remove the old write path BEFORE adding the new one ----------
-- Without this, CREATE OR REPLACE would leave a second overload holding a live
-- grant to `authenticated`. See the header.
drop function if exists public.set_order_status(uuid, text);

create or replace function public.set_order_status(
  p_order_id             uuid,
  p_status               text,
  p_cancellation_reason  text default null
)
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

  -- The reason is validated here rather than trusted from the caller, and the
  -- biconditional is enforced twice on purpose: this function gives a legible
  -- error, and the CHECK constraint is what actually holds if a future write
  -- path is ever added that forgets this check.
  if p_status = 'cancelled' then
    if p_cancellation_reason is null or btrim(p_cancellation_reason) = '' then
      raise exception 'cancellation_reason_required';
    end if;
    if p_cancellation_reason not in (
         'out_of_stock',
         'customer_request',
         'payment_failed',
         'address_unreachable',
         'suspected_fraud'
       ) then
      raise exception 'invalid_cancellation_reason';
    end if;
  elsif p_cancellation_reason is not null then
    raise exception 'cancellation_reason_not_allowed';
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
         cancellation_reason = p_cancellation_reason,
         status_changed_at = now()
   where id = p_order_id
   returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.set_order_status(uuid, text, text) from public;
revoke all on function public.set_order_status(uuid, text, text) from anon;
grant execute on function public.set_order_status(uuid, text, text) to authenticated;

-- `cancellation_reason` is deliberately absent from the column grant: the
-- customer must not write it, and the status column grants from 0008 stand.
revoke update on public.orders from authenticated;
grant update (subtotal, payment_status, payment_reference, paid_at)
  on public.orders to authenticated;

commit;