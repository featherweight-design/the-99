"use server";

import { requireUserId } from "../lib/auth";
import { aboutDismissal } from "../lib/about/notice";
import { heldAnswer, visibleSections } from "../lib/about/pages-visible";
import { aboutSeen, markAboutVisited } from "../lib/about/read";
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
 * - `about` is the keys About's lines claimed (`aboutLine`); the reader's announcements are read AGAIN here, from
 *   their resolved switches, and only the ones still announced are written, each by its `ack`, with the floor raised
 *   (`aboutDismissal`), through `markAboutVisited`, which merges as a page visit does.
 *
 * So a client can drop a key or an id but never add one. Each write moves the reader's data stamp (`user_prefs`,
 * 0123), which retires Home's cached payload, so the next load draws neither half.
 *
 * No revalidation: the banner collapses in the browser, and re-rendering Home inside this reply would pay for a
 * page the reader is already looking at. The arrivals half writes nothing while its switch is off. Returns, when the
 * banner claimed About keys, `heldAnswer` of the state the reader is left at (written or not), which the banner
 * acknowledges in this document (a non-empty set ends the first run there).
 */
export async function dismissArrivals(shown: unknown, about?: unknown): Promise<string[]> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (upcomingPreconsEnabled(env) && Array.isArray(shown) && shown.length > 0) {
    const keys = dismissKeys(shown, seenKeysFor(await readArrivalLines(userId, new Date())));
    if (keys.length > 0) await markUpcomingSeen(userId, keys);
  }
  if (Array.isArray(about) && about.length > 0) {
    const seen = await aboutSeen(userId);
    const visible = visibleSections(env);
    const write = aboutDismissal(about, seen, visible);
    if (write) await markAboutVisited(userId, write.version, write.ids);
    return heldAnswer(visible, seen, write);
  }
  return [];
}
