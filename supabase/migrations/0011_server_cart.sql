-- NexaGear — 0011: the cart becomes server state, so it can exist on two devices
--
-- Until now the cart lived only in the browser's localStorage (AGENTS.md §2:
-- "React context + localStorage, no state library"). That is a fine design for
-- one device and it is still the right design for a signed-OUT visitor. It
-- cannot satisfy the Lesson 3 requirement: an item added on the website must
-- appear in the mobile app's cart immediately, and two devices sharing one
-- localStorage is not a thing.
--
-- So the cart becomes server state keyed to the Clerk user, and localStorage
-- is demoted from "the cart" to "the cart of someone who has not signed in
-- yet". On sign-in the guest cart is merged into the account with
-- `merge_guest_cart` below. This SUPERSEDES the cart rule in AGENTS.md §2,
-- which is amended alongside this migration; see docs/DECISION_LOG.md D35.
--
-- Why this is not a rewrite of pricing: the cart is NOT an order. Nothing here
-- is trusted at checkout. `create_order` (0001) still re-reads every product
-- row and recomputes every line total in the database (PRD §13), so a cart row
-- is at most a suggestion about what the customer is looking at. That is why
-- writing cart rows directly through PostgREST — rather than through another
-- server-side function — is acceptable here and would not be for an order.
--
-- Access model, deliberate and narrow:
--   * `authenticated` only. There is no `anon` grant and no policy for it, so a
--     signed-out device cannot read or write a server cart at all. Guests keep
--     the local cart, and that is the whole reason the merge function exists.
--   * Every policy is `(auth.jwt() ->> 'sub') = user_id`, the same identity
--     rule orders already use (0003), so a crafted request cannot reach another
--     customer's cart even with a valid token.
--   * `user_id` is text, matching orders.user_id: it is Clerk's `sub`, and
--     there is no FK to `profiles` for the same reason orders has none — a
--     signed-in user is a legitimate cart owner before any profile row exists.
--
-- Realtime is enabled here rather than in a dashboard click, because the
-- requirement is "instantly appear" and an unnoticed dashboard setting is
-- exactly the kind of thing that works on the machine where it was switched on
-- and nowhere else. `replica identity full` is set so DELETE events carry the
-- row, which is what lets a removal on the website clear the item on the phone.
--
-- See docs/DECISION_LOG.md D35.

begin;

-- ---------- 1. the table ----------
create table public.cart_items (
  user_id     text not null,
  -- Cascade, not `set null`: an order line is history and must survive a
  -- deleted product (0001), but a cart line is intent and means nothing
  -- without one.
  product_id  uuid not null references public.products (id) on delete cascade,
  quantity    int  not null check (quantity between 1 and 99),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- One row per product per user, so "add" is an upsert and cannot create a
  -- duplicate line that the cart UI would then have to reconcile.
  primary key (user_id, product_id)
);

-- Postgres does not index a foreign key automatically, and the cascade above
-- has to find rows by product_id whenever a product is deleted.
create index cart_items_product_id_idx on public.cart_items (product_id);

create trigger cart_items_set_updated_at
  before update on public.cart_items
  for each row execute function public.set_updated_at();

-- ---------- 2. row level security ----------
alter table public.cart_items enable row level security;

create policy cart_items_select_own on public.cart_items
  for select to authenticated
  using ((auth.jwt() ->> 'sub') = user_id);

create policy cart_items_insert_own on public.cart_items
  for insert to authenticated
  with check ((auth.jwt() ->> 'sub') = user_id);

-- USING decides which rows may be updated; WITH CHECK decides what they may
-- become. Both are needed: without the second, a row could be updated to
-- someone else's user_id and handed away.
create policy cart_items_update_own on public.cart_items
  for update to authenticated
  using ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy cart_items_delete_own on public.cart_items
  for delete to authenticated
  using ((auth.jwt() ->> 'sub') = user_id);

-- ---------- 3. privileges ----------
-- Supabase grants a new table to anon/authenticated by default via ALTER
-- DEFAULT PRIVILEGES, so the anon revoke is load-bearing rather than tidiness:
-- without it a signed-out device could read and write cart rows and the
-- policies above would never be consulted for that role.
revoke all on public.cart_items from anon;
revoke all on public.cart_items from public;
grant select, insert, update, delete on public.cart_items to authenticated;

-- ---------- 4. realtime ----------
-- Realtime in the free tier is a single global publication. Adding the table
-- is what makes multi-device sync work at all; the assertion in
-- supabase/verify/0011_server_cart.sql fails if this is ever dropped.
alter table public.cart_items replica identity full;
alter publication supabase_realtime add table public.cart_items;

-- ---------- 5. guest-cart merge ----------
-- Called once, immediately after sign-in, with whatever was in localStorage.
-- Quantities are merged rather than replaced: the guest cart and the account
-- cart are both real intent, and silently discarding either is worse than
-- summing them. The result is capped at the same 99 the CHECK enforces.
--
-- SECURITY INVOKER (the default, stated explicitly): this runs with the
-- caller's rights, so every insert above is checked by the policies in §2.
-- It is NOT security definer on purpose — nothing here needs to escalate.
--
-- The function takes no user id. It derives identity from the token, so there
-- is nothing to forge: a caller cannot ask it to write into someone else's
-- cart, which is the failure mode that makes merge endpoints dangerous.
create or replace function public.merge_guest_cart(p_items jsonb)
returns setof public.cart_items
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user text := auth.jwt() ->> 'sub';
  v_item jsonb;
  v_pid  uuid;
  v_qty  int;
begin
  if v_user is null or btrim(v_user) = '' then
    raise exception 'not_authenticated';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'invalid_items';
  end if;

  -- A bound, because this is an unauthenticated-shaped payload from a browser
  -- that could have been edited. The real cart cap is enforced by MAX_ORDER_ITEMS
  -- at checkout (lib/checkout.ts), so anything absurd is refused early.
  if jsonb_array_length(p_items) > 100 then
    raise exception 'invalid_items';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    begin
      v_pid := (v_item ->> 'productId')::uuid;
      v_qty := (v_item ->> 'quantity')::int;
    exception when others then
      raise exception 'invalid_items';
    end;

    if v_qty is null or v_qty < 1 then
      raise exception 'invalid_items';
    end if;

    -- A stale product is SKIPPED, not fatal. A guest cart can outlive a
    -- catalogue change, and refusing the whole merge because one line no
    -- longer exists would lose the items that are still valid.
    if not exists (select 1 from public.products where id = v_pid) then
      continue;
    end if;

    insert into public.cart_items (user_id, product_id, quantity)
    values (v_user, v_pid, least(v_qty, 99))
    on conflict (user_id, product_id) do update
      set quantity = least(99, public.cart_items.quantity + excluded.quantity),
          updated_at = now();
  end loop;

  -- Returned so the caller can render the merged cart without a second
  -- round-trip; RLS still applies to what this select can see.
  return query
    select * from public.cart_items
     where user_id = v_user
     order by created_at;
end;
$$;

revoke all on function public.merge_guest_cart(jsonb) from public;
revoke all on function public.merge_guest_cart(jsonb) from anon;
grant execute on function public.merge_guest_cart(jsonb) to authenticated;

commit;
