"use server";

import { requireUserId } from "../lib/auth";
import { dismissKeys, readArrivalLines } from "../lib/precons/banner";
import { seenKeysFor } from "../lib/precons/arrivals";
import { markUpcomingSeen } from "../lib/precons/upcoming";
import { upcomingPreconsEnabled } from "../lib/precons/upcoming-flag";
import { requestSwitchEnv } from "../lib/switches/request";

/**
 * The arrivals banner's ✕ (upcoming precons, handoff call 6): marks seen what the banner showed. `shown` is the
 * page's own `seenKeysFor` of the lines it drew; the reader's lines are read AGAIN here and only keys both name
 * are written (`dismissKeys`). A write moves the reader's data stamp (`user_prefs`, 0123), which retires Home's
 * cached payload, so the next load draws no banner.
 *
 * No revalidation: the banner collapses in the browser, and re-rendering Home inside this reply would pay for a
 * page the reader is already looking at. Switch off, it writes nothing.
 */
export async function dismissArrivals(shown: unknown): Promise<void> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!upcomingPreconsEnabled(env)) return;
  const keys = dismissKeys(shown, seenKeysFor(await readArrivalLines(userId, new Date())));
  if (keys.length > 0) await markUpcomingSeen(userId, keys);
}
