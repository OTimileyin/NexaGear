import type { Metadata } from "next";

/**
 * SEO helpers — pure, so the structured data we publish can be unit-tested
 * rather than eyeballed (same rule as pricing and the order lifecycle).
 *
 * Everything here describes only what a catalogue record already contains. No
 * ratings, reviews, stock counts or "best seller" claims are emitted: the design
 * guidelines forbid inventing them, and a rich result that lies is worse than
 * no rich result.
 */

/** Canonical origin. Falls back to localhost so a build without env still works. */
export function siteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim()
      ? process.env.NEXT_PUBLIC_SITE_URL.trim()
      : "http://localhost:3000";

  return configured.replace(/\/+$/, "");
}

export const SITE_NAME = "NexaGear";

export interface PageMetadataInput {
  /**
   * Page title. A plain string gets the root template's " · NexaGear" suffix;
   * use `{ absolute }` to opt out (the homepage does, because its title is
   * already the full brand line).
   */
  title: string | { absolute: string };
  description: string;
  /** Route path beginning with "/". Becomes BOTH the canonical and og:url. */
  path: string;
  /**
   * Social image.
   *
   * - omitted → the site card in `app/opengraph-image.tsx`
   * - `null`  → emit no image, so a sibling `opengraph-image` file supplies one
   *   (this is how product pages get their own card)
   *
   * The distinction exists because declaring `openGraph` at page level stops
   * the root file-convention image from being inherited. Before this was
   * explicit, `/shop` silently lost its social image the first time it declared
   * its own metadata — a regression nothing would have caught.
   */
  image?: { url: string; alt: string } | null;
  /**
   * Set false for functional or per-session pages. `robots.txt` disallow stops
   * crawling; it does not stop indexing, so a linked-to `/checkout` can still
   * appear in search results without this.
   */
  index?: boolean;
}

/**
 * The site-wide social card. Must match the file convention at
 * `app/opengraph-image.tsx`; the e2e check fetches every published og:image URL
 * and fails if it does not return a PNG, so renaming that file cannot leave
 * this pointing at nothing.
 */
export const SITE_CARD_PATH = "/opengraph-image";
export const SITE_CARD_ALT = "NexaGear — gear for developers and makers";

/**
 * Per-route metadata, built in one place.
 *
 * Every page used to hand-write its own `metadata` object. That is how `/` and
 * `/shop` ended up emitting no canonical at all, and how `/shop` ended up
 * telling social crawlers its URL was the homepage: each page inherited
 * whatever the root happened to declare, and nothing failed loudly. Deriving
 * both from the same `path` means they cannot disagree with the route.
 */
export function pageMetadata({
  title,
  description,
  path,
  image,
  index = true,
}: PageMetadataInput): Metadata {
  // Social titles are always plain strings; `absolute` only affects <title>.
  const shareTitle = typeof title === "string" ? title : title.absolute;
  const social = image === null ? null : (image ?? { url: SITE_CARD_PATH, alt: SITE_CARD_ALT });

  return {
    title,
    description,
    alternates: { canonical: path },
    ...(index
      ? {}
      : { robots: { index: false, follow: true } }),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url: path,
      title: shareTitle,
      description,
      ...(social ? { images: [{ url: social.url, alt: social.alt }] } : {}),
    },
    twitter: {
      // The card asset is 1200x630, so the wide card is the honest choice;
      // `summary` would crop it to a small square thumbnail.
      card: "summary_large_image",
      title: shareTitle,
      description,
      ...(social ? { images: [social.url] } : {}),
    },
  };
}

export type SchemaAvailability =
  | "InStock"
  | "LimitedAvailability"
  | "OutOfStock";

/**
 * schema.org availability. An unrecognised value maps to OutOfStock: claiming
 * availability we cannot confirm would be an invented claim, whereas claiming
 * unavailability is merely unhelpful.
 */
export function schemaAvailability(status: string): SchemaAvailability {
  switch (status) {
    case "in_stock":
      return "InStock";
    case "low_stock":
      return "LimitedAvailability";
    case "out_of_stock":
      return "OutOfStock";
    default:
      return "OutOfStock";
  }
}

export interface SeoProduct {
  name: string;
  slug: string;
  sku: string;
  description: string;
  price: number;
  imageUrl: string | null;
  inventoryStatus: string;
}

/**
 * Escapes the two characters that can terminate a `<script>` block or open a new
 * tag. JSON.stringify does not do this, so it is applied here — a product
 * description containing `</script>` would otherwise be an injection vector in
 * every page that publishes it.
 */
export function escapeJsonLd(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/** schema.org `Product` JSON-LD, containing only verified catalogue fields. */
export function productJsonLd(product: SeoProduct, baseUrl: string): string {
  const payload = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    description: product.description,
    ...(product.imageUrl ? { image: product.imageUrl } : {}),
    offers: {
      "@type": "Offer",
      url: `${baseUrl.replace(/\/+$/, "")}/product/${product.slug}`,
      price: product.price.toFixed(2),
      priceCurrency: "USD",
      availability: `https://schema.org/${schemaAvailability(product.inventoryStatus)}`,
    },
  };

  return escapeJsonLd(JSON.stringify(payload));
}