// Upgrade this precon (design_handoff_the99_precon_upgrade, R2d). DRAFT throughout: /copy-review resolves the wording. Reuses rather than restates: creditsCopy (standing, spent, getMore),
// suggestedChangesV2Copy.bar, preconsCopy.start (S1), BRACKET_NAMES.

/**
 * Upgrade precon on the deck page (addendum A2c, the handoff's `copy strings.ts`). Copy-reviewed 2026-11-11. The band's body
 * reuses `preconsCopy.arrival.bodyShort`/`bodyAll`, and the flow reuses everything below except these lines.
 */
export const preconUpgradeDeckCopy = {
  entry: "Upgrade precon",
  band: {
    started: (precon: string) => `Started from the ${precon} precon`,
    linked: (precon: string) => `Linked to the ${precon} precon`,
    /** The phone's one-row head; a long name ellipsizes. */
    phone: (precon: string) => `From the ${precon} precon`,
  },
  /** The intro's last line, in place of `intro.lines[4]`: the deck exists, so the swaps land on it. `next` is the version its commit makes. */
  introVersions: (next: number) => ({ head: "Nothing changes until you apply the swaps.", body: `They land as changes since v0, and you commit them as v${next}.` }),
  apply: (swapCount: number) => `Apply these ${swapCount} swaps`,
  applying: "Applying…",
  applied: (swapCount: number, leads: string | null) => (leads ? `Applied ${swapCount} swaps. ${leads} leads.` : `Applied ${swapCount} swaps.`),
  undo: "Undo",
  applyFailed: "Those swaps didn’t apply. Your deck hasn’t changed.",
  undoFailed: "We couldn’t undo those swaps. The deck is unchanged.",
  /** `results.listChanged`, said of this deck. */
  listChanged: "The precon’s list changed after this upgrade, so its swaps can’t apply to this deck.",
  /** A cut is a card the player locked (lock D4): the whole Apply refuses. */
  locked: "One of these cuts is locked in this deck. Unlock it to apply the swaps.",
  /** The picks sent are no longer this run's to apply (the "picks" refusal): the page is not refreshed; the player opens it again. */
  picksStale: "Your picks no longer match this upgrade. Open it again to pick.",
} as const;

