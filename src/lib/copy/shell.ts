// Shell copy — transcribed verbatim from
// design/design_handoff_the99_richness/The 99 - App Shell v2.dc.html.
// Voice: Kitchen Table. Do not paraphrase; the wink is load-bearing.

export type LoadingCopy = { heading: string; status: string; caption: string };

export const shellCopy = {
  // One entry per route segment. "Reading your collection" is only true of the
  // collection routes; it used to be the single shared heading and so greeted
  // you on /commanders and /decks too.
  //
  // The collection mock renders "1,418 cards · matching to Oracle…", but these
  // are Suspense fallbacks rendered before any data resolves — there is no count
  // to interpolate. Only the countless form is exported; do not add the
  // templated one until a surface actually has the number.
  loading: {
    home: {
      heading: "Setting the table",
      status: "counting what you've got…",
      caption: "Pulling your collection, commanders and decks into one place.",
    },
    collection: {
      heading: "Reading your collection",
      status: "matching to Oracle…",
      caption: "This is the boring part. I'll flag anything that looks off.",
    },
    commanders: {
      heading: "Consulting the council",
      status: "ranking by what you own…",
      caption: "Scoring every legal commander in your collection. Won't be a moment.",
    },
    decks: {
      heading: "Shuffling up",
      status: "counting the 99…",
      caption: "Fetching your decks and how close each one is to done.",
    },
    deckNew: {
      heading: "Clearing a space",
      status: "gathering candidates…",
      caption: "Lining up every commander you can legally helm.",
    },
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
  accountMenu: {
    manageAccount: "Manage account",
    signOut: "Sign out",
    // The trigger names the person, not the glyphs — the initials are aria-hidden.
    triggerLabel: (name: string) => `Account — ${name}`,
    // Stands in for the name when Clerk has neither a name nor an email.
    fallbackName: "your account",
  },
} as const;
