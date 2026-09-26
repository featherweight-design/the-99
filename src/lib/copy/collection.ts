// Collection copy — set filter panel block, ported verbatim from
// design/design_handoff_the99_collection_filter/collection-filter · copy strings.ts
// Shape follows src/lib/copy/shell.ts: flat const object, functions for
// interpolated strings, no JSX. Callers hand over RAW COUNTS and this module
// formats them, through the one `count()` helper below.
//
// It took pre-formatted strings once, on the reasoning that the caller owned
// presentation. That put two separator conventions in a single sentence on a
// non-`en-US` browser — `1.234 of 2,933` — because only the figures going
// through `cards()` were pinned, and it made `1 cards shown` reachable for any
// figure whose caller had already turned it into a string. A number that a
// sentence pluralises on cannot be read back out of its own formatting, which
// was always true of the option aria labels; it is true of all of them.

import { availabilityCopy } from "./availability";

/**
 * An option row's count, as a screen reader says it. These are accessible
 * names, so "1 cards" is read aloud — the same reason addPanelCopy's tab names
 * pluralise, and the form the availability block was drawn with.
 *
 * The locale is pinned, as commanders.ts's firstRun line is: these strings are
 * verbatim, and an unpinned toLocaleString renders "1.240" or "1 240" under a
 * European locale.
 */
const cards = (n: number) => (n === 1 ? "1 card" : `${count(n)} cards`);
/**
 * Every figure in this file goes through one formatter. `cards()` pinned its
 * count to `en-US` while callers pre-formatted the other with a bare
 * `toLocaleString()`, so a non-en-US browser announced "1.234 of 2,933" — one
 * sentence, two separator conventions.
 */
const count = (n: number) => n.toLocaleString("en-US");

/**
 * `/collection`'s chassis rows. The route drew these itself before — a chip row
 * below the bar, carrying the selected values and the count — and the chassis
 * draws both rows now, so this is what the replacement says rather than the
 * route's first version of it.
 */
