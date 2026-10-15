/**
 * The reads behind the Announced group (plan `2026-10-14-upcoming-precons.md`, PR 2): the upcoming sets with the
 * reader's seen state, their revealed commanders, and the precons listed lately. All three ride inside the cached
 * precons payload (E5): the sets and commanders are catalog data the generation retires, the seen state is
 * `user_prefs`, whose `user_data_touch` trigger moves the reader's stamp, and the page keys the entry on the UTC
 * day, which moves the windows.
 */
import type { UpcomingPayload } from "./announced";
import { loadPreconArrivals } from "./arrivals-read";
import { loadRevealedCommanders } from "./revealed";
import { loadUpcomingSets } from "./upcoming";

export async function loadUpcomingPayload(userId: string, now: Date): Promise<UpcomingPayload> {
  const [sets, arrivals] = await Promise.all([loadUpcomingSets(userId, now), loadPreconArrivals(userId, now)]);
  const commanders = await loadRevealedCommanders(sets.map((s) => s.code));
  return { sets, commanders, arrivals };
}
