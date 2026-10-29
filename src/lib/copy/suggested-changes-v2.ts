// Suggested changes v2 (plan 2026-10-27, UI PRs 5a and 5b): the tile and the intake. ONE exported object so it can go to
// /copy-review as a block. PLACEHOLDERS owed to /copy-review, carried verbatim from the handoff's copy file
// (design/design_handoff_the99_suggested_changes_v2, `suggested-changes-v2 · copy strings.ts`, the `tile` and `intake`
// blocks; approved 2026-10-28). PR 6 adds the `wait`, `results`, `bar`, `confirm`, `undone` and `applyFailed`
// blocks verbatim; the history and about blocks arrive with PR 7.
// US English, no em dashes, and never the words AI, model or LLM.
//
// Reuses, never restates: creditsCopy (the credit line), deckDescriptionCopy.limits (the Kept for this deck box),
// tuningHubCopy (the tile's name and cost), BRACKET_NAMES (the bracket names), strategyName (the focus).
// Strings the boards draw that the handoff's copy file lacks are marked `PLACEHOLDER for /copy-review`.

export const suggestedChangesV2Copy = {
  tile: {
    purpose: "Say what you want changed. You get more cards to add and to cut than you need, and pick.",
    under: (total: number) => `Swaps cards in and out of a deck at 99. This one is at ${total}: top it off first.`,
    over: (n: number) => `Swaps cards in and out of a deck at 99. This one is ${n} over: cut it to 99 first.`,
    topOff: "Top off on Your deck →",
    proposedCuts: "Proposed cuts →",
  },
  intake: {
    lead: "Say how many cards to change and what you’re after. You get more of each than you asked for, and you pick.",
    count: {
      title: "How many cards?",
      sub: "cards in · the same number come out",
      line: (n: number, pool: number) => `${n} in, ${n} out. You’ll pick from about ${pool} of each.`,
      range: "1 to 20",
      atMax: "20 at most",
      // PLACEHOLDER for /copy-review: the stepper's accessible names (the board draws only − and +).
      fewer: "Fewer cards",
      more: "More cards",
      countLabel: "Cards to change",
    },
    request: {
      title: "What are you looking to change?",
      placeholder: "In your own words, or leave it empty.",
      tagHelp: "tag a card",
    },
    noticed: {
      head: "What we noticed",
      help: "Tap one to add its words to your request. Change them as you like.",
      kinds: { role: "role", focus: "focus", game: "game" },
      // The sentence a tap appends.
      roleShort: (role: string, have: number, target: number) => `More ${role}: the deck runs ${have} of a target ${target}.`,
      focus: (focus: string) => `Lean into ${focus}, the deck’s focus.`,
      // PLACEHOLDER for /copy-review: the chips' own faces, as the Intake board draws them. The worst role gap, then the
      // second one; the focus; the newest dated game note, quoted, with its date as the chip's figure.
      roleShortChip: (role: string) => `Short on ${role}`,
      roleOf: (have: number, target: number) => `${have} of ${target}`,
      roleIsChip: (role: string, have: number, target: number) => `${role} is ${have} of ${target}`,
      focusChip: (focus: string) => `Lean into ${focus}`,
      focusMeta: "the focus",
      gameChip: (note: string) => `“${note}”`,
      // PLACEHOLDER for /copy-review: the sentence a game note's chip appends (the board draws the chip, not its words).
      gameSentence: (note: string, date: string) => `In my ${date} game: “${note}”.`,
    },
    bracket: {
      head: "Bracket",
      now: (b: number, name: string) => `now ${b} · ${name}`,
      keep: (b: number, name: string) => `Keep at ${b} · ${name}`,
      down: (b: number, name: string) => `Down to ${b} · ${name}`,
      up: (b: number, name: string) => `Up to ${b} · ${name}`,
      noteKeep: (b: number, name: string) => `Nothing it suggests moves the deck out of ${b} · ${name}. A card that would is left out.`,
      noteDown: (b: number, name: string) => `Cuts lead with what holds the deck above ${b} · ${name}. Additions stay inside it.`,
      noteUp: (b: number, name: string) => `Additions lean toward what takes the deck to ${b} · ${name}, and each one that does says so.`,
      // PLACEHOLDER for /copy-review: a deck read as a range ("Exhibition or Core"). The board draws a single bracket only.
      nowRange: (low: number, high: number, face: string) => `now ${low} or ${high} · ${face}`,
      keepRange: (low: number, high: number, face: string) => `Keep at ${low} or ${high} · ${face}`,
      noteKeepRange: (low: number, high: number, face: string) => `Nothing it suggests moves the deck out of ${low} or ${high} · ${face}. A card that would is left out.`,
    },
    restrictions: { title: "Any restrictions?", sub: "kept for this deck, so the next run starts with them" },
    send: "Suggest changes",
    usual: { 3: "usually under 20 seconds", 10: "usually about 40 seconds", 20: "usually about a minute, now and then two" },
    reads: "Your words lead. The run also reads",
    reads2: ", in that order.",
    // PLACEHOLDER for /copy-review: the footer's first part (the deck's overview, when it has one; the other parts reuse
    // deckTuningCopy.manifest and deckDescriptionCopy.manifest) and its link to History (Intake board A).
    readsOverview: "the overview",
    lastRun: (date: string) => `Last run ${date} · History ›`,
    same: {
      body: (date: string) => `Same request as your ${date} run, on the same list. A new run uses a credit and will likely name many of the same cards.`,
      again: "Run it again",
      open: (date: string) => `Open ${date}’s run`,
    },
    drift: (total: number) => `The deck is at ${total} now. Suggested changes keeps a deck at 99, so it waits until you’re back there.`,
  },
  wait: {
    soFar: (a: number, c: number) => `${a} to add and ${c} to cut so far`,
    done: (a: number, c: number) => `${a} to add and ${c} to cut · done`,
    leave: "Pick while it works. Leave whenever you like: the run keeps going, its tile shows it, and it lands in History.",
    stillFinding: "Still finding more",
    soFarAsked: (n: number, asked: number) => `${n} so far · asked for ${asked}`,
    // An all-in side's end line (Wait D, E: "asked for 15").
    askedFor: (asked: number) => `asked for ${asked}`,
    cutsNext: "Cuts start once the first additions are in.",
    allIn: (n: number) => `All ${n} in`,
    groupedNow: " · grouped by type now",
    newMark: "new",
    applyWaits: "Apply opens when both lists are in. Your picks are kept.",
    stillFindingTally: "still finding more",
    // About 45 seconds.
    slow: "This is taking a while. Some cards didn’t pass the checks, so it’s looking further. Keep picking, or leave: it keeps going and lands in History.",
    // About 2 minutes.
    slower: "Still going, about 2 minutes in. Runs this size can take up to about two and a half. It won’t stop early, and your picks are kept.",
    finishedShort: (a: number, c: number, side: string, short: number, asked: number, reason: string) =>
      `Found ${a} to add and ${c} to cut. ${side} came up ${short} short of ${asked}: ${reason}.`,
  },
  results: {
    lead: (a: number, c: number, n: number) => `${a} to add and ${c} to cut. Pick any ${n} of each. Nothing moves until you apply.`,
    aimed: (b: number, name: string) => `aimed at ${b} · ${name}`,
    youAsked: "You asked",
    noRequest: "No request. The run worked from the deck’s own gaps.",
    additions: "Additions",
    cuts: "Cuts",
    chosen: (k: number, n: number) => `${k} of ${n} chosen`,
    applied: (k: number) => `${k} applied`,
    pick: "Pick",
    picked: "✓ Picked",
    added: "Added",
    cut: "Cut",
    notPicked: "Not picked",
    group: "Group",
    typeHead: (inDeck: number) => `${inDeck} in the deck`,
    roleHead: (have: number, target: number) => `you have ${have} of ${target}`,
    withPicks: (n: number) => `${n} with your picks`,
    flagAsked: "the bracket you asked for",
    shortCap: (found: number, cap: string) => `Found ${found} additions under your ${cap} cap`,
  },
  bar: {
    none: (n: number) => `Pick up to ${n} of each. The two counts must match, so the deck stays at 99.`,
    unequal: (a: number, c: number, more: number, side: string) => `${a} in, ${c} out. Pick ${more} more ${side} to apply, so the deck stays at 99.`,
    wouldGo: (total: number) => `the deck would go to ${total}`,
    stays: "stays at 99",
    equal: "Nothing moves until you apply.",
    bracketStays: (b: number, name: string) => `bracket stays ${b} · ${name}`,
    bracketReached: (from: number, to: number, name: string) => `bracket ${from} → ${to} · ${name}, as asked`,
    bracketMissed: (b: number, name: string, from: number) =>
      `You asked for ${b} · ${name}. None of your picks moves it: pick a flagged addition to get there, or apply these and stay at ${from}.`,
    apply: (changes: number) => `Apply ${changes} changes`,
    applied: "back at 99",
    appliedLine: "Applied as one change. The rest stay here: pick another equal set to take more.",
    undo: (changes: number) => `Undo all ${changes}`,
  },
  confirm: {
    eyebrow: "Suggested changes",
    title: (n: number) => `Apply ${n} in, ${n} out`,
    lead: (bracket: string) => `The deck stays at 99. ${bracket}`,
    comingIn: (n: number) => `Coming in · ${n}`,
    goingOut: (n: number) => `Going out · ${n}`,
    apply: (changes: number) => `Apply ${changes} changes`,
  },
  undone: (changes: number) => `Undone. All ${changes} are back as they were, and your picks are still here: apply them again or change them.`,
  applyFailed: { title: "Couldn’t apply. Nothing changed, and your picks are kept.", detail: "Try Apply again in a moment." },
  // PR 6: strings the Wait, Results, Short-Run and Apply boards draw (or a state needs) that the handoff's copy file
  // lacks. Each names the board it is read off. Passed /copy-review 2026-10-28.
  run: {
    // The results head's `New run` (Results boards): a fresh intake, the request box empty as always.
    newRun: "New run",
    // You asked's quieter line (Results boards: "3 in, 3 out · keep 2 · Core · no cap · any set · any card").
    askedCount: (n: number) => `${n} in, ${n} out`,
    askedKeep: (b: number, name: string) => `keep ${b} · ${name}`,
    // Keep on a deck read as a range, as the intake offered it ("Keep at 1 or 2 · Exhibition or Core").
    askedKeepRange: (low: number, high: number, face: string) => `keep ${low} or ${high} · ${face}`,
    askedCap: (dollars: string) => `most ${dollars} a card`,
    askedNoCap: "no cap",
    askedSets: (sets: string) => `from ${sets}`,
    askedAnySet: "any set",
    askedOwned: "cards you own",
    askedAnyCard: "any card",
    // The phone halves' accessible name (the board draws only the two segments).
    halves: "Additions or cuts",
    // A side's count chip once its picks are in (Results-3 D: "3 applied"); the halves carry `n of N`.
    ofN: (k: number, n: number) => `${k} of ${n}`,
    // The wait's phone segment for a side not started yet (Wait A: "Cuts next").
    next: "next",
    // A side's head while it is arriving (Wait A: "Additions 4 so far").
    soFar: (n: number) => `${n} so far`,
    // Apply while it is off (Results-3 A, B and the wait: the board draws the bare word).
    applyOff: "Apply",
    // The bar with nothing picked (Results-3 A: the quiet count alone).
    nonePicked: "0 in · 0 out",
    // The lead once a set is applied (Results-3 D).
    appliedLead: (n: number, rest: number) => `Applied ${n} in, ${n} out. The deck is back at 99. The other ${rest} stay here.`,
    // The lead when a list came back under N (Short-Run: "14 to add and 21 to cut. Pick up to 14 of each.").
    shortLead: (a: number, c: number, n: number) => `${a} to add and ${c} to cut. Pick up to ${n} of each.`,
    // A pick refused (the line was taken, or the run retired): the row rolls back and says so.
    pickRefused: "Couldn’t save that pick. Try again.",
  },
  // The short-run head (Short-Run A/B, Wait E). `found` is the shorter list's count. Passed /copy-review 2026-10-28.
  short: {
    // Short-Run A, the cap (charged): `results.shortCap` is the head.
    capBody: (asked: number, dropped: number, cap: string, n: number) =>
      `You asked for ${asked}. The run named ${dropped} more that cost over ${cap} a card, so you can apply up to ${n} of each.`,
    capCredit: "1 credit used: your cap set the count",
    capLink: "Raise the cap in a new run ›",
    // The other restrictions that can bind a list (spec §5.5), charged as the cap is.
    setHead: (found: number, side: string) => `Found ${found} ${side} in the sets you chose.`,
    ownedHead: (found: number, side: string) => `Found ${found} ${side} you own.`,
    aimHead: (found: number, side: string) => `Found ${found} ${side} that fit the bracket you chose.`,
    bodyBound: (asked: number, n: number) => `You asked for ${asked}. Your limits held the run short, so you can apply up to ${n} of each.`,
    boundCredit: "1 credit used: your limits set the count",
    boundLink: "Change them in a new run ›",
    // Short-Run B, no restriction explains it (refunded).
    refundHead: (found: number, side: string) => `Found ${found} ${side}.`,
    refundBody: (asked: number) => `You asked for ${asked}. Nothing you set explains the gap: the run fell short on its own, so the credit is back.`,
    refundCredit: "Credit returned",
    // Short-Run B with the allowance's standing: "Credit returned · 5 of 5 left".
    refundCreditLeft: (left: number, total: number) => `Credit returned · ${left} of ${total} left`,
    additions: "additions",
    cuts: "cuts",
    // Wait E's reason, after "Cuts came up 3 short of 15: ".
    reasons: {
      overCap: "the rest cost over your cap",
      offSet: "the rest are outside the sets you chose",
      notOwned: "the rest are cards you don’t own",
      bracketAim: "the rest don’t fit the bracket you chose",
      none: "too few passed the checks",
    },
    sideAdditions: "Additions",
    sideCuts: "Cuts",
    // Plan P4: the cut call failed, so the run ended with its additions and no cuts, refunded.
    noCuts: "The cuts didn’t come through this time, so nothing here can be applied and the credit is back. Your additions stay here to read.",
  },
  // Down's missed aim (the handoff words only Up's: "pick a flagged addition").
  barMissedDown: (b: number, name: string, from: number) =>
    `You asked for ${b} · ${name}. None of your picks moves it: pick a cut that lowers it to get there, or apply these and stay at ${from}.`,
  // The bar's sides, as `bar.unequal` names them ("Pick 1 more cut").
  barSide: { add: (n: number) => (n === 1 ? "addition" : "additions"), cut: (n: number) => (n === 1 ? "cut" : "cuts") },
  // The confirmation's close and its press while it applies.
  confirmClose: "Close",
  applying: "Applying…",
  undoing: "Undoing…",
  // A v10 run once the switch is on (spec §10, the cutover): read-only.
  pastRun: "From before Suggested changes asked how many, so it’s here to read. Start a new run to pick changes.",
} as const;
