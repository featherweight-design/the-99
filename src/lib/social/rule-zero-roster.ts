/**
 * The roster a tracked game starts from (life tracker, ruling (b), 2026-11-20): who sat where, with which deck, when the
 * tracker page loaded, SEALED so the device can carry it through a reseat and hand it back with the result.
 *
 * The seats name accounts, so the roster is sealed (AES-256-GCM), never hashed or sent in the clear: no account or deck id
 * leaves the server, and only this server can open one. The key is DERIVED from `INVITE_CODE_SECRET` with HKDF-SHA256
 * under its own info label (`ROSTER_INFO`), as the invite hero key is, so this key opens nothing else. The table id is
 * the seal's associated data: a roster opens only for the table it was sealed for. An altered, foreign or re-labelled
 * roster fails the AEAD check and opens as null. Without the secret nothing seals and nothing opens (fail closed).
 * It also seals when it was issued (`startedAt`, the tracker page's load), so a save from an older game's roster cannot
 * replace a newer game's result on the same table (`saveTableResult`).
 */
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { inviteSecret } from "../invites/tokens";
import { isUuid } from "./rules";

/** One Start seat: its number, its player's account and the deck it held, or null while it had none. */
export type RosterSeat = { seat: number; userId: string; deckId: string | null };

const ROSTER_INFO = "the-99/rule-zero-roster/v1";
const MAX_SEATS = 8;

/** The key: `INVITE_CODE_SECRET` under the invite key's own shape rule (`inviteSecret`), else null. */
export function rosterSecret(env: { INVITE_CODE_SECRET?: string } = { INVITE_CODE_SECRET: process.env.INVITE_CODE_SECRET }): string | null {
  return inviteSecret(env);
}

/** An opened roster: when the tracker page issued it (epoch ms) and its Start seats in seat order. */
export type OpenedRoster = { startedAt: number; seats: RosterSeat[] };

function keyBytes(secret: string): Buffer {
  return Buffer.from(hkdfSync("sha256", secret, Buffer.alloc(0), ROSTER_INFO, 32));
}

/** The sealed roster: a fresh 96-bit nonce, the ciphertext, the tag, as base64url. */
export function sealRoster(secret: string, tableId: string, seats: readonly RosterSeat[], startedAt: number = Date.now()): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(secret), nonce);
  cipher.setAAD(Buffer.from(tableId, "utf8"));
  const body = JSON.stringify([startedAt, [...seats].sort((a, b) => a.seat - b.seat).map((s) => [s.seat, s.userId, s.deckId])]);
  const sealed = Buffer.concat([cipher.update(body, "utf8"), cipher.final()]);
  return Buffer.concat([nonce, sealed, cipher.getAuthTag()]).toString("base64url");
}

/** The roster sealed for this table, or null for anything this server did not seal for it. */
export function openRoster(secret: string, tableId: string, roster: unknown): OpenedRoster | null {
  if (typeof roster !== "string" || roster.length > 4096 || !/^[A-Za-z0-9_-]+$/.test(roster)) return null;
  const raw = Buffer.from(roster, "base64url");
  if (raw.length < 29) return null;
  let parsed: unknown;
  try {
    const decipher = createDecipheriv("aes-256-gcm", keyBytes(secret), raw.subarray(0, 12));
    decipher.setAAD(Buffer.from(tableId, "utf8"));
    decipher.setAuthTag(raw.subarray(raw.length - 16));
    parsed = JSON.parse(Buffer.concat([decipher.update(raw.subarray(12, raw.length - 16)), decipher.final()]).toString("utf8"));
  } catch {
    return null;
  }
  // Only this server seals, but the shape is checked anyway: a key leak must not turn into a malformed write.
  if (!Array.isArray(parsed) || parsed.length !== 2) return null;
  const [startedAt, seats] = parsed as unknown[];
  if (typeof startedAt !== "number" || !Number.isSafeInteger(startedAt) || startedAt <= 0) return null;
  if (!Array.isArray(seats) || seats.length === 0 || seats.length > MAX_SEATS) return null;
  const out: RosterSeat[] = [];
  for (const row of seats) {
    if (!Array.isArray(row) || row.length !== 3) return null;
    const [seat, userId, deckId] = row as unknown[];
    if (typeof seat !== "number" || !Number.isInteger(seat) || seat < 1 || seat > MAX_SEATS) return null;
    if (typeof userId !== "string" || userId.length === 0) return null;
    if (deckId !== null && !isUuid(deckId)) return null;
    if (out.some((o) => o.seat === seat || o.userId === userId)) return null;
    out.push({ seat, userId, deckId: deckId as string | null });
  }
  return { startedAt, seats: out };
}
