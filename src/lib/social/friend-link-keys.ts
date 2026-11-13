/**
 * A player's reusable friend link and short code (friend links R1, Hugh's H1 and H3): minted on first read, shown
 * again from the row's id, retired by Reset. The link is `/friend/<token>` with a 128-bit token in `isInviteToken`'s
 * shape; the code is six characters (`friend-code.ts`). Both are DERIVED from the row id with `INVITE_CODE_SECRET`,
 * under labels of their own (the invite secrets use others, `invites/tokens.ts`), and never stored: the row holds a
 * keyed HMAC of each, which is what a presented token or code is looked up by. A database read alone therefore gives
 * back no live link and no code. Rotating the key ends every live link and code at once (a presented one no longer
 * hashes to its row), and the owner's next read retires the row and mints a new pair. A retired code is never issued
 * again UNDER THE SAME KEY (its HMAC stays unique); after a rotation a new mint could in principle draw an old code,
 * at odds of the retired count in 8.9 × 10⁸.
 *
 * A wrong code and a retired one are the SAME lookup (one indexed read on the HMAC, live rows only), so a caller
 * cannot tell a code that once existed from one that never did. The same holds for tokens.
 */
import { createHmac, randomUUID } from "node:crypto";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { friendLinkKeys, socialProfiles } from "../../db/schema";
import { isInviteToken } from "./client-rules";
import { FRIEND_CODE_ALPHABET, FRIEND_CODE_LENGTH, normalizeFriendCode } from "./friend-code";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function mac(secret: string, label: string, value: string): Buffer {
  return createHmac("sha256", secret).update(`${label}:${value}`, "utf8").digest();
}

/** The link token for a key row: 128 bits, base64url (22 characters, `isInviteToken`), the same every time for the same id and key. */
export function deriveLinkToken(secret: string, keyId: string): string {
  return mac(secret, "friend-link-token", keyId).subarray(0, 16).toString("base64url");
}

/**
 * The code for a key row: six symbols from the alphabet, drawn from the HMAC's bytes by rejection (a byte at or above
 * 248, the largest multiple of 31 under 256, is skipped), so every symbol is equally likely.
 */
export function deriveFriendCode(secret: string, keyId: string): string {
  const limit = 256 - (256 % FRIEND_CODE_ALPHABET.length);
  let out = "";
  for (let round = 0; out.length < FRIEND_CODE_LENGTH; round++) {
    for (const byte of mac(secret, "friend-link-code", `${keyId}:${round}`)) {
      if (byte >= limit) continue;
      out += FRIEND_CODE_ALPHABET[byte % FRIEND_CODE_ALPHABET.length];
      if (out.length === FRIEND_CODE_LENGTH) break;
    }
  }
  return out;
}

/** The stored form of a token: keyed like the code's, so rotating the key ends every live link at once. */
export function linkTokenHash(secret: string, token: string): string {
  return mac(secret, "friend-link-token-store", token).toString("hex");
}

/** The stored form of a code: keyed, so a stolen table cannot be walked back through all 8.9 × 10⁸ codes. */
export function friendCodeHmac(secret: string, code: string): string {
  return mac(secret, "friend-code", code).toString("hex");
}

export type LinkKey = { token: string; code: string; createdAt: Date };
/** `noProfile`: the account has no social profile (never made, or purged), so no key is minted for it. */
export type LinkKeyResult = { ok: true; key: LinkKey } | { ok: false; reason: "unconfigured" | "noProfile" };

