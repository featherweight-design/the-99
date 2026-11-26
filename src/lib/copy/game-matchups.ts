// src/lib/copy/game-matchups.ts: the Games tab's Matchups section and the History row's `vs` line (Social R3, PR 4).
// Set by /copy-review from the handoff's placeholders (`design/design_handoff_the99_social_r3/social-r3 · copy
// strings.ts`): every string kept as drawn. The empty line is Teaching (nothing else on the screen says what
// fills the section) and stays two sentences; the beat legend is a gloss on a glyph the row cannot spell out.
// NO STRING HERE PRINTS A PERCENTAGE OR `net`: every count carries its denominator, and a row at one game is
// one square. Identity names are `colorLabel`'s (Izzet, Jeskai); these cover what it does not name.
// Opponent labels and friends' names are player-typed and reach no model.

const games = (n: number) => (n === 1 ? "1 game" : `${n} games`);

export const gameMatchupsCopy = {
  matchups: {
    heading: "Matchups",
    /** The band's count, after `Matchups ·`. */
    recorded: (recorded: number, total: number) => `${recorded} of ${total} games`,
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
    counts: (winCount: number, lossCount: number, drawCount: number, otherWinCount: number) =>
      [`W ${winCount}`, `L ${lossCount}`, drawCount > 0 && `D ${drawCount}`, otherWinCount > 0 && `– ${otherWinCount}`].filter(Boolean).join(" · "),
    squareAria: (winCount: number, lossCount: number, drawCount: number, otherWinCount: number) =>
      [winCount && `${winCount} won`, drawCount && `${drawCount} drawn`, lossCount && `${lossCount} lost to them`, otherWinCount && `${otherWinCount} won by someone else`].filter(Boolean).join(", "),
    /** The key under the rows: one entry per square. */
    keyWon: "you won",
    keyLost: "they won",
    keyDrawn: "drawn",
    keyOther: "someone else won",
    fourColors: "Four colors",
    fourColorsSub: (missing: string) => `no ${missing}`,
    fiveColors: "Five colors",
    colorless: "Colorless",
  },
} as const;
