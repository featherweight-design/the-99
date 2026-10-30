/**
 * A newcomer's three steps at `/join/<CODE>` for a flyer code (handoff `design/design_handoff_the99_flyer_trial/`).
 * SERVER-ONLY. The same shape as `src/lib/invites/claim.ts` (a code emailed to prove the mailbox, a claim secret in an
 * httpOnly cookie, a Clerk invitation handed over), with two differences: a claim is made PER PERSON when they send
 * their address (the code is shared by up to 50), and what it holds is one of the code's places, for ten minutes.
 * Every write that decides a place or spends Hugh's stock takes his `invites:` lock, the one his own invites take.
 * The Clerk invitation carries this claim's id in `inviteReservation` metadata, so the sign-up webhook finds it.
 */
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "../../db";
import { flyerClaims, flyerCodes } from "../../db/schema";
import { clerkInvites, type ClerkInvites } from "../invites/clerk";
import { mailConfig, sendMail, type MailConfig, type MailResult } from "../invites/mail";
import { readCountIn } from "../invites/read";
import { CODE_MAX_TRIES, codeState, CODE_TTL_MS, isClaimSecretShape, isEmailShape, normalizeEmail, parseCode, resendWaitMs } from "../invites/rules";
import { lockSenderIn } from "../invites/send";
import { codeHmac, inviteSecret, newClaimSecret, newCode, sameHex, secretHash } from "../invites/tokens";
import { FLYER_HOLD_MS, FLYER_PROVEN_HOLD_MS, FLYER_RESEND_CEILING_MS, flyerOpenness, parseFlyerCode, type FlyerClaimRow, type FlyerClosed } from "./rules";

type Row = typeof flyerClaims.$inferSelect;
type CodeRow = typeof flyerCodes.$inferSelect;

/** The claim is not (or no longer) this browser's to use: the page draws the ended card, naming nobody. */
export type Ended = { ok: false; reason: "ended" };
const ENDED: Ended = { ok: false, reason: "ended" };

function live(row: Row, now: Date): boolean {
  return (row.state === "open" || row.state === "proven") && row.holdsUntil.getTime() > now.getTime() && row.codeTries < CODE_MAX_TRIES;
}

function cookieMatches(row: Row, presented: string | null): boolean {
  return presented !== null && secretHash(presented) === row.claimSecretHash;
}

/** The code a path segment names, or null: not a code's shape, or no such row. */
export async function findFlyerCode(raw: string): Promise<CodeRow | null> {
  const code = parseFlyerCode(raw);
  if (code === null) return null;
  const [row] = await db.select().from(flyerCodes).where(eq(flyerCodes.code, code));
  return row ?? null;
}

async function claimOf(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], codeId: string, presented: string | null, forUpdate: boolean): Promise<Row | undefined> {
  if (!isClaimSecretShape(presented)) return undefined;
  const q = tx.select().from(flyerClaims)
    .where(and(eq(flyerClaims.codeId, codeId), eq(flyerClaims.claimSecretHash, secretHash(presented))));
  const [row] = forUpdate ? await q.for("update") : await q;
  return row;
}

// ---------------------------------------------------------------------------------------------------------- start

export type StartDecision =
  /** No claim of this browser stands: a new one, if the code has a place. */
  | { kind: "first" }
  /** The same browser sending again: the address may change, the hold does not restart. */
  | { kind: "again"; changed: boolean }
  | { kind: "wait"; waitMs: number }
  | { kind: "ended" };

export function decideStart(row: Row | undefined, presented: string | null, email: string, now: Date): StartDecision {
  if (!row || !cookieMatches(row, presented) || !live(row, now)) return { kind: "first" };
  // A claim already proven stays proven: its address is the one the Clerk invitation will name.
  if (row.state === "proven") return { kind: "ended" };
  const waitMs = resendWaitMs(row.codeSentAt, now);
  if (waitMs > 0) return { kind: "wait", waitMs };
  return { kind: "again", changed: row.email !== email };
}

