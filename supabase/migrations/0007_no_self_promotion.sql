-- NexaGear — 0007: stop self-promotion via profiles.is_admin
--
-- Found while auditing the grant surface before shipping the admin page
-- (D23). `profiles` had a table-level UPDATE grant for `authenticated` from
-- 0001, and 0003 added an owner UPDATE policy. RLS policies are row-level, so
-- "you may update YOUR row" plus "you may update ANY column" means a
-- signed-in visitor could PATCH their own profile and set
-- `is_admin = true` — granting themselves every admin read policy added in
-- 0006. The admin page itself was never the gate; the grant was the hole.
--
-- Fix: drop the table-level UPDATE grant and replace it with a column-level
-- grant covering exactly what lib/profile.ts writes. `user_id` is the conflict
-- key, not an updated column, so three columns are sufficient for the upsert.
--
-- `is_admin` is therefore settable only by a DBA via SQL, which is the intent
-- (D23): promotion is deliberately manual, never self-service.
--
-- Residual, accepted and documented: `email` remains self-writable on your own
-- row. Clerk is the source of truth and ensureProfile() re-syncs it on every
-- order, so it cannot be used to redirect someone else's order.
--
-- See docs/DECISION_LOG.md D23.

begin;

revoke update on public.profiles from authenticated;
grant update (email, display_name, avatar_url) on public.profiles to authenticated;

commit;