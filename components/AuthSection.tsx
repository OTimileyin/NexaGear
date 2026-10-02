"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * Header auth: "Sign in" when signed out, account + sign-out when signed in.
 * Backed by Clerk. Google remains the intended provider (configured on the
 * Clerk instance as the Google SSO connection).
 */
export function AuthSection() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, user } = useUser();
  const { openSignIn, signOut } = useClerk();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setError(null);
    setPending(true);
    try {
      // Return to the page the visitor was on once authenticated.
      openSignIn({ forceRedirectUrl: pathname });
    } catch {
      setError("Google sign-in couldn't start. Try again.");
      setPending(false);
    }
  }

  async function handleSignOut() {
    await signOut();
  }

  if (!isLoaded) {
    // Reserve the row height so the header doesn't jump while Clerk loads.
    return <div className="h-9" aria-hidden="true" />;
  }

  if (isSignedIn) {
    const email = user.primaryEmailAddress?.emailAddress ?? "";
    return (
      <div className="flex items-center gap-3">
        <span
          className="hidden max-w-[16ch] truncate font-mono text-xs text-steel sm:inline"
          title={email}
        >
          {email}
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
