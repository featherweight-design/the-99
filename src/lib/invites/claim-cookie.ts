/**
 * The newcomer's claim cookie, shared by the proxy (which sets it when the invite page is first loaded, so a first
 * Send code whose response is lost still leaves the browser holding the secret) and the actions (which set it again
 * from the secret the claim bound). No server-only imports: the proxy runs on the edge.
 */
import { HOLD_MS, joinPath } from "./rules";

export const CLAIM_COOKIE = "invite_claim";

/** This invite's own page, and the 7 days its claim holds: never sent anywhere else. */
export function claimCookieOptions(token: string) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: joinPath(token),
    maxAge: Math.floor(HOLD_MS / 1000),
  };
}

/** A fresh claim secret, 256 random bits as base64url. Web Crypto, so the edge can mint it. */
export function mintClaimSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
