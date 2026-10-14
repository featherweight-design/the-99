// Swap tools (sub-project 4): cheaper stand-ins in Shopping, and Fits your decks (#218).
// Design R1, 2026-09-24. Every string is new and owed to /copy-review. No em dash.
// Figures arrive pre-formatted (formatCents); this file owns the words only.

export const swapToolsCopy = {
  // ── The limit line (under PriceStrip, Shopping only) ─────────────────
  limit: {
    lead: "Marking cards over",
    // The figure is a button: formatCents(limitCents) with no decimals for whole dollars.
    editAria: (figure: string) => `Change the limit, now ${figure}`,
    defaultChip: "default",
    reset: (figure: string) => `reset to ${figure}`, // figure is always "$10"
    save: "Save",
    cancel: "cancel",
    fieldAria: "Limit per card, in dollars",
    tooLow: "Use a whole dollar figure of 1 or more.",
    overCount: (n: number) => `${n} over`,
    noneOver: (figure: string) => `none over ${figure}`,
    // R2: ⇄ is on marked rows only. Drawn after a --warning "⇄".
    key: "on a marked row opens its cheaper stand-ins. Any card’s stand-ins are also in its details.",
  },

  // ── The row (DecklistRow, Shopping) ─────────────────────────────────
  row: {
    over: (figure: string) => `over ${figure}`, // meta line, --warning mono
    swapAria: (name: string) => `Cheaper stand-ins for ${name}`,
    swapOverAria: (name: string, figure: string) => `Cheaper stand-ins for ${name}, over your ${figure} limit`,
    receipt: (cut: string, add: string) => `${cut} → ${add}`,
    receiptFree: (cut: string, add: string) => `${cut} → ${add}, your free copy`,
    receiptAria: (cut: string, add: string) => `Swapped ${cut} for ${add}`,
    receiptOneCopy: (add: string) => `one copy → ${add}`,
    // R2: reverses both halves. Recommend deckTuningCopy.card.undo move to this too.
    // The removal undo keeps "Put back".
    undoSwap: "Undo swap",
    undoSwapAria: (cut: string, add: string) => `Undo the swap: put ${cut} back and take ${add} out`,
  },

  // ── The stand-ins sheet (ModalChrome body) ──────────────────────────
  // R2: the door on every Shopping-opened card modal, over or under the limit.
  modal: {
    seeStandIns: "See cheaper stand-ins →",
    underLimit: (figure: string) => `under your ${figure} limit`,
    overLimit: (figure: string) => `over your ${figure} limit`,
    // Footer on a card opened stacked from the sheet.
    inPlaceOf: (cut: string, deck: string) => `in place of ${cut}, in ${deck}`,
    inPlaceOfShort: (cut: string, pos: number, total: number) => `in place of ${cut} · ${pos} of ${total}`,
    take: (add: string) => `Take ${add}`, // phone footer; desktop reads "Take"
  },

  sheet: {
    title: "Cheaper stand-ins",
    closeAria: "Close cheaper stand-ins",
    backLabel: "Cheaper stand-ins", // CardModal backLabel when a name opens stacked
    replacing: (deck: string) => `replacing, in ${deck}`,
    // The job line under the original.
    jobColors: (colors: string) => `makes ${colors}`, // "white and red"
    jobFinds: (types: string) => `finds a ${types} card`, // "Mountain or Forest"
    jobRole: (roles: string, mv: number) => `${roles} · mana value ${mv}`,
    jobNoRole: "no role we can name",
    givesUpNothing: "gives up nothing",
    leadLands: (colors: string) =>
      `Every land here makes ${colors}. Free copies come first, then the cheapest, and each says what it gives up.`,
    leadFetch: (types: string) =>
      `Every land here finds a ${types}. Free copies come first, then the cheapest, and each says what it gives up.`,
    leadSpells: (roles: string, mv: number, commander: string) =>
      `Every card here is ${roles} at mana value ${mv} or less. Free copies come first, then the rest by how often ${commander} decks run them.`,
    groupFree: "yours, free",
    groupCheapest: "to buy · cheapest first",
    groupByCommander: (commander: string) => `to buy · by ${commander} decks`,
    groupUnlisted: (commander: string) => `not listed for ${commander} · cheapest first`,
    free: "free",
    // Spell facts, joined by the component with " · ".
    mv: (n: number) => `MV ${n}`,
    figure: (pct: string, commander: string) => `in ${pct}% of ${commander} decks`,
    // Drawbacks: the classifier's named set, one clause each.
    drawback: {
      entersTapped: "it enters tapped",
      entersTappedUnless: (cond: string) => `enters tapped unless ${cond}`,
      damage: (n: number, colors: string) => `deals ${n} damage to you for ${colors}`,
      life: (n: number, colors: string) => `costs ${n} life for ${colors}`,
      lifeFetch: (n: number) => `costs ${n} life`,
      basicOnly: "finds only a basic",
      unnamed: "gives up something we couldn’t name · read the card",
    },
    take: "Take",
    taking: "Taking…",
    takeAria: (add: string, cut: string) => `Take ${add} in place of ${cut}`,
    taken: "taken",
    takenNote: (cut: string) =>
      `${cut} has left the draft, so the other stand-ins are put away. Undo the swap to choose a different one.`,
    foot: (when: string) => `Cheapest printing of each, from ManaPool · last checked ${when}`,
    // R2: LoadingScreen's shape, a table phrase then a lowercase status.
    loadingHeading: "Checking the binder",
    loadingLands: (colors: string) => `finding lands that make ${colors}…`,
    loadingFetch: (types: string) => `finding lands that find a ${types}…`,
    loadingSpells: (roles: string) => `finding cheaper ${roles}…`,
    // R2: the tuning panel's failure shape.
    failed: {
      tag: "didn’t load",
      heading: "The stand-ins didn’t come back",
      body: "We couldn’t read prices and your collection just now. It isn’t something you did, and it usually clears in a moment.",
      kept: (cut: string) => `${cut} is still in the deck, and nothing was changed.`,
    },
    retry: "Try again",
    noRole: (name: string) =>
      `${name} does a job we can’t read from its text, so there are no stand-ins for it. We won’t guess at one.`,
    noRoleLand: (name: string) =>
      `${name}’s job is its own text, not a color it makes or a land it finds, so there are no stand-ins for it. We won’t guess at one.`,
    nothingCheaper: (roles: string, mv: number, commander: string, price: string) =>
      `Nothing cheaper does this job. All the other ${roles} at mana value ${mv} or less in ${commander}’s colors costs more than ${price}, and you have no free copy of any of it.`,
    nothingCheaperLand: (colors: string, price: string) =>
      `Nothing cheaper makes ${colors}. Every land that does costs more than ${price}, and you have no free copy of one.`,
    // R2: a panel under the pressed row. Mirrors deckTuningCopy.card.applyRefused.
    refused: {
      tag: "not taken",
      heading: "The deck changed before this swap could land",
      body: (deck: string, cut: string, add: string) =>
        `${deck} was edited after this list was read, in another tab or on another device. Nothing moved: ${cut} is still in, and ${add} isn’t.`,
      reread: "Read the list again",
      close: "Close",
    },
    undoRefused: "We couldn’t undo that swap. The deck is unchanged.",
  },

  announce: {
    taken: (cut: string, add: string) => `Taken. ${add} is in the draft and ${cut} is out.`,
    undone: (cut: string, add: string) => `Swap undone. ${cut} is back and ${add} is out.`,
    limitSaved: (figure: string) => `Marking cards over ${figure}.`,
  },

  // ── Fits your decks (card modal, after AvailabilityDetail) ──────────
  fits: {
    // R2: the Card Details callout and the stacked picker.
    callout: "Find a deck for it",
    calloutAria: (card: string) => `Find a deck for ${card}`,
    pickerTitle: "Find a deck for it",
    backLabel: (card: string) => card,
    loadingHeading: "Checking your decks",
    loadingStatus: "reading each commander’s colors…",
    groupJoin: "could take it · by name",
    groupHolds: "already holds it",
    // R4: the copies line in the picker head, and the two Add labels.
    copies: (owned: number, free: number) => (free > 0 ? `×${owned} · ${free} free` : `×${owned} · none free`),
    addUsesFree: "Add",
    addUsesFreeAria: (card: string, deck: string) => `Add ${card} to the ${deck} draft, using your free copy`,
    addToBuy: "Add to buy",
    addToBuyAria: (card: string, deck: string) => `Add ${card} to the ${deck} draft as a card to buy`,
    addedUsedLast: "It uses your free copy, so none are left.",
    hardStop: "No free copy left. Add it from the deck page to buy one.", // only if Hugh rules a hard stop
    holds: (n: number) => `holds ${n}`,
    outsideColors: (colors: string) => `${colors} is outside its colors`,
    heading: "Fits your decks",
    order: "by name",
    deckLinkAria: (deck: string) => `Open ${deck}`,
    cmdrLabel: "commander",
    cmdrFigure: (pct: string, commander: string) => `${pct}% of ${commander} decks`,
    cmdrUnlisted: (commander: string) => `not listed for ${commander}`,
    needLabel: "this deck",
    need: (role: string, count: number, target: number) => `${role} ${count} of ${target}`,
    // PROPOSED (§4 call 6), pending Hugh.
    add: "Add",
    addAria: (card: string, deck: string) => `Add ${card} to the ${deck} draft`,
    added: "in the draft",
    addedToBuy: "It joins as a card to buy.",
    addedFree: "It joins from your free copy.",
    openDeck: "Open the deck →",
    addRefused: "We couldn’t add that. The deck is unchanged.",
    excludedOne: (deck: string, colors: string, commander: string) =>
      `${deck} can’t play it: ${colors} is outside ${commander}’s colors.`,
    excludedMany: (n: number, colors: string) => `${n} more decks can’t play it: ${colors} is outside their colors.`,
    allHold: (card: string) => `Every deck that can play ${card} already holds it. They’re listed above.`,
    noneByColors: (card: string, colors: string) =>
      `None of your decks can play ${card}. It’s ${colors}, and none of your commanders has both.`,
    noneByColorsOne: (card: string, color: string) =>
      `None of your decks can play ${card}. It’s ${color}, and none of your commanders is.`,
    notLegal: (card: string) => `${card} isn’t legal in Commander, so it can’t join any of your decks.`,
    noDecks: (card: string) => `You don’t have any decks yet, so there’s nothing for ${card} to join.`,
  },
} as const;
