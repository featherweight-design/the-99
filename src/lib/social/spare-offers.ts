/**
 * An OFFER (You have it, handoff `design_handoff_the99_you_have_it`): an ask turned around. The holder of a spare
 * presses Offer on a friend's wishlist card, and the friend, whose card it is, answers Yes or No. It is a
 * `spare_requests` row with `initiated_by = 'holder'`, so expiry, one open row per card, withdraw and the purge stay
 * the ask's one path; the wanter is `asker_user_id`, the offerer `holder_user_id`, and every ask read and write
 * filters `initiated_by = 'asker'` (see the column).
 *
 * E1: the one-open index is (asker, card), and the wanter is the asker in both directions, so an open offer holds the
 * card against the friend's own ask of it, and the other way round, through the existing `asked` outcome (a unique
 * violation lands there too). E2: a No to an offer starts the same 14-day cooldown, for the same offerer and card only.
 */
import { and, eq, sql, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { friendLinks, spareRequests } from "../../db/schema";
import { resolveFriend } from "./access";
import { isUuid } from "./rules";
import { askRefusal, capCopies, isAnswer, openFloor, type PriorAsk, type StoredStatus } from "./spare-request-rules";
import {
  askLockQuery, expireStaleQuery, inAskTransaction, lockFriendshipQuery, type AnswerOutcome, type AskOutcome, type CloseOutcome,
} from "./spare-requests";
import { loadOwnOffered } from "./spares";
import { loadFriendWantedGap } from "./wishlist";

/** `min(spare, wants − held)`, at least 1 (G3): the offerer's spares against what the friend still lacks. */
export function offerCopies(spare: number, gap: number): number {
  return capCopies(Math.min(spare, gap), spare);
}

/**
 * Offers `friendPublicId` the offerer's spare of `oracleId`. Refused `not-friend` (no live friendship), `not-spare` (the
 * offerer no longer offers the card under their own rule, or it is no longer on the friend's wishlist), `asked` (the
 * friend has an open ask or offer for the card, to or from anyone) and `declined` (this friend said No to this offerer's
 * offer of it inside the cooldown). Copies, and the friend's `held`, never leave this module.
 */
export async function offerSpare(
  offererId: string, friendPublicId: unknown, oracleId: unknown, now = new Date(),
): Promise<AskOutcome> {
  if (!isUuid(oracleId)) return { ok: false, reason: "not-spare" };
  const wanterId = await resolveFriend(offererId, friendPublicId);
  if (!wanterId) return { ok: false, reason: "not-friend" };
  const spare = (await loadOwnOffered(offererId, [oracleId])).get(oracleId);
  const gap = (await loadFriendWantedGap(offererId, friendPublicId, [oracleId])).get(oracleId);
  if (spare === undefined || gap === undefined) return { ok: false, reason: "not-spare" };
  const copies = offerCopies(spare, gap);
  return inAskTransaction(async (tx) => {
    // The wanter's lock for the card, the one their own asks take: an ask and an offer for it decide one at a time.
    await tx.execute(askLockQuery(wanterId, oracleId));
    const links = await tx.execute(lockFriendshipQuery(offererId, wanterId));
    if (links.rows.length !== 2) return { ok: false, reason: "not-friend" };
    await tx.execute(expireStaleQuery(wanterId, oracleId, now));
    const prior = await tx
      .select({
        holderUserId: spareRequests.holderUserId, status: spareRequests.status, createdAt: spareRequests.createdAt,
        answeredAt: spareRequests.answeredAt, initiatedBy: spareRequests.initiatedBy,
      })
      .from(spareRequests)
      .where(and(eq(spareRequests.askerUserId, wanterId), eq(spareRequests.oracleId, oracleId)));
    const refusal = askRefusal(
      prior.map((p) => ({ ...p, status: p.status as StoredStatus, initiatedBy: p.initiatedBy as PriorAsk["initiatedBy"] })),
      offererId, now, "holder",
    );
    if (refusal) return { ok: false, reason: refusal };
    const [row] = await tx
      .insert(spareRequests)
      .values({ askerUserId: wanterId, holderUserId: offererId, oracleId, createdAt: now, copies, initiatedBy: "holder", standalone: true })
      .returning({ id: spareRequests.id });
    return { ok: true, id: row.id };
  });
}

/** The offerer's ✕ on their own open, unexpired offer: nobody is told, and it holds nothing. One row back means it landed. */
export function withdrawOfferQuery(offererId: string, requestId: string, now: Date): SQL {
  return sql`update ${spareRequests} wor set status = 'withdrawn', withdrawn_at = ${now.toISOString()}::timestamptz
    where wor.id = ${requestId} and wor.holder_user_id = ${offererId} and wor.initiated_by = 'holder'
      and wor.status = 'open' and wor.created_at > ${openFloor(now).toISOString()}::timestamptz
    returning wor.id`;
}

export async function withdrawOffer(offererId: string, requestId: unknown, now = new Date()): Promise<CloseOutcome> {
  if (!isUuid(requestId)) return { ok: false, reason: "gone" };
  const done = await db.execute(withdrawOfferQuery(offererId, requestId, now));
  return (done.rowCount ?? done.rows.length) > 0 ? { ok: true, closed: "withdrawn" } : { ok: false, reason: "gone" };
}

/** The offerer of the wanter's own open offer, read before the answer so both friendship rows lock first. */
export function offererQuery(wanterId: string, requestId: string): SQL {
  return sql`select oor.holder_user_id from ${spareRequests} oor
    where oor.id = ${requestId} and oor.asker_user_id = ${wanterId} and oor.initiated_by = 'holder'`;
}

/** The wanter's answer to an offer: one row back means it landed. Needs the live friendship, like an ask's answer. */
export function answerOfferQuery(wanterId: string, requestId: string, answer: "yes" | "no", now: Date): SQL {
  return sql`update ${spareRequests} aor set status = ${answer}, answered_at = ${now.toISOString()}::timestamptz
    where aor.id = ${requestId} and aor.asker_user_id = ${wanterId} and aor.initiated_by = 'holder' and aor.status = 'open'
      and aor.created_at > ${openFloor(now).toISOString()}::timestamptz
      and exists (select 1 from ${friendLinks} afl
        where afl.user_id = aor.asker_user_id and afl.friend_user_id = aor.holder_user_id for share)
    returning aor.id`;
}

/**
 * The wanter answers an offer made to them. Yes changes nothing else in the app (as an ask's Yes). Telling the offerer
 * (feed item and push) is the friend side's job, a later step.
 */
export async function answerOffer(wanterId: string, requestId: unknown, answer: unknown, now = new Date()): Promise<AnswerOutcome> {
  if (!isUuid(requestId) || !isAnswer(answer)) return { ok: false, reason: "gone" };
  return db.transaction(async (tx) => {
    const [who] = (await tx.execute<{ holder_user_id: string }>(offererQuery(wanterId, requestId))).rows;
    if (!who) return { ok: false, reason: "gone" } as const;
    await tx.execute(lockFriendshipQuery(wanterId, who.holder_user_id));
    const done = await tx.execute(answerOfferQuery(wanterId, requestId, answer, now));
    return (done.rowCount ?? done.rows.length) > 0 ? ({ ok: true } as const) : ({ ok: false, reason: "gone" } as const);
  });
}
