/**
 * The flyer-code rules (handoff `design/design_handoff_the99_flyer_trial/`), pure: what a code looks like, what
 * holds one of its places, and when it reads as used up. The server's gate, `/join` and /admin read these, so
 * "places left" has one definition.
 *
 * A code has `capacity` places (50). A place is TAKEN by a spent claim and HELD by an open or proven claim whose
 * ten minutes have not run out; expiry is derived from time here, so a count is right whether or not the sweep has
 * written it down. Every completed sign-up also spends one of Hugh's invites, so a code is only open while he has
 * one to give past the claims already holding.
 */
import { CODE_TTL_MS, resendWaitMs } from "../invites/rules";

/** No 0/O and no 1/I: a code read off paper or typed on a phone cannot be misread. */
export const FLYER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const FLYER_CODE_LENGTH = 6;
/** A claim holds its place for ten minutes, until the emailed code is proven or the account exists. */
export const FLYER_HOLD_MS = 10 * 60 * 1000;
/** Once the emailed code is proven the place holds longer, for the newcomer to finish Clerk's sign-up. */
/** However often the code is re-sent, an unproven claim holds its place no longer than this from its first send. */
export const FLYER_RESEND_CEILING_MS = 30 * 60 * 1000;
export const FLYER_PROVEN_HOLD_MS = 60 * 60 * 1000;

const CODE_SHAPE = new RegExp(`^[${FLYER_ALPHABET}]{${FLYER_CODE_LENGTH}}$`);

/** The upper-case form of a typed or scanned code, or null when it is not one (a 43-character invite token is not). */
export function parseFlyerCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  return CODE_SHAPE.test(code) ? code : null;
}

/**
 * How a holding claim reads in the invite count: one of the code creator's invites waiting until `holdsUntil`, so every
 * writer that counts his invites (`readCountIn`, under the same `invites:` lock) sees it taken.
 */
export function flyerHoldRow(holdsUntil: Date) {
  return { kind: "email", state: "reserved", qrExpiresAt: null, holdsUntil } as const;
}

export type FlyerClaimState = "open" | "proven" | "spent" | "released";

/** The columns of a claim the count reads. */
export type FlyerClaimRow = { state: FlyerClaimState; holdsUntil: Date };

/** Whether a claim holds one of its code's places at `now`. */
export function holdsPlace(row: FlyerClaimRow, now: Date): boolean {
  return (row.state === "open" || row.state === "proven") && row.holdsUntil.getTime() > now.getTime();
}

export type FlyerCodeRow = { capacity: number; revokedAt: Date | null };

/** Why a code cannot take another person: the page draws each of these as its own state. */
export type FlyerClosed = "revoked" | "full" | "hugh";

/**
 * Whether a code can take one more person: not revoked, a place free past the claims holding, and one of Hugh's
 * invites free. `hughLeft` is his invites left as the invite count reads them, which already nets every claim holding
 * on all his codes (`readCountIn`), since they spend the same stock.
 */
export function flyerOpenness(
  code: FlyerCodeRow,
  claims: readonly FlyerClaimRow[],
  hughLeft: number,
  now: Date,
): { open: true; places: number } | { open: false; closed: FlyerClosed } {
  if (code.revokedAt !== null) return { open: false, closed: "revoked" };
  const spent = claims.filter((c) => c.state === "spent").length;
  const holding = claims.filter((c) => holdsPlace(c, now)).length;
  const places = code.capacity - spent - holding;
  if (places <= 0) return { open: false, closed: "full" };
  if (hughLeft <= 0) return { open: false, closed: "hugh" };
  return { open: true, places };
}

/** Ms before a claim may send again: the cooldown, or the rest of its hold once it is too near its ceiling to keep a re-sent code's ten minutes. */
export function resendWaitFor(row: { createdAt: Date; holdsUntil: Date; codeSentAt: Date | null }, now: Date): number {
  const cooldown = resendWaitMs(row.codeSentAt, now);
  if (row.createdAt.getTime() + FLYER_RESEND_CEILING_MS - now.getTime() < CODE_TTL_MS) return Math.max(cooldown, row.holdsUntil.getTime() - now.getTime());
  return cooldown;
}
