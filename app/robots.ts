import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  // Same resolver as every canonical, so the sitemap URL cannot point at a
  // different origin than the one the pages advertise.
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private or per-session surfaces. `/auth/` was listed but no such route
      // exists — the real ones are the Clerk catch-alls and the admin page.
      disallow: ["/checkout", "/order/", "/admin", "/sign-in", "/sign-up"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
