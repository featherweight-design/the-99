// src/lib/copy/collection.ts — per-printing art selection block.
// Shape follows src/lib/copy/shell.ts: flat const object, functions for
// interpolated strings, no JSX, no number formatting (callers pass
// pre-formatted, thousands-separated strings).
//
// Voice: Kitchen Table. Nothing here says "asset", "variant" or "select an
// option". A printing is a card you own, out of a set, with a number on it.

export const printingPickerCopy = {
  printing: {
    // ---- Caption under the art (desktop) / property row (mobile) -----------
    // Single printing: plain text, never a control.
    captionLabel: 'Printing',
    caption: (setName: string, collectorNumber: string | null) =>
      collectorNumber ? `${setName} · #${collectorNumber}` : setName,
    captionNoNumber: 'no number on this one',

    // Multiple printings owned: the caption becomes the trigger.
    triggerCount: (n: number) => `${n} printings you own`,
    triggerAria: (n: number, setName: string) =>
      `Printing: ${setName}. ${n} printings owned. Choose which one shows.`,
    triggerHint: 'Choose art',

    // ---- Chooser view -----------------------------------------------------
    chooserBack: (cardName: string) => `Back to ${cardName}`,
    chooserTitle: 'Which printing?',
    chooserSubtitleDefault: (n: number) =>
      `You own ${n} of these. We show the newest one unless you pick.`,
    chooserSubtitleChosen: 'Your pick shows everywhere this card appears.',
    chooserCount: (n: number) => (n === 1 ? '1 printing' : `${n} printings`),

    // ---- Entry (one printing in the chooser) ------------------------------
    entryQty: (n: number) => `×${n}`,
    entryFoil: (n: number) => (n === 1 ? '1 foil' : `${n} foil`),
    entryFoilAll: 'foil',
    entryNoNumber: 'no number',
    badgeDefault: 'Default',
    badgeChosen: 'Your pick',
    entryAria: (
      setName: string,
      collectorNumber: string | null,
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
    resetToDefault: 'Use the default again',
    resetAria: 'Stop pinning a printing and go back to the default art',
    done: 'Done',

    // ---- Overflow (search + finish filter) --------------------------------
    searchPlaceholder: 'Search sets',
    searchAriaLabel: 'Search the sets you own this in',
    filterAll: (n: number) => `All ${n}`,
    filterFoil: (n: number) => `Foil ${n}`,
    filterNonFoil: (n: number) => `Non-foil ${n}`,
    groupSet: (setName: string, n: number) => `${setName} · ${n}`,
    emptyTitle: 'Not in that set',
    emptyBody: (query: string, cardName: string) =>
      `No printing of ${cardName} you own comes from a set matching “${query}”.`,
    clearSearch: 'Clear search',

    // ---- Live region (shared with the modal's existing region) ------------
    announceChosen: (setName: string, collectorNumber: string | null) =>
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
