import type { HistoryRow } from "../../db/schema";
import { collectionEditCopy } from "../copy/collection-edit";
import { wall, zonedToInstant } from "../time/zoned";
import { HISTORY_RETENTION_DAYS } from "./retention";
import type { HistoryListEntry } from "./history";

// What the history list draws, as pure functions over the ledger's entries: the day groups, the
// title, the dates and the long entry's groups. Every date and time is the reader's wall clock in
// the zone the browser reported (`the99_tz`, `src/lib/zone/cookie.ts`), so each function takes the
// zone. Month and weekday names are spelled by hand (English, as the app's copy is), so a server
// render and the browser agree; only the clock reads the browser's locale (`clockLabel`).

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

/** A calendar day in a zone, as a whole number of days since 1970: equal for two instants on the same wall-clock day. */
const dayNumber = (at: Date, zone: string): number => {
  const w = wall(at, zone);
  return Math.round(Date.UTC(w.y, w.mo - 1, w.d) / DAY_MS);
};

/** "Oct 9", in the zone: month first, US order. */
export const dayLabel = (d: Date, zone: string) => {
  const w = wall(d, zone);
  return `${MONTHS[w.mo - 1]} ${w.d}`;
};

/** "Oct 9", or "Dec 30, 2025" when the day is outside the year `now` is in. */
export function dateLabel(d: Date, now: Date, zone: string): string {
  const w = wall(d, zone);
  return w.y === wall(now, zone).y ? dayLabel(d, zone) : `${dayLabel(d, zone)}, ${w.y}`;
}

/**
 * The clock in the zone, "2:02 PM". `locale` undefined is the browser's, which sets 12 or 24 hour ("14:02" in en-GB); the server
 * and the first client render pass "en-US", so they agree, and the browser's follows once hydrated.
 */
export const clockLabel = (d: Date, zone: string, locale?: string) =>
  new Intl.DateTimeFormat(locale, { timeZone: zone, hour: "numeric", minute: "2-digit" }).format(d);

/** "Wednesday, November 18, 2026 at 2:13 PM MST": the `<time>`'s title. */
export const fullStamp = (d: Date, zone: string, locale?: string) =>
  new Intl.DateTimeFormat(locale, {
    timeZone: zone, weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
  }).format(d);

/** Whole minutes between an instant and now, floored; a stamp from the future (clock skew) is "just now". */
const minutesAgo = (d: Date, nowMs: number) => Math.max(0, Math.floor((nowMs - d.getTime()) / MINUTE_MS));

/** The time slot on an entry: "Just now", "12 min ago" under an hour, else the clock (the day group's heading carries the day). */
export function timeSlot(d: Date, nowMs: number, zone: string, locale?: string): string {
  const c = collectionEditCopy.history;
  const min = minutesAgo(d, nowMs);
  if (min < 1) return c.justNow;
  if (min < 60) return c.minAgo(min);
  return clockLabel(d, zone, locale);
}

/**
 * A moment inside a sentence: "just now", "12 min ago", "today at 9:30 AM", "yesterday at 3:15 PM", "Nov 12 at 12:05 PM",
 * "Dec 30, 2025 at 4:00 PM". Days are the reader's, so a revert from a later day no longer reads as the same day's.
 */
export function whenPhrase(d: Date, nowMs: number, zone: string, locale?: string): string {
  const c = collectionEditCopy.history;
  const min = minutesAgo(d, nowMs);
  if (min < 1) return c.justNowLower;
  if (min < 60) return c.minAgo(min);
  const now = new Date(nowMs);
  const ago = dayNumber(now, zone) - dayNumber(d, zone);
  const clock = clockLabel(d, zone, locale);
  if (ago === 0) return c.todayAt(clock);
  if (ago === 1) return c.yesterdayAt(clock);
  return c.dateAt(dateLabel(d, now, zone), clock);
}

/** Whether a tick is owed: some entry is still under an hour old, so its relative label changes within the next minute. */
export const hasRecent = (entries: readonly HistoryListEntry[], nowMs: number) =>
  entries.some((e) => nowMs - e.createdAt.getTime() < 60 * MINUTE_MS);

/** Milliseconds from `nowMs` to the next local midnight in the zone (when "Today" becomes "Yesterday"). */
export function msToLocalMidnight(nowMs: number, zone: string): number {
  const w = wall(new Date(nowMs), zone);
  const next = zonedToInstant({ y: w.y, mo: w.mo, d: w.d + 1, h: 0, mi: 0, s: 0 }, zone);
  return Math.max(1, next.getTime() - nowMs);
}

export type DayGroup = { key: string; label: string; entries: HistoryListEntry[] };

