// Proposed src/lib/copy/decks-stats.ts. R2: "Lineup" renamed "Stats" (Hugh, 2026-10-11). Replaces lineup · copy strings.ts.
// Placeholders until /copy-review. Rules: no verdict words; "select" / "unselect", never "tick"
// (not even for the strip's drawn marks: they are "lines"); the word "labels" never appears. Results are raw, with pod sizes; a gap is a count.

const n = (x: number) => x.toLocaleString("en-US");
const and = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const ord = (k: number) => { const s = ["th", "st", "nd", "rd"], v = k % 100; return k + (s[(v - 20) % 10] || s[v] || s[0]); };
const pods = (sizes: number[]) => {
  const s = [...new Set(sizes)].sort((a, b) => a - b);
  return s.length === 1 ? `pod of ${s[0]}` : `pods of ${s[0]}–${s[s.length - 1]}`;
};

export const decksStatsCopy = {
  view: { tiles: "Tiles", stats: "Stats", aria: "Show decks as" },
  menu: { among: "See it among your decks" },
  filter: {
    all: "All decks",
    finished: "Finished only",
    scopeAll: (decks: number, brews: number) => `${n(decks)} decks · ${n(brews)} ${brews === 1 ? "brew" : "brews"} included`,
    scopeFinished: (decks: number, brews: number) => `${n(decks)} finished decks · ${n(brews)} ${brews === 1 ? "brew" : "brews"} left out`,
    one: "1 deck",
  },
  fold: {
    expandAll: "Expand all",
    collapseAll: "Collapse all",
    aria: (title: string, open: boolean) => `${open ? "Fold" : "Unfold"} ${title}`,
  },
  summary: {
    recency: (ago: number, w: number, games: number, never: number) => `last game ${n(ago)} days ago · won ${n(w)} of ${n(games)} · ${n(never)} never played`,
    recencyNone: (never: number) => `no games logged · ${n(never)} never played`,
    spread: (slot: string, k: number, na: number) => `bracket ${slot} holds ${n(k)} · ${n(na)} not analyzed`,
    shared: (card: string, decks: number, owned: number, wanted: number) => `${card} in ${n(decks)} decks, you own ${n(owned)} · ${n(wanted)} wanted more than you own`,
    sharedOne: "needs two decks",
    collection: (inDeck: number, copies: number, pctValue: number, wanted: number) => `${n(inDeck)} of ${n(copies)} copies in a deck · ${pctValue}% of the value · ${n(wanted)} wanted by your commanders`,
    among: (deck: string, valueRank: string, rampRank: string) => `${deck} · ${valueRank} by value, ${rampRank} by ramp`,
  },
  one: "Stats compares your decks. Add another to fill every chart.",
  recency: {
    title: "When each deck last played",
    denom: (played: number, total: number) => `${n(played)} of ${n(total)} played`,
    won: (w: number, games: number) => `won ${n(w)} of ${n(games)}`,
    games: (games: number, sizes: number[], span: string) => `${games === 1 ? "1 game" : `${n(games)} games`} · ${pods(sizes)} · ${span}`,
    ago: (days: number) => (days === 0 ? "today" : days === 1 ? "1 day ago" : `${n(days)} days ago`),
    deckResult: (w: number, games: number, sizes: number[]) => `won ${n(w)} of ${n(games)} · ${pods(sizes)}`,
    head: "LAST · RESULTS",
    never: "Never played",
    neverCount: (k: number, total: number) => `${n(k)} of ${n(total)}`,
    noGames: "No games logged yet.",
    noGamesSub: "Log games from a deck’s Games tab.",
    caption: "Right edge is today.",
  },
  spread: {
    title: "Brackets and colors",
    denom: (analyzed: number, total: number) => `${n(analyzed)} of ${n(total)} analyzed`,
    axis: "ANALYZED BRACKET",
    notAnalyzed: "not analyzed",
    none: "none",
    declared: (b: number) => `declared ${b}`,
    colorless: "colorless",
    noneAnalyzed: "No deck analyzed yet. Brackets come from each deck’s Analysis tab.",
    colorsHead: "DECKS PER COLOR",
    sizes: { 0: "colorless", 1: "one color", 2: "two", 3: "three", 4: "four", 5: "five" } as Record<number, string>,
    markAria: (deck: string, colors: string) => `${deck}, ${colors || "colorless"}`,
  },
  shared: {
    title: "Cards your decks share",
    denom: (decks: number, cards: number) => `${n(decks)} decks · ${n(cards)} cards`,
    chipMost: "In the most decks",
    chipWanted: (k: number) => `Wanted more than you own · ${n(k)}`,
    want: (decks: number) => `${n(decks)} decks`,
    own: (owned: number) => `you own ${n(owned)}`,
    noCopy: (decks: string[]) => `No copy left for ${and(decks)}.`,
    toCart: (k: number) => `${n(k)} on Shopping for all decks`,
    legendHeld: "has a copy",
    legendWanted: "no copy left",
    caption: (two: number, five: number) => `${n(two)} cards in 2+ decks · ${n(five)} in 5+ · basics not counted`,
    one: "Needs two decks.",
  },
  collection: {
    title: "Your collection, put to work",
    denom: (copies: number, cards: number) => `${n(copies)} copies · ${n(cards)} cards`,
    inDeck: "IN A DECK", notInDeck: "NOT IN A DECK", valueIn: "VALUE IN A DECK",
    unitCopies: "1 square = 10 copies",
    unitValue: "1 square = $10",
    fact: (pctCopies: number, pctValue: number) => `${pctCopies}% of your copies hold ${pctValue}% of your value.`,
    wantsHead: "Not in a deck, wanted by your commanders",
    cut: (pct: number, k: number) => `${pct}% or more · ${n(k)}`,
    wantCopies: (k: number) => `×${n(k)}`,
    wantShare: (pct: number, commander: string) => `${pct}% of ${commander} decks`, // a pair reads "Kratos + Atreus"
    wantDeckAll: "All decks",
    more: (k: number) => `${n(k)} more`,
    caption: (source: string, age: string) => `Basics not counted · ${source} prices, ${age}`,
  },
  among: {
    title: "This deck among yours",
    denom: (decks: number) => `${n(decks)} decks`,
    selectAria: "Choose a deck",
    rankHead: "RANK",
    groups: { build: "THE BUILD", jobs: "JOBS", value: "VALUE" },
    rows: { manaValue: "Mana value", lands: "Lands", ramp: "Ramp", draw: "Card draw", removal: "Removal", value: "Deck value" },
    rank: (k: number, total: number, tied: boolean) => `${tied ? "tied " : ""}${ord(k)} of ${n(total)}`,
    median: (v: string) => `median ${v}`,
    others: (k: number) => `the other ${n(k)}`,
    medianLegend: "the median deck",
  },
  proposals: {
    badge: "PROPOSAL",
    // R2: "Curve against lands" is cut (Hugh). Replaced by worth.
    worth: {
      title: "What each deck is worth",
      denom: (decks: number) => `${n(decks)} decks`,
      sortMost: "Most first",
      sortName: "By name",
      median: (v: string) => `the median deck, ${v}`,
      summary: (sum: string, topV: string, medV: string) => `${sum} · most ${topV} · median ${medV}`,
      foot: (source: string, age: string) => `${source} prices, ${age}`,
    },
    scatterCut: {
      title: "Curve against lands",
      denom: (decks: number) => `${n(decks)} decks`,
      y: "↑ lands",
      x: "average mana value, nonland →",
      foot: (chosen: string | null) => `One dot per deck. ${chosen ? `${chosen} is in accent, as in This deck among yours. ` : ""}Dashed lines are the median deck. Press a dot to name it.`,
    },
    jobs: {
      title: "Jobs, deck by deck",
      denom: (decks: number) => `${n(decks)} decks`,
      cols: { deck: "DECK", lands: "Lands", ramp: "Ramp", draw: "Draw", removal: "Removal" },
      sorted: "↓",
      foot: "Press a column to sort.",
    },
  },
} as const;
