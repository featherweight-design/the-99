// The 99 — public card and commander pages: every new string (R1, 2026-10-17).
// Strings reused verbatim from shipped copy are marked `shipped`. Nothing here varies by visitor.

export const PUBLIC_SHELL = {
  wordmark: "The Ninety-Nine", // shipped (landing kicker); 390 shows "The 99"
  wordmarkPhone: "The 99",
  homeLabel: "The 99, home",
  scryfallSearch: "Find another card on Scryfall", // + ExternalLink ↗, new tab
  scryfallSearchPhone: "Search Scryfall",
} as const;

export const SIGNED_OUT_BLOCK = {
  title: "This is The 99",
  body:
    "A Commander companion: it reads the cards you own and builds decks from them. It’s invite-only, so the way in is a friend who already plays.",
  signIn: "Sign in", // shipped
  fine: "Have an invitation? Open its link.", // shipped (sign-up page) minus "email"
  regionLabel: "About The 99",
} as const;

export const CARD_PAGE = {
  facts: { identity: "Identity", rarity: "Rarity", commander: "Commander" }, // Identity, Rarity shipped
  legal: "Legal",
  notLegal: "Not legal", // shipped (notices tag)
  bracketFacts: "Bracket facts", // shipped
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
  front: "Front",
  back: "Back",
  turnOver: (face: string) => `Turn over to ${face}`, // shipped
} as const;

export const COMMANDER_PAGE = {
  kicker: "Commander",
  cardLink: "The card, its text and printings",
  why: "Why this commander", // shipped
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
  absentTitle: (short: string) => `No deck data for ${short}`,
  absentBody:
    " — EDHREC doesn’t track this commander, so there’s no rank, no themes and no cards to list here. The card is still all here.",
  degradedTitle: "Deck figures aren’t available right now.",
  degradedBody:
    " They come from EDHREC, which didn’t answer the last time this page was built. They return with the next refresh.",
} as const;

export const BRACKET_NAMES = { 1: "Exhibition", 2: "Core", 3: "Upgraded", 4: "Optimized", 5: "cEDH" } as const; // shipped

export const NOT_FOUND = {
  numeral: "404", // shipped
  title: "There’s no page here.", // shipped
  caption: "I checked. Twice. Probably a typo in the URL.", // shipped
  home: "Back home", // shipped; "View decks" is removed on public routes
} as const;

export const LINK_PREVIEW = {
  cardTitle: (name: string) => `${name} · The 99`,
  commanderTitle: (name: string) => `${name} · Commander · The 99`,
  commanderFallback: (rank: string, decks: string, themes: string) => `#${rank} on EDHREC across ${decks} decks. ${themes}.`,
  ogCardKicker: "Card",
  ogCommanderKicker: "Commander",
} as const;
