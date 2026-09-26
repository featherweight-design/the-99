"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { requireUserId } from "../auth";
import { addCardToDeckFor, revalidateAdd } from "../decks/add-card";
import { DECK_ADD_FALLBACK_MESSAGE, type DeckMutationResult } from "../decks/mutation-result";
import { deckSurfaces } from "../decks/revalidate";
import { revalidateClaims } from "../decks/revalidate-claims";
import { isUuid } from "../uuid";
import { swapToolsEnabled } from "./flag";
import { loadFits, type FitsRead } from "./fits";
import { loadStandIns, type StandInsRead } from "./gather";
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

/**
 * The stand-ins for one Shopping row, read when the sheet opens rather than shipped with the page:
 * the gather is several queries per card and most rows are never pressed. A read, so it revalidates
 * nothing. Null covers every refusal alike (flag off, a bad id, a deck that is not the reader's),
 * because the sheet draws one `failed` state for all of them.
 */
export async function loadStandInsAction(deckId: string, cutOracleId: string, full = false): Promise<StandInsRead | null> {
  if (!swapToolsEnabled() || !isUuid(deckId) || !isUuid(cutOracleId)) return null;
  const userId = await requireUserId();
  return loadStandIns(deckId, userId, cutOracleId, full === true);
}

/**
 * Fits your decks, read when the picker opens: which of the reader's decks the card would fit, and
 * which already hold it or rule it out. Null for every refusal alike, as the stand-ins read is.
 */
export async function loadFitsAction(oracleId: string): Promise<FitsRead | null> {
  if (!swapToolsEnabled() || !isUuid(oracleId)) return null;
  const userId = await requireUserId();
  return loadFits(userId, oracleId);
}

/**
 * Add from Fits: the same add as the deck page's, with its validation and the 99-card cap, called
 * from a card opened ANYWHERE. That is why its revalidation is deferred with `after()`, unlike the
 * actions above: the caller is whatever route the card was opened on (the collection, a commander
 * page), which does not need redrawing, and revalidating inside the action would ship that route's
 * whole page back as the reply. The deck it added to is refreshed for its next visit either way.
 */
export async function addFromFits(
  deckId: string,
  oracleId: string,
): Promise<DeckMutationResult & { held?: boolean }> {
  if (!swapToolsEnabled() || !isUuid(deckId) || !isUuid(oracleId)) return { ok: false, message: DECK_ADD_FALLBACK_MESSAGE };
  const userId = await requireUserId();
  const outcome = await addCardToDeckFor(userId, deckId, oracleId, { relock: false });
  after(() => revalidateAdd(deckId, userId, outcome));
  // `held`: the deck already had it (another tab got there first), so nothing was written and no copy
  // was used. The picker must not stamp it as an add.
  return outcome.wrote === "held" ? { ...outcome.result, held: true } : outcome.result;
}