export const collectionChassisCopy = {
  /**
   * The phone's shorter line. The retired chip row drew this at `md:hidden`,
   * and it matters more now: row 3 also carries the `By set` link and the view
   * toggle, so the long sentence and those controls compete for 390px.
   */
  resultCompact: (shown: number) => (shown === 1 ? "1 result" : `${count(shown)} results`),
  /**
   * The persistent search field, in its two forms.
   *
   * Both were literals in `filter-bar.tsx` until the About page needed to draw
   * this row and copied them — two strings in two files with nothing joining
   * them, so a rename would have left the reference page describing a field
   * that no longer says that. They fork on `useIsDesktop` (768), NOT on the
   * chassis's 1000: the field itself is the one control here whose form the
   * narrower breakpoint governs.
   */
  searchPlaceholder: {
    wide: "Search by card name…",
    compact: "Search your cards…",
  },
  /**
   * The upload door's own words, in the two forms `UploadEntry` draws.
   *
   * Literals in `upload-entry.tsx` until the About page needed to draw this
   * surface — and the figure first took §3's labels instead (`Drop a CSV
   * export`, `Upload a CSV`, `Paste a list`), none of which the route has ever
   * said. A reference page naming controls the app does not have is the one
   * failure this page cannot afford, so both sides read these now.
   */
  upload: {
    dropWide: "Drop your new collection CSV here",
    dropCompact: "Drop your new CSV",
    browse: "Browse files",
    paste: "Paste a list instead",
  },
  /**
   * The route's wide line, in two states.
   *
   * Three figures, because `/collection` counts three things and they are not
   * interchangeable: `shown` is the distinct cards surviving the filters,
   * `unique` the distinct cards in the whole collection, and `total` the sum of
   * quantities across it. "1,240" meaning names and "2,933" meaning copies are
   * different facts, which is why the rest state states both and labels each.
   *
   * The filtered state compares `shown` to `unique` — distinct against
   * distinct. It carried `shown` over `total` out of `ChipRow`, which read as
   * 4 cards out of 2,933 cards when 2,933 counted copies: a denominator the
   * reader cannot get to the numerator from. Changed rather than moved, and
   * recorded in the plan alongside the question that asked for the ruling.
   */
  result: (shown: number, unique: number, total: number, filtered: boolean) =>
    filtered
      ? `Showing ${count(shown)} of ${count(unique)}`
      : `Showing ${count(unique)} unique · ${count(total)} total`,
  /** The chassis's Clear — every dimension at once, named as such. */
  announceClearedAll: (total: number) =>
    // Through the shared helper, which singularises: a one-card collection
    // reads "1 card shown." where the raw count read "1 cards shown."
    `Filters cleared. ${cards(total)} shown.`,
  /**
   * The phone's one filter surface. `/collection` had none: its controls stayed
   * inline and the row scrolled, so at 390px the pips ate the width and Type,
   * Set and Availability sat off-screen with nothing saying they existed. The
   * other three chassis routes all open a sheet, and this is that sheet's copy.
   *
   * Search is NOT in here. It stays on the persistent row, as it does on the
   * commander lanes — a field a reader can see beats one they have to open a
   * dialog to reach, and the badge never counts it for the same reason.
   */
  sheet: {
    trigger: "Filters",
    /** Spoken on the trigger; the badge is a number a screen reader would read bare. */
    triggerAria: (active: number) =>
      active === 0 ? "Filter cards" : `Filter cards, ${count(active)} on`,
    title: "Filter cards",
    match: (shown: number, total: number) => `${count(shown)} of ${count(total)} match`,
    colourHeading: "Color identity",
    typeHeading: "Type",
    setHeading: "Set",
    availabilityHeading: availabilityCopy.collection.filterLabel,
    /**
     * The SET group is one row that opens a panel of its own, where the other
     * three are chips in place. A collection reaches into the hundreds of sets,
     * and the list under a search field was most of the sheet — and resized it
     * on every keystroke. This is what the row reads when nothing is chosen;
     * `chip.sets` names the choice once there is one.
     */
    setAny: "Any set",
    /** The set list is long enough to need its own field; the others are not. */
    setSearchPlaceholder: "Search sets",
    setSearchAria: "Search your sets",
    setEmpty: (query: string) => `No sets match ${query}`,
    /**
     * No sets to filter BY, which is not a failed search. A collection whose
     * rows all went unmatched against the catalog has an empty set vocabulary,
     * and the sheet opens with a blank query — so the search string would have
     * rendered as `No sets match ` with nothing after it. `FilterPanel` never
     * hits this because it only draws its no-results state for a query that
     * was actually typed.
     */
    setNone: "No sets to filter by",
    done: "Done",
    close: "Close filters",
  },

  chip: {
    /** The term itself, as `/decks` does: "Search" would name the field, not the filter. */
    search: (q: string) => `"${q}"`,
    colours: (n: number) => (n === 1 ? "1 color" : `${count(n)} colors`),
    types: (n: number, first: string) => (n === 1 ? first : `${count(n)} types`),
    sets: (n: number, first: string) => (n === 1 ? first : `${count(n)} sets`),
    availability: (n: number, first: string) => (n === 1 ? first : `${count(n)} states`),
  },
} as const;

