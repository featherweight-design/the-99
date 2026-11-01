"use client";

// The Games view's filters as state (design handoff `design_handoff_the99_game_history`, build PR 4). The drawn payload
// names the filter it was read under (`GamesPayload.filter`), so what is on screen and what the controls say cannot
// disagree. A change asks the server for the first window under the new filter, once per distinct filter this visit:
// the payloads are kept in the component and a repeat is served from them (docs/agents/code-rules.md, "Caching a list a
// reader flips between"), never Next's `staleTimes`. The address is written with `mirrorUrl`, defaults as absences, and
// every parameter this view does not own is read back off the live URL.

import { useCallback, useEffect, useRef, useState } from "react";
import { readGameHistory } from "../../app/decks/game-history-actions";
import { GAMES_FILTER_PARAMS, gamesFilterKey, gamesFilterToParams } from "../../lib/games/history-filter";
import type { GameHistoryFilter } from "../../lib/games/history-rules";
import type { GamesPayload } from "../../lib/games/history-wire";
import { mirrorUrl } from "../../lib/url/mirror";

/** The live address with the Games filters set to `filter` (and `view=games` on it); every other parameter is left as it is. */
export function gamesFilterUrl(filter: GameHistoryFilter): string {
  const live = new URLSearchParams(window.location.search);
  for (const key of GAMES_FILTER_PARAMS) live.delete(key);
  for (const [key, value] of gamesFilterToParams(filter)) live.set(key, value);
  live.set("view", "games");
  return `${window.location.pathname}?${live}`;
}

export function useGamesFilters(data: GamesPayload, onData: (next: GamesPayload) => void) {
  // State rather than a ref, so a payload is filed and shown in one pass.
  const [cache, setCache] = useState<ReadonlyMap<string, GamesPayload>>(() => new Map([[gamesFilterKey(data.filter), data]]));
  const [prev, setPrev] = useState(data);
  // A fresh payload always wins over a cached entry for its key, and is filed on its way past, adjusted during render.
  if (data !== prev) {
    setPrev(data);
    setCache((m) => new Map(m).set(gamesFilterKey(data.filter), data));
  }
  // The filter being read for, while a read runs: the controls show it at once, the list stays what it was.
  const [asked, setAsked] = useState<GameHistoryFilter | null>(null);
  // The filter whose read failed, kept so `Try again` asks for it.
  const [failed, setFailed] = useState<GameHistoryFilter | null>(null);
  const ticket = useRef(0);
  // A read that returns after the reader left the view draws nothing and writes no address.
  useEffect(() => () => { ticket.current += 1; }, []);

  const change = useCallback((next: GameHistoryFilter) => {
    const mine = ++ticket.current;
    setFailed(null);
    const hit = cache.get(gamesFilterKey(next));
    if (hit) {
      setAsked(null);
      onData(hit);
      mirrorUrl(gamesFilterUrl(next));
      return;
    }
    setAsked(next);
    readGameHistory(next)
      .then((res) => {
        if (ticket.current !== mine) return;
        setAsked(null);
        if (!res) { setFailed(next); return; }
        onData(res);
        mirrorUrl(gamesFilterUrl(next));
      })
      .catch(() => {
        if (ticket.current !== mine) return;
        setAsked(null);
        setFailed(next);
      });
  }, [cache, onData]);

  return {
    /** What the controls say: the filter being read for, else the one drawn. */
    filter: asked ?? data.filter,
    /** A read for a new filter is out. */
    pending: asked !== null,
    failed: failed !== null,
    change,
    retry: () => { if (failed) change(failed); },
    dismissFailed: () => setFailed(null),
  };
}
