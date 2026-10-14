// Proposed entry for src/lib/copy/about.ts (aboutEntries), chapter '01', placed after
// "Your shopping list" (id 'shopping', route /decks). Placeholders until /copy-review.
// ABOUT_VERSION: the next number with the last PR (16 if the cart's 15 lands first; batches otherwise).

export const tokensEntry = {
  id: "deck-tokens",
  chapter: "01",
  since: 16,
  switch: "DECK_TOKENS_ENABLED", // new AboutSwitch member (gap G8)
  title: "The tokens your deck makes",
  route: "/decks/[id]",
  opens: "opens a deck’s tokens",
  caption:
    "Your deck lists the tokens its cards make, below the last group: each token, and the cards that generate it.\n\nHave one? Press I have one. Don’t? Add it to Shopping. Tokens get their own group there, so they never count toward what the deck needs.",
  keyLines: [
    "Any printing of a token counts. One Treasure in your collection covers every deck that makes one.",
    "Uploading your collection reads the tokens in it. You can also mark the ones you have, token by token.",
    "Open a token to see every card that generates it. Each name opens that card.",
    "A token in Shopping is sent to Mana Pool with its set and number, so it can’t be mistaken for a card of the same name.",
  ],
  specimen: {
    component: "TokenRow",
    state: "joined",
    fixture: {
      name: "Soldier",
      colors: ["R"],
      type: "Creature",
      pt: "2/2",
      makers: ["Firebender Ascension"],
      own: "not",
      joined: true,
    },
  },
  phone: "The controls drop to a second line: I have one left, Add to Shopping right, both 44px targets. The makers line wraps and is never truncated.",
} as const;
