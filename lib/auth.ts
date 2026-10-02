import "server-only";

import { currentUser } from "@clerk/nextjs/server";

export interface SessionUser {
  /** Clerk user ID (text, e.g. "user_2abc…") — the Supabase RLS subject. */
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

/**
 * Reads the authenticated user from the Clerk session.
 * Returns null when unauthenticated — callers must gate on this
 * (never trust client-provided identity).
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const user = await currentUser();
  if (!user) return null;

  return {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress ?? "",
    displayName:
      user.fullName ??
      user.firstName ??
      user.username ??
      null,
    avatarUrl: user.imageUrl ?? null,
  };
}
