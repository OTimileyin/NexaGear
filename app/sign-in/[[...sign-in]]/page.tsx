import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Sign in" };

/**
 * Clerk's prebuilt component supplies the form but no document heading, which
 * left this page with no `h1` (axe: page-has-heading-one). The heading is
 * visually hidden rather than removed: it names the page for screen-reader and
 * heading-navigation users without duplicating the visible card title.
 */
export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="sr-only">Sign in to NexaGear</h1>
      <SignIn />
    </div>
  );
}