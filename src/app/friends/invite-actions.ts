"use server";

// The sender's two ways to invite someone new (plan `2026-10-16-invites.md`, PR 2; dark until PR 4 draws them). Each
// action takes the reader from the session.

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUserId } from "../../lib/auth";
import { ensureSenderProfile } from "./sender-profile";
import { atFloor } from "../../lib/invites/floor";
import { sendEmailInvite, showInviteQr } from "../../lib/invites/send";
import { joinPath } from "../../lib/invites/rules";
import { inviteSecret } from "../../lib/invites/tokens";
import { observeHit } from "../../lib/rate/observe";
import { originFrom } from "../../lib/social/client-rules";

// `off` is no longer answered (the friends switch is retired); it stays in the outcomes until the screens stop naming it.
type Off = { ok: false; reason: "off" };

export type SendEmailInviteOutcome = { ok: true } | Off | { ok: false; reason: "invalid" | "out" | "failed" };

/**
 * By email (R5). `invalid` is the address's shape (E1), checked before anything else, and `out` none left; neither
 * reaches Clerk. Everything that reached Clerk answers `ok`, at the floor, whatever Clerk said: a refusal and a
 * success read alike in words AND in time. `failed` (E6) is a failure before the reservation committed, the one
 * case in which nothing can have been sent; it waits for the floor too.
 */
export async function sendEmailInviteAction(email: unknown): Promise<SendEmailInviteOutcome> {
  const userId = await requireUserId();
  if (typeof email !== "string") return { ok: false, reason: "invalid" };
  await observeHit(userId, "invite-email");
  // The newcomer's friend row lists the sender through their profile: made first (sender-profile.ts).
  await ensureSenderProfile(userId);
  const outcome = await atFloor(async (): Promise<SendEmailInviteOutcome> => {
    try {
      return await sendEmailInvite(userId, email);
    } catch {
      console.warn("[invites] invite-email failed before the reservation");
      return { ok: false, reason: "failed" };
    }
  });
  if (outcome.ok) revalidatePath("/friends");
  return outcome;
}

export type ShowInviteQrOutcome =
  | { ok: true; token: string; url: string; expiresAt: Date }
  | Off
  | { ok: false; reason: "out" | "unconfigured" | "noOrigin" };

/**
 * At the table (R3): the live QR again, or a new one holding an invite. The origin is read BEFORE the write, so a
 * request whose host cannot be read holds nothing it could not hand back.
 */
export async function showInviteQrAction(): Promise<ShowInviteQrOutcome> {
  const userId = await requireUserId();
  const origin = originFrom(await headers());
  if (origin === null) return { ok: false, reason: "noOrigin" };
  await ensureSenderProfile(userId);
  const secret = inviteSecret({ INVITE_CODE_SECRET: process.env.INVITE_CODE_SECRET });
  if (!secret) console.warn("[invites] invite-qr unconfigured");
  const shown = await showInviteQr(userId, secret);
  if (!shown.ok) return shown;
  revalidatePath("/friends");
  return { ok: true, token: shown.token, url: `${origin}${joinPath(shown.token)}`, expiresAt: shown.expiresAt };
}
