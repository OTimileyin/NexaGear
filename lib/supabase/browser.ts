"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client that carries the Clerk session token.
 *
 * `lib/supabase/public.ts` is server-only and anonymous, and
 * `lib/supabase/server.ts` reads the session from the request — neither can be
 * used by a browser component that needs RLS to see who it is. The cart now
 * lives in `cart_items` behind policies that check `auth.jwt() ->> 'sub'`, so
 * the browser needs a client whose every request carries that claim.
 *
 * `accessToken` is the same hook `lib/supabase/server.ts` already uses, so this
 * is the established pattern in this repo rather than a new one. supabase-js
 * calls it per request, which means a refreshed Clerk token is picked up
 * without rebuilding the client.
 *
 * Returns null when the project is unconfigured, so a missing env var degrades
 * to the local cart instead of throwing on a public page.
 */
export function createBrowserSupabase(
  getToken: () => Promise<string | null>,
): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    accessToken: async () => (await getToken()) ?? null,
  });
}
