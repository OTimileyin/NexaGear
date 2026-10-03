-- NexaGear — remove every sample order
--
-- Run it:
--   npx supabase db query --linked "delete from public.orders where is_sample;"
--
-- `order_items.order_id` is `on delete cascade`, so the line items go with
-- their order and nothing else is touched. Real orders are unaffected: the
-- WHERE clause is scoped to `is_sample`, which no application role can set.

delete from public.orders where is_sample;