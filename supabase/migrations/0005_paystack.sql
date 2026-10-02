-- NexaGear — 0005: Paystack payment tracking on orders
--
-- The store previously took no payment (PRD §32/§36 deferred it). Paystack was
-- added afterwards on the owner's instruction, so orders now carry an explicit
-- payment state instead of implying every order is unpaid forever.
--
-- payment_status lifecycle:
--   'unpaid'          order created, no payment attempted (default; also every
--                     pre-0005 row)
--   'paid'            Paystack verified the transaction server-side
--   'failed'          Paystack reported a failed/abandoned transaction
--   'not_configured'  the store has no Paystack secret key configured
--
-- security_state is retained as the order lifecycle (pending → paid) so the
-- existing status column keeps its original meaning.
--
-- Column grants: 0004 narrowed `authenticated` to UPDATE(subtotal) only. The
-- payment verification step runs in a Next.js route handler using the Clerk
-- session and the RLS-scoped Supabase client — deliberately NOT service_role —
-- so it needs UPDATE on the payment columns as well. Still owner-scoped by the
-- "orders are updatable by owner" policy, and still no privileged bypass.
--
-- See docs/DECISION_LOG.md D22.

begin;

alter table public.orders
  add column if not exists payment_reference text,
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists paid_at timestamptz;

do $$
begin
  alter table public.orders
    add constraint orders_payment_status_check
    check (payment_status in ('unpaid', 'paid', 'failed', 'not_configured'));
exception
  when duplicate_object then null;
end
$$;

-- One Paystack transaction per order. Partial so unpaid rows (NULL) are free.
create unique index if not exists orders_payment_reference_key
  on public.orders (payment_reference)
  where payment_reference is not null;

revoke update on public.orders from authenticated;
grant update (subtotal, status, payment_status, payment_reference, paid_at)
  on public.orders to authenticated;

commit;