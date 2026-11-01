// What the Games view on /decks carries across the server boundary (build PR 2+3, filters PR 4). Types and one pure step:
// no database import, so the client view and a test reach it. The read's `playedAgainst` options ride with every first
// window now: the filters draw them (friends as `ThirdPartyName`s with a `public_id`, never an account id).

import type { GameHistory, HistoryAggregates, HistoryGame } from "./history";
import type { GameHistoryFilter } from "./history-rules";

export type GamesAggregates = HistoryAggregates;

/** The first window and what summarizes the whole history. */
export type GamesPayload = {
  /** The filter this window was read under: the payload names its own, so a held one can never be drawn under another's controls. */
  filter: GameHistoryFilter;
  games: HistoryGame[];
  /** Pass to `loadMoreGamesAction` for the next window; null at the end. */
  next: string | null;
  aggregates: GamesAggregates;
};

/** A later window: rows and the position after them, never aggregates. `ok: false` is the view's failed state. */
export type MoreGames = { ok: true; games: HistoryGame[]; next: string | null } | { ok: false };

/** The first window as the view takes it; null when the read carried no aggregates (it was not a first window). */
export function toGamesPayload(history: GameHistory, filter: GameHistoryFilter = {}): GamesPayload | null {
  if (!history.aggregates) return null;
  return { filter, games: history.games, next: history.next, aggregates: history.aggregates };
}
