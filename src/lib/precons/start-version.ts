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

/** A helm, primary and partner, as a version row or a precon's commanders carry it. */
type Helm = { commanderOracleId: string | null; partnerOracleId: string | null };
const helmKey = (h: Helm) => [h.commanderOracleId, h.partnerOracleId].filter((id) => id !== null).sort().join(",");

/**
 * Whether the deck's OLDEST version is the start's list for the precon the deck is linked to NOW. Either
 * way it must hold exactly that precon's 99 under the precon's own commanders (in either order): a deck started from one precon, unlinked and linked to
 * another keeps its v0 as committed and draws the new precon's virtual v0 beneath it. A v0 needs nothing
 * more, since only a start commits one; a v1 must also have been made with its deck (committed within
 * `START_WINDOW_MS`), so a brew committed quickly and linked later keeps its own v1 and its virtual v0.
 */
export function isStartVersion(
  oldest: { number: number; committedAt: Date } & Helm,
  deckCreatedAt: Date,
  versionCards: readonly CardQty[],
  origin: { cards: readonly CardQty[]; helm: Helm },
): boolean {
  if (oldest.number > 1) return false;
  if (helmKey(oldest) !== helmKey(origin.helm)) return false;
  if (oldest.number === 1 && oldest.committedAt.getTime() - deckCreatedAt.getTime() > START_WINDOW_MS) return false;
  const want = new Map(origin.cards.map((c) => [c.oracleId, c.quantity]));
  return versionCards.length === want.size && versionCards.every((c) => want.get(c.oracleId) === c.quantity);
}

/** The deck's oldest version and when the deck was made. Owner-scoped in its own SQL. Apart so a test can render it. */
export function oldestVersionQuery(userId: string, deckId: string, q: Reader = db) {
  return q
    .select({
      id: deckVersions.id,
      number: deckVersions.number,
      committedAt: deckVersions.committedAt,
      commanderOracleId: deckVersions.commanderOracleId,
      partnerOracleId: deckVersions.partnerOracleId,
      deckCreatedAt: decks.createdAt,
    })
    .from(decks)
    .innerJoin(deckVersions, eq(deckVersions.deckId, decks.id))
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
    .orderBy(asc(deckVersions.number))
    .limit(1);
}

/**
 * v0 for one deck, as `readDeckOrigin` reads it, with `startVersionId` set when the deck's own history
 * holds it. The two reads run side by side; the version's cards are read only for a v0 or a v1, the two
 * numbers a start's version can carry.
 */
export async function readDeckOriginAndStart(userId: string, deckId: string): Promise<OriginRead | null> {
  const [origin, [oldest]] = await Promise.all([readDeckOrigin(userId, deckId), oldestVersionQuery(userId, deckId)]);
  if (!origin || !oldest) return origin;
  const versionCards = oldest.number <= 1
    ? await db.select({ oracleId: deckVersionCards.oracleId, quantity: deckVersionCards.quantity })
      .from(deckVersionCards).where(eq(deckVersionCards.versionId, oldest.id))
    : [];
  return isStartVersion(oldest, oldest.deckCreatedAt, versionCards, { cards: origin.cards, helm: origin.summary })
    ? { ...origin, summary: { ...origin.summary, startVersionId: oldest.id } }
    : origin;
}
