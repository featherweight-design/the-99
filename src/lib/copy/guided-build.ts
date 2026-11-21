// Guided build (design_handoff_the99_guided_build, R1): the copy of the pieces that have shipped. The handoff's strings file
// is DRAFT until /copy-review; each PR carries the strings it draws and the review of them.

export const guidedBuildCopy = {
  /** The commander page's one action: it starts a deck and promises nothing about how it is built. */
  commander: {
    press: "Start a deck →",
    /** Under the button when picks are made: it says where the picks go, not how the rest is built. */
    picks: (n: number) => `Your ${n} go into the new deck.`,
  },
  /** The new-deck screen's choice of how the deck is built. */
  choice: {
    label: "How we build it",
    free: { name: "Free build", cost: "free", line: "We fill the 99 from your cards, as far as your collection reaches." },
    empty: { name: "Just the commander", cost: "free", line: (c: string) => `${c} and 99 empty slots. Build it your way.` },
    /** With picks carried from the commander page (?select=): each row says what it does with them. */
    withPicks: {
      free: (n: number) => `We fill the rest of the 99 around your ${n} picks, as far as your collection reaches.`,
      empty: (c: string, n: number) => `${c}, your ${n} picks and ${99 - n} empty slots. Build it your way.`,
    },
    picks: {
      label: (n: number) => `Your picks · ${n}`,
      /** The link's words; its accessible name says whose page it leads to. */
      change: "Change",
      changeLabel: (c: string) => `Change on ${c}’s page`,
      kept: "Every option keeps them.",
      buy: "not owned",
    },
  },
  press: { free: "Create deck →", empty: "Create deck →" },
} as const;
