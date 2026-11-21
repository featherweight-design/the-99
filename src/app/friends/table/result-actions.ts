"use server";

// The life tracker's table result (PR1): the result of a finished game, saved to its table so every seated player's Log
// this game finds it filled in, and taken back by Undo until someone seated logs it (addendum 2026-11-21). The reader
// comes from the session; the library checks the seat, the night and the roster.

import { requireUserId } from "../../../lib/auth";
import { gameLogged, saveTableResult, undoTableResult, type GameLogged, type UndoResult } from "../../../lib/social/rule-zero-result";

export async function saveTableResultAction(tableId: unknown, roster: unknown, placements: unknown): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  return { ok: (await saveTableResult(userId, tableId, roster, placements)) === "saved" };
}

/** Undo a mistaken ending: takes the game's saved result back, unless someone seated has logged it (`logged`). */
export async function undoTableResultAction(tableId: unknown, roster: unknown): Promise<{ result: UndoResult }> {
  const userId = await requireUserId();
  return { result: await undoTableResult(userId, tableId, roster) };
}

/** Who logged the game first (the U3 note), read when the Result or the Last game card opens. */
export async function gameLoggedAction(tableId: unknown, roster: unknown): Promise<GameLogged | null> {
  const userId = await requireUserId();
  return gameLogged(userId, tableId, roster);
}
