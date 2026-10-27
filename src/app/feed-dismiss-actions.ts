"use server";

import { requireUserId } from "../lib/auth";
import { homeFeedEnabled } from "../lib/feed/flag";
import { dismissFeedTarget, parseDismissKey } from "../lib/social/feed-dismiss";
import { socialFriendsEnabled } from "../lib/social/flag";
import { requestSwitchEnv } from "../lib/switches/request";

export type DismissResult = { ok: true } | { ok: false; reason: "off" | "invalid" };

/**
 * The ✕ on a What's new item (Home's rows and lead story) or a Waiting on you row (Hugh's ruling 2026-10-27). Refused
 * with both Home's feed and Friends off, since then no row draws one. Revalidates nothing: the row leaves the page at
 * the press, Home's feed and /friends are read per request, and neither cached payload holds a feed item.
 */
export async function dismissFeedItemAction(key: unknown): Promise<DismissResult> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!homeFeedEnabled(env) && !socialFriendsEnabled(env)) return { ok: false, reason: "off" };
  const target = parseDismissKey(key);
  if (!target) return { ok: false, reason: "invalid" };
  await dismissFeedTarget(userId, target);
  return { ok: true };
}
