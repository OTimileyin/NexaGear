import Link from "next/link";

import { AuthSection } from "@/components/AuthSection";
import { CartTrigger } from "@/components/CartTrigger";
import { BrandMark } from "@/components/BrandMark";
import { SchemeToggle } from "@/components/SchemeToggle";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Show the admin link only to accounts the *database* considers admin.
 * This is a convenience, not a gate — /admin enforces the same check again
 * through RLS, so hiding the link grants nothing.
 */
async function isAdmin(): Promise<boolean> {
  try {
    if (!(await getCurrentUser())) return false;
    const supabase = await getSupabaseServerClient();
    if (!supabase) return false;
    const { data, error } = await supabase.rpc("is_admin");
    return !error && data === true;
  } catch {
    return false;
  }
}

export async function SiteHeader() {
  const admin = await isAdmin();

  return (
    // The datasheet theme's header is defined by a hairline rule underneath.
    // The apple theme drops the rule and gains vertical breathing room, since
    // space is what separates surfaces in that language.
    <header className="sticky top-0 z-30 border-b border-ink/10 bg-paper/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="NexaGear home">
          <BrandMark className="size-9 text-signal" />
          <span className="text-xl font-semibold tracking-tight">
            NexaGear
          </span>
        </Link>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-3 text-sm sm:gap-5">
          <Link href="/shop" className="inline-flex min-h-11 items-center font-medium hover:text-signal">
            Shop gear
          </Link>
          <Link href="/#our-approach" className="hidden min-h-11 items-center font-medium hover:text-signal md:inline-flex">Our approach</Link>
          <CartTrigger />
          <SchemeToggle />
          {admin && (
            <details className="relative"><summary className="flex min-h-11 cursor-pointer items-center text-steel">Manage</summary><Link href="/admin" className="absolute right-0 top-full whitespace-nowrap rounded-lg border border-ink/15 bg-paper px-5 py-4 shadow-sm">Admin dashboard</Link></details>
          )}
          <AuthSection />
        </nav>
      </div>
    </header>
  );
}
