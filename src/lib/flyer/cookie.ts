/**
 * The newcomer's flyer-claim cookie: the claim secret that binds a claim to a browser, httpOnly and scoped to the code's
 * own page. No server-only imports, as the invite cookie's (`src/lib/invites/claim-cookie.ts`).
 */
import { FLYER_PROVEN_HOLD_MS, parseFlyerCode } from "./rules";

export const FLYER_CLAIM_COOKIE = "flyer_claim";

/** This code's own page, and as long as a proven claim holds its place: never sent anywhere else. */
export function flyerCookieOptions(code: string) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: `/join/${parseFlyerCode(code) ?? code}`,
    maxAge: Math.floor(FLYER_PROVEN_HOLD_MS / 1000),
  };
}
