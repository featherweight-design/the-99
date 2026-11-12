// Where credits work · addendum onboarding (account 2, 2026-11-12). DRAFT: /copy-review resolves the wording.
// Reuses rather than restates: creditsPageCopy.viewsFree (R4's line), welcomeCreditsCopy.strip.link (`Where they work`).

// src/lib/copy/discovery.ts · writtenForYouCopy.rows, sixth
export const upgradeRow = { id: "upgrade", name: "Upgrade this precon", where: "A precon’s page", what: "Swaps 12 to 18 of a precon’s cards toward the strategy you pick.", cost: "2 credits per run", short: "2 per run" } as const;

// src/lib/copy/discovery.ts · tourCopy
export const tourCreditsCopy = {
  lit: { welcome: "your welcome credits" },
  steps: {
    credits: {
      place: "Credits",
      title: "Where your credits go",
      body: "Browsing is always free. Anything we write just for you uses a credit, and your free credit each day goes first.",
      foot: "Where they work, on this line, any time",
    },
    collection: { footSeven: "Seven stops · about a minute · ✕ skips the tour" },
  },
} as const;
