/**
 * The newcomer's three steps at `/join/[token]` (plan `2026-10-16-invites.md`, §The newcomer; R6, R7). SERVER-ONLY.
 * The actions decide the sender's switch; these decide everything about the claim. The newcomer has no account, so
 * every step re-reads the row by the token's hash, and what binds a claim to a browser is the claim secret in an
 * httpOnly cookie (`newClaimSecret`), compared by its hash.
 *
 * Each step's decision is a PURE function over the row (`decideClaim`, `decideConfirm`, `decideHandOver`), tested
 * alone; the functions below read the row under the sender's lock, apply the decision and write.
 */
import { and, eq, gt, sql } from "drizzle-orm";
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
  | { ok: false; reason: "invalid" | "unconfigured" | "wait" | "failed"; waitMs?: number }
  | Ended;

export type ClaimDeps = {
  now?: Date;
  clerk?: ClerkInvites;
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

  // A resend to a DIFFERENT address leaves the old one's invitation pending at Clerk (and, when a hand-over's answer
  // was lost, with no id stored): every cleanup searches the address the row holds NOW, so the old address is ended
  // here, before it is overwritten, and a failure to end it stops the change.
  const [cur] = await db.select().from(inviteReservations).where(eq(inviteReservations.qrTokenHash, hash));
  if (cur && cur.state === "claimed" && cur.email !== null && cur.email !== email && cookieMatches(cur, presentedSecret)) {
    const clerk = deps.clerk ?? clerkInvites;
    try {
      const byId = cur.clerkInvitationId !== null ? await clerk.revoke(cur.clerkInvitationId) : true;
      const byAddress = await clerk.revokeFor(cur.email, cur.id);
      if (!byId || !byAddress) return { ok: false, reason: "failed" };
    } catch {
      return { ok: false, reason: "failed" };
    }
  }

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
      // A different address has to be proven again, and its predecessor's invitation is already ended.
      provenAt: decision.kind === "again" && !decision.changed ? row.provenAt : null,
      ...(decision.kind === "again" && decision.changed ? { clerkInvitationId: null } : {}),
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
  deps: { now?: Date; env?: { INVITE_CODE_SECRET?: string }; clerk?: ClerkInvites } = {},
): Promise<ConfirmResult> {
  if (!isQrToken(token)) return ENDED;
  const secret = inviteSecret(deps.env ?? { INVITE_CODE_SECRET: process.env.INVITE_CODE_SECRET });
  if (!secret) return { ok: false, reason: "unconfigured" };
  const hash = secretHash(token);
  const [found] = await db.select({ userId: inviteReservations.userId }).from(inviteReservations)
    .where(eq(inviteReservations.qrTokenHash, hash));
  if (!found) return ENDED;
  let ending: { id: string; email: string | null; clerkId: string | null } | null = null;
  const result = await db.transaction(async (tx): Promise<ConfirmResult> => {
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
        // The fifth wrong try. The row keeps its address and invitation id for now (every step already reads five tries
        // as ended): they are what ends a pending Clerk ticket, and once erased nothing could find one. It is revoked
        // below, after Clerk has been asked, and the sweep finishes it if that fails.
        await tx.update(inviteReservations).set({ codeTries: CODE_MAX_TRIES, codeHmac: null, codeExpiresAt: null })
          .where(eq(inviteReservations.id, row.id));
        ending = { id: row.id, email: row.email, clerkId: row.clerkInvitationId };
        return ENDED;
      case "expired":
        return { ok: false, reason: "expired" };
      default:
        return ENDED;
    }
  });
  if (ending) await finishEnded(ending, deps.clerk ?? clerkInvites, deps.now ?? new Date());
  return result;
}

/**
 * Ends a claim whose tries ran out: its Clerk invitations (by the stored id and by address and reservation) first,
 * then, only if they are gone, the row itself (`revoked`, its address erased, its invite back). A failure leaves it
 * as it is for the sweep, which treats a claim with spent tries as lapsed.
 */
async function finishEnded(row: { id: string; email: string | null; clerkId: string | null }, clerk: ClerkInvites, now: Date): Promise<void> {
  try {
    const byId = row.clerkId !== null ? await clerk.revoke(row.clerkId) : true;
    const byAddress = row.email !== null ? await clerk.revokeFor(row.email, row.id) : true;
    if (!byId || !byAddress) return;
  } catch {
    return;
  }
  await db.update(inviteReservations).set({ state: "revoked", email: null, clerkInvitationId: null, resolvedAt: now })
    .where(and(eq(inviteReservations.id, row.id), eq(inviteReservations.state, "claimed")));
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
  // Whatever is still pending for this reservation (an earlier create whose answer was lost, so no id was stored) is
  // ended before another is made, so a retry never leaves a first ticket the stored id cannot reach.
  if (!(await clerk.revokeFor(decision.email, row.id))) return { ok: false, reason: "failed" };
  const made = await clerk.create({ emailAddress: decision.email, reservationId: row.id, notify: false, ignoreExisting: true });
  if (!made.ok && made.reason === "indeterminate") {
    // Clerk may have made it. If the claim changed, ended or was purged while it was asked, the cleanup that ran has
    // not seen this one, and the address it was for is gone from the row: end it by the address captured here.
    const [now2] = await db.select({ state: inviteReservations.state, email: inviteReservations.email }).from(inviteReservations)
      .where(eq(inviteReservations.id, row.id));
    if (!now2 || now2.state !== "claimed" || now2.email !== decision.email) {
      if (!(await clerk.revokeFor(decision.email, row.id))) console.warn("[invites] hand-over: late invitation not reconciled");
    }
    return { ok: false, reason: "failed" };
  }
  if (!made.ok || made.url === null) return { ok: false, reason: "failed" };

  // Stored under the claim still standing: a reservation resolved while Clerk was asked leaves a ticket that must
  // not stay usable.
  // And under the claim as it was READ: the address this invitation is for, and the invitation id then stored. A second
  // hand-over that completed while Clerk was asked (the same browser changed and proved another address) has moved
  // one of them, so this one loses and revokes what it made, and only one ticket is ever stored.
  const stored = await db.update(inviteReservations).set({ clerkInvitationId: made.id })
    .where(and(
      eq(inviteReservations.id, row.id),
      eq(inviteReservations.state, "claimed"),
      // Its 7 days may have run out while Clerk was asked: such a claim takes the revoke path below.
      gt(inviteReservations.holdsUntil, new Date()),
      eq(inviteReservations.email, decision.email),
      sql`${inviteReservations.clerkInvitationId} is not distinct from ${decision.staleInvitationId}`,
    ))
    .returning({ id: inviteReservations.id });
  if (stored.length === 0) {
    if (!(await clerk.revoke(made.id))) console.warn("[invites] hand-over: late invitation not revoked");
    return ENDED;
  }
  return { ok: true, url: made.url };
}
