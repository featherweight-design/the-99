/**
 * Small items 12 · copy strings (R1, 2026-11-15). Every string not marked DRAFT is already shipped; its source is named.
 */
export const smallItems12Copy = {
  combo: {
    /** The feed-opened head's eyebrow: the feed kind's shipped name (`feedCopy` kinds.combo.name). */
    feedEyebrow: "Combos you can make",
    /** Its lead: the shipped feed line, then one DRAFT sentence. */
    feedLead: (added: string) => `You added ${added}. You own both halves now.`, // DRAFT (second sentence)
    // Group head and count: `deckAnalysisCopy.receipt.steps` ("Steps") with the step count beside it.
    // Facts card labels: `deckAnalysisCopy.receipt.manaNeeded`, `.prerequisites` ("Needs").
  },
  menu: {
    // The face's name: `socialCopy.signature.changeAria(card)` with a card, `socialCopy.signature.choose` without.
  },
  price: {
    // Unchanged: `discoveryCopy.price.source` ("manapool"), moved beside the figure.
  },
} as const;
