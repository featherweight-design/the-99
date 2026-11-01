// The deck-row ring's hand-off from the quick-add dock (add a card from anywhere, READINESS O9; Dock K6 to K7).
//
// A deck row rings when its card turns owned under it (`useOwnedRing`, D5, S4). A card the dock's bridge just saved
// to the collection and the reader then adds to the deck never turns owned under a row: its row lands already owned
// (the optimistic row draws before the add's answer). So the dock notes the card once the add lands, and the row for
// it on that deck rings once.
//
// Module state, not a context: the dock and the deck list are siblings far apart in the builder, and the note has to
// outlive the dock row that made it (the add clears the dock's query). Rows subscribe (`subscribeJustOwned`), since a
// row is already on screen when the add's answer arrives. Keyed by deck and card, so a note never rings a row on
// another deck. A ring that has run its full length spends the note. A row that leaves sooner does not (a regroup
// remounts the row, and Strict Mode's dev double mount does too): the row that stands in for it rings what is left,
// and the lapse below spends the rest.

/**
 * How long a note waits for its row. The note is written once the add's answer lands, when the optimistic row is
 * already drawn, so the ring starts at once; the wait only has to cover the page's re-render after the add (the
 * revalidate, which can remount the row in a new group) and a slow one. Measured on the walk, press to ring was
 * 1.2 to 1.3s on a dev server. Ten seconds covers that several times over, and is short enough that a reader who
 * switches views a while later (card view, then rows) does not see a ring for an add long done.
 */
export const JUST_OWNED_LAPSE_MS = 10_000;

const notes = new Map<string, ReturnType<typeof setTimeout>>();
const listeners = new Set<() => void>();

const keyOf = (deckId: string, oracleId: string) => `${deckId}\u0000${oracleId}`;

function emit() {
  for (const l of listeners) l();
}

/** The dock added, and the deck accepted, a card the bridge just saved: its row on this deck rings. */
export function noteJustOwned(deckId: string, oracleId: string): void {
  const key = keyOf(deckId, oracleId);
  const was = notes.get(key);
  if (was !== undefined) clearTimeout(was);
  notes.set(key, setTimeout(() => forgetJustOwned(deckId, oracleId), JUST_OWNED_LAPSE_MS));
  emit();
}

/** Whether this deck's row for this card should ring. */
export function isJustOwned(deckId: string, oracleId: string): boolean {
  return notes.has(keyOf(deckId, oracleId));
}

/** The row's ring has run, or its row has gone: the note is spent. */
export function forgetJustOwned(deckId: string, oracleId: string): void {
  const key = keyOf(deckId, oracleId);
  const t = notes.get(key);
  if (t === undefined) return;
  clearTimeout(t);
  notes.delete(key);
  emit();
}

/** For `useSyncExternalStore`. */
export function subscribeJustOwned(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
