// src/lib/copy/game-matchups.ts: the Games tab's Matchups section and the History row's `vs` line (Social R3, PR 4).
// Set by /copy-review from the handoff's placeholders (`design/design_handoff_the99_social_r3/social-r3 · copy
// strings.ts`): every string kept as drawn. The empty line is Teaching (nothing else on the screen says what
// fills the section) and stays two sentences; the beat legend is a gloss on a glyph the row cannot spell out.
// NO STRING HERE PRINTS A PERCENTAGE OR `net`: every count carries its denominator, and a row at one game is
// one square. Identity names are `colorLabel`'s (Izzet, Jeskai); these cover what it does not name.
// Opponent labels and friends' names are player-typed and reach no model.

const games = (n: number) => (n === 1 ? "1 game" : `${n} games`);

export const gameMatchupsCopy = {
  history: {
    vs: "vs",
    wonAria: "won",
  },
  matchups: {
    heading: "Matchups",
    recorded: (recorded: number, total: number) => `recorded in ${recorded} of ${total} games`,
    /** The switch's name for a screen reader. */
    split: "Split by",
    byCommander: "Commander",
    byColors: "Colors",
    byFriend: "Friend",
    empty: "No opponents recorded yet. Add who sat across the table when you log a game, and this splits your games by commander, colors and friend.",
    mostlyOne: "Most rows are a single game. A row means more each time a name comes back.",
    allOne: "Every row so far is a single game.",
    games,
    /** Past ten games the squares give way to counts. */
    counts: (w: number, l: number, d: number) => (d > 0 ? `${w} W · ${l} L · ${d} D` : `${w} W · ${l} L`),
    squareAria: (w: number, l: number, d: number) =>
      [w && `${w} won`, d && `${d} drawn`, l && `${l} lost`].filter(Boolean).join(", "),
    beatAria: (n: number) => (n === 1 ? "beat you in 1 game" : `beat you in ${n} games`),
    legend: "Squares are games: W won, L lost, D drawn.",
    legendBeat: "how many of your losses they won.",
    legendPhone: "Squares are games: W won, L lost, D drawn. The trophy counts the losses they won.",
    fourColors: "Four colors",
    fourColorsSub: (missing: string) => `no ${missing}`,
    fiveColors: "Five colors",
    colorless: "Colorless",
  },
} as const;