const lockOwner = (tx: Tx, userId: string) =>
  tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`friend-link-key:${userId}`}, 0))`);

/** How many fresh ids a mint tries before giving up: a clash needs a code already issued, at odds of one in millions. */
const MINT_TRIES = 5;

/**
 * A new key row, inside the owner's lock. Null when the account has no profile: the purge deletes the profile and then
 * unlinks keys under the same lock, so a mint either commits first (and is unlinked) or runs after and finds no profile.
 */
async function mintIn(tx: Tx, userId: string, secret: string, now: Date): Promise<LinkKey | null> {
  const [profile] = await tx.select({ userId: socialProfiles.userId }).from(socialProfiles).where(eq(socialProfiles.userId, userId));
  if (!profile) return null;
  for (let i = 0; i < MINT_TRIES; i++) {
    const id = randomUUID();
    const token = deriveLinkToken(secret, id);
    const code = deriveFriendCode(secret, id);
    // No target: ANY clash (a code or token already issued) leaves nothing written, and another id is tried. The live
    // row's own index cannot clash, because the caller holds the owner's lock and has retired the old one.
    const [row] = await tx
      .insert(friendLinkKeys)
      .values({ id, userId, tokenHash: linkTokenHash(secret, token), codeHmac: friendCodeHmac(secret, code), createdAt: now })
      .onConflictDoNothing()
      .returning({ id: friendLinkKeys.id });
    if (row) return { token, code, createdAt: now };
  }
  throw new Error("friend link key: no free code after retries");
}

/**
 * The viewer's own live link and code, minted on the first read. The common case (a live row the current key derives)
 * is one plain read; a missing row, or one whose stored hash the current key no longer derives (the key was rotated),
 * is settled in the owner's lock: retired and replaced. A Reset in another tab can still retire the pair just shown;
 * that tab's next read shows the new one.
 */
export async function ownLinkKey(viewerId: string, secret: string | null, now: Date = new Date()): Promise<LinkKeyResult> {
  if (!secret) return { ok: false, reason: "unconfigured" };
  const current = await liveKeyIn(db, viewerId, secret);
  if (current) return { ok: true, key: current };
  return db.transaction(async (tx) => {
    await lockOwner(tx, viewerId);
    const again = await liveKeyIn(tx, viewerId, secret);
    if (again) return { ok: true as const, key: again };
    await tx
      .update(friendLinkKeys)
      .set({ retiredAt: now })
      .where(and(eq(friendLinkKeys.userId, viewerId), isNull(friendLinkKeys.retiredAt)));
    return minted(await mintIn(tx, viewerId, secret, now));
  });
}

/** The live row's pair when the current key derives it, else null. */
async function liveKeyIn(q: Tx | typeof db, viewerId: string, secret: string): Promise<LinkKey | null> {
  const [live] = await q
    .select({ id: friendLinkKeys.id, tokenHash: friendLinkKeys.tokenHash, createdAt: friendLinkKeys.createdAt })
    .from(friendLinkKeys)
    .where(and(eq(friendLinkKeys.userId, viewerId), isNull(friendLinkKeys.retiredAt)));
  if (!live) return null;
  const token = deriveLinkToken(secret, live.id);
  if (linkTokenHash(secret, token) !== live.tokenHash) return null;
  return { token, code: deriveFriendCode(secret, live.id), createdAt: live.createdAt };
}

const minted = (key: LinkKey | null): LinkKeyResult => (key ? { ok: true, key } : { ok: false, reason: "noProfile" });

/**
 * Reset (G5, H3): the live link and code retire together and a new pair is minted, in one transaction under the
 * owner's lock. Requests already waiting are untouched. The caller enforces `friend-reset-day` before calling.
 */
export async function resetLinkKey(viewerId: string, secret: string | null, now: Date = new Date()): Promise<LinkKeyResult> {
  if (!secret) return { ok: false, reason: "unconfigured" };
  return db.transaction(async (tx) => {
    await lockOwner(tx, viewerId);
    await tx
      .update(friendLinkKeys)
      .set({ retiredAt: now })
      .where(and(eq(friendLinkKeys.userId, viewerId), isNull(friendLinkKeys.retiredAt)));
    return minted(await mintIn(tx, viewerId, secret, now));
  });
}

const live = and(isNotNull(friendLinkKeys.userId), isNull(friendLinkKeys.retiredAt));

/**
 * The account a link token opens, or null: unknown, retired and malformed all read null. Server-only, and the id never
 * leaves `src/lib/social/`: the request writes take it from here.
 */
export async function linkOwnerIn(q: Tx | typeof db, token: unknown, secret: string | null): Promise<string | null> {
  if (!isInviteToken(token) || !secret) return null;
  const [row] = await q
    .select({ userId: friendLinkKeys.userId })
    .from(friendLinkKeys)
    .where(and(eq(friendLinkKeys.tokenHash, linkTokenHash(secret, token)), live));
  return row?.userId ?? null;
}

/** The account a typed code names, or null: one lookup whatever the code, so a retired code reads as one never issued. */
export async function codeOwnerIn(q: Tx | typeof db, raw: unknown, secret: string | null): Promise<string | null> {
  const code = normalizeFriendCode(raw);
  if (!code || !secret) return null;
  const [row] = await q
    .select({ userId: friendLinkKeys.userId })
    .from(friendLinkKeys)
    .where(and(eq(friendLinkKeys.codeHmac, friendCodeHmac(secret, code)), live));
  return row?.userId ?? null;
}

/**
 * The account purge's half, after its profile delete: the account's keys are unlinked and retired, never deleted, so no
 * code is issued twice under the key. Under the owner's lock, so a mint under way commits first and is unlinked here.
 */
export async function unlinkLinkKeysIn(tx: Tx, userId: string, now: Date = new Date()): Promise<void> {
  await lockOwner(tx, userId);
  await tx
    .update(friendLinkKeys)
    .set({ userId: null, retiredAt: sql`coalesce(${friendLinkKeys.retiredAt}, ${now})` })
    .where(eq(friendLinkKeys.userId, userId));
}
