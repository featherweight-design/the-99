/**
 * A game's date as a note is quoted with: the game log's own locator, `26 Aug`, with the year
 * only when it is not the current one — the log row's own rule (`game-history-row.tsx`). Pure,
 * and shared by the prompt and the validator, so the date the model is shown is the one it is
 * checked against, and a sentence reading "your note from 26 Aug" names the row the player sees.
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
  const stem = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  return d.getUTCFullYear() === currentYear ? stem : `${stem} ${d.getUTCFullYear()}`;
}

/** The year a date is judged against, read once per caller. */
export function currentYear(now: Date = new Date()): number {
  return now.getUTCFullYear();
}

/**
 * Whether `text` names this date, whole: `6 Sep` is not found inside `16 Sep`, and a date with no
 * year is not found inside the same day of another year (`6 Aug 2025`). A substring test passed
 * both, which the ISO form never allowed.
 */
export function mentionsDate(text: string, date: string): boolean {
  const escaped = date.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tail = /\d{4}$/.test(date) ? "(?!\\d)" : "(?!\\d| \\d{4})";
  return new RegExp(`(?<!\\d)${escaped}${tail}`).test(text);
}
