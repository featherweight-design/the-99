// Suggested changes v2 (plan 2026-10-27, UI PR 5a): the hub tile. ONE exported object so it can go to /copy-review as a
// block. Carried verbatim from the handoff's copy file (design/design_handoff_the99_suggested_changes_v2,
// `suggested-changes-v2 · copy strings.ts`, the `tile` block; approved 2026-10-28). The intake block arrives with PR 5b;
// the wait, results, bar, confirm, history and about blocks with PR 6 and PR 7.
// US English, no em dashes, and never the words AI, model or LLM.
//
// Reuses, never restates: tuningHubCopy (the tile's name and cost).

export const suggestedChangesV2Copy = {
  tile: {
    purpose: "Say what you want changed. You get more cards to add and to cut than you need, and pick.",
    under: (total: number) => `Swaps cards in and out of a deck at 99. This one is at ${total}: top it off first.`,
    over: (n: number) => `Swaps cards in and out of a deck at 99. This one is ${n} over: cut it to 99 first.`,
    topOff: "Top off on Your deck →",
    proposedCuts: "Proposed cuts →",
  },
} as const;
