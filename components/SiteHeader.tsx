import Link from "next/link";

import { AuthSection } from "@/components/AuthSection";
import { CartCount } from "@/components/CartCount";
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
    <header className="border-b border-ink/15">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-lg font-semibold tracking-tight">NexaGear</span>
          <span className="hidden font-mono text-[11px] text-steel sm:inline">
            NG-2026
          </span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-4 sm:gap-6 text-sm">
          <Link href="/shop" className="hover:text-drafting">
            Shop
          </Link>
          <Link
            href="/cart"
            className="flex items-center font-mono hover:text-drafting"
            aria-label="Cart"
          >
            Cart
            <CartCount />
          </Link>
          {admin && (
            <Link href="/admin" className="font-mono text-xs hover:text-drafting">
              Admin
            </Link>
          )}
          <AuthSection />
        </nav>
      </div>
    </header>
  );
}