/** A re-sent code works for ten minutes, so the hold reaches that far, but never past `FLYER_RESEND_CEILING_MS` from the first send. */
export function resentHold(row: Pick<Row, "holdsUntil" | "createdAt">, now: Date): Date {
  const wanted = Math.max(row.holdsUntil.getTime(), now.getTime() + FLYER_HOLD_MS);
  return new Date(Math.min(wanted, row.createdAt.getTime() + FLYER_RESEND_CEILING_MS));
}

export type StartResult =
  | { ok: true; claimSecret: string; mailed: boolean }
  | { ok: false; reason: "invalid" | "unconfigured" | "wait" | "failed"; waitMs?: number }
  | { ok: false; reason: "closed"; closed: FlyerClosed }
  | Ended;

export type StartDeps = {
  now?: Date;
  env?: { RESEND_API_KEY?: string; INVITE_EMAIL_FROM?: string; INVITE_CODE_SECRET?: string };
  mail?: (config: MailConfig | null, mail: { to: string; subject: string; text: string; html: string }) => Promise<MailResult>;
};

/** The one email: the code, and nothing else. The same words as an invite's. */
export function flyerCodeMail(to: string, code: string) {
  const text = `Your code for The 99 is ${code}. It works for 10 minutes. If you did not ask for it, ignore this email.`;
  return {
    to,
    subject: `Your code for The 99: ${code}`,
    text,
    html: `<p>Your code for The 99 is <strong>${code}</strong>.</p><p>It works for 10 minutes. If you did not ask for it, ignore this email.</p>`,
  };
}

/**
 * Send code. Refused as `unconfigured` before anything is held when mail is not set up. Under Hugh's lock, a stood
 * claim of this browser is re-sent, else a new one takes a place if the code is open (not revoked, a place free past
 * the claims holding, one of Hugh's invites free past every flyer claim holding); the mail goes after the commit, and a
 * mail that fails leaves the claim standing (`mailed: false`).
 */
export async function startFlyerClaim(codeRaw: string, rawEmail: string, presented: string | null, deps: StartDeps = {}): Promise<StartResult> {
  const code = await findFlyerCode(codeRaw);
  if (!code) return ENDED;
  if (!isEmailShape(rawEmail)) return { ok: false, reason: "invalid" };
  const env = deps.env ?? { RESEND_API_KEY: process.env.RESEND_API_KEY, INVITE_EMAIL_FROM: process.env.INVITE_EMAIL_FROM, INVITE_CODE_SECRET: process.env.INVITE_CODE_SECRET };
  const config = mailConfig(env);
  const secret = inviteSecret(env);
  if (!config || !secret) return { ok: false, reason: "unconfigured" };
  const email = normalizeEmail(rawEmail);

  const written = await db.transaction(async (tx) => {
    const now = await lockSenderIn(tx, code.createdBy, deps.now);
    const row = await claimOf(tx, code.id, presented, true);
    const decision = decideStart(row, presented, email, now);
    if (decision.kind === "wait") return { ok: false as const, reason: "wait" as const, waitMs: decision.waitMs };
    if (decision.kind === "ended") return ENDED;
    const sixDigits = newCode();
    if (decision.kind === "again") {
      await tx.update(flyerClaims).set({
        email, codeHmac: codeHmac(secret, row!.id, sixDigits), codeExpiresAt: new Date(now.getTime() + CODE_TTL_MS), codeSentAt: now,
        // The mail says ten minutes, so the hold reaches that far, up to a ceiling so a resend loop cannot hold a place for good.
        holdsUntil: resentHold(row!, now),
        // A different address has to be proven again.
        ...(decision.changed ? { provenAt: null } : {}),
      }).where(eq(flyerClaims.id, row!.id));
      return { ok: true as const, claimSecret: presented!, code: sixDigits };
    }
    const claims = await tx.select({ state: flyerClaims.state, holdsUntil: flyerClaims.holdsUntil }).from(flyerClaims)
      .where(eq(flyerClaims.codeId, code.id));
    const { count } = await readCountIn(tx, code.createdBy, now);
    // `count.left` already nets the claims holding on every one of Hugh's codes (`readCountIn`).
    const openness = flyerOpenness(code, claims as FlyerClaimRow[], count.left, now);
    if (!openness.open) return { ok: false as const, reason: "closed" as const, closed: openness.closed };
    const claimSecret = newClaimSecret();
    const [made] = await tx.insert(flyerClaims).values({
      codeId: code.id, state: "open", holdsUntil: new Date(now.getTime() + FLYER_HOLD_MS), email,
      claimSecretHash: secretHash(claimSecret), codeExpiresAt: new Date(now.getTime() + CODE_TTL_MS), codeSentAt: now,
    }).returning({ id: flyerClaims.id });
    await tx.update(flyerClaims).set({ codeHmac: codeHmac(secret, made.id, sixDigits) }).where(eq(flyerClaims.id, made.id));
    return { ok: true as const, claimSecret, code: sixDigits };
  });
  if (!written.ok) return written;
  const sent = await (deps.mail ?? sendMail)(config, flyerCodeMail(email, written.code));
  return { ok: true, claimSecret: written.claimSecret, mailed: sent.ok };
}

