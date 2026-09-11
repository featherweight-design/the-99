// src/lib/copy/set-collections.ts
//
// Production strings for /collection/sets and /collection/sets/[code].
// Three blocks: setsIndexCopy, setPageCopy, and setFilterCopy shared by both.
//
// Conventions carried from lib/copy/lanes.ts and copy/availability.ts:
//   - figures are interpolated, never baked into a sentence fragment
//   - every plural has an explicit singular
//   - nothing here names an internal noun (no "base_set_size", no "booster")

export const setFilterCopy = {
  colour: {
    // mounted verbatim from the /collection filter — strings reused by reference,
    // NOT redeclared here. Listed so nobody re-invents them.
    source: "src/lib/copy/collection.ts#colourFilter",
  },
  rarity: {
    label: "Rarity",
    all: "Rarity · all",
    value: (r: "common" | "uncommon" | "rare" | "mythic") => `Rarity · ${r}`,
    options: { common: "Common", uncommon: "Uncommon", rare: "Rare", mythic: "Mythic" },
    letters: { common: "C", uncommon: "U", rare: "R", mythic: "M" },
  },
  missingOnly: {
    label: "Missing only",
    ariaOn: "Showing only cards you do not own",
    ariaOff: "Showing every card in the set",
  },
  clear: "Clear filters",
  sheetPrimary: (n: number) => (n === 1 ? "Show 1 card" : `Show ${n} cards`),
  countBadgeAria: (n: number) => (n === 1 ? "1 filter on" : `${n} filters on`),
} as const;

export const setsIndexCopy = {
  breadcrumb: "Collection / Sets",
  title: "Your sets",
  subtitle: (n: number) =>
    n === 1
      ? "1 set you hold cards in. Completion counts the base numbered run."
      : `${n} sets you hold cards in, newest first. Completion counts the base numbered run.`,

  search: {
    placeholder: "Find any set",
    ariaLabel: "Search every collectible set",
    clear: "Clear the search",
  },

  // At rest.
  restLine: (sets: number, cards: number) =>
    `${sets} sets · ${cards.toLocaleString()} cards`,

  // Search active. The second clause only prints when newToYou > 0.
  resultLine: (matched: number, newToYou: number) => {
    const head = matched === 1 ? "1 collectible set matches" : `${matched} collectible sets match`;
    if (newToYou === 0) return head;
    return `${head} · ${newToYou === 1 ? "1 of them is" : `${newToYou} of them are`} new to you`;
  },

  notIndexed: {
    tag: "not indexed yet",
    aria: "This set's checklist has not been indexed yet",
  },

  row: {
    ratioAria: (have: number, total: number, name: string) =>
      `${name}: you have ${have} of ${total} in the base run`,
    zeroAria: (total: number, name: string) =>
      `${name}: you have none of ${total} in the base run`,
  },

  firstRun: {
    heading: "Upload your collection and the sets appear",
    body:
      "This page is built from what you own. Bring a ManaBox or CSV export and every set you have a card from lands here, counted.",
    primary: "Upload a collection",
    secondary: "or search a set to browse it at 0%",
  },

  noMatch: {
    heading: (q: string) => `No set called ${q}`,
    body:
      "Search covers every collectible set, not only yours — so this is a spelling, not a gap in your collection.",
    action: "Clear the search",
  },

  tail: (remaining: number) =>
    remaining === 1 ? "… 1 more set" : `… ${remaining} more sets`,
} as const;

