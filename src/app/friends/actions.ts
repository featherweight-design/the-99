"use server";

// Social R1's writes (plan `2026-10-15-social-r1.md`, PR B; audit E12, E18). Every action takes the reader
// from the session, decides `SOCIAL_FRIENDS_ENABLED` for THAT reader (`requestSwitchEnv`), and refuses as
// `off` while it is off: the library functions do not check the switch themselves. Each maps its library
// result to an outcome the screen draws, so a `false` that means "refused" never reads as done; only a
// revoke, a member removal, a pod delete and turning spares off may report `changed: false` as done (E12).
//
// Revalidation: a write made from `/friends` revalidates it inline, because that page redraws from the
// reply. The friend link's writes (accept, decline, the already-friends spend) are made from
// `/friend/[token]`, and an inline revalidation re-renders the CALLER's route into the reply: the card
// would redraw as a spent link over the outcome it is showing. So those defer `/friends` with `after()`.
// Nothing here names a social table: the writes live in `lib/social/`.

import { after } from "next/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUserId } from "../../lib/auth";
import { socialFriendsEnabled } from "../../lib/social/flag";
import { requestSwitchEnv } from "../../lib/switches/request";
import {
  createInvite, declineInvite, readInvite, redeemInvite, revokeInvite, setDisplayName, spendAlreadyFriendsInvite, unfriend,
} from "../../lib/social/friends";
import { setCommander } from "../../lib/social/commander";
import { addMembers, createPod, deletePod, leavePod, removeMember, renamePod, type LeaveOutcome } from "../../lib/social/pods";
import { shareSparesWith } from "../../lib/social/spares";
import { cleanDisplayName, cleanPodName } from "../../lib/social/rules";
import { invitePath, isInviteToken, originFrom } from "../../lib/social/client-rules";

type Off = { ok: false; reason: "off" };
const OFF: Off = { ok: false, reason: "off" };

/** The signed-in reader, when their own switch is on; null when it is off. */
async function socialReader(): Promise<string | null> {
  const userId = await requireUserId();
  return socialFriendsEnabled(await requestSwitchEnv(userId)) ? userId : null;
}

const FRIENDS = "/friends";
const refreshFriends = () => revalidatePath(FRIENDS);
const refreshFriendsLater = () => after(() => revalidatePath(FRIENDS));

// --- Your face -------------------------------------------------------------------------------------

export type SetNameOutcome = { ok: true; displayName: string } | Off | { ok: false; reason: "invalid" | "noProfile" };

/** `invalid`: the name fails `cleanName` (empty, over 30 code points, a control character). */
export async function setDisplayNameAction(name: unknown): Promise<SetNameOutcome> {
  const userId = await socialReader();
  if (!userId) return OFF;
  const displayName = cleanDisplayName(name);
  if (displayName === null) return { ok: false, reason: "invalid" };
  if (!(await setDisplayName(userId, displayName))) return { ok: false, reason: "noProfile" };
  refreshFriends();
  return { ok: true, displayName };
}

export type SetCommanderOutcome = { ok: true } | Off | { ok: false; reason: "notCommander" | "noProfile" };

/** Null clears the face back to initials (`Use initials instead`). */
export async function setCommanderAction(oracleId: unknown): Promise<SetCommanderOutcome> {
  const userId = await socialReader();
  if (!userId) return OFF;
  const result = await setCommander(userId, oracleId);
  if (!result.ok) return result;
  refreshFriends();
  return { ok: true };
}

// --- Friend links ----------------------------------------------------------------------------------

export type CreateInviteOutcome =
  | { ok: true; token: string; url: string; expiresAt: Date }
  | Off
  | { ok: false; reason: "tooMany" | "noOrigin" };

/**
 * One more link, addressed at the request's own origin (E7). The origin is read BEFORE the write, so a
 * request whose host cannot be read makes no link it could not hand back.
 */
export async function createInviteAction(): Promise<CreateInviteOutcome> {
  const userId = await socialReader();
  if (!userId) return OFF;
  const origin = originFrom(await headers());
  if (origin === null) return { ok: false, reason: "noOrigin" };
  const made = await createInvite(userId);
  if (!made.ok) return made;
  refreshFriends();
  return { ok: true, token: made.token, url: `${origin}${invitePath(made.token)}`, expiresAt: made.expiresAt };
}

/** A link already ended (or never yours) is gone either way: `changed: false` reads as done (E12). */
export type DoneOutcome = { ok: true; changed: boolean } | Off;

export async function revokeInviteAction(token: unknown): Promise<DoneOutcome> {
  const userId = await socialReader();
  if (!userId) return OFF;
  const changed = isInviteToken(token) && (await revokeInvite(userId, token));
  refreshFriends();
  return { ok: true, changed };
}

export type RedeemOutcome =
  | { ok: true; friend: { publicId: string; displayName: string }; alreadyFriends: boolean }
  | Off
  | { ok: false; reason: "notFound" | "ended" | "self" };

/** Accept. The receipt on `/friends` is resolved by `friend.publicId` (E10). */
export async function redeemInviteAction(token: unknown): Promise<RedeemOutcome> {
  const userId = await socialReader();
  if (!userId) return OFF;
  if (!isInviteToken(token)) return { ok: false, reason: "notFound" };
  const result = await redeemInvite(userId, token);
  if (result.ok) refreshFriendsLater();
  return result;
}

export type DeclineOutcome = { ok: true } | Off | { ok: false; reason: "ended" | "self" | "failed" };

