/**
 * Leaving the launch list (launch email R2c, G2). SERVER-ONLY.
 *
 * The link's `t` is an HMAC of the case-folded address, keyed by `INVITE_CODE_SECRET` under its own label, so it never
 * collides with an invite or QR token and carries no address. It has no expiry and names no account. The send writes the
 * token's SHA-256 on the row with its claim (`launch-send.ts`); a press deletes the row with that hash in one indexed
 * statement, so a press costs the same whatever the list holds and the table never stores a usable token. The 30-day purge
 * (`launch-purge.ts`) is untouched and deletes whatever is left.
 *
 * The answer never says whether the address was on the list: a well-formed token is always "done", whether it matched a
 * row, matched one already deleted or purged, or matched nothing. Only a missing or malformed token is "broken".
 */
import { createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { launchList } from "../../db/schema";
import { secretHash } from "../invites/tokens";
import { normalizeEmail } from "../invites/rules";

const LABEL = "launch-unsubscribe";
/** 32 bytes of SHA-256 as unpadded base64url. */
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

/** The token for an address's unsubscribe link. */
export function unsubscribeToken(secret: string, email: string): string {
  return createHmac("sha256", secret).update(`${LABEL}:${normalizeEmail(email)}`, "utf8").digest("base64url");
}

export function unsubscribeUrl(origin: string, secret: string, email: string): string {
  return `${origin}/unsubscribe?t=${unsubscribeToken(secret, email)}`;
}

/** What the row stores for a token, and a press looks it up by. */
export function unsubscribeHash(token: string): string {
  return secretHash(token);
}

export type UnsubscribeOutcome = "done" | "broken";

/** True for a value that could be a token: a press with anything else is "broken" before any read. */
export function tokenShaped(t: unknown): t is string {
  return typeof t === "string" && TOKEN_SHAPE.test(t);
}

/** Deletes the row this token names, if any. `matched` is for the caller's rate count only; it never reaches the reader. */
export async function unsubscribeByToken(t: unknown): Promise<{ outcome: UnsubscribeOutcome; matched: boolean }> {
  if (!tokenShaped(t)) return { outcome: "broken", matched: false };
  const gone = await db.delete(launchList).where(eq(launchList.unsubscribeHash, unsubscribeHash(t))).returning({ email: launchList.email });
  return { outcome: "done", matched: gone.length > 0 };
}
