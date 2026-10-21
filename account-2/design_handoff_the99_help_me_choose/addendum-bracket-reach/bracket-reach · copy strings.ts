// Bracket reach R1 (account 2, 2026-10-21): every string the boards draw, as placeholders for /copy-review.
// Locked vocabulary: "Game Changer", "combo", "bracket". Never "unlock" or "upgrade your collection".

export const bracketReachCopy = {
  /** A · the Bracket field's caption, from 3 up. `colors` reads "in these colors" (or nothing with no colors picked). */
  form: {
    reached: (n: number, name: string) => `${n} · ${name}. Your cards in these colors reach it.`,
    shortOne: (n: number, name: string, lands: string, card: string, price: string) =>
      `${n} · ${name}. From your cards in these colors, a deck lands in bracket ${lands}. Hitting ${n} means buying ${card}, about ${price}. You choose which on the new deck, after you pick a commander.`,
    shortOver: (n: number, name: string, lands: string, total: string, budget: string) =>
      `${n} · ${name}. From your cards in these colors, a deck lands in bracket ${lands}. Hitting ${n} means buying about ${total} of cards, over your ${budget} budget. You choose which on the new deck, after you pick a commander.`,
    shortOwn: (n: number, name: string, lands: string, card: string, price: string) =>
      `${n} · ${name}. From your cards in these colors, a deck lands in bracket ${lands}. Hitting ${n} means buying ${card}, about ${price}, from outside your collection. You choose which on the new deck, after you pick a commander.`,
    shortCount: (n: number, name: string, lands: string, count: string, total: string) =>
      `${n} · ${name}. From your cards in these colors, a deck lands in bracket ${lands}. Hitting ${n} means buying ${count} more Game Changers, about ${total}. You choose which on the new deck, after you pick a commander.`,
    none: (n: number, name: string, lands: string) =>
      `${n} · ${name}. From your cards in these colors, a deck lands in bracket ${lands}, and no card the fill can place gets one to ${n}.`,
  },
  /** B · the ownership line's segments. */
  row: {
    label: "bracket",
    lands: (b: string) => `lands ${b}`,
    adds: (n: number, price: string) => `${n} adds ${price}`,
  },
  /** C · the hand-off's Bracket row. */
  handOff: {
    reached: (card: string, n: number) => `The fill places ${card}, a Game Changer you own, so the deck lands in bracket ${n}.`,
    shortLead: (lands: string) => `From your cards this deck lands in bracket ${lands}. Choose how to build it:`,
    fromMine: "From my collection",
    fromMineLine: (lands: string) => `Builds from your cards and lands in bracket ${lands}.`,
    fromMineLineOwn: (lands: string) => `Builds from your cards only and lands in bracket ${lands}.`,
    hit: (n: number) => `Hit bracket ${n}`,
    hitLine: (cards: string, price: string) => `Adds ${cards}, about ${price}, to buy. It joins the deck’s Shopping list.`,
    hitLineOver: (cards: string, price: string, over: string, budget: string) =>
      `Adds ${cards}, about ${price}, to buy: ${over} over your ${budget} budget. Picking it raises the budget to ${price}.`,
    hitLineOwn: (card: string, price: string) => `Adds ${card}, about ${price}, to buy: the one card from outside your collection.`,
    overTag: "over budget",
    none: (n: number, lands: string) =>
      `No Game Changer or two-card combo the fill can place fits this commander, so the deck lands in bracket ${lands}.`,
    waiting: "Choose how to build it under Bracket to create the deck.",
  },
  /** About · help-me-choose: the sentence added to the caption's third paragraph, if Hugh rules it owed. */
  aboutHmc:
    "If your Collection can’t reach the bracket you asked for, you’ll hear before you spend a credit, and choose on the new deck: build from your cards at a lower bracket, or add the cards that get there to buy.",
  /** About · credits: the redrawn entry. `5 a day` stands for `{allowance}`. */
  aboutCredits: {
    caption:
      "Browsing is always free. Anything we write just for you uses a credit.\n\nThe following use a credit:\n\n- Running a deck’s Analysis\n- Writing a deck’s Overview\n- Each “Suggested changes” run\n- Each new “Help me choose” search where you fill in “Anything else?”\n- Each “Which deck needs it most?” read\n- Each “Look deeper” in Proposed cuts\n\nEvery card, deck and collection view is free, and so is reading a deck’s bracket. Opening a past “Help me choose” run from History is free.\n\nCredits come from these, and are spent in this order:\n\n- Your free credits: {allowance}, each back 24 hours after you use it\n- 15 welcome credits when you join\n- A monthly plan: 60 credits a month\n- A gift from us, now and then\n- Packs: 40 credits for $5",
    keys: [
      "Welcome credits expire 30 days after you join. Plan credits roll over while you’re subscribed, and end with the period after you cancel. Gift and pack credits never expire.",
      "A run that fails gives its credit back on its own. A refunded payment takes back the credits it bought that you haven’t spent; a disputed one holds them until it’s decided.",
      "Welcome, plan, gift and pack credits share one daily limit on how many you can spend. Your free credits have their own.",
      "Next to each button that uses a credit, you’ll see how many you have left and when the next one comes back.",
    ],
  },
} as const;
