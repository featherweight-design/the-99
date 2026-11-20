// Move a copy (#2980): what History reads LIVE beside a frozen `wentTo`. Plain types and one pure rule, no database, so the
// client list and the server reader share them.

/** One card's live standing: whether the Change door applies, and the decks that hold a copy right now. */
export type HistoryLive = { change: boolean; holders: { id: string; name: string }[] };

/**
 * The names `Now X has it.` draws, or null for nothing to say: no live read yet, no deck holds the card now, or the holders are
 * exactly the decks the record named (the line already says it). `wentDeckIds` is the record's, never rewritten.
 */
export function nowHolderNames(wentDeckIds: readonly string[], live: HistoryLive | undefined): string[] | null {
  if (!live || live.holders.length === 0) return null;
  const went = new Set(wentDeckIds);
  if (live.holders.length === went.size && live.holders.every((h) => went.has(h.id))) return null;
  return live.holders.map((h) => h.name);
}
