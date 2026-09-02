/**
 * The paths a change to deck membership invalidates.
 *
 * Deck writes used to revalidate only `/decks*`, which was correct while every
 * other page refetched on each navigation anyway. Now that the client cache
 * holds `/collection` and `/commanders` for a window (see `staleTimes` in
 * next.config.ts), a claim made in the builder has to reach them explicitly —
 * both draw their availability markers from deck rows, so a cached copy would
 * keep showing a card as unclaimed after the deck claimed it.
 *
 * Exported as a list rather than as a function that revalidates, so the set is
 * assertable without a `next/cache` mock.
 */
export function claimSurfaces(deckId: string): string[] {
  return [`/decks/${deckId}`, "/decks", "/collection", "/commanders"];
}
