"use client";

// The tracker's game on this device: read from local storage after mount (so the server markup and the first client
// markup agree), written back on every change, and gone once the table has closed. Storage that throws or is full
// only costs the saved copy, never the game in hand.

import { useCallback, useEffect, useState } from "react";
import { commit as commitAction, undo as undoAction, type Action, type Game } from "../../lib/tracker/engine";
import { discardGame, loadGame, saveGame } from "../../lib/tracker/storage";

export const local = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export function useGame(tableId: string, expiresAt: number) {
  const [ready, setReady] = useState(false);
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    const s = local();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the saved game exists only in the browser, so it is read after mount
    setGame(s ? loadGame(s, tableId, Date.now()) : null);
    setReady(true);
  }, [tableId]);

  useEffect(() => {
    const s = local();
    if (ready && s && game) saveGame(s, game, expiresAt);
  }, [ready, game, expiresAt]);

  const start = useCallback((g: Game) => setGame(g), []);
  const commit = useCallback((a: Action) => setGame((g) => (g ? commitAction(g, a) : g)), []);
  const undo = useCallback(() => setGame((g) => (g ? undoAction(g) : g)), []);
  /** Stamps when the result first showed; a game already stamped keeps its time. */
  const finish = useCallback((at: number) => setGame((g) => (g && g.endedAt === undefined ? { ...g, endedAt: at } : g)), []);
  const discard = useCallback(() => {
    const s = local();
    if (s) discardGame(s, tableId);
    setGame(null);
  }, [tableId]);

  return { ready, game, start, commit, undo, discard, finish };
}
