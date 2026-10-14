// New strings for deck notices. Queued for /copy-review. No em dashes; apostrophes ’ in shipped copy.
// Reused, not retyped: the banner (analysis-tab copy `banner.stale`, `banner.reanalyze`), the credit note
// (`credits.left`), the finding labels (`deckAnalysisCopy.findings.labels`), Write one.

export const deckNoticesCopy = {
  tag: {
    count: (n: number) => (n === 1 ? "1 notice" : `${n} notices`),
    notLegal: "Not legal",
    aria: {
      unread: (n: number) => `${n === 1 ? "1 notice" : `${n} notices`} since this deck was analyzed. Open notices`,
      read: (n: number) => `${n === 1 ? "1 notice" : `${n} notices`}, read. Open notices`,
      notLegal: (n: number) => `${n === 1 ? "1 card" : `${n} cards`} not legal in this deck. Open notices`,
    },
  },
  sheet: {
    title: "Notices",
    since: (date: string) => `since analyzed ${date}`,
    closeAria: "Close notices",
    groups: {
      notLegal: "Not legal in Commander",
      outsideColors: "Outside the commander’s colors",
      // gameChangers, combos, massLandDenial, extraTurns: deckAnalysisCopy.findings.labels
      rules: "Bracket rules",
    },
    dir: { added: "added", removed: "removed", moved: "moved" },
    combo: (result: string) => `Spellbook: ${result}.`,
    legal: {
      notLegal: "Not legal in Commander.",
      banned: "Banned in Commander.", // only if the catalog keeps Scryfall's value (READINESS 2)
      outside: (colors: string, commander: string, identity: string) =>
        `${colors}, outside ${commander}’s colors (${identity}).`,
      foot: "These stay until the cards leave the deck. Reading them does not clear them.",
    },
    foot: {
      holds: "Your bracket holds until you re-analyze. Nothing here moves it on its own.",
      dirty:
        "Your bracket holds until you re-analyze. Your own edits are waiting too: the Re-analyze on the Analysis tab reads both.",
      toTab: "Analysis tab",
    },
  },
  check: {
    note: "Reads the bracket only. The overview waits until every card is legal in Commander.",
    seeWhich: "See which",
    withheld: "No overview while this deck holds cards that are not legal in Commander.",
  },
} as const;
