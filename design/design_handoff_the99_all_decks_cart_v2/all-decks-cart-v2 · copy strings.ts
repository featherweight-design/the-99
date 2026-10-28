// Shopping for all decks v2: the additions to `src/lib/copy/all-decks-cart.ts` (allDecksCartCopy).
// Placeholders: `/copy-review` resolves the wording. Voice is the cart's own: labels and figures,
// every count with its noun, no reassurance.
//
// Retired by this round: `list.headByCard`, `list.headByDeck`, `list.headByFriend` (the chassis's
// result line replaces the list head), `list.decks` (the need fact is drawn in parts),
// `list.owned` / `list.ownedSome` (kept only as G1's fallback), `byFriend.spares` (the panel head
// counts cards and spares).
// Reused unchanged: `spareCopy.request.*` (Ask and its statuses), `chassisCopy.*` (Clear all,
// NO FILTERS ON, the sheet's Show / Clear all), `socialCopy` friends `emptyTitle` ("No friends yet").

const n = (x: number) => x.toLocaleString("en-US");
const cards = (x: number) => (x === 1 ? "1 card" : `${n(x)} cards`);

export const allDecksCartV2Copy = {
  /** The desktop column header, per view. The last column (the actions) has no label. */
  columns: {
    card: "Card",
    need: "You need · for",
    needByDeck: "This deck · also",
    spare: "Spare",
    sparesAll: "Friends’ spares",
    own: "You own · in use in",
  },

  /** The phone's fact labels (mono, uppercase by style). */
  facts: { need: "need", deck: "deck", spare: "spare", own: "own" },

  /** Inside a fact. */
  fact: {
    /** By deck: before the other decks that need the card. */
    also: "also",
    /** The own fact, before the decks holding the copies (G1). */
    in: "in",
    /** G1's fallback, when the holding decks are not known. */
    inOther: "in other decks",
    /** The press after the names that fit, and its label once open. */
    more: (rest: number) => `+${n(rest)}`,
    less: "less",
    moreAria: (rest: number, what: string) => `Show ${n(rest)} more ${what}`,
    lessAria: "Show fewer",
    /** The opened list's head: “for 4 decks”. */
    forDecks: (x: number) => (x === 1 ? "for 1 deck" : `for ${n(x)} decks`),
  },

  /** The friend panel's head figure and fold. */
  panel: {
    figure: (cardsN: number, sparesN: number) => `${cards(cardsN)} · ${n(sparesN)} spare`,
    foldAria: (friend: string, open: boolean) => (open ? `Fold ${friend}’s spares` : `Open ${friend}’s spares`),
  },

  /** The chassis's controls. */
  filters: {
    search: "Search cards",
    searchAria: "Search the cards in this cart",
    friend: "Friend",
    friendHead: "Friend · has a spare",
    anyFriend: "Any friend",
    friendReading: "reading…",
    owned: "Owned",
    ownedAny: "Any",
    ownedSome: "You own some",
    ownedNone: "None",
    chipFriend: "Friend",
    chipOwned: "Owned",
    /** The sheet's figure and primary press. */
    sheetMatch: (shown: number, of: number) => `${n(shown)} of ${n(of)} cards match`,
    show: (x: number) => `Show ${cards(x)}`,
  },

  /** Sort, per view. The first of each is the shipped default. */
  sort: {
    label: "Sort",
    byCard: ["Most decks", "Price, high first", "Price, low first", "Most spare", "Name"],
    byDeck: ["Largest first", "Cost, high first", "Name"],
    byFriend: ["Most spare", "Most cards", "Name"],
  },

  /** Row 3, the result line. */
  result: {
    byCard: (lines: number, spare: number) => `${cards(lines)} · ${n(spare)} with a friend’s spare`,
    byCardNoSpare: (lines: number) => cards(lines),
    byDeck: (decks: number, copies: number) => `${n(decks)} ${decks === 1 ? "deck" : "decks"} · ${n(copies)} ${copies === 1 ? "copy" : "copies"}`,
    byFriend: (friends: number, spares: number) => `${n(friends)} ${friends === 1 ? "friend" : "friends"} · ${n(spares)} spare`,
    filtered: (shown: number, of: number) => `${n(shown)} of ${cards(of)}`,
    reading: "reading friends’ spares",
    readingByFriend: "Reading friends’ spares…",
  },

  /** By friend's two empty states, and the chassis's no match. */
  empty: {
    noneTitle: "No friend has a spare of these",
    noneBody: (lines: number) =>
      `A spare is a copy none of a friend’s decks use. None of your friends has one of these ${cards(lines)} right now. When one does, it shows here.`,
    noFriendsBody: "When you add friends, the spares they have of these cards show here, and you can ask for them.",
    toFriends: "Go to Friends",
    noMatchTitle: "No card matches both",
    drop: (what: string) => `Drop ${what}`,
  },
} as const;
