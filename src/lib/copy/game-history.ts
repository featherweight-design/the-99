// The cross-deck Games view on /decks (design handoff `design_handoff_the99_game_history`, build PR 2+3, filter-free).
// Every string below is NEW and copy-reviewed (game history, 2026-11-01), the two the board marked DRAFT included.
// Reused, not redefined: the headline's record form and `One game logged.` live in `gameLogCopy.headline`
// (the board's F1 `1 game logged.` yields to the shipped string), the row's own slots in `gameLogCopy.history`, and the
// view switch's `Games` and the recency card's door in `decksStatsCopy`. No percentage, no rate, never `net`.

import { GAME_HISTORY_WINDOW } from "../games/history-rules";
import { gameLogCopy } from "./game-log";

const n = (x: number) => x.toLocaleString("en-US");
const games = (k: number) => `${n(k)} ${k === 1 ? "game" : "games"}`;

export const gameHistoryCopy = {
  /** The line under the view row: what the list holds. */
  count: games,
  /** The summary's headline, in the Games tab's voice: `One game logged.` / `23 games logged. 9–12–2.` */
  headline: (total: number, wins: number, losses: number, draws: number) => {
    if (total === 1) return gameLogCopy.headline.oneGame;
    const record = draws > 0
      ? gameLogCopy.headline.recordWithDraws(String(wins), String(losses), String(draws))
      : gameLogCopy.headline.record(String(wins), String(losses));
    return gameLogCopy.headline.recordOnly(n(total), record);
  },
  /** The first facts line. `6 decks`, or the deck's own name when every game is on one deck. */
  decks: (k: number) => `${n(k)} ${k === 1 ? "deck" : "decks"}`,
  pods: (min: number, max: number) => (min === max ? `pod of ${min}` : `pods of ${min}–${max}`),
  /** `most played <deck>, 8 of 23`: lead, then the deck in bold, then the tail. From PATTERN_MIN games, when one deck leads outright. */
  mostPlayed: { lead: "most played", tail: (k: number, total: number) => `, ${n(k)} of ${n(total)}` },
  /** Copy-reviewed (game history). Under PATTERN_MIN games the headline is a count and this says where games come from. */
  low: "Games from every deck land here, newest first.",
  /** The window's foot: what is shown of the whole, and the press for more. */
  window: (shown: number, total: number) => `Showing ${n(shown)} of ${games(total)}`,
  more: `Show ${GAME_HISTORY_WINDOW} more`,
  loading: "Loading…",
  all: (total: number) => `All ${games(total)}`,
  failed: "We couldn’t load your games.",
  moreFailed: "We couldn’t load more games.",
  retry: "Try again",
  empty: {
    title: "No games logged yet.",
    // Copy-reviewed (game history).
    body: "Every game you log, on any deck, lands here: who won, the pod, the date, who sat across the table.",
    pick: "Log one on",
    log: "Log a game",
  },
} as const;
