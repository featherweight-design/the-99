// Guided build (design_handoff_the99_guided_build, R1): the copy of the pieces that have shipped. The handoff's strings file
// is DRAFT until /copy-review; each PR carries the strings it draws and the review of them.

export const guidedBuildCopy = {
  /** The commander page's one action: it starts a deck and promises nothing about how it is built. */
  commander: {
    press: "Start a deck →",
    /** Under the button when picks are made: it says where the picks go, not how the rest is built. */
    picks: (n: number) => (n === 1 ? "Your pick goes into the new deck." : `Your ${n} go into the new deck.`),
  },
  /** The new-deck screen's choice of how the deck is built. */
  choice: {
    label: "How we build it",
    free: { name: "Free build", cost: "free", line: "We fill the 99 from your cards, as far as your collection reaches." },
    empty: { name: "Just the commander", cost: "free", line: (c: string) => `${c} and 99 empty slots. Build it your way.` },
    /** With picks carried from the commander page (?select=): each row says what it does with them. */
    withPicks: {
      free: (n: number) => `We fill the rest of the 99 around your ${n === 1 ? "pick" : `${n} picks`}, as far as your collection reaches.`,
      empty: (c: string, n: number) => `${c}, your ${n === 1 ? "pick" : `${n} picks`} and ${99 - n} empty slots. Build it your way.`,
    },
    picks: {
      label: (n: number) => `Your picks · ${n}`,
      /** The link's words; its accessible name says whose page it leads to. */
      change: "Change",
      changeLabel: (c: string) => `Change on ${c}’s page`,
      kept: "Every option keeps them.",
      buy: "not owned",
    },
  },
  press: { free: "Create deck →", empty: "Create deck →" },
  /** The run's window (R1 to R5): the title, the picks line, the wait, the result and the failed run. */
  run: {
    title: (deck: string) => `Build ${deck}`,
    close: "Close",
    steps: { label: "Your picks", strategy: "Strategy", bracket: "Bracket", cards: "Cards" },
    /** The picks line's words for the card pool, after the strategy and the bracket. */
    pool: { owned: "only cards you own", cap: "buying some", budget: "buying within a budget" },
    bracket: (n: number) => `bracket ${n}`,
    wait: {
      building: (s: string) => `Sharpening toward ${s}`,
      usual: "usually about 8 seconds",
      leave: "Leave whenever you like: the deck is already in Decks with the free build, and the guided picks land in it when they’re done.",
      held: "Running · 2 credits held",
      sharpening: (s: string) => `Sharpening 12 to 18 cards toward ${s}`,
      filled: "Filled · the 99 from your cards",
      pressing: (s: string) => `Build toward ${s}`,
    },
    failed: {
      line: "The guided build didn’t come through. Both credits are back.",
      kept: (deck: string) => `${deck} keeps the free build, so nothing is lost.`,
      retry: "Try again",
      retryLine: "2 credits · same picks",
      open: "Open the deck",
      /** The retry itself was refused (credits gone, a run already going, the switch off): the window stays on the failed run. */
      retryRefused: "That didn’t start. Nothing was spent.",
    },
    result: {
      title: (deck: string) => `${deck} is ready`,
      facts: { strategy: "Strategy", bracket: "Bracket", sharpened: "Sharpened", toBuy: "To buy" },
      cards: "cards",
      none: "none",
      short: (n: number, b: number) => (n === 0
      ? `No cards could be sharpened at bracket ${b}, so both credits are back.`
      : `Only ${n} ${n === 1 ? "card" : "cards"} could be sharpened at bracket ${b}, so both credits are back. ${n === 1 ? "It is" : `The ${n} are`} in the deck.`),
      open: (deck: string) => `Open ${deck}`,
    },
  },
  /** On the deck's page while the run is going, and after it came up short or failed (G6). */
  line: {
    running: (s: string, clock: string) => `Sharpening toward ${s} · ${clock}`,
    short: (s: string) => `The guided build toward ${s} found fewer than 12 cards. Both credits are back.`,
    failed: (s: string) => `The guided build toward ${s} didn’t come through. Both credits are back.`,
    open: "See the build",
    /** Home's resume row has room for the clock alone. */
    runningStamp: (clock: string) => `Sharpening · ${clock}`,
    /** A tile's accessible name: the running line without the clock, which would change its name every second. */
    runningSpoken: (s: string) => `Sharpening toward ${s}`,
  },
} as const;
