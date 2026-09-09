/**
 * The paths a deck write invalidates.
 *
 * Deck writes used to revalidate only `/decks*`. That misses every other page
 * rendering the same data: a back or forward navigation is served from the
 * router's own cache whatever the stale time is, so a write that does not name
 * a surface leaves it showing what was true before the write.
 *
 * The path sets are exported as lists rather than as functions that revalidate,
 * so they stay assertable on their own.
 */

import { revalidatePath } from "next/cache";
import { revalidateUserLists } from "../cache/user-lists";

/**
 * The deck itself, the index, and the home dashboard. Home lists the three most
 * recent decks with a card count each, so a create or a delete changes which
 * decks it names and a rename or a membership change alters what it says about
 * one of them. (The order is by `createdAt` and does not move — see
 * `listRecentDecks`.)
 */
export function deckSurfaces(deckId: string): string[] {
  return [`/decks/${deckId}`, "/decks", "/"];
}

/**
 * The above plus the three pages that read availability off deck rows. Only for
 * writes that change deck *membership* (or remove the deck holding it): a
 * cached `/collection` would otherwise keep showing a card as unclaimed after
 * a deck claimed it. A rename changes no claim and does not need these.
 */
export function claimSurfaces(deckId: string): string[] {
  return [...deckSurfaces(deckId), "/collection", "/commanders", "/discover"];
}

/**
 * Everything a claim change invalidates: the surfaces above, and the reader's
 * cached list payloads behind them.
 *
 * One function rather than two calls at each write, because the two halves are
 * the same fact stated twice — a path revalidated without its cached payload
 * only re-renders the page around the same stale list.
 */
export function revalidateClaims(deckId: string, userId: string): void {
  for (const path of claimSurfaces(deckId)) revalidatePath(path);
  revalidateUserLists(userId);
}
