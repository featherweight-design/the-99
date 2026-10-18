// The public card and commander pages (launch epic F3), transcribed from the handoff's `public-pages · copy strings.ts`
// (design/design_handoff_the99_public_pages, R1, audited GREEN). The shell's, the signed-out block's, the card page's,
// the commander page's and both link previews' strings live here, so no key ships without a caller. The unknown address (C3) draws the shipped not-found's own
// strings (`shellCopy.notFound`), minus `View decks`. Strings the handoff marks `shipped` are reused verbatim. Nothing here varies by
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
  commander: {
    kicker: "Commander",
    cardLink: "The card, its text and printings",
    /** Shipped (the signed-in commander page's heading). */
    why: "Why this commander",
    onEdhrec: "On EDHREC",
    figuresFrom: "figures from EDHREC",
    rank: "Rank",
    decks: "Decks",
    themes: "Themes",
    themesSub: "Decks tagged with each theme",
    brackets: "Brackets",
    bracketsSub: (n: string) => `${n} of these decks say which bracket they’re built for`,
    mostPlayed: (short: string) => `Most played with ${short}`,
    mostPlayedSub: (short: string) => `Share of ${short} decks running each card`,
    similar: "Similar commanders",
    similarSub: "From EDHREC, closest first",
    /** The identity line's name for a commander with no colors (`guildLabel` names every other identity). */
    colorless: "Colorless",
    /** The handoff drew the title and body joined by an em dash; copy review made it a sentence break (READINESS audit finding 9). */
    absentTitle: (short: string) => `No deck data for ${short}.`,
    absentBody: " EDHREC doesn’t track this commander, so there’s no rank, no themes and no cards to list here. The card is still all here.",
    degradedTitle: "Deck figures aren’t available right now.",
    degradedBody: " They come from EDHREC, which didn’t answer the last time this page was built. They return with the next refresh.",
  },
  /** Both pages' link previews (C2, README call 8). */
  linkPreview: {
    cardTitle: (name: string) => `${name} · The 99`,
    commanderTitle: (name: string) => `${name} · Commander · The 99`,
    /** The commander's description with no prose sentence. The handoff's form, its themes part left off when there are none. */
    commanderFallback: (rank: string, deckCount: string, themes: string | null) =>
      `#${rank} on EDHREC across ${deckCount} decks.${themes ? ` ${themes}.` : ""}`,
    /** The commander image's figures line, as C2 draws it (`#203 on EDHREC · 11,687 decks`); a blank figure is left off. */
    ogCommanderFigures: (rank: string | null, deckCount: string | null) =>
      [rank !== null ? `#${rank} on EDHREC` : null, deckCount !== null ? `${deckCount} decks` : null].filter(Boolean).join(" · "),
    ogCardKicker: "Card",
    ogCommanderKicker: "Commander",
  },
} as const;
