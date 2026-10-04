import Link from "next/link";

import { AuthSection } from "@/components/AuthSection";
import { CartTrigger } from "@/components/CartTrigger";
import { SchemeToggle } from "@/components/SchemeToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
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
    <header className="border-b border-ink/15 apple:border-b-0 apple:bg-surface/70">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4 apple:max-w-6xl apple:py-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-lg font-semibold tracking-tight apple:text-xl">
            NexaGear
          </span>
          <span className="hidden font-mono text-[11px] text-steel sm:inline">
            NG-2026
          </span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-4 sm:gap-6 text-sm">
          <Link href="/shop" className="hover:text-drafting">
            Shop
          </Link>
          <CartTrigger />
          {admin && (
            <Link href="/admin" className="font-mono text-xs hover:text-drafting apple:font-sans">
              Admin
            </Link>
          )}
          <ThemeToggle />
          <SchemeToggle />
          <AuthSection />
        </nav>
      </div>
    </header>
  );
}
