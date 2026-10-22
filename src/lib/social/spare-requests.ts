/**
 * Spare requests (G5; plan `2026-10-22-spare-requests.md`, PR 1): a player asks a friend for one spare card, and the
 * friend answers Yes or No. The rules are `spare-request-rules.ts`; this module is every read and write of
 * `spare_requests`, and it lives here because each one reaches another account (`check:social-reads`).
 *
 * - An ask needs `SPARE_REQUESTS_ENABLED` for the asker, a current friendship, and the card to be one of that friend's
 *   spares OFFERED to the asker by the one rule every surface reads (`loadFriendSpares`: the pod grant, the friend's
 *   `spare_min` and `spare_keep`). That read runs before the write, in its own snapshots, as the stand-ins modal's
 *   does: a spare that stops being offered a moment later still leaves an ask the friend can answer No to.
 * - The write locks BOTH friendship rows FOR SHARE, in (user_id, friend_user_id) order, which is the order the purge
 *   and an unfriend lock them for update: an ask racing either waits and then finds the friendship gone, or commits
 *   first and is deleted by the purge. It writes the holder's feed item ("a friend wants your spare") in the same
 *   transaction through `recordFeedItem`, which writes nothing for a holder with that kind off.
 * - An answer is ONE conditional UPDATE: the holder's own open, unexpired ask, while the holder still holds the
 *   friendship row. Anything else changes nothing and answers `gone`.
 *
 * Nothing returned carries a Clerk id: the other side is a `public_id` and a display name.
 */
