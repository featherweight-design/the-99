"use server";

// The wishlist's writes (Social R2 PR 3), for Collection › Wishlist (PR 4) and card details' Wishlist section (PR 5).
// Every action takes the reader from the session, decides `SOCIAL_WISHLIST_ENABLED` for THAT reader
// (`requestSwitchEnv`), and refuses as `off` while it is off: the library functions do not check the switch. Each maps
// its library result to an outcome the screen draws, so a refused write never reads as done.
//
// Revalidation is deferred with `after()`: card details opens over any route, and an inline revalidation would
// re-render the CALLER's route into the reply. The tab redraws from the reply it gets.

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireUserId } from "../../../lib/auth";
import { requestSwitchEnv } from "../../../lib/switches/request";
import { wishlistEnabled } from "../../../lib/wishlist/flag";
import { clearWishlistLine, setWishlistQuantity, wantOneMore } from "../../../lib/wishlist/wishlist";
import { MAX_COLLECTED_NOTICES, dismissCollected } from "../../../lib/wishlist/collected";
import { isUuid } from "../../../lib/uuid";

type Off = { ok: false; reason: "off" };
const OFF: Off = { ok: false, reason: "off" };

/** The route the tab will live at (PR 4): revalidated after a write, so a later visit reads fresh. */
const WISHLIST = "/collection/wishlist";
const refreshLater = () => after(() => revalidatePath(WISHLIST));

/** The signed-in reader, when their own switch is on; null when it is off. */
async function wishlistReader(): Promise<string | null> {
  const userId = await requireUserId();
  return wishlistEnabled(await requestSwitchEnv(userId)) ? userId : null;
}

/**
 * A want write's outcome. `wanted`: the card is on the list wanting `want`, of which the collection holds `have`.
 * `held`: the collection already holds `want` or more, so no line stands (a press of Add on a card held 99 times, or a
 * stepper lowered to what is held). `invalid`: a malformed card id or count, or a card the catalog does not hold.
 */
export type WantOutcome =
  | { ok: true; status: "wanted" | "held"; want: number; have: number }
  | Off
  | { ok: false; reason: "invalid" };

/** Add to wishlist (G4): wants one more than the collection holds, capped at 99. */
export async function addToWishlistAction(oracleId: unknown): Promise<WantOutcome> {
  const userId = await wishlistReader();
  if (!userId) return OFF;
  const result = await wantOneMore(userId, oracleId);
  if (!result) return { ok: false, reason: "invalid" };
  refreshLater();
  return { ok: true, status: result.status, want: result.quantity, have: result.held };
}

/** The stepper: sets how many copies the reader wants in all, 1 to 99. */
export async function setWishlistWantAction(oracleId: unknown, quantity: unknown): Promise<WantOutcome> {
  const userId = await wishlistReader();
  if (!userId) return OFF;
  const result = await setWishlistQuantity(userId, oracleId, quantity);
  if (!result) return { ok: false, reason: "invalid" };
  refreshLater();
  return { ok: true, status: result.status, want: result.quantity, have: result.held };
}

export type RemoveOutcome = { ok: true; removed: boolean } | Off | { ok: false; reason: "invalid" };

/** Remove: takes the card off the list. A card already gone is done too (`removed: false`), never an error. */
export async function removeFromWishlistAction(oracleId: unknown): Promise<RemoveOutcome> {
  const userId = await wishlistReader();
  if (!userId) return OFF;
  if (!isUuid(oracleId)) return { ok: false, reason: "invalid" };
  const removed = await clearWishlistLine(userId, oracleId);
  if (removed) refreshLater();
  return { ok: true, removed };
}

export type DismissOutcome = { ok: true; dismissed: number } | Off | { ok: false; reason: "invalid" };


/**
 * The collected strip's ✕: forgets exactly the notices the strip drew, each sent back as its card id and the
 * `collectedAt` it was read with (an ISO string over the wire). The read draws at most `MAX_COLLECTED_NOTICES`, so a
 * longer list, or anything malformed in it, refuses the whole dismiss.
 */
export async function dismissCollectedAction(shown: unknown): Promise<DismissOutcome> {
  const userId = await wishlistReader();
  if (!userId) return OFF;
  if (!Array.isArray(shown) || shown.length === 0 || shown.length > MAX_COLLECTED_NOTICES) return { ok: false, reason: "invalid" };
  const notices: { oracleId: string; collectedAt: Date }[] = [];
  for (const n of shown) {
    const oracleId = (n as { oracleId?: unknown } | null)?.oracleId;
    const at = (n as { collectedAt?: unknown } | null)?.collectedAt;
    const collectedAt = typeof at === "string" ? new Date(at) : null;
    if (!isUuid(oracleId) || !collectedAt || Number.isNaN(collectedAt.getTime())) return { ok: false, reason: "invalid" };
    notices.push({ oracleId: oracleId as string, collectedAt });
  }
  const dismissed = await dismissCollected(userId, notices);
  if (dismissed > 0) refreshLater();
  return { ok: true, dismissed };
}
