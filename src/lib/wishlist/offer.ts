/**
 * The Wishlist tab's one-time offer (cart on your wishlist, call 2): `Your decks need N cards you don’t own.` with Add
 * them and ✕. Shown while the switch is off and the reader's decks need a card, until it is answered: Add them (the
 * switch on, every deck ticked) or ✕ both stamp `user_prefs.wishlist_offer_dismissed_at`, so it is offered once.
 *
 * N is the sync set Add them would write (plan F7): distinct cards Shopping lists for any of the reader's decks, less
 * the cards they took off the synced set. Every deck counts, because Add them ticks every deck.
 */
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { decks, userPrefs, wishlistSyncSkips } from "../../db/schema";
import { loadDeckBuyRows, type DeckBuyRow } from "../decks/availability-query";
import { captureServerError } from "../sentry/capture";
import { setWishlistSync } from "./sync";

/** The offer's count, pure: distinct cards any deck still needs, skipped cards left out. */
export function offerCount(needs: readonly DeckBuyRow[], skipped: ReadonlySet<string>): number {
  return new Set(needs.filter((n) => n.quantity >= 1 && !skipped.has(n.oracleId)).map((n) => n.oracleId)).size;
}

/**
 * The count to offer, or 0 for no offer: the switch on, the offer answered, or no deck needing a card. The Shopping
 * read runs only for a reader the offer could still reach. The offer is the tab's extra, never the tab: a failed read
 * is reported and draws no offer.
 */
export async function loadWishlistOffer(userId: string): Promise<number> {
  const [pref] = await db
    .select({ on: userPrefs.wishlistSync, dismissedAt: userPrefs.wishlistOfferDismissedAt })
    .from(userPrefs)
    .where(eq(userPrefs.userId, userId));
  if (pref?.on === true || pref?.dismissedAt) return 0;
  try {
    const [needs, skipRows] = await Promise.all([
      loadDeckBuyRows(userId),
      db.select({ oracleId: wishlistSyncSkips.oracleId }).from(wishlistSyncSkips).where(eq(wishlistSyncSkips.userId, userId)),
    ]);
    return offerCount(needs, new Set(skipRows.map((r) => r.oracleId)));
  } catch (error) {
    captureServerError("wishlist.offer-count-read", error);
    return 0;
  }
}

/**
 * Answers the offer for good. Written ONLY while the column is null: `user_prefs` carries the stamp trigger, which
 * fires on a no-op UPDATE too (`dismissWelcomeStripWrite`'s rule). Apart so a test can render its SQL.
 */
export function dismissWishlistOfferWrite(userId: string) {
  return db
    .insert(userPrefs)
    .values({ userId, wishlistOfferDismissedAt: sql`now()` })
    .onConflictDoUpdate({
      target: userPrefs.userId,
      set: { wishlistOfferDismissedAt: sql`now()` },
      setWhere: isNull(userPrefs.wishlistOfferDismissedAt),
    });
}

/**
 * Add them: every deck ticked (a deck kept off earlier is put back, only those rows written), the switch on, which
 * schedules the first pass (`setWishlistSync`), and the offer answered.
 */
export async function acceptWishlistOffer(userId: string): Promise<void> {
  await db.update(decks).set({ offWishlist: false }).where(and(eq(decks.userId, userId), eq(decks.offWishlist, true)));
  await setWishlistSync(userId, true);
  await dismissWishlistOfferWrite(userId);
}
