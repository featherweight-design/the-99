// Card search (handoff `design_handoff_the99_card_search/`, R2; plan `2026-10-16-card-search.md`). The handoff's
// `card-search · copy strings.ts`, through /copy-review: every string KEEP but `offline.body`, TIGHTENED to the shipped
// "once you’re back online" pattern (`collection-edit.ts`). The no-results and failure sentences are Add cards' own
// (`collectionEditCopy.add`), and the ownership words the deck's Add a card row's (`addPanelCopy.quickAdd`); they are
// imported where they are drawn, never restated here.

export const cardSearchCopy = {
  // The control's name everywhere: the phone icon's aria-label, the sheet's placeholder and hidden heading,
  // the rail slot's name and the rail tag (d9's label, brief lock 6).
  label: "Search all cards",
  // The shortcut shows in the rail's name tag, at the open field's right edge until typing starts, and in the
  // panel's foot line. Off a Mac: "Ctrl K". The touch rail (88px) draws the short label.
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
  tryAgain: "Try again",
  offline: {
    title: "You’re offline",
    body: "Search needs a connection. Keep typing if you like: results come in once you’re back online.",
  },
  keysHint: "↑ ↓ to move · ↵ to open · esc to close",
  // The foot line once a row's + can add (add a card from anywhere, READINESS O4/O8), and the keyboard add as drawn
  // on this platform (off a Mac: "Ctrl ↵"). Through /copy-review: TIGHTEN to O4's reading (READINESS E8). A fourth
  // segment does not fit the 540px dropdown beside the shortcut line, and "esc to close" goes: Escape and a press
  // outside still close it, as on the phone, which draws no foot.
  keysHintAdd: (addKey: string) => `↑ ↓ to move · ↵ to open · ${addKey} to add`,
  addShortcutMac: "⌘↵",
  addShortcutOther: "Ctrl ↵",

  // The open search's way into the Add cards sheet, above Recent cards (C2, C-D1; add a card from anywhere, READINESS
  // O8). Through /copy-review: both KEEP, one wording at both widths (READINESS E7 cuts the desktop board's "save once").
  // The lead, then the faint aside after a middle dot.
  addSeveral: {
    lead: "Add several cards",
    aside: "search or scan",
  },

  row: {
    inDeck: (deck: string) => `in ${deck}`,
    moreDecks: (n: number) => `+${n}`,
    // The bookmark's words, said once: inside the row's one sentence below, never again on the bookmark itself.
    wishlistAria: "on your wishlist",
    // The +'s name (READINESS O4/O8). The + is a pointer target kept out of the tree (an option's contents are
    // presentational), so this is the last clause of the row's own name, with the keys that add it. Through
    // /copy-review: TIGHTEN, the card's name dropped (READINESS E8): the row's name already opens with it, and a reader
    // arrowing through twenty rows would hear each name twice.
    addAria: (keys: string) => `add to your collection with ${keys}`,
    addKeysMac: "Command Enter",
    addKeysOther: "Control Enter",
    // The whole row's accessible name.
    aria: (name: string, owned: number, decks: readonly string[], wish: boolean) =>
      [
        name,
        owned > 0 ? `${owned} owned` : "not owned",
        decks.length === 0
          ? null
          : decks.length === 1
            ? `in ${decks[0]}`
            : `in ${decks[0]} and ${decks.length - 1} more ${decks.length === 2 ? "deck" : "decks"}`,
        wish ? cardSearchCopy.row.wishlistAria : null,
      ]
        .filter(Boolean)
        .join(", "),
  },
} as const;

// Ask (tool discovery D, handoff `design_handoff_the99_tool_discovery/`, R3 `askCopy`). The placeholder and the field's
// name are `cardSearchCopy.label`, above. Matching is `src/lib/discovery/ask.ts`; no model, and the typed words never
// leave the page.
export const askCopy = {
  /** The field's placeholder and its accessible name (the control, rail slot and sheet keep `cardSearchCopy.label`). */
  placeholder: "Search cards, or ask a question",
  starters: {
    heading: "Try asking",
    questions: ["Where can my spare cards go?", "How do I make my deck better?", "What can I build with my cards?", "What should I buy next?"],
  },
  tools: { heading: "Tools for this", cards: "Cards" },
  /** The cost pill on a tool that spends nothing (a paid one carries its own credit line). */
  free: "free",
  yours: { spares: (n: number) => `${n.toLocaleString("en-US")} of your cards are in no deck` },
  noTool: { title: "Nothing here answers that yet", body: "Try one of these, or search a card by name.", about: "Every tool, in About" },
  /** A tool answer's accessible name: the tool, what it does, what it costs, where it lands. */
  rowAria: (name: string, line: string, cost: string | null, where: string) => [name, line, cost, where].filter(Boolean).join(", "),
  /** A tool that needs a deck the reader has none of presses to New deck. */
  newDeck: "New deck",
} as const;
