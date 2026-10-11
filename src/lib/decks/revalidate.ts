/**
 * The paths a deck write invalidates.
 *
 * Deck writes used to revalidate only `/decks*`. That misses every other page
 * rendering the same data: a back or forward navigation is served from the
 * router's own cache whatever the stale time is, so a write that does not name
 * a surface leaves it showing what was true before the write.
 *
 * Exported as lists rather than as functions that revalidate, so the sets are
 * assertable without a `next/cache` mock. The write that acts on them lives in
 * `revalidate-claims.ts`, which is server-only for that reason.
 */

/**
 * The deck itself, its version rail, the index, and the home dashboard. Home
 * lists the three most recent decks with a card count each, so a create or a
 * delete changes which decks it names and a rename or a membership change alters
 * what it says about one of them. (The order is by `createdAt` and does not move
 * — see `listRecentDecks`.) The all-decks cart reads every unfinished deck's
 * name and missing cards, so every deck write changes what it lists too.
 *
 * The version rail used to be listed here as its own path. It is a TAB on the
 * deck page now and `/decks/[id]/versions` is retired, so revalidating the deck
 * page revalidates the rail with it — everything the rail draws (the deck's
 * name, a row per version, each version's games-held tally) is on that page.
 * Naming the retired path as well would invalidate a cache entry no route fills.
 */
export function deckSurfaces(deckId: string): string[] {
  return [`/decks/${deckId}`, "/decks", "/decks/shopping", "/"];
}

/**
 * The above plus the deck's review page and the three pages that read
 * availability off deck rows. Only for writes that change deck *membership* (or
 * remove the deck holding it): a cached `/collection` would otherwise keep
 * showing a card as unclaimed after a deck claimed it. A rename changes no claim
 * and does not need these.
 *
 * The review page sits in this set rather than in `deckSurfaces` because what
 * goes stale on it is claim-shaped: every row's pull offer and its price come out
 * of the claim model, so a membership change in ANOTHER deck decides whether a
 * row still offers a pull. Left out, a back navigation there serves a cached RSC
 * offering a pull the server would now refuse.
 */
export function claimSurfaces(deckId: string): string[] {
  return [
    ...deckSurfaces(deckId),
    `/decks/${deckId}/changes`,
    "/collection",
    "/commanders",
    "/discover",
  ];
}
