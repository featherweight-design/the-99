/**
 * The newcomer's three steps at `/join/[token]` (plan `2026-10-16-invites.md`, §The newcomer; R6, R7). SERVER-ONLY.
 * The actions decide the sender's switch; these decide everything about the claim. The newcomer has no account, so
 * every step re-reads the row by the token's hash, and what binds a claim to a browser is the claim secret in an
 * httpOnly cookie (`newClaimSecret`), compared by its hash.
 *
 * Each step's decision is a PURE function over the row (`decideClaim`, `decideConfirm`, `decideHandOver`), tested
 * alone; the functions below read the row under the sender's lock, apply the decision and write.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { inviteReservations } from "../../db/schema";
import { clerkInvites, type ClerkInvites } from "./clerk";
import { mailConfig, sendMail, type MailConfig, type MailResult } from "./mail";
import { lockSenderIn } from "./send";
import { CODE_MAX_TRIES, CODE_TTL_MS, codeState, HOLD_MS, isEmailShape, isQrToken, normalizeEmail, parseCode, resendWaitMs } from "./rules";
import { codeHmac, inviteSecret, newClaimSecret, newCode, sameHex, secretHash } from "./tokens";

type Row = typeof inviteReservations.$inferSelect;

/** Why a step cannot go on: the row is not (or no longer) this newcomer's to use. Draws N11 or N12, which name nobody. */
export type Ended = { ok: false; reason: "ended" };
const ENDED: Ended = { ok: false, reason: "ended" };
/** A decision that the step cannot go on, before it is told as a result. */
const END = { kind: "ended" } as const;

/** Whether a row is a QR claim still holding: `claimed` with its own 7 days not run out. */
function claimLive(row: Row, now: Date): boolean {
  return row.state === "claimed" && row.holdsUntil !== null && row.holdsUntil.getTime() > now.getTime();
}

function cookieMatches(row: Row, presented: string | null): boolean {
  return presented !== null && row.claimSecretHash !== null && secretHash(presented) === row.claimSecretHash;
}

/** The account a token belongs to (its sender), or null for a token no row has: what the sender's switches are read by. */
export async function senderOfToken(token: string): Promise<string | null> {
  if (!isQrToken(token)) return null;
  const [row] = await db.select({ userId: inviteReservations.userId }).from(inviteReservations)
    .where(eq(inviteReservations.qrTokenHash, secretHash(token)));
  return row?.userId ?? null;
}

// ---------------------------------------------------------------------------------------------------------- claim

export type ClaimDecision =
  /** A fresh claim: an open QR moves to `claimed`, with a new browser secret. */
  | { kind: "first" }
  /** The same browser sending again: the address may change, the 7-day clock does not restart (G-8). */
  | { kind: "again"; changed: boolean }
  | { kind: "wait"; waitMs: number }
  | typeof END;

export function decideClaim(row: Row | undefined, presentedSecret: string | null, newEmail: string, now: Date): ClaimDecision {
  if (!row || row.kind !== "qr") return END;
  if (row.state === "qr_open") {
    return row.qrExpiresAt !== null && row.qrExpiresAt.getTime() > now.getTime() ? { kind: "first" } : END;
  }
  if (!claimLive(row, now) || !cookieMatches(row, presentedSecret)) return END;
  // The tries belong to the claim, not to a code: five wrong ones end it however many codes were sent (R7).
  if (row.codeTries >= CODE_MAX_TRIES) return END;
  const waitMs = resendWaitMs(row.codeSentAt, now);
  if (waitMs > 0) return { kind: "wait", waitMs };
  return { kind: "again", changed: row.email !== newEmail };
}

export type ClaimResult =
  | { ok: true; claimSecret: string; mailed: boolean }
  | { ok: false; reason: "invalid" | "unconfigured" | "wait"; waitMs?: number }
  | Ended;

export type ClaimDeps = {
  now?: Date;
  env?: { RESEND_API_KEY?: string; INVITE_EMAIL_FROM?: string; INVITE_CODE_SECRET?: string };
  mail?: (config: MailConfig | null, mail: { to: string; subject: string; text: string; html: string }) => Promise<MailResult>;
};

/** The one email: the code, and nothing else (no sender's name, no link). */
export function codeMail(to: string, code: string) {
  const text = `Your code for The 99 is ${code}. It works for 10 minutes. If you did not ask for it, ignore this email.`;
  return {
    to,
    subject: `Your code for The 99: ${code}`,
    text,
    html: `<p>Your code for The 99 is <strong>${code}</strong>.</p><p>It works for 10 minutes. If you did not ask for it, ignore this email.</p>`,
  };
}

