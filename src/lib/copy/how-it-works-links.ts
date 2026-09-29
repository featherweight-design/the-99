// The parts of About's "How the app reaches its answers" that point AT it: the entries' link line,
// the contents group, the About sheet's one line, and the id a visit records (plan 2026-09-28,
// PR C). No imports, deliberately. The contents rail and the sheet are client components and the
// proxy reads the id, and `how-it-works.ts` builds its rows from the scoring and cadence
// constants, none of which belong in either bundle.
//
// Wording passed /copy-review in lane (2026-09-29).

/** The appendix's section id, and the id a visit to /about records in `about_seen_ids`. */
export const HOW_IT_WORKS_ID = "how-it-works";

export const howItWorksLinksCopy = {
  /** An entry's line to the row that explains it. `↓` is drawn apart and hidden from readers. */
  entryLink: "How this is decided",
  /** The contents group, in the rail and in the phone's list. */
  group: "How the app reaches its answers",
  groupCount: (n: number) => `${n} rows`,
  /** The About sheet's one line. It rides a sheet already drawing and never summons one. */
  sheetLine: "Also new: how the app reaches its answers, at the foot of About.",
} as const;

/**
 * Which row explains each entry (handoff `how-it-works · copy strings.ts`, `entryRow`). An entry
 * with no row draws no line. `how-it-works-links.test.ts` fails when a key names no entry or a
 * value names no row, so a renamed id cannot leave a link pointing at nothing.
 */
export const entryRow: Record<string, string> = {
  "decklist-marks": "how-brackets",
  "combo-awareness": "how-brackets",
  roles: "how-roles",
  "informed-build": "how-roles",
  "role-coverage": "how-roles",
  "auto-fill": "how-roles",
  discover: "how-themes",
  "ready-to-build": "how-recommendations",
  "fit-score": "how-recommendations",
  "commander-lane": "how-recommendations",
  "help-me-choose": "how-recommendations",
  availability: "how-availability",
  "commander-availability": "how-availability",
  reservations: "how-availability",
  "post-import": "how-availability",
  commitments: "how-availability",
  "buy-tag": "how-prices",
  sets: "how-prices",
  shopping: "how-prices",
  "stand-ins": "how-stand-ins",
  "fits-your-decks": "how-stand-ins",
};
