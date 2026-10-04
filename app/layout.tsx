import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource-variable/archivo";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";

import { SiteHeader } from "@/components/SiteHeader";
import { ThemeScript } from "@/components/ThemeScript";
import { CartSheet } from "@/components/CartSheet";
import { CartSync } from "@/components/CartSync";
import { CartProvider } from "@/lib/cart/cart-context";
import { CartSheetProvider } from "@/lib/cart-sheet";
import { siteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  // Without a base, Next emits relative og:url/canonical values, which social
  // crawlers cannot resolve.
  metadataBase: new URL(siteUrl()),
  title: {
    default: "NexaGear — gear for developers and makers",
    template: "%s · NexaGear",
  },
  description:
    "Mechanical keyboards, precision mice, USB-C hubs, power, Arduino kits, sensors, and prototyping tools for developers, makers, and robotics learners.",
  applicationName: "NexaGear",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    siteName: "NexaGear",
    url: "/",
    title: "NexaGear — gear for developers and makers",
    description:
      "Keyboards, hubs, power, audio, and electronics kits for developers and makers — described like the datasheets you already read.",
  },
  twitter: {
    // The card asset is 1200x630, so the wide card is the correct one —
    // `summary` would crop it to a small square thumbnail.
    card: "summary_large_image",
    title: "NexaGear — gear for developers and makers",
    description:
      "Keyboards, hubs, power, audio, and electronics kits for developers and makers.",
  },
};

export const viewport = {
  // Browser chrome follows the same media query the page resolves its scheme
  // with, so the address bar matches the page rather than staying light.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#16181c" },
  ],
  // Declaring both means the browser may render native UI (scrollbars, form
  // controls) in dark before our own CSS has loaded. The page overrides this
  // per-scheme via the `color-scheme` property in globals.css.
  colorScheme: "light dark" as const,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // The bootstrap script writes data-theme onto this element before paint, so
    // React must not be told to expect a fixed attribute set.
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        <ClerkProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
          >
            Skip to main content
          </a>
          {/*
            Connects the cart store to the signed-in account's server cart
            (D35). It renders nothing; it is mounted here so that every route —
            including the cart sheet, which is part of the layout — reads the
            same cart the phone sees.
          */}
          <CartSync />
          <CartProvider>
            {/* The sheet's open/closed state is UI-only and deliberately lives
                outside the cart data layer, so nothing here changes what is
                persisted in the cart. */}
            <CartSheetProvider>
              <SiteHeader />
              <main id="main-content" className="flex-1">{children}</main>
              <footer className="mt-16 border-t border-ink/15 apple:mt-24 apple:border-t-0 apple:bg-surface">
                <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-6 text-xs text-steel apple:max-w-6xl apple:py-8 sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    NexaGear — HNG internship assignment demo. Payments run in
                    Paystack test mode; no real money moves.
                  </p>
                  <p className="flex items-center gap-4 font-mono apple:font-sans apple:text-sm">
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
              <CartSheet />
            </CartSheetProvider>
          </CartProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
