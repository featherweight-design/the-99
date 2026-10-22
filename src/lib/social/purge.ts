/**
 * The social half of the account purge (Hugh's ruling Q8, 2026-10-12: deleting an account deletes
 * everything). Runs inside the purge's one transaction, so a failure anywhere leaves the account whole.
 * It lives here because every social table is read and written only from `src/lib/social/`
 * (`check:social-reads`); `src/lib/account/purge.ts` calls it and handles every other table.
 *
 * Pods are LEFT the way a player leaves them (Q5): a pod the account owns passes to its longest-standing
 * remaining member, and a pod with no one else in it is deleted. Pods are taken in id order, so two purges
 * (or a purge and a leave) lock them the same way round.
 */
import { asc, eq, or, sql } from "drizzle-orm";
import type { db } from "../../db";
import { deckGameOpponents, feedItems, friendInvites, friendLinks, podMembers, podSpareShares, pods, ruleZeroSeats, ruleZeroTables, socialProfiles, spareRequests } from "../../db/schema";
import { leavePodIn } from "./pods";
import { purgeRuleZeroIn } from "./rule-zero";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The social tables this purge clears, each with the account columns it clears them by, for the coverage test. */
export const SOCIAL_PURGED: Readonly<Record<string, readonly string[]>> = {
  friend_invites: ["inviter_user_id", "redeemed_by"],
  pods: ["owner_user_id"],
  pod_members: ["user_id"],
  pod_spare_shares: ["user_id"],
  friend_links: ["user_id", "friend_user_id"],
  social_profiles: ["user_id"],
  rule_zero_tables: ["set_by"],
  rule_zero_seats: ["user_id"],
  rule_zero_seen: ["user_id"],
  // The news feed's stored items (menu and Home, G1): the account's own, and every other reader's item that names it
  // as the friend (a trade match). Here rather than in `PURGE_ORDER` because the second half reaches other accounts.
  feed_items: ["user_id", "friend_user_id"],
  // Spare requests (G5), both sides: the account's asks and the asks made of it. Here for the same reason.
  spare_requests: ["asker_user_id", "holder_user_id"],
};

/**
 * Account columns the purge UNLINKS rather than deletes: another player's game log names the account as
 * an opponent, and that row is theirs. The live link goes null and the snapshot (the name it had, the
 * deck's name and commanders) stays, so their record survives the account. For the coverage test.
 */
export const SOCIAL_UNLINKED: Readonly<Record<string, readonly string[]>> = {
  deck_game_opponents: ["friend_user_id"],
};

export type SocialPurge = { podsLeft: number; podsHandedOn: number; podsDeleted: number; friendLinks: number; ruleZeroSeats: number; ruleZeroTables: number };

/** What the social half did, and the friends whose data stamps the purge moves (sorted). */
export type SocialPurged = { counts: SocialPurge; friendIds: string[] };

