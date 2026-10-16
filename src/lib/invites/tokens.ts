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
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
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
