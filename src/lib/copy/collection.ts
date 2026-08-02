// Collection copy — set filter panel block, ported verbatim from
// design/design_handoff_the99_collection_filter/collection-filter · copy strings.ts
// Shape follows src/lib/copy/shell.ts: flat const object, functions for
// interpolated strings, no JSX, no formatting of numbers (callers pass
// pre-formatted, thousands-separated strings).

export const collectionFilterCopy = {
  set: {
    // Trigger
    triggerLabel: "Set",
    triggerOne: (setName: string) => `Set: ${setName}`,
    triggerAriaCollapsed: "Filter by set, collapsed",
    triggerAriaWithSelection: (n: number) => `Filter by set, ${n} selected, collapsed`,

    // Panel chrome
    panelAriaLabel: "Filter by set",
    sheetTitle: "Sets",
    searchPlaceholder: "Search sets",
    searchAriaLabel: "Search your sets",
    clearSearch: "Clear search",

    // Group labels (Plex Mono, uppercased in CSS — written sentence case here)
    groupDefault: "Newest first",
    groupSelected: (n: number) => `Selected · ${n}`,
    groupMatches: (n: number) => (n === 1 ? "1 match" : `${n} matches`),

    // Option
    optionAria: (setName: string, count: string, selected: boolean) =>
      `${setName}, ${count} cards${selected ? ", selected" : ""}`,
    optionAriaUnavailable: (setName: string) => `${setName}, no cards match your other filters`,

    // Footer
    footerTotal: (total: string) => `${total} sets owned`,
    footerSelected: (n: number, total: string) => `${n} of ${total} selected`,
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
      n === 0 ? `No sets match ${query}` : `${n} ${n === 1 ? "set matches" : "sets match"} ${query}`,
    announceAdded: (setName: string, sets: number, shown: string, total: string) =>
      `${setName} added. ${sets} ${sets === 1 ? "set" : "sets"}, ${shown} of ${total} cards shown.`,
    announceRemoved: (setName: string, sets: number, shown: string, total: string) =>
      sets === 0
        ? `${setName} removed. No set filter, ${total} cards shown.`
        : `${setName} removed. ${sets} ${sets === 1 ? "set" : "sets"}, ${shown} of ${total} cards shown.`,
    announceCleared: (total: string) => `Set filter cleared. ${total} cards shown.`,
  },

  // Type ▾ (#100) — the same panel with `searchable={false}`. The search and
  // group-label strings are still here, and still unused, because the shape is
  // shared: a partial block would make FilterPanelCopy optional for everyone.
  type: {
    triggerLabel: "Type",
    triggerOne: (typeName: string) => `Type: ${typeName}`,
    triggerAriaCollapsed: "Filter by type, collapsed",
    triggerAriaWithSelection: (n: number) => `Filter by type, ${n} selected, collapsed`,

    panelAriaLabel: "Filter by type",
    sheetTitle: "Types",
    searchPlaceholder: "Search types",
    searchAriaLabel: "Search card types",
    clearSearch: "Clear search",

    groupDefault: "All types",
    groupSelected: (n: number) => `Selected · ${n}`,
    groupMatches: (n: number) => (n === 1 ? "1 match" : `${n} matches`),

    optionAria: (typeName: string, count: string, selected: boolean) =>
      `${typeName}, ${count} cards${selected ? ", selected" : ""}`,
    optionAriaUnavailable: (typeName: string) =>
      `${typeName}, no cards match your other filters`,

    footerTotal: (total: string) => `${total} cards`,
    footerSelected: (n: number, total: string) => `${n} of ${total} selected`,
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
      n === 0 ? `No types match ${query}` : `${n} ${n === 1 ? "type matches" : "types match"} ${query}`,
    announceAdded: (typeName: string, types: number, shown: string, total: string) =>
      `${typeName} added. ${types} ${types === 1 ? "type" : "types"}, ${shown} of ${total} cards shown.`,
    announceRemoved: (typeName: string, types: number, shown: string, total: string) =>
      types === 0
        ? `${typeName} removed. No type filter, ${total} cards shown.`
        : `${typeName} removed. ${types} ${types === 1 ? "type" : "types"}, ${shown} of ${total} cards shown.`,
    announceCleared: (total: string) => `Type filter cleared. ${total} cards shown.`,
  },

  // Color ▾ (#116) — mobile only. Desktop keeps the inline pip row, so nothing
  // here is reachable above 768px.
  color: {
    triggerLabel: "Color",
    triggerOne: (colorName: string) => `Color: ${colorName}`,
    triggerAriaCollapsed: "Filter by color, collapsed",
    triggerAriaWithSelection: (n: number) => `Filter by color, ${n} selected, collapsed`,

    panelAriaLabel: "Filter by color",
    sheetTitle: "Colors",
    searchPlaceholder: "Search colors",
    searchAriaLabel: "Search colors",
    clearSearch: "Clear search",

    groupDefault: "All colors",
    groupSelected: (n: number) => `Selected · ${n}`,
    groupMatches: (n: number) => (n === 1 ? "1 match" : `${n} matches`),

    optionAria: (colorName: string, count: string, selected: boolean) =>
      `${colorName}, ${count} cards${selected ? ", selected" : ""}`,
    optionAriaUnavailable: (colorName: string) =>
      `${colorName}, no cards match your other filters`,

    footerTotal: (total: string) => `${total} cards`,
    footerSelected: (n: number, total: string) => `${n} of ${total} selected`,
    clear: "Clear",
    done: "Done",
    closeLabel: "Close",

    emptyTitle: "No colors to show",
    emptyBody: (query: string) => ({ before: "No color matches ", query: `“${query}”`, after: "." }),

    announceMatches: (n: number, query: string) =>
      n === 0 ? `No colors match ${query}` : `${n} ${n === 1 ? "color matches" : "colors match"} ${query}`,
    // Colors AND with each other, so the announcement says "and" rather than a
    // bare count — two colors selected means cards in BOTH, not either.
    announceAdded: (colorName: string, colors: number, shown: string, total: string) =>
      `${colorName} added. ${colors} ${colors === 1 ? "color" : "colors"}, ${shown} of ${total} cards shown.`,
    announceRemoved: (colorName: string, colors: number, shown: string, total: string) =>
      colors === 0
        ? `${colorName} removed. No color filter, ${total} cards shown.`
        : `${colorName} removed. ${colors} ${colors === 1 ? "color" : "colors"}, ${shown} of ${total} cards shown.`,
    announceCleared: (total: string) => `Color filter cleared. ${total} cards shown.`,
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
    groupMatches: (n: number) => (n === 1 ? "1 match" : `${n} matches`),

    // The hint carries the direction ("A–Z"), so the name reads as the whole
    // order — and the chosen row says how to reverse it, since re-picking is
    // the only way and nothing else on screen says so.
    optionAria: (order: string, _count: string, selected: boolean) =>
      selected ? `${order}, current order, choose again to reverse` : order,
    optionAriaUnavailable: (order: string) => order,

    footerTotal: () => "",
    footerSelected: () => "",
    clear: "Clear",
    done: "Done",
    closeLabel: "Close",

    emptyTitle: "No sort orders",
    emptyBody: (query: string) => ({ before: "No sort order matches ", query: `“${query}”`, after: "." }),

    announceMatches: (n: number) => `${n} sort orders`,
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
  triggerOne: (name: string) => string;
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

  optionAria: (name: string, count: string, selected: boolean) => string;
  optionAriaUnavailable: (name: string) => string;

  footerTotal: (total: string) => string;
  footerSelected: (n: number, total: string) => string;
  clear: string;
  done: string;
  /** Accessible name for the sheet's ✕ — the sheet's one accessible close control. */
  closeLabel: string;

  emptyTitle: string;
  emptyBody: (query: string) => { before: string; query: string; after: string };

  announceMatches: (n: number, query: string) => string;
  announceAdded: (name: string, n: number, shown: string, total: string) => string;
  announceRemoved: (name: string, n: number, shown: string, total: string) => string;
  announceCleared: (total: string) => string;
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
    triggerCount: (n: number) => `${n} printings you own`,
    triggerAria: (n: number, caption: string) =>
      `Set: ${caption}. ${n} printings owned. Choose which one represents this card.`,
    triggerPicked: "Your pick",
    triggerPickedOf: (n: number) => `· of ${n}`,
    triggerCollapseAria: "Hide the printings you own",
    /** The field label the trigger replaces — the same word the plain meta field uses. */
    triggerLabel: "Set",
    triggerChevron: (expanded: boolean) => (expanded ? "▴" : "▾"),

    // ---- Region -----------------------------------------------------------
    regionLabel: "Printings you own",
    regionIntro: (n: number) =>
      `You own ${n} of these. Pick the one that represents this card.`,
    // Scope is collection surfaces only (decision 2). Do not mention decks.
    regionIntroPicked: "Your pick shows wherever this card appears in your collection.",

    // ---- Entry ------------------------------------------------------------
    // Quantity + finish. Decision 9: plain nonfoil shows nothing extra.
    entryQty: (n: number) => `×${n}`,
    entryQtyAllFoil: (n: number) => `×${n} foil`,
    entryQtyMixed: (n: number, foil: number) => `×${n} · ${foil} foil`,
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
    filterAll: (n: number) => `All ${n}`,
    filterFoil: (n: number) => `Foil ${n}`,
    filterNonFoil: (n: number) => `Non-foil ${n}`,
    groupSet: (setName: string, setCode: string, n: number) =>
      `${setName} · ${setCode} · ${n}`,
    emptyTitle: "Not in that set",
    emptyBody: (query: string, cardName: string) =>
      `No printing of ${cardName} you own comes from a set matching “${query}”.`,
    clearSearch: "Clear search",

    // ---- Live region (the modal's existing one — do not add a second) -----
    announceOpen: (n: number) =>
      `Showing ${n} printings you own. Use the arrow keys to choose.`,
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
        : `${n} ${n === 1 ? "printing" : "printings"} from sets matching ${query}`,
  },
} as const;