export async function purgeSocialIn(tx: Tx, userId: string): Promise<SocialPurged> {
  const out: SocialPurge = { podsLeft: 0, podsHandedOn: 0, podsDeleted: 0, friendLinks: 0, ruleZeroSeats: 0, ruleZeroTables: 0 };
  // Locks in the hierarchy every social write takes them. The account's invites first, in token order:
  // `redeemInvite` locks its invite before it writes a friendship, so a redemption racing this either lands
  // first (and its new links are read and deleted below) or waits and finds the invite gone. Then (as
  // `unfriend`, `addMember` and `leavePod` take them) pods, in id order; then the friendship rows, in (user_id, friend_user_id) order, which is `friendshipRows`'
  // order. An unfriend takes the same three in the same order, so the two cannot each hold what the other
  // waits for.
  await tx.execute(sql`
    select i.token from ${friendInvites} i
    where i.inviter_user_id = ${userId} or i.redeemed_by = ${userId}
    order by i.token for update`);
  // The pods it owns or is in. A friend ADDING it to a pod holds that pod and then the friendship row
  // (`addMember`), so the friendship lock below waits out an add under way, which then shows as a membership
  // to leave; an add that starts after finds the friendship gone.
  // Also every pod with a Rule 0 table the account set or sits at, which a player keeps after leaving the pod: those
  // tables are closed below, and setup and reseat take the pod row first, so two purges (or a purge and a reseat) on
  // one table queue here rather than each counting the other's seat.
  await tx.execute(sql`
    select p.id from ${pods} p
    where p.owner_user_id = ${userId}
      or p.id in (select m.pod_id from ${podMembers} m where m.user_id = ${userId})
      or p.id in (
        select t.pod_id from ${ruleZeroTables} t
        where t.set_by = ${userId} or t.id in (select s.table_id from ${ruleZeroSeats} s where s.user_id = ${userId}))
    order by p.id for update`);
  const links = await tx.execute<{ user_id: string; friend_user_id: string }>(sql`
    select l.user_id, l.friend_user_id from ${friendLinks} l
    where l.user_id = ${userId} or l.friend_user_id = ${userId}
    order by l.user_id, l.friend_user_id for update`);
  // The friends whose stamps this purge will move (through the friend_links triggers). Their stamp rows
  // are NOT locked here: the caller locks them last, after every row delete, which is where any other
  // writer takes a stamp (at its commit, after its rows).
  const friendIds = [...new Set(links.rows.map((r) => (r.user_id === userId ? r.friend_user_id : r.user_id)))].sort();
  // Unlink the account from every other player's game log, AFTER the friendship rows are held. That order is
  // the contract for whatever writes a friend seat: it must hold the seated friendship row FOR SHARE until
  // its game commits, so a game logged before this lock is committed (and unlinked here) and one logged after
  // finds no friend to seat; `resolveFriendSeatsIn` (`games.ts`) is that write. The
  // deck link goes with it (`friend_deck_id` requires the friend), ahead of the decks' own `set null`.
  // The account's decks are locked FIRST, in id order, because a deck delete locks its deck and then its
  // `set null` locks the seats naming it: taking the seats here and the decks later (in `PURGE_ORDER`) would
  // be the opposite order, and a deck deleted during the purge could deadlock it.
  await tx.execute(sql`select d.id from decks d where d.user_id = ${userId} order by d.id for update`);
  await tx
    .update(deckGameOpponents)
    .set({ friendUserId: null, friendDeckId: null })
    .where(eq(deckGameOpponents.friendUserId, userId));
  // Rule 0 tables before the pod hand-on: a table belongs to the pod's night, not to the pod's next owner. The
  // account's decks are already locked above, so the seats naming them go without reversing that order.
  const ruleZero = await purgeRuleZeroIn(tx, userId);
  out.ruleZeroSeats = ruleZero.seats;
  out.ruleZeroTables = ruleZero.tables;
  const memberOf = await tx
    .select({ podId: podMembers.podId })
    .from(podMembers)
    .where(eq(podMembers.userId, userId))
    .orderBy(asc(podMembers.podId));
  for (const { podId } of memberOf) {
    const outcome = await leavePodIn(tx, userId, podId);
    if (outcome === "left") out.podsLeft++;
    else if (outcome === "handedOn") out.podsHandedOn++;
    else if (outcome === "deleted") out.podsDeleted++;
  }
  // A pod still owned with the owner not a member (no write path makes one) goes too, with its rows.
  await tx.delete(pods).where(eq(pods.ownerUserId, userId));
  await tx.delete(podSpareShares).where(eq(podSpareShares.userId, userId));
  const gone = await tx
    .delete(friendLinks)
    .where(or(eq(friendLinks.userId, userId), eq(friendLinks.friendUserId, userId)))
    .returning({ userId: friendLinks.userId });
  out.friendLinks = gone.length;
  // Both sides of an invite name the account: the ones it sent, and the spent ones it accepted.
  await tx.delete(friendInvites).where(or(eq(friendInvites.inviterUserId, userId), eq(friendInvites.redeemedBy, userId)));
  await tx.delete(socialProfiles).where(eq(socialProfiles.userId, userId));
  // The feed's items, both sides: no reader keeps a trade match naming a deleted account (the read would drop it, the
  // friendship being gone, but the row would still hold the id). No stamp moves: `feed_items` carries no trigger.
  await tx.delete(feedItems).where(or(eq(feedItems.userId, userId), eq(feedItems.friendUserId, userId)));
  // Spare requests, both sides. An ask racing this held both friendship rows for share, so it either committed before
  // the friendship rows were locked above (and is deleted here) or waited and found the friendship gone.
  await tx.delete(spareRequests).where(or(eq(spareRequests.askerUserId, userId), eq(spareRequests.holderUserId, userId)));
  return { counts: out, friendIds };
}
