// DRAFT · addendum A2 to src/lib/copy/precon-upgrade.ts (through /copy-review)
export const preconUpgradeDeckCopy = {
  entry: "Upgrade precon",
  band: {
    started: (precon: string) => `Started from the ${precon} precon`,
    linked: (precon: string) => `Linked to the ${precon} precon`,
    phone: (precon: string) => `From the ${precon} precon`,
    // body reuses preconsCopy.arrival.bodyShort / bodyAll
  },
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
