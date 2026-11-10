import { cookies } from "next/headers";

import { ZONE_COOKIE, zoneFor } from "./cookie";

/** The reader's zone from their cookie, or null on a first visit (the words then fall back to the store's zone, labelled). */
export async function resolveZone(): Promise<string | null> {
  return zoneFor((await cookies()).get(ZONE_COOKIE)?.value);
}
