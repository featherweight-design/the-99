// Social R2 (the wishlist): copy. Taken from the handoff's `social-r2 · copy strings.ts` (round 2), brought to round 3
// (README "Round 3 changes": a collected card LEAVES the list, so no Collected group, caption or friend mark, and the
// one-time strip says what left), with the strings the R3 boards draw that the file lacked, after /copy-review.
// PR 3 brings the whole module; the tab (PR 4), card details' section (PR 5) and the friend page (PR 6) read it.
// The spare strings are not here: they sit beside socialCopy with the Shopping work. No string here reaches a model.

/** "A", "A and B", "A, B and C": the app's list join (no serial comma). */
const joinNames = (names: readonly string[]) =>
  names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

/** A card's short name for the phone's strip: before its first comma, and its front face alone. */
const shortName = (name: string) => name.split(" // ")[0]!.split(", ")[0]!;

const left = (n: number) => (n === 1 ? "It’s left your wishlist." : "They’ve left your wishlist.");

export const wishlistCopy = {
  tab: "Wishlist", // Collection's place strip, fifth, after History

  page: {
    meta: (wanted: number) => `${wanted} wanted`,
    friendsLine: "Your friends can see this list", // only with at least one friend
    sort: { label: "Sort", newest: "Newest", name: "Name" }, // desktop only: "Sort: Newest ▾"
    search: {
      placeholder: "Add a card to your wishlist…",
      add: "Add to wishlist",
      addShort: "Add", // phone
      // A result row's line under the name: what the collection holds, and whether the card is already on the list.
      have: (n: number) => `you have ${n}`,
      onList: "on your wishlist",
      haveOnList: (n: number) => `you have ${n} · on your wishlist`,
    },
    emptyTitle: "Nothing on your wishlist yet",
    emptyBody:
      "Cards you want that no deck is asking for, in any printing. Search above or press Add to wishlist in any card’s details, and a card leaves once you have enough.",
    // The one-time receipt strip (role status, bare ✕) naming the cards that left because the collection reached them.
    collectedLeft: (names: readonly string[]) => `Collected since you last looked: ${joinNames(names)}. ${left(names.length)}`,
    collectedLeftShort: (names: readonly string[]) => `Collected: ${joinNames(names.map(shortName))}. ${left(names.length)}`, // phone
    dismiss: "Dismiss", // the strip's ✕, aria-label
  },

  tile: {
    caption: (want: number, have: number) => `want ${want} · have ${have}`,
  },

  details: {
    add: "Add to wishlist",
    section0: "Wishlist", // the box's label before the card is added
    section: "In your wishlist",
    remove: "Remove",
    want: "want",
    have: (n: number) => `· have ${n}`,
    fewer: "Want one fewer", // the stepper's −, aria-label (the tab's result stepper too)
    more: "Want one more", // the stepper's +, aria-label
    failedSet: "We couldn’t change that. Your wishlist is unchanged.", // toast, role alert
    failedAdd: "We couldn’t add that to your wishlist. Try again.", // toast, role alert
  },

  friend: {
    back: "‹ Friends",
    since: (date: string) => `Friend since ${date}`, // date reads "Oct 2"
    head: (name: string) => `${name}’s wishlist`,
    viewOnly: "view only",
    wants: (n: number) => `wants ${n}`,
    emptyTitle: (name: string) => `${name}’s wishlist is empty`,
    emptyBody: (name: string) => `When ${name} adds a card, it shows here with how many they want, until they have them.`,
  },
};
