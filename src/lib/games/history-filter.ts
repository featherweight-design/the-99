// The Games view's filters (design handoff `design_handoff_the99_game_history`, build PR 4): which parameters carry them
// on the address, how one reads back, and the key a held payload is filed under. Pure, so the page, the view and a test
// share one definition. The server takes the same `GameHistoryFilter` (`history-rules.ts`) and matches NO game for a
// value that is not what its field takes: a stale address never widens a list, it lands on the no-match frame.
//
// `commander` is taken on `/decks` (it redirects to the builder), so a commander the reader played against rides as
// `against`. Played against is one choice: a friend OR a commander, never both from the controls.

import type { GameHistoryFilter } from "./history-rules";

export const GAMES_FILTER_PARAMS = ["deck", "result", "friend", "against"] as const;

type Read = (key: string) => string | string[] | null | undefined;

const one = (v: string | string[] | null | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

/** The filter an address names. A value is kept as written: the server decides whether it matches anything. */
export function gamesFilterFromParams(read: Read): GameHistoryFilter {
  const out: GameHistoryFilter = {};
  const deckId = one(read("deck"));
  const result = one(read("result"));
  const friend = one(read("friend"));
  const commander = one(read("against"));
  if (deckId) out.deckId = deckId;
  if (result) out.result = result;
  if (friend) out.friend = friend;
  if (commander) out.commander = commander;
  return out;
}

/** The parameters a filter writes: an absence for each field that is off. */
export function gamesFilterToParams(filter: GameHistoryFilter): URLSearchParams {
  const p = new URLSearchParams();
  if (filter.deckId) p.set("deck", filter.deckId);
  if (filter.result) p.set("result", filter.result);
  if (filter.friend) p.set("friend", filter.friend);
  if (filter.commander) p.set("against", filter.commander);
  return p;
}

/** What a payload is filed under: equal filters share a key whatever order their fields were set in. */
export const gamesFilterKey = (f: GameHistoryFilter) => gamesFilterToParams(f).toString();

export const isEmptyGamesFilter = (f: GameHistoryFilter) => gamesFilterKey(f) === "";

/** A filter with exactly the fields a caller names changed: `undefined` takes a field off. */
export function withGamesFilter(f: GameHistoryFilter, change: Partial<GameHistoryFilter>): GameHistoryFilter {
  const next: GameHistoryFilter = { ...f, ...change };
  for (const k of Object.keys(next) as (keyof GameHistoryFilter)[]) if (next[k] === undefined || next[k] === "") delete next[k];
  return next;
}

/** The two Played against fields are one choice: picking either clears the other. */
export const playedAgainstOf = (f: GameHistoryFilter): { kind: "friend" | "commander"; id: string } | null =>
  f.friend ? { kind: "friend", id: f.friend } : f.commander ? { kind: "commander", id: f.commander } : null;

/** What `Filter games` badges on the phone: Result and Played against, the two it holds (the deck is the picker's). */
export const sheetFilterCount = (f: GameHistoryFilter) => (f.result ? 1 : 0) + (f.friend || f.commander ? 1 : 0);

/**
 * What a caller's filter is worth on this side of the wire: a string for each of the four fields, else the field is dropped.
 * A value that is not a real deck, result, friend or commander is the READ's to match against nothing, not this step's.
 */
export function cleanGamesFilter(raw: unknown): GameHistoryFilter {
  const f = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: GameHistoryFilter = {};
  for (const key of ["deckId", "result", "friend", "commander"] as const) {
    const v = f[key];
    if (typeof v === "string" && v !== "") out[key] = v;
  }
  return out;
}
