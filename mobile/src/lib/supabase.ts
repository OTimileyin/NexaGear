import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { readEnv } from "./env.ts";

/**
 * The phone's Supabase client — the same construction as the website's
 * `lib/supabase/browser.ts`, for the same reason.
 *
 * `cart_items` (migration 0011) is guarded by policies that read
 * `auth.jwt() ->> 'sub'`, so every request has to carry the Clerk session
 * token; the anon key alone is refused by `revoke all from anon`. supabase-js
 * calls `accessToken` per request, so a token Clerk refreshes mid-session is
 * picked up without rebuilding the client — and it also feeds
 * `realtime.setAuth`, which is what lets the *subscription* see the user's own
 * rows rather than an empty stream.
 *
 * Returns null when the project is unconfigured, so a missing key degrades to a
 * readable banner instead of a crash on launch.
 */
export function createSupabaseClient(
  getToken: () => Promise<string | null>,
): SupabaseClient | null {
  const env = readEnv();
  if (!env.supabaseUrl || !env.supabaseAnonKey) return null;

  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      // No Supabase auth session exists — Clerk owns the session — so there is
      // nothing to detect in a URL, and on the web build this stops the client
      // trying to read an OAuth fragment out of the address bar.
      detectSessionInUrl: false,
    },
    accessToken: async () => (await getToken()) ?? null,
  });
}
