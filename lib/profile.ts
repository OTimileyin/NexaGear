import "server-only";

import { currentUser } from "@clerk/nextjs/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface EnsureProfileResult {
  ok: boolean;
  reason?: "unauthenticated" | "no_email" | "not_configured" | "db_error";
}

/**
 * Ensures a public.profiles row exists for the signed-in Clerk user so that
 * create_order can read the trusted email address.
 *
 * This is the smallest safe sync mechanism for NexaGear's needs: it runs
 * server-side, inside the authenticated request, from the Clerk session —
 * there is no public webhook endpoint and therefore no unsigned-request
 * surface to defend. The upsert is idempotent (keyed on the Clerk user id in
 * profiles.user_id), so repeated checkouts never duplicate a profile.
 *
 * RLS allows this write only for the caller's own row
 * (auth.jwt()->>'sub' = user_id).
 */
export async function ensureProfile(): Promise<EnsureProfileResult> {
  const user = await currentUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  if (!email) return { ok: false, reason: "no_email" };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, reason: "not_configured" };

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      email,
      display_name: user.fullName ?? user.firstName ?? null,
      avatar_url: user.imageUrl ?? null,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[profile] ensureProfile failed:", error.message);
    return { ok: false, reason: "db_error" };
  }

  return { ok: true };
}
