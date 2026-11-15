/**
 * The invite secrets (plan `2026-10-16-invites.md`): the QR token, the newcomer's browser binding and the code.
 * Each is keyed by `INVITE_CODE_SECRET` under a label of its own, so no two can collide.
 *
 * - The QR token is DERIVED from the reservation's id, never stored: the database holds its SHA-256 alone, so a
 *   database read cannot rebuild a live QR, while the server can re-show one from a fresh page (R3).
 * - The claim secret binds a claim to the newcomer's browser (an httpOnly cookie); only its hash is stored.
 * - The code is stored as an HMAC over the reservation id and the code, so a stored value read alone does not give
 *   the six digits back by trying all million.
 */
import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { CODE_LENGTH } from "./rules";

/** The key: at least 32 bytes as hex (64 characters, what each project holds), else null. */
export function inviteSecret(env: { INVITE_CODE_SECRET?: string }): string | null {
  const s = env.INVITE_CODE_SECRET;
  return typeof s === "string" && /^[0-9a-f]{64,}$/i.test(s) ? s : null;
}

function mac(secret: string, label: string, value: string): Buffer {
  return createHmac("sha256", secret).update(`${label}:${value}`, "utf8").digest();
}

/** The QR token for a reservation: 256 bits, base64url, the same every time for the same id and key. */
export function qrToken(secret: string, reservationId: string): string {
  return mac(secret, "qr-token", reservationId).toString("base64url");
}

/** What the database stores for a token or a claim secret, and looks a presented one up by. */
export function secretHash(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** A fresh claim secret for the newcomer's cookie: 256 random bits, base64url. */
export function newClaimSecret(): string {
  return randomBytes(32).toString("base64url");
}

/** A fresh code: six digits, leading zeros kept, from a uniform draw. */
export function newCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

/** The stored form of a code, bound to its reservation. */
export function codeHmac(secret: string, reservationId: string, code: string): string {
  return mac(secret, "invite-code", `${reservationId}:${code}`).toString("hex");
}

/** Whether two stored hex values are equal, in time that does not depend on where they differ. */
export function sameHex(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

/**
 * The key in an invite email's hand-image address: the reservation's id, sealed (AES-256-GCM), then base64url. The raw id is also
 * in Clerk's invitation metadata, so it never rides in a URL; a hash could not be turned back into a row without a stored column,
 * so the id is SEALED rather than hashed. The sealing key is DERIVED from the invite secret with HKDF-SHA256 under its own info
 * label (`HERO_KEY_INFO`), never the secret itself, so a key opens only here and the label binds it to this one use. Each seal
 * draws a fresh random 96-bit nonce (the mail is built once per send, so one email has one address). Only this server can open a
 * key; an altered, foreign or re-labelled one fails the AEAD check and reads as null, which the route answers with the plain image.
 * Rotating `INVITE_CODE_SECRET` therefore only degrades emails already sent to the plain image. 16 id bytes, 12 nonce, 16 tag: 44
 * bytes, 59 characters.
 */
const HERO_KEY_LENGTH = 59;
const HERO_KEY_INFO = "the-99/invite-hero/v1";

function heroKeyBytes(secret: string): Buffer {
  return Buffer.from(hkdfSync("sha256", secret, Buffer.alloc(0), HERO_KEY_INFO, 32));
}

export function heroKey(secret: string, reservationId: string): string | null {
  const id = Buffer.from(reservationId.replaceAll("-", ""), "hex");
  if (id.length !== 16) return null;
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", heroKeyBytes(secret), nonce);
  const sealed = Buffer.concat([cipher.update(id), cipher.final()]);
  return Buffer.concat([nonce, sealed, cipher.getAuthTag()]).toString("base64url");
}

/** The reservation id a key seals, or null for anything that is not a key this secret made. */
export function readHeroKey(secret: string, key: string): string | null {
  if (key.length !== HERO_KEY_LENGTH || !/^[A-Za-z0-9_-]+$/.test(key)) return null;
  const raw = Buffer.from(key, "base64url");
  // Canonical only: 59 characters leave two spare bits Node ignores, so four spellings would decode to one key (and fill four cache entries).
  if (raw.length !== 44 || raw.toString("base64url") !== key) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", heroKeyBytes(secret), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(28));
    const hex = Buffer.concat([decipher.update(raw.subarray(12, 28)), decipher.final()]).toString("hex");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    return null;
  }
}
