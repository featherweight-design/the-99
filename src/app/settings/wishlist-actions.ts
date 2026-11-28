"use server";

// Cart on your wishlist (call 1 and M1): Settings › Wishlist's switch and deck picker, and the deck ⋯ menu's Keep off
// my wishlist, which writes the same column as the picker's tick. The writes live in `lib/wishlist/`; nothing here
// names a table. Both change the synced set, so both run the pass before they return (`syncWishlistNow`; the switch's
// inside `setWishlistSync`): a pass after the response loses the race with the next visit to Wishlist (#3441).
//
// Revalidation: `/settings`, `/decks` with every deck page under it (the ⋯ row draws only while the switch is on,
// and draws the deck's choice), and Wishlist, whose deck boxes a Keep off adds or removes (Back from the deck page
// would otherwise draw the cached page). The cached `/decks` payload keys on the data stamp, which both columns'
// triggers move.

import { revalidatePath } from "next/cache";
import { requireUserId } from "../../lib/auth";
import { setWishlistSync, syncWishlistNow } from "../../lib/wishlist/sync";
import { setDecksOffWishlist } from "../../lib/wishlist/sync-settings";
import { MAX_DECKS_PER_WRITE } from "../../lib/wishlist/deck-write-cap";
import { isUuid } from "../../lib/uuid";

export type WishlistSyncOutcome = { ok: true } | { ok: false; reason: "invalid" };

function refresh() {
  revalidatePath("/settings");
  revalidatePath("/decks", "layout");
  revalidatePath("/collection/wishlist");
}

/** The switch. `invalid` for anything but a boolean. Off quietly removes the synced lines (H2, `setWishlistSync`). */
export async function setWishlistSyncAction(on: unknown): Promise<WishlistSyncOutcome> {
  const userId = await requireUserId();
  if (typeof on !== "boolean") return { ok: false, reason: "invalid" };
  await setWishlistSync(userId, on);
  refresh();
  return { ok: true };
}

/**
 * Leaves decks out of the sync (`off` true) or puts them back: one deck for a tick or the ⋯ row, every chosen deck
 * for the picker's Clear. `invalid` for a list that is empty, too long, holds a non-uuid, or names a deck that is not
 * the reader's (then nothing is written).
 */
export async function setDecksOffWishlistAction(deckIds: unknown, off: unknown): Promise<WishlistSyncOutcome> {
  const userId = await requireUserId();
  if (
    !Array.isArray(deckIds) || deckIds.length === 0 || deckIds.length > MAX_DECKS_PER_WRITE ||
    !deckIds.every((id): id is string => typeof id === "string" && isUuid(id)) || typeof off !== "boolean"
  ) {
    return { ok: false, reason: "invalid" };
  }
  if (!(await setDecksOffWishlist(userId, deckIds, off))) return { ok: false, reason: "invalid" };
  await syncWishlistNow(userId);
  refresh();
  return { ok: true };
}
