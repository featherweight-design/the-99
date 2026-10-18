// The public card and commander pages (launch epic F3), transcribed from the handoff's `public-pages · copy strings.ts`
// (design/design_handoff_the99_public_pages, R1, audited GREEN). Only the shell's, the signed-out block's and the card
// page's strings live here so far: the commander page's and the link previews' arrive with the PRs that first draw them,
// so no key ships without a caller. Strings the handoff marks `shipped` are reused verbatim. Nothing here varies by
// visitor. US English, no em dashes.

export const publicPagesCopy = {
  shell: {
    /** Shipped (the landing's kicker). The phone draws the short form. */
    wordmark: "The Ninety-Nine",
    wordmarkPhone: "The 99",
    homeLabel: "The 99, home",
    scryfallSearch: "Find another card on Scryfall",
    scryfallSearchPhone: "Search Scryfall",
  },
  signedOut: {
    regionLabel: "About The 99",
    title: "This is The 99",
    body:
      "A Commander companion: it reads the cards you own and builds decks from them. It’s invite-only, so the way in is a friend who already plays.",
    /** Shipped. Never "Sign up": the way in is an invitation. */
    signIn: "Sign in",
    /** Shipped (the sign-up page), minus "email". */
    fine: "Have an invitation? Open its link.",
  },
  card: {
    facts: { identity: "Identity", rarity: "Rarity", commander: "Commander" },
    legal: "Legal",
    /** Shipped (the notices tag). A yes or no: the catalog does not say why. */
    notLegal: "Not legal",
    colorless: "Colorless",
    colorName: { W: "White", U: "Blue", B: "Black", R: "Red", G: "Green" } as Readonly<Record<string, string>>,
    rarity: { common: "Common", uncommon: "Uncommon", rare: "Rare", mythic: "Mythic", special: "Special", bonus: "Bonus" } as Readonly<Record<string, string>>,
    /** Shipped (card details' heading). */
    bracketFacts: "Bracket facts",
    printings: "Printings",
    printingsCapped: "first 40",
    printingsNote: "Each opens that printing on Scryfall. ◇ is the one pictured.",
    printingsNoteNoImage: "Each opens that printing on Scryfall. ◇ is the catalog’s main printing.",
    printingShownLabel: (code: string) => `${code}, the printing shown, on Scryfall`,
    morePrintings: "More on Scryfall",
    showAll: (n: number) => `Show all ${n}`,
    showAllCapped: "Show all 40 here",
    asCommander: (short: string) => `${short} as a commander`,
    asCommanderSub: "Rank, themes and the cards its decks run",
    scryfall: "Rulings, prices and every printing on Scryfall",
    /** The card box's name when the catalog has no image (A4): the box is the identity gradient, drawn with no caption. */
    noImage: "No image for this card",
    front: "Front",
    back: "Back",
  },
} as const;
