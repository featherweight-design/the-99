// Discovery R1 · the moments. PLACEHOLDERS for /copy-review (brief: "Moment copy goes to /copy-review, not to a
// Design round"). Each line is drawn from the tool's own About entry or shipped strings, so it promises nothing the tool
// does not do. `tool` renders in --fg semibold, `line` follows it in --fg-body.

export const momentsCopy = {
  dismiss: "Dismiss", // aria-label on the bare ✕
  noteName: (tool: string) => `${tool}, a tip`, // the bubble's accessible name

  topOff: { tool: "Top off", line: "ranks your own cards for the last 12 slots. Nothing is added until you say so." }, // M1; "12" is the open slot count
  suggestedChanges: { tool: "Suggested changes", line: "is in Analysis now the deck is full. It reads your games and notes and offers up to five swaps." }, // M2
  proposedCuts: { tool: "Proposed cuts", line: "counts where this deck runs long, free. A deeper look can name the five." }, // M3; "five" is the over count, in words to nineteen
  manaBalance: { tool: "Mana Balance", line: "counts every source of each color against what your spells ask for. Free." }, // M4
  standIns: { tool: "Cheaper stand-ins", line: "for a card over your $10 limit. Press ⇄ to see what does the same job for less." }, // M5; "$10" is the deck's limit
  friendSpares: { tool: "A friend has a spare", line: "of this card. Press to see who, before you buy." }, // M6
  cardAssignments: { tool: "None free", line: "means another deck holds your only copy. When you commit, you choose which deck keeps it." }, // M7; the marker's own word leads
  findADeck: { tool: "Find a deck", line: "reads your decks for the one this card fits best. You own it and no deck uses it yet." }, // M8
  wishlist: { tool: "Wishlist", line: "keeps cards you want outside any deck. A card leaves the list once you own it." }, // M9
  matchups: { tool: "Matchups", line: "splits your games by the commander, colors or friend across the table. Counts, never a rate." }, // M10
  friendsAfterGame: { tool: "Playing with friends?", line: "Add them from your account menu, under Friends. Then you can seat them when you log a game." }, // M11; the brief's lead-in
  helpMeChoose: { tool: "Not sure where to start?", line: "Help me choose ranks commanders by what you say you want, owned or not. It’s in Discover." }, // M12 (G1)
  lineup: { tool: "Stats", line: "puts every deck side by side: when each last played, its bracket and colors, and the cards they share." }, // M13
  precons: { tool: "Own a precon?", line: "Start from it. Every precon shows how many of its cards you already own." }, // M14; the brief's "Start from a precon you own"
  collectionSync: { tool: "Sync", line: "is new: it merges this file with what you changed here, card by card, and asks only where both moved." }, // M15
} as const;

export const friendsHomeCardCopy = {
  label: "Friends", // section label, drawn uppercase by CSS
  title: "Play with friends", // placeholder
  line: "Add the people at your table. Seat them when you log a game, and see their spares when you shop.", // placeholder
  press: "Add a friend", // shipped: socialCopy.friends.invite
  dismiss: "Dismiss",
  seatAria: (commander: string) => `Your seat: ${commander}`,
  emptySeatsAria: "Three empty seats",
} as const;
