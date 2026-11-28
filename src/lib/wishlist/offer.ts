/**
 * The Wishlist tab's one-time offer (cart on your wishlist, call 2): `Your decks need N cards.` with Add them and ✕.
 * Shown while the switch is off and the reader's decks need a card, until it is answered: Add them (the switch on,
 * every deck ticked) or ✕ both stamp `user_prefs.wishlist_offer_dismissed_at`, so it is offered once.
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
import { loadWishlistDeckNames } from "./sync-settings";

/** The offer's count, pure: distinct cards any deck still needs, skipped cards left out. */
export function offerCount(needs: readonly DeckBuyRow[], skipped: ReadonlySet<string>): number {
  return new Set(needs.filter((n) => n.quantity >= 1 && !skipped.has(n.oracleId)).map((n) => n.oracleId)).size;
}

/**
 * The tab's sync extras, from one `user_prefs` read: the deck names its boxes title themselves with while the sync is
 * on (call 3), or the offer's count while it is off (0 for no offer: answered, or no deck needing a card). The Shopping
 * read runs only for a reader the offer could still reach. These are the tab's extras, never the tab: a failed read is
 * reported and draws the one grid with no offer.
 */
export async function loadWishlistTabExtras(userId: string): Promise<{ decks: { id: string; name: string }[] | null; offer: number }> {
  try {
    const [pref] = await db
      .select({ on: userPrefs.wishlistSync, dismissedAt: userPrefs.wishlistOfferDismissedAt })
      .from(userPrefs)
      .where(eq(userPrefs.userId, userId));
    if (pref?.on === true) return { decks: await loadWishlistDeckNames(userId), offer: 0 };
    if (pref?.dismissedAt) return { decks: null, offer: 0 };
    const [needs, skipRows] = await Promise.all([
      loadDeckBuyRows(userId),
      db.select({ oracleId: wishlistSyncSkips.oracleId }).from(wishlistSyncSkips).where(eq(wishlistSyncSkips.userId, userId)),
    ]);
    return { decks: null, offer: offerCount(needs, new Set(skipRows.map((r) => r.oracleId))) };
  } catch (error) {
    captureServerError("wishlist.tab-extras-read", error);
    return { decks: null, offer: 0 };
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
 * runs the first pass before it returns (`setWishlistSync`), so the tab's refresh draws the deck boxes (#3441), and
 * the offer answered.
 */
export async function acceptWishlistOffer(userId: string): Promise<void> {
  await db.update(decks).set({ offWishlist: false }).where(and(eq(decks.userId, userId), eq(decks.offWishlist, true)));
  await setWishlistSync(userId, true);
  await dismissWishlistOfferWrite(userId);
}
