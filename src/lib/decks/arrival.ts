/** Name of the query param — `?imported=1` — that the import entry surface
 *  (src/components/decks/import-entry.tsx) appends when it pushes the player at
 *  their new deck.
 *
 *  Arrival is provenance, not deck state: it is true of one navigation,
 *  not of the deck, so it lives in the URL rather than in a column. A column
 *  would make "just imported" permanent, and the strip is meant to be gone on
 *  the next visit whether or not it was dismissed. */
export const IMPORTED_PARAM = "imported";

/** Truthy on exactly the value we write. A hand-typed `?imported=maybe` should
 *  not claim an import happened. */
export function arrivedFromImport(value: string | string[] | undefined): boolean {
  return value === "1";
}

/** Per-deck localStorage key for the arrival strip's dismissal.
 *
 *  Keyed on the deck id — never on the imported list's contents — for the same
 *  reason `celebrationKey` is: deck ids are `uuid().defaultRandom()` primary
 *  keys (src/db/schema.ts §decks) and are never reused, so importing the same
 *  list again after deleting the deck produces a new id, a new key, and a strip
 *  that shows. A content-derived key would silence the second import. */
export function arrivalDismissKey(deckId: string): string {
  return `the99:import-arrival-dismissed:${deckId}`;
}
