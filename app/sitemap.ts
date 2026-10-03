import type { MetadataRoute } from "next";

import { getProducts } from "@/lib/catalog";
import { siteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const lastModified = new Date();

  // Only public, crawlable surfaces. Checkout, order tracking and /admin are
  // private or per-session and are disallowed in robots.ts — listing them here
  // would contradict that.
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/cart`, lastModified, changeFrequency: "weekly", priority: 0.3 },
    { url: `${base}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, lastModified, changeFrequency: "yearly", priority: 0.2 },
  ];

  let products: Awaited<ReturnType<typeof getProducts>> = [];
  try {
    products = await getProducts();
  } catch {
    // DB unconfigured at build time — static routes still ship.
  }

  return [
    ...staticRoutes,
    ...products.map((product) => ({
      url: `${base}/product/${product.slug}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