/**
 * Decline. The library's `false` covers both an ended link and your own (E12), so a refusal is answered
 * from a fresh read: the card redraws as what the link now is, never as declined.
 */
export async function declineInviteAction(token: unknown): Promise<DeclineOutcome> {
  const userId = await socialReader();
  if (!userId) return OFF;
  if (!isInviteToken(token)) return { ok: false, reason: "ended" };
  if (await declineInvite(userId, token)) {
    refreshFriendsLater();
    return { ok: true };
  }
  const now = await readInvite(userId, token);
  if (now === null || now.state !== "open") return { ok: false, reason: "ended" };
  return { ok: false, reason: now.self ? "self" : "failed" };
}

export type SpendOutcome = { ok: true; spent: boolean } | Off;

/**
 * An already-friends link is spent by opening it (G4). Called ONCE from the landing after it mounts,
 * never from a render, which can run twice. It spends only a link that is open, not the reader's own, and
 * from someone the reader is already friends with, read fresh here: a stranger's open link is never
 * accepted by a page view. `spent: false` means there was nothing to spend, which the card does not draw.
 */
export async function spendFriendLinkAction(token: unknown): Promise<SpendOutcome> {
  const userId = await socialReader();
  if (!userId) return OFF;
  if (!isInviteToken(token)) return { ok: true, spent: false };
  // Marks the link used and writes no friendship, so an unfriend that lands first is never undone by a view.
  const spent = await spendAlreadyFriendsInvite(userId, token);
  if (spent) refreshFriendsLater();
  return { ok: true, spent };
}

export type UnfriendOutcome = { ok: true } | Off | { ok: false; reason: "notFriend" };

/** `notFriend`: no friendship with that `publicId` stands, so there was nothing to remove. */
export async function unfriendAction(friendPublicId: unknown): Promise<UnfriendOutcome> {
  const userId = await socialReader();
  if (!userId) return OFF;
  const removed = await unfriend(userId, friendPublicId);
  refreshFriends();
  return removed ? { ok: true } : { ok: false, reason: "notFriend" };
}

// --- Pods ------------------------------------------------------------------------------------------

export type CreatePodOutcome = { ok: true; podId: string } | Off | { ok: false; reason: "invalid" };

export async function createPodAction(name: unknown): Promise<CreatePodOutcome> {
  const userId = await socialReader();
  if (!userId) return OFF;
  const pod = await createPod(userId, name);
  if (pod === null) return { ok: false, reason: "invalid" };
  refreshFriends();
  return { ok: true, podId: pod.id };
}

export type RenamePodOutcome = { ok: true; name: string } | Off | { ok: false; reason: "invalid" | "notOwner" };

/** `invalid` is the name; `notOwner` is a pod the reader does not own (or that is gone). */
export async function renamePodAction(podId: unknown, name: unknown): Promise<RenamePodOutcome> {
  const userId = await socialReader();
  if (!userId) return OFF;
  const clean = cleanPodName(name);
  if (clean === null) return { ok: false, reason: "invalid" };
  if (!(await renamePod(userId, podId, clean))) return { ok: false, reason: "notOwner" };
  refreshFriends();
  return { ok: true, name: clean };
}

/** A pod already gone is gone: `changed: false` reads as done (E12). */
export async function deletePodAction(podId: unknown): Promise<DoneOutcome> {
  const userId = await socialReader();
  if (!userId) return OFF;
  const changed = await deletePod(userId, podId);
  refreshFriends();
  return { ok: true, changed };
}

export type AddMembersOutcome = { ok: true; added: number } | Off | { ok: false; reason: "invalid" | "notOwner" | "notFriend" };

/** All or none (E11): `notFriend` adds nobody. */
export async function addMembersAction(podId: unknown, friendPublicIds: unknown): Promise<AddMembersOutcome> {
  const userId = await socialReader();
  if (!userId) return OFF;
  const result = await addMembers(userId, podId, friendPublicIds);
  if (result.ok) refreshFriends();
  return result;
}

/** A member already out is out: `changed: false` reads as done (E12). */
export async function removeMemberAction(podId: unknown, memberPublicId: unknown): Promise<DoneOutcome> {
  const userId = await socialReader();
  if (!userId) return OFF;
  const changed = await removeMember(userId, podId, memberPublicId);
  refreshFriends();
  return { ok: true, changed };
}

export type LeavePodOutcome = { ok: true; outcome: Exclude<LeaveOutcome, "notMember"> } | Off | { ok: false; reason: "notMember" };

export async function leavePodAction(podId: unknown): Promise<LeavePodOutcome> {
  const userId = await socialReader();
  if (!userId) return OFF;
  const outcome = await leavePod(userId, podId);
  if (outcome === "notMember") return { ok: false, reason: "notMember" };
  refreshFriends();
  return { ok: true, outcome };
}

export type ShareSparesOutcome = { ok: true; on: boolean } | Off | { ok: false; reason: "notMember" };

/**
 * Share spares with a pod, or stop (E12). Turning it ON refuses as `notMember` for a pod the reader is not
 * in; turning it OFF always ends unshared, so the library's `false` there (already off) is done.
 */
export async function shareSparesWithAction(podId: unknown, on: unknown): Promise<ShareSparesOutcome> {
  const userId = await socialReader();
  if (!userId) return OFF;
  const want = on === true;
  const written = await shareSparesWith(userId, podId, want);
  if (want && !written) return { ok: false, reason: "notMember" };
  refreshFriends();
  return { ok: true, on: want };
}
