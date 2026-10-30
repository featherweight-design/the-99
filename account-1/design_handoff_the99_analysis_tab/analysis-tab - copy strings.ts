/**
 * The 99 — Analysis tab, consolidated (R1). NEW AND CONFORMED STRINGS ONLY.
 *
 * Every other string on the canvas is already on main in src/lib/copy/deck-analysis.ts,
 * declaration.ts and upgrade-path.ts, and is not repeated here. Destination for these: a
 * `panel` extension in deck-analysis.ts, beside the shipped `panel.*`.
 *
 * CONFORMED, NOT REWRITTEN: Round 4's card-note copy spells "analyse"; the shipped control says
 * "Analyze", so the app is US English and Round 4's strings are conformed to it. No em dashes.
 * Round 4's "Reading all 99…" is NOT used — shipped `panel.reading` dropped the count on purpose.
 */
export const analysisTabCopy = {
  /**
   * The Overview's pre-analysis empty state (touch-up 1). Replaces panel.analyze's
   * "Analyze this deck" with "Analyze", and retires panel.analyzeCost ("about two seconds").
   */
  empty: {
    idle: {
      heading: "Five brackets. Your cards pick which.",
      body: "One pass over your list against the Commander Format Panel's rules, and we'll tell you which brackets your cards permit, and which cards put it there.",
      bodyPersist: "The reading is kept with the deck. Edit the list and it waits for you to ask again.",
      cta: "Analyze",
    },
    /** heading is the shipped panel.reading, and it is the live region. */
    loading: {
      heading: "Reading your deck\u2026",
      body: "Checking your list against each bracket's rules.",
    },
    /** The shipped panel.failed, split at its full stop, plus synopsis.refused's last clause. */
    failed: {
      heading: "We could not finish reading this deck.",
      body: "The mix below is counted from your list and is true now. Nothing about your deck changed.",
      cta: "Try again",
    },
    /** provenance.toggle, as a sheet opener. */
    provenance: "How we make these decisions",
  },

  /** v2 / v3 provenance. Round 4's, with the persisted form's date rule made explicit. */
  provenance: {
    asked: (total: number, when: string) => `determined against all ${total} · ${when}`,
    committed: (version: number, total: number, date: string) =>
      `determined for version ${version} · all ${total} · ${date}`,
    /** Relative under an hour ("2 minutes ago"), then the deck page's own short date ("21 Sept"). */
  },

  /**
   * Touch-up 2. The one banner at the top of the tab, and the box's date line.
   * Supersedes the v4 block below: no tag, no past-tense face, no changed-cards list.
   */
  banner: {
    stale: "Your deck has changes since it was analyzed, so this bracket might not be accurate.",
    reanalyze: "Re-analyze",
    failedHeld: "We couldn't re-analyze your changes. The bracket below is from before them.",
    tryAgain: "Try again",
  },
  analyzed: {
    asked: (when: string) => `analyzed ${when}`,
    committed: (version: number, date: string) => `analyzed with version ${version} · ${date}`,
    stale: (date: string) => `analyzed ${date}, before your changes`,
  },

  /** v4 — Round 4's stale block. SUPERSEDED by `banner` above; kept for the audit trail. */
  stale: {
    face: (range: string) => `Your cards permitted ${range}.`,
    tag: "out of date",
    provenance: (was: number, total: number, changed: number) =>
      `determined against ${was} of these ${total} · ${changed} ${changed === 1 ? "card has" : "cards have"} changed since`,
    changedHeading: "The cards that changed",
    changedCarryFacts: (n: number) => `${n} of these carry facts the brackets count.`,
  },


  /**
   * Sheet titles. Both are an existing control's own words, sentence-cased, so the sheet a reader
   * lands on is named by what they pressed.
   */
  sheets: {
    /** upgradePathCopy.open, sentence-cased. Aside: upgradePathCopy.rungLabel. */
    upgradePath: "What would have to go",
    /** provenance.toggle, verbatim. No aside, no mark. */
    provenance: "How we make these decisions",
    closeUpgradePath: "Close what would have to go",
    closeProvenance: "Close how we make these decisions",
  },
} as const;

/**
 * Touch-up 3 (2h). The lean names the combo as a combo. Applies to every lean reading
 * that names a pair (reachable, reachableCommander, reachableZone, drawOnly, oneHalf):
 * "{a} + {b}" becomes "a {a} + {b} two-card infinite combo" wherever it is the object.
 */
export const leanConformed = {
  reachableCommander: (a: string, b: string) =>
    `Your commander is one half of a ${a} + ${b} two-card infinite combo, and your tutors can find the other, so the pair is part of the plan rather than a draw away. That is what puts this past Upgraded.`,
  reachableCommanderParts: (a: string, b: string) =>
    ["Your commander is one half of a ", a, " + ", b,
      " two-card infinite combo, and your tutors can find the other, so the pair is part of the plan rather than a draw away. That is what puts this past Upgraded."],
};