import { and, eq, sql, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { friendLinks, socialProfiles, spareRequests } from "../../db/schema";
import { isUniqueViolation } from "../db-error";
import { resolveFriend } from "./access";
import { recordFeedItem } from "./feed-write";
import { spareRequestsEnabled } from "./flag";
import { isUuid } from "./rules";
import {
  askRefusal, askShown, isAnswer, openFloor, requestState, shownFloor,
  type AskRefusal, type RequestState, type StoredStatus,
} from "./spare-request-rules";
import { loadFriendSpares } from "./spares";

type Executor = Pick<typeof db, "execute">;

export type AskOutcome = { ok: true; id: string } | { ok: false; reason: "off" | "not-friend" | "not-spare" | AskRefusal };
export type AnswerOutcome = { ok: true } | { ok: false; reason: "off" | "gone" };

/** Both directed friendship rows, locked for share in the purge's order. Two rows back means the friendship stands. */
export function lockFriendshipQuery(a: string, b: string): SQL {
  return sql`select sfl.user_id from ${friendLinks} sfl
    where (sfl.user_id = ${a} and sfl.friend_user_id = ${b}) or (sfl.user_id = ${b} and sfl.friend_user_id = ${a})
    order by sfl.user_id, sfl.friend_user_id
    for share`;
}

/**
 * The asker's open asks for the card that can no longer be answered, written `expired` so the one-open index frees:
 * those past their days, and those to someone no longer a friend (an unfriend drops the ask from both lists, so it
 * must not hold the card either).
 */
export function expireStaleQuery(askerId: string, oracleId: string, now: Date): SQL {
  return sql`update ${spareRequests} xsr set status = 'expired'
    where xsr.asker_user_id = ${askerId} and xsr.oracle_id = ${oracleId} and xsr.status = 'open'
      and (xsr.created_at <= ${openFloor(now).toISOString()}::timestamptz
        or not exists (select 1 from ${friendLinks} xfl
          where xfl.user_id = xsr.asker_user_id and xfl.friend_user_id = xsr.holder_user_id))`;
}

/**
 * Asks the friend `friendPublicId` for a spare of `oracleId`. `asked` when the asker already has an open ask for the
 * card (to anyone), `declined` when this friend said No to it inside the cooldown.
 */
export async function askForSpare(
  askerId: string, friendPublicId: unknown, oracleId: unknown, env: NodeJS.ProcessEnv, now = new Date(),
): Promise<AskOutcome> {
  if (!spareRequestsEnabled(env)) return { ok: false, reason: "off" };
  if (!isUuid(oracleId)) return { ok: false, reason: "not-spare" };
  const holderId = await resolveFriend(askerId, friendPublicId);
  if (!holderId) return { ok: false, reason: "not-friend" };
  const offered = await loadFriendSpares(askerId, [oracleId]);
  if (!offered.some((s) => s.oracleId === oracleId && s.friend.publicId === friendPublicId)) return { ok: false, reason: "not-spare" };
  try {
    return await db.transaction(async (tx): Promise<AskOutcome> => {
      const links = await tx.execute(lockFriendshipQuery(askerId, holderId));
      if (links.rows.length !== 2) return { ok: false, reason: "not-friend" };
      await tx.execute(expireStaleQuery(askerId, oracleId, now));
      const prior = await tx
        .select({
          holderUserId: spareRequests.holderUserId, status: spareRequests.status,
          createdAt: spareRequests.createdAt, answeredAt: spareRequests.answeredAt,
        })
        .from(spareRequests)
        .where(and(eq(spareRequests.askerUserId, askerId), eq(spareRequests.oracleId, oracleId)));
      const refusal = askRefusal(prior.map((p) => ({ ...p, status: p.status as StoredStatus })), holderId, now);
      if (refusal) return { ok: false, reason: refusal };
      const [row] = await tx
        .insert(spareRequests)
        .values({ askerUserId: askerId, holderUserId: holderId, oracleId, createdAt: now })
        .returning({ id: spareRequests.id });
      await recordFeedItem(tx, { userId: holderId, kind: "spare-request", dedupeKey: row.id, oracleId, friendUserId: askerId, now });
      return { ok: true, id: row.id };
    });
  } catch (e) {
    // Two asks for one card at once: the partial unique index lets one open row through, and the other is `asked`.
    if (isUniqueViolation(e)) return { ok: false, reason: "asked" };
    throw e;
  }
}

/** The answer, apart so a test can render it: one row back means it landed. */
export function answerQuery(holderId: string, requestId: string, answer: "yes" | "no", now: Date): SQL {
  return sql`update ${spareRequests} asr set status = ${answer}, answered_at = ${now.toISOString()}::timestamptz
    where asr.id = ${requestId} and asr.holder_user_id = ${holderId} and asr.status = 'open'
      and asr.created_at > ${openFloor(now).toISOString()}::timestamptz
      and exists (select 1 from ${friendLinks} afl
        where afl.user_id = asr.holder_user_id and afl.friend_user_id = asr.asker_user_id for share)
    returning asr.id`;
}

/** The holder answers their own open ask. Yes changes nothing else in the app (round 8, Q4). */
export async function answerSpareRequest(
  holderId: string, requestId: unknown, answer: unknown, env: NodeJS.ProcessEnv, now = new Date(), q: Executor = db,
): Promise<AnswerOutcome> {
  if (!spareRequestsEnabled(env)) return { ok: false, reason: "off" };
  if (!isUuid(requestId) || !isAnswer(answer)) return { ok: false, reason: "gone" };
  const done = await q.execute(answerQuery(holderId, requestId, answer, now));
  return (done.rowCount ?? done.rows.length) > 0 ? { ok: true } : { ok: false, reason: "gone" };
}

export type OtherSide = { publicId: string; displayName: string };

export type IncomingAsk = { id: string; oracleId: string; asker: OtherSide; createdAt: Date };

/** The holder's open, unexpired asks from current friends, newest first. Apart so a test can render it. */
export function incomingAsksQuery(holderId: string, now: Date): SQL {
  return sql`select isr.id, isr.oracle_id, isr.created_at, isp.public_id::text as public_id, isp.display_name
    from ${spareRequests} isr
    join ${friendLinks} ifl on ifl.user_id = isr.holder_user_id and ifl.friend_user_id = isr.asker_user_id
    join ${socialProfiles} isp on isp.user_id = isr.asker_user_id
    where isr.holder_user_id = ${holderId} and isr.status = 'open'
      and isr.created_at > ${openFloor(now).toISOString()}::timestamptz
    order by isr.created_at desc, isr.id`;
}

type IncomingRow = { id: string; oracle_id: string; created_at: Date | string; public_id: string; display_name: string };

export async function loadIncomingAsks(holderId: string, env: NodeJS.ProcessEnv, now = new Date(), q: Executor = db): Promise<IncomingAsk[]> {
  if (!spareRequestsEnabled(env)) return [];
  const { rows } = await q.execute<IncomingRow>(incomingAsksQuery(holderId, now));
  return (rows as IncomingRow[]).map((r) => ({
    id: r.id, oracleId: r.oracle_id, createdAt: new Date(r.created_at), asker: { publicId: r.public_id, displayName: r.display_name },
  }));
}

export type MyAsk = { id: string; oracleId: string; holder: OtherSide; state: RequestState; createdAt: Date; answeredAt: Date | null };

/** The asker's asks to current friends that the list may still show (`askShown`), newest first. Apart for a test. */
export function myAsksQuery(askerId: string, now: Date): SQL {
  return sql`select msr.id, msr.oracle_id, msr.status, msr.created_at, msr.answered_at,
      msp.public_id::text as public_id, msp.display_name
    from ${spareRequests} msr
    join ${friendLinks} mfl on mfl.user_id = msr.asker_user_id and mfl.friend_user_id = msr.holder_user_id
    join ${socialProfiles} msp on msp.user_id = msr.holder_user_id
    where msr.asker_user_id = ${askerId} and msr.created_at > ${shownFloor(now).toISOString()}::timestamptz
    order by msr.created_at desc, msr.id`;
}

type MyRow = {
  id: string; oracle_id: string; status: StoredStatus; created_at: Date | string; answered_at: Date | string | null;
  public_id: string; display_name: string;
};

export async function loadMyAsks(askerId: string, env: NodeJS.ProcessEnv, now = new Date(), q: Executor = db): Promise<MyAsk[]> {
  if (!spareRequestsEnabled(env)) return [];
  const { rows } = await q.execute<MyRow>(myAsksQuery(askerId, now));
  return (rows as MyRow[]).flatMap((r) => {
    const a = { status: r.status, createdAt: new Date(r.created_at), answeredAt: r.answered_at == null ? null : new Date(r.answered_at) };
    if (!askShown(a, now)) return [];
    return [{
      id: r.id, oracleId: r.oracle_id, holder: { publicId: r.public_id, displayName: r.display_name },
      state: requestState(a, now), createdAt: a.createdAt, answeredAt: a.answeredAt,
    }];
  });
}
