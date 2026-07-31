// src/lib/copy/collection.ts — per-printing art selection block.
// Shape follows src/lib/copy/shell.ts: flat const object, functions for
// interpolated strings, no JSX, no number formatting (callers pass
// pre-formatted, thousands-separated strings).
//
// Voice: Kitchen Table. Nothing here says "asset", "variant" or "select an
// option". A printing is a card you own, out of a set, with a number on it.
//
// R2: the picker is an inline region inside the card view (locked decision 4),
// so there is no back link and no Done button. Scope corrected to collection
// surfaces only — per-deck art is #42. Dormant-pin strings added.

export const printingPickerCopy = {
  printing: {
    // ---- Caption under the art (desktop) / Set property row (mobile) -------
    // Single printing: plain text, never a control.
    captionLabel: 'Printing',
    caption: (setName: string, collectorNumber: string) =>
      collectorNumber ? `${setName} · #${collectorNumber}` : setName,

    // Multiple printings owned: the caption becomes the disclosure trigger.
    triggerCount: (n: number) => `${n} printings you own`,
    triggerAria: (n: number, setName: string) =>
      `Printing: ${setName}. ${n} printings owned. Choose which one shows.`,
    triggerCollapse: 'Close',
    triggerCollapseAria: 'Hide the printings you own',

    // ---- Inline region ----------------------------------------------------
    regionLabel: 'Printings you own',
    regionTitle: 'Which printing?',
    regionSubtitleDefault: (n: number) =>
      `You own ${n} of these. We show the newest one unless you pick.`,
    // Scope is collection surfaces only. Per-deck art selection is deferred
    // to #42 — do not promise decks here.
    regionSubtitleChosen: 'Your pick shows wherever this card appears in your collection.',
    regionCount: (n: number) => (n === 1 ? '1 printing' : `${n} printings`),
    regionCountSets: (n: number, sets: number) => `${n} printings · ${sets} sets`,

    // ---- Entry (one printing in the region) -------------------------------
    entryQty: (n: number) => `×${n}`,
    entryFoil: (n: number) => (n === 1 ? '1 foil' : `${n} foil`),
    entryFoilAll: (n: number) => `×${n} foil`,
    entryNoNumber: 'no number',
    badgeDefault: 'Default',
    badgeDefaultLong: 'Default · newest you own',
    badgeChosen: 'Your pick',
    entryAria: (
      setName: string,
      collectorNumber: string,
      qty: string,
      state: 'chosen' | 'default' | 'plain',
    ) =>
      [
        setName,
        collectorNumber ? `number ${collectorNumber}` : 'no collector number',
        qty,
        state === 'chosen'
          ? 'your pick'
          : state === 'default'
            ? 'shown by default'
            : '',
      ]
        .filter(Boolean)
        .join(', '),

    // ---- Commit / reset ---------------------------------------------------
    // Picking commits immediately; this is the only escape hatch.
    resetToDefault: 'Use the default again',
    resetAria: 'Stop pinning a printing and go back to the default art',

    // ---- Dormant pin ------------------------------------------------------
    // A pin survives a replace that loses its printing, and reactivates if
    // the card comes back. While dormant we show the default and say so.
    dormantNote: (setName: string) =>
      `You picked the ${setName} printing before. It's not in your collection right now, so we're showing the newest one you own.`,
    dormantBadge: 'Your pick · not owned now',
    dormantAria: (setName: string) =>
      `${setName}, your earlier pick, not in your collection right now`,
    dormantClear: 'Forget that pick',

    // ---- Overflow (search + finish filter) --------------------------------
    searchPlaceholder: 'Search sets',
    searchAriaLabel: 'Search the sets you own this in',
    filterAll: (n: number) => `All ${n}`,
    filterFoil: (n: number) => `Foil ${n}`,
    filterNonFoil: (n: number) => `Non-foil ${n}`,
    groupSet: (setName: string, setCode: string, n: number) =>
      `${setName} · ${setCode} · ${n}`,
    emptyTitle: 'Not in that set',
    emptyBody: (query: string, cardName: string) =>
      `No printing of ${cardName} you own comes from a set matching “${query}”.`,
    clearSearch: 'Clear search',

    // ---- Live region (the modal's existing one — do not add a second) -----
    announceOpen: (n: number) =>
      `Showing ${n} printings you own. Use the arrow keys to choose.`,
    announceChosen: (setName: string, collectorNumber: string) =>
      collectorNumber
        ? `Pinned ${setName} number ${collectorNumber}.`
        : `Pinned ${setName}.`,
    announceReset: (setName: string) =>
      `Pin removed. Showing the default, ${setName}.`,
    announceMatches: (n: number, query: string) =>
      n === 0
        ? `No sets match ${query}`
        : `${n} ${n === 1 ? 'printing' : 'printings'} from sets matching ${query}`,
  },
} as const;
