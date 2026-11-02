import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Undo of an Unhide puts the row back exactly as it was (ruling R1, 2026-11-01): its ORIGINAL `hidden_at`, so it
 * returns to its place in the Hidden list with its own date, not to the top dated today. SERVER-ONLY.
 *
 * The time comes back from the client, so it is never trusted as sent. The unhide hands the client a token that
 * the server signed over the deleted row's `hidden_at`, bound to the reader and the commander; the Undo passes it
 * back, and only a token this server issued, for this row, recently, yields a time. Anything else yields null and
 * the hide falls back to now(), which is what a plain hide writes.
 *
 * The key is derived from `CLERK_SECRET_KEY` under a label of its own: a server-only secret every environment that
 * signs a reader in already holds. Rotating it only expires the tokens in flight (their Undo re-dates the row).
 */

/** How long an unhide's token restores the original time: the Undo row stands until the reader leaves the tab. */
export const RESTORE_TTL_MS = 24 * 60 * 60 * 1000;

const LABEL = "hidden-commander-restore";

function key(env: { CLERK_SECRET_KEY?: string }): Buffer | null {
  const s = env.CLERK_SECRET_KEY;
  if (typeof s !== "string" || s.length < 16) return null;
  return createHmac("sha256", s).update(LABEL, "utf8").digest();
}

function mac(k: Buffer, userId: string, oracleId: string, hiddenMs: number, issuedMs: number): Buffer {
  return createHmac("sha256", k).update(`${userId}:${oracleId}:${hiddenMs}:${issuedMs}`, "utf8").digest();
}

/** The token for a row just unhidden: `<hidden ms>.<issued ms>.<mac>`. Null when the server holds no key. */
export function restoreToken(
  userId: string,
  oracleId: string,
  hiddenAt: Date,
  now: Date = new Date(),
  env: { CLERK_SECRET_KEY?: string } = { CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY },
): string | null {
  const k = key(env);
  const hiddenMs = hiddenAt.getTime();
  if (!k || !Number.isFinite(hiddenMs)) return null;
  const issuedMs = now.getTime();
  return `${hiddenMs}.${issuedMs}.${mac(k, userId, oracleId, hiddenMs, issuedMs).toString("base64url")}`;
}

/** The original `hidden_at` a token carries, or null for any token this server did not issue for this row lately. */
export function readRestoreToken(
  userId: string,
  oracleId: string,
  token: unknown,
  now: Date = new Date(),
  env: { CLERK_SECRET_KEY?: string } = { CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY },
): Date | null {
  if (typeof token !== "string" || token.length > 120) return null;
  const m = /^(\d{1,15})\.(\d{1,15})\.([A-Za-z0-9_-]{43})$/.exec(token);
  const k = key(env);
  if (!m || !k) return null;
  const hiddenMs = Number(m[1]);
  const issuedMs = Number(m[2]);
  const given = Buffer.from(m[3], "base64url");
  const want = mac(k, userId, oracleId, hiddenMs, issuedMs);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;
  const age = now.getTime() - issuedMs;
  // A minute's grace for clock skew between instances; a row is always hidden before it is unhidden.
  if (age < -60_000 || age > RESTORE_TTL_MS || hiddenMs > issuedMs) return null;
  return new Date(hiddenMs);
}
