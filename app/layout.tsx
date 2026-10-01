import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource-variable/archivo";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";

import { SiteHeader } from "@/components/SiteHeader";
import { CartProvider } from "@/lib/cart/cart-context";

export const metadata: Metadata = {
  title: {
    default: "NexaGear — gear for developers and makers",
    template: "%s · NexaGear",
  },
  description:
    "Mechanical keyboards, precision mice, USB-C hubs, power, Arduino kits, sensors, and prototyping tools for developers, makers, and robotics learners.",
  openGraph: {
    type: "website",
    siteName: "NexaGear",
    title: "NexaGear — gear for developers and makers",
    description:
      "Keyboards, hubs, power, audio, and electronics kits for developers and makers — described like the datasheets you already read.",
  },
  twitter: {
    card: "summary",
    title: "NexaGear — gear for developers and makers",
    description:
      "Keyboards, hubs, power, audio, and electronics kits for developers and makers.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to main content
        </a>
        <CartProvider>
          <SiteHeader />
          <main id="main-content" className="flex-1">{children}</main>
          <footer className="mt-16 border-t border-ink/15">
            <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-6 text-xs text-steel sm:flex-row sm:items-center sm:justify-between">
              <p>
                NexaGear — HNG internship assignment demo. Not a real store; no
                payments are processed.
              </p>
              <p className="flex items-center gap-4 font-mono">
                <Link href="/privacy" className="hover:text-drafting">
                  Privacy
                </Link>
                <Link href="/terms" className="hover:text-drafting">
                  Terms
                </Link>
                <span>Free delivery · NG-2026</span>
              </p>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
