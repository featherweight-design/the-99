"use server";

import { requireUserId } from "../../lib/auth";
import { loadGameHistory } from "../../lib/games/history";
import { cleanGamesFilter } from "../../lib/games/history-filter";
import { decodeCursor, type GameHistoryFilter } from "../../lib/games/history-rules";
import { toGamesPayload, type GamesPayload, type MoreGames } from "../../lib/games/history-wire";

/**
 * The first window of the viewer's game history, for a press on `Games` from Decks or Stats (build PR 2+3) and for a change
 * of filter (PR 4): the view flips in place, as Stats does, instead of navigating to its own URL. Per request and never
 * cached: it is the viewer's own games, read for the viewer alone. Null when the read fails, which the view says in its
 * toast; reads only, so it revalidates nothing.
 */
export async function readGameHistory(filter: GameHistoryFilter = {}): Promise<GamesPayload | null> {
  const userId = await requireUserId();
  try {
    const clean = cleanGamesFilter(filter);
    return toGamesPayload(await loadGameHistory(userId, { filter: clean }), clean);
  } catch {
    return null;
  }
}

/**
 * The next window, for `Show 50 more`. The cursor must be one the read wrote: `loadGameHistory` reads anything else as
 * NO cursor, which would answer with the first window again (and its aggregates), so a bad one is refused here as the
 * failed state instead. The filter is the one the window was read under: a later window of a filtered list is filtered the same. The viewer is the session's, never an argument. Aggregates are not recomputed: the view holds the
 * first window's, and a later window carries none.
 */
export async function loadMoreGamesAction(cursor: string, filter: GameHistoryFilter = {}): Promise<MoreGames> {
  const userId = await requireUserId();
  if (decodeCursor(cursor) === null) return { ok: false };
  try {
    const { games, next } = await loadGameHistory(userId, { cursor, filter: cleanGamesFilter(filter) });
    return { ok: true, games, next };
  } catch {
    return { ok: false };
  }
}
