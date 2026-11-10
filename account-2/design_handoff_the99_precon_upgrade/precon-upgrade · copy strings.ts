// Upgrade this precon (design_handoff_the99_precon_upgrade, R2c). Proposed src/lib/copy/precon-upgrade.ts.
// DRAFT throughout: /copy-review resolves the wording. Reuses rather than restates: creditsCopy (standing, spent, getMore),
// suggestedChangesV2Copy.bar, preconsCopy.start (S1), BRACKET_NAMES.

export const preconUpgradeCopy = {
  entry: {
    press: "Upgrade this precon",
    running: (s: string, clock: string) => `Upgrading toward ${s} · ${clock}`,
  },
  flow: {
    title: (precon: string) => `Upgrade ${precon}`,
    resultTitle: "Your upgrade",
    steps: { commander: "Commander", bracket: "Bracket", strategy: "Strategy" },
    choosing: "choosing",
    next: (step: string) => `Next · ${step}`,
    back: "Back",
    notNow: "Not now",
  },
  intro: {
    lead: "Turn this precon into a stronger deck in a direction you choose. Here’s what to expect.",
    lines: [
      { figure: "12–18", head: "We swap 12 to 18 cards.", body: "Each card out makes room for one card in, so the deck stays 100." },
      { figure: "$12", head: "No card we add costs over $12.", body: "Cuts come from the deck’s other themes, so the plan you pick gets stronger." },
      { figure: "3 picks", head: "You choose who leads, the bracket and the strategy,", body: "in that order: each one changes what fits the next." },
      { figure: "2", head: "2 credits a run.", body: "If it doesn’t come through, or finds fewer than 12, both come back." },
      { figure: "v0", head: "Nothing changes until you start a deck from it.", body: "That makes a new draft; the box stays its v0." },
    ],
    standing: (lot: string) => `You have ${lot} · this run would use 2`,
  },
  commander: {
    q: "Who leads the deck?",
    sub: "Both come in the box. Each one leads toward different strategies, so this comes first.",
    manaValue: (n: number) => `mana value ${n}`,
    backing: (n: number) => `${n} of its cards back it`,
    directions: (list: string) => `directions: ${list}`,
    boxOwn: "the box’s commander",
    alternateSource: "a foil in the box · in its 99",
    none: "Choose who leads.",
  },
  bracket: {
    q: "How strong should it play?",
    sub: (n: number) => `The box plays at bracket ${n}. Stay there and just tighten it, or move up.`,
    boxOwn: "where the box plays",
    blurbs: {
      2: "Stay where the box plays. The swaps make it smoother and more focused, with no Game Changers and no fast combos.",
      3: "Stronger cards, and up to three Game Changers. The step most tables mean by an upgraded precon.",
      4: "The strongest cards that fit under $12, with no Game Changer limit. For tables that play to win fast.",
    },
    none: "Choose a bracket.",
  },
  strategy: {
    q: "Where should it go?",
    sub: (c: string, b: number) => `Worked out for ${c} at bracket ${b}, from the deck’s own cards.`,
    count: (n: number) => `${n} of its cards`,
    more: (n: number) => `and ${n} more · press a card for its details`,
    overviewSource: "the Overview’s read",
    none: "Choose a strategy.",
    press: (s: string) => `Upgrade toward ${s}`,
    line: (b: number, lot: string) => `12 to 18 swaps · bracket ${b} · uses 2 credits · ${lot}`,
    freeOnly: "An upgrade uses 2 credits, and a free credit covers 1.",
  },
  same: {
    body: (s: string, c: string, b: number, date: string) =>
      `You ran ${s} with ${c} at bracket ${b} on ${date}, on this same list. Another run uses 2 credits and will likely name many of the same swaps.`,
    run: "Run it again",
    open: (date: string) => `Open ${date}’s`,
  },
  wait: {
    finding: (s: string) => `Finding swaps toward ${s}`,
    usual: "usually about 6 seconds",
    leave: "Leave whenever you like: the upgrade keeps going and shows here when it’s done.",
    held: "Running · 2 credits held",
  },
  failed: { line: "That upgrade didn’t come through. Both credits are back.", retry: "Try again", retryLine: "2 credits · same picks" },
  results: {
    title: (n: number, s: string) => `${n} swaps toward ${s}`,
    led: (c: string) => `led by ${c}`,
    asChosen: "as chosen", // appended to suggestedChangesV2Copy.bar's bracket line
    buy: (n: number, total: string) => `${n} to buy · ${total}`,
    cap: "each under $12",
    owned: (n: number) => `${n} you own`,
    youOwnIt: "you own it",
    commanderGroup: "Commander",
    commanderAside: "your pick · not one of the swaps",
    toThe99: "to the 99",
    leads: "leads",
    commanderWhy: (alt: string, box: string) => `${alt} leaves the 99 to lead, and ${box} takes its slot, so the deck stays 100.`,
    cutsFrom: (theme: string) => `Cuts from ${theme}`,
    start: (n: number) => `Start the deck with these ${n} swaps`,
    another: "Try another strategy",
    keptLine: "Closing keeps it: the press opens on it next time",
    short: (b: number, n: number) => `Fewer than 12 fit this deck at bracket ${b}, so both credits are back. These ${n} are still yours to start with.`,
  },
  start: {
    with: (c: string, n: number, s: string) => `Led by ${c}, with the ${n} swaps toward ${s}. The precon as it came stays your deck’s v0, so you can always see what changed.`,
    commanderFact: (c: string, box: string) => `${c} · ${box} moves into the 99`,
    overviewFact: "written for this list as it starts", // proposed, G13
    cardsValue: (n: number) => `all 100 · ${n} swapped`,
    printingsValue: (n: number) => `this precon’s copies; yours for the ${n} added`,
  },
  arrival: { body: (n: number, s: string) => `Started with ${n} swaps toward ${s}. Versions shows the box as v0.` },
} as const;
