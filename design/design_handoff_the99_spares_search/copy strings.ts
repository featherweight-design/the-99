// Find a friend's spares R1: new strings, DRAFT for /copy-review. US English, no em dashes. Reused shipped strings are marked.
// Friend names go through personText / PersonText, never plain interpolation.
export const sparesSearchCopy = {
  search: {
    placeholderWide: "Search by name or type…",
    placeholderCompact: "Name or type…",
    aria: (friend: ThirdPartyName) => personText`Search ${friend}'s spares by name or type`,
  },
  result: (shown: number, total: number) => (shown === total ? `${total} spares` : `${shown} of ${total} spares`),
  wanted: {
    label: "Wanted", // the dimension: trigger `Wanted N`, sheet heading, chip `Wanted · On your wishlist`
    wishlist: "On your wishlist",
    deck: "A deck needs it",
    panelAria: "Filter by what you want",
  },
  sort: { wantedFirst: "Wanted first", name: "Name", most: "Most spares", panelAria: "Sort spares" },
  tile: { deck: (n: number) => (n === 1 ? "a deck needs it" : `${n} decks need it`) },
  // The line under the frame: shipped `line(pods, false)` (no "Cards on your wishlist first.") + shipped `pressToAsk`.
  none: {
    heading: (q: string) => (q ? `No spares match “${q}”.` : "No spares match those filters."),
    body: (friend: ThirdPartyName) =>
      personText`Search looks at each card's name and type line, so “wizard” or “saga” works. ${friend} may still have it in a deck.`,
    keepSearch: "Keep only search", // shipped collectionBrowseCopy.noResults.keepSearch
    clear: "Clear all filters", // shipped
  },
  // Filters, Clear all filters, Done, Color identity, Type, `N of M match`: the Collection sheet's shipped strings.
};

export const wishlistSpareCopy = {
  /** The tile's press. */
  aria: (card: string, friends: number) => `Friends with a spare of ${card}, ${friends === 1 ? "1 friend" : `${friends} friends`}`,
  key: "friend has a spare", // shipped spareCopy.key; requested / accepted: shipped spareCopy.request.keyRequested / keyAccepted
  sort: "Friends' spares", // the desktop Sort's third order: `Sort: Friends' spares`
  kicker: "on your wishlist", // shipped socialCopy.friendPage.spares.onWishlist, as the modal's kicker
  // Modal title, rows, Ask, Ask instead, statuses, the ⓘ tooltip: shipped spareCopy.
};
