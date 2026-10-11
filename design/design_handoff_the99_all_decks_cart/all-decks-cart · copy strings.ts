// Proposed src/lib/copy/all-decks-cart.ts (R1). Placeholders until /copy-review.
// Voice is refresh.ts's: labels and figures, no reassurance, every count with its noun.
// Reused unchanged: exportLinkOutCopy.shopping (`Buy these at Mana Pool`), priceCopy.strip.*,
// priceCopy.tag.soldOut, gotItCopy.row.*, gotItCopy.confirm.* (except `need`), gotItCopy.slot.held,
// gotItCopy.receipt.added/detail/history/undo, refreshCopy.decks.detailToBuy (the tile).

const n = (x: number) => x.toLocaleString("en-US");
const copies = (x: number) => (x === 1 ? "1 copy" : `${n(x)} copies`);
const decks = (x: number) => (x === 1 ? "1 deck" : `${n(x)} decks`);

/** `Gishath, Kratos and Thorin` — receipt prose only; the line uses commas (Hugh's form). */
const and = (names: string[]) =>
  names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

export const allDecksCartCopy = {
  /** Hugh's working label: the page title, the /decks entry line and the About title's root. */
  title: "Shopping for all decks",

  entry: {
    /** Under the /decks header. Absent when the roll-up has no deck; never zeroed. */
    label: "Shopping for all decks",
    figure: (copiesN: number, cost: string, deckN: number) => `${n(copiesN)} to buy · ${cost} · ${decks(deckN)}`,
    figureNoPrice: (copiesN: number, deckN: number) => `${n(copiesN)} to buy · ${decks(deckN)}`,
  },

  page: {
    back: "Decks",
    sub: (short: number, total: number) =>
      `${n(short)} of ${n(total)} ${total === 1 ? "deck" : "decks"} ${short === 1 ? "is" : "are"} missing cards`,
    /** Appended to `sub` when a selected deck is a brew (ruling 1). */
    brews: "brews included",
  },

  selections: {
    head: (on: number, of: number) => `Decks · ${n(on)} of ${n(of)}`,
    /** Phone fold head, closed. */
    headPhone: (on: number, of: number) => `Decks · ${n(on)} of ${n(of)} selected`,
    selectAll: "Select all",
    deselectAll: "Deselect all",
    /** The select row's figure: the deck's roll-up, which is the tile's figure. */
    figure: (copiesN: number, cost: string) => `${n(copiesN)} · ${cost}`,
    figureNoPrice: (copiesN: number) => n(copiesN),
    /** Lock 8, said once. */
    note: "Leaving a deck out changes this cart only.",
    aria: (deck: string, on: boolean) => `${deck}, ${on ? "in this cart" : "left out of this cart"}`,
  },

  view: {
    label: "View",
    byCard: "By card",
    byDeck: "By deck",
  },

  list: {
    headByCard: (lines: number) => `${n(lines)} cards · commanders first, then most decks`,
    headByDeck: (deckN: number, copiesN: number) => `${decks(deckN)} · ${copies(copiesN)} · largest first`,
    /** Hugh's ruling form: `3 · Gishath, Kratos, Thorin`. Names wrap; never truncated. */
    decks: (qty: number, names: string[]) => `${n(qty)} · ${names.join(", ")}`,
    /** By deck: the other selected decks on the same card. */
    also: (names: string[]) => `also ${names.join(", ")}`,
    commander: "commander",
    /**
     * Open question 3. Drawn only when the player owns the card. Two counts, no verdict word, --fg-faint.
     * `held` is every owned copy a deck not on this line holds; it equals `owned` whenever the card is a
     * to-buy row for every deck on the line, which is the only case that reaches here.
     */
    owned: (owned: number) => `you own ${n(owned)} · all ${n(owned)} in other decks`,
    /** Open question 5: a line bought part-way, until the visit ends. */
    addedThisVisit: (q: number) => `${n(q)} added this visit`,
    /** Beside the held slot (gotItCopy.slot.held). */
    added: (q: number) => `${n(q)} added`,
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
    /** Under the one link. Lock 5: names and quantities only. */
    sends: (lines: number) => `Opens Mana Pool with ${n(lines)} lines, names and quantities only. You pick printings there.`,
    /** The provenance slot when the price read failed. --fg-locked, as `behind`. */
    unread: "prices couldn’t be read just now",
    noneSelected: "Select a deck to build a cart.",
  },

  back: {
    /** Shown once per visit when the tab regains focus after the link was pressed. */
    title: "Back from Mana Pool?",
    body: "Press buy on each card you got, and it goes into your collection.",
    dismiss: "Dismiss",
  },

  /** GotItConfirm on a cart line (open question 4). Title, printing, finish, Add are gotItCopy.confirm's. */
  confirm: {
    forDecks: (deckN: number) => `For ${decks(deckN)} on this cart`,
    needsEach: (q: number) => `needs ${n(q)}`,
    /** Replaces gotItCopy.confirm.need on a cart line. */
    need: (q: number, deckN: number) =>
      deckN === 1 ? `The cart needs ${n(q)}` : q === deckN ? `The cart needs ${n(q)}, one for each deck` : `The cart needs ${n(q)}`,
    /**
     * Fewer copies than decks: the deck list becomes ContestedCardRow, with its own strings reused —
     * cardAssignmentsCopy.contested.headingOwned(q) + cap(given, q), gets / buys, a11y*. Only the
     * footer's default-rule link differs, because brews order by when they first listed the card.
     */
    undo: (deck: string) => `Tap ${deck} again to undo this.`,
    backToDefault: "Back to first listed",
    /** Lock 7, said once, in --fg-muted. */
    readAgain: "Which decks the copies cover is read again once they’re added.",
  },

  /** I got it's receipt body on a cart press, from the roll-up read after the write (lock 7). */
  receipt: {
    covered: (names: string[]) => `${and(names)} ${names.length === 1 ? "has its copy" : "have theirs"}.`,
    asPicked: "as you picked",
    still: (deck: string, need: number) => `${deck} still needs ${n(need)}.`,
    stillMany: (deckN: number, need: number) => `${decks(deckN)} still need ${n(need)} between them.`,
  },
} as const;
