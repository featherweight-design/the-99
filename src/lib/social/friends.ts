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
import { friendInvites, friendLinks, podMembers, podSpareShares, pods, socialProfiles } from "../../db/schema";
import { listFriends, resolveFriend, type Friend, type Reader } from "./access";
import { commanderCard, commanderColumns, facePrinting, faceJoin, toCommander, type ProfileCommander } from "./commander";
import {
  cleanDisplayName, friendshipRows, INVITE_TTL_MS, inviteState, MAX_OPEN_INVITES, newInviteToken, type InviteState,
} from "./rules";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The player's own face, with the pick behind it (avatar handoff G2): the printing they chose, or null for the usual
 * art, and whether that pick is no longer drawn (`printingGone`, P8). Derived from the SAME join the art takes
 * (`faceJoin`), so the picker's note and the face friends see cannot disagree. Only the own read carries these; a
 * friend's read never learns what was picked, only the art.
 */
export type OwnCommander = ProfileCommander & { printingId: string | null; printingGone: boolean };

export type OwnProfile = { publicId: string; displayName: string; commander: OwnCommander | null };

/** The pick behind the player's own face, for an own read's projection beside `commanderColumns` (G2, P8). */
export const ownPickColumns = {
  printingId: socialProfiles.commanderPrintingId,
  printingGone: sql<boolean>`(${socialProfiles.commanderPrintingId} is not null and ${facePrinting.artCropUri} is null)`,
};

/** The player's own face from an own read, or null for initials. */
export function toOwnCommander(r: Parameters<typeof toCommander>[0] & { printingId: string | null; printingGone: boolean | null }): OwnCommander | null {
  const face = toCommander(r);
  return face && { ...face, printingId: r.printingId, printingGone: Boolean(r.printingGone) };
}

/**
 * The viewer's profile, created on first use with the name the caller offers (the Clerk first name,
 * which the player can edit). A name that does not pass `cleanDisplayName` falls back to "Player", so a
 * first visit never fails on what Clerk holds.
 */
export async function ensureProfile(viewerId: string, offeredName: unknown): Promise<OwnProfile> {
  const displayName = cleanDisplayName(offeredName) ?? "Player";
  await db.insert(socialProfiles).values({ userId: viewerId, displayName }).onConflictDoNothing();
  const [row] = await db
    .select({
      publicId: socialProfiles.publicId,
      displayName: socialProfiles.displayName,
      ...commanderColumns,
      ...ownPickColumns,
    })
    .from(socialProfiles)
    .leftJoin(commanderCard, eq(commanderCard.oracleId, socialProfiles.commanderOracleId))
    .leftJoin(facePrinting, faceJoin)
    .where(eq(socialProfiles.userId, viewerId));
  return { publicId: row.publicId, displayName: row.displayName, commander: toOwnCommander(row) };
}

/**
 * How old the viewer's profile is, in ms by the DATABASE's clock (the column is zone-less, so the age is taken where it was
 * written, not in this process's zone), or null when they have none yet.
 */
