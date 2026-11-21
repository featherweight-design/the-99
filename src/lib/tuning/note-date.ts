import { wall } from "../time/zoned";

/**
 * A game's date as a note is quoted with: the game log's own locator, `Aug 26`, with the year
 * only when it is not the current one, the log row's own rule (`game-history-row.tsx`). Pure,
 * and shared by the prompt and the validator, so the date the model is shown is the one it is
 * checked against, and a sentence reading "your note from Aug 26" names the row the player sees.
 *
 * The day is the reader's: `zone` is their zone (`resolveZone`, read in the request that started the run,
 * since the run itself finishes after the response), so a game logged in the evening west of UTC names
 * the day its row shows. Null is UTC, the answer before the browser has reported a zone.
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function noteDate(playedAt: string, currentYear: number, zone: string | null = null): string {
  const w = wall(new Date(playedAt), zone ?? "UTC");
  const stem = `${MONTHS[w.mo - 1]} ${w.d}`;
  return w.y === currentYear ? stem : `${stem}, ${w.y}`;
}

/** The year a date is judged against, in the reader's zone (UTC when none), read once per caller. */
export function currentYear(now: Date = new Date(), zone: string | null = null): number {
  return wall(now, zone ?? "UTC").y;
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
