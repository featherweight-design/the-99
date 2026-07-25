// Shell copy — transcribed verbatim from
// design/design_handoff_the99_richness/The 99 - App Shell v2.dc.html.
// Voice: Kitchen Table. Do not paraphrase; the wink is load-bearing.

export const shellCopy = {
  loading: {
    heading: "Reading your collection",
    // The mock renders "1,418 cards · matching to Oracle…", but app/loading.tsx is a
    // Suspense fallback rendered before any data resolves — there is no count to
    // interpolate. Only the countless form is exported; do not add the templated
    // one until a surface actually has the number.
    statusGeneric: "matching to Oracle…",
    caption: "This is the boring part. I'll flag anything that looks off.",
  },
  notFound: {
    numeral: "404",
    heading: "There's no page here.",
    caption: "I checked. Twice. Probably a typo in the URL — happens to the best of us.",
    primaryCta: "Back home",
    secondaryCta: "View decks",
  },
  firstRun: {
    lockedHint: "unlocks after upload",
    railLockedCaption: "Surfaces unlock once your collection is uploaded.",
  },
} as const;
