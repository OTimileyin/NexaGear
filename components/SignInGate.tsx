"use client";

import { useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const ERROR_COPY: Record<string, string> = {
  missing_code: "The Google sign-in response was incomplete. Try again.",
  exchange_failed: "Google sign-in couldn't be completed. Try again.",
  not_configured: "Sign-in isn't configured yet. Server env vars are missing.",
};

/** Checkout gate shown to unauthenticated visitors (PRD §18). */
export function SignInGate({
  next,
  authError,
}: {
  next: string;
  authError?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(
    authError ? (ERROR_COPY[authError] ?? ERROR_COPY.exchange_failed) : null,
  );

  async function handleSignIn() {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setError("Sign-in isn't configured yet. Set the Supabase env vars and restart the app.");
      return;
    }
    setPending(true);
    setError(null);
    const { error: oauthError } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (oauthError) {
      setError("Google sign-in couldn't start. Try again.");
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="font-mono text-xs text-steel">CHECKOUT · SIGN-IN REQUIRED</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Sign in to place your order
      </h1>
      <p className="mt-3 max-w-prose text-ink/75">
        NexaGear needs your Google account so the confirmation email reaches
        you. Your cart stays exactly as it is in this browser — nothing is
        lost by signing in.
      </p>

      <button
        type="button"
        onClick={handleSignIn}
        disabled={pending}
        className="mt-6 bg-signal px-6 py-3 text-sm font-semibold text-white hover:bg-signal/90 disabled:opacity-60"
      >
        {pending ? "Redirecting to Google…" : "Continue with Google"}
      </button>

      <p aria-live="polite" className="mt-4 min-h-5 text-sm text-signal">
        {error ?? ""}
      </p>
    </div>
  );
}