export const collectionFilterCopy = {
  set: {
    // Trigger
    triggerLabel: "Set",
    triggerCount: (n: number) => (n <= 1 ? `Set ${n}` : `Sets ${n}`),
    triggerAriaCollapsed: "Filter by set, collapsed",
    triggerAriaWithSelection: (n: number) => `Filter by set, ${count(n)} selected, collapsed`,

    // Panel chrome
    panelAriaLabel: "Filter by set",
    sheetTitle: "Sets",
    searchPlaceholder: "Search sets",
    searchAriaLabel: "Search your sets",
    clearSearch: "Clear search",

    // Group labels (Plex Mono, uppercased in CSS — written sentence case here)
    groupDefault: "Newest first",
    groupSelected: (n: number) => `Selected · ${count(n)}`,
    groupMatches: (n: number) => (n === 1 ? "1 match" : `${count(n)} matches`),

    // Option
    optionAria: (setName: string, count: number) => `${setName}, ${cards(count)}`,
    optionAriaUnavailable: (setName: string) => `${setName}, no cards match your other filters`,

    // Footer
    footerTotal: (total: number) => `${count(total)} sets owned`,
    footerSelected: (n: number, total: number) => `${count(n)} of ${count(total)} selected`,
    clear: "Clear",
    done: "Done",
    /** Accessible name for the sheet's ✕ — the sheet's one accessible close control. */
    closeLabel: "Close",

    // Empty state — the one place this control carries the voice
    emptyTitle: "Nothing in the pile by that name",
    // Split into parts rather than one string so the echoed query can carry its
    // own color and weight without the sentence being duplicated in the JSX.
    emptyBody: (query: string) => ({
      before: "No owned set matches ",
      query: `“${query}”`,
      after: ". Only sets you own are listed here.",
    }),

    // Live region (shared with the filter bar — one region for the whole bar)
    announceMatches: (n: number, query: string) =>
      n === 0 ? `No sets match ${query}` : `${count(n)} ${n === 1 ? "set matches" : "sets match"} ${query}`,
    announceAdded: (setName: string, sets: number, shown: number, total: number) =>
      `${setName} added. ${count(sets)} ${sets === 1 ? "set" : "sets"}, ${count(shown)} of ${cards(total)} shown.`,
    announceRemoved: (setName: string, sets: number, shown: number, total: number) =>
      sets === 0
        ? `${setName} removed. No set filter, ${cards(shown)} shown.`
        : `${setName} removed. ${count(sets)} ${sets === 1 ? "set" : "sets"}, ${count(shown)} of ${cards(total)} shown.`,
    announceCleared: (shown: number) => `Set filter cleared. ${cards(shown)} shown.`,
  },

  // Type ▾ (#100) — the same panel with `searchable={false}`. The search and
  // group-label strings are still here, and still unused, because the shape is
  // shared: a partial block would make FilterPanelCopy optional for everyone.
  type: {
    triggerLabel: "Type",
    // Counts, as Set does (#1050; Hugh, 2026-09-27): a type's name grew the trigger and moved
    // the row. The names live in the chip row.
    triggerCount: (n: number) => (n <= 1 ? `Type ${n}` : `Types ${n}`),
    triggerAriaCollapsed: "Filter by type, collapsed",
    triggerAriaWithSelection: (n: number) => `Filter by type, ${count(n)} selected, collapsed`,

    panelAriaLabel: "Filter by type",
    sheetTitle: "Types",
    searchPlaceholder: "Search types",
    searchAriaLabel: "Search card types",
    clearSearch: "Clear search",

    groupDefault: "All types",
    groupSelected: (n: number) => `Selected · ${count(n)}`,
    groupMatches: (n: number) => (n === 1 ? "1 match" : `${count(n)} matches`),

    optionAria: (typeName: string, count: number) => `${typeName}, ${cards(count)}`,
    optionAriaUnavailable: (typeName: string) =>
      `${typeName}, no cards match your other filters`,

    footerTotal: (total: number) => `${count(total)} cards`,
    footerSelected: (n: number, total: number) => `${count(n)} of ${count(total)} selected`,
    clear: "Clear",
    done: "Done",
    closeLabel: "Close",

    emptyTitle: "No types to show",
    emptyBody: (query: string) => ({
      before: "No card type matches ",
      query: `“${query}”`,
      after: ".",
    }),

    announceMatches: (n: number, query: string) =>
      n === 0 ? `No types match ${query}` : `${count(n)} ${n === 1 ? "type matches" : "types match"} ${query}`,
    announceAdded: (typeName: string, types: number, shown: number, total: number) =>
      `${typeName} added. ${count(types)} ${types === 1 ? "type" : "types"}, ${count(shown)} of ${cards(total)} shown.`,
    announceRemoved: (typeName: string, types: number, shown: number, total: number) =>
      types === 0
        ? `${typeName} removed. No type filter, ${cards(shown)} shown.`
        : `${typeName} removed. ${count(types)} ${types === 1 ? "type" : "types"}, ${count(shown)} of ${cards(total)} shown.`,
    announceCleared: (shown: number) => `Type filter cleared. ${cards(shown)} shown.`,
  },

  // Availability ▾ (#43) — the Type ▾ shape (no search, no footer total).
  // Every user-visible string comes from availabilityCopy.collection; the keys
  // FilterPanelCopy needs and the addendum does not author (the search and
  // group strings) are inert here, exactly as they are in the `type` block.
  availability: {
    triggerLabel: availabilityCopy.collection.filterLabel,
    // Counts, as Set does. No plural: "Availabilities" names nothing a reader picks, and the
    // figure counts the states on.
    triggerCount: (n: number) => `${availabilityCopy.collection.filterLabel} ${n}`,
    triggerAriaCollapsed: "Filter by availability, collapsed",
    triggerAriaWithSelection: (n: number) => `Filter by availability, ${count(n)} selected, collapsed`,

    panelAriaLabel: "Filter by availability",
    sheetTitle: availabilityCopy.collection.filterLabel,
    searchPlaceholder: "Search availability",
    searchAriaLabel: "Search availability states",
    clearSearch: "Clear search",

    groupDefault: "All",
    groupSelected: (n: number) => `Selected · ${count(n)}`,
    groupMatches: (n: number) => (n === 1 ? "1 match" : `${count(n)} matches`),

    optionAria: (name: string, count: number) =>
      availabilityCopy.collection.filterOptionAria(name, count),
    optionAriaUnavailable: (name: string) =>
      availabilityCopy.collection.filterEmptyOptionAria(name),

    footerTotal: (total: number) => `${count(total)} cards`,
    footerSelected: (n: number, total: number) => `${count(n)} of ${count(total)} selected`,
    clear: "Clear",
    done: "Done",
    closeLabel: "Close",

    emptyTitle: "Nothing to show",
    emptyBody: (query: string) => ({
      before: "No availability matches ",
      query: `“${query}”`,
      after: ".",
    }),

    announceMatches: (n: number, query: string) =>
      n === 0
        ? `No options match ${query}`
        : `${count(n)} ${n === 1 ? "option matches" : "options match"} ${query}`,
    announceAdded: (name: string, n: number, shown: number, total: number) =>
      `${name} added. ${count(n)} ${n === 1 ? "filter" : "filters"}, ${count(shown)} of ${cards(total)} shown.`,
    announceRemoved: (name: string, n: number, shown: number, total: number) =>
      n === 0
        ? `${name} removed. No availability filter, ${cards(shown)} shown.`
        : `${name} removed. ${count(n)} ${n === 1 ? "filter" : "filters"}, ${count(shown)} of ${cards(total)} shown.`,
    announceCleared: (shown: number) => `Availability filter cleared. ${cards(shown)} shown.`,
  },

  // Color ▾ (#116) — mobile only. Desktop keeps the inline pip row, so nothing
  // here is reachable above 768px.
  color: {
    triggerLabel: "Color",
    triggerOne: (colorName: string) => `Color: ${colorName}`,
    triggerAriaCollapsed: "Filter by color, collapsed",
    triggerAriaWithSelection: (n: number) => `Filter by color, ${count(n)} selected, collapsed`,

    panelAriaLabel: "Filter by color",
    sheetTitle: "Colors",
    searchPlaceholder: "Search colors",
    searchAriaLabel: "Search colors",
    clearSearch: "Clear search",

    groupDefault: "All colors",
    groupSelected: (n: number) => `Selected · ${count(n)}`,
    groupMatches: (n: number) => (n === 1 ? "1 match" : `${count(n)} matches`),

    optionAria: (colorName: string, count: number) => `${colorName}, ${cards(count)}`,
    optionAriaUnavailable: (colorName: string) =>
      `${colorName}, no cards match your other filters`,

    footerTotal: (total: number) => `${count(total)} cards`,
    footerSelected: (n: number, total: number) => `${count(n)} of ${count(total)} selected`,
    clear: "Clear",
    done: "Done",
    closeLabel: "Close",

    emptyTitle: "No colors to show",
    emptyBody: (query: string) => ({ before: "No color matches ", query: `“${query}”`, after: "." }),

    announceMatches: (n: number, query: string) =>
      n === 0 ? `No colors match ${query}` : `${count(n)} ${n === 1 ? "color matches" : "colors match"} ${query}`,
    // Colors AND with each other, so the announcement says "and" rather than a
    // bare count — two colors selected means cards in BOTH, not either.
    announceAdded: (colorName: string, colors: number, shown: number, total: number) =>
      `${colorName} added. ${count(colors)} ${colors === 1 ? "color" : "colors"}, ${count(shown)} of ${cards(total)} shown.`,
    announceRemoved: (colorName: string, colors: number, shown: number, total: number) =>
      colors === 0
        ? `${colorName} removed. No color filter, ${cards(shown)} shown.`
        : `${colorName} removed. ${count(colors)} ${colors === 1 ? "color" : "colors"}, ${count(shown)} of ${cards(total)} shown.`,
    announceCleared: (shown: number) => `Color filter cleared. ${cards(shown)} shown.`,
  },

  // Sort ▾ (#119) — the same panel in single-select mode. Sorting never narrows
  // anything, so the count-shaped strings below are unreachable: `showCounts` is
  // off, `Clear` never renders, and one row is always chosen so there is no
  // "cleared" state. They are still written out because the shape is shared.
  sort: {
    triggerLabel: "Sort",
    triggerOne: (order: string) => `Sort: ${order}`,
    triggerAriaCollapsed: "Sort cards, collapsed",
    triggerAriaWithSelection: () => "Sort cards, collapsed",

    panelAriaLabel: "Sort cards",
    sheetTitle: "Sort by",
    searchPlaceholder: "Search",
    searchAriaLabel: "Search sort orders",
    clearSearch: "Clear search",

    groupDefault: "Sort by",
    groupSelected: () => "Current",
    groupMatches: (n: number) => (n === 1 ? "1 match" : `${count(n)} matches`),

    // The hint carries the direction ("A–Z"), so the name reads as the whole
    // order — and the chosen row says how to reverse it, since re-picking is
    // the only way and nothing else on screen says so.
    // Defaulted rather than required: `selected` is optional on the contract, so
    // the unselected row is what an omitted argument means.
    optionAria: (order: string, _count: number, selected = false) =>
      selected ? `${order}, current order, choose again to reverse` : order,
    optionAriaUnavailable: (order: string) => order,

    footerTotal: () => "",
    footerSelected: () => "",
    clear: "Clear",
    done: "Done",
    closeLabel: "Close",

    emptyTitle: "No sort orders",
    emptyBody: (query: string) => ({ before: "No sort order matches ", query: `“${query}”`, after: "." }),

    announceMatches: (n: number) => `${count(n)} sort orders`,
    announceAdded: (order: string) => `Sorted by ${order}.`,
    announceRemoved: (order: string) => `Sorted by ${order}.`,
    announceCleared: () => "",
  },
} as const;

