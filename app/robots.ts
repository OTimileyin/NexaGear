import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
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
