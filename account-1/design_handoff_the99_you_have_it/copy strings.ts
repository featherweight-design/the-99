// You have a card a friend wants R1: every NEW string (placeholders for /copy-review). Shipped strings are reused as named.
export const haveCopy = {
  key: { spare: "you can spare", deck: "in your decks", asked: "asked you", offered: "offered", sparing: "sparing" },
  aria: (card: string, kind: "spare" | "deck") => (kind === "spare" ? `You can spare ${card}` : `${card} is in your decks`),
  title: "You have this",
  kicker: (friend: string, wants: number) => `on ${friend}’s wishlist · wants ${wants}`,
  section: (n: number) => `Your copies · ${n}`,
  spare: (n: number) => (n === 1 ? "1 spare" : `${n} spares`), // = spareCopy.count
  spareSub: "not in a deck or draft",
  offer: "Offer",
  offerAria: (friend: string, card: string) => `Offer ${friend} ${card}`,
  offered: "Offered",
  sparing: "Sparing",
  declined: "Declined", // = spareCopy.request.declined
  asked: (friend: string, n: number) => `${friend} asked for ${n}`,
  inDeck: (n: number) => (n === 1 ? "1 copy" : `${n} copies`),
  foot: {
    offer: (friend: string) => `Offer, and ${friend} answers yes or no. The trade (or the goat) is between you.`,
    offered: (friend: string) => `${friend} has been told. You’ll hear when they answer.`,
    asked: (friend: string) => `${friend} asked you for it. Yes tells them it’s theirs.`,
    sparing: (friend: string) => `${friend} said yes. Hand it over when you meet; your collection stays as it is until you change it.`,
    deck: "Every copy is in a deck, so it isn’t a spare. Free one up and you can offer it here.",
  },
  // The friend's side (Waiting on you, Home lead, push).
  waiting: {
    kind: "Spare offer",
    title: (from: string, card: string) => `${from} can spare you ${card}`,
    detail: (from: string, spare: number, want: number) => `${from} has ${spare} spare. You want ${want}.`,
  },
  // Q3 extras, only if chosen.
  headCount: (n: number) => `you have ${n}`,
  friendRowChip: (n: number) => `${n} of their wanted cards you can spare`, // aria for the /friends chip
  helpKind: "You can help",
};
