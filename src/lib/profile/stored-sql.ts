import { sql } from "drizzle-orm";

import { deckProfiles, decks } from "../../db/schema";

// The deck list's read of the stored bracket, apart from `stored.ts` so the list loader can read
// it without importing the profile loader behind that module.

/**
 * The deck's last analyzed bracket, for the tile's chip.
 *
 * It HOLDS over an edit (ruling 4, Hugh 2026-09-23). The chip shows the bracket the deck was last
 * read at, and the Analysis tab is where staleness is said. So there is no freshness clause here:
 * not the catalog, not the age, not the deck's last edit. The row is scoped to the deck's own
 * owner, which is the only condition a reader of someone else's deck could otherwise pass.
 */
export function storedPermitsSql() {
  return sql<number[] | null>`(
    select dp.permits from ${deckProfiles} dp
    where dp.deck_id = ${decks}.id
      and dp.user_id = ${decks}.user_id
  )`;
}
