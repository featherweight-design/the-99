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
 * The single nearest built deck, by count of shared tags. One deck and never a
 * count of decks — severity, not inventory, the same rule the availability
 * receipt follows. Ties break on deck name so the clause does not move between
 * two renders of the same data.
 */
export function nearestDeck(
  tags: EdhrecTag[],
  deckSets: readonly { deckName: string; slugs: Set<string> }[],
): { deckName: string; shared: string } | null {
  let best: { deckName: string; labels: string[] } | null = null;
  for (const d of [...deckSets].sort((a, b) => a.deckName.localeCompare(b.deckName))) {
    const labels = tags
      .filter((t) => d.slugs.has(t.slug))
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((t) => t.label);
    if (labels.length > 0 && (!best || labels.length > best.labels.length)) {
      best = { deckName: d.deckName, labels };
    }
  }
  if (!best) return null;
  const [a, b, ...rest] = best.labels;
  const shared =
    rest.length > 0 ? `${a}, ${b} and ${rest.length} more`
      : b ? `${a} and ${b}`
      : a;
  return { deckName: best.deckName, shared };
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
 * A deck whose commander is not indexed contributes an empty set rather than
 * being dropped, so it can still be the nearest deck for nothing.
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
