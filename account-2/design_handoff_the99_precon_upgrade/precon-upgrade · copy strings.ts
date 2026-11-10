// Upgrade this precon (design_handoff_the99_precon_upgrade, R1). Proposed src/lib/copy/precon-upgrade.ts.
// DRAFT throughout: /copy-review resolves wording. Reuses, never restates: creditsCopy (standing, spent, getMore),
// suggestedChangesV2Copy.bar.bracketReached / bracketStays (the bracket line), preconsCopy.start (S1), BRACKET_NAMES.

export const preconUpgradeCopy = {
  label: "Upgrade this precon",
  aside: "pick a direction · 2 credits a run",
  lead: "Pick where to take this deck. We swap 12 to 18 of its cards toward that strategy, and no card we add costs over $12.",
  card: {
    count: (n: number) => `${n} of its cards`,
    more: (n: number) => `and ${n} more · press a card for its details`,
    overviewSource: "the Overview’s read",
    selectA11y: (s: string) => `Select ${s}`,
    unselectA11y: (s: string) => `Unselect ${s}`,
  },
  empty: {
    title: "No direction to upgrade toward yet",
    body: "This precon’s cards don’t lean far enough into one strategy for an upgrade to aim at.",
  },
  press: {
    none: "Upgrade",
    noneLine: "Select a direction to upgrade toward.",
    go: (s: string) => `Upgrade toward ${s}`,
    // `lot` is creditsCopy's own phrase for what pays, e.g. "this run uses 2 of 15 welcome".
    line: (lot: string) => `12 to 18 swaps · uses 2 credits · ${lot}`,
    again: (kept: string) => `Another upgrade · 12 to 18 swaps · uses 2 credits · ${kept} stays here`,
    freeOnly: "An upgrade uses 2 credits, and a free credit covers 1.",
  },
  wait: {
    finding: (s: string) => `Finding swaps toward ${s}`,
    usual: "usually about 6 seconds",
    leave: "Leave whenever you like: the upgrade keeps going and shows here when it’s done.",
  },
  failed: { line: "That upgrade didn’t come through. Both credits are back.", retry: "Try again" },
  results: {
    title: (n: number, s: string) => `${n} swaps toward ${s}`,
    buy: (n: number, total: string) => `${n} to buy · ${total}`,
    cap: "each under $12",
    owned: (n: number) => `${n} you own`,
    youOwnIt: "you own it",
    cutsFrom: (theme: string) => `Cuts from ${theme}`,
    start: (n: number) => `Start the deck with these ${n} swaps`,
    runAgain: (s: string) => `Run ${s} again`,
    short: (n: number) => `Fewer than 12 fit this deck, so both credits are back. These ${n} are still yours to start with.`,
    row: (n: number, date: string) => `${n} swaps · ${date}`,
    rowUnrun: (n: number) => `${n} of its cards · 2 credits`,
  },
  same: {
    body: (s: string, date: string) =>
      `You upgraded toward ${s} on ${date}, on this same list. Another run uses 2 credits and will likely name many of the same swaps.`,
    run: "Run it again",
    keep: (date: string) => `Keep ${date}’s`,
  },
  start: {
    with: (n: number, s: string) => `With the ${n} swaps toward ${s}. The precon as it came stays your deck’s v0, so you can always see what changed.`,
    cardsValue: (n: number) => `all 100 · ${n} swapped`,
    bracket: "Bracket",
    printingsValue: (n: number) => `this precon’s copies; yours for the ${n} added`,
  },
  arrival: { body: (n: number, s: string) => `Started with ${n} swaps toward ${s}. Versions shows the box as v0.` },
} as const;
