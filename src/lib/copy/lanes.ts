// The 99 — /commanders and /discover
// Transcribed from design/design_handoff_the99_commanders_discover/commanders-discover · copy
// strings.ts. Two lane blocks over one shared filter block; the shared strings are shared
// precisely because they must not diverge between lanes.
// Follows the shape of src/lib/copy/shell.ts.

// The locale is pinned, as in commanders-plane.ts: an unpinned toLocaleString() renders "3.301"
// or "3 301" for a reader whose machine is not on en-US, and these strings ship verbatim.
const n = (v: number) => v.toLocaleString("en-US");

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
    collapsed: (count: number) => `${count} colours`,
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
    excludedAside: (excluded: number) => `Exactly excludes ${excluded} that Any would show`,
  },

  order: {
    legend: "Order",
    trigger: (label: string) => `Order · ${label}`,
  },

  chips: {
    query: (q: string) => `"${q}"`,
    overflow: (extra: number) => `+${extra}`,
    clear: "Clear",
    clearAll: "Clear all filters",
    none: "no filters — nothing to clear",
  },

  sheet: {
    trigger: "Filters",
    title: "Filters",
    dismiss: (shown: number) => `Show ${n(shown)} ${shown === 1 ? "commander" : "commanders"}`,
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
    rest: (count: number) =>
      `${n(count)} ${count === 1 ? "commander" : "commanders"} you own and haven't built`,
    filtered: (shown: number, total: number) => `${n(shown)} of ${n(total)} commanders match`,
  },

  row: {
    // Row figures, unchanged from the shipped row.
    roleCounter: (label: string, have: number, target: number) =>
      [label, `${have}/${target}`] as const,
    ownOfTop: (own: number, top: number) => `own ${own} of top ${top}`,
    freeCards: (count: number) => `${n(count)} of your cards are free`,
    alreadyInUse: (count: number) => `${count} already in use`,
    receipts: (names: string[], more: number) =>
      `receipts: ${names.join(" · ")}${more > 0 ? ` +${more}` : ""}`,
    fitDenominator: "/100 FIT",
    // The same slot when synergy went unmeasured: the figure is out of what
    // could be scored, and printing `/100` there would claim a reading nobody took.
    fitDenominatorMeasurable: (max: number) => `/${n(max)} MEASURABLE FIT`,
    delta: (d: number, from: number) => `${d < 0 ? "↓" : "↑"}${Math.abs(d)} from ${from}`,
    splitLegend: ["Pool", "Roles", "Synergy"] as const,
    fit: (score: number) => `${score} /100 fit`,
    cardsFit: (count: number) => `${count} of your cards fit`,
    cardsFitShort: (count: number) => `${count} fit`,
    freeCardsFit: (count: number) => `${count} free cards fit`,
    inUse: (count: number) => `${count} in use`,
    action: "Start this deck",
  },

  empty: {
    heading: "Nothing in the pile matches",
    // One control named, one row count promised. Only when a single control fixes it.
    bodyOneFix: (name: string, control: string, rows: number) =>
      `${name} is in your commanders, but ${control} excludes it. Drop the colour and you get ${
        rows === 1 ? "one row" : `${rows} rows`
      } back.`,
    bodyMode: (q: string, control: string) =>
      `Two commanders match "${q}", but ${control} rules both out.`,
    bodyNoSingleFix: "No single filter is doing this — several are overlapping.",
    fixDrop: (control: string) => `Drop ${control}`,
    fixMode: "Switch to Any of these",
  },

  // The mirror of `discoverCopy.empty`, said about the other lane. A name that
  // matches nothing here may still be a commander, and that boundary is the one
  // thing a spelling hint could never tell the reader.
  emptySearch: {
    heading: "No commander by that name",
    body: (q: string, total: number) =>
      `Nothing in your commanders matches "${q}". This lane lists the ${n(
        total,
      )} you own — if you don't own it yet, it's on Discover instead.`,
    clearSearch: "Clear search",
    otherLane: "Search Discover",
  },
} as const;

export const discoverCopy = {
  title: "Discover",
  subtitle: "commanders you don't own",
  navLabel: "Discover",
  otherLane: "Your commanders",

  // Design left the third order open. Readiness decision 3 settled it as Recently released,
  // which the earliest dated set a commander was printed in backs (`sets.released_at`, taken
  // through `printings`); a Colour order has no query behind it, so it is absent rather than
  // shipped dark.
  order: {
    popularity: "Popularity",
    name: "Name",
    recent: "Recently released",
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
    rest: (count: number) => `${n(count)} commanders`,
    filtered: (shown: number, total: number) => `${n(shown)} of ${n(total)} commanders match`,
  },

  row: {
    // Counts only — discovery does not blend, so there is no 0–100 score and no delta here.
    supportOwned: (own: number, top: number) => [`${own}`, `OF TOP ${top} OWNED`] as const,
    popularity: (decks: number) => `${n(decks)} decks tracked`,
    novelty: (count: number) => `${count} of its top cards new to you`,
    notOwned: "not in your collection",
    ownOfTop: (own: number, top: number) => `own ${own} of top ${top}`,
    action: "See the pool",
  },

  empty: {
    heading: "No commander by that name",
    body: (q: string, total: number) =>
      `Nothing here matches "${q}". This lane lists the ${n(
        total,
      )} commanders you don't own — if you already own it, it's on your commanders instead.`,
    clearSearch: "Clear search",
    otherLane: "Search your commanders",
  },
} as const;
