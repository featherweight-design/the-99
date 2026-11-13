/**
 * What a reusable friend link's landing draws (friend links R1, Landing L1 to L7, Signed-Out S1 and S2). The token is the
 * grant: whoever holds a live link may see its owner's name and signature card (Q2), and nothing else. The owner is read
 * in the SAME statement as the live key, so a link reset a moment earlier names nobody. A reset, unknown or switched-off
 * link reads null, and the page falls back to the single-use invite reading, then the ended card (L7). Server-only: the
 * owner's account id stays here; the page gets their public id and face.
 */
import { and, eq, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "../../db";
import { friendLinkKeys, friendLinks, friendRequests, socialProfiles } from "../../db/schema";
import { friendLinksEnabled } from "../friend-links/flag";
import { resolveFlagsStrict } from "../flags/snapshot";
import { loadInviteCount } from "../invites/read";
import { named } from "../person-name/mint";
import type { ThirdPartyName } from "../person-name/brand";
import { commanderCard, commanderColumns, facePrinting, faceJoin, toCommander, type ProfileCommander } from "./commander";
import { isInviteToken } from "./client-rules";
import { linkTokenHash } from "./friend-link-keys";

export type LinkOwner = { publicId: string; displayName: ThirdPartyName; commander: ProfileCommander | null };

export type LinkLanding = {
  owner: LinkOwner;
  /** The reader's own link (L6). */
  self: boolean;
  /** Friends already, both directed rows standing, as a send reads it (L5). */
  friends: boolean;
  /** Since when, for the card's type line. */
  friendsSince: Date | null;
  /** The reader's request to the owner before this visit: a waiting or declined one reads as sent (L2). */
  sentAt: Date | null;
  /** Signed out: the owner has no invite left, so Join is withheld (S2). */
  outOfInvites: boolean;
};

export async function readLinkLanding(viewerId: string | null, token: unknown, secret: string | null): Promise<LinkLanding | null> {
  if (!isInviteToken(token) || !secret) return null;
  const [row] = await db
    .select({ ownerId: friendLinkKeys.userId, publicId: socialProfiles.publicId, displayName: socialProfiles.displayName, ...commanderColumns })
    .from(friendLinkKeys)
    .innerJoin(socialProfiles, eq(socialProfiles.userId, friendLinkKeys.userId))
    .leftJoin(commanderCard, eq(commanderCard.oracleId, socialProfiles.commanderOracleId))
    .leftJoin(facePrinting, faceJoin)
    .where(and(eq(friendLinkKeys.tokenHash, linkTokenHash(secret, token)), isNotNull(friendLinkKeys.userId), isNull(friendLinkKeys.retiredAt)));
  if (!row?.ownerId) return null;
  const ownerId = row.ownerId;
  // The owner's own switch decides whether their link works; the visitor's may be anything, or nothing. A fresh read: a
  // page deciding on ANOTHER account's switch has no request header to resolve it from (`requestFlags` is the reader's).
  if (!friendLinksEnabled(await resolveFlagsStrict(ownerId))) return null;
  const owner = { publicId: row.publicId, displayName: named(row.displayName), commander: toCommander(row) };
  if (viewerId === null) {
    const count = await loadInviteCount(ownerId).catch(() => null);
    return { owner, self: false, friends: false, friendsSince: null, sentAt: null, outOfInvites: count === null || count.out };
  }
  if (viewerId === ownerId) return { owner, self: true, friends: false, friendsSince: null, sentAt: null, outOfInvites: false };
  const [friendship, mine] = await Promise.all([
    db.select({ userId: friendLinks.userId, createdAt: friendLinks.createdAt }).from(friendLinks).where(or(
      and(eq(friendLinks.userId, viewerId), eq(friendLinks.friendUserId, ownerId)),
      and(eq(friendLinks.userId, ownerId), eq(friendLinks.friendUserId, viewerId)),
    )),
    db.select({ sentAt: friendRequests.sentAt }).from(friendRequests).where(and(
      eq(friendRequests.requesterUserId, viewerId),
      eq(friendRequests.ownerUserId, ownerId),
      or(eq(friendRequests.state, "waiting"), eq(friendRequests.state, "declined")),
    )),
  ]);
  const friends = friendship.length === 2;
  return { owner, self: false, friends, friendsSince: friends ? friendship[0].createdAt : null, sentAt: mine[0]?.sentAt ?? null, outOfInvites: false };
}
