import type { JobKey } from "../swaps/stand-ins";

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
    /** Stand-in row addendum (E2): a spell's job line, its type and mana value, then its jobs for this deck. Owed to /copy-review. */
    jobSpell: (type: string, mv: number, jobs: string) => `${type} · mana value ${mv} · ${jobs}`,
    jobNoRole: "no role we can name",
    /** E1: every job the card does is limited to cards this deck does not play. Owed to /copy-review. */
    jobNotHere: "no job this deck uses",
    givesUpNothing: "loses nothing",
    // v2 D1 (ranking-rebuild addendum): ownership is on the row, so no lead says free copies come first; a
    // free copy wins only a tie (the addendum audit's ruling 2). Every lead below is owed to /copy-review.
    leadLands: (colors: string) =>
      `Every land here makes ${colors}. Untapped lands come first, then tapped ones, then utility lands, and each says what it loses.`,
    /** Hugh, 2026-09-24: every stand-in gives up the same thing, so the lead says it once. */
    leadLandsGivesUp: (colors: string, ability: string) =>
      `Every land here makes ${colors}. Untapped lands come first, then tapped ones, then utility lands, and each loses ${ability}.`,
    leadFetchGivesUp: (types: string, ability: string) =>
      `Every land here finds ${types}. Untapped lands come first, then tapped ones, then utility lands, and each loses ${ability}.`,
    leadFetch: (types: string) =>
      `Every land here finds ${types}. Untapped lands come first, then tapped ones, then utility lands, and each says what it loses.`,
    /** The spells lead is three sentences, joined: what every card does, then the groups, then their order. */
    /**
     * E2: the jobs are the original's for this deck (ramp by its kind), `or`-joined: a row keeps at least one.
     * /copy-review, ratified by d9 (2026-09-26): the addendum's `, and each row says what it keeps, gains and
     * loses against it` is cut, since the row's own tags say exactly that.
     */
    leadSpellsJob: (card: string, jobs: string) => `Every card here keeps at least one of ${card}’s jobs (${jobs}).`,
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
    /** Close-out ruling 6: all five colors, wherever the sheet lists colors. Owed to /copy-review. */
    everyColor: "every color",
    /** …and the rest of them, after a mana line that named one or more. Owed to /copy-review. */
    everyOtherColor: "every other color",
    orderBestMana: "best mana first",
    orderMostShared: "most in common first",
    /** Addendum §1b: the toggle under a group longer than it shows. */
    showAll: (n: number, noun: string) => `Show all ${n} ${noun}`,
    showFewer: "Show fewer",
    free: "free",
    // v2 D2 (addendum §1a): a land row's mana line, in --fg-body, then its costs in --fg-muted.
    mana: {
      line: (colors: string, state: string) => `makes ${colors}, ${state}`,
      untapped: "untapped",
      tapped: "tapped",
      /** A condition that is a price (a shock's 2 life) is the condition: no separate cost segment. */
      untappedIf: (condition: string) => `untapped if ${condition}`,
      untappedWith: (what: string) => `untapped with ${what}`,
      /** Close-out ruling 6: "it's your first, second, or third turn of the game", said short. Owed to /copy-review. */
      untappedEarly: "untapped on your first three turns",
      /** The reveal lands' condition: `with a Soldier in hand or play`. Owed to /copy-review. */
      inHandOrPlay: (type: string) => `a ${type} in hand or play`,
      /** A color the land makes only by sacrificing itself. */
      once: (color: string) => `${color} once, by sacrificing it`,
      colorless: "colorless",
    },
    /**
     * Stand-in row addendum 3a (E2): a spell row's comparison. The tags draw these uppercase, and each group
     * carries the same word, visually hidden, for a screen reader. Owed to /copy-review.
     */
    compare: { keeps: "keeps", gains: "gains", loses: "loses", staple: "staple" },
    /** E2: a lower mana value, written as the last gain so the budget drops it first. */
    mvGain: (mv: number) => `mana value ${mv}`,
    /** Each theme and role as a row names it. Owed to /copy-review with the rest of D2. */
    job: {
      ramp: "ramp", draw: "draw", removal: "removal", wipes: "wipes",
      // E1 ruling b: a row names ramp by its kind, since a stand-in keeps ramp only in a kind it shares.
      tapsForMana: "taps for mana", fetchesLand: "fetches a land", makesTreasure: "makes Treasure", burstMana: "one-shot mana",
      counters: "+1/+1 counters", pump: "pumps", haste: "haste", evasion: "evasion", etbDraw: "draws on entering",
      tokens: "tokens", treasure: "Treasure", protection: "protection", recursion: "recursion", blink: "blink",
      finisher: "a finisher", castFree: "free casts", mill: "mill", sacOutlet: "a sacrifice outlet",
      deathTrigger: "death triggers", lifegain: "life gain", drain: "drain", spellslinger: "spells matter",
      landfall: "landfall", tribal: "tribal",
      // Label-only kinds (the vocabulary plan's Task 3): only a labelled card can name one. Through /copy-review 2026-10-02.
      tutor: "a tutor", counterspell: "a counterspell",
      costReduction: "cheaper spells", extraLandDrop: "extra land drops", multiplies: "more mana",
      graveyardHate: "graveyard hate", discard: "discard", stax: "stax", clones: "clones", theft: "theft",
      poison: "poison", goad: "goad", doublers: "doublers", fog: "a fog",
    } satisfies Record<JobKey | "ramp", string>,
    /**
     * Q3 (the run plan's Task 5, rule 6): the permanent answer a labelled stand-in does not keep, among a
     * row's `loses` ("keeps removal  loses exile"). Through /copy-review 2026-10-02.
     */
    method: { destroy: "destroy", exile: "exile", bounce: "bounce", shrink: "shrink", sacrifice: "sacrifice", bottom: "tuck" },
    /**
     * H3: what a stand-in for a utility land gives up, the ability named or counted. E2 (d9, 2026-09-26): it reads
     * `loses`, the spell rows' word, so both kinds of row share one vocabulary. Owed to /copy-review.
     */
    givesUp: (ability: string) => `loses ${ability}`,
    /** Close-out ruling 6: a row never quotes; the abilities no pattern names are counted instead. Owed to /copy-review. */
    otherAbilities: (n: number, afterNamed: boolean) =>
      afterNamed ? (n === 1 ? "one more" : `${n} more`) : n === 1 ? "an ability" : `${n} abilities`,
    drawback: {
      entersTapped: "it enters tapped",
      entersTappedUnless: (cond: string) => `enters tapped unless ${cond}`,
      damage: (n: number, colors: string) => `deals ${n} damage to you for ${colors}`,
      life: (n: number, colors: string) => `costs ${n} life for ${colors}`,
      lifeFetch: (n: number) => `costs ${n} life`,
      /** Close-out ruling 6: damage paid for every color the row's mana line names, which it need not repeat. */
      damageAny: (n: number) => `deals ${n} damage to you`,
      basicOnly: "finds only a basic",
    },
    take: "Take",
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
    /** E1: the card's jobs reach only cards this deck does not play (a Wolf lord in a Dinosaur deck). */
    noJobHere: (name: string) =>
      `Everything ${name} does is limited to cards this deck doesn’t play, so there are no stand-ins for it.`,
    /** Neither its text nor, with the stand-ins' labels on, its card label names a job this deck can use:
     *  true of a card with no readable job, and of a labelled one whose jobs this deck cannot use. */
    noRole: (name: string) =>
      `${name} does no job we can name in this deck, so there are no stand-ins for it. We won’t guess at one.`,
    noRoleLand: (name: string) =>
      `${name}’s job is its own text, not a color it makes or a land it finds, so there are no stand-ins for it. We won’t guess at one.`,
    /** E1: `jobs` are the original's jobs as a stand-in must keep them (ramp by its kind), `or`-joined. Owed to /copy-review. */
    nothingCheaper: (jobs: string, mv: number, commander: string, price: string) =>
      `Nothing cheaper does this job (${jobs}) at mana value ${mv} or less in ${commander}’s colors. Every card that does costs more than ${price}, and you have no free copy of one.`,
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
    /** The addendum's staple form: a universal staple quotes no one commander's figure. */
    cmdrStaple: "staple · any commander",
    // v2 D3 (ranking-rebuild addendum §1c): the row's one reason line, `{reason} · this deck {need}`.
    /** The group's order note (Hugh's Q7). Owed to /copy-review. */
    orderReasons: "combos first, then themes",
    /** Followed by the other piece's name, dotted: it opens that card. */
    reasonCombo: "Completes a combo with",
    reasonTheme: (n: number, word: string) => `Joins ${n} other ${word} ${n === 1 ? "card" : "cards"}`,
    needLabel: "this deck",
    /** Each theme as the reason line names it: `Joins 9 other mill cards`. Owed to /copy-review. */
    themeWord: {
      counters: "+1/+1 counter", pump: "pump", haste: "haste", evasion: "evasion", etbDraw: "card-draw",
      draw: "card-draw", tokens: "token", treasure: "Treasure", protection: "protection", recursion: "recursion",
      blink: "blink", finisher: "finisher", castFree: "free-cast", mill: "mill", sacOutlet: "sacrifice",
      deathTrigger: "death-trigger", lifegain: "lifegain", drain: "drain", spellslinger: "spellslinger",
      landfall: "landfall", tribal: "tribal",
    },
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
    /**
     * FIND A DECK, WITH A READ (handoff `design_handoff_the99_find_a_deck_read`, R2): the view inside
     * card details, its press, the read's rows and the fold over the free list. Transcribed from the
     * handoff's `find-a-deck-read · copy strings.ts`, through /copy-review. The model's sentence is not
     * copy (it is validated, locks 1 to 3); every figure here is the app's own count.
     */
    read: {
      backAria: (card: string) => `Back to ${card}`,
      press: "Which deck needs it most?",
      pressAria: (card: string) => `Which deck needs ${card} most? Uses 1 credit.`,
      pressAriaSpent: "Which deck needs it most? No credits left.",
      /** The press's segment, after the drawn ◆. */
      credit: "1 credit",
      offerLead: (n: number, card: string) =>
        `A closer read of the ${n} decks that can take ${card}: the few it really helps, how it helps each one in that deck’s own cards, and what it would replace.`,
      offerLeadOne: (deck: string, card: string) =>
        `A closer read of ${deck}, the one deck that can take ${card}: how it would help, in that deck’s own cards, and what it would replace.`,
      running: (n: number, card: string) => (n === 1 ? `Reading one deck for ${card}` : `Reading ${n} decks for ${card}`),
      /** Followed by ` · {elapsed}`. */
      runningSub: "each deck’s plan and list, against the card’s text",
      runningKeep: "The list below stays as it is. You can leave this view; the read keeps going and waits here.",
      announceStarted: "Reading your decks.",
      /** Under the door in card details while a read for this card runs. */
      doorReading: "reading your decks…",
      resultHead: "Where it helps most",
      resultSubNow: (shown: number, n: number) => `read just now · ${shown} of ${n} decks`,
      resultSubNowOne: "read just now · the one deck",
      /** `when` is `Oct 11, 9:42 PM` in the reader's clock. */
      resultSubStored: (when: string, shown: number, n: number) => `read ${when} · ${shown} of ${n} decks`,
      /** Followed by ` · ` and the standing line. */
      resultFootSpent: "Used a credit",
      resultFootStored: "Free to reopen while your decks stay as they are.",
      onlyOne: (deck: string, card: string) => `${deck} is the only deck that can take ${card}`,
      /** The plan source, last in the commander line. */
      planFrom: { v2: "from its overview", older: "from an older overview", none: "from commander and themes" },
      swapIn: "Swap in",
      swapInToBuy: "Swap in to buy",
      swapped: "Swapped in",
      swapInAria: (card: string, deck: string, cut: string) => `Swap ${card} into ${deck}, cutting ${cut}`,
      swappedAria: (card: string, deck: string, cut: string) => `${card} is in ${deck} and ${cut} is out. Press to put ${cut} back.`,
      addOnly: "Add only",
      addOnlyToBuy: "Add only, to buy",
      added: "Added",
      addedToBuy: "Added, to buy",
      addOnlyAria: (card: string, deck: string) => `Add ${card} to ${deck} without cutting anything`,
      addedAria: (card: string, deck: string) => `${card} is in the ${deck} draft, with nothing cut. Press to take it out.`,
      addedNote: (deck: string) => `In the draft, which is now at 100. Cut a card of your choice from ${deck}.`,
      cutLabel: "cut",
      cutNote: "goes out when you swap it in",
      cutNoteSwapped: "out of the draft · press Swapped in to put it back",
      cutNoteAdded: "still in · cut it or anything else",
      swapRefused: "We couldn’t make that swap. The deck is unchanged.",
      undoRefused: "We couldn’t undo that. The deck is unchanged.",
      announceReady: (n: number) => (n === 1 ? "The read found one deck." : `The read found ${n} decks.`),
      announceSwapped: (card: string, cut: string) => `Swapped. ${card} is in the draft and ${cut} is out.`,
      announceUndone: (card: string, cut: string) => `Swap undone. ${cut} is back and ${card} is out.`,
      announceAdded: (card: string, deck: string) => `Added. ${card} is in the ${deck} draft.`,
      announceAddUndone: (card: string, deck: string) => `Taken out. ${card} is out of the ${deck} draft.`,
      thin: (kept: number) =>
        kept === 1 ? "Only one deck held up, so the credit came back." : `Only ${kept} decks held up, so the credit came back.`,
      /** Followed by ` · ` and the standing line (READINESS-audit F10: says they didn’t check out, not against what). */
      thinSub: "The other decks it named didn’t check out",
      noFitHead: "None of these decks is a real fit",
      noFitBody: (n: number, card: string) =>
        `The read went through the ${n} decks that can take ${card} and found none whose plan it really helps. The credit came back.`,
      noFitBodyOne: (deck: string, card: string) =>
        `The read went through ${deck}, the one deck that can take ${card}, and found it isn’t a real fit. The credit came back.`,
      noFitBodyStored: (n: number, card: string) => `The read went through the ${n} decks that can take ${card} and found none whose plan it really helps.`,
      noFitFootNow: "read just now · kept until your decks change",
      noFitFootStored: (when: string) => `read ${when} · kept until your decks change`,
      announceNoFit: "No real fit. The credit came back.",
      failedTag: "Didn’t finish",
      failedHead: "The read didn’t come back",
      failedBody: "The credit came back, and the list below is as it was. It isn’t something you did.",
      retry: "Try again",
      announceFailed: "The read didn’t come back. The credit came back.",
      fold: "Every deck that could take it",
      foldAria: (n: number, open: boolean) => `${open ? "Hide" : "Show"} every deck that could take it, ${n}`,
    },
  },

  announce: {
    taken: (cut: string, add: string) => `Taken. ${add} is in the draft and ${cut} is out.`,
    undone: (cut: string, add: string) => `Swap undone. ${cut} is back and ${add} is out.`,
    limitSaved: (figure: string) => `Marking cards over ${figure}.`,
  },
} as const;
