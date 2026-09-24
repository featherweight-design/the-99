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
  },

  // ── The stand-ins sheet (ModalChrome body, 640) ──────────────────────
  sheet: {
    title: "Cheaper stand-ins",
    closeAria: "Close cheaper stand-ins",
    replacing: (deck: string) => `replacing, in ${deck}`,
    // The job line under the original.
    jobColors: (colors: string) => `makes ${colors}`,
    jobFinds: (types: string) => `finds a ${types} card`,
    jobRole: (roles: string, mv: number) => `${roles} · mana value ${mv}`,
    jobNoRole: "no role we can name",
    givesUpNothing: "gives up nothing",
    leadLands: (colors: string) =>
      `Every land here makes ${colors}. Free copies come first, then the cheapest, and each says what it gives up.`,
    /** Hugh, 2026-09-24: every stand-in gives up the same thing, so the lead says it once. */
    leadLandsGivesUp: (colors: string, ability: string) =>
      `Every land here makes ${colors}. Free copies come first, then the cheapest, and each gives up ${ability}.`,
    leadFetchGivesUp: (types: string, ability: string) =>
      `Every land here finds a ${types}. Free copies come first, then the cheapest, and each gives up ${ability}.`,
    leadFetch: (types: string) =>
      `Every land here finds a ${types}. Free copies come first, then the cheapest, and each says what it gives up.`,
    leadSpells: (roles: string, mv: number, commander: string) =>
      `Every card here is ${roles} at mana value ${mv} or less. Free copies come first, then the rest by how often ${commander} decks run them.`,
    /** F14: the index lists nothing for this commander or pair, so the order clause has nothing to name. Owed to /copy-review. */
    leadSpellsUnlisted: (roles: string, mv: number) =>
      `Every card here is ${roles} at mana value ${mv} or less. Free copies come first, then the cheapest.`,
    /** F5: a sold-out original lists free copies only. Owed to /copy-review. */
    leadSoldOut: "This card is sold out everywhere we check, so only the copies you already own are listed here.",
    groupFree: "yours, free",
    groupCheapest: "to buy · cheapest first",
    groupByCommander: (commander: string) => `to buy · by ${commander} decks`,
    groupUnlisted: (commander: string) => `not listed for ${commander} · cheapest first`,
    free: "free",
    mv: (n: number) => `MV ${n}`,
    figure: (pct: string, commander: string) => `in ${pct}% of ${commander} decks`,
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

  announce: {
    limitSaved: (figure: string) => `Marking cards over ${figure}.`,
  },
} as const;