export const setPageCopy = {
  breadcrumb: (code: string) => `Collection / Sets / ${code.toUpperCase()}`,

  head: {
    meta: (code: string, released: string, base: number, extras: number) =>
      `${code.toUpperCase()} · released ${released} · ${base} in the base run · ${extras} extras`,
    ratioNote: "base run only · extras counted apart",
    ratioAria: (have: number, total: number) =>
      `You have ${have} of ${total} cards in the base run`,
  },

  cost: {
    label: "Cost to complete",
    // R3: at 100% the same strip re-scopes to the extras rather than being
    // replaced by a button. Same component, same sentence shape, same selector.
    labelExtras: "Cost to finish the extras",
    lineExtras: (priced: number, missing: number) =>
      `over ${priced} of the ${missing} you are missing`,
    // Always states its own gap. Never a bare total.
    line: (priced: number, missing: number) =>
      `over ${priced} of the ${missing} missing`,
    unpriced: (n: number) =>
      n === 1
        ? "1 has never been stocked and is not in this figure"
        : `${n} have never been stocked and are not in this figure`,
    // Page-level staleness. Prints only when the feed itself trails.
    stale: (asOf: string) => `prices as of ${asOf}`,
    // The page's one selector. Its count always equals the sentence's.
    send: (n: number) => (n === 1 ? "Send 1 to ManaPool" : `Send ${n} to ManaPool`),
    sendAria: (n: number, total: string) =>
      `Open a ManaPool cart with ${n} missing cards, ${total}`,
    emptyTotal: "$0.00 over 0 of 0",
  },

  sections: {
    base: "Base run",
    baseNote: (first: string, last: string) => `${first}–${last} · this is the run the figure counts`,
    extras: "Extras",
    extrasNote: (first: string, last: string) =>
      `${first}–${last} · showcase, borderless and promos. Not in the headline figure.`,
    jump: "extras ↓",
  },

  result: {
    rest: (cells: number, have: number, missing: number) =>
      `${cells} cells · ${have} yours, ${missing} missing`,
    missingOnly: (n: number) =>
      `${n} missing · numbers skip — the cards you own are hidden`,
    filtered: (shown: number, total: number) => `${shown} of ${total} cells`,
  },

  cell: {
    // The cell is the target; this is its accessible name.
    aria: (name: string, num: string, owned: boolean, price?: string) =>
      owned
        ? `${name}, ${num}, in your collection`
        : `${name}, ${num}, not in your collection${price ? `, ${price}` : ""}`,
    foil: "◆ FOIL",
    foilAria: "You hold this in foil",
    noStock: "no stock",
    noStockAria: "Never stocked at ManaPool",
    foilPrice: (p: string) => `◆ foil ${p}`,
    foilPriceAria: (p: string) => `Available in foil only, ${p}`,
  },

  // Ruling 4, ruled at R2: a per-cell mark, not a head line. The outlined
  // diamond is the unset half of printing_picker's filled "Your pick".
  unpinned: {
    mark: "BY NAME",
    aria: (name: string) =>
      `${name}: matched to this set by name. Open the card to pick which printing you own.`,
  },

  // An upload completed while this page was open. The delta is for THIS set
  // only, and the strip does not render when it is zero.
  staleAfterUpload: {
    line: (n: number) =>
      n === 1
        ? "Your upload finished. 1 more card from this set is in your collection now."
        : `Your upload finished. ${n} more cards from this set are in your collection now.`,
    action: "Refresh the grid",
  },

  complete: {
    heading: (set: string) => `${set}, complete`,
    line: (total: number) => `all ${total} of the base run`,
    // R3: `nothing left to buy` and `nothing missing to show` are deleted as
    // superfluous, and Missing-only is REMOVED at 100% rather than greyed —
    // so there is no inert-toggle gloss to write.
    extrasCount: (have: number, total: number) => `Extras ${have} / ${total}`,
    extrasGloss: "the only thing left in this set",
    noExtras: "Nothing left in this set",
  },

  zeroResults: {
    // With missing-only ON, zero is good news and the copy has to say so.
    headingOwnsAll: (what: string) => `You are not missing any ${what}`,
    bodyOwnsAll: (n: number, set: string) =>
      `There ${n === 1 ? "is 1" : `are ${n}`} in ${set} and you hold ${n === 1 ? "it" : "all of them"}.`,
    // With missing-only OFF, zero means the filters excluded everything.
    headingNone: (what: string) => `No ${what} in this set`,
    showAll: (n: number) => (n === 1 ? "Show it" : `Show all ${n}`),
    clear: "Clear filters",
  },

  unknownCode: {
    heading: (code: string) => `No set with the code ${code.toUpperCase()}`,
    body: "Either the link is wrong or the set is too new for our checklist. Your sets are all one tap away.",
    action: "Back to your sets",
  },

  nonCollectible: {
    heading: (name: string) => `${name} has no set to complete`,
    body: (n: number) =>
      `It has no fixed numbered run, so there is no denominator and nothing to be missing from. Your ${n} ${
        n === 1 ? "card" : "cards"
      } from it ${n === 1 ? "is" : "are"} all in your collection.`,
    primary: (n: number) => `See ${n === 1 ? "it" : `those ${n}`} in Collection`,
    secondary: "Back to your sets",
  },

  entryPoint: {
    label: "By set",
    aria: "Browse your collection by set",
  },
} as const;
