"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/** Header auth: Continue with Google when signed out, account + sign-out when in. */
export function AuthSection() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;

    client.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignIn() {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setError("Sign-in isn't configured yet.");
      return;
    }
    setPending(true);
    setError(null);
    const { error: oauthError } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(pathname)}`,
      },
    });
    if (oauthError) {
      setError("Google sign-in couldn't start. Try again.");
      setPending(false);
    }
  }

  async function handleSignOut() {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    await client.auth.signOut();
    setUser(null);
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span
          className="hidden max-w-[16ch] truncate font-mono text-xs text-steel sm:inline"
          title={user.email ?? ""}
        >
          {user.email}
        </span>
        <button
          type="button"
          onClick={handleSignOut}
          className="whitespace-nowrap border border-ink/30 px-3 py-1.5 text-sm hover:bg-ink hover:text-paper"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleSignIn}
        disabled={pending}
        className="whitespace-nowrap border border-ink/30 px-3 py-1.5 text-sm hover:bg-ink hover:text-paper disabled:opacity-60"
      >
        {pending ? "Redirecting…" : "Sign in"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-signal">
          {error}
        </span>
      )}
    </div>
  );
}