export async function profileAgeMs(viewerId: string): Promise<number | null> {
  const [row] = await db
    .select({ ms: sql<number>`(extract(epoch from (now() - ${socialProfiles.createdAt})) * 1000)::float8` })
    .from(socialProfiles)
    .where(eq(socialProfiles.userId, viewerId));
  return row ? Number(row.ms) : null;
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

/**
 * An OPEN link names its inviter and shows their face (D1): to anyone holding it, to the inviter
 * themselves (`self`), and to a friend already (`alreadyFriends`, with `friendsSince`). An ENDED link
 * carries its state and nothing else, so a forwarded or guessed link learns nobody's name (E6). The state
 * is decided first: an ended link from a friend is an ended link.
 */
export type InviteView =
  | {
      state: "open";
      inviterName: string;
      commander: ProfileCommander | null;
      self: boolean;
      alreadyFriends: boolean;
      /** When the viewer and the inviter became friends; null unless `alreadyFriends`. */
      friendsSince: Date | null;
    }
  | { state: Exclude<InviteState, "open"> }
  | null;

/** The landing's one statement. Apart so a test can render its SQL. */
export function inviteQuery(viewerId: string, token: string, q: Reader = db) {
  return q
    .select({
      inviterUserId: friendInvites.inviterUserId,
      expiresAt: friendInvites.expiresAt,
      redeemedAt: friendInvites.redeemedAt,
      declinedAt: friendInvites.declinedAt,
      revokedAt: friendInvites.revokedAt,
      inviterName: socialProfiles.displayName,
      // Correlated, so aliased and qualified on both sides (AGENTS.md): unqualified, `user_id` would
      // resolve inside the subquery and compare the link row to itself.
      friendsSince: sql<Date | null>`(
        select fl.created_at from ${friendLinks} fl
        where fl.user_id = ${viewerId} and fl.friend_user_id = ${friendInvites}.inviter_user_id
      )`.mapWith((v: string | null) => (v === null ? null : friendLinks.createdAt.mapFromDriverValue(v) as Date)),
      ...commanderColumns,
    })
    .from(friendInvites)
    .innerJoin(socialProfiles, eq(socialProfiles.userId, friendInvites.inviterUserId))
    .leftJoin(commanderCard, eq(commanderCard.oracleId, socialProfiles.commanderOracleId))
    .leftJoin(facePrinting, faceJoin)
    .where(eq(friendInvites.token, token));
}

/**
 * What the landing page may say about a token: see `InviteView`. Nothing about the inviter's decks or
 * collection, ever. Null for a token that names nothing, which the page draws exactly as it draws an
 * ended one.
 */
export async function readInvite(viewerId: string, token: string, now = new Date()): Promise<InviteView> {
  const [row] = await inviteQuery(viewerId, token);
  return row ? shapeInvite(row, viewerId, now) : null;
}

/** The row as the landing may see it. Pure, so the ended states' stripping is tested without a database. */
export function shapeInvite(row: Awaited<ReturnType<typeof inviteQuery>>[number], viewerId: string, now: Date): InviteView {
  const state = inviteState(row, now);
  if (state !== "open") return { state };
  return {
    state,
    inviterName: row.inviterName,
    commander: toCommander(row),
    self: row.inviterUserId === viewerId,
    alreadyFriends: row.friendsSince !== null,
    friendsSince: row.friendsSince,
  };
}

export type OpenInvite = { token: string; createdAt: Date; expiresAt: Date };

/** The viewer's own open links, oldest first (the soonest to expire leads), and only open ones (E3). */
export function openInvitesQuery(viewerId: string, now: Date, q: Reader = db) {
  return q
    .select({ token: friendInvites.token, createdAt: friendInvites.createdAt, expiresAt: friendInvites.expiresAt })
    .from(friendInvites)
    .where(and(eq(friendInvites.inviterUserId, viewerId), openInvite(now)))
    .orderBy(asc(friendInvites.createdAt), asc(friendInvites.token));
}

export async function listOpenInvites(viewerId: string, now = new Date(), q: Reader = db): Promise<OpenInvite[]> {
  return openInvitesQuery(viewerId, now, q);
}

/**
 * /friends' friends and open links read from ONE snapshot. Read apart, a redemption committing between the two
 * reads gives a redraw with the old friends and without the link, which drops the link from the page's watch
 * before the new friend's row has arrived.
 */
export async function loadFriendsAndLinks(viewerId: string, now = new Date()): Promise<{ friends: Friend[]; links: OpenInvite[] }> {
  return db.transaction(async (tx) => {
    const friends = await listFriends(viewerId, tx);
    const links = await listOpenInvites(viewerId, now, tx);
    return { friends, links };
  // Repeatable read, never read-only: a read-only transaction poisons the pooled connection (cuts-read.ts).
  }, { isolationLevel: "repeatable read" });
}

export type InviteOutcome = { token: string; open: boolean; friend: { publicId: string; displayName: string } | null };

/**
 * What became of the viewer's own links, for /friends' watch while one is shown or open: whether each is still
 * open, and, for one redeemed by someone who is now the viewer's friend, that friend. Only the viewer's own
 * tokens are read (the inviter is the viewer, in the statement), and the redeemer is named only through the
 * viewer's own link row to them, so a redeemer who has since been removed is not named. A token the viewer does
 * not own, or that no longer exists, is absent from the answer.
 */
export function inviteOutcomesQuery(viewerId: string, tokens: string[], q: Reader = db) {
  return q
    .select({
      token: friendInvites.token,
      redeemedAt: friendInvites.redeemedAt,
      declinedAt: friendInvites.declinedAt,
      revokedAt: friendInvites.revokedAt,
      expiresAt: friendInvites.expiresAt,
      publicId: socialProfiles.publicId,
      displayName: socialProfiles.displayName,
    })
    .from(friendInvites)
    .leftJoin(friendLinks, and(eq(friendLinks.userId, viewerId), eq(friendLinks.friendUserId, friendInvites.redeemedBy)))
    .leftJoin(socialProfiles, eq(socialProfiles.userId, friendLinks.friendUserId))
    .where(and(eq(friendInvites.inviterUserId, viewerId), inArray(friendInvites.token, tokens)));
}

type OutcomeRow = Awaited<ReturnType<typeof inviteOutcomesQuery>>[number];

export function shapeOutcome(r: OutcomeRow, now: Date): InviteOutcome {
  return {
    token: r.token,
    open: inviteState(r, now) === "open",
    friend: r.redeemedAt && r.publicId && r.displayName ? { publicId: r.publicId, displayName: r.displayName } : null,
  };
}

export async function inviteOutcomes(viewerId: string, tokens: string[], now = new Date(), q: Reader = db): Promise<InviteOutcome[]> {
  if (tokens.length === 0) return [];
  return (await inviteOutcomesQuery(viewerId, tokens, q)).map((r) => shapeOutcome(r, now));
}

/** Both directed rows, in `friendshipRows`' order, and nothing if the friendship already stands. */
async function befriendIn(tx: Tx, a: string, b: string): Promise<void> {
  await tx.insert(friendLinks).values(friendshipRows(a, b)).onConflictDoNothing();
}

/**
 * An invited newcomer's first rows (invites plan PR 3, R8), inside the spend's transaction: their profile (the Clerk
 * first name, else "Player", kept when one exists) and the friendship with the account that invited them. Idempotent,
 * so the webhook and the newcomer's first `/friends` can both run it in either order.
 */
export async function welcomeInvitedIn(tx: Tx, senderId: string, newcomerId: string, offeredName: unknown): Promise<void> {
  const displayName = cleanDisplayName(offeredName) ?? "Player";
  await tx.insert(socialProfiles).values({ userId: newcomerId, displayName }).onConflictDoNothing();
  await befriendIn(tx, senderId, newcomerId);
}

/** What `/join/[token]` shows of the account that invited the newcomer (ruling B): a name and a commander, or null. */
export type InviteSender = { displayName: string; commander: ProfileCommander | null };

export async function readInviteSender(senderId: string): Promise<InviteSender | null> {
  const [row] = await db
    .select({ displayName: socialProfiles.displayName, ...commanderColumns })
    .from(socialProfiles)
    .leftJoin(commanderCard, eq(commanderCard.oracleId, socialProfiles.commanderOracleId))
    .leftJoin(facePrinting, faceJoin)
    .where(eq(socialProfiles.userId, senderId));
  return row ? { displayName: row.displayName, commander: toCommander(row) } : null;
}

/**
 * The public id of one of the viewer's own friends, by account id: joined on the viewer's own link row, so an account
 * that is not their friend reads as null. The newcomer's receipt names their inviter through it.
 */
export async function friendPublicId(viewerId: string, friendUserId: string): Promise<string | null> {
  const [row] = await db
    .select({ publicId: socialProfiles.publicId })
    .from(friendLinks)
    .innerJoin(socialProfiles, eq(socialProfiles.userId, friendLinks.friendUserId))
    .where(and(eq(friendLinks.userId, viewerId), eq(friendLinks.friendUserId, friendUserId)));
  return row?.publicId ?? null;
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

/**
 * Spend an already-friends link (G4): marks an open link from someone the viewer is ALREADY friends with as
 * redeemed, and writes no friendship. It locks the invite, then the friendship row, in one transaction, so an
 * unfriend landing first leaves the link open rather than being undone by a page view. False: nothing spent.
 */
export async function spendAlreadyFriendsInvite(viewerId: string, token: string, now = new Date()): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [invite] = await tx.select().from(friendInvites).where(eq(friendInvites.token, token)).for("update");
    if (!invite || invite.inviterUserId === viewerId || inviteState(invite, now) !== "open") return false;
    const [friendship] = await tx
      .select({ userId: friendLinks.userId })
      .from(friendLinks)
      .where(and(eq(friendLinks.userId, viewerId), eq(friendLinks.friendUserId, invite.inviterUserId)))
      .for("share");
    if (!friendship) return false;
    await tx.update(friendInvites).set({ redeemedBy: viewerId, redeemedAt: now }).where(eq(friendInvites.token, token));
    return true;
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
      const left = await tx
        .delete(podMembers)
        .where(and(eq(podMembers.userId, member), inArray(podMembers.podId, ownedBy)))
        .returning({ podId: podMembers.podId });
      // A member out of a pod shares nothing with it any more: exactly the pods just left, never a second
      // reading of who owns what, which a hand-on between the two statements could move.
      if (left.length > 0) {
        await tx.delete(podSpareShares).where(and(
          eq(podSpareShares.userId, member),
          inArray(podSpareShares.podId, left.map((r) => r.podId)),
        ));
      }
    }
    return true;
  });
}
