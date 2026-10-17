"use server";

import { requireUserId } from "../lib/auth";
import { firstRunTourEnabled } from "../lib/discovery/onboarding-flag";
import { spendTour } from "../lib/discovery/tour";
import { requestSwitchEnv } from "../lib/switches/request";

/**
 * Spends the first-run tour (plan `2026-10-16-discovery-r2-r3.md`, R3·1a): the tour calls it when it opens, so a
 * reload, a closed tab or Back never shows it again. Refuses nothing it can see: with `FIRST_RUN_TOUR_ENABLED` off
 * for the reader there was no tour to spend, so nothing is written. `spendTourWrite` writes only while
 * `tour_seen_at` is null, so the tour taken again keeps its first date. Revalidates nothing: the write's stamp
 * move already retires Home's and `/decks`' cached payloads.
 */
export async function spendTourAction(): Promise<void> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!firstRunTourEnabled(env)) return;
  await spendTour(userId);
}
