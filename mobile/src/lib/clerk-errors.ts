/**
 * Clerk hands back a structured error whose first entry usually says exactly
 * what to do ("Password is incorrect. Try again, or use another method."). The
 * UI should show that sentence rather than a status code — but it also has to
 * survive an error shape that is not what we expect, because a screen that
 * shows "undefined" during a demo is worse than one that shows a plain
 * sentence.
 */
interface ClerkErrorEntry {
  message?: string;
  longMessage?: string;
}

interface ClerkErrorLike {
  message?: string;
  errors?: ClerkErrorEntry[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function describeAuthError(error: unknown): string {
  if (!isRecord(error)) {
    return "Sign-in failed. Check your connection, then try again.";
  }

  const like = error as ClerkErrorLike;
  const first = Array.isArray(like.errors) ? like.errors[0] : undefined;
  const detail = first?.longMessage ?? first?.message ?? like.message;

  if (typeof detail === "string" && detail.trim().length > 0) return detail;
  return "Sign-in failed. Check your connection, then try again.";
}
