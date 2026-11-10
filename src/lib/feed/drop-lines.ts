/**
 * What an Upcoming drops row says about its sale (drop alerts; `STATES-drop-alerts.md`): the kicker's age slot, the sale line,
 * the pre-queue line and the mono store line, in the reader's zone when it is known and differs from the store's, else in the
 * store's zone, labelled. Pure: the server draws with the cookie zone and `now`, the client with the browser's, and a row
 * never counts down (whole clock times, days only).
 */
import { feedCopy } from "../copy/feed";
import { clockWords, dateWords, dayKey, dayWords, daysBetween, STORE_ZONE, weekdayWords, zoneLabel } from "../time/clock";

const words = feedCopy.home.drop;

/** A drop's sale as the row carries it: ISO instants, the post's own zone, and a date that may stand alone. */
export type DropSale = { date: string | null; at: string | null; preQueueAt: string | null; zone: string | null };

/** `ahead` is the plain row; `queue` and `live` paint the kicker (`--accent-text`, `--success`). */
export type DropLines = { age: string; state: "ahead" | "queue" | "live"; sale: string; queue: string | null; store: string };

function ageWords(days: number): string {
  if (days <= 0) return words.age.today;
  return days === 1 ? words.age.tomorrow : words.age.inDays(days);
}

/** How long a drop with an hour stays in the group, and its row keeps the sale lines, after its sale begins. */
export const SALE_LINES_AFTER_MS = 60 * 60 * 1000;

/** Whether the row still speaks of the sale: an hour past `at`, or a day-only drop through its day in the store's zone. The read's own rule (`upcoming.ts`). */
export function saleAhead(sale: DropSale, now: Date): boolean {
  if (sale.at) return now.getTime() < Date.parse(sale.at) + SALE_LINES_AFTER_MS;
  return sale.date !== null && sale.date >= dayKey(now, STORE_ZONE);
}

export function dropLines(sale: DropSale, now: Date, readerZone: string | null): DropLines {
  if (!sale.at) {
    // A day with no hour: the store's calendar says whether it is today.
    const days = Math.round((Date.parse(`${sale.date}T00:00:00Z`) - Date.parse(`${dayKey(now, STORE_ZONE)}T00:00:00Z`)) / 86_400_000);
    return { age: ageWords(days), state: "ahead", sale: words.saleDayOnly(dateWords(sale.date!)), queue: null, store: words.store };
  }
  const at = new Date(sale.at);
  const queueAt = sale.preQueueAt ? new Date(sale.preQueueAt) : null;
  const store = sale.zone ?? STORE_ZONE;
  const label = zoneLabel(store);
  // The reader's own clock only when it tells a different time than the store's; a Pacific reader reads the store's words.
  const own = readerZone && (dayWords(at, readerZone) !== dayWords(at, store) || clockWords(at, readerZone) !== clockWords(at, store)) ? readerZone : null;
  const view = own ?? store;
  const tag = own ? words.yourTime : label;
  const clock = (d: Date) => `${clockWords(d, view)} ${tag}`;
  const live = now.getTime() >= at.getTime();
  const open = queueAt !== null && now.getTime() >= queueAt.getTime();

  let queue: string | null = null;
  if (queueAt && !live) {
    const day = dayKey(queueAt, view) !== dayKey(at, view) ? `${weekdayWords(queueAt, view)} ` : "";
    // The reader's own clock goes unlabelled; the store's carries its label.
    const when = `${day}at ${clockWords(queueAt, view)}${own ? "" : ` ${label}`}`;
    queue = open ? words.queueOpened(when) : words.queueOpens(when);
  }
  const storeLine = !own
    ? words.store
    : words.storeClock(`${dayKey(at, view) !== dayKey(at, store) ? `${weekdayWords(at, store)} ` : ""}${clockWords(at, store)} ${label}`);
  return {
    age: live ? words.age.live : open ? words.age.queueOpen : ageWords(daysBetween(now, at, view)),
    state: live ? "live" : open ? "queue" : "ahead",
    sale: live ? words.saleSince(clock(at)) : words.sale(dayWords(at, view), clock(at)),
    queue,
    store: storeLine,
  };
}
