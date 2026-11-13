/**
 * The invite rules (plan `2026-10-16-invites.md`), pure: what holds an invite, what a sender has left, how a count
 * line reads, what an admin write stores, and the newcomer's code. Every count line, the server's gate and /admin
 * read these, so "left" has one definition.
 *
 * The stock (`invite_balances.held`) counts what is LEFT plus what is HOLDING. A row holds one invite while it is
 * open and its own clock has not run out: a QR for its 15 minutes, a claimed or reserved row for its 7 days. Expiry
 * is derived from time here, so a count is right whether or not the sweep has written it down yet.
 */

/** An invite QR works once, for 15 minutes (brief lock 4). */
export const QR_TTL_MS = 15 * 60 * 1000;
/** A reservation holds its invite for 7 days on its own clock, never Clerk's (brief, The invite's life). */
export const HOLD_MS = 7 * 24 * 60 * 60 * 1000;
/** The newcomer's code (audit G-12): 6 digits, 10 minutes, a 60-second resend cooldown, 5 wrong tries. */
export const CODE_LENGTH = 6;
export const CODE_TTL_MS = 10 * 60 * 1000;
/** A newcomer from a friend link who proved their code holds the invite this long to finish signing up (friend links R1). */
export const LINK_PROVEN_HOLD_MS = 60 * 60 * 1000;
/** Newcomers holding one of a link owner's invites at once, per link: a leaked link cannot drain the owner's stock. */
export const MAX_LINK_HOLDS = 2;

/**
 * Until when a friend link's reservation holds its invite (friend links R1, clarification 2): unproven, the code's
 * window from `now` (a resend, which the claim caps count, refreshes it; an address changed after a proof starts over
 * here); proven, `LINK_PROVEN_HOLD_MS` from the PROOF, so no resend extends it. Never the QR's seven days.
 */
export function linkHoldUntil(now: Date, provenAt: Date | null): Date {
  return provenAt !== null ? new Date(provenAt.getTime() + LINK_PROVEN_HOLD_MS) : new Date(now.getTime() + CODE_TTL_MS);
}
export const CODE_RESEND_MS = 60 * 1000;
export const CODE_MAX_TRIES = 5;
/** The most an admin may set an account's invites left to: the group allowance's own ceiling (`ALLOWANCE_MAX`). */
export const INVITES_MAX = 1000;

export type InviteKind = "email" | "qr";
export type ReservationState = "qr_open" | "claimed" | "reserved" | "spent" | "returned" | "revoked";

/** The columns of a reservation the count reads. */
export type HoldingRow = {
  kind: InviteKind;
  state: ReservationState;
  qrExpiresAt: Date | null;
  holdsUntil: Date | null;
  /** Set on a newcomer's row from a friend link (friend links R1): it holds an invite, but it is not the sender's own QR. */
  linkKeyId?: string | null;
};

/** Whether a row holds one of its sender's invites at `now`. */
export function holdsInvite(row: HoldingRow, now: Date): boolean {
  switch (row.state) {
    case "qr_open":
      return row.qrExpiresAt !== null && row.qrExpiresAt.getTime() > now.getTime();
    case "claimed":
    case "reserved":
      return row.holdsUntil !== null && row.holdsUntil.getTime() > now.getTime();
    default:
      return false;
  }
}

/**
 * What a sender has, from their stock and their rows. `waiting` is every claimed or reserved row still holding,
 * `liveQr` whether an open QR holds one, and `qrUntil` the latest expiry among the open QRs holding one (null when
 * none), so a page whose QR sheet is closed knows when its count line must move back. `left` never reads below zero: the invariant (held ≥ holding) keeps it
 * there, and a reading below would only mean a row the sweep has not yet written down.
 */
export type InviteCount = { left: number; waiting: number; liveQr: boolean; qrUntil: Date | null; out: boolean };

