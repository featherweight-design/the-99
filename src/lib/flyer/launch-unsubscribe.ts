/**
 * Leaving the launch list (launch email R2c, G2). SERVER-ONLY.
 *
 * The link's `t` is an HMAC of the case-folded address, keyed by `INVITE_CODE_SECRET` under its own label, so it never
 * collides with an invite or QR token and carries no address. It has no expiry and names no account. A press finds the row
 * whose address makes that token and deletes it; the 30-day purge (`launch-purge.ts`) is untouched and deletes whatever is left.
 *
 * The answer never says whether the address was on the list: a well-formed token is always "done", whether it matched a
 * row, matched one already deleted or purged, or matched nothing. Only a missing or malformed token is "broken".
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { launchList } from "../../db/schema";
import { inviteSecret } from "../invites/tokens";
import { normalizeEmail } from "../invites/rules";

const LABEL = "launch-unsubscribe";
/** 32 bytes of SHA-256 as unpadded base64url. */
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

function mac(secret: string, email: string): Buffer {
  return createHmac("sha256", secret).update(`${LABEL}:${normalizeEmail(email)}`, "utf8").digest();
}

/** The token for an address's unsubscribe link. */
export function unsubscribeToken(secret: string, email: string): string {
  return mac(secret, email).toString("base64url");
}

export function unsubscribeUrl(origin: string, secret: string, email: string): string {
  return `${origin}/unsubscribe?t=${unsubscribeToken(secret, email)}`;
}

export type UnsubscribeOutcome = "done" | "broken";

/** True for a value that could be a token: a press with anything else is "broken" before any read. */
export function tokenShaped(t: unknown): t is string {
  return typeof t === "string" && TOKEN_SHAPE.test(t);
}

/**
 * Deletes the row this token names, if any. The list is small (one address per stranger, purged 30 days after launch), so
 * the match is a scan of its addresses, compared in constant time, rather than a stored token column.
 */
export async function unsubscribeByToken(t: unknown, env: { INVITE_CODE_SECRET?: string } = { INVITE_CODE_SECRET: process.env.INVITE_CODE_SECRET }): Promise<UnsubscribeOutcome> {
  if (!tokenShaped(t)) return "broken";
  const secret = inviteSecret(env);
  if (!secret) return "broken";
  const presented = Buffer.from(t, "base64url");
  const rows = await db.select({ email: launchList.email }).from(launchList);
  const match = rows.find((r) => timingSafeEqual(mac(secret, r.email), presented));
  if (match) await db.delete(launchList).where(eq(launchList.email, match.email));
  return "done";
}
