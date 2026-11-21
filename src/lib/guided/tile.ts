import { desc, inArray } from "drizzle-orm";

import { db } from "../../db";
import { guidedBuilds } from "../../db/schema";
import { UPGRADE_REAP_MS } from "../precons/upgrade/constants";
import { GUIDED_LINE_HOURS } from "./constants";

/**
 * What a deck's tile shows of its newest guided run (G6): `running` while pending, `short` for a run refunded for falling short,
 * `failed` for a failed one. A finished run that kept its charge, a run older than the line's day, and a deck with no run are all
 * absent. `startedAt` is the run's `created_at`, the clock the running line counts from, and `strategyLabel` is the X in
 * `Sharpening toward X`. Nothing else about the run rides the list payload: the page's own window reads the rest.
 */
export type GuidedTile = { startedAt: Date; status: "running" | "short" | "failed"; strategyLabel: string };

/** The newest run per deck among `deckIds`, filtered to the ones a tile draws. Keyed by deck id. The `user_data_touch` trigger on `guided_builds` keeps the cached list honest. */
export async function loadGuidedTiles(deckIds: readonly string[], now = Date.now()): Promise<Map<string, GuidedTile>> {
  const out = new Map<string, GuidedTile>();
  if (deckIds.length === 0) return out;
  const rows = await db
    .selectDistinctOn([guidedBuilds.deckId], {
      deckId: guidedBuilds.deckId, strategyLabel: guidedBuilds.strategyLabel, status: guidedBuilds.status, refunded: guidedBuilds.refunded, createdAt: guidedBuilds.createdAt,
    })
    .from(guidedBuilds)
    .where(inArray(guidedBuilds.deckId, [...deckIds]))
    .orderBy(guidedBuilds.deckId, desc(guidedBuilds.createdAt));
  for (const r of rows) {
    const startedAt = new Date(r.createdAt);
    const status = r.status === "pending" ? "running" : r.status === "failed" ? "failed" : r.refunded ? "short" : null;
    if (!status) continue;
    // A pending row the reaper has not reached yet is not drawn as running: past its limit the run is dead.
    if (status === "running" ? now - startedAt.getTime() >= UPGRADE_REAP_MS : now - startedAt.getTime() >= GUIDED_LINE_HOURS * 3_600_000) continue;
    out.set(r.deckId, { startedAt, status, strategyLabel: r.strategyLabel });
  }
  return out;
}