/**
 * Send code. Shape-checked, and refused as `unconfigured` BEFORE anything is claimed when Resend is not set up, so
 * a misconfigured deployment never holds an invite for 7 days and mails nothing. Then, under the sender's lock, the
 * claim is written (or the same claim re-sent) and the code mailed after the commit; a mail that fails leaves the
 * claim standing (`mailed: false`, R14's toast and Try again).
 */
export async function claimInvite(
  token: string,
  rawEmail: string,
  presentedSecret: string | null,
  deps: ClaimDeps = {},
): Promise<ClaimResult> {
  if (!isQrToken(token)) return ENDED;
  if (!isEmailShape(rawEmail)) return { ok: false, reason: "invalid" };
  const env = deps.env ?? { RESEND_API_KEY: process.env.RESEND_API_KEY, INVITE_EMAIL_FROM: process.env.INVITE_EMAIL_FROM, INVITE_CODE_SECRET: process.env.INVITE_CODE_SECRET };
  const config = mailConfig(env);
  const secret = inviteSecret(env);
  if (!config || !secret) return { ok: false, reason: "unconfigured" };
  const email = normalizeEmail(rawEmail);
  const hash = secretHash(token);

  const [found] = await db.select({ userId: inviteReservations.userId }).from(inviteReservations)
    .where(eq(inviteReservations.qrTokenHash, hash));
  if (!found) return ENDED;

  const written = await db.transaction(async (tx) => {
    const now = await lockSenderIn(tx, found.userId, deps.now);
    const [row] = await tx.select().from(inviteReservations).where(eq(inviteReservations.qrTokenHash, hash)).for("update");
    const decision = decideClaim(row, presentedSecret, email, now);
    if (decision.kind === "wait") return { ok: false as const, reason: "wait" as const, waitMs: decision.waitMs };
    if (decision.kind === "ended") return ENDED;
    const code = newCode();
    const claimSecret = decision.kind === "first" ? newClaimSecret() : presentedSecret!;
    await tx.update(inviteReservations).set({
      state: "claimed",
      email,
      claimSecretHash: secretHash(claimSecret),
      // The 7-day clock starts at the first claim and is never restarted by a resend (G-8).
      holdsUntil: decision.kind === "first" ? new Date(now.getTime() + HOLD_MS) : row.holdsUntil,
      codeHmac: codeHmac(secret, row.id, code),
      codeExpiresAt: new Date(now.getTime() + CODE_TTL_MS),
      codeSentAt: now,
      // A different address has to be proven again.
      provenAt: decision.kind === "again" && !decision.changed ? row.provenAt : null,
    }).where(eq(inviteReservations.id, row.id));
    return { ok: true as const, claimSecret, code };
  });
  if (!written.ok) return written;
  const sent = await (deps.mail ?? sendMail)(config, codeMail(email, written.code));
  return { ok: true, claimSecret: written.claimSecret, mailed: sent.ok };
}

// -------------------------------------------------------------------------------------------------------- confirm

export type ConfirmDecision =
  | { kind: "proven" }
  | { kind: "wrong"; triesLeft: number }
  /** The fifth wrong try: the row ends and its invite goes back (R7). */
  | { kind: "ends" }
  | { kind: "expired" }
  | typeof END;

export function decideConfirm(row: Row | undefined, presentedSecret: string | null, rawCode: string, secret: string, now: Date): ConfirmDecision {
  if (!row || row.kind !== "qr" || !claimLive(row, now) || !cookieMatches(row, presentedSecret)) return END;
  const state = codeState({ codeExpiresAt: row.codeExpiresAt, codeTries: row.codeTries }, now);
  if (state === "spent" || state === "none") return END;
  if (state === "expired") return { kind: "expired" };
  const code = parseCode(rawCode);
  if (code !== null && row.codeHmac !== null && sameHex(row.codeHmac, codeHmac(secret, row.id, code))) return { kind: "proven" };
  const tries = row.codeTries + 1;
  return tries >= CODE_MAX_TRIES ? { kind: "ends" } : { kind: "wrong", triesLeft: CODE_MAX_TRIES - tries };
}

export type ConfirmResult = { ok: true } | { ok: false; reason: "wrong"; triesLeft: number } | { ok: false; reason: "expired" } | { ok: false; reason: "unconfigured" } | Ended;