// -------------------------------------------------------------------------------------------------------- confirm

export type ConfirmDecision =
  | { kind: "proven" }
  | { kind: "wrong"; triesLeft: number }
  /** The fifth wrong try: the claim ends and its place goes back. */
  | { kind: "ends" }
  | { kind: "expired" }
  | { kind: "ended" };

export function decideConfirm(row: Row | undefined, presented: string | null, rawCode: string, secret: string, now: Date): ConfirmDecision {
  if (!row || !live(row, now) || !cookieMatches(row, presented)) return { kind: "ended" };
  // Already proven by this browser: a retry after a lost response is the same answer.
  if (row.state === "proven") return { kind: "proven" };
  const state = codeState({ codeExpiresAt: row.codeExpiresAt, codeTries: row.codeTries }, now);
  if (state === "spent" || state === "none") return { kind: "ended" };
  if (state === "expired") return { kind: "expired" };
  const code = parseCode(rawCode);
  if (code !== null && row.codeHmac !== null && sameHex(row.codeHmac, codeHmac(secret, row.id, code))) return { kind: "proven" };
  const tries = row.codeTries + 1;
  return tries >= CODE_MAX_TRIES ? { kind: "ends" } : { kind: "wrong", triesLeft: CODE_MAX_TRIES - tries };
}

export type ConfirmResult = { ok: true } | { ok: false; reason: "wrong"; triesLeft: number } | { ok: false; reason: "expired" | "unconfigured" } | Ended;

export async function confirmFlyerCode(
  codeRaw: string,
  rawCode: string,
  presented: string | null,
  deps: { now?: Date; env?: { INVITE_CODE_SECRET?: string } } = {},
): Promise<ConfirmResult> {
  const secret = inviteSecret(deps.env ?? { INVITE_CODE_SECRET: process.env.INVITE_CODE_SECRET });
  if (!secret) return { ok: false, reason: "unconfigured" };
  const code = await findFlyerCode(codeRaw);
  if (!code) return ENDED;
  return db.transaction(async (tx): Promise<ConfirmResult> => {
    const now = await lockSenderIn(tx, code.createdBy, deps.now);
    const row = await claimOf(tx, code.id, presented, true);
    const decision = decideConfirm(row, presented, rawCode, secret, now);
    switch (decision.kind) {
      case "proven":
        // Used once: the code is cleared, and the place holds longer for the sign-up.
        if (row!.state === "open") {
          await tx.update(flyerClaims).set({ state: "proven", provenAt: now, codeHmac: null, codeExpiresAt: null, holdsUntil: new Date(now.getTime() + FLYER_PROVEN_HOLD_MS) })
            .where(eq(flyerClaims.id, row!.id));
        }
        return { ok: true };
      case "wrong":
        await tx.update(flyerClaims).set({ codeTries: row!.codeTries + 1 }).where(eq(flyerClaims.id, row!.id));
        return { ok: false, reason: "wrong", triesLeft: decision.triesLeft };
      case "ends":
        await tx.update(flyerClaims).set({ state: "released", email: null, codeHmac: null, codeExpiresAt: null, resolvedAt: now })
          .where(eq(flyerClaims.id, row!.id));
        return ENDED;
      case "expired":
        return { ok: false, reason: "expired" };
      default:
        return ENDED;
    }
  });
}

