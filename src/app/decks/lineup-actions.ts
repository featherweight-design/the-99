"use server";

import { requireUserId } from "../../lib/auth";
import { requestSwitchEnv } from "../../lib/switches/request";
import { lineupEnabled } from "../../lib/decks/lineup-flag";
import { readLineupCached } from "../../lib/lineup/cached";
import type { LineupData } from "../../lib/lineup/types";

/**
 * The Stats payload, for a press on `Stats` from Tiles (Stats on /decks): the same cached read the page makes
 * for `?view=stats`, so the view flips in place rather than navigating to its own URL. Null with the switch
 * off. Reads only, so it revalidates nothing.
 */
export async function readLineupStats(): Promise<LineupData | null> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!lineupEnabled(env)) return null;
  return readLineupCached(userId);
}
