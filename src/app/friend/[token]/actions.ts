"use server";

// Join on a friend link's signed-out landing (friend links R1, PR 2). The visitor has no account, so there is no reader:
// the link's OWNER is found from the token, and their own switch decides whether the link works (`openLinkJoin`). Capped
// per visitor and link, then per link across visitors (`friend-join`, `friend-join-all`, ENFORCED, apart from the page
// view's own count): a refused Join reads as the link being busy, naming nothing new.

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUserId } from "../../../lib/auth";
import { requestFlags } from "../../../lib/flags/request";
import { sendFriendRequest, withdrawFriendRequest } from "../../../lib/social/friend-requests";
import { ensureSenderProfile } from "../../friends/sender-profile";
import { openLinkJoin } from "../../../lib/invites/link-join";
import { mailEnv } from "../../../lib/invites/mail";
import { joinPath } from "../../../lib/invites/rules";
import { inviteSecret } from "../../../lib/invites/tokens";
import { newcomerRefusal } from "../../../lib/rate/anon";
import { isInviteToken } from "../../../lib/social/client-rules";

export type LinkJoinOutcome = { ok: true; path: string } | { ok: false; reason: "ended" | "out" | "busy" | "unconfigured" };

export async function joinFromLinkAction(token: unknown): Promise<LinkJoinOutcome> {
  if (!isInviteToken(token)) return { ok: false, reason: "ended" };
  if ((await newcomerRefusal(await headers(), "friend-join", "friend-join-all", "friend-link", token)) !== null) return { ok: false, reason: "busy" };
  const result = await openLinkJoin(token, inviteSecret(mailEnv()));
  return result.ok ? { ok: true, path: joinPath(result.token) } : result;
}

export type LinkSendOutcome =
  | { ok: true; outcome: "sent" | "alreadyFriends" | "nowFriends"; sentAt: string }
  | { ok: false; reason: "ended" | "self" | "limited" | "failed" };

/**
 * A signed-in open of a friend link sends the request (G2), from the page after mount, never from a GET render, so a
 * preview or a prefetch sends nothing. Opening a link already asked sends nothing new and is not counted.
 */
export async function sendLinkRequestAction(token: unknown): Promise<LinkSendOutcome> {
  const userId = await requireUserId();
  await ensureSenderProfile(userId);
  const sent = await sendFriendRequest(userId, { via: "link", token }, await requestFlags(userId), inviteSecret(mailEnv()));
  if (sent.ok) {
    revalidatePath("/friends");
    return { ok: true, outcome: sent.outcome, sentAt: new Date().toISOString() };
  }
  if (sent.reason === "notFound") return { ok: false, reason: "ended" };
  if (sent.reason === "self") return { ok: false, reason: "self" };
  if (sent.reason === "limited") return { ok: false, reason: "limited" };
  return { ok: false, reason: "failed" };
}

/** Withdraw (G4, L3): the request is taken back; the owner is never told. */
export async function withdrawLinkRequestAction(ownerPublicId: unknown): Promise<boolean> {
  const userId = await requireUserId();
  const done = await withdrawFriendRequest(userId, ownerPublicId);
  if (done) revalidatePath("/friends");
  return done;
}
