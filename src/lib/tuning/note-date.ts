/**
 * A game's date as a note is quoted with: the game log's own locator, `Aug 26`, with the year
 * only when it is not the current one — the log row's own rule (`game-history-row.tsx`). Pure,
 * and shared by the prompt and the validator, so the date the model is shown is the one it is
 * checked against, and a sentence reading "your note from Aug 26" names the row the player sees.
 *
 * UTC, where the log is local. A PICKED date is stored at noon local, so its UTC day is the one
 * picked for every timezone within twelve hours of UTC. A game logged as TODAY is stored at the
 * instant it was logged, so one logged in the evening west of UTC reads as the next day here
 * while its row shows the day it was played. The server has no timezone to correct by; the
 * prompt and the validator agree with each other either way, which is what the check needs.
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function noteDate(playedAt: string, currentYear: number): string {
  const d = new Date(playedAt);
  const stem = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  return d.getUTCFullYear() === currentYear ? stem : `${stem}, ${d.getUTCFullYear()}`;
}

/** The year a date is judged against, read once per caller. */
export function currentYear(now: Date = new Date()): number {
  return now.getUTCFullYear();
}

/**
 * Whether `text` names this date, whole: `Sep 6` is not found inside `Sep 16`, and a date with no
 * year is not found inside the same day of another year (`Aug 6, 2025`). A substring test passed
 * both, which the ISO form never allowed.
 */
export function mentionsDate(text: string, date: string): boolean {
  const escaped = date.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tail = /\d{4}$/.test(date) ? "(?!\\d)" : "(?!\\d|,? \\d{4})";
  return new RegExp(`(?<![A-Za-z])${escaped}${tail}`).test(text);
}
