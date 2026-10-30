/**
 * An early decklist: one deck list in a Wizards Commander decklists post, read before MTGJSON lists the box
 * (handoff `design_handoff_the99_announcements`, STATES 3.3 to 3.8, G3, G4). Its page is
 * `/decks/precons/early/<contentful id>/<position>`, and it gives way to the release list's page once a `precons` row
 * in the same set has the same commander.
 *
 * The pure half, safe in a client bundle: the address, the Announced set block's anchor, which set a post announces,
 * and the page's cards from the stored lines. The database half is `early-list-read.ts`.
 */
import type { AnnouncedDeckCard } from "../../db/schema";

/** The early list's page: the post's Contentful id (stable where a slug is not) and the list's place in the post. */
export function earlyListHref(contentfulId: string, position: number): string {
  return `/decks/precons/early/${encodeURIComponent(contentfulId)}/${position}`;
}

/** The DOM id of a set's block in the Announced group, so a link can land on it. */
export function announcedSetAnchor(code: string): string {
  return `announced-${code.toLowerCase()}`;
}

/** The `[position]` segment as a list position: a plain non-negative integer, or null (the page answers 404). */
export function parseListPosition(segment: string): number | null {
  if (!/^\d{1,6}$/.test(segment)) return null;
  return Number(segment);
}

/** "Read the post" links out only to Wizards' own site over https: the stored url is the sitemap's, never typed. */
export function isWizardsPostUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "magic.wizards.com";
  } catch {
    return false;
  }
}

/** A Commander set one of the post's commanders is printed in, with its release day (`YYYY-MM-DD`). */
export type CommanderPrinting = { oracleId: string; setCode: string; releasedAt: string };

/**
 * The set a post announces, from its lists' commanders: each list votes once for every candidate set its commander is
 * printed in, and the set with the most lists wins (a tie goes to the earlier release, then the lower code, so the
 * answer never depends on row order). Null when no list's commander is printed in a candidate set. Read at request
 * time from `printings`; nothing is stored.
 */
export function resolvePostSet(commanderIds: readonly (string | null)[], candidates: readonly CommanderPrinting[]): string | null {
  const setsOf = new Map<string, Set<string>>();
  const released = new Map<string, string>();
  for (const p of candidates) {
    const code = p.setCode.toLowerCase();
    setsOf.set(p.oracleId, (setsOf.get(p.oracleId) ?? new Set()).add(code));
    released.set(code, p.releasedAt);
  }
  const votes = new Map<string, number>();
  for (const id of commanderIds) {
    if (id === null) continue;
    for (const code of setsOf.get(id) ?? []) votes.set(code, (votes.get(code) ?? 0) + 1);
  }
  let best: string | null = null;
  for (const [code, count] of votes) {
    if (best === null) { best = code; continue; }
    const lead = votes.get(best)!;
    const day = released.get(code)!;
    const bestDay = released.get(best)!;
    if (count > lead || (count === lead && (day < bestDay || (day === bestDay && code < best)))) best = code;
  }
  return best;
}

/** A matched line's catalog facts, as the read joins them. */
export type EarlyCardFacts = {
  oracleId: string;
  name: string;
  typeLine: string;
  manaCost: string | null;
  layout: string | null;
  colorIdentity: string[];
  imageUri: string | null;
  legal: boolean;
};

/** A line the catalog could not match, by the post's words (G3). */
export type UnmatchedLine = { name: string; count: number };

/**
 * The stored lines split into the cards the catalog matched (in post order, each with its facts) and the lines it did
 * not. A matched line whose card has since left the catalog reads as unmatched, by the post's name, rather than vanishing.
 */
export function splitEarlyLines(lines: readonly AnnouncedDeckCard[], facts: ReadonlyMap<string, EarlyCardFacts>) {
  const matched: { facts: EarlyCardFacts; count: number }[] = [];
  const unmatched: UnmatchedLine[] = [];
  for (const l of lines) {
    const f = l.cardId === null ? undefined : facts.get(l.cardId);
    if (f) matched.push({ facts: f, count: l.count });
    else unmatched.push({ name: l.name, count: l.count });
  }
  return { matched, unmatched };
}
