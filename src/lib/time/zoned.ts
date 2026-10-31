/**
 * Wall-clock time in an IANA zone the browser reported, and back. Pure: every function takes the instant and the zone.
 * Shared by push's overnight hold (`src/lib/push/hold.ts`) and Rule 0's morning close (`src/lib/rule-zero/rules.ts`).
 */
export function validTimeZone(timeZone: string): boolean {
  if (typeof timeZone !== "string" || timeZone.length === 0 || timeZone.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export type Wall = { y: number; mo: number; d: number; h: number; mi: number; s: number };

export function wall(at: Date, timeZone: string): Wall {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
  }).formatToParts(at);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: n("year"), mo: n("month"), d: n("day"), h: n("hour"), mi: n("minute"), s: n("second") };
}

const asUtc = (w: Wall): number => Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s);

/** The instant a wall-clock time falls on in a zone. Two passes, so a time after a DST change lands on the right side of it. */
export function zonedToInstant(w: Wall, timeZone: string): Date {
  let guess = asUtc(w);
  for (let i = 0; i < 2; i++) guess = asUtc(w) - (asUtc(wall(new Date(guess), timeZone)) - guess);
  return new Date(guess);
}
