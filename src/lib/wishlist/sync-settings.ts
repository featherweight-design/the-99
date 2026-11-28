/**
 * Settings › Wishlist and the deck ⋯ menu's Keep off my wishlist (cart on your wishlist, call 1 and M1): the reads
 * and the one write behind them. The switch itself is `setWishlistSync` (`sync.ts`). A deck left out is
 * `decks.off_wishlist`; the picker's tick and the ⋯ row write the same column, so each mirrors the other.
 *
 * Neither write schedules a pass itself: both run from a Server Action, and every action schedules one after its
 * response (`sync-trigger.ts`). The column carries the `decks` stamp trigger, so the pass finds the player due.
 */
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { db } from "../../db";
import { decks, wishlistSyncSkips } from "../../db/schema";
import { loadDeckBuyRows, type DeckBuyRow } from "../decks/availability-query";
import { readWishlistSync } from "./sync-pref";
import { captureServerError } from "../sentry/capture";

/** One deck in the picker: its name, whether it is left out, and the cards Shopping lists for it. */
export type WishlistSyncDeck = { id: string; name: string; off: boolean; toBuy: number };

export type WishlistSyncSettings = { on: boolean; decks: WishlistSyncDeck[] };

/**
 * Each deck's count, by the sync set's own definition (plan F7): distinct cards Shopping lists for the deck, less the
 * cards the player took off the synced set. One definition, so a tick counts what it would add. Pure.
 */
export function toBuyByDeck(needs: readonly DeckBuyRow[], skipped: ReadonlySet<string>): Map<string, number> {
  const cards = new Map<string, Set<string>>();
  for (const n of needs) {
    if (n.quantity < 1 || skipped.has(n.oracleId)) continue;
    let set = cards.get(n.deckId);
    if (!set) cards.set(n.deckId, (set = new Set()));
    set.add(n.oracleId);
  }
  return new Map([...cards].map(([deckId, set]) => [deckId, set.size]));
}

/**
 * The section's data: the switch and every deck, by name. The counts are drawn only in the open picker, which the
 * switch off disables, so they are read only while it is on: an off reader pays no Shopping read.
 */
export async function loadWishlistSyncSettings(userId: string): Promise<WishlistSyncSettings> {
  const [on, rows] = await Promise.all([
    readWishlistSync(userId),
    db.select({ id: decks.id, name: decks.name, off: decks.offWishlist }).from(decks)
      .where(eq(decks.userId, userId)).orderBy(asc(decks.name), asc(decks.id)),
  ]);
  const none = { on, decks: rows.map((r) => ({ ...r, toBuy: 0 })) };
  if (!on || rows.length === 0) return none;
  // The counts are the picker's detail, never the page: a failed read is reported and draws every count as 0.
  try {
    const [needs, skipRows] = await Promise.all([
      loadDeckBuyRows(userId),
      db.select({ oracleId: wishlistSyncSkips.oracleId }).from(wishlistSyncSkips).where(eq(wishlistSyncSkips.userId, userId)),
    ]);
    const counts = toBuyByDeck(needs, new Set(skipRows.map((r) => r.oracleId)));
    return { on, decks: rows.map((r) => ({ ...r, toBuy: counts.get(r.id) ?? 0 })) };
  } catch (error) {
    captureServerError("settings.wishlist-counts-read", error);
    return none;
  }
}


/**
 * Leaves the given decks out of the sync, or puts them back. False, writing nothing, when any id is not one of the
 * player's decks (a deck never changes owner, so the check holds for the write). The owner is in the UPDATE's WHERE
 * too, and only a deck whose flag changes is written (its stamp trigger). Not an edit: `last_edited_at` stays.
 */
export async function setDecksOffWishlist(userId: string, deckIds: readonly string[], off: boolean): Promise<boolean> {
  const ids = [...new Set(deckIds)];
  if (ids.length === 0) return false;
  const mine = await db.select({ id: decks.id }).from(decks).where(and(eq(decks.userId, userId), inArray(decks.id, ids)));
  if (mine.length !== ids.length) return false;
  await offWishlistUpdate(userId, ids, off);
  return true;
}

/** The one UPDATE, apart so a test can render its SQL: the flag alone, the owner and the change in its WHERE. */
export function offWishlistUpdate(userId: string, deckIds: string[], off: boolean) {
  return db.update(decks).set({ offWishlist: off })
    .where(and(eq(decks.userId, userId), inArray(decks.id, deckIds), ne(decks.offWishlist, off)));
}

/** The reader's deck names by id, ordered by name: the Wishlist tab's per-deck boxes (call 3) title themselves here. */
export async function loadWishlistDeckNames(userId: string): Promise<{ id: string; name: string }[]> {
  return db.select({ id: decks.id, name: decks.name }).from(decks).where(eq(decks.userId, userId)).orderBy(asc(decks.name));
}
