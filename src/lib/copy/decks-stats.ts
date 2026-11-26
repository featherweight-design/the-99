// Stats on /decks (handoff `design_handoff_the99_lineup`, R2; `decks-stats · copy strings.ts`). Players read
// "Stats"; the code says `lineup`, and the word "Lineup" never reaches a player. No verdict words, "select" /
// "unselect" and never "tick", the word "labels" never appears, results are raw with their pod sizes, and a
// gap is a count.

import type { StoreInfo } from "../stores/info";
import { storeCopy } from "./store";

const n = (x: number) => x.toLocaleString("en-US");
const pods = (sizes: readonly number[]) => {
  const s = [...new Set(sizes)].sort((a, b) => a - b);
  if (s.length === 0) return "";
  return s.length === 1 ? `pod of ${s[0]}` : `pods of ${s[0]}–${s[s.length - 1]}`;
};
const SIZES = ["colorless", "one color", "two", "three", "four", "five"] as const;
const ord = (k: number) => {
  const sfx = ["th", "st", "nd", "rd"];
  const v = k % 100;
  return `${k}${sfx[(v - 20) % 10] || sfx[v] || sfx[0]}`;
};
const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const and = (xs: readonly string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const brews = (k: number) => `${n(k)} ${k === 1 ? "brew" : "brews"}`;

export const decksStatsCopy = {
  // Decks · Games · Stats (game history R1c): the Tiles segment is renamed Decks in copy only; its value, URL and cookie stay `tiles`.
  view: { tiles: "Decks", games: "Games", stats: "Stats", aria: "Show decks as" },
  /** The tile's `…` item, appended after the shipped ones: Stats with that deck chosen in This deck among yours. */
  menu: { among: "See it among your decks" },
  filter: {
    aria: "Decks in Stats",
    all: "All decks",
    finished: "Finished only",
    scopeAll: (decks: number, brewCount: number) => `${n(decks)} ${decks === 1 ? "deck" : "decks"} · ${brews(brewCount)} included`,
    scopeFinished: (decks: number, brewCount: number) => `${n(decks)} finished ${decks === 1 ? "deck" : "decks"} · ${brews(brewCount)} left out`,
    one: "1 deck",
  },
  fold: { expandAll: "Expand all", collapseAll: "Collapse all" },
  summary: {
    recency: (ago: number, winCount: number, games: number, never: number) => `last game ${n(ago)} ${ago === 1 ? "day" : "days"} ago · won ${n(winCount)} of ${n(games)} · ${n(never)} never played`,
    recencyNone: (never: number) => `no games logged · ${n(never)} never played`,
    spread: (slot: string, deckCount: number, unanalyzedCount: number) => `bracket ${slot} holds ${n(deckCount)} · ${n(unanalyzedCount)} not analyzed`,
    spreadNone: (unanalyzedCount: number) => `${n(unanalyzedCount)} not analyzed`,
    shared: (card: string, decks: number, owned: number, wanted: number) => `${card} in ${n(decks)} decks, you own ${n(owned)} · ${n(wanted)} wanted more than you own`,
    sharedOne: "needs two decks",
    sharedNone: "no card in two decks",
    // With no copy priced there is no value to give a share of, so the clause goes.
    collection: (inDeck: number, copies: number, pctValue: number | null, wanted: number) =>
      `${n(inDeck)} of ${n(copies)} copies in a deck · ${pctValue === null ? "" : `${pctValue}% of the value · `}${n(wanted)} wanted by your commanders`,
    among: (deck: string, valueRank: string, rampRank: string) => `${deck} · ${valueRank} by value, ${rampRank} by ramp`,
    worth: (totalPrice: number, highestPrice: number, medianPrice: number) => `${money(totalPrice)} · most ${money(highestPrice)} · median ${money(medianPrice)}`,
    jobs: (ramp: readonly [number, number], draw: readonly [number, number], removal: readonly [number, number]) =>
      `ramp ${n(ramp[0])} to ${n(ramp[1])} · card draw ${n(draw[0])} to ${n(draw[1])} · removal ${n(removal[0])} to ${n(removal[1])}`,
  },
  one: "Stats compares your decks. Add another to fill every chart.",
  recency: {
    title: "When each deck last played",
    denom: (played: number, total: number) => `${n(played)} of ${n(total)} played`,
    won: (winCount: number, games: number) => `won ${n(winCount)} of ${n(games)}`,
    games: (games: number, sizes: readonly number[], span: string) => `${games === 1 ? "1 game" : `${n(games)} games`} · ${pods(sizes)} · ${span}`,
    ago: (days: number) => (days === 0 ? "today" : days === 1 ? "1 day ago" : `${n(days)} days ago`),
    deckResult: (winCount: number, games: number, sizes: readonly number[]) => `won ${n(winCount)} of ${n(games)} · ${pods(sizes)}`,
    head: "LAST · RESULTS",
    /** The lane's games for a screen reader, oldest first: the beads say this, and they are hidden. */
    gamesAria: (games: readonly { result: "win" | "loss" | "draw"; date: string }[]) =>
      games.map((g) => `${{ win: "won", loss: "lost", draw: "drew" }[g.result]} ${g.date}`).join(", "),
    never: "Never played",
    neverCount: (deckCount: number, total: number) => `${n(deckCount)} of ${n(total)}`,
    noGames: "No games logged yet.",
    noGamesSub: "Log games from a deck’s Games tab.",
    caption: "Right edge is today.",
    /** The door to the cross-deck Games view (game history R1c), beside the caption. */
    everyGame: "See every game \u203a",
    /** The axis span in the head: `Jul to Oct 2026`, or `Oct 2026` inside one month. */
    span: (fromDate: string, toDate: string, sameYear: boolean) => (fromDate === toDate ? toDate : sameYear ? `${fromDate.split(" ")[0]} to ${toDate}` : `${fromDate} to ${toDate}`),
  },
  spread: {
    title: "Brackets and colors",
    denom: (analyzed: number, total: number) => `${n(analyzed)} of ${n(total)} analyzed`,
    axis: "ANALYZED BRACKET",
    notAnalyzed: "not analyzed",
    none: "none",
    declared: (bracket: number) => `declared ${bracket}`,
    colorless: "colorless",
    noneAnalyzed: "No deck analyzed yet. Brackets come from each deck’s Analysis tab.",
    colorsHead: "DECKS PER COLOR",
    nOf: (deckCount: number, total: number) => `${n(deckCount)} of ${n(total)}`,
    /** `one color 5 · two 8 · three 6`: how many decks have each count of colors, zeros left out. */
    sizeLine: (counts: readonly number[]) => counts.map((k, i) => (k > 0 ? `${SIZES[i]} ${n(k)}` : null)).filter(Boolean).join(" · "),
    bracketAria: (lowBracket: number, highBracket: number | null) => (highBracket === null ? `bracket ${lowBracket}` : `bracket ${lowBracket} to ${highBracket}`),
    colorName: { W: "White", U: "Blue", B: "Black", R: "Red", G: "Green", C: "Colorless" } as const,
  },
  among: {
    title: "This deck among yours",
    denom: (decks: number) => `${n(decks)} decks`,
    selectAria: "Choose a deck",
    rankHead: "RANK",
    groups: { build: "THE BUILD", jobs: "JOBS", value: "VALUE" },
    rows: { manaValue: "Mana value", lands: "Lands", ramp: "Ramp", draw: "Card draw", removal: "Removal", valueCents: "Deck value" },
    rank: (rankNumber: number, total: number, tied: boolean) => `${tied ? "tied " : ""}${ord(rankNumber)} of ${n(total)}`,
    median: (medianValue: string) => `median ${medianValue}`,
    others: (deckCount: number) => `the other ${n(deckCount)}`,
    medianLegend: "the median deck",
    money,
    /** A strip's two ends, short: whole dollars for value. */
    moneyShort: (cents: number) => `$${Math.round(cents / 100).toLocaleString("en-US")}`,
  },
  worth: {
    title: "What each deck is worth",
    denom: (decks: number) => `${n(decks)} decks`,
    sortAria: "Order",
    sortMost: "Most first",
    sortName: "By name",
    median: (cents: number) => `the median deck, ${money(cents)}`,
    money,
    /** `Mana Pool prices, 2h ago`: the reader's store and the newest price the values were read at. */
    caption: (s: StoreInfo, age: string) => storeCopy.deckCost(s, age),
    /** Rounded first, then the unit picked, so 59.6 minutes reads `1h ago` and 47.6 hours `2d ago`. */
    age: (minutes: number) => {
      const m = Math.max(1, Math.round(minutes));
      if (m < 60) return `${m}m ago`;
      const h = Math.round(minutes / 60);
      return h < 48 ? `${h}h ago` : `${Math.round(minutes / 1440)}d ago`;
    },
  },
  jobs: {
    title: "Jobs, deck by deck",
    denom: (decks: number) => `${n(decks)} decks`,
    cols: { lands: "Lands", ramp: "Ramp", draw: "Draw", removal: "Removal" },
    deck: "Deck",
    sorted: "↓",
    foot: "Press a column to sort.",
  },
  shared: {
    title: "Cards your decks share",
    denom: (decks: number, cards: number) => `${n(decks)} decks · ${n(cards)} ${cards === 1 ? "card" : "cards"}`,
    chipsAria: "Which cards",
    chipMost: "In the most decks",
    chipWanted: (cardCount: number) => `Wanted more than you own · ${n(cardCount)}`,
    want: (decks: number) => `${n(decks)} decks`,
    own: (owned: number) => `you own ${n(owned)}`,
    noCopy: (decks: readonly string[]) => `No copy left for ${and(decks)}.`,
    toCart: (cardCount: number) => `${n(cardCount)} on Shopping for all decks`,
    legendHeld: "has a copy",
    legendWanted: "no copy left",
    caption: (twoPlusCardCount: number, five: number) => `${n(twoPlusCardCount)} ${twoPlusCardCount === 1 ? "card" : "cards"} in 2+ decks · ${n(five)} in 5+ · basics not counted`,
    one: "Needs two decks.",
    open: (card: string) => `Copies left of ${card}`,
  },
  collection: {
    title: "Your collection, put to work",
    denom: (copies: number, cards: number) => `${n(copies)} copies · ${n(cards)} ${cards === 1 ? "card" : "cards"}`,
    inDeck: "IN A DECK",
    notInDeck: "NOT IN A DECK",
    valueIn: "VALUE IN A DECK",
    unitCopies: (copies: number) => `1 square = ${n(copies)} copies`,
    unitValue: (cents: number) => `1 square = $${n(cents / 100)}`,
    fact: (pctCopies: number, pctValue: number) => `${pctCopies}% of your copies hold ${pctValue}% of your value.`,
    wantsHead: "Not in a deck, wanted by your commanders",
    selectAria: "Whose commanders",
    allDecks: "All decks",
    cutsAria: "How often their decks run it",
    cut: (percent: number, cardCount: number) => `${percent}% or more · ${n(cardCount)}`,
    wantCopies: (copyCount: number) => `×${n(copyCount)}`,
    wantShare: (percentNumber: number) => `${Math.floor(percentNumber)}%`,
    wantBasis: (basis: string) => `of ${basis} decks`,
    more: (cardCount: number) => `${n(cardCount)} more`,
    none: "None at this share.",
    dollars: (cents: number) => `$${Math.round(cents / 100).toLocaleString("en-US")}`,
    // A part-total says so, in Money's words, so a value over some copies never reads as the whole collection's.
    caption: (s: StoreInfo, age: string | null, priced: number, copies: number) =>
      ["Basics not counted", priced < copies ? `${n(priced)} of ${n(copies)} copies priced` : null, age ? storeCopy.deckCost(s, age) : null].filter(Boolean).join(" · "),
  },
} as const;
