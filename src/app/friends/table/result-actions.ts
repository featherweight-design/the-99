"use server";

// The life tracker's one write (PR1): the result of a finished game, saved to its table so every seated player's Log
// this game finds it filled in. The reader comes from the session; the library checks the seat, the night and the roster.

import { requireUserId } from "../../../lib/auth";
import { saveTableResult } from "../../../lib/social/rule-zero-result";

export async function saveTableResultAction(tableId: unknown, roster: unknown, placements: unknown): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  return { ok: (await saveTableResult(userId, tableId, roster, placements)) === "saved" };
}
