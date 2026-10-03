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