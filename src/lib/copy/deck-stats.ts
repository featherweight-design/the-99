// Deck Stats copy, from the handoff's `deck-stats · copy strings.ts`, reviewed by /copy-review
// (2026-10-11): every string kept as written. US English. No em dashes.
//
// `colors.onlyLands` is the one string the pass would tighten ("Every source is a land: no mana
// rocks, dorks or land search."). The mana handoff's README quotes it verbatim, so it stays until
// Design re-draws that state.

export const deckStatsCopy = {
  segment: {
    stats: "Stats",
    aria: "Show the deck as stats",
    groupAria: "What the deck panel shows",
    provenance: "drawn from the live list, your collection and logged games",
  },
  cards: {
    curve: "The curve, by card type",
    colors: "Mana colors",
    jobs: "Jobs",
    average: "Against the average deck",
    money: "Money and ownership",
    results: "Results",
  },
  colors: {
    denom: (pips: number, sourceCount: number) => `${pips} ${pips === 1 ? "pip" : "pips"} · ${sourceCount} ${sourceCount === 1 ? "source" : "sources"}`,
    pips: "PIPS",
    sources: "SOURCES",
    infoLabel: "How this is counted",
    tip: [
      "A source counts once for each color it can add, so a dual land or a two-color mana rock counts twice. Land search counts the basics in this deck it can find.",
      "Shares are of all pips and all sources. A card that makes mana in a color we can’t read isn’t counted.",
    ],
    legendLand: "Land",
    legendOther: "Mana rock, dork or land search",
    onlyLands: "Every source is a land. This deck has no mana rocks, dorks or land search.",
    monoLead: (color: string) => `Every pip is ${color}.`,
    noLands: "No lands yet, so no sources are counted.",
    names: { W: "white", U: "blue", B: "black", R: "red", G: "green", C: "colorless" },
    row: (name: string, pips: number, pipShare: number, lands: number, other: number, sourceShare: number) => {
      const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
      const split = other > 0 ? `, ${n(lands, "land", "lands")} and ${n(other, "other", "others")}` : "";
      return `${name[0].toUpperCase()}${name.slice(1)}, ${n(pips, "pip", "pips")}, ${pipShare} percent; ${n(lands + other, "source", "sources")}${split}, ${sourceShare} percent`;
    },
  },
  jobs: {
    denom: (cardCount: number) => `${cardCount} nonland ${cardCount === 1 ? "card" : "cards"}`,
    rows: { ramp: "Ramp", draw: "Card draw", removal: "Removal", wipes: "Board wipes", protection: "Protection", finisher: "Win conditions" },
    overlap: (cardCount: number) => `${cardCount} ${cardCount === 1 ? "card does" : "cards do"} two or more of these jobs, so the rows add up to more than the cards in them.`,
    none: (cardCount: number) => `${cardCount} nonland ${cardCount === 1 ? "card does" : "cards do"} none of these jobs.`,
  },
  curve: {
    title: "The curve, by card type",
    denom: (cast: number) => `${cast} cast`,
    ceiling: "7+",
    column: (label: string, cardCount: number, parts: string[]) =>
      cardCount === 0 ? `Mana value ${label}: no cards` : `Mana value ${label}: ${cardCount} ${cardCount === 1 ? "card" : "cards"}, ${parts.join(", ")}`,
    // No average to name at zero cast: a deck of nothing but lands has none, and 0.0 would read as one.
    noAverage: "none",
    caption: (avg: string, landCount: number) =>
      `Counts the commander · average mana value ${avg} · ${landCount} ${landCount === 1 ? "land" : "lands"}, not on the curve · tap a type to light its cards`,
    lit: (type: string, litCount: number, cast: number) =>
      `${type} lit: ${litCount} of ${cast} cast. Tap it again to clear.`,
    types: {
      creature: "Creature",
      instant: "Instant",
      sorcery: "Sorcery",
      artifact: "Artifact",
      enchantment: "Enchantment",
      planeswalker: "Planeswalker",
      battle: "Battle",
      land: "Land",
    },
    typesPlural: {
      creature: "Creatures",
      instant: "Instants",
      sorcery: "Sorceries",
      artifact: "Artifacts",
      enchantment: "Enchantments",
      planeswalker: "Planeswalkers",
      battle: "Battles",
      land: "Lands",
    },
  },
  results: {
    denom: (gameCount: number) => (gameCount === 1 ? "1 game" : `${gameCount} games`),
    denomNone: "no games",
    recordKey: "wins · losses · draws",
    span: (gameCount: number, fromDate: string, toDate: string) => (gameCount === 1 ? `1 game, ${toDate}` : `${gameCount} games, ${fromDate} to ${toDate}`),
    every: "EVERY GAME, OLDEST FIRST",
    lastFive: (record: string) => `Underlined, the last five: ${record}.`,
    lastFiveSoon: "The last-five line starts at the sixth game.",
    byVersion: "BY VERSION",
    current: "current",
    noGames: "no games yet",
    unrecorded: "Version not recorded",
    emptyHead: "No games logged yet.",
    emptyBody: "The record, the trend and results by version all draw from games you log.",
    emptyLink: "Log a game in Games",
    letters: { win: "W", loss: "L", draw: "D" },
    words: { win: "win", loss: "loss", draw: "draw" },
    bead: (word: string, date: string) => `${word}, ${date}`,
    // The bead's desktop tooltip, result first (Small items 7, addendum 6): `L · Oct 9, 2025`.
    beadTip: (letter: string, date: string) => `${letter} · ${date}`,
  },
  money: {
    denom: (copyCount: number) => `${copyCount} ${copyCount === 1 ? "card" : "cards"}`,
    value: "DECK VALUE",
    valueSub: "every priced copy",
    valuePartial: (priced: number, copyCount: number) => `${priced} of ${copyCount} copies priced`,
    owned: "OWNED",
    ownedSub: (copyCount: number, basics: number) => `${copyCount} ${copyCount === 1 ? "copy" : "copies"}, plus ${basics} ${basics === 1 ? "basic" : "basics"}`,
    // A group with some copies unpriced says so beside its figure, so a part-total never reads as the whole.
    ownedPartial: (priced: number, copyCount: number, basics: number) => `${priced} of ${copyCount} copies priced, plus ${basics} ${basics === 1 ? "basic" : "basics"}`,
    toBuyPartial: (priced: number, copyCount: number) => `${priced} of ${copyCount} copies priced, after the ones you own`,
    toBuy: "TO BUY",
    toBuySub: (copyCount: number) => `${copyCount} ${copyCount === 1 ? "copy" : "copies"}, after the ones you own`,
    toBuyNone: "Nothing",
    toBuyNoneSub: "every copy is in your collection",
    // A group with copies and no price at all: the count stands in for the figure, never $0.00.
    copiesFig: (copyCount: number) => `${copyCount} ${copyCount === 1 ? "copy" : "copies"}`,
    noPrice: "no price",
    legend: { owned: "Owned", basic: "Basic land, not priced", toBuy: "To buy" },
    priciest: "PRICIEST CARDS",
    tagOwned: "owned",
    tagToBuy: "to buy",
    shopLink: (copyCount: number) => (copyCount === 1 ? "See it in Shopping" : `See the ${copyCount} in Shopping`),
    // N3 (discovery R3): some to-buy rows are over the deck's stand-in limit. `copyCount` counts copies, as the line above
    // does, and `over` counts the rows the limit marks; a row over the limit is never a basic, so the two agree.
    // The name says only that they are over the limit: an over row need not have a cheaper stand-in (R3 gap 10). It
    // keeps the visible words whole and adds what the limit is, so a reader speaking the label still matches it.
    shopOver: (copyCount: number, over: number, limit: string) =>
      copyCount === 1 ? `See it in Shopping, over ${limit}` : `See the ${copyCount} in Shopping, ${over} over ${limit}`,
    shopOverAria: (copyCount: number, over: number, limit: string) =>
      `${copyCount === 1 ? `See it in Shopping, over ${limit}` : `See the ${copyCount} in Shopping, ${over} over ${limit}`}, your stand-in limit`,
  },
  average: {
    // Counts the body (99, or 98 for a pair), as the Curve card says it counts the commander: EDHREC's type counts sum to the body.
    denomCommander: (decks: number | null) => (decks === null ? "EDHREC average" : `${decks.toLocaleString("en-US")} decks`),
    denomColors: (label: string) => `${label} decks`,
    denomBaseline: "starting mix",
    counts: (body: number) => (body === 99 ? "Counts the 99, not the commander." : `Counts the ${body}, not the commanders.`),
    basisCommander: (name: string, decks: number | null) =>
      `Each bar is this deck’s figure minus the average ${name} deck’s${decks === null ? "." : `, from EDHREC’s ${decks.toLocaleString("en-US")} decks.`}`,
    basisPair: (firstCommanderName: string, secondCommanderName: string, decks: number | null) =>
      `Each bar is this deck’s figure minus the average ${firstCommanderName} and ${secondCommanderName} deck’s${decks === null ? "." : `, from EDHREC’s ${decks.toLocaleString("en-US")} decks.`}`,
    basisColors: (label: string) => `Each bar is this deck’s figure minus the average ${label} deck’s.`,
    basisBaseline: (name: string) =>
      `${name} has no average yet: not for the commander, a pair, or its colors. Each bar is this deck’s figure minus The 99’s starting mix.`,
    baselineNote: "The starting mix has jobs only, so lands, the curve and card types don’t draw here. They return once this commander has an average.",
    thinNote: (cardCount: number, deckSize: number) =>
      `${cardCount} of ${deckSize} cards so far. A bar that runs past its end is cut off with a mark; the figures on the right are always whole.`,
    fewer: "FEWER",
    more: "MORE",
    youAvg: "YOU · AVG",
    curveHeading: "CURVE, BY MANA VALUE",
    groups: { shape: "SHAPE", types: "CARD TYPES", jobs: "JOBS" },
    rows: {
      lands: "Lands",
      manaValue: "Mana value",
      creature: "Creatures",
      instant: "Instants",
      sorcery: "Sorceries",
      artifact: "Artifacts",
      enchantment: "Enchantments",
      planeswalker: "Planeswalkers",
      battle: "Battles",
      ramp: "Ramp",
      draw: "Card draw",
      removal: "Removal",
      wipes: "Board wipes",
    },
    diffMore: (amountText: string) => `${amountText} more`,
    diffFewer: (amountText: string) => `${amountText} fewer`,
    diffHigher: (amountText: string) => `${amountText} higher`,
    diffLower: (amountText: string) => `${amountText} lower`,
    same: "the same",
    row: (name: string, you: string, avg: string, diff: string) => `${name}: this deck ${you}, average ${avg}, ${diff}`,
    miniColumn: (label: string, diff: number) =>
      diff === 0 ? `Mana value ${label}: the same as the average` : `Mana value ${label}: ${Math.abs(diff).toFixed(1)} ${diff > 0 ? "more" : "fewer"} than the average`,
  },
} as const;
