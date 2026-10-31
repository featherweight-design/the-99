/**
 * The overnight hold (handoff G4, Hugh's ruling A): nothing is sent from 21:00 to 09:00 in the DEVICE's time zone.
 * What waited goes at 09:00, one per kind. Pure: every function takes the instant and the zone it is judged in.
 *
 * Time zones are IANA names the browser reported. An unknown name is judged as UTC rather than refused, so a bad row
 * still holds the night somewhere instead of waking a phone.
 */
import { validTimeZone, wall, zonedToInstant } from "../time/zoned";

export const HOLD_FROM = 21;
export const RELEASE_AT = 9;

export { validTimeZone };

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
