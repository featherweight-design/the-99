// The 99 — /commanders and /discover
// Paste into src/lib/copy/. Two lane blocks over one shared filter block; the shared strings are
// shared precisely because they must not diverge between lanes.
// Follows the shape of src/lib/copy/shell.ts.

export const filterCopy = {
  search: {
    placeholder: "Search",
    placeholderWide: "Search commanders",
    clear: "Clear search",
  },

  colour: {
    legend: "Colour identity",
    names: { w: "White", u: "Blue", b: "Black", r: "Red", g: "Green" },
    // Chip label past one pip — never one chip per hue.
    collapsed: (n: number) => `${n} colours`,
  },

  match: {
    legend: "Colour match",
    any: "Any of these",
    exactly: "Exactly these",
    anyShort: "Any",
    exactlyShort: "Exactly",
    // Sheet only. The desktop rack says this with geometry, not words.
    disabledHint: "Pick a colour and this decides how the pips combine.",
    // Appended to the result line; only when Exactly is active AND the counts differ.
    excludedAside: (n: number) => `Exactly excludes ${n} that Any would show`,
  },

  order: {
    legend: "Order",
    trigger: (label: string) => `Order · ${label}`,
  },

  chips: {
    query: (q: string) => `"${q}"`,
    overflow: (n: number) => `+${n}`,
    clear: "Clear",
    clearAll: "Clear all filters",
    none: "no filters — nothing to clear",
  },

  sheet: {
    trigger: "Filters",
    title: "Filters",
    dismiss: (n: number) =>
      `Show ${n.toLocaleString()} ${n === 1 ? "commander" : "commanders"}`,
  },
} as const;

export const commandersCopy = {
  title: "Commanders",
  subtitle: "yours, not yet built",
  navLabel: "Commanders",
  otherLane: "Discover",

  order: {
    fit: "Fit",
    name: "Name",
    added: "Recently added",
  },

  availability: {
    legend: "Score against",
    all: "All my cards",
    free: "Free cards only",
    freeShort: "Free only",
    hint: "Free means not spoken for by a deck you've already built.",
  },

  result: {
    // At rest: a statement, not a ratio.
    rest: (n: number) =>
      `${n.toLocaleString()} ${n === 1 ? "commander" : "commanders"} you own and haven't built`,
    filtered: (shown: number, total: number) =>
      `${shown.toLocaleString()} of ${total.toLocaleString()} commanders match`,
  },

  row: {
    // Row figures, unchanged from the shipped row.
    roleCounter: (label: string, have: number, target: number) =>
      [label, `${have}/${target}`] as const,
    ownOfTop: (own: number, top: number) => `own ${own} of top ${top}`,
    freeCards: (n: number) => `${n.toLocaleString()} of your cards are free`,
    alreadyInUse: (n: number) => `${n} already in use`,
    receipts: (names: string[], more: number) =>
      `receipts: ${names.join(" · ")}${more > 0 ? ` +${more}` : ""}`,
    fitDenominator: "/100 FIT",
    delta: (d: number, from: number) => `${d < 0 ? "↓" : "↑"}${Math.abs(d)} from ${from}`,
    splitLegend: ["Pool", "Roles", "Synergy"] as const,
    fit: (score: number) => `${score} /100 fit`,
    cardsFit: (n: number) => `${n} of your cards fit`,
    cardsFitShort: (n: number) => `${n} fit`,
    freeCardsFit: (n: number) => `${n} free cards fit`,
    inUse: (n: number) => `${n} in use`,
    action: "Start this deck",
  },

  empty: {
    heading: "Nothing in the pile matches",
    // One control named, one row count promised. Only when a single control fixes it.
    bodyOneFix: (name: string, control: string, n: number) =>
      `${name} is in your commanders, but ${control} excludes it. Drop the colour and you get ${
        n === 1 ? "one row" : `${n} rows`
      } back.`,
    bodyMode: (q: string, control: string) =>
      `Two commanders match "${q}", but ${control} rules both out.`,
    bodyNoSingleFix: "No single filter is doing this — several are overlapping.",
    fixDrop: (control: string) => `Drop ${control}`,
    fixMode: "Switch to Any of these",
  },
} as const;

export const discoverCopy = {
  title: "Discover",
  subtitle: "commanders you don't own",
  navLabel: "Discover",
  otherLane: "Your commanders",

  order: {
    popularity: "Popularity",
    name: "Name",
    colour: "Colour",
  },

  // The shipped discovery scope, kept. Glosses render in the sheet only.
  scope: {
    legend: "Scope",
    bestFit: "Best fit",
    bestFitGloss: "most of its support list already owned",
    somethingNew: "Something new",
    somethingNewGloss: "farthest from the archetypes you have built",
  },

  result: {
    rest: (n: number) => `${n.toLocaleString()} commanders`,
    filtered: (shown: number, total: number) =>
      `${shown.toLocaleString()} of ${total.toLocaleString()} commanders match`,
  },

  row: {
    // Counts only — discovery does not blend, so there is no 0–100 score and no delta here.
    supportOwned: (own: number, top: number) => [`${own}`, `OF TOP ${top} OWNED`] as const,
    popularity: (n: number) => `${n.toLocaleString()} decks tracked`,
    novelty: (n: number) => `${n} of its top cards new to you`,
    notOwned: "not in your collection",
    ownOfTop: (own: number, top: number) => `own ${own} of top ${top}`,
    action: "See the pool",
  },

  empty: {
    heading: "No commander by that name",
    body: (q: string, total: number) =>
      `Nothing here matches "${q}". This lane lists the ${total.toLocaleString()} commanders you don't own — if you already own it, it's on your commanders instead.`,
    clearSearch: "Clear search",
    otherLane: "Search your commanders",
  },
} as const;
