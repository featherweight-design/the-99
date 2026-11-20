"use client";

import { createContext, useContext } from "react";

import { validTimeZone } from "../lib/time/zoned";
import { useHydrated } from "./ui/hydrated-art";

const ZoneContext = createContext<string | null>(null);

/**
 * The reader's zone from their `the99_tz` cookie, for the client components below a page that read it (`resolveZone`).
 * A page hands it down once instead of every list threading a prop; a tree with no provider reads null, which is UTC.
 */
export function ZoneProvider({ zone, children }: { zone: string | null; children: React.ReactNode }) {
  return <ZoneContext.Provider value={zone}>{children}</ZoneContext.Provider>;
}

/** The zone a date is read in: the cookie's on the server and the first client paint, the browser's once hydrated (a first visit has no cookie yet). Null is UTC. */
export function useZone(): string | null {
  const cookie = useContext(ZoneContext);
  const hydrated = useHydrated();
  if (!hydrated) return cookie;
  const browser = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return browser && validTimeZone(browser) ? browser : cookie;
}
