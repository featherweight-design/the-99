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
    guided: {
      name: "Guided build",
      cost: "2 credits",
      line: "You pick a strategy, a bracket and which cards it can use. We fill the 99 and sharpen 12 to 18 cards toward the strategy.",
      back: "Both credits come back if it doesn’t come through or finds fewer than 12.",
      /** No strategy has enough cards behind it for this commander: the row is drawn, off, with its reason. */
      none: "Your cards don’t back a strategy for this commander yet.",
      /** Under the row when only more credits can fund it, in --warning. */
      shortMore: (have: number) => `A guided build uses 2 credits, and you have ${have}.`,
      shortOff: (have: number) => `A guided build uses 2 credits, and you have ${have}. Free credits alone can’t run one.`,
    },
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
  press: { free: "Create deck →", guided: "Next · Strategy", empty: "Create deck →" },
  /** The picks sheet (G1 to G5): Upgrade’s chrome, then Strategy, Bracket and Cards. */
  sheet: {
    title: (deck: string) => `Build ${deck}`,
    close: "Close",
    steps: { label: "Your picks", strategy: "Strategy", bracket: "Bracket", cards: "Cards" },
    choosing: " (choosing)",
    source: "from your answers",
    strategy: {
      q: "Where should it go?",
      sub: (c: string) => `Worked out for ${c} from the cards you own.`,
      count: (n: number) => `${n} ${n === 1 ? "card" : "cards"} back it`,
      more: (n: number) => `and ${n} more`,
    },
    bracket: {
      q: "How strong should it play?",
      sub: "Pick the table you’ll bring it to.",
      blurbs: {
        2: "Smooth and focused, with no Game Changers and no fast combos.",
        3: "Stronger cards, and up to three Game Changers. Combos only late in the game.",
        4: "The strongest cards that fit, with no Game Changer limit and fast combos allowed.",
      },
    },
    cards: {
      q: "Which cards can it use?",
      sub: "The fill and the sharpening both follow this.",
      own: { name: "Only cards I own", line: "Takes only cards with a copy free, and finishes with basics." },
      buy: { name: "Buy some cards", line: "Adds cards you don’t own, each under $12. They land in Shopping." },
      budget: { name: "Buy within a budget", line: "Adds cards you don’t own, up to the total you set. They land in Shopping." },
      budgetLabel: "Budget in dollars",
      budgetError: "Enter a whole-dollar budget from $1 to $5,000.",
      keeps: "It keeps",
      around: (card: string) => `${card}, the card you built around`,
      picks: (n: number) => `${n} ${n === 1 ? "pick" : "picks"} from the commander page`,
      keepsLine: "The sharpening never cuts these.",
    },
    next: { bracket: "Next · Bracket", cards: "Next · Cards" },
    back: "Back",
    confirm: { press: (s: string) => `Build toward ${s}`, line: "Uses 2 credits, held until the run is done." },
  },
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
    /** The deck was created but its guided run did not start (the start refused after the sheet's own check passed): said on the deck's page, never silent. */
    refused: "The guided build didn’t start. The deck has the free build.",
    /** Home's resume row has room for the clock alone. */
    runningStamp: (clock: string) => `Sharpening · ${clock}`,
    /** A tile's accessible name: the running line without the clock, which would change its name every second. */
    runningSpoken: (s: string) => `Sharpening toward ${s}`,
  },
} as const;
