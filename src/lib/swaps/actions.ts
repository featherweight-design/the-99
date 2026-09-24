"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "../auth";
import { deckSurfaces } from "../decks/revalidate";
import { revalidateClaims } from "../decks/revalidate-claims";
import { isUuid } from "../uuid";
import { swapToolsEnabled } from "./flag";
import { setShoppingLimit, takeStandIn, undoSwap, type TakeResult } from "./take";

/**
 * The swap tools' server actions. Every one is a PUBLIC ENDPOINT, so every gate the surface applies
 * is re-applied here: the flag (a production deploy without `SWAP_TOOLS_ENABLED` answers nothing),
 * the session, and the shape of every id.
 *
 * REVALIDATED IN THE ACTION, deliberately. A take changes what the deck claims, and the page that
 * called it is the deck page, which has to redraw its Shopping list with the cut gone and the add
 * in. A revalidating action returns its caller's re-rendered page, which is exactly the payload
 * needed here, and it is what tuning's Apply (the same act) already does. Deferring to `after()`
 * is for a write called from a page that does NOT need redrawing, which none of these are.
 */

export async function takeStandInAction(deckId: string, cutOracleId: string, addOracleId: string): Promise<TakeResult> {
  if (!swapToolsEnabled() || ![deckId, cutOracleId, addOracleId].every(isUuid)) {
    return { ok: false, reason: "notFound" };
  }
  const userId = await requireUserId();
  const result = await takeStandIn(deckId, userId, cutOracleId, addOracleId);
  if (result.ok) revalidateClaims(deckId, userId);
  return result;
}

export async function undoSwapAction(swapId: string): Promise<{ ok: boolean }> {
  if (!swapToolsEnabled() || !isUuid(swapId)) return { ok: false };
  const userId = await requireUserId();
  const deckId = await undoSwap(swapId, userId);
  if (deckId) revalidateClaims(deckId, userId);
  return { ok: deckId !== null };
}

export async function setShoppingLimitAction(deckId: string, cents: number | null): Promise<{ ok: boolean }> {
  if (!swapToolsEnabled() || !isUuid(deckId)) return { ok: false };
  const userId = await requireUserId();
  const ok = await setShoppingLimit(deckId, userId, cents);
  // A limit moves marks, not claims: the deck's own surfaces only.
  if (ok) for (const path of deckSurfaces(deckId)) revalidatePath(path);
  return { ok };
}
