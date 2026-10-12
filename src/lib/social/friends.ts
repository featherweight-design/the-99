/**
 * Friends and invites: the writes (plan `boards/plan-social-foundation-2026-10-12.md`). Every function
 * takes the viewer's id, which the caller has from the session; nothing here takes another account's id
 * from a client. A friend arrives as a `publicId` and is resolved through `access.ts` on the viewer's
 * own links, and an invite is reached only by its token. There is no search and no directory.
 *
 * No route or action calls these yet: the foundation ships dark behind `SOCIAL_FRIENDS_ENABLED`, and
 * the first UI PR wires them.
 */
import { and, asc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { friendInvites, friendLinks, podMembers, pods, socialProfiles } from "../../db/schema";
import { resolveFriend } from "./access";
import {
  cleanDisplayName, friendshipRows, INVITE_TTL_MS, inviteState, MAX_OPEN_INVITES, newInviteToken, type InviteState,
} from "./rules";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The viewer's profile, created on first use with the name the caller offers (the Clerk first name,
 * which the player can edit). A name that does not pass `cleanDisplayName` falls back to "Player", so a
 * first visit never fails on what Clerk holds.
 */
export async function ensureProfile(viewerId: string, offeredName: unknown): Promise<{ publicId: string; displayName: string }> {
  const displayName = cleanDisplayName(offeredName) ?? "Player";
  await db.insert(socialProfiles).values({ userId: viewerId, displayName }).onConflictDoNothing();
  const [row] = await db
    .select({ publicId: socialProfiles.publicId, displayName: socialProfiles.displayName })
    .from(socialProfiles)
    .where(eq(socialProfiles.userId, viewerId));
  return row;
}

export async function setDisplayName(viewerId: string, raw: unknown): Promise<boolean> {
  const displayName = cleanDisplayName(raw);
  if (displayName === null) return false;
  const written = await db
    .update(socialProfiles)
    .set({ displayName })
    .where(eq(socialProfiles.userId, viewerId))
    .returning({ userId: socialProfiles.userId });
  return written.length > 0;
}

/** Unended and unexpired: the row shape `inviteState` calls open, as a predicate. */
const openInvite = (now: Date) =>
  and(isNull(friendInvites.redeemedAt), isNull(friendInvites.declinedAt), isNull(friendInvites.revokedAt), gt(friendInvites.expiresAt, now));

/**
 * One more invite link, unless the viewer already holds `MAX_OPEN_INVITES` open ones. The count and the
 * insert run under a per-inviter advisory lock, so two presses at once cannot both pass the cap.
 */
