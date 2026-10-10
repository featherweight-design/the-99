// Deck Stats copy. Every string is a PLACEHOLDER owed to /copy-review, transcribed from the
// handoff's `deck-stats · copy strings.ts`. US English. No em dashes.

export const deckStatsCopy = {
  segment: {
    stats: "Stats",
    aria: "Show the deck as stats",
    groupAria: "Which cards to show",
    provenance: "drawn from the live list, your collection and logged games",
  },
  cards: {
    curve: "The curve, by card type",
    colors: "Colors, asked for and made",
    jobs: "Jobs",
    average: "Against the average deck",
    money: "Money and ownership",
    results: "Results",
  },
  colors: {
    denom: (pips: number, lands: number) => `${pips} ${pips === 1 ? "pip" : "pips"} · ${lands} ${lands === 1 ? "land" : "lands"}`,
    asks: "ASKS FOR · PIPS",
    makes: "MAKES · LAND SOURCES",
    nonlandOne: "1 more mana source isn’t a land. It’s counted, but its color isn’t.",
    nonlandMany: (n: number) =>
      `${n} more mana sources aren’t lands, such as rocks, creatures that tap for mana and spells that fetch lands. They’re counted here, but their colors aren’t.`,
    caption: "A land counts once for each color it can add, so a dual counts twice. Shares are of all pips, and of all land sources.",
    // One color asked for: the dual-counts-twice clause is dropped, as drawn in 1d2.
    captionMono: "A land counts once for each color it can add; shares are of all land sources.",
    monoLead: (color: string) => `Every pip is ${color}.`,
    noLands: "No lands yet, so no land sources are counted.",
    names: { W: "white", U: "blue", B: "black", R: "red", G: "green", C: "colorless" },
    row: (name: string, pips: number, sources: number) =>
      `${name}: ${pips} ${pips === 1 ? "pip" : "pips"} asked for, ${sources} land ${sources === 1 ? "source" : "sources"} made`,
  },
  jobs: {
    denom: (n: number) => `${n} nonland ${n === 1 ? "card" : "cards"}`,
    rows: { ramp: "Ramp", draw: "Card draw", removal: "Removal", wipes: "Board wipes", protection: "Protection", finisher: "Win conditions" },
    overlap: (n: number) => `${n} ${n === 1 ? "card does" : "cards do"} two or more of these jobs, so the rows add up to more than the cards in them.`,
    none: (n: number) => `${n} nonland ${n === 1 ? "card does" : "cards do"} none of these jobs.`,
    unlabeled: (n: number) => `${n} ${n === 1 ? "card isn’t" : "cards aren’t"} labeled yet. ${n === 1 ? "It joins" : "They join"} a row once ${n === 1 ? "it is" : "they are"}.`,
  },
  curve: {
    title: "The curve, by card type",
    denom: (cast: number) => `${cast} cast`,
    ceiling: "7+",
  column: (label: string, n: number, parts: string[]) =>
    n === 0 ? `Mana value ${label}: no cards` : `Mana value ${label}: ${n} ${n === 1 ? "card" : "cards"}, ${parts.join(", ")}`,
    // No average to name at zero cast: a deck of nothing but lands has none, and 0.0 would read as one.
    noAverage: "none",
    caption: (avg: string, lands: number) =>
      `Average mana value ${avg}, commander included · ${lands} ${lands === 1 ? "land" : "lands"}, not on the curve · tap a type to light its cards`,
    lit: (type: string, n: number, cast: number) =>
      `${type} lit: ${n} of ${cast} cast. Tap it again to clear.`,
    types: {
      creature: "Creature",
      instant: "Instant",
      sorcery: "Sorcery",
      artifact: "Artifact",
      enchantment: "Enchantment",
      planeswalker: "Planeswalker",
      battle: "Battle",
      land: "Land",
    },
    typesPlural: {
      creature: "Creatures",
      instant: "Instants",
      sorcery: "Sorceries",
      artifact: "Artifacts",
      enchantment: "Enchantments",
      planeswalker: "Planeswalkers",
      battle: "Battles",
      land: "Lands",
    },
  },
} as const;
