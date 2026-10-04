-- NexaGear — verification for migration 0011 (server-backed cart)
--
-- Run it:
--   npx --no-install supabase db query --linked --file supabase/verify/0011_server_cart.sql
--
-- `--file` is the right way to run a file this size. Passing SQL as an
-- argument requires stripping comments and flattening newlines first (the CLI
-- truncates multi-line SQL at the first newline and parses a leading `--` as a
-- flag), and this script is long enough that the flattened form exceeds the
-- Windows command-line limit outright. Verified both ways round: a deliberately
-- failing script does report the error through --file, so silence from this one
-- means it passed rather than that it never ran.
--
-- The final select prints PASSED only if every assertion above held — an
-- exception aborts the batch, so the row is the positive evidence.
--
-- What it proves, in one self-cleaning block:
--   1. `anon` has NO table privilege and NO execute on the merge function —
--      a signed-out device cannot reach the server cart at all
--   2. a signed-in user can insert and read their own cart row
--   3. RLS HIDES another user's rows from them (a cross-customer leak would
--      look like a working app, which is why this is asserted directly)
--   4. RLS REFUSES an insert that claims someone else's user_id
--   5. RLS refuses to hand a row to another user (WITH CHECK), and silently
--      filters an update aimed at another user's row (USING)
--   6. the quantity bound is the database's, not the UI's (0 and 100 refused)
--   7. `merge_guest_cart` takes NO user id, so there is nothing to forge
--   8. the merge SUMS quantities instead of overwriting, and caps at 99
--   9. the merge SKIPS a stale product id rather than failing the whole merge
--  10. a signed-out caller is refused by privilege, not just by a null claim
--  11. `cart_items` is actually in the realtime publication — the setting that
--      makes "instantly appear" true and that nothing else would notice
--  12. nothing survives: every row this script creates is deleted, and the
--      final assertion fails the run if any remain
--
-- It only ever creates rows under reserved `user_local_verify_%` ids. It never
-- touches a real cart, order, profile or catalogue row (products are read, not
-- written).

do $do$
declare
  v_a        text := 'user_local_verify_cart_a';
  v_b        text := 'user_local_verify_cart_b';
  v_pid      uuid;
  v_stale    uuid := gen_random_uuid();
  v_qty      int;
  v_count    int;
  v_rows     int;
  v_args     text;
