// social-r2 · copy strings.ts. Round 2. PLACEHOLDERS: /copy-review sets the words.
// Target: src/lib/copy/wishlist.ts; spare strings beside socialCopy (src/lib/copy/social.ts); the tab beside
// CollectionPlaceHead's tabs. No string here reaches a model.

const spares = (n: number) => (n === 1 ? "1 spare" : `${n} spares`);

export const wishlistCopy = {
  tab: "Wishlist", // Collection place strip, after History

  page: {
    meta: (wanted: number) => `${wanted} wanted`,
    friendsLine: "Your friends can see this list", // only with at least one friend
    search: { placeholder: "Add a card to your wishlist…", add: "Add to wishlist", addShort: "Add", added: "Added", onList: "On your wishlist" },
    emptyTitle: "Nothing on your wishlist yet",
    emptyBody:
      "Cards you want that no deck is asking for. Search for one above, or press Add to wishlist in any card’s details. Any printing counts. Once your collection holds as many as you want, the card leaves the list, and this tab tells you once.",
    // Round 3: one-time receipt strip (role status, bare ✕) for cards that left because you collected them.
    collectedLeft: (names: string) => `Collected since you last looked: ${names}. They’ve left your wishlist.`,
    collectedLeftShort: (names: string) => `Collected: ${names}. They’ve left your wishlist.`, // phone, first names
  },

  tile: {
    caption: (want: number, have: number) => `want ${want} · have ${have}`,
    collected: (have: number) => `✓ collected · have ${have}`,
  },

  details: {
    add: "Add to wishlist",
    section0: "Wishlist", // box label before the card is added
    section: "In your wishlist",
    remove: "Remove",
    want: "want",
    have: (n: number) => `· have ${n}`,
    collected: "✓ collected",
    fewer: "Want one fewer",
    more: "Want one more",
    failedSet: "We couldn’t change that. Your wishlist is unchanged.", // toast, role alert
    failedAdd: "We couldn’t add that to your wishlist. Try again.", // toast, role alert
  },

  friend: {
    back: "‹ Friends",
    since: (date: string) => `Friend ${date}`, // date reads "since Oct 2"
    head: (name: string) => `${name}’s wishlist`,
    viewOnly: "view only",
    wants: (n: number) => `wants ${n}`,
    collected: "✓ collected",
    emptyTitle: (name: string) => `${name}’s wishlist is empty`,
    emptyBody: (name: string) => `When ${name} adds a card, it shows here with how many they want until they have them.`,
  },
};

export const spareCopy = {
  key: "a friend has a spare", // Shopping key and cart key
  markerAria: (card: string) => `Friends with a spare ${card}`,
  title: (card: string) => `Spares of ${card}`,
  via: (pod: string) => `shares with ${pod}`,
  count: (n: number) => spares(n),
  foot: "A spare is a copy none of their decks uses, drafts included. Reach out to offer a trade or bargain your prized family goat, and it’s yours!",
  close: "Close",
};
