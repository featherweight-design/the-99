// Addendum A1 · Announced collapse. Proposed additions to `preconsCopy.upcoming` (src/lib/copy/precons.ts),
// placeholders for /copy-review. The visible labels match the shared `SheetGroupToggle`'s other callers
// (change-commander.ts: `Show all ${n}` / "Show fewer"). The spoken names carry the set, since two large sets
// would each draw one.

export const announcedCollapseCopy = {
  /** The toggle while collapsed. */
  showAll: (n: number) => `Show all ${n}`,
  showAllAria: (n: number, set: string) => `Show all ${n} commanders revealed for ${set}`,
  /** The toggle while expanded. */
  showFewer: "Show fewer",
  showFewerAria: (set: string) => `Show fewer ${set} commanders`,
} as const;
