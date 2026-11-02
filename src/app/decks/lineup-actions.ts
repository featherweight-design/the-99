"use server";

import { requireUserId } from "../../lib/auth";
import { requestFlags } from "../../lib/flags/request";
import { readLineupCached } from "../../lib/lineup/cached";
import type { LineupData } from "../../lib/lineup/types";

/**
 * The Stats payload, for a press on `Stats` from Tiles (Stats on /decks): the same cached read the page makes
 * for `?view=stats`, so the view flips in place rather than navigating to its own URL. Reads only, so it revalidates
 * nothing.
 */
export async function readLineupStats(): Promise<LineupData | null> {
  const userId = await requireUserId();
  const env = await requestFlags(userId);
  return readLineupCached(userId, env);
}
