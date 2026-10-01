-- NexaGear — 0001 schema
-- Tables, RLS, triggers, and the trusted-priced create_order RPC.
-- Apply via Supabase SQL editor or CLI. Never edit after applying — add a new migration.

-- ---------- extensions ----------
create extension if not exists "pgcrypto";

-- ---------- helpers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- products ----------
create table public.products (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) between 1 and 160),
  slug            text not null unique,
  sku             text not null unique check (sku ~ '^NG-[0-9]{3}$'),
  description     text not null default '',
  category        text not null,
  price           numeric(10,2) not null check (price >= 0),
  image_url       text,
  inventory_status text not null default 'in_stock'
                   check (inventory_status in ('in_stock', 'low_stock', 'out_of_stock')),
  featured        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------- profiles ----------
create table public.profiles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique references auth.users (id) on delete cascade,
  display_name text,
  email        text not null,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- auto-create profile on Google sign-in
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name',
             new.raw_user_meta_data ->> 'name',
             split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        email        = excluded.email,
        avatar_url   = excluded.avatar_url;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- orders ----------
create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  client_ref       uuid not null,
  status           text not null default 'pending'
                   check (status in ('pending', 'confirmed')),
  subtotal         numeric(10,2) not null default 0 check (subtotal >= 0),
  customer_name    text not null check (char_length(customer_name) between 1 and 120),
  customer_email   text not null,
  phone            text not null check (char_length(phone) between 1 and 32),
  shipping_address text not null check (char_length(shipping_address) between 1 and 400),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- idempotency: one checkout interaction can never create two orders
  unique (user_id, client_ref)
);

create index orders_user_id_idx on public.orders (user_id, created_at desc);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ---------- order_items ----------
create table public.order_items (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null references public.orders (id) on delete cascade,
  product_id           uuid references public.products (id) on delete set null,
  product_name_snapshot text not null,
  unit_price_snapshot  numeric(10,2) not null check (unit_price_snapshot >= 0),
  quantity             int not null check (quantity between 1 and 99),
  line_total           numeric(10,2) not null check (line_total >= 0),
  created_at           timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items (order_id);

-- ---------- row level security ----------
alter table public.products    enable row level security;
alter table public.profiles    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- products: world-readable catalogue; writes happen only via service role/migrations
create policy "products are publicly readable"
  on public.products for select
  using (true);

-- profiles: owner only
create policy "profiles are readable by owner"
  on public.profiles for select
  using (auth.uid() = user_id);
create policy "profiles are insertable by owner"
  on public.profiles for insert
  with check (auth.uid() = user_id);
create policy "profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- orders: owner only (insert is also gated by the RPC's auth.uid() check)
create policy "orders are readable by owner"
  on public.orders for select
  using (auth.uid() = user_id);
create policy "orders are insertable by owner"
  on public.orders for insert
  with check (auth.uid() = user_id);

-- order_items: readable/writable only through an owned order
create policy "order items are readable through owned orders"
  on public.order_items for select
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = auth.uid()
  ));
create policy "order items are insertable through owned orders"
  on public.order_items for insert
  with check (exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = auth.uid()
  ));

-- ---------- create_order: trusted pricing, atomic, idempotent ----------
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
  v_user_id    uuid := auth.uid();
  v_order_id   uuid;
  v_email      text;
  v_subtotal   numeric(10,2) := 0;
  v_qty        int;
  v_product    public.products%rowtype;
  v_item       jsonb;
begin
  if v_user_id is null then
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

  -- email comes from the authenticated account, not the client
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
