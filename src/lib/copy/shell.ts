// Shell copy — transcribed verbatim from
// design/design_handoff_the99_richness/The 99 - App Shell v2.dc.html.
// Voice: Kitchen Table. Do not paraphrase; the wink is load-bearing.

export type LoadingCopy = { heading: string; status: string };

export const shellCopy = {
  // One entry per route segment. "Reading your collection" is only true of the
  // collection routes; it used to be the single shared heading and so greeted
  // you on /commanders and /decks too.
  //
  // The collection mock renders "1,418 cards · matching to Oracle…", but these
  // are Suspense fallbacks rendered before any data resolves — there is no count
  // to interpolate. Only the countless form is exported; do not add the
  // templated one until a surface actually has the number.
  //
  // Heading and status only. The mock's third line restated the status and
  // added filler ("Won't be a moment"); a screen that is up for under a second
  // does not get a paragraph.
  loading: {
    home: {
      heading: "Setting the table",
      status: "counting what you've got…",
    },
    collection: {
      heading: "Reading your collection",
      status: "matching to Oracle…",
    },
    commanders: {
      heading: "Consulting the council",
      status: "ranking by what you own…",
    },
    decks: {
      heading: "Shuffling up",
      status: "counting the 99…",
    },
    deckNew: {
      heading: "Clearing a space",
      status: "gathering candidates…",
    },
    // The update route reads the deck before it can offer to diff anything
    // against it, and it is reached from a deck the player is already looking
    // at — so the status names the list being fetched, not the paste to come.
    deckUpdate: {
      heading: "Fetching the list",
      status: "reading what's in the deck…",
    },
  },
  notFound: {
    numeral: "404",
    heading: "There's no page here.",
    caption: "I checked. Twice. Probably a typo in the URL.",
    primaryCta: "Back home",
    secondaryCta: "View decks",
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
