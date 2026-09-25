// Shell copy — wording transcribed from
// design/design_handoff_the99_richness/The 99 - App Shell v2.dc.html.
// Voice: Kitchen Table. Do not paraphrase; the wink is load-bearing. Punctuation
// diverges from the handoff as of 2026-09-13 — rule 4 applies here and the handoff
// has not been reissued.

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
    // The /about read is one primary-key lookup, so this boundary is almost
    // never seen — it exists because every segment that owns a page owns one,
    // and a route that skipped it would flash the shell instead.
    about: {
      heading: "Opening the rulebook",
      status: "reading what the app does…",
    },
    proxies: {
      heading: "Gathering your proxies",
      status: "reading what each deck prints…",
    },
    commanders: {
      heading: "Consulting the council",
      status: "ranking by what you own…",
    },
    // Written to the same shape as the rest: a table phrase, then a lowercase
    // status naming what the wait is actually spent on.
    sets: {
      heading: "Laying out the sets",
      status: "counting what you're missing…",
    },
    setGrid: {
      heading: "Dealing the set",
      status: "matching your copies to the checklist…",
    },
    // Not in the App Shell handoff: /discover did not exist when it was drawn.
    // Written to the same shape as `commanders` above — a table phrase, then a
    // participle — because the two lanes ask the same question of opposite
    // shelves. The status is not word-for-word parallel and should not be:
    // `commanders` ranks *by* what you own, ownership being the key it sorts on,
    // while this lane ranks the unowned cards themselves. Without the entry the
    // route falls through to the root boundary and greets a lane of unowned
    // commanders with "counting what you've got".
    discover: {
      heading: "Casting a wider net",
      status: "ranking what you don't own…",
    },
    decks: {
      heading: "Shuffling up",
      status: "counting the 99…",
    },
    deckNew: {
      heading: "Clearing a space",
      status: "gathering candidates…",
    },
    // Help me choose: the form, and the submit on its way to the results. Owed
    // to /copy-review with the rest of the route's strings.
    choose: {
      heading: "Weighing your answers",
      status: "finding commanders that fit…",
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
    triggerLabel: (name: string) => `Account: ${name}`,
    // Stands in for the name when Clerk has neither a name nor an email.
    fallbackName: "your account",
  },
} as const;
