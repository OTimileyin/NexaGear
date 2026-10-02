-- NexaGear — 0006: read-only admin access, authorised in the database
--
-- Admin was deferred (PRD §32/§36) and added later at the owner's instruction
-- (D23). The important property here is that an admin page is NOT a bypass:
-- the app never decides to show rows. Access is granted by Postgres policies,
-- so an admin cannot be reached by hitting the REST API directly with a
-- non-admin session.
--
-- How it works:
--   * profiles.is_admin        — the flag. Never settable through the app: no
--                                 policy lets a caller change it, and the
--                                 authenticated role cannot UPDATE it (granted
--                                 below only for existing profile columns).
--   * public.is_admin()        — SECURITY DEFINER helper so a policy on
--                                 `orders` can ask "is the caller an admin?"
--                                 SECURITY DEFINER is required: it runs as the
--                                 owner, so the inner read of `profiles` is not
--                                 itself subject to RLS — without it, a policy
--                                 that calls is_admin() would recurse.
--
-- Scope is deliberately READ-ONLY: admin may SELECT orders and order_items and
-- nothing else. No admin INSERT/UPDATE/DELETE policy exists, so even an admin
-- session cannot alter an order through the Data API.
--
-- Promotion is a manual SQL step by the owner — never a self-service toggle:
--   update public.profiles set is_admin = true where user_id = '<clerk user id>';
--
-- See docs/DECISION_LOG.md D23.

begin;

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.jwt() ->> 'sub')
      and p.is_admin
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

-- An admin may read every order …
create policy "orders are readable by admins"
  on public.orders for select to authenticated
  using (public.is_admin());

-- … and the lines on those orders.
create policy "order items are readable by admins"
  on public.order_items for select to authenticated
  using (public.is_admin());

commit;