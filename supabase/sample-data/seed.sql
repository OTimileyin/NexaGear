-- NexaGear — sample order seeder (re-runnable)
--
-- Run it:
--   npx supabase db query --linked "$(grep -v '^[[:space:]]*--' supabase/sample-data/seed.sql | tr '\n' ' ')"
--
-- Two CLI traps this avoids: the CLI truncates multi-line SQL at the first
-- newline, and it parses a leading `--` comment as a flag. Hence one DO block,
-- comments stripped, flattened.
--
-- Behaviour:
--   * Idempotent. Re-running DELETES every existing sample order first and
--     rebuilds them, so the demo data can be refreshed without accumulating
--     duplicates. Real orders are never touched — the delete is scoped to
--     `is_sample`.
--   * Prices come from the products table, never hard-coded, and each order's
--     subtotal is the sum of its own line_totals. The D21 invariant
--     (`subtotal = sum(order_items.line_total)`) therefore holds by
--     construction rather than by trust.
--   * Customers are fictional: `@example.invalid` addresses and an address
--     line that states it is demo data. RFC 2606 reserves `.invalid`, so none
--     of these can ever reach a real mailbox.
--   * Statuses are set directly rather than through `set_order_status`, because
--     this runs as the database owner seeding demo history, not as an admin
--     moving a live order. The CHECK constraint still applies.
--
-- Remove everything with: supabase/sample-data/remove.sql

do $do$
declare
  v_owner    text := 'sample_demo_store';
  v_order    uuid;
  v_subtotal numeric(10,2) := 0;
  v_slug     text;
  v_qty      int;
  v_pid      uuid;
  v_name     text;
  v_price    numeric(10,2);
  v_created  timestamptz;
  v_item     record;
  r          record;
  v_seeded   int := 0;
begin
  delete from public.orders where is_sample;

  for r in
    select * from (values
      ('NGX-1001', 'Ada Sample',      'ada.sample@example.invalid',      'delivered',  'paid',   9, array['compact-mechanical-keyboard:1','developer-precision-mouse:1']),
      ('NGX-1002', 'Babatunde Sample', 'babatunde.sample@example.invalid','shipped',    'paid',   6, array['gan-fast-charger:2','portable-power-bank:1']),
      ('NGX-1003', 'Chidi Sample',     'chidi.sample@example.invalid',    'processing', 'paid',   3, array['arduino-starter-kit:1','sensor-exploration-pack:2']),
      ('NGX-1004', 'Damilola Sample',  'damilola.sample@example.invalid', 'pending',    'unpaid', 1, array['usb-c-8-in-1-hub:1']),
      ('NGX-1005', 'Emeka Sample',     'emeka.sample@example.invalid',    'delivered',  'paid',  14, array['robot-chassis-motor-bundle:1','soldering-prototyping-kit:1']),
      ('NGX-1006', 'Folasade Sample',  'folasade.sample@example.invalid', 'cancelled',  'failed', 21, array['adjustable-laptop-stand:1','studio-monitoring-headphones:1'])
    ) as t(sample_ref, customer_name, customer_email, status, payment_status, days_ago, items)
  loop
    v_created := now() - make_interval(days => r.days_ago);

    insert into public.orders (
      user_id, client_ref, status, payment_status, subtotal,
      customer_name, customer_email, phone, shipping_address,
      created_at, status_changed_at, paid_at, is_sample, sample_ref
    )
    values (
      v_owner, gen_random_uuid(), 'pending', r.payment_status, 0,
      r.customer_name, r.customer_email, '0800 000 0000',
      'Sample address — demo data, not a real delivery',
      v_created, v_created,
      case when r.payment_status = 'paid' then v_created else null end,
      true, r.sample_ref
    )
    returning id into v_order;

    v_subtotal := 0;

    for v_item in select unnest(r.items) as spec loop
      v_slug := split_part(v_item.spec, ':', 1);
      v_qty  := split_part(v_item.spec, ':', 2)::int;

      select p.id, p.name, p.price
        into v_pid, v_name, v_price
        from public.products p
       where p.slug = v_slug;

      if not found then
        raise exception 'sample seed: unknown product slug %', v_slug;
      end if;

      insert into public.order_items (
        order_id, product_id, product_name_snapshot,
        unit_price_snapshot, quantity, line_total
      )
      values (
        v_order, v_pid, v_name, v_price, v_qty, round(v_price * v_qty, 2)
      );

      v_subtotal := v_subtotal + round(v_price * v_qty, 2);
    end loop;

    update public.orders
       set subtotal = v_subtotal,
           status = r.status,
           -- Migration 0010 requires a cancellation reason exactly when the
           -- status is 'cancelled', and forbids one otherwise, so the two are
           -- set together. NGX-1006's recorded payment_status is 'failed',
           -- which is why its reason is 'payment_failed'.
           cancellation_reason = case
             when r.status = 'cancelled' then 'payment_failed'
             else null
           end,
           -- Orders that moved did so after they were placed; a pending or
           -- cancelled order has not moved at all.
           status_changed_at = case
             when r.status in ('pending','cancelled') then v_created
             else v_created + make_interval(days => 1)
           end
     where id = v_order;

    v_seeded := v_seeded + 1;
  end loop;

  -- Fail loudly rather than leave a demo row that breaks the same invariant
  -- that shipped a real bug in D21.
  if exists (
    select 1
      from public.orders o
     where o.is_sample
       and o.subtotal is distinct from (
             select coalesce(sum(oi.line_total), 0)
               from public.order_items oi
              where oi.order_id = o.id
           )
  ) then
    raise exception 'sample seed: a seeded order has subtotal <> sum(line_total)';
  end if;

  raise notice 'Seeded % sample orders, all satisfying subtotal = sum(line_total)', v_seeded;
end $do$;