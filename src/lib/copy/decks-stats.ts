// Stats on /decks (handoff `design_handoff_the99_lineup`, R2; `decks-stats · copy strings.ts`). Players read
// "Stats"; the code says `lineup`, and the word "Lineup" never reaches a player. No verdict words, "select" /
// "unselect" and never "tick", the word "labels" never appears, results are raw with their pod sizes, and a
// gap is a count.

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
const brews = (k: number) => `${n(k)} ${k === 1 ? "brew" : "brews"}`;

export const decksStatsCopy = {
  view: { tiles: "Tiles", stats: "Stats", aria: "Show decks as" },
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
    recency: (ago: number, w: number, games: number, never: number) => `last game ${n(ago)} ${ago === 1 ? "day" : "days"} ago · won ${n(w)} of ${n(games)} · ${n(never)} never played`,
    recencyNone: (never: number) => `no games logged · ${n(never)} never played`,
    spread: (slot: string, k: number, na: number) => `bracket ${slot} holds ${n(k)} · ${n(na)} not analyzed`,
    spreadNone: (na: number) => `${n(na)} not analyzed`,
    among: (deck: string, valueRank: string, rampRank: string) => `${deck} · ${valueRank} by value, ${rampRank} by ramp`,
    worth: (sum: number, top: number, med: number) => `${money(sum)} · most ${money(top)} · median ${money(med)}`,
    jobs: (ramp: readonly [number, number], draw: readonly [number, number], removal: readonly [number, number]) =>
      `ramp ${n(ramp[0])} to ${n(ramp[1])} · card draw ${n(draw[0])} to ${n(draw[1])} · removal ${n(removal[0])} to ${n(removal[1])}`,
  },
  one: "Stats compares your decks. Add another to fill every chart.",
  recency: {
    title: "When each deck last played",
    denom: (played: number, total: number) => `${n(played)} of ${n(total)} played`,
    won: (w: number, games: number) => `won ${n(w)} of ${n(games)}`,
    games: (games: number, sizes: readonly number[], span: string) => `${games === 1 ? "1 game" : `${n(games)} games`} · ${pods(sizes)} · ${span}`,
    ago: (days: number) => (days === 0 ? "today" : days === 1 ? "1 day ago" : `${n(days)} days ago`),
    deckResult: (w: number, games: number, sizes: readonly number[]) => `won ${n(w)} of ${n(games)} · ${pods(sizes)}`,
    head: "LAST · RESULTS",
    /** The lane's games for a screen reader, oldest first: the beads say this, and they are hidden. */
    gamesAria: (games: readonly { result: "win" | "loss" | "draw"; date: string }[]) =>
      games.map((g) => `${{ win: "won", loss: "lost", draw: "drew" }[g.result]} ${g.date}`).join(", "),
    never: "Never played",
    neverCount: (k: number, total: number) => `${n(k)} of ${n(total)}`,
    noGames: "No games logged yet.",
    noGamesSub: "Log games from a deck’s Games tab.",
    caption: "Right edge is today.",
    /** The axis span in the head: `Jul to Oct 2026`, or `Oct 2026` inside one month. */
    span: (from: string, to: string, sameYear: boolean) => (from === to ? to : sameYear ? `${from.split(" ")[0]} to ${to}` : `${from} to ${to}`),
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
    nOf: (k: number, total: number) => `${n(k)} of ${n(total)}`,
    /** `one color 5 · two 8 · three 6`: how many decks have each count of colors, zeros left out. */
    sizeLine: (counts: readonly number[]) => counts.map((k, i) => (k > 0 ? `${SIZES[i]} ${n(k)}` : null)).filter(Boolean).join(" · "),
    bracketAria: (lo: number, hi: number | null) => (hi === null ? `bracket ${lo}` : `bracket ${lo} to ${hi}`),
    colorName: { W: "White", U: "Blue", B: "Black", R: "Red", G: "Green", C: "Colorless" } as const,
  },
  among: {
    title: "This deck among yours",
    denom: (decks: number) => `${n(decks)} decks`,
    selectAria: "Choose a deck",
    rankHead: "RANK",
    groups: { build: "THE BUILD", jobs: "JOBS", value: "VALUE" },
    rows: { manaValue: "Mana value", lands: "Lands", ramp: "Ramp", draw: "Card draw", removal: "Removal", valueCents: "Deck value" },
    rank: (k: number, total: number, tied: boolean) => `${tied ? "tied " : ""}${ord(k)} of ${n(total)}`,
    median: (v: string) => `median ${v}`,
    others: (k: number) => `the other ${n(k)}`,
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
    /** `Mana Pool prices, 2h ago`: the newest price the values were read at. */
    caption: (age: string) => `Mana Pool prices, ${age}`,
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
} as const;