/**
 * The copy a FilterPanel needs. Both `collectionFilterCopy.set` and
 * `.type` satisfy it. Spelled out rather than `typeof …set`, which pinned every
 * string to the Set block's literal type and so accepted nothing else.
 */
export type FilterPanelCopy = {
  triggerLabel: string;
  /** The trigger once exactly one option is chosen. Omitted where `triggerCount` names it instead. */
  triggerOne?: (name: string) => string;
  /**
   * A trigger that COUNTS rather than names, drawn at every selection including none. Set carries
   * it because a set's name is long and varied: `Set: The Hobbit` grew the trigger and pushed every
   * control after it along the row. A count keeps one width from nothing chosen to one, and the
   * names live in the chip row, as they already did past one.
   */
  triggerCount?: (n: number) => string;
  triggerAriaCollapsed: string;
  triggerAriaWithSelection: (n: number) => string;

  panelAriaLabel: string;
  sheetTitle: string;
  searchPlaceholder: string;
  searchAriaLabel: string;
  clearSearch: string;

  groupDefault: string;
  groupSelected: (n: number) => string;
  groupMatches: (n: number) => string;

  /**
   * `FilterPanel` always passes `selected`, and Sort is the only block that
   * declares it: its selected row says something the role cannot, that choosing
   * it again reverses. The four multi-select blocks declare two parameters and
   * stop there, because their rows carry `aria-selected` inside an
   * `aria-multiselectable` listbox and a ", selected" tail in the name would be
   * the same fact twice in one breath.
   *
   * Optional here so the contract matches them rather than the other way round.
   * The shorter arity is the honest signature and worth keeping: a caller that
   * writes `optionAria(name, count, isSelected)` against one of those four gets
   * a compile error naming the exact thing it got wrong.
   */
  optionAria: (name: string, count: number, selected?: boolean) => string;
  optionAriaUnavailable: (name: string) => string;

  footerTotal: (total: number) => string;
  footerSelected: (n: number, total: number) => string;
  clear: string;
  done: string;
  /** Accessible name for the sheet's ✕ — the sheet's one accessible close control. */
  closeLabel: string;

  emptyTitle: string;
  emptyBody: (query: string) => { before: string; query: string; after: string };

  announceMatches: (n: number, query: string) => string;
  announceAdded: (name: string, n: number, shown: number, total: number) => string;
  announceRemoved: (name: string, n: number, shown: number, total: number) => string;
  announceCleared: (shown: number) => string;
};

