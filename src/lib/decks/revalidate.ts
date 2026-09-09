/**
 * The paths a deck write invalidates.
 *
 * Deck writes used to revalidate only `/decks*`. That misses every other page
 * rendering the same data: a back or forward navigation is served from the
 * router's own cache whatever the stale time is, so a write that does not name
 * a surface leaves it showing what was true before the write.
 *
 * Exported as lists rather than as functions that revalidate, so the sets are
 * assertable without a `next/cache` mock.
 */

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
 * The above plus the two pages that read availability off deck rows. Only for
 * writes that change deck *membership* (or remove the deck holding it): a
 * cached `/collection` would otherwise keep showing a card as unclaimed after
 * a deck claimed it. A rename changes no claim and does not need these.
 */
export function claimSurfaces(deckId: string): string[] {
  return [...deckSurfaces(deckId), "/collection", "/commanders"];
}
