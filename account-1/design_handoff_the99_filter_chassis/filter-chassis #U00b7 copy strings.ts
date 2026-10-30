// The 99 — the shared filter chassis
// Four routes, one frame. Most strings here ALREADY EXIST and are marked as
// reuse rather than copied, because the consistency this round buys is partly
// that four surfaces stop wording the same act four ways.
//
// Destination: src/lib/copy/filters.ts, with the per-route blocks staying in
// lanes.ts / refresh.ts / collection.ts where they already live.

// ─────────────────────────────────────────────────────────────────────────────
// REUSED VERBATIM — do not re-author, do not re-word
// ─────────────────────────────────────────────────────────────────────────────
//
//   lanes.ts  filterCopy.colour.legend        "Colour identity"
//             filterCopy.colour.names         White / Blue / Black / Red / Green
//             filterCopy.colour.collapsed     `${count} colours`
//             filterCopy.match.*              the whole block, unchanged
//             filterCopy.chips.query          `"${q}"`
//             filterCopy.chips.clearAll       "Clear all filters"
//             filterCopy.sheet.trigger        "Filters"
//             commandersCopy.result.*         rest / filtered
//             discoverCopy.result.*           rest / filtered
//             commandersCopy.availability.*   the Score-against block
//             commandersCopy.empty.*          bodyOneFix / bodyMode /
//                                             bodyNoSingleFix / fixDrop / fixMode
//   refresh.ts  filters.searchPlaceholder, filters.clear, status.*
//   collection.ts  collectionFilterCopy.{type,set,sort,availability,color}
//
// `filterCopy.chips.clear` ("Clear") is RETIRED: three scopes need three
// wordings, and a bare "Clear" is the one that could mean any of them.

