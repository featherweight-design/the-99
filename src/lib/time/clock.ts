/**
 * Clock and day words in a zone, as the drop alerts say them (`9 a.m.`, `1:30 p.m. PT`, `Mon Nov 16`). Pure and zone-explicit:
 * the server draws with the reader's cookie zone, the client with the browser's, and neither guesses the other's.
 */

/** The zones a drop is written in (`announcements/on-sale.ts`), by the label a post uses for them. */
const ZONE_LABEL: Record<string, string> = {
  "America/Los_Angeles": "PT", "America/Denver": "MT", "America/Chicago": "CT", "America/New_York": "ET", UTC: "UTC",
};

/** The US store's day: a drop with a date and no hour is on sale on this zone's calendar day. */
export const STORE_ZONE = "America/Los_Angeles";

/** `PT`, `ET`: a zone's label, or its own name when the drop was written in a zone with none. */
export const zoneLabel = (zone: string): string => ZONE_LABEL[zone] ?? zone;

function parts(at: Date, zone: string, opts: Intl.DateTimeFormatOptions) {
  const found = new Intl.DateTimeFormat("en-US", { timeZone: zone, ...opts }).formatToParts(at);
  return (type: string) => found.find((p) => p.type === type)?.value ?? "";
}

/** `9 a.m.`, `1:30 p.m.`: a whole hour drops its minutes. */
export function clockWords(at: Date, zone: string): string {
  const p = parts(at, zone, { hour: "numeric", minute: "2-digit", hour12: true });
  return `${p("hour")}${p("minute") === "00" ? "" : `:${p("minute")}`} ${p("dayPeriod").toLowerCase().replace(/^([ap])m$/, "$1.m.")}`;
}

/** `Mon`: the weekday the instant falls on in the zone. */
export const weekdayWords = (at: Date, zone: string): string => parts(at, zone, { weekday: "short" })("weekday");

/** `Mon Nov 16`: the day the instant falls on in the zone. */
export function dayWords(at: Date, zone: string): string {
  const p = parts(at, zone, { weekday: "short", month: "short", day: "numeric" });
  return `${p("weekday")} ${p("month")} ${p("day")}`;
}

/** `Mon Nov 23`: a calendar date (`YYYY-MM-DD`) as the day it names, with no zone to shift it. */
export function dateWords(date: string): string {
  const p = parts(new Date(`${date}T12:00:00Z`), "UTC", { weekday: "short", month: "short", day: "numeric" });
  return `${p("weekday")} ${p("month")} ${p("day")}`;
}

/** The calendar day the instant falls on in the zone, as `YYYY-MM-DD`. */
export function dayKey(at: Date, zone: string): string {
  const p = parts(at, zone, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${p("year")}-${p("month")}-${p("day")}`;
}

/** Whole calendar days from `from`'s day to `to`'s day in the zone: a day is a date, never 24 hours. */
export function daysBetween(from: Date, to: Date, zone: string): number {
  return Math.round((Date.parse(`${dayKey(to, zone)}T00:00:00Z`) - Date.parse(`${dayKey(from, zone)}T00:00:00Z`)) / 86_400_000);
}