// ------------------------------------------------------------------------------------------------------- hand over

export type HandOverResult = { ok: true; url: string } | { ok: false; reason: "account" | "failed" } | Ended;

/**
 * Continue to sign-up. Only a proven claim with its cookie. An address that already has an account releases the
 * claim (`account`). Otherwise a Clerk invitation is made with `notify: false, ignoreExisting: true` and the claim's
 * id, its id stored, and its `url` handed back; reopening revokes the stored invitation and makes a fresh one.
 */
export async function handOverFlyer(codeRaw: string, presented: string | null, deps: { now?: Date; clerk?: ClerkInvites } = {}): Promise<HandOverResult> {
  const clerk = deps.clerk ?? clerkInvites;
  const code = await findFlyerCode(codeRaw);
  if (!code) return ENDED;
  const first = await db.transaction(async (tx) => {
    const now = await lockSenderIn(tx, code.createdBy, deps.now);
    return { row: await claimOf(tx, code.id, presented, false), now };
  });
  if (!first.row || first.row.state !== "proven" || first.row.email === null || !live(first.row, first.now) || !cookieMatches(first.row, presented)) return ENDED;
  const claimId = first.row.id;

  // Exclusive ownership of THIS claim's Clerk work: one transaction holds a per-claim lock across cleanup, creation and
  // storage, so two overlapping hand-overs cannot revoke each other's ticket. The second does not wait on Clerk: it
  // answers `failed` and the newcomer presses Continue again. Hugh's own lock is not held, so his invites never queue.
  return db.transaction(async (tx): Promise<HandOverResult> => {
    const got = await tx.execute(sql`select pg_try_advisory_xact_lock(hashtext(${`flyer-handover:${claimId}`})) as ok`);
    if (!(got.rows[0] as { ok: boolean }).ok) return { ok: false, reason: "failed" };
    const now = deps.now ?? new Date();
    // Read again under the lock: the invitation id and state are now ours to act on.
    const [row] = await tx.select().from(flyerClaims).where(eq(flyerClaims.id, claimId));
    if (!row || row.state !== "proven" || row.email === null || !live(row, now) || !cookieMatches(row, presented)) return ENDED;
    const email = row.email;
    try {
      // Whatever ticket this claim made earlier is ended first, so no branch below leaves one behind (the sweep skips a
      // released claim): a failure keeps the claim as it is.
      if (row.clerkInvitationId !== null && !(await clerk.revoke(row.clerkInvitationId))) return { ok: false, reason: "failed" };
      if (!(await clerk.revokeFor(email, row.id))) return { ok: false, reason: "failed" };
      if (await clerk.hasAccount(email)) {
        await tx.update(flyerClaims).set({ state: "released", email: null, clerkInvitationId: null, resolvedAt: now })
          .where(and(eq(flyerClaims.id, row.id), eq(flyerClaims.state, "proven")));
        return { ok: false, reason: "account" };
      }
      const made = await clerk.create({ emailAddress: email, reservationId: row.id, notify: false, ignoreExisting: true });
      if (!made.ok || made.url === null) {
        if (!made.ok && made.reason === "indeterminate") await clerk.revokeFor(email, row.id);
        return { ok: false, reason: "failed" };
      }
      // Stored under the claim still standing: the sweep may have released it while Clerk was asked.
      const stored = await tx.update(flyerClaims).set({ clerkInvitationId: made.id })
        .where(and(eq(flyerClaims.id, row.id), eq(flyerClaims.state, "proven"), gt(flyerClaims.holdsUntil, new Date())))
        .returning({ id: flyerClaims.id });
      if (stored.length === 0) {
        if (!(await clerk.revoke(made.id))) {
          // Kept on the claim, whatever its state, so the sweep retries the revoke until it holds.
          await tx.update(flyerClaims).set({ clerkInvitationId: made.id }).where(eq(flyerClaims.id, row.id));
          console.warn("[flyer] hand-over: late invitation not revoked; kept for the sweep");
        }
        return ENDED;
      }
      return { ok: true, url: made.url };
    } catch {
      return { ok: false, reason: "failed" };
    }
  });
}
