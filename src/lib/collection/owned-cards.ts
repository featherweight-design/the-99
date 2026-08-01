import { and, eq } from "drizzle-orm";
import { cards, collectionItems } from "../../db/schema";

/**
 * Join predicate for "cards this user owns", shared by the three queries that
 * read the collection: the deck-suggestion pool (app/decks/actions.ts), the
 * commander list (lib/decks/read.ts) and the scoring pool (lib/recs/recommend.ts).
 *
 * `commanderLegalOnly` is a required argument rather than a default because it
 * is a real semantic fork. The first two want legal cards only and filter in
 * SQL. The scoring pool deliberately reads everything so its "unique cards
 * read" figure counts the whole collection, then drops illegal cards in JS —
 * pushing that filter into SQL would silently undercount.
 *
 * The queries keep their own column lists: they genuinely differ, and widening
 * them to a shared superset would make the commander list haul keyword arrays
 * and mana costs it never reads.
 *
 * Callers pair this with `.selectDistinctOn([cards.oracleId], ...)` and
 * `.orderBy(cards.oracleId)` — Postgres requires the DISTINCT ON expression to
 * lead the ORDER BY, so that ordering is load-bearing, not cosmetic.
 */
export function ownedCardsWhere(
  userId: string,
  options: { commanderLegalOnly: boolean },
) {
  return options.commanderLegalOnly
    ? and(eq(collectionItems.userId, userId), eq(cards.commanderLegal, true))
    : eq(collectionItems.userId, userId);
}
