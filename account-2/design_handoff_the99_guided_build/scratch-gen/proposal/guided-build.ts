// Guided build (design_handoff_the99_guided_build, R1, 2026-11-20). DRAFT throughout: /copy-review resolves the wording.
// Reuses rather than restates: preconUpgradeCopy (tracker, wait, failed, press shapes), creditsCopy (lot, getMore), BRACKET_NAMES,
// helpMeChooseCopy.handOff (the answers block).

export const guidedBuildCopy = {
  /** The commander page's one action (call 4): it starts a deck and promises nothing about how it is built. */
  commander: {
    press: "Start a deck →",
    /** Replaces synergyCopy.select.promise under the button when picks are made: it says where the picks go, not how the rest is built. */
    picks: (n: number) => `Your ${n} go into the new deck.`,
  },
  choice: {
    label: "How we build it",
    free: { name: "Free build", cost: "free", line: "We fill the 99 from your cards, as far as your collection reaches." },
    guided: {
      name: "Guided build",
      cost: "2 credits",
      line: "You pick a strategy, a bracket and which cards it can use. We fill the 99, sharpen 12 to 18 cards toward the strategy and write the deck’s plan.",
      back: "Both credits come back if it doesn’t come through or finds fewer than 12.",
    },
    empty: { name: "Just the commander", cost: "free", line: (c: string) => `${c} and 99 empty slots. Build it your way.` },
    /** With picks carried from the commander page (?select=): each row says what it does with them. */
    withPicks: {
      free: (n: number) => `We fill the rest of the 99 around your ${n} picks, as far as your collection reaches.`,
      empty: (c: string, n: number) => `${c}, your ${n} picks and ${99 - n} empty slots. Build it your way.`,
    },
    picks: { label: (n: number) => `Your picks · ${n}`, change: (c: string) => `Change on ${c}’s page`, kept: "Every option keeps them.", buy: "not owned" },
    /** Under the guided row when only more credits can fund it (the Upgrade credits path, call 1), in --warning. */
    shortMore: (have: number) => `A guided build uses 2 credits, and you have ${have}.`,
    shortOff: (have: number) => `A guided build uses 2 credits, and you have ${have}. Free credits alone can’t run one.`,
  },
  press: { free: "Create deck →", guided: "Next · Strategy", empty: "Create deck →" },
  flow: {
    title: (deck: string) => `Build ${deck}`,
    steps: { strategy: "Strategy", bracket: "Bracket", cards: "Cards" },
  },
  source: "from your answers",
  strategy: {
    q: "Where should it go?",
    sub: (c: string) => `Worked out for ${c} from the cards you own.`,
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
    budget: (b: number) => ({ name: `Buy within $${b}`, line: `Adds cards you don’t own, $${b} in all. They land in Shopping.` }),
    keeps: "It keeps",
    around: (card: string) => `${card}, the card you built around`,
    picks: (n: number) => `${n} picks from the commander page`,
    keepsLine: "The sharpening never cuts these.",
  },
  confirm: { press: (s: string) => `Build toward ${s}`, line: (lot: string) => `uses 2 · ${lot}` },
  wait: {
    building: (s: string) => `Sharpening toward ${s}`,
    usual: "usually about 8 seconds",
    leave: "Leave whenever you like: the deck is already in Decks with the free build, and the guided picks land in it when they’re done.",
    held: "Running · 2 credits held",
    filled: (n: number) => `Filled · ${n} of 99 from your cards`,
  },
  failed: {
    line: "The guided build didn’t come through. Both credits are back.",
    kept: (deck: string) => `${deck} keeps the free build, so nothing is lost.`,
    retry: "Try again",
    retryLine: "2 credits · same picks",
    open: "Open the deck",
  },
  result: {
    title: (deck: string) => `${deck} is ready`,
    facts: { strategy: "Strategy", bracket: "Bracket", sharpened: "Sharpened", toBuy: "To buy" },
    plan: "The plan",
    planNote: "It’s the deck’s Overview, so it’s there whenever you open the deck.",
    short: (n: number, b: number) => `Only ${n} cards could be sharpened at bracket ${b}, so both credits are back. The ${n} are in the deck.`,
    open: (deck: string) => `Open ${deck}`,
    stages: ["Early", "Mid", "Close"],
  },
  /** On the deck's tile and its page while the run is still going (the deck exists from the confirm). */
  running: (s: string, clock: string) => `Sharpening toward ${s} · ${clock}`,
} as const;
