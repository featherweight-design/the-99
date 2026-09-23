import { sql } from "drizzle-orm";

import { deckProfiles, decks } from "../../db/schema";

// The freshness rule's constants and its list form, apart from `stored.ts` so the deck list
// loader can read them without importing the profile loader behind that module.

/**
 * How long a stored analysis is shown before it is treated as absent.
 *
 * A WEEK, because that is the cadence of the inputs the fingerprint cannot see. The fingerprint
 * covers the deck's own cards and commanders and the catalog generation covers the Monday card
 * ingest, but the Spellbook combo index refreshes weekly and the commander index monthly, and
 * neither stamps anything this row can be compared against. A week bounds how long a stored row
 * can outlive a refresh it cannot see, give or take the hour `cachedDeckProfile` may have held
 * the profile before the press stored it (`computed_at` is when it was STORED, not built). Past
 * that it is not shown, and the reader presses again, which is the same state as never having
 * analyzed.
 */
export const STORED_PROFILE_MAX_AGE_DAYS = 7;

/**
 * The stored permits for every deck in a LIST, as a correlated subquery for the list's projection.
 *
 * A list cannot afford the fingerprint: it is a hash over each deck's whole card list, so checking
 * it per tile would read every `deck_cards` row the player has. `decks.last_edited_at` stands in
 * for it — `touchDeck` stamps that column on every change to what the deck is — and a row computed
 * before the deck's last edit is treated as absent. The proxy errs quiet: a rename also moves the
 * stamp, so a renamed deck's tile drops its chip until the next analysis, where the tab would still
 * show it. It never shows a bracket for cards the analysis did not read.
 *
 * Aliased and qualified on both sides, for the reason AGENTS.md gives about a correlated subquery
 * in a single-table projection.
 */
export function storedPermitsSql(catalog: string) {
  return sql<number[] | null>`(
    select dp.permits from ${deckProfiles} dp
    where dp.deck_id = ${decks}.id
      and dp.user_id = ${decks}.user_id
      and dp.catalog = ${catalog}
      and dp.computed_at >= ${decks}.last_edited_at
      and dp.computed_at > now() - make_interval(days => ${STORED_PROFILE_MAX_AGE_DAYS})
  )`;
}
