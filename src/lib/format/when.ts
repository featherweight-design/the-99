// Relative dates, in the register the refresh frames draw: `today`,
// `2 days ago`, `last week`, `3 weeks ago`, `2 months ago`, and `never` for a
// date that does not exist.
//
// `now` is a parameter and never `new Date()`. A function that reads the clock
// renders one string on the server and a different one on the client the moment
// a boundary is crossed at midnight, and cannot be tested without faking time.

import { wall } from "../time/zoned";

const DAY_MS = 86_400_000;

// An average month, not 30: at 30 the last day before the year boundary reads
// "12 months ago", which the next branch already calls "last year".
const MONTH_DAYS = 365 / 12;

/**
 * Whole CALENDAR days apart, never negative — see the clock-skew test.
 *
 * Counted between midnights of the reader's zone rather than by flooring elapsed milliseconds:
 * 23:59 to 00:01 is two minutes but one day, and "today" is the wrong word for it. `zone` is the
 * reader's (`resolveZone`, `useZone`); null is UTC, the first visit's answer, so the server and the
 * browser agree on one boundary either way.
 */
function daysBetween(then: Date, now: Date, zone: string | null): number {
  const midnight = (d: Date) => {
    const w = wall(d, zone ?? "UTC");
    return Date.UTC(w.y, w.mo - 1, w.d);
  };
  return Math.max(0, Math.round((midnight(now) - midnight(then)) / DAY_MS));
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
}

export function formatWhen(then: Date | null, now: Date, zone: string | null = null): string {
  // The absent date belongs to this vocabulary and not to a caller's. A page
  // that answered it locally would invent a string, and two pages answering it
  // locally would invent two.
  if (then === null) return "never";
  const days = daysBetween(then, now, zone);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "last week";
  if (days < 60) return plural(Math.floor(days / 7), "week");
  if (days < 365) return plural(Math.floor(days / MONTH_DAYS), "month");
  if (days < 730) return "last year";
  return plural(Math.floor(days / 365), "year");
}
