// themes · copy strings.ts
// Handoff: design/design_handoff_the99_themes/ · R1 · 2026-09-01
// Voice: Kitchen Table (design/design_handoff_the99_richness/README.md), unchanged.
//
// Two kinds of entry here:
//   NEW      — strings that do not exist yet (the theme picker).
//   REPLACES — strings that ship today and are rewritten because the illustration
//              that was carrying the personality is being retired (§7). The old
//              value is quoted so the diff is reviewable.
//
// Nothing here paraphrases a string that still works. Six of the ten empty states
// keep their copy verbatim; only the four that leaned on the creature are rewritten.

export const themeCopy = {
  // ---------------------------------------------------------------- picker (NEW)
  picker: {
    // Section label in the account menu. Plex Mono 11px uppercase, per the brand label style.
    label: "Theme",
    // Announced to screen readers on the radiogroup.
    groupLabel: "Colour theme",
    // Each option is named descriptively, with the plane as a subtitle. §9.1.
    options: {
      amonkhet:  { name: "Gilded Stone", plane: "Amonkhet" },
      kamigawa:  { name: "Neon Rain",    plane: "Kamigawa: Neon Dynasty" },
      innistrad: { name: "Moonlit",      plane: "Innistrad" },
      phyrexia:  { name: "Oil and Iron", plane: "New Phyrexia" },
      duskmourn: { name: "Screen Glow",  plane: "Duskmourn" },
      kaldheim:  { name: "Rune Frost",   plane: "Kaldheim" },
    },
    // aria-label per option. The plane is included because it is visible text.
    optionLabel: (name: string, plane: string) => `${name} — ${plane}`,
    // Live-region announcement after a selection. There is no Save, so this is the receipt.
    applied: (name: string) => `${name} applied.`,
  },

  // ------------------------------------------------- empty states that are rewritten
  // REPLACES shellCopy.notFound.caption ("I checked. Twice. Probably a typo in the URL
  // — happens to the best of us."). Kept almost verbatim: this line never needed the
  // crab. Only the trailing clause goes, because with no illustration the sentence has
  // to land on its own beat.
  notFound: {
    caption: "I checked. Twice. Probably a typo in the URL.",
  },

  // REPLACES decksBuilderCopy.completion.* — the kaiju was the celebration. The copy
  // now has to be the celebration, so it gets the one loud line in the app.
  completion: {
    heading: "Ninety-nine.",
    caption: (commander: string) =>
      `${commander} has a full deck. Sleeve it up before you change your mind.`,
  },

  // REPLACES the collection no-results caption. The old line pointed at the crab
  // ("nothing to fetch"); with no crab it is just a shrug, so it does the useful thing
  // instead and names the two controls the buttons operate.
  noResults: {
    caption: "Nothing matches that search and that colour filter together. Drop one of them.",
  },

  // REPLACES commandersCopy.filteredEmpty.caption's second sentence only. The heading
  // ("No generals in {guild}.") and the "Showing 0 of N" diagnostic are unchanged.
  filteredEmpty: {
    caption: (colorWords: string, total: number) =>
      `You own ${total} legal commander${total === 1 ? "" : "s"}, but none of them are ${colorWords}.`,
  },

  // -------------------------------------------------------------- unchanged, listed
  // These six ship their current strings verbatim. Listed so the audit can see the
  // decision was made rather than missed.
  //   shellCopy.loading.*          — five route headings, all still true
  //   shellCopy.notFound.heading   — "There's no page here."
  //   shellCopy.notFound.numeral   — "404", now the mark itself (see README decision 7)
  //   commandersCopy.filteredEmpty.heading / .count / .cta
  //   collectionBrowseCopy.noResults.heading / .cta
  //   decksBuilderCopy empty-builder caption + cta (add-panel handoff, R2)
} as const;

// The loading state's three animated dots are retired with LoaderDots. They are
// replaced by the crown's three diamonds, which carry the same 1.2s stagger — see
// README decision 6. No new copy: the status line already says what is happening.
