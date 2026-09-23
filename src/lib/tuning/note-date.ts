/**
 * A game's date as a note is quoted with: the game log's own locator, `26 Aug`, with the year
 * only when it is not the pack's year. Pure, and shared by the prompt and the validator, so the
 * date the model is shown is the one it is checked against.
 *
 * The log draws the same form (`game-history-row.tsx`), so a sentence reading "your note from
 * 26 Aug" names the row the player sees. The year is judged against the NEWEST game in the pack
 * rather than the clock, which keeps both callers deterministic within one run.
 *
 * UTC, where the log is local: the form stores a picked date at noon local, so the UTC day is
 * the day the player picked for every timezone within twelve hours of UTC.
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function noteDate(playedAt: string, packYear: number): string {
  const d = new Date(playedAt);
  const stem = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  return d.getUTCFullYear() === packYear ? stem : `${stem} ${d.getUTCFullYear()}`;
}

/** The year the pack's dates are read against: its newest game's. */
export function packYear(games: readonly { playedAt: string }[]): number {
  const newest = games.reduce((max, g) => (g.playedAt > max ? g.playedAt : max), "");
  return newest === "" ? new Date(0).getUTCFullYear() : new Date(newest).getUTCFullYear();
}
