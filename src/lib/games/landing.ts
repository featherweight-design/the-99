// The landing on a deck's Games tab from the cross-deck Games view (design handoff `design_handoff_the99_game_history`,
// Place W3 and W4): `/decks/<id>?tab=games&game=<id>` scrolls that game's row into view and rings it for two seconds.
// Pure, so the page, the view and a test share one definition of the URL and of what counts as a valid `game`.

import { RING_HOLD_MS } from "../ui/ring-timing";
import { isHistoryUuid } from "./history-rules";

export const GAME_PARAM = "game";

/** How long the arrival ring is held on the row, before its shared fade (`ring-timing.ts`). */
export const LANDING_RING_MS = RING_HOLD_MS;

/** The row's anchor on the Games tab. */
export const gameRowId = (gameId: string) => `game-${gameId}`;

/** A deck's Games tab at one game. */
export const gameHref = (deckId: string, gameId: string) =>
  `/decks/${encodeURIComponent(deckId)}?tab=games&${GAME_PARAM}=${encodeURIComponent(gameId)}`;

/**
 * The game a deck page's URL lands on: `game` read only while the URL names the Games tab, and only a uuid. Anything
 * else (a missing id, an array, a game of another deck) reads nothing, and the tab opens as it always has. Whether the
 * game is on this deck is the panel's: an id not among its rows rings nothing.
 */
export function gameLandingId(query: Record<string, string | string[] | undefined>): string | null {
  if (query.tab !== "games") return null;
  const game = query[GAME_PARAM];
  return isHistoryUuid(game) ? game : null;
}
