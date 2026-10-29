/**
 * Discovery for the magic.wizards.com Announcements category. There is no RSS feed: the site's
 * one sitemap (`https://magic.wizards.com/en/sitemap.xml`, a single `<urlset>`, every entry with a
 * `<lastmod>`) is the list of what exists.
 *
 * `lastmod` moves whenever a post is edited, so it says "look again", never "this is when it was
 * posted": the post's own published date comes from the page (see `post.ts`).
 */

export const SITEMAP_URL = "https://magic.wizards.com/en/sitemap.xml";

export type SitemapEntry = { url: string; lastmod: string | null };

/**
 * A post is exactly one path segment under `/en/news/announcements/`. Measured on the live sitemap
 * (2026-10-29): 608 such URLs, all at that depth; the category index itself
 * (`/en/news/announcements`) is the only other URL under the prefix. Slugs are not all
 * lowercase-kebab (`FNM_at_Home`), so the segment is anything but a slash, query or fragment.
 */
const POST_URL = /^https:\/\/magic\.wizards\.com\/en\/news\/announcements\/[^/?#]+\/?$/;

export function isAnnouncementPostUrl(url: string): boolean {
  return POST_URL.test(url);
}

const XML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeXml(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, ref: string) => {
      if (ref[0] === "#") {
        const code = ref[1] === "x" || ref[1] === "X" ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
      }
      return Object.hasOwn(XML_ENTITIES, ref.toLowerCase()) ? XML_ENTITIES[ref.toLowerCase()] : whole;
    })
    .trim();
}

/** Every `<url>` entry of a sitemap `<urlset>`, in document order. An entry with no `<loc>` is dropped. */
export function parseSitemap(xml: string): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  for (const [, block] of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = /<loc>([\s\S]*?)<\/loc>/.exec(block);
    if (!loc) continue;
    const url = decodeXml(loc[1]);
    if (!url) continue;
    const lastmod = /<lastmod>([\s\S]*?)<\/lastmod>/.exec(block);
    entries.push({ url, lastmod: lastmod ? decodeXml(lastmod[1]) || null : null });
  }
  return entries;
}

/** The Announcements posts in a sitemap, each URL once (the first entry wins). */
export function announcementPosts(xml: string): SitemapEntry[] {
  const seen = new Set<string>();
  const posts: SitemapEntry[] = [];
  for (const entry of parseSitemap(xml)) {
    const url = entry.url.replace(/\/$/, "");
    if (!isAnnouncementPostUrl(url) || seen.has(url)) continue;
    seen.add(url);
    posts.push({ ...entry, url });
  }
  return posts;
}
