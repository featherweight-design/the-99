// Flipping between decks (deck flip order, handoff `design_handoff_the99_deck_flip_order`): the order a deck page
// steps through. Opened from the Decks list, it is the list the reader was looking at (shelf, filters and sort
// applied), written when they pressed a tile. Opened any other way, it is All decks in the saved sort with no
// filters. Pure: the strip reads storage and the page's deck list and hands them here.

import { sortDecks, isDeckSort, DEFAULT_DECK_SORT, type DeckSort } from "./sort";

/** sessionStorage key for the trail. Per tab, so a second tab on another shelf never rewrites this one's order. */
export const FLIP_KEY = "the99:decks:flip";

/** What the page hands the strip per deck: the fields a sort reads, with dates as epoch ms so they cross the wire. */
export type FlipDeck = {
  id: string;
  name: string;
  createdAt: number;
  lastPlayedAt: number | null;
  sortPosition: number | null;
};

/** How long a trail stays the reader's list: a tab left open overnight is not still looking at that shelf. */
export const TRAIL_TTL_MS = 30 * 60 * 1000;

/**
 * The list the reader pressed a tile from: its ids in order, the word for the shelf, the URL to return to, when it was
 * written, and the decks reached by flipping from it (`seen`). A deck opened any other way is not in `seen`, so it never
 * inherits a shelf the reader is no longer on.
 */
export type FlipTrail = { ids: string[]; caption: string; href: string; at: number; seen: string[] };

export type Flip = {
  /** The deck's place, one-based, and the length of the list it is in. */
  k: number;
  n: number;
  /** The left link: the shelf's word and where it goes. */
  caption: string | null;
  href: string;
  prev: { id: string; name: string };
  next: { id: string; name: string };
};

export function parseTrail(raw: string | null): FlipTrail | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (typeof v !== "object" || v === null) return null;
    const { ids, caption, href, at, seen } = v as Record<string, unknown>;
    if (!Array.isArray(ids) || !ids.every((i) => typeof i === "string")) return null;
    if (typeof at !== "number" || !Array.isArray(seen) || !seen.every((i) => typeof i === "string")) return null;
    // A trail's return link is an in-app path under /decks; anything else is absence, not a redirect.
    if (typeof caption !== "string" || typeof href !== "string" || !/^\/decks(?:[?#]|$)/.test(href)) return null;
    return { ids, caption, href, at, seen };
  } catch {
    return null;
  }
}

/**
 * The order and the neighbours for `currentId`, or null when there is nothing to flip to (a one-deck list, or a deck the
 * list does not hold). A trail names an order, never a roster: a deck deleted since is dropped and a deck the trail does not
 * hold sends the strip back to All decks, so a stale trail never strands the reader on a list their deck is not in.
 */
export function resolveFlip(decks: readonly FlipDeck[], trail: FlipTrail | null, sortRaw: string | null, currentId: string, now: number): Flip | null {
  // A trail is this visit's only if it is fresh and the chain from the list reached this deck.
  if (trail && (now - trail.at > TRAIL_TTL_MS || !trail.seen.includes(currentId))) trail = null;
  const byId = new Map(decks.map((d) => [d.id, d]));
  let ids = trail ? trail.ids.filter((i) => byId.has(i)) : [];
  let caption: string | null = trail?.caption ?? null;
  let href = trail?.href ?? "/decks";
  if (!ids.includes(currentId)) {
    const sort: DeckSort = sortRaw !== null && isDeckSort(sortRaw) ? sortRaw : DEFAULT_DECK_SORT;
    ids = sortDecks(
      decks.map((d) => ({ ...d, createdAt: new Date(d.createdAt), lastPlayedAt: d.lastPlayedAt === null ? null : new Date(d.lastPlayedAt) })),
      sort,
    ).map((d) => d.id);
    caption = null;
    href = "/decks";
  }
  const n = ids.length;
  const at = ids.indexOf(currentId);
  if (n < 2 || at < 0) return null;
  const named = (id: string) => ({ id, name: byId.get(id)!.name });
  return { k: at + 1, n, caption, href, prev: named(ids[(at - 1 + n) % n]!), next: named(ids[(at + 1) % n]!) };
}
