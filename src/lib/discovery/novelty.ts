import { eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards, commanderSupport, decks } from "../../db/schema";
import type { EdhrecTag } from "../edhrec/parse";
import type { CandidateRow } from "./candidates";

/** Ruling 4: buildability is a floor, never a term in the sort. */
export const NOVELTY_FLOOR = 0.3;

export type DeckTagSet = { deckName: string; colorIdentity: string[]; slugs: Set<string> };

type Overlap = Pick<CandidateRow, "ownedSupport" | "edhrecTotal">;

/** Null, not 0, without a denominator — the locked rule is that missing data is
    omitted rather than zeroed, and 0% is a figure this surface really reports. */
export function floorPct(c: Overlap): number | null {
  if (c.edhrecTotal == null || c.edhrecTotal <= 0) return null;
  return Math.round((100 * c.ownedSupport) / c.edhrecTotal);
}

export function clearsFloor(c: Overlap): boolean {
  if (c.edhrecTotal == null || c.edhrecTotal <= 0) return false;
  return c.ownedSupport >= NOVELTY_FLOOR * c.edhrecTotal;
}

export function unplayedTags(tags: EdhrecTag[], played: Set<string>): EdhrecTag[] {
  return tags
    .filter((t) => !played.has(t.slug))
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
}

/**
 * Deck sets in the order `nearestDeck` reads them: by name, so a tie between
 * two decks sharing the same number of tags resolves the same way on every row.
 *
 * Sorted by the caller rather than inside `nearestDeck`, which runs once per
 * candidate — over ~3,300 of them, sorting there is the same order re-derived
 * 3,300 times.
 */
export function orderDeckSets<T extends { deckName: string }>(deckSets: readonly T[]): T[] {
  return [...deckSets].sort((a, b) => a.deckName.localeCompare(b.deckName));
}

/**
 * The single nearest built deck, by count of shared tags. One deck and never a
 * count of decks — severity, not inventory, the same rule the availability
 * receipt follows.
 *
 * `deckSets` must already be in `orderDeckSets` order: a tie keeps the first
 * deck seen, so that ordering is what stops the clause moving between two
 * renders of the same data.
 */
export function nearestDeck(
  tags: EdhrecTag[],
  deckSets: readonly { deckName: string; slugs: Set<string> }[],
): { deckName: string; sharedLabels: string[]; extraShared: number } | null {
  let best: { deckName: string; labels: string[] } | null = null;
  for (const d of deckSets) {
    const labels = tags
      .filter((t) => d.slugs.has(t.slug))
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((t) => t.label);
    if (labels.length > 0 && (!best || labels.length > best.labels.length)) {
      best = { deckName: d.deckName, labels };
    }
  }
  if (!best) return null;
  // Structured, never a sentence: the wording lives in the copy module, which is
  // the one place the clause can be kept consistent with `tagList` beside it.
  return {
    deckName: best.deckName,
    sharedLabels: best.labels.slice(0, 2),
    extraShared: Math.max(0, best.labels.length - 2),
  };
}

type Ordered = { ownedSupport: number; unplayedCount: number; oracleId: string };

const byOracleId = (a: Ordered, b: Ordered) =>
  a.oracleId === b.oracleId ? 0 : a.oracleId < b.oracleId ? -1 : 1;

/** Ruling 3: one sort key each, no blend. Overlap, then the id — the same
    canonical-UUID tiebreak `byScoreThenOracleId` uses, for the same reason. */
export function byFit(a: Ordered, b: Ordered): number {
  return b.ownedSupport - a.ownedSupport || byOracleId(a, b);
}

/** Distance first. Overlap is the tiebreak only — it is a floor, not a term,
    so it can separate two commanders that are equally new but never outrank
    newness itself. */
export function byNovelty(a: Ordered, b: Ordered): number {
  return b.unplayedCount - a.unplayedCount
    || b.ownedSupport - a.ownedSupport
    || byOracleId(a, b);
}

/**
 * One tag set per built deck, from its commander's index row.
 *
 * Two decks sharing an archetype count once, which is deliberate (gap 6): you
 * have played it or you have not, so the sort cannot express "a little".
 * A deck whose commander is not indexed contributes an empty tag set rather
 * than being dropped: it can never be the nearest deck, since `nearestDeck`
 * requires a shared tag, but it keeps its name and colour identity in the list
 * that the built clause counts against.
 */
export async function loadPlayedTags(userId: string): Promise<DeckTagSet[]> {
  // The `cards` join is what carries each deck's colour identity: `decks` stores
  // only the commander's oracle id, and Task 19's built clause needs the colours.
  const built = await db
    .select({
      name: decks.name,
      oracleId: decks.commanderOracleId,
      colorIdentity: cards.colorIdentity,
    })
    .from(decks)
    .innerJoin(cards, eq(cards.oracleId, decks.commanderOracleId))
    .where(eq(decks.userId, userId));
  if (built.length === 0) return [];

  const support = await db
    .select({ oracleId: commanderSupport.commanderOracleId, tags: commanderSupport.tags })
    .from(commanderSupport)
    .where(inArray(commanderSupport.commanderOracleId, built.map((d) => d.oracleId)));

  // `commanderSupport.tags` is `jsonb().notNull()`, so no `?? []` on the value.
  const tagsByOracleId = new Map(support.map((s) => [s.oracleId, s.tags]));
  return built.map((d) => ({
    deckName: d.name,
    colorIdentity: d.colorIdentity,
    slugs: new Set((tagsByOracleId.get(d.oracleId) ?? []).map((t) => t.slug)),
  }));
}
