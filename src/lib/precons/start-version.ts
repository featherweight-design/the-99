/**
 * Which of a linked deck's versions IS its precon's list. A start commits the box's list as v0
 * (`writePreconDeckIn`), so the deck's first version and the precon's v0 are one row in Versions, not
 * a committed v1 above a virtual v0 holding the same cards. Starts made before that committed it as v1,
 * and their numbers are left alone (anything that remembers "v2" would silently shift); this rule is
 * what lets the rail draw those decks without the duplicate too.
 *
 * Apart from `origin.ts` and `origin-read.ts`, which never name a version table (lock 4): the virtual v0
 * is still drawn at read, and this module only answers whether the deck's own history already holds it.
 */
import { and, asc, eq } from "drizzle-orm";
import { db } from "../../db";
import { decks, deckVersionCards, deckVersions } from "../../db/schema";
import type { CardQty } from "../decks/draft-diff";
import type { Reader } from "./list-read";
import type { OriginRead } from "./origin";
import { readDeckOrigin } from "./origin-read";

/** How long after its deck a start's version was committed: the start writes both in one transaction. */
export const START_WINDOW_MS = 60_000;

/**
 * Whether the deck's OLDEST version is the start's. A v0 always is: only a start commits one. A v1 is
 * when the deck was made with it (committed within `START_WINDOW_MS` of the deck) and it holds exactly
 * the precon's 99, so a brew committed quickly and linked later keeps its own v1 and its virtual v0.
 */
export function isStartVersion(
  oldest: { number: number; committedAt: Date },
  deckCreatedAt: Date,
  versionCards: readonly CardQty[],
  originCards: readonly CardQty[],
): boolean {
  if (oldest.number === 0) return true;
  if (oldest.number !== 1) return false;
  if (oldest.committedAt.getTime() - deckCreatedAt.getTime() > START_WINDOW_MS) return false;
  const want = new Map(originCards.map((c) => [c.oracleId, c.quantity]));
  return versionCards.length === want.size && versionCards.every((c) => want.get(c.oracleId) === c.quantity);
}

/** The deck's oldest version and when the deck was made. Owner-scoped in its own SQL. Apart so a test can render it. */
export function oldestVersionQuery(userId: string, deckId: string, q: Reader = db) {
  return q
    .select({ id: deckVersions.id, number: deckVersions.number, committedAt: deckVersions.committedAt, deckCreatedAt: decks.createdAt })
    .from(decks)
    .innerJoin(deckVersions, eq(deckVersions.deckId, decks.id))
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
    .orderBy(asc(deckVersions.number))
    .limit(1);
}

/**
 * v0 for one deck, as `readDeckOrigin` reads it, with `startVersionId` set when the deck's own history
 * holds it. The two reads run side by side; the version's cards are read only for a v1 that could be a
 * start's, since a v0 needs no comparison.
 */
export async function readDeckOriginAndStart(userId: string, deckId: string): Promise<OriginRead | null> {
  const [origin, [oldest]] = await Promise.all([readDeckOrigin(userId, deckId), oldestVersionQuery(userId, deckId)]);
  if (!origin || !oldest) return origin;
  const versionCards = oldest.number === 1
    ? await db.select({ oracleId: deckVersionCards.oracleId, quantity: deckVersionCards.quantity })
      .from(deckVersionCards).where(eq(deckVersionCards.versionId, oldest.id))
    : [];
  return isStartVersion(oldest, oldest.deckCreatedAt, versionCards, origin.cards)
    ? { ...origin, summary: { ...origin.summary, startVersionId: oldest.id } }
    : origin;
}
