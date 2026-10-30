/**
 * The newcomer's flyer-claim cookie: the claim secret that binds a claim to a browser, httpOnly and scoped to the join
 * pages. No server-only imports, as the invite cookie's (`src/lib/invites/claim-cookie.ts`).
 */
import { FLYER_HOLD_MS, FLYER_PROVEN_HOLD_MS, parseFlyerCode } from "./rules";

/** One cookie per code, named by its upper-case form, so a second flyer in another tab never overwrites the first's secret. */
export function flyerCookieName(code: string): string {
  return `flyer_claim_${parseFlyerCode(code) ?? "x"}`;
}

/**
 * The `/join` pages, and as long as a claim can hold its place at most: its ten minutes to prove the code, then the
 * hour a proven claim holds, counted from the proof. Never sent anywhere else.
 */
export function flyerCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    // The `/join` tree, not the code\'s own path: cookie paths are case-sensitive and a flyer URL may be typed in lower case.
    path: "/join",
    maxAge: Math.floor((FLYER_HOLD_MS + FLYER_PROVEN_HOLD_MS) / 1000),
  };
}