// Voice: Kitchen Table. A printing is a card you own, out of a set, with a
// number on it.
//
// R3, against the locked spec:
//   - decision 6  → nothing here renders at one printing
//   - decision 10 → the fallback is "shown now", never "default"/"selected"
//   - decision 2  → the pick applies to collection surfaces, never decks (#42)
//   - decision 9  → plain nonfoil produces no finish string at all
//
// The dormant-pick strings below are a RATIFIED EXCEPTION to decision 5's
// "fall back silently" — kept at review's direction. Amend decision 5 rather
// than deleting these.

export const printingPickerCopy = {
  printing: {
    // ---- Set field, when 2+ printings are owned ----------------------------
    // At one printing the Set field is untouched — no strings from this block.
    triggerCount: (n: number) => `${count(n)} printings you own`,
    triggerAria: (n: number, caption: string) =>
      `Set: ${caption}. ${count(n)} printings owned. Choose which one represents this card.`,
    triggerPicked: "Your pick",
    triggerPickedOf: (n: number) => `· of ${count(n)}`,
    triggerCollapseAria: "Hide the printings you own",
    /** The field label the trigger replaces — the same word the plain meta field uses. */
    triggerLabel: "Set",
    triggerChevron: (expanded: boolean) => (expanded ? "▴" : "▾"),

    // ---- Region -----------------------------------------------------------
    regionLabel: "Printings you own",
    regionIntro: (n: number) =>
      `You own ${count(n)} of these. Pick the one that represents this card.`,
    // Scope is collection surfaces only (decision 2). Do not mention decks.
    regionIntroPicked: "Your pick shows wherever this card appears in your collection.",

    // ---- Entry ------------------------------------------------------------
    // Quantity + finish. Decision 9: plain nonfoil shows nothing extra.
    entryQty: (n: number) => `×${count(n)}`,
    entryQtyAllFoil: (n: number) => `×${count(n)} foil`,
    entryQtyMixed: (n: number, foil: number) => `×${count(n)} · ${count(foil)} foil`,
    // Collector number may be "" (bare Name,Qty import). Omit the field and its
    // separator entirely — never "#—", never a leading "· ".
    entryMeta: (collectorNumber: string, qty: string) =>
      collectorNumber ? `#${collectorNumber} · ${qty}` : qty,
    badgeShownNow: "Shown now",
    badgePicked: "Your pick",
    entryAria: (
      setName: string,
      collectorNumber: string,
      qty: string,
      state: "picked" | "shown-now" | "plain",
    ) =>
      [
        setName,
        collectorNumber ? `number ${collectorNumber}` : "no collector number",
        qty,
        state === "picked"
          ? "your pick"
          : state === "shown-now"
            ? "shown now, not chosen"
            : "",
      ]
        .filter(Boolean)
        .join(", "),

    // ---- Reset ------------------------------------------------------------
    // Commit is immediate (decision 7); this is the only escape hatch.
    resetToDefault: "Use the default again",
    resetAria: "Stop using your pick and go back to the automatic art",

    // ---- Dormant pick (ratified exception to decision 5) ------------------
    // Shown only inside the region, only on the affected card. Never on the
    // review screen, never as a toast. Reactivation is silent — no strings.
    dormantNote: (setName: string) =>
      `You picked the ${setName} printing before. It's not in your collection right now, so we're showing another one you own.`,
    dormantBadge: "Your pick · not owned now",
    dormantQty: "×0",
    dormantAria: (setName: string) =>
      `${setName}, your earlier pick, not in your collection right now`,
    dormantClear: "Forget that pick",
    dormantClearAria: "Forget the printing you picked earlier",

    // ---- Overflow (search + finish filter) --------------------------------
    searchPlaceholder: "Search sets",
    searchAriaLabel: "Search the sets you own this in",
    filterAll: (n: number) => `All ${count(n)}`,
    filterFoil: (n: number) => `Foil ${count(n)}`,
    filterNonFoil: (n: number) => `Non-foil ${count(n)}`,
    groupSet: (setName: string, setCode: string, n: number) =>
      `${setName} · ${setCode} · ${count(n)}`,
    emptyTitle: "Not in that set",
    emptyBody: (query: string, cardName: string) =>
      `No printing of ${cardName} you own comes from a set matching “${query}”.`,
    clearSearch: "Clear search",

    // ---- Live region (the modal's existing one — do not add a second) -----
    announceOpen: (n: number) =>
      `Showing ${count(n)} printings you own. Use the arrow keys to choose.`,
    announcePicked: (setName: string, collectorNumber: string) =>
      collectorNumber
        ? `Now showing ${setName} number ${collectorNumber}.`
        : `Now showing ${setName}.`,
    announceReset: (setName: string) =>
      `Your pick was removed. Now showing ${setName}.`,
    announceForget: "Your earlier pick was forgotten.",
    announceMatches: (n: number, query: string) =>
      n === 0
        ? `No sets match ${query}`
        : `${count(n)} ${n === 1 ? "printing" : "printings"} from sets matching ${query}`,
  },
} as const;
