/**
 * The swap tools' words (sub-project 4): cheaper stand-ins in Shopping, and Fits your decks.
 * Transcribed from the handoff's `swap-tools · copy strings.ts` (Design R4), one surface at a time as
 * each ships; every string is owed to /copy-review. Figures arrive formatted: this module owns the
 * words only.
 */
export const swapToolsCopy = {
  // ── The limit line (under PriceStrip, Shopping only) ─────────────────
  limit: {
    lead: "Marking cards over",
    editAria: (figure: string) => `Change the limit, now ${figure}`,
    defaultChip: "default",
    /** The figure is always the $10 default. */
    reset: (figure: string) => `reset to ${figure}`,
    save: "Save",
    cancel: "cancel",
    fieldAria: "Limit per card, in dollars",
    tooLow: "Use a whole dollar figure of 1 or more.",
    overCount: (n: number) => `${n} over`,
    noneOver: (figure: string) => `none over ${figure}`,
  },

  // ── The row (DecklistRow, Shopping) ─────────────────────────────────
  row: {
    /** Meta line, --warning mono. */
    over: (figure: string) => `over ${figure}`,
  },

  announce: {
    limitSaved: (figure: string) => `Marking cards over ${figure}.`,
  },
} as const;
