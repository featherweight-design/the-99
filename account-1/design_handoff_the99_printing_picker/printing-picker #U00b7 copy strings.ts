// src/lib/copy/collection.ts — per-printing art selection block (#105).
// Shape follows src/lib/copy/shell.ts: flat const object, functions for
// interpolated strings, no JSX, no number formatting (callers pass
// pre-formatted, thousands-separated strings).
//
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
    triggerPicked: 'Your pick',
    triggerPickedOf: (n: number) => `· of ${n}`,
    triggerCollapseAria: 'Hide the printings you own',

    // ---- Region -----------------------------------------------------------
    regionLabel: 'Printings you own',
    regionIntro: (n: number) =>
      `You own ${n} of these. Pick the one that represents this card.`,
    // Scope is collection surfaces only (decision 2). Do not mention decks.
    regionIntroPicked: 'Your pick shows wherever this card appears in your collection.',

    // ---- Entry ------------------------------------------------------------
    // Quantity + finish. Decision 9: plain nonfoil shows nothing extra.
    entryQty: (n: number) => `×${n}`,
    entryQtyAllFoil: (n: number) => `×${n} foil`,
    entryQtyMixed: (n: number, foil: number) => `×${n} · ${foil} foil`,
    // Collector number may be '' (bare Name,Qty import). Omit the field and its
    // separator entirely — never "#—", never a leading "· ".
    entryMeta: (collectorNumber: string, qty: string) =>
      collectorNumber ? `#${collectorNumber} · ${qty}` : qty,
    badgeShownNow: 'Shown now',
    badgePicked: 'Your pick',
    entryAria: (
      setName: string,
      collectorNumber: string,
      qty: string,
      state: 'picked' | 'shown-now' | 'plain',
    ) =>
      [
        setName,
        collectorNumber ? `number ${collectorNumber}` : 'no collector number',
        qty,
        state === 'picked'
          ? 'your pick'
          : state === 'shown-now'
            ? 'shown now, not chosen'
            : '',
      ]
        .filter(Boolean)
        .join(', '),

    // ---- Reset ------------------------------------------------------------
    // Commit is immediate (decision 7); this is the only escape hatch.
    resetToDefault: 'Use the default again',
    resetAria: 'Stop using your pick and go back to the automatic art',

    // ---- Dormant pick (ratified exception to decision 5) ------------------
    // Shown only inside the region, only on the affected card. Never on the
    // review screen, never as a toast. Reactivation is silent — no strings.
    dormantNote: (setName: string) =>
      `You picked the ${setName} printing before. It's not in your collection right now, so we're showing another one you own.`,
    dormantBadge: 'Your pick · not owned now',
    dormantQty: '×0',
    dormantAria: (setName: string) =>
      `${setName}, your earlier pick, not in your collection right now`,
    dormantClear: 'Forget that pick',
    dormantClearAria: 'Forget the printing you picked earlier',

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
    announcePicked: (setName: string, collectorNumber: string) =>
      collectorNumber
        ? `Now showing ${setName} number ${collectorNumber}.`
        : `Now showing ${setName}.`,
    announceReset: (setName: string) =>
      `Your pick was removed. Now showing ${setName}.`,
    announceForget: 'Your earlier pick was forgotten.',
    announceMatches: (n: number, query: string) =>
      n === 0
        ? `No sets match ${query}`
        : `${n} ${n === 1 ? 'printing' : 'printings'} from sets matching ${query}`,
  },
} as const;
