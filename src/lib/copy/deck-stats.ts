// Deck Stats copy. Every string is a PLACEHOLDER owed to /copy-review, transcribed from the
// handoff's `deck-stats · copy strings.ts`. US English. No em dashes.

export const deckStatsCopy = {
  segment: {
    stats: "Stats",
    aria: "Show the deck as stats",
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
