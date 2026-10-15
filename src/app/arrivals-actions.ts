"use server";

import { requireUserId } from "../lib/auth";
import { aboutSheetEnabled } from "../lib/about/flag";
import { aboutDismissal } from "../lib/about/notice";
import { aboutSeen, markAboutVisited } from "../lib/about/read";
import { visibleEntries } from "../lib/about/visible";
import { dismissKeys, readArrivalLines } from "../lib/precons/banner";
import { seenKeysFor } from "../lib/precons/arrivals";
import { markUpcomingSeen } from "../lib/precons/upcoming";
import { upcomingPreconsEnabled } from "../lib/precons/upcoming-flag";
import { requestSwitchEnv } from "../lib/switches/request";

/**
 * The Home banner's ✕ (upcoming precons, handoff call 6; About on the banner, Q2): marks seen what the banner
 * showed, both halves.
 *
 * - `shown` is the page's own `seenKeysFor` of the arrival lines it drew; the reader's lines are read AGAIN here and
 *   only keys both name are written (`dismissKeys`).
 * - `about` is the ids About's line claimed (`aboutLine`); the reader's notice is read AGAIN here and only the ids
 *   it still names are written, through `markAboutVisited`, as a `/about` visit writes them (`aboutDismissal`).
 *
 * So a client can drop a key or an id but never add one. Each write moves the reader's data stamp (`user_prefs`,
 * 0123), which retires Home's cached payload, so the next load draws neither half.
 *
 * No revalidation: the banner collapses in the browser, and re-rendering Home inside this reply would pay for a
 * page the reader is already looking at. A half whose switch is off writes nothing.
 */
export async function dismissArrivals(shown: unknown, about?: unknown): Promise<void> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (upcomingPreconsEnabled(env) && Array.isArray(shown) && shown.length > 0) {
    const keys = dismissKeys(shown, seenKeysFor(await readArrivalLines(userId, new Date())));
    if (keys.length > 0) await markUpcomingSeen(userId, keys);
  }
  if (aboutSheetEnabled(env) && Array.isArray(about) && about.length > 0) {
    const write = aboutDismissal(about, await aboutSeen(userId), visibleEntries(env));
    if (write) await markAboutVisited(userId, write.version, write.ids);
  }
}
