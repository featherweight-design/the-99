// When a deck was last worked on, and which act it was.
//
// Home's resume block is the only consumer: it orders by this and each row
// prints the verb, so the order is a claim and the stamp is its evidence.
//
// The `greatest()` is computed here rather than in SQL. The three timestamps are
// already on the row for other reasons, and a second ordering expression in the
// query would be a second definition of the same rule — the one that would go
// stale when a fourth kind of work is added.

export type TouchVerb = "edited" | "committed" | "played";

/** The subset of `DeckListItem` this module reads. Field names are its names. */
export type TouchableDeck = {
  id: string;
  name: string;
  lastEditedAt: Date;
  lastCommittedAt: Date | null;
  lastPlayedAt: Date | null;
};

export type Touch = { at: Date; verb: TouchVerb };

/**
 * The most recent of the three, and what it was.
 *
 * `lastEditedAt` is never null — the column is NOT NULL and defaults to the
 * deck's creation — so every deck has an answer and the block never has to draw
 * a row with no stamp.
 *
 * Ties resolve **committed > played > edited**. An equal instant is not a
 * coincidence: `pullCardFromDeck` edits and commits in one transaction, so both
 * columns carry that transaction's `now()`, and the commit is the act that
 * contains the edit. A game logged in the same instant as an edit is the rarer
 * pair and reads better as the game — the edit is what the player did to the
 * list, the game is what they did with the deck.
 */
export function touchedBy(deck: TouchableDeck): Touch {
  let best: Touch = { at: deck.lastEditedAt, verb: "edited" };
  if (deck.lastPlayedAt !== null && deck.lastPlayedAt.getTime() >= best.at.getTime()) {
    best = { at: deck.lastPlayedAt, verb: "played" };
  }
  if (deck.lastCommittedAt !== null && deck.lastCommittedAt.getTime() >= best.at.getTime()) {
    best = { at: deck.lastCommittedAt, verb: "committed" };
  }
  return best;
}

/**
 * Most recently touched first, then name, then id.
 *
 * The name tiebreak is the handoff's, and it is what makes the order stable
 * between two renders of the same list: `lower()` because the ordering a player
 * sees must not turn on case, and the id after it because deck names are not
 * unique — the same pair of reasons `listDecksWithStats` gives for its own
 * tiebreaks.
 *
 * Compared by code point rather than `localeCompare`, which reads the runtime's
 * locale: this runs on the server today and could run in a browser tomorrow, and
 * the two must not disagree about the same two names.
 */
export function byTouched(a: TouchableDeck, b: TouchableDeck): number {
  const diff = touchedBy(b).at.getTime() - touchedBy(a).at.getTime();
  if (diff !== 0) return diff;
  const an = a.name.toLowerCase();
  const bn = b.name.toLowerCase();
  if (an !== bn) return an < bn ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * The elapsed figure, as the copy module's shape asks for it.
 *
 * Every relative date on Home measures against the one clock the page reads on
 * the server, which is why `now` is a parameter and never `new Date()` here.
 *
 * There is no "just now": a stamp of 0 is not news, so anything under an hour
 * reads `0h ago`. A future timestamp — a game the player logged with tomorrow's
 * date — clamps to the same 0 rather than printing a negative figure.
 */
export function elapsed(at: Date, now: Date): { unit: "hours" | "yesterday" | "days" | "weeks" | "months"; value: number } {
  const hours = Math.max(0, Math.floor((now.getTime() - at.getTime()) / 3_600_000));
  if (hours < 24) return { unit: "hours", value: hours };
  const days = Math.floor(hours / 24);
  if (days === 1) return { unit: "yesterday", value: 1 };
  if (days < 7) return { unit: "days", value: days };
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return { unit: "weeks", value: weeks };
  return { unit: "months", value: Math.floor(days / 30) };
}
