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
} as const;
