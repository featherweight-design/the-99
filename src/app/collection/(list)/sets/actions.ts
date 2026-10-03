"use server";

// The index's search reaches the whole collectible catalogue, not only the reader's sets,
// so it is a server action rather than part of the cached page payload: the results depend
// on a query typed after the page rendered, and caching them per reader would file another
// reader's catalogue under this one's tag.

import { requireUserId } from "../../../../lib/auth";
import { loadOwnershipInSet, searchSets, type SetIndexRow } from "../../../../lib/sets/read";
import { fingerprintOf } from "../../../../lib/sets/completion";

export async function searchSetsAction(query: string): Promise<SetIndexRow[]> {
  await requireUserId();
  return searchSets(query);
}

/**
 * How many base-run cells of one set the reader owns, right now.
 *
 * The set page deliberately does not re-render when an upload lands while it is open —
 * a grid that silently relights cells destroys the one thing the surface sells. Instead it
 * asks this on window focus and offers the difference as an act. Nothing in the app pushes,
 * which is why this is a poll of one number rather than a subscription.
 *
 * Reads cells only, never prices: this fires on every focus event, and the fingerprint
 * does not depend on the price table.
 *
 * A FINGERPRINT, not a count. Swapping one owned printing for another, or changing its
 * finish, leaves the count identical while the art and the foil mark on screen are stale —
 * so the strip would offer nothing.
 *
 * Taken from the COLLECTION, not from placed cells. Placement depends on the catalog, and
 * the page's baseline can be an hour-old cached payload: a catalog refresh that rekeys a
 * printing would change the placement without the reader writing anything, and the strip
 * would announce an upload that never happened. The holdings and picks are what an upload
 * actually changes.
 */
export async function ownedFingerprintForSet(code: string): Promise<string> {
  const userId = await requireUserId();
  const owned = await loadOwnershipInSet(userId, code);
  if (!owned) return "";
  return fingerprintOf(owned.holdings, owned.picks);
}
