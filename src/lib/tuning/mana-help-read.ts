import { and, eq } from "drizzle-orm";

import { deckToolCounts } from "../../db/schema";

/**
 * The one Improve-my-mana help read a reader may reopen from History: theirs, on this deck, and a
 * help read (`mana_help`). Built apart from the read so a test pins the emitted SQL.
 */
export function helpReadWhere(countId: string, deckId: string, userId: string) {
  return and(
    eq(deckToolCounts.id, countId),
    eq(deckToolCounts.deckId, deckId),
    eq(deckToolCounts.userId, userId),
    eq(deckToolCounts.tool, "mana_help"),
  );
}
