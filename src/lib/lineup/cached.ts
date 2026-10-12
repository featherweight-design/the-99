import { cachePageForUser } from "../cache/page-cache";
import { labelGeneration } from "../labels/generation";
import { loadLineup } from "./load";
import type { LineupData } from "./types";

/** The Stats payload, cached per reader as its own entry (keyed on their data stamp, the catalog generation,
 *  the deployment and the switches, `cachePageForUser`), so Tiles pays nothing for it. Its jobs read labels,
 *  so the label generation is in the key too (G3); with that unreadable, the read runs uncached. */
export async function readLineupCached(userId: string): Promise<LineupData> {
  const generation = await labelGeneration();
  if (generation === undefined) return loadLineup(userId);
  return cachePageForUser(userId, "lineup", [`labels:${generation}`], async () => ({ value: await loadLineup(userId), store: true }));
}
