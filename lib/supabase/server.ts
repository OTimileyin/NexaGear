import "server-only";

import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server Supabase client authenticated with the Clerk session token
 * (Clerk ⇄ Supabase third-party auth — not the legacy shared-JWT template).
 *
 * Intended: the token carries the Clerk user ID in `sub`, so RLS policies
 * evaluate against `auth.jwt()->>'sub'` under the `authenticated` role.
 *
 * CURRENTLY BLOCKED BY EXTERNAL PROVIDER (DECISION_LOG D19): Supabase rejects
 * this token during key resolution (HTTP 401 `PGRST301 "No suitable key or
 * wrong key type"`), and the token still lacks `role: "authenticated"`.
 * Every authenticated call therefore fails; see docs/IMPLEMENTATION_PLAN.md
 * "External blockers". Do not work around this with `service_role` or by
 * weakening RLS.
 *
 * Returns null when env is not configured — callers must fail honestly
 * (error state), never with fake data.
 */
export async function getSupabaseServerClient(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const { getToken } = await auth();
  const token = await getToken();

  return createClient(url, key, {
    accessToken: async () => token,
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
