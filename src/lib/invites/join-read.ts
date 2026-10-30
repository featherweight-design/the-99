/**
 * What `/join/[token]` draws on arrival (plan `2026-10-16-invites.md`, PR 5; boards N1 to N12). SERVER-ONLY. One read of
 * the token's row, judged against the claim cookie, so a reopened page redraws the step the newcomer reached (N6) and a
 * row that is not this browser's reads as ended. Everything that is not a live invite names nobody (N11, N12).
 */
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { inviteReservations } from "../../db/schema";
import { readInviteSender, type InviteSender } from "../social/friends";
import { socialFriendsEnabled } from "../social/flag";
import { resolveSwitchEnv } from "../switches/snapshot";
import { CODE_MAX_TRIES, codeState, isQrToken, resendWaitMs } from "./rules";
import { secretHash } from "./tokens";

type Row = typeof inviteReservations.$inferSelect;

export type JoinView =
  | { kind: "email"; sender: InviteSender }
  | { kind: "code"; sender: InviteSender; email: string; resendWaitMs: number; expired: boolean }
  | { kind: "proven"; sender: InviteSender; email: string }
  | { kind: "expired" }
  | { kind: "ended" };

const ENDED: JoinView = { kind: "ended" };

/** The step a row is at for a browser presenting `secret`; pure over the row. Null sender is added by the caller. */
export function joinStep(row: Row | undefined, secret: string | null, now: Date):
  | { kind: "email" }
  | { kind: "code"; email: string; resendWaitMs: number; expired: boolean }
  | { kind: "proven"; email: string }
  | { kind: "expired" }
  | { kind: "ended" } {
  if (!row || row.kind !== "qr") return ENDED;
  if (row.state === "qr_open") {
    return row.qrExpiresAt !== null && row.qrExpiresAt.getTime() > now.getTime() ? { kind: "email" } : { kind: "expired" };
  }
  if (row.state !== "claimed" || row.holdsUntil === null || row.holdsUntil.getTime() <= now.getTime()) return ENDED;
  // Only the browser that claimed it: the cookie's hash, or the page names nobody.
  if (secret === null || row.claimSecretHash === null || secretHash(secret) !== row.claimSecretHash) return ENDED;
  if (row.codeTries >= CODE_MAX_TRIES || row.email === null) return ENDED;
  if (row.provenAt !== null) return { kind: "proven", email: row.email };
  return {
    kind: "code",
    email: row.email,
    resendWaitMs: resendWaitMs(row.codeSentAt, now),
    expired: codeState(row, now) !== "live",
  };
}

export async function readJoin(token: string, secret: string | null, now: Date = new Date()): Promise<JoinView> {
  if (!isQrToken(token)) return ENDED;
  const [row] = await db.select().from(inviteReservations).where(eq(inviteReservations.qrTokenHash, secretHash(token)));
  if (!row) return ENDED;
  // The sender's friends switch (invites follow friends), as the actions decide it; off reads as an ended invite.
  if (!socialFriendsEnabled(await resolveSwitchEnv(row.userId))) return ENDED;
  const step = joinStep(row, secret, now);
  if (step.kind === "ended") return ENDED;
  // An expired QR names nobody (N11), so the sender is not read for it.
  if (step.kind === "expired") return step;
  const sender = await readInviteSender(row.userId);
  if (!sender) return ENDED;
  return { ...step, sender };
}
