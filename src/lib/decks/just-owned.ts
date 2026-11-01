// The deck-row ring's hand-off from the quick-add dock (add a card from anywhere, READINESS O9; Dock K6 to K7).
//
// A deck row rings when its card turns owned under it (`useOwnedRing`, D5, S4). A card the dock's bridge just saved
// to the collection and the reader then adds to the deck never turns owned under a row: its row lands already owned.
// So the dock notes the card as it adds it, and the row that lands for it rings once.
//
// Module state, not a context: the dock and the deck list are siblings far apart in the builder, and the note has to
// outlive the dock row that made it (the add clears the dock's query). A note is read, never taken, on mount, so a
// re-run effect (Strict Mode) still finds it; the ring forgets it when it ends. An add that never lands leaves a note
// that lapses on its own.

/** How long a note waits for its row: the add's round trip, with room for a slow one. */
export const JUST_OWNED_LAPSE_MS = 60_000;

const notes = new Map<string, number>();

/** The dock is adding a card the bridge just saved: its deck row, when it lands, rings. */
export function noteJustOwned(oracleId: string, now: number = Date.now()): void {
  notes.set(oracleId, now + JUST_OWNED_LAPSE_MS);
}

/** Whether a row landing for this card should ring. */
export function isJustOwned(oracleId: string, now: number = Date.now()): boolean {
  const until = notes.get(oracleId);
  if (until === undefined) return false;
  if (until < now) {
    notes.delete(oracleId);
    return false;
  }
  return true;
}

/** The row's ring has run: the note is spent. */
export function forgetJustOwned(oracleId: string): void {
  notes.delete(oracleId);
}
