import { validTimeZone } from "../time/zoned";

/** The reader's IANA zone, set by the browser on a visit so the server's first paint is in their zone, not the store's. */
export const ZONE_COOKIE = "the99_tz";
export const ZONE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** The zone a cookie value names, or null for none or one the runtime does not know (a stale or hand-edited cookie). */
export function zoneFor(value: string | undefined): string | null {
  if (!value) return null;
  const zone = decodeURIComponent(value);
  return validTimeZone(zone) ? zone : null;
}
