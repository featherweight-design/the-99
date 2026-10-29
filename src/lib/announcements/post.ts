/**
 * One Announcements post page, read from the Contentful entry its Nuxt payload server-renders under
 * `fetch["ArticleFetcher:0"].payload` (see `nuxt.ts` for why the payload is read as text).
 *
 * Fields, as measured on live pages (2026-10-29):
 * - `id`: the Contentful entry id, the dedupe key (stable across edits; the URL slug is not the key).
 * - `title`, `category` (the category slug, `"announcements"`), `slug`.
 * - `publishedDateTime`: ISO 8601 with an offset, and not always seconds
 *   (`2026-10-28T10:01-07:00`, `2021-11-18T16:00:00-08:00`). `publishedDate` is the same instant
 *   with no zone (`2026-10-16 08:00:00`), so it is never used.
 * - `excerpt`: HTML. `metaImage.url`: protocol-relative (`//images.ctfassets.net/…`).
 * - `article.body`: the post's HTML, deck lists included.
 *
 * Required: id, title, category, published date, body. A post with no excerpt or image still
 * parses, with null there: the post exists whether or not it has a picture.
 */
import { htmlToText } from "./html";
import { asString, readNuxtPayload, readObject, readPath, type NuxtValue } from "./nuxt";

export type AnnouncementPost = {
  contentfulId: string;
  title: string;
  /** Plain text. */
  excerpt: string | null;
  /** ISO 8601 in UTC. */
  publishedDate: string;
  heroImageUrl: string | null;
  category: string;
  slug: string | null;
  url: string;
  bodyHtml: string;
};

export type PostField = "contentfulId" | "title" | "publishedDate" | "category" | "bodyHtml";

export type PostParseResult =
  | { ok: true; post: AnnouncementPost }
  | { ok: false; reason: "no-payload" }
  | { ok: false; reason: "no-article" }
  | { ok: false; reason: "missing-fields"; missing: PostField[] };

const ARTICLE_KEY = '"ArticleFetcher:0":';

/** `2026-10-28T10:01-07:00` → `2026-10-28T17:01:00.000Z`; null for anything without a zone or unparseable. */
export function toUtcIso(raw: string): string | null {
  // A zone is required: a bare local time would be read in the server's zone, silently.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(raw)) return null;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

function absoluteImageUrl(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith("//")) return `https:${raw}`;
  return /^https?:\/\//.test(raw) ? raw : null;
}

const nonEmpty = (s: string | null) => (s && s.trim() ? s.trim() : null);

/** Parses a post page. Never throws: a page it cannot read is a typed failure. */
export function parsePost(html: string, url: string): PostParseResult {
  const payload = readNuxtPayload(html);
  if (!payload) return { ok: false, reason: "no-payload" };

  const keyAt = html.indexOf(ARTICLE_KEY, payload.root);
  if (keyAt < 0) return { ok: false, reason: "no-article" };
  let entry: NuxtValue | null = null;
  const fetcherAt = keyAt + ARTICLE_KEY.length;
  if (html[fetcherAt] === "{") entry = readObject(payload, fetcherAt)?.get("payload") ?? null;
  if (entry?.kind !== "object") return { ok: false, reason: "no-article" };
  const props = readObject(payload, entry.start);
  if (!props) return { ok: false, reason: "no-article" };

  const contentfulId = nonEmpty(asString(props.get("id")));
  const title = nonEmpty(asString(props.get("title")));
  const category = nonEmpty(asString(props.get("category")));
  const dateRaw = asString(props.get("publishedDateTime"));
  const publishedDate = dateRaw ? toUtcIso(dateRaw.trim()) : null;
  const bodyHtml = nonEmpty(asString(readPath(payload, entry.start, ["article", "body"])));

  const missing: PostField[] = [];
  if (!contentfulId) missing.push("contentfulId");
  if (!title) missing.push("title");
  if (!publishedDate) missing.push("publishedDate");
  if (!category) missing.push("category");
  if (!bodyHtml) missing.push("bodyHtml");
  if (!contentfulId || !title || !publishedDate || !category || !bodyHtml) {
    return { ok: false, reason: "missing-fields", missing };
  }

  const excerptHtml = asString(props.get("excerpt"));
  return {
    ok: true,
    post: {
      contentfulId,
      title,
      excerpt: excerptHtml ? nonEmpty(htmlToText(excerptHtml)) : null,
      publishedDate,
      heroImageUrl: absoluteImageUrl(asString(readPath(payload, entry.start, ["metaImage", "url"]))),
      category,
      slug: nonEmpty(asString(props.get("slug"))),
      url,
      bodyHtml,
    },
  };
}
