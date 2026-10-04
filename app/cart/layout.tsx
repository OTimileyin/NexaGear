import { pageMetadata } from "@/lib/seo";

/**
 * Metadata for /cart lives in a layout.
 *
 * `app/cart/page.tsx` is a client component — the cart is read from
 * localStorage, so it has to be — and a client page cannot export `metadata`.
 * A layout is the supported way to give such a route a canonical, and /cart
 * needs one: it is listed in the sitemap as a crawlable surface.
 */
export const metadata = pageMetadata({
  title: "Cart",
  description:
    "The gear in your NexaGear cart, with a subtotal calculated from catalogue prices.",
  path: "/cart",
});

export default function CartLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
