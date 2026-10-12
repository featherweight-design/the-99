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

export const allDecksCartCopy = {
  title: "Shopping for all decks",

  /** The way in, on `/decks` (A1): a cell that a later row can share. */
  entry: {
    label: "Shopping for all decks",
    figure: (copiesN: number, cost: string, deckN: number) => `${n(copiesN)} to buy · ${cost} · ${decks(deckN)}`,
    figureNoPrice: (copiesN: number, deckN: number) => `${n(copiesN)} to buy · ${decks(deckN)}`,
  },

  view: {
    label: "View",
    byCard: "By card",
    byDeck: "By deck",
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
    headByDeck: (deckN: number, copiesN: number) => `${decks(deckN)} · ${copies(copiesN)} · largest first`,
    /** A card in a deck's group that other selected decks need too. */
    also: (names: string[]) => `also ${names.join(", ")}`,
    headByCard: (lines: number) => `${n(lines)} ${lines === 1 ? "card" : "cards"} · commanders first, then most decks`,
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
  },

  /** I got it's receipt body on a cart press, from the read after the write (lock 7). */
  receipt: {
    covered: (names: string[]) => `${and(names)} ${names.length === 1 ? "is" : "are"} covered.`,
    asPicked: "as you picked",
    still: (deck: string, need: number) => `${deck} still needs ${n(need)}.`,
    stillMany: (deckN: number, need: number) => `${decks(deckN)} still need ${n(need)} between them.`,
  },
} as const;
