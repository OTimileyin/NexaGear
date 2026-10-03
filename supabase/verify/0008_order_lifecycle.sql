-- NexaGear — verification for migration 0008 (order fulfilment lifecycle)
--
-- Run it:   npx supabase db query --linked "$(cat supabase/verify/0008_order_lifecycle.sql)"
--
-- NOTE: the CLI truncates multi-line SQL at the first newline, so pipe it
-- through `tr '\n' ' '` if the direct form above is rejected.
--
-- What it proves, in one self-cleaning transaction:
--   1. a non-admin caller is refused (not_authorised)
--   2. an admin cannot skip a step (pending -> delivered is invalid_transition)
--   3. an admin can walk the happy path (pending -> processing -> shipped -> delivered)
--   4. a delivered order is terminal
--   5. nothing survives: every row created here is deleted before the block
--      returns, and the final assertion fails the run if any remain.
--
-- It creates rows only with reserved `user_local_verify_%` ids and fake
-- `@example.invalid` addresses, and it deletes them. It never touches a real
-- order, a real profile, or real customer data.

do $do$
declare
  v_sub    text := 'user_local_verify_admin';
  v_other  text := 'user_local_verify_other';
  v_order  uuid;
  v_status text;
  v_count  int;
begin
  delete from public.order_items
   where order_id in (select id from public.orders where user_id in (v_sub, v_other));
  delete from public.orders where user_id in (v_sub, v_other);
  delete from public.profiles where user_id in (v_sub, v_other);

  insert into public.profiles (user_id, email, is_admin)
  values (v_sub, 'verify@example.invalid', true),
         (v_other, 'other@example.invalid', false);

  insert into public.orders
    (user_id, client_ref, status, subtotal, customer_name, customer_email, phone, shipping_address)
  values
    (v_sub, gen_random_uuid(), 'pending', 12.34, 'Local Verify', 'verify@example.invalid', '0000', 'Local')
  returning id into v_order;

  -- 1. a non-admin cannot advance anything
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_other, 'role', 'authenticated')::text, true);
  begin
    perform public.set_order_status(v_order, 'processing');
    raise exception 'TEST FAILED: a non-admin was allowed to advance an order';
  exception when others then
    if sqlerrm not like '%not_authorised%' then raise; end if;
  end;

  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_sub, 'role', 'authenticated')::text, true);

  -- 2. steps cannot be skipped
  begin
    perform public.set_order_status(v_order, 'delivered');
    raise exception 'TEST FAILED: an admin skipped a step';
  exception when others then
    if sqlerrm not like '%invalid_transition%' then raise; end if;
  end;

  -- 3. the happy path advances
  perform public.set_order_status(v_order, 'processing');
  perform public.set_order_status(v_order, 'shipped');
  perform public.set_order_status(v_order, 'delivered');

  select status into v_status from public.orders where id = v_order;
  if v_status <> 'delivered' then
    raise exception 'TEST FAILED: expected delivered, got %', v_status;
  end if;

  -- 4. terminal is terminal
  begin
    perform public.set_order_status(v_order, 'processing');
    raise exception 'TEST FAILED: a delivered order moved';
  exception when others then
    if sqlerrm not like '%invalid_transition%' then raise; end if;
  end;

  -- 5. self-clean
  delete from public.order_items where order_id = v_order;
  delete from public.orders where id = v_order;
  delete from public.profiles where user_id in (v_sub, v_other);

  select count(*) into v_count
    from public.orders
   where user_id in (v_sub, v_other);
  if v_count <> 0 then
    raise exception 'TEST FAILED: verification rows left behind';
  end if;

  raise notice 'LIFECYCLE TESTS PASSED: non-admin refused, skips refused, happy path advanced, terminal held, rows cleaned';
end $do$;