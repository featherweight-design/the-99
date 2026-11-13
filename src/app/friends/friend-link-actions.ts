"use server";

// Add a friend with friend links on (friend links R1, PR 3): the reader's own reusable link, its QR and code; Reset; and a
// friend's code typed in. Each action takes the reader from the session and resolves THAT reader's switches
// (`requestFlags`); with FRIEND_LINKS_ENABLED off every one answers `off` and writes nothing.

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUserId } from "../../lib/auth";
import { friendLinksEnabled } from "../../lib/friend-links/flag";
import { requestFlags } from "../../lib/flags/request";
import { mailEnv } from "../../lib/invites/mail";
import { inviteSecret } from "../../lib/invites/tokens";
import { enforceHit } from "../../lib/rate/observe";
import { invitePath, originFrom } from "../../lib/social/client-rules";
import { ownLinkKey, resetLinkKey } from "../../lib/social/friend-link-keys";
import { sendFriendRequest, type RequestOwner } from "../../lib/social/friend-requests";
import { ensureSenderProfile } from "./sender-profile";

export type FriendLinkView = { url: string; code: string };
export type FriendLinkOutcome = { ok: true; link: FriendLinkView } | { ok: false; reason: "off" | "failed" | "limited" };

async function reader() {
  const userId = await requireUserId();
  const env = await requestFlags(userId);
  return { userId, env, on: friendLinksEnabled(env) };
}

const shown = (origin: string, key: { token: string; code: string }): FriendLinkView => ({ url: `${origin}${invitePath(key.token)}`, code: key.code });

/** The reader's own link and code, minted on the first read (the profile first: a key needs one). */
export async function loadFriendLinkAction(): Promise<FriendLinkOutcome> {
  const { userId, on } = await reader();
  if (!on) return { ok: false, reason: "off" };
  const origin = originFrom(await headers());
  if (origin === null) return { ok: false, reason: "failed" };
  await ensureSenderProfile(userId);
  const key = await ownLinkKey(userId, inviteSecret(mailEnv()));
  return key.ok ? { ok: true, link: shown(origin, key.key) } : { ok: false, reason: "failed" };
}

/** Reset (G5, H3): a new link and code; the old ones open nothing. ENFORCED `friend-reset-day`, 5 a day. */
export async function resetFriendLinkAction(): Promise<FriendLinkOutcome> {
  const { userId, on } = await reader();
  if (!on) return { ok: false, reason: "off" };
  // The origin first (as `createInviteAction` reads it): a reset whose new link could not be handed back would retire
  // the old one and answer "failed", and each Try again would spend another of the day's resets.
  const origin = originFrom(await headers());
  if (origin === null) return { ok: false, reason: "failed" };
  if ((await enforceHit(userId, "friend-reset-day")) !== null) return { ok: false, reason: "limited" };
  const key = await resetLinkKey(userId, inviteSecret(mailEnv()));
  return key.ok ? { ok: true, link: shown(origin, key.key) } : { ok: false, reason: "failed" };
}

export type CodeSendOutcome =
  | { ok: true; outcome: "sent" | "alreadyFriends" | "nowFriends"; owner: RequestOwner }
  | { ok: false; reason: "off" | "wrong" | "own" | "limited" | "failed" };

/** A friend's code typed in Add a friend: a request to its owner, or friends at once when they had asked first (A9). */
export async function sendCodeRequestAction(code: unknown): Promise<CodeSendOutcome> {
  const { userId, env, on } = await reader();
  if (!on) return { ok: false, reason: "off" };
  await ensureSenderProfile(userId);
  const sent = await sendFriendRequest(userId, { via: "code", code }, env, inviteSecret(mailEnv()));
  if (sent.ok) {
    // A new friend shows on /friends and on Home's Friends section, either of which the sheet was opened from.
    if (sent.outcome === "nowFriends") {
      revalidatePath("/friends");
      revalidatePath("/");
    }
    return sent;
  }
  if (sent.reason === "notFound") return { ok: false, reason: "wrong" };
  if (sent.reason === "self") return { ok: false, reason: "own" };
  if (sent.reason === "limited") return { ok: false, reason: "limited" };
  return { ok: false, reason: "failed" };
}
