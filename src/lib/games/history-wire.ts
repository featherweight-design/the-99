// What the Games view on /decks carries across the server boundary (build PR 2+3, filter-free). Types and one pure step:
// no database import, so the client view and a test reach it. The read's `playedAgainst` options are the filters' (PR 4)
// and hold friends' names, so they are left out here rather than shipped to a view that draws none of them.

import type { GameHistory, HistoryAggregates, HistoryGame } from "./history";

export type GamesAggregates = Omit<HistoryAggregates, "playedAgainst">;

/** The first window and what summarizes the whole history. */
export type GamesPayload = {
  games: HistoryGame[];
  /** Pass to `loadMoreGamesAction` for the next window; null at the end. */
  next: string | null;
  aggregates: GamesAggregates;
};

/** A later window: rows and the position after them, never aggregates. `ok: false` is the view's failed state. */
export type MoreGames = { ok: true; games: HistoryGame[]; next: string | null } | { ok: false };

/** The first window as the view takes it; null when the read carried no aggregates (it was not a first window). */
export function toGamesPayload(history: GameHistory): GamesPayload | null {
  if (!history.aggregates) return null;
  const { total, months, summary } = history.aggregates;
  return { games: history.games, next: history.next, aggregates: { total, months, summary } };
}