export const preconUpgradeCopy = {
  entry: {
    press: "Upgrade this precon",
    running: (strategyName: string, clock: string) => `Upgrading toward ${strategyName} · ${clock}`,
  },
  flow: {
    title: (precon: string) => `Upgrade ${precon}`,
    resultTitle: "Your upgrade",
    steps: { commander: "Commander", bracket: "Bracket", strategy: "Strategy" },
    stepsLabel: "Upgrade steps",
    choosing: "choosing",
    next: (step: string) => `Next · ${step}`,
    back: "Back",
    /** The title row's bare ✕, on every step (addendum A3). */
    close: "Close",
    scrolls: "scrolls",
  },
  intro: {
    lead: "Turn this precon into a stronger deck, in a direction you choose.",
    lines: [
      { icon: "swap", head: "We swap 12 to 18 cards", body: "toward the strategy you pick." },
      { icon: "price", head: "No card we add costs over $12.", body: "Cuts come from the deck’s other themes, so the plan you pick gets stronger." },
      { icon: "picks", head: "You choose who leads, the bracket and the strategy,", body: "in that order: each one changes what fits the next." },
      { icon: "credit", head: "2 credits a run.", body: "If it doesn’t come through, or finds fewer than 12, both come back." },
      { icon: "versions", head: "Nothing changes until you start a deck from it.", body: "That makes a new draft; the box stays its v0." },
    ],
    standing: (balanceText: string) => `${balanceText} · this run uses 2`,
    // Under `2 credits a run.` when only more credits can fund a run (addendum credits, call 1), in --warning. `standing`
    // steps aside then, so the shortfall is said once on the intro.
    shortMore: "A free credit covers 1, so you’ll need more credits to run one.",
    shortOff: "A free credit covers 1, so an upgrade can’t run on free credits alone.",
  },
  commander: {
    q: "Who leads the deck?",
    sub: "Both come in the box. Each one leads toward different strategies, so this comes first.",
    manaValue: (manaValue: number) => `mana value ${manaValue}`,
    backing: (cardCount: number) => `${cardCount} of its cards back it`,
    directions: (list: string) => `directions: ${list}`,
    boxOwn: "the box’s commander",
    alternateSource: "a foil in the box · in its 99",
    none: "Choose who leads.",
  },
  bracket: {
    q: "How strong should it play?",
    sub: (bracket: number) => `The box plays at bracket ${bracket}. Stay there and tighten it, or move up.`,
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
    sub: (commanderName: string, bracket: number) => `Worked out for ${commanderName} at bracket ${bracket}, from the deck’s own cards.`,
    count: (cardCount: number) => `${cardCount} of its cards`,
    more: (moreCount: number) => `and ${moreCount} more`,
    none: "Choose a strategy.",
    press: (strategyName: string) => `Upgrade toward ${strategyName}`,
    // One line at any credit standing (Hugh, 2026-11-12: it wrapped at 100 credits). The swap range is the intro's and the
    // bracket the tracker's, so this says only what the press costs and what is left (copy-review: TIGHTEN, rule 7).
    line: (balanceText: string) => `uses 2 · ${balanceText}`,
    freeOnly: "An upgrade uses 2 credits, and a free credit covers 1.",
  },
  same: {
    body: (strategyName: string, commanderName: string, bracket: number, date: string) =>
      `You ran ${strategyName} with ${commanderName} at bracket ${bracket} on ${date}, on this same list. Another run uses 2 credits and will likely name many of the same swaps.`,
    run: "Run it again",
    open: (date: string) => `Open ${date}’s`,
  },
  wait: {
    finding: (strategyName: string) => `Finding swaps toward ${strategyName}`,
    usual: "usually about 6 seconds",
    leave: "Leave whenever you like: the upgrade keeps going and shows here when it’s done.",
    held: "Running · 2 credits held",
    picksLed: "Led by",
    picksBracket: "bracket",
  },
  failed: { line: "That upgrade didn’t come through. Both credits are back.", retry: "Try again", retryLine: "2 credits · same picks" },
  results: {
    title: (swapCount: number, strategyName: string) => `${swapCount} swaps toward ${strategyName}`,
    led: (commanderName: string) => `led by ${commanderName}`,
    asChosen: "as chosen", // appended to suggestedChangesV2Copy.bar's bracket line
    buy: (cardCount: number, totalPrice: string) => `${cardCount} to buy · ${totalPrice}`,
    cap: "each under $12",
    owned: (cardCount: number) => `${cardCount} you own`,
    commanderGroup: "Commander",
    commanderAside: "your pick · not one of the swaps",
    toThe99: "to the 99",
    leads: "leads",
    commanderWhy: (newCommanderName: string, boxCommanderName: string) => `${boxCommanderName} takes ${newCommanderName}’s place in the 99.`,
    facts: { ledBy: "Led by", bracket: "Bracket", toBuy: "To buy", yours: "Already yours" },
    listChanged: "The precon’s list changed after this upgrade, so it can’t start a deck.",
    cutsFrom: (theme: string) => `Cuts from ${theme}`,
    cutsFromRest: "Cuts from the rest of the deck", // not in the handoff: a cut no strategy claims has no theme to name (extrapolated, orchestrator-approved)
    start: (swapCount: number) => `Start the deck with these ${swapCount} swaps`,
    another: "Try another strategy",
    anotherCost: "2 credits", // drawn inside the Try another strategy button
    short: (bracket: number, swapCount: number) => `Fewer than 12 fit at bracket ${bracket}, so both credits are back. You can still start with these ${swapCount}.`,
  },
  start: {
    with: (commanderName: string, swapCount: number, strategyName: string) => `Led by ${commanderName}, with the ${swapCount} ${swapCount === 1 ? "swap" : "swaps"} toward ${strategyName}. The precon as it came stays your deck’s v0, so you can always see what changed.`,
    /** The commander row's second line when the alternate leads: its colors, then where the box's own commander went. */
    commanderSub: (ident: string, boxCommanderName: string) => `${ident} · ${boxCommanderName} in the 99`,
    /** The Bracket fact: the box's reading to the run's, in the player's own words (`as chosen`). The same bracket reads once. */
    bracketFact: (before: number | null, after: number, name: string) => `${before !== null && before !== after ? `${before} → ${after}` : after} · ${name}, as chosen`,
    /** A refusal: the run no longer fits the precon (its list moved, the run is gone, or the switch is off). */
    unavailable: "This upgrade no longer fits the precon’s list. Run a new one to start from it.",
    commanderFact: (commanderName: string, boxCommanderName: string) => `${commanderName} · ${boxCommanderName} moves into the 99`,
    facts: { commander: "Commander", bracket: "Bracket" },
    cardsValue: (swapCount: number) => `all 100 · ${swapCount} swapped`,
    printingsValue: (addedCount: number) => `this precon’s copies; yours for the ${addedCount} added`,
  },
  history: {
    link: "History",
    title: "History",
    sub: "your past upgrades of this precon · newest first",
    row: (strategyName: string, commanderName: string, bracketNumber: number | null) => `${strategyName} · led by ${commanderName}${bracketNumber === null ? "" : ` · bracket ${bracketNumber}`}`,
    swaps: (swapCount: number) => `${swapCount} swaps`,
    short: (swapCount: number) => `${swapCount} swaps · credits back`,
    foot: "Kept on your account. Opening an upgrade uses no credit.",
    empty: { head: "No upgrades yet", body: "Each upgrade you run on this precon is kept here." },
    back: "‹ History",
    backLink: "‹ Back",
    newUpgrade: "New upgrade",
    cost: (balanceText: string) => `2 credits a run · ${balanceText}`,
    /** The start screen's kicker over the newest kept run, in the month heads' style (addendum fresh start, call 2). */
    kicker: "Your last upgrade",
    /** The row's second line, after the swaps: where the run went (call 4). */
    inDeck: (deck: string) => `in ${deck}`,
    notYet: "no deck yet",
    /** The dashed note over a run already in a deck, opened from the start screen or History (call 5). */
    usedNote: (deck: string) => `Already in ${deck}. Opening it again uses no credit.`,
  },
  ownNote: (addedCount: number) => (addedCount === 0 ? "Only what came in the box." : `Only what came in the box. The ${addedCount} ${addedCount === 1 ? "card to buy isn’t" : "cards to buy aren’t"} added.`),
  arrival: { body: (swapCount: number, strategyName: string) => `Started with ${swapCount} swaps toward ${strategyName}. Versions shows the box as v0.` },
} as const;
