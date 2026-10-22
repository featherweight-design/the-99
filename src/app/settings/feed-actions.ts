"use server";

import { requireUserId } from "../../lib/auth";
import { availableFeedKinds, homeFeedEnabled } from "../../lib/feed/flag";
import { parseChosenKinds, setFeedKinds } from "../../lib/feed/prefs";
import { requestSwitchEnv } from "../../lib/switches/request";

export type SaveFeedKindsResult = { ok: true; changed: boolean } | { ok: false; reason: "off" | "invalid" };

/**
 * Settings' news section and Home's inline opt-in (handoff call 7): saves which kinds the reader hears about. `on`
 * is the kinds checked; every one must be a known kind AVAILABLE to this reader, or nothing is written. A kind the
 * form could not offer (its switch off for this reader) keeps whatever it had (`nextFeedKinds`' scope).
 *
 * Refused while `HOME_FEED_ENABLED` is off. Writes only when the choice changes, and revalidates nothing: the form
 * holds its own state, and the write moves the reader's data stamp (`user_prefs`), so the next Home load is fresh.
 */
export async function saveFeedKinds(on: unknown): Promise<SaveFeedKindsResult> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!homeFeedEnabled(env)) return { ok: false, reason: "off" };
  const available = availableFeedKinds(env);
  const kinds = parseChosenKinds(on, available);
  if (!kinds) return { ok: false, reason: "invalid" };
  return { ok: true, changed: await setFeedKinds(userId, kinds, new Date(), available) };
}
