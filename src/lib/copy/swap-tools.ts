/**
 * The swap tools' words (sub-project 4): cheaper stand-ins in Shopping, and Fits your decks.
 * Transcribed from the handoff's `swap-tools · copy strings.ts` (Design R4), one surface at a time as
 * each ships; every string is owed to /copy-review. Figures arrive formatted: this module owns the
 * words only.
 */
export const swapToolsCopy = {
  // ── The limit line (under PriceStrip, Shopping only) ─────────────────
  limit: {
    lead: "Marking cards over",
    /** The key under the line, after a `⇄` glyph: what a marked row's ⇄ does, and the door's second way in. */
    key: "on a marked row opens its cheaper stand-ins. Any card’s stand-ins are also in its details.",
    editAria: (figure: string) => `Change the limit, now ${figure}`,
    defaultChip: "default",
    /** The figure is always the $10 default. */
    reset: (figure: string) => `reset to ${figure}`,
    save: "Save",
    cancel: "cancel",
    fieldAria: "Limit per card, in dollars",
    invalid: "Use a whole dollar figure from 1 to 100,000.",
    overCount: (n: number) => `${n} over`,
    noneOver: (figure: string) => `none over ${figure}`,
  },

  // ── The row (DecklistRow, Shopping) ─────────────────────────────────
  row: {
    /** Meta line, --warning mono. */
    over: (figure: string) => `over ${figure}`,
    /** The ⇄ on an over row (R2: marked rows only). */
    swapOverAria: (name: string, figure: string) => `Cheaper stand-ins for ${name}, over your ${figure} limit`,
    // The receipt a take leaves in the cut row's slot (UndoRow's shell).
    receipt: (cut: string, add: string) => `${cut} → ${add}`,
    receiptFree: (cut: string, add: string) => `${cut} → ${add}, your free copy`,
    receiptAria: (cut: string, add: string) => `Swapped ${cut} for ${add}`,
    receiptOneCopy: (add: string) => `one copy → ${add}`,
    /** H2: reverses both halves, in the sheet and on the receipt alike. */
    undoSwap: "Undo swap",
    undoSwapAria: (cut: string, add: string) => `Undo the swap: put ${cut} back and take ${add} out`,
  },

  // ── A stand-in's card, stacked over the sheet (CardModal footer slot) ──
  modal: {
    /** The door on a card opened from a Shopping row (addendum §2). */
    seeStandIns: "See cheaper stand-ins →",
    underLimit: (figure: string) => `under your ${figure} limit`,
    overLimit: (figure: string) => `over your ${figure} limit`,
    /** The door after a take, in place of the link (addendum §3). Owed to /copy-review (F21). */
    swapped: (add: string) => `swapped out · ${add} is in`,
    inPlaceOf: (cut: string, deck: string) => `in place of ${cut}, in ${deck}`,
    /** Phone footer: desktop reads "Take". */
    take: (add: string) => `Take ${add}`,
  },

  // ── The stand-ins sheet (ModalChrome body, 640) ──────────────────────
  sheet: {
    title: "Cheaper stand-ins",
    closeAria: "Close cheaper stand-ins",
    /** Opened over a card: the close is the way back to it (addendum §3). Owed to /copy-review (F21). */
    backToCardAria: (card: string) => `Back to ${card}`,
    /** The stacked card's way back. */
    backLabel: "Cheaper stand-ins",
    replacing: (deck: string) => `replacing, in ${deck}`,
    // The job line under the original.
    jobColors: (colors: string) => `makes ${colors}`,
    /** `types` carries its own article: `an Island`, `a Mountain or Forest`. */
    jobFinds: (types: string) => `finds ${types} card`,
    jobRole: (roles: string, mv: number) => `${roles} · mana value ${mv}`,
    jobNoRole: "no role we can name",
    givesUpNothing: "gives up nothing",
    // v2 D1 (ranking-rebuild addendum): ownership is on the row, so no lead says free copies come first; a
    // free copy wins only a tie (the addendum audit's ruling 2). Every lead below is owed to /copy-review.
    leadLands: (colors: string) =>
      `Every land here makes ${colors}. Untapped lands come first, then tapped ones, then utility lands, and each says what it gives up.`,
    /** Hugh, 2026-09-24: every stand-in gives up the same thing, so the lead says it once. */
    leadLandsGivesUp: (colors: string, ability: string) =>
      `Every land here makes ${colors}. Untapped lands come first, then tapped ones, then utility lands, and each gives up ${ability}.`,
    leadFetchGivesUp: (types: string, ability: string) =>
      `Every land here finds ${types}. Untapped lands come first, then tapped ones, then utility lands, and each gives up ${ability}.`,
    leadFetch: (types: string) =>
      `Every land here finds ${types}. Untapped lands come first, then tapped ones, then utility lands, and each says what it gives up.`,
    /** The spells lead is three sentences, joined: what every card does, then the groups, then their order. */
    leadSpellsJob: (roles: string, mv: number) => `Every card here is ${roles} at mana value ${mv} or less.`,
    /** Drawn only when both groups are. */
    leadSpellsTypes: (plural: string) => `${plural[0].toUpperCase()}${plural.slice(1)} come first, then other types.`,
    leadSpellsOrder: (card: string, commander: string) =>
      `In each group, cards that do more of ${card}’s work come first, then the ones ${commander} decks favor most over other decks of their colors.`,
    /** F14: the index lists nothing for this commander or pair, so the order names no commander. */
    leadSpellsOrderUnlisted: (card: string) => `In each group, cards that do more of ${card}’s work come first, then the cheapest.`,
    /** Drawn when a staple is in the list: it sorts last in its group (addendum §1b). */
    leadSpellsStaples: "Staples every commander plays come last.",
    /** F5: a sold-out original lists free copies only. Owed to /copy-review. */
    leadSoldOut: "This card is sold out everywhere we check, so only the copies you already own are listed here.",
    /** Addendum §1b: the type groups, each with its order note on the right. */
    groupSameType: (plural: string) => `same type · ${plural}`,
    groupOtherTypes: "other types",
    orderBestMana: "best mana first",
    orderMostShared: "most in common first",
    /** Addendum §1b: the toggle under a group longer than it shows. */
    showAll: (n: number, noun: string) => `Show all ${n} ${noun}`,
    showFewer: "Show fewer",
    free: "free",
    mv: (n: number) => `MV ${n}`,
    // v2 D2 (addendum §1a): a land row's mana line, in --fg-body, then its costs in --fg-muted.
    mana: {
      line: (colors: string, state: string) => `makes ${colors}, ${state}`,
      untapped: "untapped",
      tapped: "tapped",
      /** A condition that is a price (a shock's 2 life) is the condition: no separate cost segment. */
      untappedIf: (condition: string) => `untapped if ${condition}`,
      untappedWith: (what: string) => `untapped with ${what}`,
      /** A color the land makes only by sacrificing itself. */
      once: (color: string) => `${color} once, by sacrificing it`,
      colorless: "colorless",
    },
    // v2 D2 (addendum R1): a spell row names its jobs beyond the original's, and the original's it lacks.
    also: (jobs: string) => `also ${jobs}`,
    /** Each theme and role as a row names it. Owed to /copy-review with the rest of D2. */
    job: {
      ramp: "ramp", draw: "draw", removal: "removal", wipes: "wipes",
      counters: "+1/+1 counters", pump: "pumps", haste: "haste", evasion: "evasion", etbDraw: "draws on entering",
      tokens: "tokens", treasure: "Treasure", protection: "protection", recursion: "recursion", blink: "blink",
      finisher: "a finisher", castFree: "free casts", mill: "mill", sacOutlet: "a sacrifice outlet",
      deathTrigger: "death triggers", lifegain: "life gain", drain: "drain", spellslinger: "spells matter",
      landfall: "landfall", tribal: "tribal",
    },
    /** Addendum §1: a staple's fact line ends here. No row draws a commander figure since v2 (Q2). */
    stapleFact: "staple, any commander",
    /** H3: what a stand-in for a utility land gives up, the ability named or quoted. Owed to /copy-review. */
    givesUp: (ability: string) => `gives up ${ability}`,
    drawback: {
      entersTapped: "it enters tapped",
      entersTappedUnless: (cond: string) => `enters tapped unless ${cond}`,
      damage: (n: number, colors: string) => `deals ${n} damage to you for ${colors}`,
      life: (n: number, colors: string) => `costs ${n} life for ${colors}`,
      lifeFetch: (n: number) => `costs ${n} life`,
      basicOnly: "finds only a basic",
    },
    take: "Take",
    taking: "Taking…",
    takeAria: (add: string, cut: string) => `Take ${add} in place of ${cut}`,
    taken: "taken",
    takenNote: (cut: string) =>
      `${cut} has left the draft, so the other stand-ins are put away. Undo the swap to choose a different one.`,
    // R2: a panel under the pressed row. Mirrors deckTuningCopy.card.applyRefused.
    refused: {
      tag: "not taken",
      heading: "The deck changed before this swap could land",
      /** F11: the cause is stated only when the swap body reports it (the cut is no longer in the draft). */
      body: (deck: string, cut: string, add: string) =>
        `${deck} was edited after this list was read, in another tab or on another device. Nothing moved: ${cut} is still in, and ${add} isn’t.`,
      /** F11: every other refusal, which names no cause it cannot know. Owed to /copy-review. */
      bodyPlain: (cut: string, add: string) => `Nothing moved: ${cut} is still in, and ${add} isn’t.`,
      reread: "Read the list again",
      close: "Close",
    },
    /** F4: rendered as MutationError under the row that hosts the Undo swap. */
    undoRefused: "We couldn’t undo that swap. The deck is unchanged.",
    /** A take that threw rather than refused (F11): MutationError under the row. Owed to /copy-review. */
    takeFailed: "We couldn’t make that swap. The deck is unchanged.",
    foot: (when: string) => `Cheapest printing of each, from ManaPool · last checked ${when}`,
    loadingHeading: "Checking the binder",
    loadingSpells: (roles: string) => `finding cheaper ${roles}…`,
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
    /** F5: a sold-out original with no free stand-in. The nothingCheaper sentences cite a price it has not got. Owed to /copy-review. */
    soldOutNone: (name: string) =>
      `${name} is sold out everywhere we check, and you have no free copy of anything that does its job.`,
  },

  /**
   * FITS YOUR DECKS (R2–R4, the addendum): the card modal's door and the stacked picker. Taken from
   * the handoff's copy file, which is the source where the canvas drifts (audit F13). The R1-only
   * keys (`heading`, `order`, `excludedOne`, `excludedMany`, `notLegal`, `noDecks`, `hardStop`,
   * `add`) are not carried: the door is hidden in those states, and H1 ruled no hard stop.
   */
  fits: {
    callout: "Find a deck for it",
    calloutAria: (card: string) => `Find a deck for ${card}`,
    pickerTitle: "Find a deck for it",
    backLabel: (card: string) => card,
    /** The plate's identity line, as the canvas draws it. */
    identity: (colors: string) => `${colors} · legal in Commander`,
    loadingHeading: "Checking your decks",
    loadingStatus: "reading each commander’s colors…",
    groupJoin: "could take it",
    groupHolds: "already holds it",
    copies: (owned: number, free: number) => (free > 0 ? `×${owned} · ${free} free` : `×${owned} · none free`),
    addUsesFree: "Add",
    addUsesFreeAria: (card: string, deck: string) => `Add ${card} to the ${deck} draft, using your free copy`,
    addToBuy: "Add to buy",
    addToBuyAria: (card: string, deck: string) => `Add ${card} to the ${deck} draft as a card to buy`,
    added: "in the draft",
    addedUsedLast: "It uses your free copy, so none are left.",
    addedFree: "It joins from your free copy.",
    addedToBuy: "It joins as a card to buy.",
    openDeck: "Open the deck →",
    addRefused: "We couldn’t add that. The deck is unchanged.",
    holds: (n: number) => `holds ${n}`,
    deckLinkAria: (deck: string) => `Open ${deck}`,
    cmdrLabel: "commander",
    cmdrFigure: (pct: string, commander: string) => `${pct}% of ${commander} decks`,
    cmdrUnlisted: (commander: string) => `not listed for ${commander}`,
    /** Listed with no inclusion figure: the index carries the card for this commander, so "not listed" is false. */
    cmdrListedNoFigure: (commander: string) => `listed for ${commander}`,
    /** The addendum's staple form: a universal staple quotes no one commander's figure. */
    cmdrStaple: "staple · any commander",
    needLabel: "this deck",
    need: (role: string, count: number, target: number) => `${role} ${count} of ${target}`,
    /** "They’re listed above." is not carried: the holding decks are listed BELOW this sentence. */
    allHold: (card: string) => `Every deck that can play ${card} already holds it.`,
    noneByColors: (card: string, colors: string, n: number) =>
      `None of your decks can play ${card}. It’s ${colors}, and none of your commanders has ${n === 2 ? "both" : "all of them"}.`,
    noneByColorsOne: (card: string, color: string) =>
      `None of your decks can play ${card}. It’s ${color}, and none of your commanders is.`,
    stapleLabel: "staple",
    stapleNote: (card: string) =>
      `${card} is on the shared staples list: nearly every Commander deck runs it, whatever the commander. So no deck here shows how often its commander runs it. That figure would only say “staple”.`,
    stapleNoteNoRole: (card: string) =>
      `${card} is on the shared staples list: nearly every Commander deck runs it, whatever the commander. It has no role we count, so there’s no need figure either. What’s left is which decks can take it.`,
    /** F4: the stand-ins sheet's failed shape and tag, its two sentences about decks instead of prices. */
    failed: {
      heading: "Your decks didn’t come back",
      body: "We couldn’t read your decks just now. It isn’t something you did, and it usually clears in a moment.",
    },
  },

  announce: {
    taken: (cut: string, add: string) => `Taken. ${add} is in the draft and ${cut} is out.`,
    undone: (cut: string, add: string) => `Swap undone. ${cut} is back and ${add} is out.`,
    limitSaved: (figure: string) => `Marking cards over ${figure}.`,
  },
} as const;