export function inviteCount(held: number, rows: readonly HoldingRow[], now: Date): InviteCount {
  const holding = rows.filter((r) => holdsInvite(r, now));
  // A friend link's unclaimed newcomer holds an invite but is neither waiting (no address yet, as every admin list reads
  // it) nor the sender's own QR: it counts only in what is left.
  const waiting = holding.filter((r) => r.state !== "qr_open").length;
  const qrs = holding.filter((r) => r.state === "qr_open" && r.qrExpiresAt !== null && !r.linkKeyId);
  const liveQr = qrs.length > 0;
  const qrUntil = liveQr ? new Date(Math.max(...qrs.map((r) => r.qrExpiresAt!.getTime()))) : null;
  const left = Math.max(0, held - holding.length);
  return { left, waiting, liveQr, qrUntil, out: left === 0 };
}

/** How many rows hold an invite: what an admin Set adds to the left it was given. */
export function holdingCount(rows: readonly HoldingRow[], now: Date): number {
  return rows.filter((r) => holdsInvite(r, now)).length;
}

/**
 * Card 2 of Add a friend (audit G-2): greyed out only at 0 with no live QR. With a live QR the path still opens, so
 * its sender can show the QR again; the email half is not drawn (`invite-new.tsx`).
 */
export function inviteCardOpen(count: InviteCount): boolean {
  return !count.out || count.liveQr;
}

/**
 * The value an admin's "Invites left" field accepts: a whole number from 0 to `INVITES_MAX`, else null. A string
 * from a form is read as typed; anything else is refused.
 */
export function parseInvitesLeft(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : typeof raw === "string" && /^\s*\d+\s*$/.test(raw) ? Number(raw) : NaN;
  return Number.isInteger(n) && n >= 0 && n <= INVITES_MAX ? n : null;
}

/**
 * The stock an admin Set of `left` stores: what they asked to be left, plus what is holding now, so a waiting
 * invite stays waiting (M2's pending sentence) and `held` never drops below the rows holding.
 */
export function heldForSet(left: number, holding: number): number {
  return left + holding;
}

/**
 * A group top-up (M3) raises a member whose left is below `to` to exactly `to` left and lowers nobody: the stock
 * to store, or null to leave them as they are.
 */
export function heldForTopUp(current: InviteCount, holding: number, to: number): number | null {
  return current.left < to ? to + holding : null;
}

/** An address's SHAPE only (E1): one `@`, something either side, a dot in the domain, no space. No lookup. */
export { isEmailShape } from "../email-shape";

/** The form an address is stored and sent in: trimmed, lower case. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** An email send's request id (`sendEmailInvite`'s repeat rule): a UUID in its canonical shape, any version. */
export function isRequestId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Where the newcomer's code stands (N3 to N5, N12). */
export type CodeState = "none" | "live" | "expired" | "spent";

export function codeState(row: { codeExpiresAt: Date | null; codeTries: number }, now: Date): CodeState {
  if (row.codeTries >= CODE_MAX_TRIES) return "spent";
  if (row.codeExpiresAt === null) return "none";
  return row.codeExpiresAt.getTime() > now.getTime() ? "live" : "expired";
}

/** Milliseconds until a new code may be sent, 0 when it may be now. */
export function resendWaitMs(codeSentAt: Date | null, now: Date): number {
  if (codeSentAt === null) return 0;
  return Math.max(0, codeSentAt.getTime() + CODE_RESEND_MS - now.getTime());
}

/** A code as typed: exactly six digits once spaces are dropped, else null. */
export function parseCode(raw: string): string | null {
  const s = raw.replace(/\s+/g, "");
  return new RegExp(`^\\d{${CODE_LENGTH}}$`).test(s) ? s : null;
}

/** The path a newcomer opens from an invite QR (`/join/[token]`, PR 5). */
export function joinPath(token: string): string {
  return `/join/${token}`;
}

/** A claim secret's shape: 256 bits as base64url, 43 characters. A presented secret of any other shape is never bound. */
export function isClaimSecretShape(raw: unknown): raw is string {
  return typeof raw === "string" && /^[A-Za-z0-9_-]{43}$/.test(raw);
}

/** An invite QR token's shape: 256 bits as base64url, 43 characters (`qrToken`). Checked before anything is read. */
export function isQrToken(raw: unknown): raw is string {
  return typeof raw === "string" && /^[A-Za-z0-9_-]{43}$/.test(raw);
}
