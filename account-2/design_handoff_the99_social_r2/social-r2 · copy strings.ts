// social-r2 · copy strings.ts. R1 (the wishlist, a friend's wishlist, friends' spares). PLACEHOLDERS: /copy-review sets the words.
// Target: a new src/lib/copy/wishlist.ts; spare strings beside socialCopy (src/lib/copy/social.ts, from Round 1);
// one row in the account menu (shellCopy.accountMenu). No string here reaches a model.

const cards = (n: number) => (n === 1 ? "1 card" : `${n} cards`);
const spares = (n: number) => (n === 1 ? "1 spare" : `${n} spares`);

export const wishlistCopy = {
  // Account menu row (popover and sheet): after Friends, or after About with friends off. Absent with the switch off.
  menu: { wishlist: "Wishlist" },

  page: {
    title: "Wishlist",
    // Head count. `got` is the number of got lines.
    count: (n: number, got: number) => (n === 0 ? "Nothing wanted yet" : got > 0 ? `${cards(n)} · ${got} got` : cards(n)),
    // Shown only with friends on and at least one friend.
    friendsLine: "Your friends can see this list: the cards, how many you want, and what you’ve got. Never what you own.",
    search: { placeholder: "Add a card", want: "Want", wanted: "✓ Wanted", onList: (n: number) => `want ${n}` },
    emptyTitle: "Nothing wanted yet",
    emptyBody:
      "Cards you want outside any deck, any printing. Search for one above, or press Want it in any card’s details. A line reads GOT once your collection holds that many, and stays until you clear it.",
    wantedHead: (n: number) => `Wanted · ${n}`,
    gotHead: (n: number) => `Got · ${n}`,
    clearGot: "Clear got",
    clearedGot: (n: number) => `Cleared ${n} got ${n === 1 ? "card" : "cards"} from your wishlist.`, // receipt strip, role status
    clearedGotShort: (n: number) => `Cleared ${n} got.`, // phone strip if the long one wraps
    close: "Close",
  },

  line: {
    noneYet: "none yet",
    have: (have: number, want: number) => `have ${have} of ${want}`,
    got: (have: number, want: number) => (have === want ? `got · have ${have} of ${want}` : `got · have ${have}, wanted ${want}`),
    stepperLabel: "Copies wanted",
    stepperWord: "want",
    fewer: "Want one fewer",
    more: "Want one more",
    clearAria: (card: string) => `Clear ${card}`,
    stamp: "GOT",
    failedSet: "We couldn’t change that. Your wishlist is unchanged.", // toast, role alert
    failedClear: "We couldn’t clear that. Your wishlist is unchanged.", // toast, role alert
  },

  // Card details: desktop pinned footer row, phone column foot.
  details: {
    want: "Want it",
    onList: "Wishlist", // links to /wishlist
    have: (n: number) => `have ${n}`,
    gotHave: (have: number, want: number) => `have ${have} of ${want}`,
    takeOff: "Take it off your wishlist", // ✕ aria-label
    failedAdd: "We couldn’t add that to your wishlist. Try again.", // toast, role alert
  },

  // A friend's page, /friends/[publicId].
  friend: {
    back: "‹ Friends",
    since: (date: string) => `Friend since ${date}`,
    head: (name: string, n: number) => `${name}’s wishlist · ${n}`,
    viewOnly: "view only",
    wants: (n: number) => `wants ${n}`,
    got: (n: number) => `got · wanted ${n}`,
    emptyTitle: (name: string) => `${name}’s wishlist is empty`,
    emptyBody: (name: string) => `When ${name} adds a card, it shows here with how many they want, and GOT once they have it.`,
    goneTitle: "This person isn’t on your friends list",
    goneBody: "A friend’s page shows only while you’re friends. If you were removed, nobody was told, and nothing here can say more.",
    goneAction: "Go to Friends",
    moreAria: (name: string) => `More for ${name}`,
  },
};

export const spareCopy = {
  // The chip. `names` are display names, most spares first, then by name.
  chip: (names: string[], firstCount: number) =>
    names.length === 1
      ? `${names[0]} has ${spares(firstCount)}`
      : names.length === 2
        ? `${names[0]} and ${names[1]} have spares`
        : `${names.length} friends have spares`,
  // Appended to the deck Shopping intro; absent at zero.
  shoppingIntro: (n: number) => `Friends have spares of ${n}.`,
  listTitle: (card: string) => `Spares of ${card}`,
  count: (n: number) => spares(n),
  foot: "A spare is a copy none of their decks uses. View only: sort it out with them at the table.",
  close: "Close",
};
