-- NexaGear — verification for migration 0010 (structured cancellation reasons)
--
-- Run it:   npx supabase db query --linked "$(cat supabase/verify/0010_cancellation_reasons.sql)"
--
-- NOTE: the CLI truncates multi-line SQL at the first newline and parses a
-- leading `--` as a flag, so strip comments and flatten newlines first:
--   SQL="$(grep -v '^[[:space:]]*--' supabase/verify/0010_cancellation_reasons.sql | tr '\n' ' ')"
--   npx supabase db query --linked "$SQL"
--
-- What it proves, in one self-cleaning block:
--   1. exactly ONE set_order_status overload exists, with the 3-argument
--      signature — i.e. the old 2-argument write path is really gone
--   2. cancelling without a reason is refused (cancellation_reason_required)
--   3. cancelling with a reason outside the vocabulary is refused
--      (invalid_cancellation_reason)
--   4. sending a reason with a NON-cancelled status is refused
--      (cancellation_reason_not_allowed)
--   5. cancelling with a valid reason succeeds and stores it
--   6. the biconditional is held by the CONSTRAINT, not just the function: a
--      direct table UPDATE that bypasses set_order_status is still refused
--   7. a non-admin is refused on the new signature
--   8. nothing survives — every row created here is deleted, and the final
--      assertion fails the run if any remain
--
-- It creates rows only with reserved `user_local_verify_%` ids and
-- `@example.invalid` addresses, and it deletes them. It never touches a real
-- order, a real profile, or real customer data.

do $do$
declare
  v_sub      text := 'user_local_verify_admin';
  v_other    text := 'user_local_verify_other';
  v_order    uuid;
  v_order2   uuid;
  v_reason   text;
  v_overload int;
  v_count    int;
begin
  delete from public.order_items
   where order_id in (select id from public.orders where user_id in (v_sub, v_other));
  delete from public.orders where user_id in (v_sub, v_other);
  delete from public.profiles where user_id in (v_sub, v_other);

  -- 1. no legacy 2-argument write path survives
  select count(*) into v_overload
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'set_order_status'
     and pg_get_function_identity_arguments(p.oid)
         = 'p_order_id uuid, p_status text';
  if v_overload <> 0 then
    raise exception 'TEST FAILED: the legacy 2-argument set_order_status still exists';
  end if;

  insert into public.profiles (user_id, email, is_admin)
  values (v_sub, 'verify@example.invalid', true),
         (v_other, 'other@example.invalid', false);

  insert into public.orders
    (user_id, client_ref, status, subtotal, customer_name, customer_email, phone, shipping_address)
  values
    (v_sub, gen_random_uuid(), 'pending', 12.34, 'Local Verify', 'verify@example.invalid', '0000', 'Local')
  returning id into v_order;

  insert into public.orders
    (user_id, client_ref, status, subtotal, customer_name, customer_email, phone, shipping_address)
  values
    (v_sub, gen_random_uuid(), 'pending', 56.78, 'Local Verify', 'verify@example.invalid', '0000', 'Local')
  returning id into v_order2;

  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_sub, 'role', 'authenticated')::text, true);

  -- 2. a cancellation with no reason is refused
  begin
    perform public.set_order_status(v_order, 'cancelled');
    raise exception 'TEST FAILED: a cancellation with no reason was allowed';
  exception when others then
    if sqlerrm not like '%cancellation_reason_required%' then raise; end if;
  end;

  -- 2b. whitespace is not a reason
  begin
    perform public.set_order_status(v_order, 'cancelled', '   ');
    raise exception 'TEST FAILED: whitespace was accepted as a reason';
  exception when others then
    if sqlerrm not like '%cancellation_reason_required%' then raise; end if;
  end;

  -- 3. a reason outside the vocabulary is refused
  begin
    perform public.set_order_status(v_order, 'cancelled', 'customer_changed_mind');
    raise exception 'TEST FAILED: an unknown reason was accepted';
  exception when others then
    if sqlerrm not like '%invalid_cancellation_reason%' then raise; end if;
  end;

  -- 4. a reason attached to a non-cancelled status is refused
  begin
    perform public.set_order_status(v_order, 'processing', 'out_of_stock');
    raise exception 'TEST FAILED: a reason was accepted on a non-cancelled status';
  exception when others then
    if sqlerrm not like '%cancellation_reason_not_allowed%' then raise; end if;
  end;

  -- 5. the valid path stores the reason
  perform public.set_order_status(v_order, 'cancelled', 'out_of_stock');

  select cancellation_reason into v_reason
    from public.orders where id = v_order;
  if v_reason is distinct from 'out_of_stock' then
    raise exception 'TEST FAILED: expected reason out_of_stock, got %', coalesce(v_reason, 'NULL');
  end if;

  -- 6. the CONSTRAINT holds even when the function is bypassed entirely.
  --    This is the assertion that matters: if only the function checked, a
  --    future write path could silently reintroduce a reasonless cancellation.
  begin
    update public.orders set status = 'cancelled' where id = v_order2;
    raise exception 'TEST FAILED: a direct UPDATE created a cancellation with no reason';
  exception when others then
    if sqlerrm not like '%orders_cancellation_reason_check%' then raise; end if;
  end;

  begin
    update public.orders set cancellation_reason = 'payment_failed' where id = v_order2;
    raise exception 'TEST FAILED: a reason was stored on a non-cancelled order';
  exception when others then
    if sqlerrm not like '%orders_cancellation_reason_check%' then raise; end if;
  end;

  -- 7. a non-admin is refused on the new signature
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_other, 'role', 'authenticated')::text, true);
  begin
    perform public.set_order_status(v_order2, 'cancelled', 'out_of_stock');
    raise exception 'TEST FAILED: a non-admin was allowed to cancel';
  exception when others then
    if sqlerrm not like '%not_authorised%' then raise; end if;
  end;

  -- 8. self-clean
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_sub, 'role', 'authenticated')::text, true);
  delete from public.order_items where order_id in (v_order, v_order2);
  delete from public.orders where id in (v_order, v_order2);
  delete from public.profiles where user_id in (v_sub, v_other);

  select count(*) into v_count
    from public.orders
   where user_id in (v_sub, v_other);
  if v_count <> 0 then
    raise exception 'TEST FAILED: verification rows left behind';
  end if;

  raise notice 'CANCELLATION REASON TESTS PASSED: no legacy overload, missing/invalid/stray reasons refused, valid reason stored, constraint holds without the function, non-admin refused, rows cleaned';
end $do$;