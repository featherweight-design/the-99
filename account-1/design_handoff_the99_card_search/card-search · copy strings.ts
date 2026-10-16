// card-search · copy strings.ts. R2. Intent only: every NEW string goes through /copy-review.
// "Search all cards" and "Add a card" are d9's (brief lock 6). Strings marked REUSED ship today and are not changed.

export const cardSearchCopy = {
  // The control's name everywhere: the phone icon's aria-label, the sheet's placeholder and hidden heading,
  // the rail slot's name and the rail tag. d9's label.
  label: "Search all cards",
  // R2: no shortcut at rest. The shortcut shows in the rail's name tag (`Search all cards ⌘K`), at the open field's
  // right edge until typing starts, and in the panel's foot line. Off a Mac: "Ctrl K". Touch rail (88px): the label.
  shortcutMac: "⌘K",
  shortcutOther: "Ctrl K",
  shortcutFoot: (shortcut: string) => `${shortcut} opens this from anywhere`,
  touchRailLabel: "Search",
  closeAria: "Close search",

  empty: {
    title: "Look up any card",
    body: "Type part of a card’s name to see what it does, whether you own it, and which of your decks hold it.",
  },
  recent: {
    heading: "Recent cards",
    clear: "Clear",
  },
  searching: "Searching…",
  count: (n: number) => (n === 1 ? "1 card" : `${n} cards`),
  // Shown when the read returns its limit (20).
  limitReached: "Showing the first 20. Type more of the name to narrow it.",
  // REUSED: collectionEditCopy.add.noResultsTitle / noResultsBody / searchFailed.
  tryAgain: "Try again",
  offline: {
    title: "You’re offline",
    body: "Search needs a connection. Your results come back on their own once you’re online, so keep typing if you like.",
  },
  keysHint: "↑ ↓ to move · ↵ to open · esc to close",

  row: {
    // REUSED: addPanelCopy.quickAdd.rowOwned (`×N owned`), rowNotOwned (`not owned`), rowFlavorNamePrefix (`printed as `).
    inDeck: (deck: string) => `in ${deck}`,
    moreDecks: (n: number) => `+${n}`,
    wishlistAria: "on your wishlist",
    // The whole row's accessible name.
    aria: (name: string, owned: number, decks: string[], wish: boolean) =>
      [
        name,
        owned > 0 ? `${owned} owned` : "not owned",
        decks.length === 0
          ? null
          : decks.length === 1
            ? `in ${decks[0]}`
            : `in ${decks[0]} and ${decks.length - 1} more ${decks.length === 2 ? "deck" : "decks"}`,
        wish ? "on your wishlist" : null,
      ]
        .filter(Boolean)
        .join(", "),
  },
} as const;

// The deck's own field (lock 6): UNCHANGED. addPanelCopy.quickAdd.placeholder already reads
// `Add a card by name · {identity} only`, which begins with d9's "Add a card".
