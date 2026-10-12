import { cachePageForUser } from "../cache/page-cache";
import { loadLineup } from "./load";
import type { LineupData } from "./types";

/** The Stats payload, cached per reader as its own entry (keyed on their data stamp, the catalog generation,
 *  the deployment and the switches, `cachePageForUser`), so Tiles pays nothing for it. */
export function readLineupCached(userId: string): Promise<LineupData> {
  return cachePageForUser(userId, "lineup", [], async () => ({ value: await loadLineup(userId), store: true }));
}
