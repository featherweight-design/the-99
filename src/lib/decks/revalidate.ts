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
 * The deck itself, the index, and the home dashboard — which lists the three
 * most recent decks and so moves whenever a deck is created, renamed, deleted,
 * or gains and loses cards.
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
