"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "../../lib/auth";
import { availableFeedKinds, homeFeedEnabled } from "../../lib/feed/flag";
import { closeFeedOffer, parseChosenKinds, setFeedKinds } from "../../lib/feed/prefs";
import { requestSwitchEnv } from "../../lib/switches/request";

export type SaveFeedKindsResult = { ok: true; changed: boolean } | { ok: false; reason: "off" | "invalid" };

/**
 * Settings' news section and the boxes Home's offer line opens (handoff call 7; announcements call 3): saves which kinds the reader hears about. `on`
 * is the kinds checked and `offered` the kinds the form drew; both must be known kinds AVAILABLE to this reader, and
 * every checked kind must be offered, or nothing is written. A kind the form did not offer (its switch was off when
 * the page loaded, even if it has come on since) keeps whatever it had (`nextFeedPrefs`' scope).
 *
 * Refused while `HOME_FEED_ENABLED` is off. Writes only when the choice changes, and revalidates `/settings` only
 * then, as the Spares actions do: the data stamp moves Home's cache, not the router's, so a Back to a cached Settings
 * payload would otherwise seed the boxes with the old choices (review round 4).
 */
export async function saveFeedKinds(on: unknown, offered: unknown): Promise<SaveFeedKindsResult> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!homeFeedEnabled(env)) return { ok: false, reason: "off" };
  const available = availableFeedKinds(env);
  const scope = parseChosenKinds(offered, available);
  const kinds = scope && parseChosenKinds(on, scope);
  if (!scope || !kinds) return { ok: false, reason: "invalid" };
  const changed = await setFeedKinds(userId, kinds, new Date(), scope);
  if (changed) revalidatePath("/settings");
  return { ok: true, changed };
}

export type CloseFeedOfferResult = { ok: true; changed: boolean } | { ok: false; reason: "off" };

/**
 * What's new's offer ✕ (announcements call 3): saves an empty choice for the CALLER (`closeFeedOffer`), and the offer
 * line is gone while any kind is on (with none on, `loadHomeFeed` offers again: its only way back besides Settings). Turns no kind on or off, so Settings draws as it did and nothing is revalidated; Home's next
 * render reads the column. Refused while `HOME_FEED_ENABLED` is off.
 */
export async function closeFeedOfferAction(): Promise<CloseFeedOfferResult> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!homeFeedEnabled(env)) return { ok: false, reason: "off" };
  return { ok: true, changed: await closeFeedOffer(userId, new Date()) };
}
