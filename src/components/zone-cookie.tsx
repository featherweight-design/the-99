"use client";

import { useEffect } from "react";

import { ZONE_COOKIE, ZONE_COOKIE_MAX_AGE, zoneFor } from "../lib/zone/cookie";

/** Writes the browser's zone to the zone cookie when it is missing or has changed (travel). Draws nothing. */
export function ZoneCookie() {
  useEffect(() => {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const have = document.cookie.split("; ").find((c) => c.startsWith(`${ZONE_COOKIE}=`))?.slice(ZONE_COOKIE.length + 1);
      if (!zone || zoneFor(have) === zone) return;
      const secure = location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${ZONE_COOKIE}=${encodeURIComponent(zone)}; path=/; max-age=${ZONE_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
    } catch {
      // A browser with no zone or no cookie access keeps the store-zone words.
    }
  }, []);
  return null;
}
