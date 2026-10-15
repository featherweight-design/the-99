// Proposed entry for src/lib/copy/about.ts (aboutEntries), chapter '04', placed directly after
// "Tuning a deck with Suggested changes" (id 'suggested-changes') and before 'mana-balance'.
// Caption and keys are placeholders until /copy-review.
// Tied to its own switch, so it is announced when the switch flips: since 14, no ABOUT_VERSION bump,
// and the about.test.ts content hash is re-pinned (as 'mana-balance' and 'deck-tokens').

const HUB_PARAGRAPH =
  "When a deck is over, its header says so, with a Proposed cuts press that opens the tool. Every run is kept in History, under Tuning, and reopening one checks each cut against the deck as it is now.";

export const proposedCutsEntry = {
  id: "proposed-cuts",
  chapter: "04",
  title: "Cutting back to 99 with Proposed cuts",
  route: "/decks",
  opens: "opens a deck’s Analysis tab",
  width: "plate",
  switch: "PROPOSED_CUTS_ENABLED", // engineering adds it to AboutSwitch and SWITCHES (proposedCutsEnabled)
  caption:
    "Deck over 100 cards? Proposed cuts, on a deck’s Analysis tab, counts what runs long against the decks EDHREC holds for your commander: roles past their recommended count, the fullest steps of the curve, cards few of those decks run, and anything the bracket you declared doesn’t allow. The count is free, and it names no card.\n\n" +
    "Look deeper names the cards: as many as the deck is over, in batches when it’s far over, each with a one-line reason. Cut or Keep each one, and when the deck is back to 99 the tool closes.\n\n" +
    HUB_PARAGRAPH,
  // The trim line's press and History both draw only with the Tuning hub on.
  captionLineSwitches: { [HUB_PARAGRAPH]: "TUNING_HUB_ENABLED" },
  keys: [
    "The count is free. Look deeper uses a credit, and a run that names nothing or doesn’t finish gives it back.",
    "It never names your commander, a card you locked or a Key card.",
    "Every reason cites a figure from the count. A reason whose figure doesn’t match is left out, not replaced.",
    "Cut changes the list straight away, and Undo puts the card back.",
  ],
  specimen: {
    // C1, the free count. The panel's own component, never a fork (§G3).
    // Heading, lead, offer and count extracted from cuts-panel.tsx; CutsPanelView renders it too.
    component: "CutsFreeCount",
    fixture: {
      deck: "HD - Zombies",
      deckId: "3119268e-f824-48ce-8e27-6b8cabe4cb61", // the 110-card deck, not its 99-card twin
      commander: "Zul Ashur, Lich Lord",
      bodySize: 99,
      over: 10,
      lockedCount: 0,
      keyCount: 0, // G2: confirm on staging
      run: null,
      allowance: "5 of 5, the app-wide default a specimen draws",
      rows: "read from the real panel's free count (G1); the artboard's figures are placeholders",
    },
  },
  phone:
    "Nothing dropped. The specimen takes the panel's own phone layout: sub-line under the heading, offer stacked over a full-width 44px Look deeper, each row's note under its label.",
  marksPending: true,
  since: 14,
} as const;
