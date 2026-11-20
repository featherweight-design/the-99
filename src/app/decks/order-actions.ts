"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "../../lib/auth";
import { isUuid } from "../../lib/uuid";
import { reorderDecksFor } from "../../lib/decks/order";
import { MAX_REORDER } from "../../lib/decks/order-plan";

// Saves an arrangement from Arrange mode. The argument is checked at runtime, as every Server
// Action's is: a non-array, a non-uuid, a duplicate or an oversize list is refused before any
// query. The user id comes from the session; the transaction scopes every read and write to it,
// so another player's deck id fails the set check rather than being touched.
//
// `/decks` and the deck page (its sibling names) are revalidated, and the write to `decks`
// retires the Home and /decks list cache through the `user_data_touch` trigger.
export async function reorderDecksAction(ids: unknown): Promise<boolean> {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_REORDER) return false;
  if (!ids.every(isUuid)) return false;
  const list = (ids as string[]).map((id) => id.toLowerCase());
  if (new Set(list).size !== list.length) return false;
  const userId = await requireUserId();

  const ok = await reorderDecksFor(userId, list);
  revalidatePath("/decks");
  revalidatePath("/decks/[id]", "page");
  return ok;
}
