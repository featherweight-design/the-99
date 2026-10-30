"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "../lib/auth";
import { dismissFeedTarget, parseDismissKey } from "../lib/social/feed-dismiss";

export type DismissResult = { ok: true } | { ok: false; reason: "off" | "invalid" };

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
