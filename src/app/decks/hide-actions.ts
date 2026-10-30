"use server";

// The ⋯ menu's Hidden from friends (friend decks G2). The write lives in `lib/social/deck-visibility.ts`; nothing here
// names a table.

import { revalidatePath } from "next/cache";
import { requireUserId } from "../../lib/auth";
import { setDeckHiddenFromFriends } from "../../lib/social/deck-visibility";
import { socialFriendsEnabled } from "../../lib/social/flag";
import { requestSwitchEnv } from "../../lib/switches/request";
import { isUuid } from "../../lib/uuid";

export type HideFromFriendsOutcome = { ok: true } | { ok: false; reason: "off" | "invalid" };

/**
 * Refused as `off` unless `SOCIAL_FRIENDS_ENABLED` is on for this reader; `invalid` for a value that is not a boolean or
 * a deck that is not theirs. Revalidates the deck page and `/decks`, which draw the mark. A friend's tab and page read
 * the flag per request, and the stamp trigger on `decks` moves `friendGeneration` for a cached page, so no friend
 * surface needs telling.
 */
export async function setDeckHiddenFromFriendsAction(deckId: unknown, hidden: unknown): Promise<HideFromFriendsOutcome> {
  const userId = await requireUserId();
  if (!socialFriendsEnabled(await requestSwitchEnv(userId))) return { ok: false, reason: "off" };
  if (typeof deckId !== "string" || !isUuid(deckId) || typeof hidden !== "boolean") return { ok: false, reason: "invalid" };
  if (!(await setDeckHiddenFromFriends(userId, deckId, hidden))) return { ok: false, reason: "invalid" };
  revalidatePath(`/decks/${deckId}`);
  revalidatePath("/decks");
  return { ok: true };
}
