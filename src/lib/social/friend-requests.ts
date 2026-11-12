/**
 * Friend requests (friend links R1, `design_handoff_the99_friends_link`): opening a player's link or typing their code
 * sends one; the owner accepts or declines. Every read and write joins on the viewer, who comes from the session:
 *
 * - The requester reaches the owner only through a live link token or code (`friend-link-keys.ts`), never an id.
 * - The owner reaches a requester only through a request row naming them as owner; the requester's `public_id` is
 *   resolved on that row, so a forged or stale id answers nothing.
 * - The requester reaches their own request (Withdraw) only through a row naming them as requester.
 *
 * ONE row per ordered pair (`friend_requests_pair_key`). Decline is permanent for the pair and silent (H2): the requester
 * keeps reading "sent", and sending again changes nothing. Withdraw is silent too (G4). A request that last lit the
 * owner's unseen diamond under `NOTICE_QUIET_MS` ago does not light it again (G3), so a withdraw and resend cannot nag.
 * A request to someone who had already asked you answers theirs: you are friends (A9, L4).
 *
 * Every write takes the pair's lock, then both friendship rows FOR SHARE in the purge's order (as spare requests do), so
 * an unfriend or purge racing it waits or is waited for, never deadlocks. A write that lands after its account's purge
 * is erased by the account sweep's re-purge (`docs/agents/account-purge.md`).
 */
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { friendLinks, friendRequests, socialProfiles } from "../../db/schema";
import { enforceHit } from "../rate/observe";
import type { RateBucket } from "../rate/rules";
import { named } from "../person-name/mint";
import type { ThirdPartyName } from "../person-name/brand";
import { commanderCard, commanderColumns, facePrinting, faceJoin, toCommander, type ProfileCommander } from "./commander";
import { friendLinksEnabled } from "./friend-links-flag";
import { codeOwnerIn, linkOwnerIn } from "./friend-link-keys";
import { befriendIn, createProfileIn } from "./friends";
import { isUuid } from "./rules";
import { lockFriendshipQuery } from "./spare-requests";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** A request lights the owner's unseen diamond at most once per pair in this long (G3, clarification 4). */
export const NOTICE_QUIET_MS = 30 * 24 * 60 * 60 * 1000;
/** How long after a Decline the owner's Put back can reverse it: past the toast's 8 seconds, paused or not, and no longer. */
export const DECLINE_UNDO_MS = 2 * 60 * 1000;

export type RequestVia = "link" | "code";
export type SendTarget = { via: "link"; token: unknown } | { via: "code"; code: unknown };

export type SendResult =
  /** `sent`: waiting on the owner (new, resent, already waiting, or declined: the requester cannot tell). */
  | { ok: true; outcome: "sent" | "alreadyFriends" | "nowFriends"; owner: { publicId: string } }
  /** `notFound`: no live link or code (unknown, reset and never-issued read the same). `limited`: a rate cap. */
  /** `noProfile`: the requester has no social profile yet; the caller makes one and sends again. */
  | { ok: false; reason: "notFound" | "self" | "unconfigured" | "noProfile" }
  | { ok: false; reason: "limited"; retryAfterSec: number };

