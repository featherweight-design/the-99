/**
 * The dates `/friends` draws (Social R1 PR C): a friend's `since`, a link's `made`, its time left and the
 * dialog's expiry. Pure, so the client draws them; `timeZone` is the server's draw's (`"UTC"`) until the page
 * has hydrated and the reader's own after (`undefined`), so the two first renders agree and a clock time is
 * never a stranger's.
 */
import { socialCopy } from "../copy/social";

const DAY_MS = 86_400_000;

function fmt(opts: Intl.DateTimeFormatOptions, timeZone: string | undefined) {
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone });
}

function sameDay(a: Date, b: Date, timeZone: string | undefined): boolean {
  return dayNumber(a, timeZone) === dayNumber(b, timeZone);
}

/** The calendar day `d` falls on in `timeZone`, as a count of days: a day is a date, never 24 hours. */
function dayNumber(d: Date, timeZone: string | undefined): number {
  const parts = fmt({ year: "numeric", month: "numeric", day: "numeric" }, timeZone).formatToParts(d);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return Date.UTC(part("year"), part("month") - 1, part("day")) / DAY_MS;
}

/** `today`, `yesterday`, or `Oct 2`: a friendship's `since`, on the friend row and on the already-friends card. */
export function sinceDay(since: Date, now: Date, timeZone?: string): string {
  // By calendar day in the zone, so a day the clocks change (23 or 25 hours long) still has one yesterday.
  const days = dayNumber(now, timeZone) - dayNumber(since, timeZone);
  if (days === 0) return socialCopy.friends.today;
  if (days === 1) return socialCopy.friends.yesterday;
  return fmt({ month: "short", day: "numeric" }, timeZone).format(since);
}

/** `today, 9:41 PM`, or `Oct 9`: an open link's `made`. */
export function madeWhen(created: Date, now: Date, timeZone?: string): string {
  if (sameDay(created, now, timeZone)) {
    return `${socialCopy.friends.today}, ${fmt({ hour: "numeric", minute: "2-digit" }, timeZone).format(created)}`;
  }
  return fmt({ month: "short", day: "numeric" }, timeZone).format(created);
}

/** Under a day left: the row draws its time left in `--warning`, and the dialog's expiry carries its time. */
export function underADay(expires: Date, now: Date): boolean {
  return expires.getTime() - now.getTime() < DAY_MS;
}

/** `Thu, Oct 22`, or under a day, `Fri, Oct 16, 9:12 PM`: the dialog's expiry. */
export function expiresWhen(expires: Date, now: Date, timeZone?: string): string {
  const opts: Intl.DateTimeFormatOptions = underADay(expires, now)
    ? { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
    : { weekday: "short", month: "short", day: "numeric" };
  return fmt(opts, timeZone).format(expires);
}
