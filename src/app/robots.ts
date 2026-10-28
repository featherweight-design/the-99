import type { MetadataRoute } from "next";

/**
 * `/robots.txt` (Sentry THE-99-1: its absence was a dotted 404 on every crawl). Everything a crawler
 * can reach signed out is fair to index, the public card and commander pages above all; an invite or
 * a friend link is one person's, and the API is no page.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/join/", "/friend/"] },
  };
}
