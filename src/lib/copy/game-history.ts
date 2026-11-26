// The cross-deck Games view on /decks (design handoff `design_handoff_the99_game_history`, build PR 2+3, filters PR 4).
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
  /** The filters (build PR 4; the board's `games.filter` strings, and Small items 9's no-match frame). */
  filter: {
    /** The phone's door, and the sheet's title. */
    open: "Filter games",
    close: "Close",
    deck: "Deck",
    allDecks: "All decks",
    result: "Result",
    anyResult: "Any result",
    results: { win: "Won", loss: "Lost", draw: "Drawn" },
    playedAgainst: "Played against",
    search: "Friend or commander",
    friends: "Friends",
    commanders: "Commanders",
    /** An option's count, beside its name: `17 games`. */
    optionCount: games,
    /** The sheet's button: what it would show. A zero stays pressable, so `Show 0 games` lands on the no-match frame. */
    show: (shown: number) => `Show ${games(shown)}`,
    /** DRAFT for `/copy-review` (games tabs, PR 4): the sheet's reset. */
    clearAll: "Clear all filters",
    /** DRAFT: the Result switch's first segment (`Any · Won · Lost · Drawn`). */
    anyShort: "Any",
    /** DRAFT: the Deck panel's search field. */
    deckSearch: "Find a deck",
    /** DRAFT: the Deck panel's foot, for decks with no game under the other filters. */
    deckLeftOut: (k: number) => `${k} ${k === 1 ? "deck" : "decks"} left out: no games logged`,
    /** DRAFT: the Deck list when the search matches nothing. */
    noDeck: "No deck matches.",
    /** DRAFT: the ✕ on the Played against trigger. */
    clearAgainst: "Clear played against",
    /** Undrawn (eng default): the Played against list when the search matches nobody. */
    noOption: "Nothing matches.",
    /** Undrawn (eng default): a chip for a friend an address names who is not the reader's friend now. */
    formerFriend: "Former friend",
    /** Small items 9, A1: the list's place when the filters match nothing, in the shipped Decks empty's words. */
    noMatch: "No games match",
    clearFilters: "Clear filters",
  },
  /** The games tabs' boxes (design handoff `design_handoff_the99_games_tabs`, PR 1). DRAFT: `/copy-review` owns the wording. */
  boxes: {
    /** The summary box's band: `7 games logged · 4 decks`, or the deck's own name in the second slot. */
    band: (total: number, lead: string) => `${games(total)} logged · ${lead}`,
    /** A month box's band: `November 2026 · 4 games`. */
    month: (label: string, k: number) => `${label} · ${games(k)}`,
    /** Spoken for the record mark: `4 wins, 2 losses, 1 draw`. */
    record: (w: number, l: number, d: number) =>
      [`${w} ${w === 1 ? "win" : "wins"}`, `${l} ${l === 1 ? "loss" : "losses"}`, ...(d > 0 ? [`${d} ${d === 1 ? "draw" : "draws"}`] : [])].join(", "),
    cell: { pods: "Pods", played: "Played", last: "Last played", most: "Most played" },
    players: (min: number, max: number) => (min === max ? `${min} players` : `${min} to ${max} players`),
    mostOf: (k: number, total: number) => `${n(k)} of ${n(total)}`,
  },
  /** One game's row in both tabs. */
  row: {
    result: { win: "Won", loss: "Lost", draw: "Drawn" },
    meta: (pod: number, date: string) => `${pod} ${pod === 1 ? "player" : "players"} · ${date}`,
    open: (deck: string) => `Open ${deck}`,
    openShort: "Open deck",
    seats: "Seats",
    helped: "Helped",
    hurt: "Hurt",
    won: "Won",
    someone: "Someone",
    notLogged: "Seat not logged",
    noCommander: "No commander logged",
  },
  /** The summary's facts line under a Played against filter: `HD - Sai with Colin at the table`. */
  scoped: { with: "with", atTable: "at the table" },
  /** The trophy line under a friend filter: `Colin won 2 of the 3 you lost`, the name drawn before this. */
  beatMe: (won: number, losses: number) => ` won ${n(won)} of the ${n(losses)} you lost`,
  empty: {
    title: "No games logged yet.",
    // Copy-reviewed (game history).
    body: "Every game you log, on any deck, lands here: who won, the pod, the date, who sat across the table.",
    pick: "Log one on",
    log: "Log a game",
  },
} as const;
