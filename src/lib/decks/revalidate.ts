/**
 * The paths a deck write invalidates.
 *
 * Deck writes used to revalidate only `/decks*`, which was correct while every
 * page refetched on each navigation anyway. Now that the client cache holds
 * dynamic pages for a window (see `staleTimes` in next.config.ts), each write
 * has to name every surface that renders what it changed.
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
