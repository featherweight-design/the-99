/**
 * When a Secret Lair post says its sale starts, read from the post's own words (no model call).
 *
 * The date and the time are separate facts: a post may name the day long before the hour, so a date with no
 * readable time keeps the date and leaves `at` null. A time is read only with a named US zone ("9 a.m. PT"):
 * a bare clock time is never placed in a zone by guess. The instant is computed in that zone's rules for that
 * day (Pacific time is UTC-8 in November and UTC-7 in August), never a fixed offset.
 */
import { htmlToText } from "./html";

export type OnSale = {
  /** The day the post gives for the sale (`YYYY-MM-DD`), or null when no sale date is stated. */
  date: string | null;
  /** The sale's start as a UTC instant, or null when the post names no hour (or no zone). */
  at: string | null;
  /** The IANA zone the post's clock time was written in; null exactly when `at` is. */
  zone: string | null;
  /** When the pre-queue opens, a UTC instant; null when the post has none. */
  preQueueAt: string | null;
};

const ZONES: Record<string, string> = {
  PT: "America/Los_Angeles", PST: "America/Los_Angeles", PDT: "America/Los_Angeles",
  MT: "America/Denver", MST: "America/Denver", MDT: "America/Denver",
  CT: "America/Chicago", CST: "America/Chicago", CDT: "America/Chicago",
  ET: "America/New_York", EST: "America/New_York", EDT: "America/New_York",
  UTC: "UTC", GMT: "UTC",
};

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

const CLOCK = String.raw`(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s?m\.?\s*(PT|PST|PDT|MT|MST|MDT|CT|CST|CDT|ET|EST|EDT|UTC|GMT)\b`;
const SALE_TIME = new RegExp(String.raw`(?:goes live|go live|on sale|sale (?:begins|starts|opens)|launch(?:es)?|available)[^.]{0,40}?\bat\s+${CLOCK}`, "gi");
const PRE_QUEUE_TIME = new RegExp(String.raw`pre-?queue (?:opens|begins|starts)[^.]{0,20}?\bat\s+${CLOCK}`, "gi");
// A whole month name or a standard abbreviation, so "Marvel 20" and "Decks 5" are not March 20 and December 5.
const MONTH_WORD = `${MONTHS.map((m) => m[0].toUpperCase() + m.slice(1)).join("|")}|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec`;
const DATE_WORDS = new RegExp(String.raw`\b(${MONTH_WORD})\b\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b`, "g");
/** A date counts as the sale's when the words just before it speak of the sale. */
const SALE_CONTEXT = /(arriv(?:es|ing)|launch(?:es|ing)?\b|on sale|goes live|go live|available)[^.]{0,60}$/i;

/** The UTC offset of `zone` at instant `ts`, in ms (a negative number west of Greenwich). */
function offsetMs(ts: number, zone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric",
  }).formatToParts(new Date(ts));
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute")) - Math.floor(ts / 60_000) * 60_000;
}

/** The instant a wall-clock time falls at in `zone`. */
function zonedInstant(y: number, mo: number, d: number, h: number, min: number, zone: string): string {
  const guess = Date.UTC(y, mo - 1, d, h, min);
  const first = guess - offsetMs(guess, zone);
  return new Date(guess - offsetMs(first, zone)).toISOString();
}

function clockOf(m: RegExpMatchArray): { h: number; min: number; zone: string } {
  const hour = Number(m[1]) % 12;
  return { h: m[3].toLowerCase() === "p" ? hour + 12 : hour, min: m[2] ? Number(m[2]) : 0, zone: ZONES[m[4].toUpperCase()] };
}

const validClock = (m: RegExpMatchArray) => Number(m[1]) >= 1 && Number(m[1]) <= 12 && (!m[2] || Number(m[2]) < 60);

/** The first clock time a pattern finds that reads as a time and is not a pre-queue line (when `skipQueue`). */
function firstClock(text: string, re: RegExp, skipQueue: boolean): RegExpMatchArray | null {
  for (const m of text.matchAll(re)) {
    if (!validClock(m)) continue;
    if (skipQueue && /pre-?queue/i.test(text.slice(Math.max(0, m.index - 25), m.index + m[0].length))) continue;
    return m;
  }
  return null;
}

/** An explicit "PST" or "PDT" is one fixed offset; when the day's real offset in the zone differs, the post's clock is not read. */
function abbreviationHolds(abbr: string, instant: string, zone: string): boolean {
  const a = abbr.toUpperCase();
  const base = { P: -8, M: -7, C: -6, E: -5 }[a[0] as "P" | "M" | "C" | "E"];
  if (a.length !== 3 || base === undefined) return true;
  return offsetMs(Date.parse(instant), zone) === (base + (a[1] === "D" ? 1 : 0)) * 3_600_000;
}

/** The sale day: the first date written near sale words, in the year the post names, else the post's own year or the next. */
function saleDate(text: string, publishedAt: string): { y: number; mo: number; d: number } | null {
  for (const m of text.matchAll(DATE_WORDS)) {
    if (!SALE_CONTEXT.test(text.slice(Math.max(0, m.index - 80), m.index))) continue;
    const mo = MONTHS.findIndex((name) => name.startsWith(m[1].toLowerCase())) + 1;
    const d = Number(m[2]);
    if (mo < 1 || d < 1 || d > 31) continue;
    let y = m[3] ? Number(m[3]) : Number(publishedAt.slice(0, 4));
    // No year written: a date nearly a year behind the post is next year's ("January 8" in a December post); a recent
    // past date ("launched on October 1") stays in this year, where its row is already gone.
    if (!m[3] && Date.UTC(y, mo - 1, d) < Date.parse(publishedAt) - 300 * 86_400_000) y += 1;
    if (new Date(Date.UTC(y, mo - 1, d)).getUTCMonth() !== mo - 1) continue;
    return { y, mo, d };
  }
  return null;
}

/** Reads the sale start from a post's body HTML; null when it states no sale date at all. */
export function parseOnSale(bodyHtml: string, publishedAt: string): OnSale | null {
  // "Nov." would end the sentence-bounded gaps below; the month's own period is not one.
  const text = htmlToText(bodyHtml).replace(/\b(Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\./g, "$1");
  const day = saleDate(text, publishedAt);
  if (!day) return null;
  const date = `${String(day.y).padStart(4, "0")}-${String(day.mo).padStart(2, "0")}-${String(day.d).padStart(2, "0")}`;
  const dateOnly = { date, at: null, zone: null, preQueueAt: null };
  const sale = firstClock(text, SALE_TIME, true);
  if (!sale) return dateOnly;
  const c = clockOf(sale);
  const at = zonedInstant(day.y, day.mo, day.d, c.h, c.min, c.zone);
  if (!abbreviationHolds(sale[4], at, c.zone)) return dateOnly;
  const queue = firstClock(text, PRE_QUEUE_TIME, false);
  const q = queue ? clockOf(queue) : null;
  const preQueueAt = q && queue && abbreviationHolds(queue[4], zonedInstant(day.y, day.mo, day.d, q.h, q.min, q.zone), q.zone)
    ? zonedInstant(day.y, day.mo, day.d, q.h, q.min, q.zone) : null;
  return { date, at, zone: c.zone, preQueueAt };
}