export const chassisCopy = {
  // ── Row 2, the chip line ───────────────────────────────────────────────────
  chips: {
    // Row 2 at rest. Present rather than absent, so the chassis never changes
    // height between result states — the line IS the invariant.
    none: "No filters on",
    // Per-chip removal. The chip's own × ; named so a reader hears which value
    // leaves, never a bare "Remove".
    removeAria: (label: string) => `Remove filter: ${label}`,
    // Trailing control, and the only one that touches every dimension. Reused
    // from filterCopy.chips.clearAll — "filters" is load-bearing, because this
    // control deliberately does not touch the sort.
    clearAll: "Clear all filters",
    clearAllAria: "Clear all filters. The sort is unchanged.",
  },

  // ── Row 1, the triggers ───────────────────────────────────────────────────
  trigger: {
    // The value rides in the label so the state does not depend on reading a
    // border colour. One value names itself; past one it counts.
    one: (dimension: string, value: string) => `${dimension} · ${value}`,
    many: (dimension: string, count: number) => `${dimension} · ${count} on`,
    // Announced name. The count is NOT folded in: the chip line has already
    // said which values, and "Status 2" would say it twice.
    aria: (dimension: string) => `${dimension} filter`,
    // The trailing slot, past the hairline. Sort always states its value —
    // a list is always in some order, so there is no "off" to leave unsaid.
    sort: (value: string) => `Sort · ${value}`,
    sortAria: (value: string) => `Sort. Currently ${value}.`,
  },

  // ── The panel ─────────────────────────────────────────────────────────────
  panel: {
    // Footer, left. Ticking all of a dimension says the same thing as ticking
    // none of it, so both read as all — the count would otherwise claim a
    // narrowing the list has not made. (The deck column's `allOn` already got
    // this right and is the reason the rule is stated here.)
    countOn: (on: number, total: number) => `${on} of ${total} on`,
    countAll: "All on",
    countNone: "None on",
    // Footer, right. Scoped by name, always — this is the string that stops
    // three Clears from being indistinguishable.
    clearOne: (dimension: string) => `Clear ${dimension.toLowerCase()}`,
    // Announced when the panel's own Clear is pressed, as distinct from
    // toggling the last value off. Both land on an empty selection and
    // FilterChangeIntent exists to tell them apart.
    clearedAnnounce: (dimension: string) => `${dimension} filter cleared.`,
    lastOffAnnounce: (dimension: string) => `No ${dimension.toLowerCase()} filter.`,
    searchPlaceholder: (dimension: string) => `Search ${dimension.toLowerCase()}…`,
    // Only rendered where the vocabulary is long enough to search.
    noMatch: (q: string) => `Nothing in this list matches "${q}".`,
  },

  // ── The new dimension (§6 decision 9) ─────────────────────────────────────
  //
  // "Printed in", never "Set". The control matches ANY printing of the
  // commander, and the row draws whatever art the oracle-level card resolves
  // to — so a name claiming to describe the thing on screen would be a visible
  // contradiction. "Printed in Duskmourn" stays true either way.
  //
  // /collection's `Set ▾` keeps its own name: it answers "sets I hold cards
  // from", which is a different question with a different count behind it.
  printedIn: {
    legend: "Printed in",
    // Panel rows carry the set's own name with the code as the secondary,
    // which is also what the search matches — set collections' ruling.
    rowGloss: (code: string) => code.toUpperCase(),
    one: (code: string) => `Printed in ${code.toUpperCase()}`,
    many: (codes: string[]) => `Printed in ${codes.map((c) => c.toUpperCase()).join(", ")}`,
    manyShort: (count: number) => `${count} sets`,
    // The hint, shown once in the panel head. It is the whole reason the
    // control is not called Set, so it is worth the line.
    hint: "Matches any printing, including ones you don't own.",
    clearAria: "Clear the printed-in filter",
  },

  // ── The colour control ────────────────────────────────────────────────────
  colour: {
    // Per-pip accessible name. The hue is NEVER the accessible name on its own
    // — `Filter by B` is what color-pip.tsx says today and it reads as a letter,
    // not a colour.
    pipAria: (name: string, on: boolean) => `${name}${on ? ", on" : ""}`,
    // The group. Reused from filterCopy.colour.legend on the commander lanes;
    // stated here because /decks and /collection had no legend at all.
    legend: "Colour",
    // The chip past one pip. Reused: filterCopy.colour.collapsed.
    collapsed: (count: number) => `${count} colours`,
    // With the modifier on, the chip says so — otherwise two very different
    // filters produce the same chip.
    collapsedExactly: (count: number) => `Exactly ${count} colours`,
  },

  // ── Empty result (§decision 14) ───────────────────────────────────────────
  //
  // The shape is commandersCopy.empty's, generalised: name the control, promise
  // the rows. New strings only for the two routes that had no such copy.
  empty: {
    decks: {
      headingOne: "No deck matches this filter.",
      headingMany: (count: number) => `No deck matches all ${count}.`,
      // One control is enough to blame, and the count is the point of the
      // sentence. Never "try adjusting your filters".
      bodyOneFix: (name: string, control: string, rows: number) =>
        `One deck is called ${name}, but ${control} rules it out. Drop that and you get ${
          rows === 1 ? "one deck" : `${rows} decks`
        } back.`,
      bodyNoSingleFix: "No single filter is doing this — several are overlapping.",
      // The searched-for-nothing case, which is not a filter problem.
      bodySearchOnly: (q: string) => `No deck's name matches "${q}".`,
    },
    collection: {
      headingOne: "No card matches this filter.",
      headingMany: (count: number) => `No card matches all ${count}.`,
      bodyOneFix: (control: string, rows: number) =>
        `${control} is what rules the rest out. Drop it and you get ${
          rows === 1 ? "one card" : `${rows} cards`
        } back.`,
      bodyNoSingleFix: "No single filter is doing this — several are overlapping.",
      bodySearchOnly: (q: string) => `Nothing in your collection matches "${q}".`,
    },
    // Reused verbatim: commandersCopy.empty.fixDrop / fixMode, and both lanes'
    // emptySearch blocks, which state which lane holds what you searched for.
    fixDrop: (control: string) => `Drop ${control}`,
  },

  // ── Result line (§decision 13) ────────────────────────────────────────────
  //
  // The commander lanes' strings already exist and are reused. These two are
  // the routes that had no result line at all; they follow the same rule —
  // state the collection at rest, print the ratio when narrowed.
  result: {
    decks: {
      rest: (count: number) => `${count} ${count === 1 ? "deck" : "decks"}`,
      filtered: (shown: number, total: number) =>
        `${shown} of ${total} ${total === 1 ? "deck" : "decks"} match`,
    },
    collection: {
      rest: (count: number) => `${count.toLocaleString("en-US")} cards`,
      filtered: (shown: number, total: number) =>
        `${shown.toLocaleString("en-US")} of ${total.toLocaleString("en-US")} cards match`,
    },
  },

  // ── Phone ─────────────────────────────────────────────────────────────────
  sheet: {
    // Reused: filterCopy.sheet.trigger, and the deck sheet's own title.
    title: "Filters",
    // The badge is never in the accessible name (filter-rack.tsx's rule): the
    // chip line has already said which filters are on.
    triggerAria: "Filters",
    dismissDecks: (shown: number) => `Show ${shown} ${shown === 1 ? "deck" : "decks"}`,
    dismissCards: (shown: number) =>
      `Show ${shown.toLocaleString("en-US")} ${shown === 1 ? "card" : "cards"}`,
    clearAll: "Clear all",
    // Sort is on the persistent row, not in here (decision 11), so the sheet
    // never names it.
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// The one string this file deliberately does NOT provide
// ─────────────────────────────────────────────────────────────────────────────
//
// There is no "Apply". Every one of the four surfaces filters live as the
// reader ticks, and both deck surfaces say so in their own headers: "There is
// no Apply. Ticking a filter re-filters immediately and Clear is the only
// commitment control." The sheet's dismiss button carries the count so it
// reads as a result, not a commit — `Show 3 decks`, never `Apply (3)`.
