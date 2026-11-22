// You have a card a friend wants R2: every NEW string (placeholders for /copy-review). Shipped strings are reused as named.
export const haveCopy = {
  key: { spare: "you can spare", asked: "asked you", offered: "offered", accepted: "accepted" /* = spareCopy.request.keyAccepted */ },
  aria: (card: string) => `You can spare ${card}`,
  title: "You have this",
  kicker: (friend: string, wants: number) => `on ${friend}’s wishlist · wants ${wants}`,
  section: (n: number) => `Your spares · ${n}`,
  spare: (n: number) => (n === 1 ? "1 spare" : `${n} spares`), // = spareCopy.count
  spareSub: "not in a deck or draft",
  offer: "Offer",
  offerAria: (friend: string, card: string) => `Offer ${friend} ${card}`,
  offered: "Offered",
  accepted: "Accepted", // = spareCopy.request.accepted
  declined: "Declined", // = spareCopy.request.declined
  asked: (friend: string, n: number) => `${friend} asked for ${n}`,
  foot: {
    offer: (friend: string) => `Offer, and ${friend} answers yes or no. The trade (or the goat) is between you.`,
    offered: (friend: string) => `${friend} has been told. You’ll hear when they answer.`,
    asked: (friend: string) => `${friend} asked you for it. Yes tells them it’s theirs.`,
    accepted: (friend: string) => `${friend} said yes. Hand it over when you meet; your collection stays as it is until you change it.`,
  },
  callout: {
    eyebrow: "Your spares",
    title: (n: number) => `You have ${n} to spare`,
    body: (names: string) => `${names}. Offer one from its tile.`,
    show: "Show", showName: (n: number) => `Show only the ${n} you can spare`,
    all: "All", allName: "Show the whole wishlist",
  },
  // The friend's side (Waiting on you, Home lead, push).
  waiting: {
    kind: "Spare offer",
    title: (from: string, card: string) => `${from} is offering you ${card}`,
    detail: (from: string, spare: number, want: number) => `${from} has ${spare} spare. You want ${want}.`,
  },
  // /friends row chip.
  friendChip: (n: number, friend: string) => `You can spare ${n} of ${friend}’s wanted cards`,
};
