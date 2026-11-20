/**
 * Wizards' "Collecting <set>" feature posts (`/en/news/feature/collecting-*`), read for the NAMES of a Commander set's
 * decks. The announcements post for a set often names no decks until its decklists post; the collecting post names
 * them weeks earlier, and Scryfall never says which boxes a set holds.
 *
 * The rule is structural and deliberately narrow (measured on the live page for Nauctis: The Sunken Realm,
 * 2026-11-20): an `<h3>` whose text is exactly `Commander Decks`, then the `<grid-item>`s of the first
 * `<responsive-grid>` before the next heading. Each item's caption is `<div>Name<br>Commander Deck</div>` (or a `<figcaption>`); the name is
 * the caption's first line, and a caption whose second line is not `Commander Deck` is skipped. The Premium Edition
 * section is a different heading and is never read. A post with no such section reads as no decks (not an error:
 * early posts do not have one yet). No model call, no commanders: the post names none.
 */
import { decodeHtmlEntities, htmlToText } from "./html";

const COLLECTING_URL = /^https:\/\/magic\.wizards\.com\/en\/news\/feature\/(collecting-[^/?#]+)\/?$/;

export type CollectingEntry = { url: string; lastmod: string | null; slug: string };

/** `collecting-*` feature posts of a parsed sitemap, each once (the first entry wins). */
export function collectingPosts(entries: readonly { url: string; lastmod: string | null }[]): CollectingEntry[] {
  const seen = new Set<string>();
  const out: CollectingEntry[] = [];
  for (const e of entries) {
    const url = e.url.replace(/\/$/, "");
    const m = COLLECTING_URL.exec(url);
    if (!m || seen.has(url)) continue;
    seen.add(url);
    out.push({ url, lastmod: e.lastmod, slug: m[1] });
  }
  return out;
}

const slugify = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** A set's name without its trailing "Commander", the product word Wizards' post titles leave off. */
const bareSetName = (name: string) => name.replace(/\s+Commander$/i, "");

/**
 * Whether a `collecting-<rest>` slug is about this set: the set's name (without a trailing "Commander") and the slug's
 * rest are the same run of words, or one is the other's tail ("collecting-darkhold-destiny" for "Marvel: Darkhold
 * Destiny Commander"). Whole hyphen-separated words only, and at least two words, so a one-word slug names no set.
 */
export function collectingMatchesSet(slug: string, setName: string): boolean {
  const rest = slug.replace(/^collecting-/, "");
  const set = slugify(bareSetName(setName));
  if (rest.split("-").length < 2 || set.split("-").length < 2) return false;
  return rest === set || set.endsWith(`-${rest}`) || rest.endsWith(`-${set}`);
}

const COMMANDER_DECKS_HEADING = /<h3\b[^>]*>\s*Commander Decks\s*<\/h3>/i;
const ANY_HEADING = /<h[1-6]\b/i;
const GRID = /<responsive-grid\b[^>]*>([\s\S]*?)<\/responsive-grid>/i;
const ITEM = /<grid-item\b[^>]*>([\s\S]*?)<\/grid-item>/gi;
const CAPTION = /<(div|figcaption)\b[^>]*>([\s\S]*?)<\/\1>/i;

/** The deck names under a post's `Commander Decks` heading, in the post's order, each once. Empty when it has no such section. */
export function parseCommanderDeckNames(bodyHtml: string): string[] {
  const heading = COMMANDER_DECKS_HEADING.exec(bodyHtml);
  if (!heading) return [];
  const after = bodyHtml.slice(heading.index + heading[0].length);
  const next = ANY_HEADING.exec(after);
  const section = next ? after.slice(0, next.index) : after;
  const grid = GRID.exec(section);
  if (!grid) return [];
  const names: string[] = [];
  for (const [, item] of grid[1].matchAll(ITEM)) {
    const caption = CAPTION.exec(item);
    if (!caption) continue;
    const [first, second, ...rest] = caption[2].split(/<br\s*\/?>/i).map((p) => htmlToText(decodeHtmlEntities(p)));
    if (!first || second?.toLowerCase() !== "commander deck" || rest.length > 0) continue;
    if (!names.includes(first)) names.push(first);
  }
  return names;
}
