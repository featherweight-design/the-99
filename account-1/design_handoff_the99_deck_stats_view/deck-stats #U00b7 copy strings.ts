// Deck Stats, round 1. Every string is a PLACEHOLDER owed to /copy-review.
// US English. No em dashes. Apostrophes are ’.

export const deckStatsCopy = {
  // R2: Stats is the third segment of the shipped All · Shopping control. "All" and "Shopping"
  // keep their shipped strings; only the segment below is new.
  segment: {
    stats: "Stats", // PLACEHOLDER
    aria: "Show the deck as stats", // PLACEHOLDER
    provenance: "drawn from the live list, your collection and logged games", // PLACEHOLDER
  },
  curve: {
    title: "The curve, by card type", // PLACEHOLDER
    denom: (cast: number) => `${cast} cast`, // PLACEHOLDER
    ceiling: "7+", // PLACEHOLDER
    caption: (avg: string, lands: number) =>
      `Average mana value ${avg}, commander included · ${lands} lands, not on the curve · tap a type to light its cards`, // PLACEHOLDER
    lit: (type: string, n: number, cast: number) => `${type} lit: ${n} of ${cast} cast. Tap it again to clear.`, // PLACEHOLDER
    types: {
      creature: "Creature", instant: "Instant", sorcery: "Sorcery", artifact: "Artifact",
      enchantment: "Enchantment", planeswalker: "Planeswalker", battle: "Battle", land: "Land",
    }, // PLACEHOLDER
  },
  colors: {
    title: "Colors, asked for and made", // PLACEHOLDER
    denom: (pips: number, lands: number) => `${pips} pips · ${lands} lands`, // PLACEHOLDER
    asks: "ASKS FOR · PIPS", // PLACEHOLDER
    makes: "MAKES · LAND SOURCES", // PLACEHOLDER
    nonlandOne: "1 more mana source isn’t a land. It’s counted, but its color isn’t.", // PLACEHOLDER
    nonlandMany: (n: number) =>
      `${n} more mana sources aren’t lands: rocks, and creatures that tap for mana. They’re counted here, but their colors aren’t.`, // PLACEHOLDER
    caption: "A land counts once for each color it can add, so a dual counts twice. Shares are of all pips, and of all land sources.", // PLACEHOLDER
    monoLead: (color: string) => `Every pip is ${color}.`, // PLACEHOLDER
    noLands: "No lands yet, so no sources are counted.", // PLACEHOLDER
  },
  jobs: {
    title: "Jobs", // PLACEHOLDER
    denom: (n: number) => `${n} nonland cards`, // PLACEHOLDER
    rows: { ramp: "Ramp", draw: "Card draw", removal: "Removal", wipes: "Board wipes", protection: "Protection", finisher: "Win conditions" }, // PLACEHOLDER
    overlap: (n: number) => `${n} cards do two or more of these jobs, so the rows add up to more than the cards in them.`, // PLACEHOLDER
    none: (n: number) => `${n} nonland cards do none of these jobs.`, // PLACEHOLDER
    unlabeled: (n: number) => `${n} cards aren’t labeled yet. They join a row once they are.`, // PLACEHOLDER
  },
  average: {
    title: "Against the average deck", // PLACEHOLDER
    basisCommander: (name: string, decks: string) =>
      `Each bar is this deck’s figure minus the average ${name} deck’s, from EDHREC’s ${decks} decks.`, // PLACEHOLDER
    basisPair: (a: string, b: string, decks: string) =>
      `Each bar is this deck’s figure minus the average ${a} and ${b} deck’s, from EDHREC’s ${decks} decks.`, // PLACEHOLDER
    basisIdentity: (identity: string) => `Each bar is this deck’s figure minus the average ${identity} deck’s.`, // PLACEHOLDER
    basisBaseline: (name: string) =>
      `${name} has no average yet: not for the commander, a pair, or its colors. Each bar is this deck’s figure minus The 99’s starting mix.`, // PLACEHOLDER
    baselineNote: "The starting mix has lands and jobs only, so the curve and card types don’t draw here. They return once this commander has an average.", // PLACEHOLDER
    thinNote: (n: number, of: number) => `${n} of ${of} cards so far. A bar that runs past its end is cut off with a mark; the figures on the right are always whole.`, // PLACEHOLDER
    fewer: "FEWER", more: "MORE", youAvg: "YOU · AVG", // PLACEHOLDER
    groups: { shape: "SHAPE", types: "CARD TYPES", jobs: "JOBS", curve: "CURVE, BY MANA VALUE" }, // PLACEHOLDER
    rows: { lands: "Lands", manaValue: "Mana value" }, // PLACEHOLDER
    diffMore: (n: string) => `${n} more`, diffFewer: (n: string) => `${n} fewer`, // PLACEHOLDER
    diffHigher: (n: string) => `${n} higher`, diffLower: (n: string) => `${n} lower`, same: "the same", // PLACEHOLDER
  },
  money: {
    title: "Money and ownership", // PLACEHOLDER
    value: "DECK VALUE", valueSub: "every priced copy", // PLACEHOLDER
    valuePartial: (priced: number, of: number) => `${priced} of ${of} copies priced`, // PLACEHOLDER
    owned: "OWNED", ownedSub: (n: number, basics: number) => `${n} copies, plus ${basics} basics`, // PLACEHOLDER
    toBuy: "TO BUY", toBuySub: (n: number) => `${n} copies, after the ones you own`, // PLACEHOLDER
    toBuyNone: "Nothing", toBuyNoneSub: "every copy is in your collection", // PLACEHOLDER
    noPriceOne: "no price from ManaPool for this one", noPrice: "no price", // PLACEHOLDER
    legend: { owned: "Owned", basic: "Basic land, not priced", toBuy: "To buy" }, // PLACEHOLDER
    priciest: "PRICIEST CARDS", tagOwned: "owned", tagToBuy: "to buy", // PLACEHOLDER
    caption: "One square per card, owned first. Prices from ManaPool. Basics are never priced or counted to buy.", // PLACEHOLDER
    shopLink: (n: number) => (n === 1 ? "See it in Shopping" : `See the ${n} in Shopping`), // PLACEHOLDER, drawn with ⟶
  },
  results: {
    title: "Results", // PLACEHOLDER
    denom: (n: number) => (n === 1 ? "1 game" : `${n} games`), denomNone: "no games", // PLACEHOLDER
    recordKey: "wins · losses · draws", // PLACEHOLDER
    span: (n: number, from: string, to: string) => (n === 1 ? `1 game, ${to}` : `${n} games, ${from} to ${to}`), // PLACEHOLDER
    every: "EVERY GAME, OLDEST FIRST", // PLACEHOLDER
    lastFive: (record: string) => `Underlined, the last five: ${record}.`, // PLACEHOLDER
    lastFiveSoon: "The last-five line starts at the sixth game.", // PLACEHOLDER
    byVersion: "BY VERSION", current: "current", noGames: "no games yet", // PLACEHOLDER
    unrecorded: "Version not recorded", // PLACEHOLDER
    emptyHead: "No games logged yet.", // PLACEHOLDER
    emptyBody: "The record, the trend and results by version all draw from games you log.", // PLACEHOLDER
    emptyLink: "Log a game in Games", // PLACEHOLDER
  },
  finding: "finding", // PLACEHOLDER, drawn with ⟶
  findingAria: (figure: string) => `Open the Analysis finding about ${figure}`, // PLACEHOLDER
};
