/**
 * The three public values the app needs, named literally.
 *
 * Expo inlines `process.env.EXPO_PUBLIC_*` at build time by *textual* match, so
 * a dynamic lookup like `process.env[name]` is replaced with nothing and the
 * app ships with an empty value that no error explains. Each access below is
 * written out for that reason — do not "tidy" these into a loop.
 *
 * None of these three is a secret. The Clerk publishable key and the Supabase
 * anon key are already in the website's client bundle by design; RLS and Clerk
 * authority are what protect the data. The **service-role key is deliberately
 * absent** — it must never be in this app, because an APK is a file anyone can
 * unpack.
 */
export interface EnvConfig {
  clerkPublishableKey: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export function readEnv(): EnvConfig {
  return {
    clerkPublishableKey: (process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "").trim(),
    supabaseUrl: (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim(),
    supabaseAnonKey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim(),
  };
}

/** Names of the vars that are missing, so the error can name them exactly. */
export function missingEnvNames(config: EnvConfig): string[] {
  const missing: string[] = [];
  if (!config.clerkPublishableKey) missing.push("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY");
  if (!config.supabaseUrl) missing.push("EXPO_PUBLIC_SUPABASE_URL");
  if (!config.supabaseAnonKey) missing.push("EXPO_PUBLIC_SUPABASE_ANON_KEY");
  return missing;
}

/**
 * What to show a person when the build has no keys.
 *
 * Says what happened and what to do next — never "something went wrong" — and
 * names the file to create, because this is a build-time mistake rather than
 * anything the user did.
 */
export function configErrorMessage(missing: string[]): string {
  return [
    "This build has no Supabase or Clerk keys, so it cannot load the shop.",
    `Missing: ${missing.join(", ")}.`,
    "Create mobile/.env with those three values (see mobile/.env.example), then rebuild.",
  ].join(" ");
}
