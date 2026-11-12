// DRAFT · addendum A2 to src/lib/copy/precon-upgrade.ts (through /copy-review)
export const preconUpgradeDeckCopy = {
  entry: "Upgrade precon",
  introVersions: {
    lead: "Nothing changes until you apply the swaps.",
    rest: "They land as changes since v0, and you commit them as v1.",
  },
  apply: (n: number) => `Apply these ${n} swaps`,
  applied: (n: number, leads: string | null) =>
    leads ? `Applied ${n} swaps. ${leads} leads.` : `Applied ${n} swaps.`,
  undo: "Undo",
  applyFailed: "Those swaps didn’t apply. Your deck hasn’t changed.",
} as const;
