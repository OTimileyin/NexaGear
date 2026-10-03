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
 * Verified working 2026-10-02 (DECISION_LOG D20): the Clerk third-party auth
 * provider is registered with Supabase, so tokens verify against the live JWKS
 * and carry `role: "authenticated"`. The earlier `PGRST301 "No suitable key or
 * wrong key type"` failures were caused by that provider never having been
 * saved — not by a Supabase or Clerk defect. Never work around an auth failure
 * here with `service_role` or by weakening RLS; fix the provider registration.
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
