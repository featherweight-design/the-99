/**
 * The reads behind the Announced group (plan `2026-10-14-upcoming-precons.md`, PR 2): the upcoming sets with the
 * reader's seen state, their revealed commanders, and the precons listed lately. All three ride inside the cached
 * precons payload (E5): the sets and commanders are catalog data the generation retires, the early lists too (the
 * hourly announcements ingest stamps the generation after a run that wrote a row, `IngestStore.stampCatalog`), the
 * seen state (the early keys included) is `user_prefs`, whose `user_data_touch` trigger moves the reader's stamp when
 * the visit's `after()` write adds a key, and the page keys the entry on the UTC day, which moves the windows.
 */
import { announcementsEnabled } from "../announcements/flag";
import { loadEarlyListsBySet, loadEarlySeen } from "../announcements/early-tiles-read";
import type { UpcomingPayload } from "./announced";
import { loadPreconArrivals } from "./arrivals-read";
import { loadRevealedCommanders } from "./revealed";
import { loadUpcomingSets } from "./upcoming";

/**
 * With `ANNOUNCEMENTS_ENABLED` on for the reader (decided from `env`, the page cache's key), each set's posted early
 * lists and the reader's early seen keys ride along (announcements UI 5); off, neither is read.
 */
export async function loadUpcomingPayload(userId: string, now: Date, env: NodeJS.ProcessEnv): Promise<UpcomingPayload> {
  const [sets, arrivals] = await Promise.all([loadUpcomingSets(userId, now), loadPreconArrivals(userId, now)]);
  const early = announcementsEnabled(env);
  const [commanders, earlyBySet, earlySeen] = await Promise.all([
    loadRevealedCommanders(sets.map((s) => s.code)),
    early ? loadEarlyListsBySet(userId, sets, now) : {},
    early ? loadEarlySeen(userId) : [],
  ]);
  return { sets, commanders, arrivals, early: earlyBySet, earlySeen };
}
