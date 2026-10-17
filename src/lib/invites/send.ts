/**
 * The sender's two ways (plan `2026-10-16-invites.md`, §The sender's two ways). SERVER-ONLY. The actions decide the
 * reader and the switch; these decide everything about the invite.
 *
 * Every write that holds an invite takes the sender's lock (`lockSenderIn`) and re-reads what is left under it, so
 * two presses cannot both take the last one, and the invariant (`held` ≥ the rows holding) holds: a hold needs one
 * left.
 */
import { randomUUID } from "node:crypto";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "../../db";
import { inviteReservations } from "../../db/schema";
import { clerkInvites, type ClerkInvites } from "./clerk";
import { readCountIn, type Tx } from "./read";
import { HOLD_MS, isEmailShape, normalizeEmail, QR_TTL_MS } from "./rules";
import { qrToken, secretHash } from "./tokens";

/**
 * The sender's lock: every write that spends, holds or sets one sender's invites takes it first. It answers the time
 * to count by, read AFTER the lock is held (or the one a test gave), so a row that lapsed while the write waited for
 * the lock is counted as lapsed.
 */
export async function lockSenderIn(tx: Tx, senderId: string, given?: Date): Promise<Date> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`invites:${senderId}`}))`);
  return given ?? new Date();
}

export type SendResult = { ok: true } | { ok: false; reason: "invalid" | "out" };

/**
 * An invite by email (R5). The reservation is committed BEFORE Clerk is asked, so an invitation Clerk makes always
 * names a row that exists. After the commit every answer is a success: a refusal (an address with an account, or
 * someone else's pending invitation) keeps its reservation, and so does an indeterminate one, since Clerk may have
 * mailed it. Only a failure before the commit (it throws) can mean nothing was sent; the action draws E6 for it.
 */
export async function sendEmailInvite(
  senderId: string,
  rawEmail: string,
  deps: { clerk?: ClerkInvites; now?: Date } = {},
): Promise<SendResult> {
  if (!isEmailShape(rawEmail)) return { ok: false, reason: "invalid" };
  const email = normalizeEmail(rawEmail);
  const clerk = deps.clerk ?? clerkInvites;

  const reservationId = await db.transaction(async (tx) => {
    const now = await lockSenderIn(tx, senderId, deps.now);
    const { count } = await readCountIn(tx, senderId, now);
    if (count.out) return null;
    const [row] = await tx.insert(inviteReservations).values({
      userId: senderId,
      kind: "email",
      state: "reserved",
      email,
      holdsUntil: new Date(now.getTime() + HOLD_MS),
      createdAt: now,
    }).returning({ id: inviteReservations.id });
    return row.id;
  });
  if (reservationId === null) return { ok: false, reason: "out" };

  const made = await clerk.create({ emailAddress: email, reservationId, notify: true });
  if (made.ok) {
    let stored: boolean | null = null;
    try {
      const rows = await db.update(inviteReservations).set({ clerkInvitationId: made.id })
        .where(and(eq(inviteReservations.id, reservationId), eq(inviteReservations.state, "reserved")))
        .returning({ id: inviteReservations.id });
      stored = rows.length > 0;
    } catch {
      // The invitation exists without its id stored: the same as an indeterminate send, which the sweep reconciles.
      console.warn("[invites] invite-email sent, id not stored");
    }
    // The reservation was resolved while Clerk was asked (an admin revoke): its invite is back, so the ticket just
    // made must not stay usable.
    if (stored === false && !(await clerk.revoke(made.id))) console.warn("[invites] invite-email: late invitation not revoked");
  } else if (made.reason === "refused") {
    console.info(`[invites] invite-email refused code=${made.code ?? "none"}`);
  } else {
    console.warn("[invites] invite-email indeterminate");
  }
  return { ok: true };
}

export type QrResult =
  | { ok: true; token: string; expiresAt: Date }
  | { ok: false; reason: "out" | "unconfigured" };

/**
 * An invite QR (R3). A live one is returned as it is, from any page or device, by recomputing its token; only
 * without one does it take an invite (and refuse when none is left). Without the code secret nothing is written:
 * a token cannot be derived, so no QR could be shown for the invite it held.
 */
export async function showInviteQr(
  senderId: string,
  secret: string | null,
  given?: Date,
): Promise<QrResult> {
  if (!secret) return { ok: false, reason: "unconfigured" };
  return db.transaction(async (tx) => {
    const now = await lockSenderIn(tx, senderId, given);
    const [live] = await tx.select({
      id: inviteReservations.id, expiresAt: inviteReservations.qrExpiresAt, hash: inviteReservations.qrTokenHash,
    })
      .from(inviteReservations)
      .where(and(
        eq(inviteReservations.userId, senderId),
        eq(inviteReservations.state, "qr_open"),
        gt(inviteReservations.qrExpiresAt, now),
      ))
      .orderBy(desc(inviteReservations.qrExpiresAt))
      .limit(1);
    if (live?.expiresAt) {
      const token = qrToken(secret, live.id);
      if (secretHash(token) === live.hash) return { ok: true as const, token, expiresAt: live.expiresAt };
      // The code secret changed since this QR was made: no token derivable now opens it, so it is returned (its
      // invite back) and a new one is made below.
      await tx.update(inviteReservations).set({ state: "returned", resolvedAt: now })
        .where(eq(inviteReservations.id, live.id));
    }

    const { count } = await readCountIn(tx, senderId, now);
    if (count.out) return { ok: false as const, reason: "out" as const };
    const id = randomUUID();
    const token = qrToken(secret, id);
    const expiresAt = new Date(now.getTime() + QR_TTL_MS);
    await tx.insert(inviteReservations).values({
      id,
      userId: senderId,
      kind: "qr",
      state: "qr_open",
      qrTokenHash: secretHash(token),
      qrExpiresAt: expiresAt,
      createdAt: now,
    });
    return { ok: true as const, token, expiresAt };
  });
}

/** What the sender's sheet shows of its QR (Q2 to Q4). */
export type QrWatch = { state: "live"; secondsLeft: number } | { state: "claimed" } | { state: "expired" };

/**
 * The sender's own QR, by its token: null when no row of THIS sender's has it, so a token read alone tells another
 * account nothing. A claim (the newcomer's Send code) or a spend reads as claimed; a lapse, a return or a revoke as
 * expired.
 */
export async function readSenderQr(senderId: string, token: string, now: Date = new Date()): Promise<QrWatch | null> {
  const [row] = await db.select({ state: inviteReservations.state, expiresAt: inviteReservations.qrExpiresAt })
    .from(inviteReservations)
    .where(and(eq(inviteReservations.userId, senderId), eq(inviteReservations.qrTokenHash, secretHash(token))));
  if (!row) return null;
  return qrWatch(row.state, row.expiresAt, now);
}

export function qrWatch(state: string, expiresAt: Date | null, now: Date): QrWatch {
  if (state === "claimed" || state === "spent") return { state: "claimed" };
  if (state === "qr_open" && expiresAt && expiresAt.getTime() > now.getTime()) {
    return { state: "live", secondsLeft: Math.ceil((expiresAt.getTime() - now.getTime()) / 1000) };
  }
  return { state: "expired" };
}
