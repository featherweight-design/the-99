// Move a copy (#2980): what History reads LIVE beside a frozen `wentTo`. Plain types and one pure rule, no database, so the
// client list and the server reader share them.

/**
 * One card's live standing: whether the Change door applies, the decks that hold a copy right now, and of those the decks a
 * PICK put a copy in (holders now, less the holders commit order alone would give).
 */
export type HistoryLive = {
  change: boolean;
  holders: { id: string; name: string }[];
  gained: { id: string; name: string }[];
};

/**
 * The names `Now X has it.` draws, or null for nothing to say. Said only when a deck the record named holds no copy now, and
 * then X is only the decks a pick put a copy in (several picks, addendum G3): on a five-copy card every holder would name five
 * decks, four of which hold theirs by commit order and are no news. Null with no live read yet, when every deck the record
 * named still holds a copy, or when no pick explains where it went. `wentDeckIds` is the record's, never rewritten.
 */
export function nowHolderNames(wentDeckIds: readonly string[], live: HistoryLive | undefined): string[] | null {
  if (!live || live.gained.length === 0) return null;
  const holding = new Set(live.holders.map((h) => h.id));
  if (wentDeckIds.every((id) => holding.has(id))) return null;
  return live.gained.map((h) => h.name);
}

/**
 * Move a copy (#2980), large entries: the cards of an entry that still have a choice, from its placed card ids and the live read.
 * Distinct, in the order given; a card with no live read yet is not counted (the link waits for it).
 */
export function cardsWithChoice(oracleIds: readonly string[], live: Readonly<Record<string, HistoryLive>>): string[] {
  return [...new Set(oracleIds)].filter((id) => live[id]?.change === true);
}

/**
 * The most ids one read takes: a bound on the wire. One page is up to 50 entries: single-card ones plus the placed cards of
 * multi-card ones (each listed up to HISTORY_MULTI_IDS_MAX). Ids past it are left for the entry's own load when it opens.
 */
export const HISTORY_LIVE_MAX = 500;
