/**
 * The social foundation's pure rules (plan `boards/plan-social-foundation-2026-10-12.md`, Hugh's rulings of
 * 2026-10-12). No database import: `friends.ts` and `pods.ts` apply these inside their transactions, and
 * the tests pin them without one.
 */
import { randomBytes } from "node:crypto";

/** Seven days, single-use (Q2). */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Open invites one account may hold at once. */
export const MAX_OPEN_INVITES = 10;
export const DISPLAY_NAME_MAX = 30;
export const POD_NAME_MAX = 40;

/** 128 random bits as base64url: 22 characters, unguessable, so the link needs no attempt cap (Q1). */
export function newInviteToken(): string {
  return randomBytes(16).toString("base64url");
}

export type InviteRow = {
  expiresAt: Date;
  redeemedAt: Date | null;
  declinedAt: Date | null;
  revokedAt: Date | null;
};

export type InviteState = "open" | "expired" | "redeemed" | "declined" | "revoked";

/** An ended invite says how it ended; an unended one is open until its expiry, then expired. */
export function inviteState(row: InviteRow, now: Date): InviteState {
  if (row.redeemedAt) return "redeemed";
  if (row.declinedAt) return "declined";
  if (row.revokedAt) return "revoked";
  return now.getTime() < row.expiresAt.getTime() ? "open" : "expired";
}

/**
 * Player-typed text, so the same contract everywhere it lands: NFC, trimmed, inner whitespace collapsed
 * to one space, no control or format characters, and 1 to `max` code points (not UTF-16 units, so an
 * emoji counts once). Null means the input is refused, never repaired into something the player did
 * not type.
 */
export function cleanName(raw: unknown, max: number): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.normalize("NFC").replace(/\s+/gu, " ").trim();
  if (/[\p{Cc}\p{Cf}]/u.test(name)) return null;
  const length = [...name].length;
  return length >= 1 && length <= max ? name : null;
}

/** A client's id claim (a `publicId`, a pod id), parsed to the uuid shape before it reaches SQL: a
 *  malformed one would otherwise be a cast error, which reads differently from "not yours". */
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export const cleanDisplayName = (raw: unknown) => cleanName(raw, DISPLAY_NAME_MAX);
export const cleanPodName = (raw: unknown) => cleanName(raw, POD_NAME_MAX);

/**
 * Who holds a pod after its owner leaves (Q5): the longest-standing remaining member, by the earliest
 * `joinedAt`, ties broken by user id so the answer never depends on row order. Null when nobody is
 * left, which deletes the pod.
 */
export function nextPodOwner(
  members: readonly { userId: string; joinedAt: Date }[],
  leaving: string,
): string | null {
  const rest = members.filter((m) => m.userId !== leaving);
  if (rest.length === 0) return null;
  const [first] = [...rest].sort((a, b) =>
    a.joinedAt.getTime() - b.joinedAt.getTime() || (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0));
  return first.userId;
}

/**
 * A friendship's two directed rows, in user id order. Each row's stamp trigger takes its reader's
 * `user_data_stamps` row at commit in event order, so writing the pair in a fixed order means two
 * concurrent befriend or unfriend calls always lock the two stamps the same way round (0073's caveat).
 */
export function friendshipRows(a: string, b: string): { userId: string; friendUserId: string }[] {
  const [low, high] = a < b ? [a, b] : [b, a];
  return [
    { userId: low, friendUserId: high },
    { userId: high, friendUserId: low },
  ];
}
