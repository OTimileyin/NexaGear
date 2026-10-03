import { SignUp } from "@clerk/nextjs";

export const metadata = { title: "Create an account" };

/**
 * Clerk's prebuilt component supplies the form but no document heading, which
 * left this page with no `h1` (axe: page-has-heading-one). The heading is
 * visually hidden rather than removed: it names the page for screen-reader and
 * heading-navigation users without duplicating the visible card title.
 */
export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="sr-only">Create your NexaGear account</h1>
      <SignUp />
    </div>
  );
}