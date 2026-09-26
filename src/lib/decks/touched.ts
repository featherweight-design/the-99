// When a deck was last worked on, and which act it was.
//
// Home's resume block is the only consumer: it orders by this and each row
// prints the verb, so the order is a claim and the stamp is its evidence.
//
// The `greatest()` is computed here rather than in SQL. The three timestamps are
// already on the row for other reasons, and a second ordering expression in the
// query would be a second definition of the same rule — the one that would go
// stale when a fourth kind of work is added.

/**
 * A note on the three clocks. `last_edited_at` and `committed_at` are both
 * written with Postgres's `clock_timestamp()`, read when each statement runs and
 * so after it has waited for the deck row's lock — `now()` would be the
 * transaction's start, which can predate a write it actually followed.
 * `deck_games.played_at` is the date the game was PLAYED,
 * which the log lets the player set and which therefore may be days old and does
 * not come from the database's clock at all. That is the column's contract, not
 * a gap in it — Home's shipped resume order has always read it — and it is why
 * this module compares instants rather than trying to rank three writers by
 * whose clock wrote them.
 */
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
 * A tie between a commit and an edit resolves to **edited**, and the reason is a
 * migration rather than a preference. `0024_flaky_sharon_ventura` stamped a
 * synthetic v1 on every already-full deck with `committed_at = decks.created_at`,
 * and `0030` seeds `last_edited_at` from that same `created_at` — so every deck
 * that existed and was full before versioning shipped carries the two columns at
 * exactly the same instant, having never been committed by anybody. Letting the
 * commit win that tie would print `committed 3mo ago` on a deck whose owner has
 * never pressed the control. A commit therefore has to be STRICTLY newer than
 * the edit to name the row.
 *
 * `pullCardFromDeck` used to be the case that argued the other way: it stamped
 * the edit and then committed, both within one millisecond. Since 2026-09-27 a
 * pull commits nothing, so it stamps the edit alone and the row reads `edited`.
 * The migration case is what decides this rule.
 *
 * A game takes its tie against both, which is why it is tested last here.
 * Nothing writes a game together with an edit or a commit in one transaction, so
 * an equal instant against either is two `Date` values colliding at the
 * millisecond — Postgres keeps microseconds and this does not — rather than a
 * fact about which came first. The edit and the commit are both written with
 * `clock_timestamp()`, read after each has waited for the deck row's lock, so a
 * tie between those two is only ever the migration's. When a tie carries no information, the act that
 * happened to the deck in the world is worth more on the row than a snapshot
 * taken of it.
 */
export function touchedBy(deck: TouchableDeck): Touch {
  let best: Touch = { at: deck.lastEditedAt, verb: "edited" };
  if (deck.lastPlayedAt !== null && deck.lastPlayedAt.getTime() >= best.at.getTime()) {
    best = { at: deck.lastPlayedAt, verb: "played" };
  }
  // `>`, not `>=` — see the migration note above.
  if (deck.lastCommittedAt !== null && deck.lastCommittedAt.getTime() > best.at.getTime()) {
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
