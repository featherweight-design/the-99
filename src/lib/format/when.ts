// Relative dates, in the register the refresh frames draw: `today`,
// `2 days ago`, `last week`, `3 weeks ago`, `2 months ago`.
//
// `now` is a parameter and never `new Date()`. A function that reads the clock
// renders one string on the server and a different one on the client the moment
// a boundary is crossed at midnight, and cannot be tested without faking time.

const DAY_MS = 86_400_000;

// An average month, not 30: at 30 the last day before the year boundary reads
// "12 months ago", which the next branch already calls "last year".
const MONTH_DAYS = 365 / 12;

/** Whole elapsed days, floored, and never negative — see the clock-skew test. */
function daysBetween(then: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / DAY_MS));
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
}

export function formatWhen(then: Date, now: Date): string {
  const days = daysBetween(then, now);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "last week";
  if (days < 60) return plural(Math.floor(days / 7), "week");
  if (days < 365) return plural(Math.floor(days / MONTH_DAYS), "month");
  if (days < 730) return "last year";
  return plural(Math.floor(days / 365), "year");
}
