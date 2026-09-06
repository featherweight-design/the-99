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

/** Name of the query param — `?updated=19-6-1` — that an applied update appends.
 *  Separate from `imported` because the two strips state different facts, and a
 *  deck can be freshly imported once and freshly updated many times after. */
export const UPDATED_PARAM = "updated";

/** The counts an update strip prints: cards in, cards out, removals kept. */
export type UpdateArrival = { in: number; out: number; kept: number };

/** What the strip has to say. `"countless"` is state 20: the param is present,
 *  so an update is what brought the player here, but its value is not one this
 *  app wrote and there are no figures to print. */
export type UpdateArrivalState = UpdateArrival | "countless";

/** Reads the `?updated=` value. Null when there is no param at all — the strip
 *  is then absent, as it is on any ordinary visit.
 *
 *  The counts are parsed strictly, and a value that does not match falls back to
 *  the countless strip rather than one printing NaN.
 *
 *  There is deliberately no dismissal key to match `arrivalDismissKey`. Unlike a
 *  first import's strip, an update's shows again on the next update, so its
 *  dismissal lives in component state and is never persisted. */
export function readUpdateArrival(
  value: string | string[] | undefined,
): UpdateArrivalState | null {
  // Only a missing param is an ordinary visit. `?updated=` with nothing after it
  // is still the param, so it gets the countless strip like any other value this
  // app did not write.
  if (value === undefined) return null;
  // A repeated param is present but carries no single value to read, so it lands
  // in the countless case with every other value this app did not write.
  if (typeof value !== "string") return "countless";
  const match = /^(\d+)-(\d+)(?:-(\d+))?$/.exec(value);
  if (!match) return "countless";
  const counts = { in: Number(match[1]), out: Number(match[2]), kept: Number(match[3] ?? 0) };
  // Digits alone are not a number this app could have written: enough of them
  // and `Number` returns Infinity, or an integer past 2^53 that prints in
  // exponent notation. Both land in the countless strip with every other value
  // the app did not write.
  if (!Object.values(counts).every(Number.isSafeInteger)) return "countless";
  return counts;
}
