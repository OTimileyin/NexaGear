"use client";

import { useClerk } from "@clerk/nextjs";
import { useState } from "react";

/**
 * Checkout gate shown to unauthenticated visitors (PRD §18).
 * Backed by Clerk; Google is the intended provider. The cart lives in this
 * browser and is untouched by signing in.
 */
export function SignInGate({ next }: { next: string }) {
  const { openSignIn } = useClerk();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSignIn() {
    setError(null);
    setPending(true);
    try {
      // Resume the intended flow after authentication (PRD §18).
      openSignIn({ forceRedirectUrl: next });
    } catch {
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
        className="mt-6 bg-signal px-6 py-3 text-sm font-semibold text-paper hover:bg-signal/90 disabled:opacity-60"
      >
        {pending ? "Redirecting to Google…" : "Continue with Google"}
      </button>

      <p aria-live="polite" className="mt-4 min-h-5 text-sm text-signal">
        {error ?? ""}
      </p>
    </div>
  );
}
