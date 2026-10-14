// Addendum R2 — only the strings this round ADDS or CHANGES.
//
// Everything else in src/lib/copy/set-collections.ts is unchanged and is referenced here
// rather than duplicated: a second copy of a shipped label is a second thing to keep in
// step. Conventions carried from the shipped block: figures interpolated, every plural
// with an explicit singular, no internal nouns.

// ─────────────────────────────────────────────────────────────────────────────
// setFilterCopy — ADDITIONS and two CHANGES
// ─────────────────────────────────────────────────────────────────────────────

export const setFilterCopyAdditions = {
  // The name search (finding 4). The set is in the ACCESSIBLE NAME and not in the
  // placeholder: /collection/sets' own field says "Find any set" in the same skin one tap
  // away, and a screen-reader user has no other way to tell which population they are in.
  search: {
    placeholder: "Find a card in this set",
    // Phone; the field is 173px on the persistent row and the placeholder has to fit it.
    placeholderShort: "Find a card",
    ariaLabel: (set: string) => `Search cards in ${set}`,
    clear: "Clear the search",
  },

  // Row 2 at rest. NOT "no filters" — the line's job is to hold the chassis's height, and
  // the present tense is what makes it a state rather than a label.
  // If the chassis package lands `filterCopy.none` in lib/copy/lanes.ts first, delete this
  // and reuse it: one wording, one place.
  none: "no filters on",

  // Chips. Dimension order, never click order.
  chip: {
    // One lit pip is named; past one it collapses to a count. Never one chip per hue.
    colourOne: (name: string) => name,
    colour: (n: number) => `${n} colours`,
    rarity: (r: "common" | "uncommon" | "rare" | "mythic") =>
      r.charAt(0).toUpperCase() + r.slice(1),
    missingOnly: "Missing only",
    // The × is a 34px target with no visible label, so it needs the value in its name.
    removeAria: (label: string) => `Remove filter: ${label}`,
  },

  // The rarity TRIGGER's label needs no new string: setFilterCopy.rarity.all ("Rarity · all")
  // and setFilterCopy.rarity.value(r) ("Rarity · uncommon") already ship, unused, which is
  // evidence the trigger was the intent and the four letters were the shortcut. The
  // letters map (rarity.letters) retires with them.
  // The sheet's chip group uses rarity.options (Title Case) — a chip is a control, not a
  // caption, which is why it does not take the trigger's lowercase value form.

  // CHANGED: `clear: "Clear filters"` becomes this, and the control moves out of the
  // control row onto the chip line's trailing edge. The word "all" is doing work — it is
  // what distinguishes this scope from a chip's × beside it.
  clearAll: "Clear all filters",
  // CHANGED: it clears the three dimensions AND the query. See the addendum README's
  // amendment to the chassis — sort is excluded because sort does not narrow; a search
  // does.
  clearAllAria: "Clear every filter and the search",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// setPageCopy — the zero-with-a-query branch (finding 4)
// ─────────────────────────────────────────────────────────────────────────────

export const setPageCopyAdditions = {
  searchZero: {
    // Names the set, because "nothing matches" on a page reached from a catalogue-wide
    // search reads as a claim about the catalogue.
    heading: (set: string, q: string) => `Nothing in ${set} matches \u201C${q}\u201D`,
    // Two facts, in the order that fixes it: what was searched, and that the other
    // controls are still narrowing. The second clause only prints when they are.
    body: "This searches the names in this set only, so it is a spelling rather than a gap in your collection.",
    bodyWithFilters:
      "This searches the names in this set only, so it is a spelling rather than a gap in your collection. Your colour and rarity filters are still on.",
    // Narrowest correction first. `clearAll` from setFilterCopy is the second button.
    action: "Clear the search",
  },

  // REUSED, not added: with missing-only on and every match already owned, the shipped
  // good-news branch carries this case unchanged —
  //   zeroResults.headingOwnsAll(`cards matching \u201C${q}\u201D`)
  //   zeroResults.bodyOwnsAll(n, setName)
  // which is why `what` was a parameter in the first place.

  // CHANGED: one wording for the widest scope, matching setFilterCopy.clearAll.
  // `zeroResults.clear` was "Clear filters".
  zeroResultsClear: "Clear all filters",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// setsIndexCopy — the extras figure moves (finding 5)
// ─────────────────────────────────────────────────────────────────────────────

export const setsIndexCopyAdditions = {
  row: {
    // Visible, under the base ratio, one type step down, at --fg-muted. The word stays
    // lowercase so it reads as a unit on a figure rather than as a heading.
    extrasLine: (have: number, total: number) => `${have} / ${total} extras`,
    // MANDATORY, not optional. The row is one <Link> with an explicit aria-label, which
    // REPLACES everything its descendants contribute — so a second visible figure that is
    // not in the label is announced to nobody. Appended to ratioAria / zeroAria, never
    // rendered on its own.
    extrasAria: (have: number, total: number) =>
      `, and ${have} of ${total} extras`,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Unchanged and explicitly not reopened
// ─────────────────────────────────────────────────────────────────────────────
//
//   setFilterCopy.rarity.all      NOW IN USE as the rarity trigger's rest label
//   setFilterCopy.rarity.value()  NOW IN USE as its active label
//   setFilterCopy.rarity.options  NOW IN USE as the sheet's chip group
//   setFilterCopy.rarity.letters  RETIRES with the four letter buttons
//   setFilterCopy.missingOnly.*   label, short form and both aria strings
//   setFilterCopy.colourLabel     the sheet's caption
//   setFilterCopy.sheetPrimary    Show N cards
//   setFilterCopy.countBadgeAria  the badge still counts DIMENSIONS only — never the
//                                 search and never missing-only, both of which are
//                                 visible on the row beside it
//   setPageCopy.result.*          the three result lines already state a filtered count,
//                                 so the search needs no fourth form
//   setPageCopy.cell.*            the caption format is unchanged; rarity simply stops
//                                 being hidden at phone
//   setsIndexCopy.search.*        the index's own field, which this one must not be
//                                 confused with
