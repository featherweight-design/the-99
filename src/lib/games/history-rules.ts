// The pure half of the cross-deck game history (`history.ts`): the window, the filter and the cursor.
// No database import, so a test or a client can reach it.

/** Games a read returns: the handoff's "Show 50 more". */
export const GAME_HISTORY_WINDOW = 50;

export type GameResult = "win" | "loss" | "draw";

/**
 * The filters, all optional and combined with AND. `friend` is a friend's `public_id`; `commander` is a catalog
 * commander's `oracle_id`, matched against either commander slot of any seat (a friend's deck included).
 * A value that is not what its field takes matches NO game, rather than being dropped: a stale chip never widens a list.
 */
export type GameHistoryFilter = {
  deckId?: string;
  result?: string;
  friend?: string;
  commander?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isHistoryUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
export const isGameResult = (v: unknown): v is GameResult => v === "win" || v === "loss" || v === "draw";

/** The keyset position: the last row's `played_at` as Postgres prints it (microseconds, which a JS Date cannot hold) and its id. */
export type GameHistoryCursor = { playedAt: string; id: string };

const TIMESTAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,6})?$/;

export const encodeCursor = (c: GameHistoryCursor): string => `${c.playedAt}|${c.id}`;

/** A cursor this module wrote, or null: anything else reads as no cursor (the first window). */
export function decodeCursor(raw: unknown): GameHistoryCursor | null {
  if (typeof raw !== "string") return null;
  const at = raw.indexOf("|");
  if (at < 0) return null;
  const playedAt = raw.slice(0, at);
  const id = raw.slice(at + 1);
  return TIMESTAMP.test(playedAt) && isHistoryUuid(id) ? { playedAt, id } : null;
}
