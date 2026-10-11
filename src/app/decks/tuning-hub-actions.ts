"use server";

import { requireUserId } from "../../lib/auth";
import { tuningHubEnabled } from "../../lib/tuning/flag";
import { readHubTiles } from "../../lib/tuning/hub-read";
import type { HubTiles } from "../../lib/tuning/hub-tiles";
import { isUuid } from "../../lib/uuid";

/**
 * The Tuning hub landing's one read (the tile status lines). A PUBLIC ENDPOINT: null when the
 * switch is off or the id is not a uuid, and the read itself names the reader, so another
 * player's deck id returns no runs rather than theirs.
 */
export async function readTuningHub(deckId: string): Promise<HubTiles | null> {
  const userId = await requireUserId();
  if (!tuningHubEnabled() || !isUuid(deckId)) return null;
  return readHubTiles(deckId, userId);
}