/**
 * Entries newest first, grouped by the reader's calendar day: `Today · Nov 18`, `Yesterday · Nov 17`, a weekday and date for the
 * four days before (`Monday · Nov 16`), then the date alone (`Nov 8`, `Dec 30, 2025` outside this year).
 * A day is one group however the entries arrive: `createdAt` is not guaranteed monotonic down the
 * list, and a day that came back after another would otherwise repeat its key.
 */
export function groupByDay(entries: readonly HistoryListEntry[], nowMs: number, zone: string): DayGroup[] {
  const c = collectionEditCopy.history;
  const now = new Date(nowMs);
  const today = dayNumber(now, zone);
  const groups: DayGroup[] = [];
  const byKey = new Map<string, DayGroup>();
  for (const e of entries) {
    const day = dayNumber(e.createdAt, zone);
    const seen = byKey.get(String(day));
    if (seen) {
      seen.entries.push(e);
      continue;
    }
    const ago = today - day;
    const date = dayLabel(e.createdAt, zone);
    const label =
      ago === 0 ? c.today(date)
      : ago === 1 ? c.yesterday(date)
      : ago >= 2 && ago <= 6 ? c.weekday(WEEKDAYS[new Date(day * DAY_MS).getUTCDay()], date)
      : dateLabel(e.createdAt, now, zone);
    const group = { key: String(day), label, entries: [e] };
    byKey.set(group.key, group);
    groups.push(group);
  }
  return groups;
}

/**
 * The date history reaches back to: the later of the day the ledger shipped and the retention
 * edge, so a history younger than 90 days names its ship date and an older one names the edge.
 */
export function historyReachesBack(ship: Date, nowMs: number): Date {
  return new Date(Math.max(ship.getTime(), nowMs - HISTORY_RETENTION_DAYS * DAY_MS));
}

/** What an entry is called in the list: the file, the card, or what a revert undid. */
export function entryTitle(
  entry: HistoryListEntry,
  byId: ReadonlyMap<string, HistoryListEntry>,
  reachesBack: Date,
  zone: string,
): string {
  const c = collectionEditCopy.history;
  if (entry.kind === "upload_replace" || entry.kind === "upload_add" || entry.kind === "upload_sync") {
    return entry.uploadFilename ?? c.untitled;
  }
  if (entry.kind === "revert") {
    const undone = entry.revertsId ? byId.get(entry.revertsId) : undefined;
    if (undone) return c.undid(entryTitle(undone, byId, reachesBack, zone));
    return entry.revertsVisible ? c.undidOlder : c.undidAged(dayLabel(reachesBack, zone));
  }
  if (entry.kind === "add" && entry.preconName) return c.addedFromPrecon(entry.preconName);
  if (entry.kind === "add" && entry.addedFromDeck?.name) return c.addedFromDeck(entry.addedFromDeck.name);
  if (!entry.firstName) return c.untitled;
  return entry.rowCount > 1 ? c.andMore(entry.firstName, entry.rowCount - 1) : entry.firstName;
}

export type RowGroup = "left" | "down" | "up" | "new" | "details";
const ORDER: RowGroup[] = ["left", "down", "up", "new", "details"];
const qty = (s: { quantity: number } | null) => s?.quantity ?? 0;

/**
 * Which of a long entry's groups a row falls in. A row whose copies did not move still changed: a
 * Replace records a different printing or condition at the same quantity, so it is `details`, never dropped.
 */
export function rowGroup(r: HistoryRow): RowGroup {
  const before = qty(r.before);
  const after = qty(r.after);
  if (before === after) return "details";
  if (after === 0) return "left";
  if (before === 0) return "new";
  return after < before ? "down" : "up";
}

/** A long entry's rows split into its groups, in the fixed order `Left, Went down, Went up, New`. */
export function groupRows(rows: readonly HistoryRow[]): { group: RowGroup; rows: HistoryRow[] }[] {
  const by = new Map<RowGroup, HistoryRow[]>();
  for (const r of rows) {
    const g = rowGroup(r);
    const list = by.get(g);
    if (list) list.push(r);
    else by.set(g, [r]);
  }
  return ORDER.filter((g) => by.has(g)).map((g) => ({ group: g, rows: by.get(g)! }));
}

/** Entries of up to this many rows open in place, listing every row; longer ones are grouped and paged. */
export const SHORT_ENTRY_ROWS = 8;
/** A long entry's first screen, then each `Show more`. */
export const GROUP_FIRST = 8;
export const GROUP_STEP = 30;

export const rowDelta = (r: HistoryRow) => qty(r.after) - qty(r.before);
