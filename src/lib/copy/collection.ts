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

    // Empty state — the one place this control carries the voice
    emptyTitle: "Nothing in the pile by that name",
    // Split into parts rather than one string so the echoed query can carry its
    // own colour and weight without the sentence being duplicated in the JSX.
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
} as const;

/**
 * The copy a FilterPanel needs. `collectionFilterCopy.set` satisfies it; the
 * follow-up Type ▾ conversion will pass its own block of the same shape.
 */
export type FilterPanelCopy = typeof collectionFilterCopy.set;
