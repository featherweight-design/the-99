// Decks builder copy — transcribed verbatim from
// design/design_handoff_the99_richness/The 99 - Surfaces v2.dc.html §Decks.
// The mock's instance is Korvold; the templates below reproduce it exactly
// when passed "Korvold".
//
// Exports are untouched by this pass — "plain text is sacred" (mock, Decks
// deltas). No copy here reaches export-dialog.tsx.

/** The mock names the commander in the short register ("Korvold is fed"), not
 *  the full "Korvold, Fae-Cursed King" shown in the builder header. Everything
 *  up to the first comma. */
export function shortCommanderName(name: string): string {
  return name.split(",")[0].trim();
}

export const decksBuilderCopy = {
  builderEmpty: {
    heading: "A king with no army.",
    // Verbatim. "on the right" is literally true only on desktop, where the
    // Add panel is a persistent right-hand column.
    captionFor: (commander: string) =>
      `Ninety-nine slots, zero filled. Suggestions are primed on the right — ${commander} eats everything anyway.`,
    // Not from the mock. On mobile the Add panel is a bottom sheet, not a right
    // column, so the verbatim line would point at nothing. The mock's note
    // ("Mobile forms follow the same deltas") gives no mobile string; this is
    // the smallest possible edit that keeps the joke and the direction honest.
    // Flagged for Design ratification.
    captionForMobile: (commander: string) =>
      `Ninety-nine slots, zero filled. Suggestions are one tap away — ${commander} eats everything anyway.`,
    cta: "Open suggestions",
    // Kept from the shipped v1 empty state. The richness caption is flavour;
    // this is the only line that tells a first-time builder what to fill first,
    // and the mock replaces the body copy, not the hint.
    roleHint: "Try filling your ramp, draw, removal, and wipe slots first.",
  },
  completion: {
    heading: "The 99 is complete.",
    caption: (commander: string) =>
      `${commander} is fed — 99 of 99, all owned. Try not to let it get to your head at the table.`,
    primaryCta: "Export decklist",
    secondaryCta: "Back to the deck",
  },
} as const;
