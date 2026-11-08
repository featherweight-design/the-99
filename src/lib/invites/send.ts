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
import { ownDisplayName } from "../social/friends";
import { clerkInvites, INVITATION_DAYS, type ClerkInvites } from "./clerk";
import { mailConfig, mailEnv, sendMail, type Mail, type MailConfig, type MailEnv, type MailResult } from "./mail";
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

export type SendResult = { ok: true } | { ok: false; reason: "invalid" | "out" | "failed" };

/** Escapes text for an HTML body: the sender's name is theirs to write. */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** The email invite: who sent it and the one link, Clerk's invitation ticket. */
export function inviteMail(to: string, senderName: string | null, url: string): Mail {
  const given = senderName?.replace(/\s+/g, " ").trim() ?? "";
  const name = given || "A friend";
  const subject = `${name} invited you to The 99`;
  const lead = `${name} invited you to The 99. It reads the cards you own and builds Commander decks from them.`;
  const tail = `The link works for ${INVITATION_DAYS} days. If you don't know ${given || "who sent it"}, ignore this email.`;
  return {
    to,
    subject,
    text: `${lead}\n\nJoin here: ${url}\n\n${tail}`,
    html: `<p>${escapeHtml(lead)}</p><p><a href="${escapeHtml(url)}">Join The 99</a></p><p>${escapeHtml(tail)}</p>`,
  };
}

/**
 * An invite by email (R5). The reservation is committed BEFORE Clerk is asked, so an invitation Clerk makes always
 * names a row that exists. Clerk makes the invitation without mailing it (`notify: false`); the app mails its own
 * through Resend, which a misconfigured deployment refuses before anything is held (`failed`, nothing sent).
 *
 * After the commit, a refusal (an address with an account, or someone else's pending invitation) answers as a
 * success and keeps its reservation, so the sender learns nothing about the address. An invitation the app could not
 * mail (Resend refused it, or Clerk's answer was lost and its invitation is ended) is revoked and its invite returned:
 * `failed`, and the sender may try again. One whose ending is not known keeps holding for the sweep, still `failed`,
 * since nobody was mailed. A Resend send with no answer may have been delivered, so it keeps its invitation and
 * answers as sent.
 */
export async function sendEmailInvite(
  senderId: string,
  rawEmail: string,
  deps: {
    clerk?: ClerkInvites;
    now?: Date;
    env?: MailEnv;
    senderName?: string | null;
    mail?: (config: MailConfig | null, mail: Mail) => Promise<MailResult>;
  } = {},
): Promise<SendResult> {
  if (!isEmailShape(rawEmail)) return { ok: false, reason: "invalid" };
  const email = normalizeEmail(rawEmail);
  const clerk = deps.clerk ?? clerkInvites;
  const config = mailConfig(deps.env ?? mailEnv());
  if (!config) {
    console.warn("[invites] invite-email unconfigured");
    return { ok: false, reason: "failed" };
  }
  // The profile is made before the send (`ensureSenderProfile`); read beside the reservation, not before it.
  const senderName = deps.senderName !== undefined ? Promise.resolve(deps.senderName)
    : ownDisplayName(senderId).catch(() => null);

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

  const made = await clerk.create({ emailAddress: email, reservationId, notify: false });
  if (made.ok) {
    let stored: boolean | null = null;
    try {
      const rows = await db.update(inviteReservations).set({ clerkInvitationId: made.id })
        .where(and(eq(inviteReservations.id, reservationId), eq(inviteReservations.state, "reserved")))
        .returning({ id: inviteReservations.id });
      stored = rows.length > 0;
    } catch {
      // The invitation exists without its id stored: the sweep reconciles it, as it does an indeterminate send.
      console.warn("[invites] invite-email made, id not stored");
    }
    // The reservation was resolved while Clerk was asked (an admin revoke): its invite is back, so the ticket just
    // made must not stay usable, and is never mailed.
    if (stored === false) {
      if (!(await clerk.revoke(made.id))) console.warn("[invites] invite-email: late invitation not revoked");
      return { ok: true };
    }
    const sent: MailResult = made.url === null
      ? { ok: false, reason: "failed" }
      : await (deps.mail ?? sendMail)(config, inviteMail(email, await senderName, made.url));
    // Delivered, or perhaps delivered: a lost answer keeps its invitation, so a link that reached the inbox works.
    if (sent.ok || sent.reason === "indeterminate") return { ok: true };
    console.warn(`[invites] invite-email not mailed${made.url === null ? " url=none" : ""}`);
    // Nobody was mailed: the ticket is ended and the invite given back, so the sender can try again.
    if (await clerk.revoke(made.id)) await returnReservation(reservationId);
    else console.warn("[invites] invite-email: unmailed invitation not revoked");
    return { ok: false, reason: "failed" };
  }
  if (made.reason === "refused") {
    console.info(`[invites] invite-email refused code=${made.code ?? "none"}`);
    return { ok: true };
  }
  console.warn("[invites] invite-email indeterminate");
  // Clerk may have made it, unmailed (`notify: false`). End it now and give the invite back; when that is not known,
  // the reservation keeps holding and the sweep reconciles it by its address (PR 3).
  if (await clerk.revokeFor(email, reservationId)) await returnReservation(reservationId);
  else console.warn("[invites] invite-email: indeterminate invitation not reconciled");
  return { ok: false, reason: "failed" };
}

/**
 * Gives an email reservation's invite back, its address erased, unless it was resolved meanwhile (an admin revoke). A
 * failure leaves it holding until the sweep returns it; it never reaches the action, whose catch means "before the
 * reservation".
 */
async function returnReservation(reservationId: string): Promise<void> {
  try {
    await db.update(inviteReservations)
      .set({ state: "returned", email: null, clerkInvitationId: null, resolvedAt: new Date() })
      .where(and(eq(inviteReservations.id, reservationId), eq(inviteReservations.state, "reserved")));
  } catch {
    console.warn("[invites] invite-email: unmailed reservation not returned");
  }
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
