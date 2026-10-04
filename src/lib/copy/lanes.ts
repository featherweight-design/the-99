// The 99 — /commanders and /discover
// Transcribed from design/design_handoff_the99_commanders_discover/commanders-discover · copy
// strings.ts. Two lane blocks over one shared filter block; the shared strings are shared
// precisely because they must not diverge between lanes.
// Follows the shape of src/lib/copy/shell.ts.

// The locale is pinned, as in commanders-plane.ts: an unpinned toLocaleString() renders "3.301"
// or "3 301" for a reader whose machine is not on en-US, and the FIGURE ships as written.
import type { FilterPanelCopy } from "./collection";

const n = (v: number) => v.toLocaleString("en-US");

export const filterCopy = {
  search: {
    placeholder: "Search",
    placeholderWide: "Search commanders",
    clear: "Clear search",
  },

  colour: {
    legend: "Color identity",
    names: { w: "White", u: "Blue", b: "Black", r: "Red", g: "Green" },
    // Chip label past one pip — never one chip per hue.
    collapsed: (count: number) => `${count} colors`,
  },

  match: {
    legend: "Color match",
    any: "Any of these",
    exactly: "Exactly these",
    anyShort: "Any",
    exactlyShort: "Exactly",
    // Appended to the result line; only when Exactly is active AND the counts differ.
    excludedAside: (excluded: number) => `Exactly excludes ${excluded} that Any would show`,
  },

  order: {
    legend: "Order",
    trigger: (label: string) => `Order · ${label}`,
  },

  chips: {
    query: (q: string) => `"${q}"`,
    clear: "Clear",
    clearAll: "Clear all filters",
  },

  sheet: {
    trigger: "Filters",
    title: "Filters",
    dismiss: (shown: number) => `Show ${n(shown)} ${shown === 1 ? "commander" : "commanders"}`,
  },

  // Filter-chassis decision 9, from that handoff's `printedIn` block. "Printed in", never "Set":
  // the control matches ANY printing of the commander, and the row draws whatever art the card
  // resolves to, so a name claiming to describe the thing on screen would be a visible
  // contradiction. `/collection`'s `Set ▾` keeps its own name (decision 10): it answers "sets I
  // hold cards from", a different question with a different count behind it.
  printedIn: {
    legend: "Printed in",
    one: (code: string) => `Printed in ${code.toUpperCase()}`,
    many: (codes: readonly string[]) => `Printed in ${codes.map((c) => c.toUpperCase()).join(", ")}`,
    manyShort: (count: number) => `Printed in ${count} sets`,
    // Shown once in the panel head. It is the whole reason the control is not called Set.
    hint: "Matches any printing, including ones you don't own.",
    removeAria: "Clear the printed-in filter",
    // The sheet's row, which says what is CHOSEN; the legend above it names the dimension.
    rowAny: "Any set",
    // The phone's set list, the second layer over the filter sheet.
    listNone: "No sets to filter by.",
    listEmpty: (query: string) => `No set matches “${query}”.`,
    listShown: (shown: number) => `${n(shown)} ${shown === 1 ? "commander" : "commanders"} shown`,
  },
} as const;

const commanders = (v: number) => `${n(v)} ${v === 1 ? "commander" : "commanders"}`;

/**
 * `Printed in ▾` as `FilterPanel` reads it (the wide popover and the phone sheet's own panel),
 * and as the shared set list reads it. Counts here are commanders, not cards.
 */
