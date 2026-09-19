import { eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards, commanderSupport, decks } from "../../db/schema";
import type { EdhrecTag } from "../edhrec/parse";
import type { CandidateRow } from "./candidates";

import { NOVELTY_FLOOR } from "./floor";

export type DeckTagSet = { deckName: string; colorIdentity: string[]; slugs: Set<string> };

type Overlap = Pick<CandidateRow, "collectionSupport" | "edhrecTotal">;

/** Null, not 0, without a denominator — the locked rule is that missing data is
    omitted rather than zeroed, and 0% is a figure this surface really reports.

    Reads `collectionSupport`, the count `clearsFloor` decides on, so the printed
    percentage and the decision are the same figure. The two sit in one sentence
    — "you own 8% of its support list against the 12% floor" — and a percentage
    drawn from a narrower pool would put a row above the number that excluded it. */
export function floorPct(c: Overlap): number | null {
  if (c.edhrecTotal == null || c.edhrecTotal <= 0) return null;
  return Math.round((100 * c.collectionSupport) / c.edhrecTotal);
}

/** The whole-collection support count, and never a pool a control can narrow.
    Named rather than reused from `Overlap` so the floor cannot be handed the
    pool figure by accident: the two shapes no longer fit each other. */
export type FloorInput = { collectionSupport: number; edhrecTotal: number | null };

/**
 * The floor reads the whole collection, never a pool a control can narrow.
 * Reading `ownedSupport` here is what let a narrowed pool remove rows the
 * control had no business removing: the novelty sort dropped every row the
 * narrowed pool pushed below the bar, silently and with nothing on screen
 * accounting for it. Which rows a control may remove is the OWNED lane's
 * question, answered there by `Build from` and said out loud in its result line;
 * this floor is not a place to answer it.
 */
export function clearsFloor(c: FloorInput): boolean {
  if (c.edhrecTotal == null || c.edhrecTotal <= 0) return false;
  return c.collectionSupport >= NOVELTY_FLOOR * c.edhrecTotal;
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
 * One tag set per deck, from BOTH of its commanders' index rows.
 *
 * Two decks sharing an archetype count once, which is deliberate (gap 6): you
 * have played it or you have not, so the sort cannot express "a little".
 * A deck whose commander is not indexed contributes an empty tag set rather
 * than being dropped: it can never be the nearest deck, since `nearestDeck`
 * requires a shared tag, but it keeps its name and colour identity in the list
 * that the built clause counts against.
 *
 * THE PARTNER COUNTS, and leaving it out was a real inconsistency rather than a
 * simplification. `notBuiltBy` — the predicate that decides which commanders
 * reach the discover lane at all — matches `commander_oracle_id` OR
 * `partner_oracle_id`, so a commander in a deck's partner slot is already
 * treated as one the reader has built. Reading only the primary here meant that
 * deck's partner-side mechanics were reported as never played, which the gap
 * line then said out loud.
 *
 * "Per deck", not "per built deck", and the distinction is deliberate: a BREW
 * counts, exactly as it counts for `notBuiltBy`, which joins no
 * `deck_versions`. Requiring a committed version here would have the two
 * disagree — a commander kept off the lane because a draft uses it,
 * while that same brew's themes read as unplayed on every other row. The old
 * wording said "built deck" and was the looser claim's own contradiction.
 */
export async function loadPlayedTags(userId: string): Promise<DeckTagSet[]> {
  // The `cards` join is what carries each deck's colour identity: `decks` stores
  // only the commander's oracle id, and Task 19's built clause needs the colours.
  const built = await db
    .select({
      name: decks.name,
      oracleId: decks.commanderOracleId,
      partnerOracleId: decks.partnerOracleId,
      colorIdentity: cards.colorIdentity,
    })
    .from(decks)
    // The commander's row carries the deck's colour identity. The PARTNER is
    // deliberately not joined for it: a pair's identity is the union, which
    // `decks` does not store, and the built clause this feeds reads the primary's
    // — unchanged behaviour, and not this function's question to reopen.
    .innerJoin(cards, eq(cards.oracleId, decks.commanderOracleId))
    .where(eq(decks.userId, userId));
  if (built.length === 0) return [];

  const wanted = commanderIdsIn(built);
  const support = await db
    .select({ oracleId: commanderSupport.commanderOracleId, tags: commanderSupport.tags })
    .from(commanderSupport)
    .where(inArray(commanderSupport.commanderOracleId, wanted));

  // `commanderSupport.tags` is `jsonb().notNull()`, so no `?? []` on the value.
  const tagsByOracleId = new Map(support.map((s) => [s.oracleId, s.tags]));
  return toDeckTagSets(built, tagsByOracleId);
}

/**
 * Every commander id these decks name, both slots, deduplicated.
 *
 * Split out to be testable, and that is the point rather than tidiness: the
 * union in `toDeckTagSets` can only fold tags the LOOKUP fetched, so a
 * regression that dropped `partnerOracleId` here would omit a partner's tags in
 * production while every test of the fold still passed. Named by review, which
 * is exactly where it found the gap the first extraction left.
 *
 * A pair's two commanders are two index rows, so one read covers the union
 * rather than being run twice.
 */
export function commanderIdsIn(
  decks: readonly { oracleId: string; partnerOracleId: string | null }[],
): string[] {
  return [
    ...new Set(
      decks.flatMap((d) =>
        [d.oracleId, d.partnerOracleId].filter((id): id is string => id != null),
      ),
    ),
  ];
}

/**
 * One tag set per deck, folding BOTH commanders' tags into it.
 *
 * Pure, and split out so the union is testable: the read around it needs a
 * database, and the union is the part a regression would silently undo — a
 * return to the primary alone reports a partner's mechanics as never played,
 * which the gap line then says out loud. Named by review.
 */
export function toDeckTagSets(
  decks: readonly {
    name: string;
    oracleId: string;
    partnerOracleId: string | null;
    colorIdentity: string[];
  }[],
  tagsByOracleId: ReadonlyMap<string, EdhrecTag[]>,
): DeckTagSet[] {
  return decks.map((d) => ({
    deckName: d.name,
    colorIdentity: d.colorIdentity,
    // One SET per deck, so a pair whose two commanders share a theme counts it
    // once — the same "played or not" rule two decks sharing an archetype follow.
    slugs: new Set(
      [d.oracleId, d.partnerOracleId]
        .filter((id): id is string => id != null)
        .flatMap((id) => tagsByOracleId.get(id) ?? [])
        .map((t) => t.slug),
    ),
  }));
}