begin
  -- Owner context: clean up anything a previous failed run left behind.
  delete from public.cart_items where user_id in (v_a, v_b);

  -- ---------- 1. anon is locked out ----------
  if has_table_privilege('anon', 'public.cart_items', 'SELECT') then
    raise exception 'TEST FAILED: anon can SELECT the server cart';
  end if;
  if has_table_privilege('anon', 'public.cart_items', 'INSERT') then
    raise exception 'TEST FAILED: anon can INSERT into the server cart';
  end if;
  if has_function_privilege('anon', 'public.merge_guest_cart(jsonb)', 'EXECUTE') then
    raise exception 'TEST FAILED: anon can execute merge_guest_cart';
  end if;

  -- ---------- 7. the merge cannot be told who to write for ----------
  select pg_get_function_identity_arguments(p.oid) into v_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'merge_guest_cart';
  if v_args is distinct from 'p_items jsonb' then
    raise exception 'TEST FAILED: merge_guest_cart signature is %, expected p_items jsonb',
      coalesce(v_args, 'missing');
  end if;

  -- ---------- 11. realtime is wired ----------
  select count(*) into v_count
    from pg_publication_tables
   where pubname = 'supabase_realtime'
     and schemaname = 'public'
     and tablename = 'cart_items';
  if v_count <> 1 then
    raise exception 'TEST FAILED: cart_items is not in the realtime publication, so sync would silently never fire';
  end if;

  -- A real product to put in a cart. Read-only: the catalogue is never mutated.
  select id into v_pid from public.products order by sku limit 1;
  if v_pid is null then
    raise exception 'TEST FAILED: the catalogue is empty, so the cart cannot be verified';
  end if;

  -- ---------- setup as owner (RLS bypassed) ----------
  insert into public.cart_items (user_id, product_id, quantity)
  values (v_a, v_pid, 5),
         (v_b, v_pid, 9);

  -- ---------- act as user A ----------
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_a, 'role', 'authenticated')::text,
                     true);

  -- ---------- 2. reading your own cart works ----------
  select quantity into v_qty
    from public.cart_items
   where user_id = v_a and product_id = v_pid;
  if v_qty is distinct from 5 then
    raise exception 'TEST FAILED: owner could not read their own cart row (got %)',
      coalesce(v_qty::text, 'NULL');
  end if;

  -- ---------- 3. another customer's cart is invisible ----------
  select count(*) into v_count from public.cart_items where user_id = v_b;
  if v_count <> 0 then
    raise exception 'TEST FAILED: RLS leaked % row(s) belonging to another user', v_count;
  end if;

  -- ...and the total row count the user can see is only their own
  select count(*) into v_count from public.cart_items;
  if v_count <> 1 then
    raise exception 'TEST FAILED: expected exactly 1 visible cart row, saw %', v_count;
  end if;

  -- ---------- 4. writing for someone else is refused ----------
  begin
    insert into public.cart_items (user_id, product_id, quantity)
    values (v_b, v_pid, 1);
    raise exception 'TEST FAILED: inserted a cart row for another user';
  exception when others then
    if sqlerrm not like '%row-level security%' then raise; end if;
  end;

  begin
    update public.cart_items set user_id = v_b where user_id = v_a;
    raise exception 'TEST FAILED: handed a cart row to another user';
  exception when others then
    if sqlerrm not like '%row-level security%' then raise; end if;
  end;

  -- ---------- 5. USING filters, so a targeted update is a no-op ----------
  update public.cart_items set quantity = 42 where user_id = v_b;
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then
    raise exception 'TEST FAILED: updated % row(s) owned by another user', v_rows;
  end if;

  -- ---------- 6. the bound lives in the database ----------
  begin
    insert into public.cart_items (user_id, product_id, quantity)
    values (v_a, v_stale, 100);
    raise exception 'TEST FAILED: quantity 100 was accepted';
  exception when check_violation then null;
  end;

  begin
    insert into public.cart_items (user_id, product_id, quantity)
    values (v_a, v_stale, 0);
    raise exception 'TEST FAILED: quantity 0 was accepted';
  exception when check_violation then null;
  end;

  -- ---------- 8. merge SUMS, and caps ----------
  perform public.merge_guest_cart(
    jsonb_build_array(jsonb_build_object('productId', v_pid, 'quantity', 3))
  );
  select quantity into v_qty
    from public.cart_items where user_id = v_a and product_id = v_pid;
  if v_qty is distinct from 8 then
    raise exception 'TEST FAILED: merge should sum 5 + 3 = 8, got %',
      coalesce(v_qty::text, 'NULL');
  end if;

  perform public.merge_guest_cart(
    jsonb_build_array(jsonb_build_object('productId', v_pid, 'quantity', 99))
  );
  select quantity into v_qty
    from public.cart_items where user_id = v_a and product_id = v_pid;
  if v_qty is distinct from 99 then
    raise exception 'TEST FAILED: merge should cap at 99, got %',
      coalesce(v_qty::text, 'NULL');
  end if;

  -- ---------- 9. a stale product is skipped, not fatal ----------
  perform public.merge_guest_cart(
    jsonb_build_array(
      jsonb_build_object('productId', v_stale, 'quantity', 2),
      jsonb_build_object('productId', v_pid, 'quantity', 1)
    )
  );
  select quantity into v_qty
    from public.cart_items where user_id = v_a and product_id = v_pid;
  -- The valid line in the same payload still applied (99 is the cap, so this
  -- asserts the call did not abort): the stale id was ignored.
  if v_qty is distinct from 99 then
    raise exception 'TEST FAILED: merge aborted on a stale product (quantity now %)',
      coalesce(v_qty::text, 'NULL');
  end if;

  begin
    perform public.merge_guest_cart('{"productId": 1}'::jsonb);
    raise exception 'TEST FAILED: a non-array payload was accepted';
  exception when others then
    if sqlerrm not like '%invalid_items%' then raise; end if;
  end;

  -- ---------- 10. signed-out callers are refused by privilege ----------
  execute 'reset role';
  execute 'set local role anon';
  begin
    perform public.merge_guest_cart('[]'::jsonb);
    raise exception 'TEST FAILED: anon executed merge_guest_cart';
  exception when insufficient_privilege then null;
  end;

  -- A null/empty subject is refused as well, which covers the case where a
  -- token exists but carries no identity.
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', '')::text, true);
  begin
    perform public.merge_guest_cart('[]'::jsonb);
    raise exception 'TEST FAILED: an empty subject was accepted';
  exception when others then
    if sqlerrm not like '%not_authenticated%' then raise; end if;
  end;

  -- ---------- 12. self-clean ----------
  perform set_config('request.jwt.claims', null, true);
  delete from public.cart_items where user_id in (v_a, v_b);

  select count(*) into v_count
    from public.cart_items
   where user_id like 'user_local_verify_%';
  if v_count <> 0 then
    raise exception 'TEST FAILED: verification rows left behind';
  end if;

end $do$;

-- Reached only if the block above completed: any failed assertion raises and
-- aborts the batch, so a returned row is the evidence.
select 'SERVER CART TESTS PASSED' as verification_result,
       'anon locked out, own cart readable, cross-user reads hidden and writes refused,'
       || ' quantity bound enforced, merge takes no user id, sums and caps at 99,'
       || ' skips stale products, realtime publication confirmed, rows cleaned' as what_was_proved,
       (select count(*) from public.cart_items
         where user_id like 'user_local_verify_%') as leftover_rows;