const pairLock = (tx: Tx, a: string, b: string) => {
  const [low, high] = a < b ? [a, b] : [b, a];
  return tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`friend-request:${low}:${high}`}, 0))`);
};

/** The longest wait any bucket asks for, else null. Every bucket counts the hit, a refused one too, so an hour's cap cannot hide tries from the day's. */
async function limited(userId: string, buckets: RateBucket[], now: Date): Promise<number | null> {
  const waits = await Promise.all(buckets.map((bucket) => enforceHit(userId, bucket, now)));
  const refused = waits.filter((w): w is number => w !== null);
  return refused.length > 0 ? Math.max(...refused) : null;
}

async function publicIdIn(tx: Tx, userId: string): Promise<string | null> {
  const [row] = await tx.select({ publicId: socialProfiles.publicId }).from(socialProfiles).where(eq(socialProfiles.userId, userId));
  return row?.publicId ?? null;
}

type Decision =
  | { kind: "alreadyFriends" | "nowFriends" | "unchanged" }
  | { kind: "insert" }
  | { kind: "resend"; relight: boolean };

/**
 * What a send does, from the pair's state. Pure, so every row the table can hold is pinned by a test.
 * `mine` is the requester's row to the owner; `theirs` the owner's row to the requester.
 */
export function decideSend(
  friends: boolean,
  mine: { state: string; noticedAt: Date } | undefined,
  theirs: { state: string } | undefined,
  now: Date,
): Decision {
  if (friends) return { kind: "alreadyFriends" };
  if (theirs?.state === "waiting") return { kind: "nowFriends" };
  if (!mine) return { kind: "insert" };
  // Waiting already, or declined (silent and permanent, H2): nothing changes and nothing is counted.
  if (mine.state === "waiting" || mine.state === "declined") return { kind: "unchanged" };
  // Withdrawn, or accepted once and unfriended since: waiting again, lighting the diamond only past the quiet.
  return { kind: "resend", relight: now.getTime() - mine.noticedAt.getTime() >= NOTICE_QUIET_MS };
}

/**
 * Send a request by link or code. Rate caps, ENFORCED: every code try counts (`friend-code`, `friend-code-day`) before the
 * lookup, a right one too; a send that writes a waiting row counts `friend-request-day`. An open of a link already
 * asked, or a declined one, counts nothing and writes nothing.
 */
export async function sendFriendRequest(
  viewerId: string,
  target: SendTarget,
  env: NodeJS.ProcessEnv,
  secret: string | null,
  now: Date = new Date(),
): Promise<SendResult> {
  if (!friendLinksEnabled(env)) return { ok: false, reason: "notFound" };
  if (!secret) return { ok: false, reason: "unconfigured" };
  if (target.via === "code") {
    const wait = await limited(viewerId, ["friend-code", "friend-code-day"], now);
    if (wait !== null) return { ok: false, reason: "limited", retryAfterSec: wait };
  }
  const ownerId = target.via === "link" ? await linkOwnerIn(db, target.token, secret) : await codeOwnerIn(db, target.code, secret);
  if (ownerId === null) return { ok: false, reason: "notFound" };
  if (ownerId === viewerId) return { ok: false, reason: "self" };

  return db.transaction(async (tx): Promise<SendResult> => {
    await pairLock(tx, viewerId, ownerId);
    const publicId = await publicIdIn(tx, ownerId);
    // An owner whose profile is gone (a purged account) has nobody to ask.
    if (publicId === null) return { ok: false, reason: "notFound" };
    // The owner reads a request through the requester's profile, so a requester without one could ask and never be seen.
    // The caller makes it first (`ensureProfile`).
    if ((await publicIdIn(tx, viewerId)) === null) return { ok: false, reason: "noProfile" };
    const decision = await readPair(tx, viewerId, ownerId, now);
    const owner = { publicId };
    // Counted only for a send that writes a waiting row, decided under the lock; a refusal writes nothing.
    if (decision.kind === "insert" || decision.kind === "resend") {
      const wait = await limited(viewerId, ["friend-request-day"], now);
      if (wait !== null) return { ok: false, reason: "limited", retryAfterSec: wait };
    }
    switch (decision.kind) {
      case "alreadyFriends":
        return { ok: true, outcome: "alreadyFriends", owner };
      case "nowFriends":
        await befriendIn(tx, viewerId, ownerId, now);
        return { ok: true, outcome: "nowFriends", owner };
      case "insert":
        await tx.insert(friendRequests).values({
          requesterUserId: viewerId, ownerUserId: ownerId, via: target.via, createdAt: now, sentAt: now, noticedAt: now,
        });
        break;
      case "resend":
        await tx
          .update(friendRequests)
          .set({ state: "waiting", via: target.via, sentAt: now, answeredAt: null, ...(decision.relight ? { noticedAt: now } : {}) })
          .where(and(eq(friendRequests.requesterUserId, viewerId), eq(friendRequests.ownerUserId, ownerId)));
        break;
      case "unchanged":
        break;
    }
    return { ok: true, outcome: "sent", owner };
  });
}

/** The pair's state as a send decision, inside the pair lock, with the friendship rows held FOR SHARE. */
async function readPair(tx: Tx, requesterId: string, ownerId: string, now: Date): Promise<Decision> {
  const friendship = (await tx.execute(lockFriendshipQuery(requesterId, ownerId))).rows;
  const rows = await tx
    .select({ requesterUserId: friendRequests.requesterUserId, state: friendRequests.state, noticedAt: friendRequests.noticedAt })
    .from(friendRequests)
    .where(sql`(${friendRequests.requesterUserId}, ${friendRequests.ownerUserId}) in ((${requesterId}, ${ownerId}), (${ownerId}, ${requesterId}))`);
  const mine = rows.find((r) => r.requesterUserId === requesterId);
  const theirs = rows.find((r) => r.requesterUserId === ownerId);
  return decideSend(friendship.length === 2, mine, theirs, now);
}

/** The requester's user id on a request naming the viewer as owner, by the requester's public id, in the given states. */
async function requesterOn(tx: Tx, ownerId: string, requesterPublicId: unknown, states: string[]): Promise<string | null> {
  if (!isUuid(requesterPublicId)) return null;
  const [row] = await tx
    .select({ requesterUserId: friendRequests.requesterUserId })
    .from(friendRequests)
    .innerJoin(socialProfiles, eq(socialProfiles.userId, friendRequests.requesterUserId))
    .where(and(
      eq(friendRequests.ownerUserId, ownerId),
      eq(socialProfiles.publicId, requesterPublicId),
      sql`${friendRequests.state} in (${sql.join(states.map((s) => sql`${s}`), sql`, `)})`,
    ));
  return row?.requesterUserId ?? null;
}

/**
 * The owner answers one waiting request, re-read under the pair lock: Accept writes the friendship (and settles a
 * request the owner had sent the other way); Decline is permanent and silent. False: nothing was waiting.
 */
export async function answerFriendRequest(
  viewerId: string,
  requesterPublicId: unknown,
  answer: "accept" | "decline",
  env: NodeJS.ProcessEnv,
  now: Date = new Date(),
): Promise<boolean> {
  if (!friendLinksEnabled(env)) return false;
  return db.transaction(async (tx) => {
    const requesterId = await requesterOn(tx, viewerId, requesterPublicId, ["waiting"]);
    if (requesterId === null) return false;
    await pairLock(tx, viewerId, requesterId);
    await tx.execute(lockFriendshipQuery(viewerId, requesterId));
    const [row] = await tx
      .select({ state: friendRequests.state })
      .from(friendRequests)
      .where(and(eq(friendRequests.requesterUserId, requesterId), eq(friendRequests.ownerUserId, viewerId)));
    if (row?.state !== "waiting") return false;
    if (answer === "accept") {
      await befriendIn(tx, viewerId, requesterId, now);
    } else {
      await tx
        .update(friendRequests)
        .set({ state: "declined", answeredAt: now })
        .where(and(eq(friendRequests.requesterUserId, requesterId), eq(friendRequests.ownerUserId, viewerId)));
    }
    return true;
  });
}

/** Put back on a Decline (H2): the owner alone, within `DECLINE_UNDO_MS` of it, makes the request waiting again. */
export async function undoDecline(viewerId: string, requesterPublicId: unknown, env: NodeJS.ProcessEnv, now: Date = new Date()): Promise<boolean> {
  if (!friendLinksEnabled(env)) return false;
  return db.transaction(async (tx) => {
    const requesterId = await requesterOn(tx, viewerId, requesterPublicId, ["declined"]);
    if (requesterId === null) return false;
    await pairLock(tx, viewerId, requesterId);
    // Friends already (an old invite redeemed meanwhile): there is nothing to put back.
    if ((await tx.execute(lockFriendshipQuery(viewerId, requesterId))).rows.length === 2) return false;
    const back = await tx
      .update(friendRequests)
      .set({ state: "waiting", answeredAt: null })
      .where(and(
        eq(friendRequests.requesterUserId, requesterId),
        eq(friendRequests.ownerUserId, viewerId),
        eq(friendRequests.state, "declined"),
        sql`${friendRequests.answeredAt} > ${new Date(now.getTime() - DECLINE_UNDO_MS).toISOString()}::timestamptz`,
      ))
      .returning({ id: friendRequests.id });
    return back.length > 0;
  });
}

/**
 * Withdraw (G4): the requester takes back their waiting request, by the owner's public id, resolved on the requester's
 * own row. The owner is never told. A declined request reads as waiting to the requester, so withdrawing one is
 * answered true and changes nothing: the decline stands.
 */
export async function withdrawFriendRequest(viewerId: string, ownerPublicId: unknown, env: NodeJS.ProcessEnv): Promise<boolean> {
  if (!friendLinksEnabled(env) || !isUuid(ownerPublicId)) return false;
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ ownerUserId: friendRequests.ownerUserId })
      .from(friendRequests)
      .innerJoin(socialProfiles, eq(socialProfiles.userId, friendRequests.ownerUserId))
      .where(and(eq(friendRequests.requesterUserId, viewerId), eq(socialProfiles.publicId, ownerPublicId)));
    if (!row) return false;
    await pairLock(tx, viewerId, row.ownerUserId);
    await tx.execute(lockFriendshipQuery(viewerId, row.ownerUserId));
    const [mine] = await tx
      .select({ state: friendRequests.state })
      .from(friendRequests)
      .where(and(eq(friendRequests.requesterUserId, viewerId), eq(friendRequests.ownerUserId, row.ownerUserId)));
    if (mine?.state === "declined") return true;
    if (mine?.state !== "waiting") return false;
    await tx
      .update(friendRequests)
      .set({ state: "withdrawn" })
      .where(and(eq(friendRequests.requesterUserId, viewerId), eq(friendRequests.ownerUserId, row.ownerUserId)));
    return true;
  });
}

export type IncomingFriendRequest = {
  requester: { publicId: string; displayName: ThirdPartyName; commander: ProfileCommander | null };
  via: RequestVia;
  sentAt: Date;
  /** When it last lit the diamond: unseen while newer than the owner's Friends cursor. */
  noticedAt: Date;
};

/** The requests waiting on the viewer, newest first (Waiting on you, F1 to F3). Named only through `named()`. */
export async function loadIncomingFriendRequests(viewerId: string, env: NodeJS.ProcessEnv): Promise<IncomingFriendRequest[]> {
  if (!friendLinksEnabled(env)) return [];
  const rows = await db
    .select({
      publicId: socialProfiles.publicId,
      displayName: socialProfiles.displayName,
      via: friendRequests.via,
      sentAt: friendRequests.sentAt,
      noticedAt: friendRequests.noticedAt,
      ...commanderColumns,
    })
    .from(friendRequests)
    .innerJoin(socialProfiles, eq(socialProfiles.userId, friendRequests.requesterUserId))
    .leftJoin(commanderCard, eq(commanderCard.oracleId, socialProfiles.commanderOracleId))
    .leftJoin(facePrinting, faceJoin)
    .where(and(
      eq(friendRequests.ownerUserId, viewerId),
      eq(friendRequests.state, "waiting"),
      sql`not exists (select 1 from ${friendLinks} ffl where ffl.user_id = ${friendRequests}.owner_user_id and ffl.friend_user_id = ${friendRequests}.requester_user_id)`,
    ))
    .orderBy(desc(friendRequests.sentAt), asc(socialProfiles.publicId));
  return rows.map((r) => ({
    requester: { publicId: r.publicId, displayName: named(r.displayName), commander: toCommander(r) },
    via: r.via as RequestVia,
    sentAt: r.sentAt,
    noticedAt: r.noticedAt,
  }));
}

/**
 * Waiting requests for the bar badge's waiting half (G8), counted on the same join and filters `loadIncomingFriendRequests`
 * lists (a requester whose profile is gone, or who is a friend already, is in neither), so the badge and Waiting on you
 * agree. The badge counts what waits, as a spare ask does; the 30-day quiet governs the unseen diamond (`noticedAt`).
 */
export async function waitingFriendRequestsCount(viewerId: string, env: NodeJS.ProcessEnv): Promise<number> {
  if (!friendLinksEnabled(env)) return 0;
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(friendRequests)
    .innerJoin(socialProfiles, eq(socialProfiles.userId, friendRequests.requesterUserId))
    .where(and(
      eq(friendRequests.ownerUserId, viewerId),
      eq(friendRequests.state, "waiting"),
      sql`not exists (select 1 from ${friendLinks} ffl where ffl.user_id = ${friendRequests}.owner_user_id and ffl.friend_user_id = ${friendRequests}.requester_user_id)`,
    ));
  return Number(row?.n ?? 0);
}

/**
 * A newcomer who joined through a friend link (Q1): inside the invite spend's transaction, their profile and a WAITING
 * request to the link's owner, never a friendship. Idempotent, like the spend's other writes: the webhook and the
 * newcomer's first `/friends` can both run it.
 */
export async function requestOnSignUpIn(tx: Tx, ownerId: string, newcomerId: string, offeredName: unknown, now: Date = new Date()): Promise<void> {
  await createProfileIn(tx, newcomerId, offeredName);
  await tx
    .insert(friendRequests)
    .values({ requesterUserId: newcomerId, ownerUserId: ownerId, via: "link", createdAt: now, sentAt: now, noticedAt: now })
    .onConflictDoNothing();
}