export async function confirmCode(
  token: string,
  rawCode: string,
  presentedSecret: string | null,
  deps: { now?: Date; env?: { INVITE_CODE_SECRET?: string } } = {},
): Promise<ConfirmResult> {
  if (!isQrToken(token)) return ENDED;
  const secret = inviteSecret(deps.env ?? { INVITE_CODE_SECRET: process.env.INVITE_CODE_SECRET });
  if (!secret) return { ok: false, reason: "unconfigured" };
  const hash = secretHash(token);
  const [found] = await db.select({ userId: inviteReservations.userId }).from(inviteReservations)
    .where(eq(inviteReservations.qrTokenHash, hash));
  if (!found) return ENDED;
  return db.transaction(async (tx): Promise<ConfirmResult> => {
    const now = await lockSenderIn(tx, found.userId, deps.now);
    const [row] = await tx.select().from(inviteReservations).where(eq(inviteReservations.qrTokenHash, hash)).for("update");
    const decision = decideConfirm(row, presentedSecret, rawCode, secret, now);
    switch (decision.kind) {
      case "proven":
        // Used once: the code is cleared, so the same six digits prove nothing a second time.
        await tx.update(inviteReservations).set({ provenAt: now, codeHmac: null, codeExpiresAt: null })
          .where(eq(inviteReservations.id, row.id));
        return { ok: true };
      case "wrong":
        await tx.update(inviteReservations).set({ codeTries: row.codeTries + 1 }).where(eq(inviteReservations.id, row.id));
        return { ok: false, reason: "wrong", triesLeft: decision.triesLeft };
      case "ends":
        await tx.update(inviteReservations).set({
          state: "revoked", codeTries: CODE_MAX_TRIES, email: null, resolvedAt: now, codeHmac: null, codeExpiresAt: null,
        }).where(eq(inviteReservations.id, row.id));
        return ENDED;
      case "expired":
        return { ok: false, reason: "expired" };
      default:
        return ENDED;
    }
  });
}

// ------------------------------------------------------------------------------------------------------- hand over

export type HandOverDecision = { kind: "go"; email: string; staleInvitationId: string | null } | typeof END;

export function decideHandOver(row: Row | undefined, presentedSecret: string | null, now: Date): HandOverDecision {
  if (!row || row.kind !== "qr" || !claimLive(row, now) || !cookieMatches(row, presentedSecret)) return END;
  if (row.provenAt === null || row.email === null) return END;
  return { kind: "go", email: row.email, staleInvitationId: row.clerkInvitationId };
}

export type HandOverResult = { ok: true; url: string } | { ok: false; reason: "account" | "failed" } | Ended;

/**
 * Continue to sign-up. Only a proven claim with its cookie. An address that already has an account draws N9 and
 * the reservation keeps holding until its 7 days, as every unspent one does. Otherwise a Clerk invitation is made
 * with `notify: false, ignoreExisting: true` and this reservation's id, its id stored, and its `url` handed back. A
 * ticket URL is never stored: reopening and continuing again revokes the stored invitation and makes a fresh one.
 */
export async function handOver(
  token: string,
  presentedSecret: string | null,
  deps: { now?: Date; clerk?: ClerkInvites } = {},
): Promise<HandOverResult> {
  if (!isQrToken(token)) return ENDED;
  const clerk = deps.clerk ?? clerkInvites;
  const hash = secretHash(token);
  const [found] = await db.select({ userId: inviteReservations.userId }).from(inviteReservations)
    .where(eq(inviteReservations.qrTokenHash, hash));
  if (!found) return ENDED;

  const read = await db.transaction(async (tx) => {
    const now = await lockSenderIn(tx, found.userId, deps.now);
    const [row] = await tx.select().from(inviteReservations).where(eq(inviteReservations.qrTokenHash, hash));
    return { row, decision: decideHandOver(row, presentedSecret, now) };
  });
  if (read.decision.kind === "ended") return ENDED;
  const { row, decision } = read;

  let hasAccount: boolean;
  try {
    hasAccount = await clerk.hasAccount(decision.email);
  } catch {
    return { ok: false, reason: "failed" };
  }
  if (hasAccount) return { ok: false, reason: "account" };
  if (decision.staleInvitationId !== null && !(await clerk.revoke(decision.staleInvitationId))) {
    return { ok: false, reason: "failed" };
  }
  const made = await clerk.create({ emailAddress: decision.email, reservationId: row.id, notify: false, ignoreExisting: true });
  if (!made.ok || made.url === null) return { ok: false, reason: "failed" };

  // Stored under the claim still standing: a reservation resolved while Clerk was asked leaves a ticket that must
  // not stay usable.
  const stored = await db.update(inviteReservations).set({ clerkInvitationId: made.id })
    .where(and(eq(inviteReservations.id, row.id), eq(inviteReservations.state, "claimed")))
    .returning({ id: inviteReservations.id });
  if (stored.length === 0) {
    if (!(await clerk.revoke(made.id))) console.warn("[invites] hand-over: late invitation not revoked");
    return ENDED;
  }
  return { ok: true, url: made.url };
}