export const printedInPanelCopy: FilterPanelCopy = {
  triggerLabel: filterCopy.printedIn.legend,
  // Counted, like `/collection`'s Set: set names are long and varied, and a count keeps the
  // trigger one width from nothing chosen to many. The names live in the chip.
  triggerCount: (count: number) => (count === 0 ? "Printed in" : `Printed in ${count}`),
  triggerAriaCollapsed: "Filter by printed-in set, collapsed",
  triggerAriaWithSelection: (count: number) => `Filter by printed-in set, ${n(count)} selected, collapsed`,
  panelAriaLabel: "Filter by printed-in set",
  sheetTitle: "Printed in",
  searchPlaceholder: "Search sets",
  searchAriaLabel: "Search sets",
  clearSearch: "Clear search",
  groupDefault: "Newest first",
  groupSelected: (count: number) => `Selected · ${n(count)}`,
  groupMatches: (count: number) => (count === 1 ? "1 match" : `${n(count)} matches`),
  optionAria: (setName: string, count: number) => `${setName}, ${commanders(count)}`,
  optionAriaUnavailable: (setName: string) => `${setName}, no commanders match your other filters`,
  footerTotal: (total: number) => `${n(total)} ${total === 1 ? "set" : "sets"}`,
  footerSelected: (count: number, total: number) => `${n(count)} of ${n(total)} selected`,
  clear: "Clear",
  // The nested form (PrintedInControl's SetListSheet, a layer over the filter sheet) overrides
  // this to "Back to filters" at its own call site. This object also backs SetsField's
  // standalone phone sheet (intake, deck tuning) with no filter sheet to return to, so the
  // shared default stays "Done".
  done: "Done",
  closeLabel: "Close",
  emptyTitle: "No set by that name",
  emptyBody: (query: string) => ({
    before: "No set matches ",
    query: `“${query}”`,
    after: ".",
  }),
  announceMatches: (count: number, query: string) =>
    count === 0 ? `No sets match ${query}` : `${n(count)} ${count === 1 ? "set matches" : "sets match"} ${query}`,
  announceAdded: (setName: string, sets: number, shown: number, total: number) =>
    `${setName} added. ${n(sets)} ${sets === 1 ? "set" : "sets"}, ${n(shown)} of ${commanders(total)} shown.`,
  announceRemoved: (setName: string, sets: number, shown: number, total: number) =>
    sets === 0
      ? `${setName} removed. No set filter, ${commanders(shown)} shown.`
      : `${setName} removed. ${n(sets)} ${sets === 1 ? "set" : "sets"}, ${n(shown)} of ${commanders(total)} shown.`,
  announceCleared: (shown: number) => `Printed-in filter cleared. ${commanders(shown)} shown.`,
};

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

  // The legend names what the control DOES, and it does two things now: it picks
  // the pool every score is read against, and it picks which commanders the lane
  // lists at all. "Score against" was true of the first and silent about the
  // second, which is how a commander sitting in another deck's 99 came to read as
  // free. It is still never shortened to "Availability" — that word collides with
  // the builder's `Owned only`, which filters a collection and asks a different
  // question.
  availability: {
    legend: "Build from",
    all: "All my cards",
    free: "Free cards only",
    freeShort: "Free only",
    hint: "Free means not spoken for by a deck you've already built.",
    // Appended to the result line, free mode only, only when it hid something.
    // The reader has just watched a count drop; this is the sentence that says
    // where those rows went without putting them back.
    sleevedAside: (hidden: number) =>
      hidden === 1
        ? "1 more is sleeved into a deck you've built"
        : `${n(hidden)} more are sleeved into decks you've built`,
  },

  result: {
    // At rest: a statement, not a ratio.
    rest: (count: number) =>
      `${n(count)} ${count === 1 ? "commander" : "commanders"} you own and haven't built`,
    filtered: (shown: number, total: number) => `${n(shown)} of ${n(total)} commanders match`,
  },

  row: {
    fitDenominator: "/100 FIT",
    // The same slot when synergy went unmeasured: the figure is out of what
    // could be scored, and printing `/100` there would claim a reading nobody took.
    fitDenominatorMeasurable: (max: number) => `/${n(max)} MEASURABLE FIT`,
    // `action` is RETIRED. It named the hover-revealed `Start this deck` pill at
    // the end of the owned row; the discover lane dropped its equivalent when the
    // pill was found to restate the destination the whole row already carries,
    // and this lane follows. A control revealed on hover is discovered by
    // accident and has no phone state at all.
  },

  empty: {
    heading: "Nothing in the pile matches",
    // One control named, one row count promised. Only when a single control fixes it.
    // `kind` says which control is named, because the sentence says what to drop: a color is
    // one pip, and Printed in is one control however many sets it names.
    bodyOneFix: (name: string, control: string, rows: number, kind: "color" | "sets" = "color") =>
      `${name} is in your commanders, but ${control} excludes it. Drop the ${
        kind === "sets" ? "set filter" : "color"
      } and you get ${rows === 1 ? "one row" : `${rows} rows`} back.`,
    bodyMode: (q: string, control: string) =>
      `Two commanders match "${q}", but ${control} rules both out.`,
    bodyNoSingleFix: "No single filter is doing this. Several are overlapping.",
    fixDrop: (control: string) => `Drop ${control}`,
    fixMode: "Switch to Any of these",
  },

  // Free mode with nothing left to show, and no other control lit — every
  // commander this player owns is sleeved into a deck they have built. Its own
  // state rather than `empty`'s, because that one names a filter to drop and the
  // fix here is the other half of one control. The button carries the segment's
  // own label, so pressing it lands the reader somewhere they can already name.
  emptyFree: {
    heading: "They're all in decks already",
    body: "Nothing you own is free to lead a new deck right now.",
    // The same state reached through the search box. It must exist separately,
    // because the lane's other search-empty sentence says the commander may not
    // be owned and points at Discover — which is exactly false here: the reader
    // owns it, and a deck they built is holding it.
    searchBody: (q: string) =>
      `Your commanders matching "${q}" are all sleeved into decks you've built.`,
    fix: "All my cards",
  },

  // The mirror of `discoverCopy.empty`, said about the other lane. A name that
  // matches nothing here may still be a commander, and that boundary is the one
  // thing a spelling hint could never tell the reader.
  emptySearch: {
    heading: "No commander by that name",
    body: (q: string, total: number) =>
      `Nothing in your commanders matches "${q}". This lane lists the ${n(
        total,
      )} you own. If you don't own it yet, it's on Discover instead.`,
    clearSearch: "Clear search",
    otherLane: "Search Discover",
  },
} as const;

