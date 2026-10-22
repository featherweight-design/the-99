/**
 * The overnight hold (handoff G4, Hugh's ruling A): nothing is sent from 21:00 to 09:00 in the DEVICE's time zone.
 * What waited goes at 09:00, one per kind. Pure: every function takes the instant and the zone it is judged in.
 *
 * Time zones are IANA names the browser reported. An unknown name is judged as UTC rather than refused, so a bad row
 * still holds the night somewhere instead of waking a phone.
 */
export const HOLD_FROM = 21;
export const RELEASE_AT = 9;

export function validTimeZone(timeZone: string): boolean {
  if (typeof timeZone !== "string" || timeZone.length === 0 || timeZone.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

type Wall = { y: number; mo: number; d: number; h: number; mi: number; s: number };

function wall(at: Date, timeZone: string): Wall {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
  }).formatToParts(at);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: n("year"), mo: n("month"), d: n("day"), h: n("hour"), mi: n("minute"), s: n("second") };
}

const asUtc = (w: Wall): number => Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s);

/** The instant a wall-clock time falls on in a zone. Two passes, so a time after a DST change lands on the right side of it. */
function zonedToInstant(w: Wall, timeZone: string): Date {
  let guess = asUtc(w);
  for (let i = 0; i < 2; i++) guess = asUtc(w) - (asUtc(wall(new Date(guess), timeZone)) - guess);
  return new Date(guess);
}

/** The zone a row is judged in: its own when valid, else UTC. */
export const judgedZone = (timeZone: string): string => (validTimeZone(timeZone) ? timeZone : "UTC");

/** Whether `now` falls in the held hours (21:00 up to, not including, 09:00) in the zone. */
export function isHeld(now: Date, timeZone: string): boolean {
  const h = wall(now, judgedZone(timeZone)).h;
  return h >= HOLD_FROM || h < RELEASE_AT;
}

/** When a push held at `now` goes out: the next 09:00 in the zone. Null when `now` is not in the held hours. */
export function releaseAt(now: Date, timeZone: string): Date | null {
  const zone = judgedZone(timeZone);
  if (!isHeld(now, zone)) return null;
  const w = wall(now, zone);
  // From 21:00 the release is tomorrow's 09:00; before 09:00 it is today's.
  const day = w.h >= HOLD_FROM ? new Date(Date.UTC(w.y, w.mo - 1, w.d + 1)) : new Date(Date.UTC(w.y, w.mo - 1, w.d));
  return zonedToInstant({ y: day.getUTCFullYear(), mo: day.getUTCMonth() + 1, d: day.getUTCDate(), h: RELEASE_AT, mi: 0, s: 0 }, zone);
}
