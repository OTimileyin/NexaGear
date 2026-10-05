import type { SupabaseClient } from "@supabase/supabase-js";
import { createContext, useContext, type ReactNode } from "react";

import { configErrorMessage, missingEnvNames, readEnv } from "./env.ts";

/**
 * One Supabase client for the whole app, handed down rather than rebuilt per
 * screen. It is created once with a token getter, so every request carries
 * whatever Clerk token is current at that moment.
 */
const SupabaseContext = createContext<SupabaseClient | null>(null);

export function SupabaseProvider({
  client,
  children,
}: {
  client: SupabaseClient | null;
  children: ReactNode;
}) {
  return (
    <SupabaseContext.Provider value={client}>{children}</SupabaseContext.Provider>
  );
}

export function useSupabase(): SupabaseClient | null {
  return useContext(SupabaseContext);
}

/** Shown instead of every screen when the build has no publishable keys. */
export function unconfiguredMessage(): string {
  return configErrorMessage(missingEnvNames(readEnv()));
}