export const discoverCopy = {
  title: "Discover",
  subtitle: "commanders you don't own",
  navLabel: "Discover",
  otherLane: "Your commanders",

  // Readiness decision 3 settled Recently released as an order, which the earliest dated set a
  // commander was printed in backs (`sets.released_at`, taken through `printings`); a Colour
  // order has no query behind it, so it is absent rather than shipped dark.
  //
  // `bestFit` and `somethingNew` were the scope control's two values and are now the first two
  // orders. Every option carries a gloss, because five orders that all sound plausible need one
  // line each saying what they sort on — and the two rankings especially, since they are the
  // only ones that change which commanders the list holds. The owned lane's `Fit` and `Name`
  // are drawn without them.
  order: {
    bestFit: "Best fit",
    bestFitGloss: "most of its support list already owned",
    somethingNew: "Something new",
    somethingNewGloss: "farthest from the archetypes you have built",
    popularity: "Popularity",
    popularityGloss: "most decks tracked first",
    name: "Name",
    nameGloss: "A–Z",
    recent: "Recently released",
    recentGloss: "newest printing first",
  },

  result: {
    rest: (count: number) => `${n(count)} commanders`,
    filtered: (shown: number, total: number) => `${n(shown)} of ${n(total)} commanders match`,
  },

  row: {
    // The ONE figure the shared row keeps from this block. `supportOwned`,
    // `novelty` and `notOwned` retired with the composition that drew them:
    // the count chip and its ratio bar became Fit, the novelty count became the
    // mechanic gap line, and `not in your collection` was cut by ruling D1 —
    // once both lanes share a row, every discover row is unowned and every
    // commanders row is owned, so the line distinguished nothing.
    popularity: (decks: number) => `${n(decks)} decks tracked`,
  },

  empty: {
    heading: "No commander by that name",
    body: (q: string, total: number) =>
      `Nothing here matches "${q}". This lane lists the ${n(
        total,
      )} commanders you don't own. If you already own it, it's on your commanders instead.`,
    clearSearch: "Clear search",
    otherLane: "Search your commanders",
  },
} as const;
