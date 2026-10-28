// Shopping for all decks (handoff `design_handoff_the99_all_decks_cart`, R1). Voice is refresh.ts's:
// labels and figures, no reassurance, every count with its noun. Verbs are select and unselect
// (Hugh, 2026-10-11), never tick.
//
// Reused unchanged from elsewhere: `exportLinkOutCopy.shopping` (`Buy these at Mana Pool`),
// `priceCopy.strip.*`, `priceCopy.tag.*`.

const n = (x: number) => x.toLocaleString("en-US");
const copies = (x: number) => (x === 1 ? "1 copy" : `${n(x)} copies`);
const decks = (x: number) => (x === 1 ? "1 deck" : `${n(x)} decks`);
/** `Gishath, Kratos and Thorin`: receipt prose only, since a line names its decks with commas. */
const and = (names: string[]) =>
  names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

const ASPICKED = "as you picked";

export const allDecksCartCopy = {
  title: "Shopping for all decks",

  /** The way in, on `/decks` (A1): a cell that a later row can share. */
  entry: {
    label: "Shopping for all decks",
    figure: (copiesN: number, cost: string, deckN: number) => `${n(copiesN)} to buy · ${cost} · ${decks(deckN)}`,
    figureNoPrice: (copiesN: number, deckN: number) => `${n(copiesN)} to buy · ${decks(deckN)}`,
    // The phone's half cell beside the precons line (handoff design_handoff_the99_precons R2, P1;
    // Hugh approved 2026-10-11).
    titlePhone: "Shop all decks",
    figurePhone: (copiesN: number, cost: string) => `${n(copiesN)} · ${cost}`,
    figurePhoneNoPrice: (copiesN: number) => `${n(copiesN)} to buy`,
  },

  view: {
    label: "View",
    byCard: "By card",
    byDeck: "By deck",
    /** The third view (spare requests PR 3c), drawn only while a line has a friend's spare. */
    byFriend: "By friend",
  },

  page: {
    back: "Decks",
    sub: (short: number, total: number) =>
      `${n(short)} of ${n(total)} ${total === 1 ? "deck" : "decks"} ${short === 1 ? "is" : "are"} missing cards`,
    brews: "brews included",
    /** E3's sub: nothing to buy anywhere. */
    subNone: (total: number) => `${decks(total)} · none missing a card`,
  },

  selections: {
    head: (on: number, of: number) => `Decks · ${n(on)} of ${n(of)}`,
    headPhone: (on: number, of: number) => `Decks · ${n(on)} of ${n(of)} selected`,
    /** The phone fold's toggle, for a reader who cannot see the chevron. */
    toggleAria: (open: boolean) => (open ? "Hide the decks" : "Show the decks"),
    selectAll: "Select all",
    unselectAll: "Unselect all",
    figure: (copiesN: number, cost: string) => `${n(copiesN)} · ${cost}`,
    figureNoPrice: (copiesN: number) => n(copiesN),
    note: "Leaving a deck out changes this cart only.",
    aria: (deck: string, on: boolean) => `${deck}, ${on ? "in this cart" : "left out of this cart"}`,
  },

  list: {
    /** The list scroller's name on a phone, where it is a focusable box of its own. */
    regionAria: "Cards in this cart",
    decks: (qty: number, names: string[]) => `${n(qty)} · ${names.join(", ")}`,
    commander: "commander",
    /** Every owned copy is held by decks not on this line. */
    owned: (owned: number) => `you own ${n(owned)} · all ${n(owned)} in other decks`,
    /** Some owned copies are held by a deck on this line itself. */
    ownedSome: (owned: number, held: number) => `you own ${n(owned)} · ${n(held)} in other decks`,
    /** A line still listed after a press this visit (S4). */
    addedThisVisit: (q: number) => `${n(q)} added this visit`,
    /** Beside the held slot (`gotItCopy.slot.held`) of a line that left (S3). */
    added: (q: number) => `${n(q)} added`,
  },

  /** The desktop column header over By card's rows and each open By deck group (v2 call 1). The actions column has no label. */
  columns: {
    card: "Card",
    need: "You need · for",
    /** By deck's need column (PR 5): this deck's count, then the other decks that need the card. */
    needByDeck: "This deck · also",
    spares: "Friends’ spares",
    own: "You own · in use in",
  },

  /** A row's facts (v2 call 1): the phone's labels (uppercase by style), and the words inside a fact. */
  facts: {
    need: "need",
    /** By deck's need fact, from the open deck's point of view (PR 5). */
    deck: "deck",
    spare: "spare",
    own: "own",
    /** The own fact, before the decks holding the copies (G1). */
    in: "in",
    /** By deck, before the other selected decks that need the card too; the open deck is never one of them. */
    also: "also",
    /** G1's fallback, when the decks holding the copies are not known and other decks hold every one. */
    inOther: "in other decks",
    /** G1's fallback when a deck on the line holds some of its own copies: `list.ownedSome`'s tail, after the count. */
    someInOther: (held: number) => `· ${n(held)} in other decks`,
    /** The press after the names that fit (call 2), and its words once the list is open. */
    more: (rest: number) => `+${n(rest)}`,
    /** The press when the only thing hidden is the end of one cut name (addendum R2, ruling 3). */
    moreName: "more",
    less: "less",
    moreDecksAria: (rest: number) => `Show ${n(rest)} more ${rest === 1 ? "deck" : "decks"}`,
    moreFriendsAria: (rest: number) => `Show ${n(rest)} more ${rest === 1 ? "friend" : "friends"}`,
    moreNameAria: "Show the full name",
    lessAria: "Show fewer",
    /** The open list's head, in place of the names: `for 4 decks`, `in 2 decks`, `from 2 friends`. */
    forDecks: (x: number) => `for ${decks(x)}`,
    inDecks: (x: number) => `in ${decks(x)}`,
    alsoDecks: (x: number) => `also ${decks(x)}`,
    fromFriends: (x: number) => `from ${x === 1 ? "1 friend" : `${n(x)} friends`}`,
  },

  /** The chassis's controls (v2, PR 8). Friend and Owned arrive with PR 9. */
  filters: {
    search: "Search cards",
    /** The chip for a search: the term itself, since "Search" would name the field rather than the filter. */
    chipSearch: (term: string) => `“${term}”`,
  },

  /** Sort, per view (call 5). The first of each is the shipped default; the keys are `lib/decks/cart-sort`'s. */
  sort: {
    label: "Sort",
    /** The trigger's words and its accessible name: `Sort · Most decks`. */
    trigger: (current: string) => `Sort · ${current}`,
    sheetAria: "Sort",
    byCard: {
      decks: "Most decks",
      "price-high": "Price, high first",
      "price-low": "Price, low first",
      spare: "Most spares",
      name: "Name",
    },
    byDeck: { largest: "Largest first", cost: "Cost, high first", name: "Name" },
    byFriend: { spare: "Most spares", cards: "Most cards", name: "Name" },
    /** The phone sheet's sub-line: which view's orders these are. */
    viewOf: { card: "By card", deck: "By deck", friend: "By friend" },
  },

  /** Row 3, the chassis's result line. */
  result: {
    byCard: (lines: number, spare: number) => `${lines === 1 ? "1 card" : `${n(lines)} cards`} · ${n(spare)} with a friend’s spare`,
    byCardNoSpare: (lines: number) => (lines === 1 ? "1 card" : `${n(lines)} cards`),
    byDeck: (deckN: number, copiesN: number) => `${decks(deckN)} · ${copies(copiesN)}`,
    byFriend: (friendsN: number, sparesN: number) =>
      `${friendsN === 1 ? "1 friend" : `${n(friendsN)} friends`} · ${sparesN === 1 ? "1 spare" : `${n(sparesN)} spares`}`,
    /** A search leaves some of the cards: By card's count against the selected lines. */
    filtered: (shown: number, of: number) => `${n(shown)} of ${of === 1 ? "1 card" : `${n(of)} cards`}`,
    /** The trailing slot while friends' spares are still being read. */
    reading: "reading friends’ spares",
  },

  /** A search that leaves nothing: the chassis's no-match shape, naming the one fix. */
  noMatch: {
    title: "No card matches",
    body: (term: string, of: number) => `Drop “${term}” and you get ${of === 1 ? "1 card" : `${n(of)} cards`}.`,
    drop: (term: string) => `Drop “${term}”`,
  },

  /** By friend (spare requests PR 3c; handoff `Cart-By-Friend`): one panel per friend holding a spare of a line. */
  byFriend: {
    /** The panel head's pods line, comma-joined as the board draws it. */
    via: (pods: readonly string[]) => `shares with ${pods.join(", ")}`,
    /** The panel head's figure: the spares this friend holds of the selected lines. */
    spares: (x: number) => (x === 1 ? "1 spare" : `${n(x)} spares`),
    /** The panel's name, for a screen reader moving by region. */
    panelAria: (friend: string) => `Spares from ${friend}`,
  },

  none: {
    title: "No decks selected",
    body: "Select a deck to put its cards back in the cart.",
    action: (of: number) => `Select all ${decks(of)}`,
  },

  empty: {
    title: "No deck is missing a card",
    body: (total: number) =>
      total === 0
        ? "You have no decks yet."
        : total === 1
          ? "Your one deck has its cards, proxies included."
          : `All ${n(total)} of your decks have their cards, proxies included.`,
    back: "Back to Decks",
  },

  checkout: {
    copiesLine: (copiesN: number, deckN: number) => `${copies(copiesN)} · ${decks(deckN)}`,
    sends: (lines: number) =>
      `Opens Mana Pool with ${n(lines)} ${lines === 1 ? "line" : "lines"}, names and quantities only. You pick printings there.`,
    /**
     * K3: a cart too long for one link, split into parts (Hugh, 2026-10-11). Drawn beside the shared
     * link label, each part with the lines it sends.
     */
    part: (i: number, of: number, lines: number) =>
      `part ${n(i)} of ${n(of)} · ${n(lines)} ${lines === 1 ? "line" : "lines"}`,
    unread: "prices couldn’t be read just now",
    noneSelected: "Select a deck to build a cart.",
  },

  /** K1: once per visit, when the tab regains focus after the Mana Pool link was pressed. */
  back: {
    title: "Back from Mana Pool?",
    body: "Press buy on each card you got to add it to your collection.",
    dismiss: "Dismiss",
  },

  /** I got it's confirm on a cart line. Title, printing, finish and Add are `gotItCopy.confirm`'s. */
  confirm: {
    forDecks: (deckN: number) => `For ${decks(deckN)} in this cart`,
    needsEach: (q: number) => `needs ${n(q)}`,
    /** Replaces `gotItCopy.confirm.need` on a cart line. */
    need: (q: number, deckN: number) =>
      deckN > 1 && q === deckN ? `The cart needs ${n(q)}, one for each deck` : `The cart needs ${n(q)}`,
    /** Lock 7, said once. */
    readAgain: "Which decks these cover is worked out once they’re added.",
    /** The stale banner on a cart line: `gotItCopy.confirm.staleBody`, said of the cart. */
    staleBody: (need: number) => `A copy was added somewhere else, so the cart needs ${n(need)} now. Nothing was added yet.`,
    staleBodyDone: "A copy was added somewhere else, so the cart needs no more. Add anyway if this is a spare.",
    /**
     * S1b: fewer copies than decks turns the deck list into ContestedCardRow, with its own strings
     * (cardAssignmentsCopy.contested.headingOwned, cap, gets / buys, a11y*). Only the footer is the
     * cart's, because brews order by when they first listed the card.
     */
    undo: (deck: string) => `Tap ${deck} again to undo this.`,
    backToDefault: "Back to first listed",
    /** Announced when the pick is cleared, by either way back (the row's `announcedCleared`, said of the cart). */
    cleared: (holder: string, card: string) => `Back to first listed. ${holder} has ${card}.`,
  },

  /** I got it's receipt body on a cart press, from the read after the write (lock 7). */
  receipt: {
    /** `picked`: the S1b chooser named one of these decks (S4). */
    covered: (names: string[], picked = false) =>
      `${and(names)} ${names.length === 1 ? "is" : "are"} covered${picked ? `, ${ASPICKED}` : ""}.`,
    still: (deck: string, need: number) => `${deck} still needs ${n(need)}.`,
    stillMany: (deckN: number, need: number) => `${decks(deckN)} still need ${n(need)} between them.`,
  },
} as const;
