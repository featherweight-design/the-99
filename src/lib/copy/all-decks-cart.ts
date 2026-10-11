// Shopping for all decks (handoff `design_handoff_the99_all_decks_cart`, R1). Voice is refresh.ts's:
// labels and figures, no reassurance, every count with its noun. Verbs are select and unselect
// (Hugh, 2026-10-11), never tick.
//
// Reused unchanged from elsewhere: `exportLinkOutCopy.shopping` (`Buy these at Mana Pool`),
// `priceCopy.strip.*`, `priceCopy.tag.*`.

const n = (x: number) => x.toLocaleString("en-US");
const copies = (x: number) => (x === 1 ? "1 copy" : `${n(x)} copies`);
const decks = (x: number) => (x === 1 ? "1 deck" : `${n(x)} decks`);

export const allDecksCartCopy = {
  title: "Shopping for all decks",

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
    headByCard: (lines: number) => `${n(lines)} ${lines === 1 ? "card" : "cards"} · commanders first, then most decks`,
    /** The list scroller's name on a phone, where it is a focusable box of its own. */
    regionAria: "Cards in this cart",
    decks: (qty: number, names: string[]) => `${n(qty)} · ${names.join(", ")}`,
    commander: "commander",
    /** Every owned copy is held by decks not on this line. */
    owned: (owned: number) => `you own ${n(owned)} · all ${n(owned)} in other decks`,
    /** Some owned copies are held by a deck on this line itself. */
    ownedSome: (owned: number, held: number) => `you own ${n(owned)} · ${n(held)} in other decks`,
  },

  none: {
    title: "No decks selected",
    body: "Select a deck to put its cards back in the cart.",
    action: (of: number) => `Select all ${decks(of)}`,
  },

  empty: {
    title: "No deck is missing a card",
    body: (total: number) => `All ${n(total)} of your decks have their cards, proxies included.`,
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
} as const;
