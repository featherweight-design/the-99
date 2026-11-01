// The Commanders place strip (menu and Home, PR 1). Placeholder words, for /copy-review.

export const commandersPlaceCopy = {
  /** The nav landmark's name. */
  regionAria: "Commanders sections",
  title: "Commanders",
  /** The title line's figures; a half with nothing to say is left out. Pinned to en-US as the other count lines are. */
  count: (owned: number, discover: number) =>
    [
      owned > 0 ? `${owned.toLocaleString("en-US")} yours, not yet built` : null,
      discover > 0 ? `${discover.toLocaleString("en-US")} to discover` : null,
    ]
      .filter((part) => part !== null)
      .join(" · "),
  tabs: {
    foryou: "For you",
    discover: "Discover",
    choose: "Help me choose",
    /** The fourth tab (hide-commander README §3): the commanders the reader hid, and the way back. */
    hidden: "Hidden",
  },
} as const;
