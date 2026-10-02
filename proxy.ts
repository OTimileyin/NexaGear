import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Next.js 16 proxy (the renamed middleware convention).
 *
 * clerkMiddleware() attaches Clerk's auth context to every matched request so
 * server components, route handlers, and server actions can read the session.
 * Clerk manages its own session cookies — the previous Supabase cookie-refresh
 * middleware is no longer needed.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Always run for Clerk-specific frontend API routes
    "/__clerk/(.*)",
  ],
};