export async function createInvite(
  viewerId: string,
  now = new Date(),
): Promise<{ ok: true; token: string; expiresAt: Date } | { ok: false; reason: "tooMany" }> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`friend_invites:${viewerId}`}))`);
    const [{ open }] = await tx
      .select({ open: sql<number>`count(*)::int` })
      .from(friendInvites)
      .where(and(eq(friendInvites.inviterUserId, viewerId), openInvite(now)));
    if (open >= MAX_OPEN_INVITES) return { ok: false as const, reason: "tooMany" as const };
    const token = newInviteToken();
    const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
    await tx.insert(friendInvites).values({ token, inviterUserId: viewerId, createdAt: now, expiresAt });
    return { ok: true as const, token, expiresAt };
  });
}

/** The inviter takes back an open link. Only their own, and only while open. */
export async function revokeInvite(viewerId: string, token: string, now = new Date()): Promise<boolean> {
  const written = await db
    .update(friendInvites)
    .set({ revokedAt: now })
    .where(and(eq(friendInvites.token, token), eq(friendInvites.inviterUserId, viewerId), openInvite(now)))
    .returning({ token: friendInvites.token });
  return written.length > 0;
}

export type InviteView =
  | { state: InviteState; inviterName: string; self: boolean; alreadyFriends: boolean }
  | null;

/**
 * What the landing page may say about a token: its state and the inviter's display name, nothing about
 * their decks or collection. Null for a token that names nothing, which the page draws exactly as it
 * draws an ended one.
 */
export async function readInvite(viewerId: string, token: string, now = new Date()): Promise<InviteView> {
  const [row] = await db
    .select({
      inviterUserId: friendInvites.inviterUserId,
      expiresAt: friendInvites.expiresAt,
      redeemedAt: friendInvites.redeemedAt,
      declinedAt: friendInvites.declinedAt,
      revokedAt: friendInvites.revokedAt,
      inviterName: socialProfiles.displayName,
      alreadyFriends: sql<boolean>`exists (
        select 1 from ${friendLinks} fl where fl.user_id = ${viewerId} and fl.friend_user_id = ${friendInvites.inviterUserId}
      )`,
    })
    .from(friendInvites)
    .innerJoin(socialProfiles, eq(socialProfiles.userId, friendInvites.inviterUserId))
    .where(eq(friendInvites.token, token));
  if (!row) return null;
  return {
    state: inviteState(row, now),
    inviterName: row.inviterName,
    self: row.inviterUserId === viewerId,
    alreadyFriends: row.alreadyFriends,
  };
}

/** Both directed rows, in `friendshipRows`' order, and nothing if the friendship already stands. */
async function befriendIn(tx: Tx, a: string, b: string): Promise<void> {
  await tx.insert(friendLinks).values(friendshipRows(a, b)).onConflictDoNothing();
}

export type RedeemResult =
  | { ok: true; friend: { publicId: string; displayName: string }; alreadyFriends: boolean }
  | { ok: false; reason: "notFound" | "ended" | "self" };

/**
 * Accept: spend the token and write the friendship, in one transaction, with the invite row locked so
 * two accepts of one link cannot both succeed. A link from a friend you already have is spent and
 * reports so; your own link is refused and stays open.
 */
export async function redeemInvite(viewerId: string, token: string, now = new Date()): Promise<RedeemResult> {
  return db.transaction(async (tx) => {
    const [invite] = await tx
      .select()
      .from(friendInvites)
      .where(eq(friendInvites.token, token))
      .for("update");
    if (!invite) return { ok: false as const, reason: "notFound" as const };
    if (invite.inviterUserId === viewerId) return { ok: false as const, reason: "self" as const };
    if (inviteState(invite, now) !== "open") return { ok: false as const, reason: "ended" as const };
    const [inviter] = await tx
      .select({ publicId: socialProfiles.publicId, displayName: socialProfiles.displayName })
      .from(socialProfiles)
      .where(eq(socialProfiles.userId, invite.inviterUserId));
    // An inviter whose profile is gone (a purged account) has nobody to befriend.
    if (!inviter) return { ok: false as const, reason: "notFound" as const };
    const [existing] = await tx
      .select({ userId: friendLinks.userId })
      .from(friendLinks)
      .where(and(eq(friendLinks.userId, viewerId), eq(friendLinks.friendUserId, invite.inviterUserId)));
    await tx.update(friendInvites).set({ redeemedBy: viewerId, redeemedAt: now }).where(eq(friendInvites.token, token));
    await befriendIn(tx, viewerId, invite.inviterUserId);
    return { ok: true as const, friend: inviter, alreadyFriends: existing !== undefined };
  });
}

/** Decline: the token is spent and nobody is told. Your own link cannot be declined, only revoked. */
export async function declineInvite(viewerId: string, token: string, now = new Date()): Promise<boolean> {
  const written = await db
    .update(friendInvites)
    .set({ declinedAt: now })
    .where(and(
      eq(friendInvites.token, token),
      sql`${friendInvites.inviterUserId} <> ${viewerId}`,
      openInvite(now),
    ))
    .returning({ token: friendInvites.token });
  return written.length > 0;
}

/**
 * Remove a friend, from either side, silently: both directed rows, and each of the two from every pod
 * the other owns (an owner adds only friends, Q4), in one transaction. Rows are deleted in `friendshipRows`'
 * order so the two readers' stamps are taken the same way round as `befriendIn` takes them.
 */
export async function unfriend(viewerId: string, friendPublicId: unknown): Promise<boolean> {
  return db.transaction(async (tx) => {
    const friendId = await resolveFriend(viewerId, friendPublicId, tx);
    if (friendId === null) return false;
    // Lock every pod either side owns, in id order, BEFORE touching links or memberships: `addMember` and
    // `leavePod` take the same pod lock, so an add cannot validate this friendship and insert after the
    // delete below, and a leave cannot hand a pod to a member this transaction is removing.
    await tx
      .select({ id: pods.id })
      .from(pods)
      .where(inArray(pods.ownerUserId, [viewerId, friendId]))
      .orderBy(asc(pods.id))
      .for("update");
    for (const row of friendshipRows(viewerId, friendId)) {
      await tx.delete(friendLinks).where(and(eq(friendLinks.userId, row.userId), eq(friendLinks.friendUserId, row.friendUserId)));
    }
    // Each leaves the pods the other owns. A pod's other members are untouched.
    for (const [owner, member] of [[viewerId, friendId], [friendId, viewerId]] as const) {
      const ownedBy = tx.select({ id: pods.id }).from(pods).where(eq(pods.ownerUserId, owner));
      await tx.delete(podMembers).where(and(eq(podMembers.userId, member), inArray(podMembers.podId, ownedBy)));
    }
    return true;
  });
}
