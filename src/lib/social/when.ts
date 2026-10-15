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
  const day = fmt({ year: "numeric", month: "numeric", day: "numeric" }, timeZone);
  return day.format(a) === day.format(b);
}

/** `today`, `yesterday`, or `Oct 2`: a friendship's `since`, on the friend row and on the already-friends card. */
export function sinceDay(since: Date, now: Date, timeZone?: string): string {
  if (sameDay(since, now, timeZone)) return socialCopy.friends.today;
  if (sameDay(since, new Date(now.getTime() - DAY_MS), timeZone)) return socialCopy.friends.yesterday;
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
