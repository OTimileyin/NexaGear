import Link from "next/link";

import { AuthSection } from "@/components/AuthSection";
import { CartCount } from "@/components/CartCount";

export function SiteHeader() {
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
          <AuthSection />
        </nav>
      </div>
    </header>
  );
}
