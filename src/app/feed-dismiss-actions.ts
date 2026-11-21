"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "../lib/auth";
import { clearFeedKeys, dismissFeedTarget, parseClearKeys, parseDismissKey, restoreFeedKeys } from "../lib/social/feed-dismiss";

export type DismissResult = { ok: true } | { ok: false; reason: "off" | "invalid" };
/** Clear all's result carries the keys it newly wrote, which is all Undo may lift. */
export type ClearResult = { ok: true; cleared: string[] } | { ok: false; reason: "off" | "invalid" };

/**
 * The ✕ on a What's new item (Home's rows and lead story) or a Waiting on you row (Hugh's ruling 2026-10-27). Revalidates Home and /friends, the two pages that
 * draw a ✕, so the one it was pressed on is redrawn with the shell's counts (the Home slot, the Friends badge), which
 * the press alone cannot move. Neither cached payload holds a feed item, so no data stamp is needed.
 */
export async function dismissFeedItemAction(key: unknown): Promise<DismissResult> {
  const userId = await requireUserId();
  const target = parseDismissKey(key);
  if (!target) return { ok: false, reason: "invalid" };
  await dismissFeedTarget(userId, target);
  revalidatePath("/");
  revalidatePath("/friends");
  return { ok: true };
}

/**
 * Clear all of What's new: the ✕'s dismissal for every key Home counts, in one statement (all or nothing, matching the
 * restore-everything failure). Keys come from the client, so each is checked and the count capped; a stored item is
 * written only from the reader's own row. Revalidates what the ✕ does.
 */
export async function clearFeedItemsAction(keys: unknown): Promise<ClearResult> {
  const userId = await requireUserId();
  const parsed = parseClearKeys(keys);
  if (!parsed) return { ok: false, reason: "invalid" };
  const cleared = await clearFeedKeys(userId, parsed);
  revalidatePath("/");
  revalidatePath("/friends");
  return { ok: true, cleared };
}

/** Undo for Clear all: lifts the reader's own dismissals for the keys it just wrote. */
export async function restoreFeedItemsAction(keys: unknown): Promise<DismissResult> {
  const userId = await requireUserId();
  const parsed = parseClearKeys(keys);
  if (!parsed) return { ok: false, reason: "invalid" };
  await restoreFeedKeys(userId, parsed);
  revalidatePath("/");
  revalidatePath("/friends");
  return { ok: true };
}
