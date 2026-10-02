-- NexaGear — 0003 Clerk identity migration
--
-- Authentication moved from Supabase Auth (GoTrue) to Clerk (DECISION_LOG D18).
-- Clerk user IDs are text ("user_2abc…"), NOT UUIDs, so:
--   * profiles.user_id / orders.user_id become text and no longer reference auth.users
--   * RLS + create_order use `auth.jwt()->>'sub'` instead of `auth.uid()`
--     (auth.uid() casts sub ::uuid and would raise for a Clerk ID)
--
-- Applied with zero rows in auth.users/profiles/orders/order_items, so no
-- identity data is transformed. Trusted pricing, idempotency, snapshots, and
-- cross-user isolation are preserved.
--
-- NOTE: RLS policies that reference user_id must be dropped before the column
-- type can change (Postgres rejects altering a column used in a policy).
--
-- Rollback: safe to reverse while there are no orders. See docs/DECISION_LOG.md D18.

begin;

-- ---------- 1. remove the Supabase-Auth profile trigger ----------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- ---------- 2. drop the policies that depend on user_id ----------
drop policy if exists "profiles are readable by owner" on public.profiles;
drop policy if exists "profiles are insertable by owner" on public.profiles;
drop policy if exists "profiles are updatable by owner" on public.profiles;
drop policy if exists "orders are readable by owner" on public.orders;
drop policy if exists "orders are insertable by owner" on public.orders;
drop policy if exists "order items are readable through owned orders" on public.order_items;
drop policy if exists "order items are insertable through owned orders" on public.order_items;

-- ---------- 3. profiles.user_id: uuid -> text, drop auth.users FK ----------
alter table public.profiles drop constraint if exists profiles_user_id_fkey;
alter table public.profiles
  alter column user_id type text using user_id::text;
-- profiles_user_id_key (unique) is rebuilt automatically by the type change.

-- ---------- 4. orders.user_id: uuid -> text, drop auth.users FK ----------
alter table public.orders drop constraint if exists orders_user_id_fkey;
alter table public.orders
  alter column user_id type text using user_id::text;
-- orders_user_id_client_ref_key (unique) is rebuilt automatically;
-- idempotency (one checkout interaction => one order) is preserved.

-- ---------- 5. recreate RLS policies on auth.jwt()->>'sub' ----------

-- profiles — owner only
create policy "profiles are readable by owner"
  on public.profiles for select to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);

create policy "profiles are insertable by owner"
  on public.profiles for insert to authenticated
  with check ((select auth.jwt() ->> 'sub') = user_id);

create policy "profiles are updatable by owner"
  on public.profiles for update to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id)
  with check ((select auth.jwt() ->> 'sub') = user_id);

-- orders — owner only
create policy "orders are readable by owner"
  on public.orders for select to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);

create policy "orders are insertable by owner"
  on public.orders for insert to authenticated
  with check ((select auth.jwt() ->> 'sub') = user_id);

-- order_items — reachable only through an owned order
create policy "order items are readable through owned orders"
  on public.order_items for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = (select auth.jwt() ->> 'sub')
  ));

create policy "order items are insertable through owned orders"
  on public.order_items for insert to authenticated
  with check (exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = (select auth.jwt() ->> 'sub')
  ));

-- ---------- 6. create_order: Clerk text identity, trusted pricing intact ----------
-- SECURITY INVOKER: runs as the caller, so RLS applies.
-- Prices/totals are read from public.products here — never from client input.
create or replace function public.create_order(
  p_client_ref       uuid,
  p_customer_name    text,
  p_phone            text,
  p_shipping_address text,
  p_items            jsonb  -- [{"product_id": "<uuid>", "quantity": 3}, ...]
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id    text := (auth.jwt() ->> 'sub');
  v_order_id   uuid;
  v_email      text;
  v_subtotal   numeric(10,2) := 0;
  v_qty        int;
  v_product    public.products%rowtype;
  v_item       jsonb;
begin
  if v_user_id is null or v_user_id = '' then
    raise exception 'not_authenticated';
  end if;

  if p_client_ref is null then
    raise exception 'missing_client_ref';
  end if;

  if p_customer_name is null or char_length(trim(p_customer_name)) < 1 or char_length(p_customer_name) > 120 then
    raise exception 'invalid_name';
  end if;
  if p_phone is null or char_length(trim(p_phone)) < 1 or char_length(p_phone) > 32 then
    raise exception 'invalid_phone';
  end if;
  if p_shipping_address is null or char_length(trim(p_shipping_address)) < 1 or char_length(p_shipping_address) > 400 then
    raise exception 'invalid_address';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) < 1
     or jsonb_array_length(p_items) > 50 then
    raise exception 'invalid_items';
  end if;

  -- email comes from the authenticated account's synced profile, not the client
  select email into v_email from public.profiles where user_id = v_user_id;
  if v_email is null or v_email = '' then
    raise exception 'profile_missing';
  end if;

  -- idempotent create: duplicate submission returns the existing order untouched
  insert into public.orders
    (user_id, client_ref, status, subtotal, customer_name, customer_email, phone, shipping_address)
  values
    (v_user_id, p_client_ref, 'pending', 0,
     trim(p_customer_name), v_email, trim(p_phone), trim(p_shipping_address))
  on conflict (user_id, client_ref) do nothing
  returning id into v_order_id;

  if v_order_id is null then
    select id into v_order_id
      from public.orders
     where user_id = v_user_id and client_ref = p_client_ref;
    return v_order_id; -- duplicate: same order, no new items written
  end if;

  -- trusted pricing: fetch each product from the database and compute here
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := null;
    begin
      v_qty := (v_item ->> 'quantity')::int;
    exception when others then
      raise exception 'invalid_quantity';
    end;

    if v_qty is null or v_qty < 1 or v_qty > 99 then
      raise exception 'invalid_quantity';
    end if;

    select * into v_product
      from public.products
     where id = (v_item ->> 'product_id')::uuid;

    if not found then
      raise exception 'product_not_found';
    end if;

    if v_product.inventory_status = 'out_of_stock' then
      raise exception 'product_unavailable';
    end if;

    insert into public.order_items
      (order_id, product_id, product_name_snapshot, unit_price_snapshot, quantity, line_total)
    values
      (v_order_id, v_product.id, v_product.name, v_product.price,
       v_qty, round(v_product.price * v_qty, 2));

    v_subtotal := v_subtotal + round(v_product.price * v_qty, 2);
  end loop;

  update public.orders
     set subtotal = v_subtotal
   where id = v_order_id;

  return v_order_id;
end;
$$;

revoke all on function public.create_order(uuid, text, text, text, jsonb) from public;
revoke all on function public.create_order(uuid, text, text, text, jsonb) from anon;
grant execute on function public.create_order(uuid, text, text, text, jsonb) to authenticated;

commit;
