/**
 * Spare requests (G5; plan `2026-10-22-spare-requests.md`, PR 1): a player asks a friend for one spare card, and the
 * friend answers Yes or No. The rules are `spare-request-rules.ts`; this module is every read and write of
 * `spare_requests`, and it lives here because each one reaches another account (`check:social-reads`).
 *
 * - An ask needs `SPARE_REQUESTS_ENABLED` for the asker, a current friendship, and the card to be one of that friend's
 *   spares OFFERED to the asker by the one rule every surface reads (`loadFriendSpares`: the pod grant, the friend's
 *   `spare_min` and `spare_keep`). That read runs before the write, in its own snapshots, as the stand-ins modal's
 *   does: a spare that stops being offered a moment later still leaves an ask the friend can answer No to.
 * - The write first takes a lock on the asker and card (`askLockQuery`), so one asker's asks for a card are decided one
 *   at a time. It then locks BOTH friendship rows FOR SHARE, in (user_id, friend_user_id) order, which is the order the purge
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
import { friendLinks, socialProfiles, spareRequests, userPrefs } from "../../db/schema";
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

/**
 * One asker's asks for one card are decided one at a time: the expire, the read, the rules and the insert all run under
 * this transaction-scoped lock, taken before the friendship rows. Without it two asks could both read no prior ask, and
 * a No landing between their inserts would let the second through inside the cooldown. Nothing else takes it, so it
 * adds no lock-order edge with the purge or an unfriend.
 */
export function askLockQuery(askerId: string, oracleId: string): SQL {
  return sql`select pg_advisory_xact_lock(hashtextextended(${`spare-ask:${askerId}:${oracleId}`}, 0))`;
}

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
      await tx.execute(askLockQuery(askerId, oracleId));
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
    // Belt and braces under `askLockQuery`: the partial unique index lets one open row through, and the other is `asked`.
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

/**
 * The Friends badge's spare-request half (plan PR 2). Two counts with two clearings, so the shell keeps them apart:
 * - WAITING: the holder's open, unexpired asks from current friends, whatever their feed opt-in (Waiting on you will
 *   be the only place to answer one). Cleared by answering, never by a visit.
 * Until PR 3 draws the asks and answers on `/friends`, nothing can answer an ask or show an answer, so the switch stays
 * OFF everywhere, staging included (plan `2026-10-22-spare-requests.md`, "Switch").
 * - UNSEEN ANSWERS: the asker's asks answered after `friends_seen_at` and still shown (`askShown`), to current friends.
 *   Cleared by a `/friends` visit, like a trade match (`markAnswersSeenQuery`).
 */
export function waitingAsksCountQuery(holderId: string, now: Date): SQL {
  return sql`select count(*)::int as n
    from ${spareRequests} wsr
    join ${friendLinks} wfl on wfl.user_id = wsr.holder_user_id and wfl.friend_user_id = wsr.asker_user_id
    where wsr.holder_user_id = ${holderId} and wsr.status = 'open'
      and wsr.created_at > ${openFloor(now).toISOString()}::timestamptz`;
}

/** Answers newer than the asker's Friends cursor (none read is every answer unseen), to current friends, still shown. */
function unseenAnswers(askerId: string, now: Date): SQL {
  return sql`select 1 from ${spareRequests} usr
    join ${friendLinks} ufl on ufl.user_id = usr.asker_user_id and ufl.friend_user_id = usr.holder_user_id
    where usr.asker_user_id = ${askerId} and usr.status in ('yes', 'no')
      and usr.answered_at > ${openFloor(now).toISOString()}::timestamptz
      and usr.answered_at > coalesce(
        (select uup.friends_seen_at from ${userPrefs} uup where uup.user_id = ${askerId}), '-infinity'::timestamptz)`;
}

export function unseenAnswersCountQuery(askerId: string, now: Date): SQL {
  return sql`select count(*)::int as n from (${unseenAnswers(askerId, now)}) ua`;
}

/**
 * Moves the asker's Friends cursor to `now`, ONLY while an unseen answer exists, never backwards. Written as an upsert
 * because an asker may have no prefs row yet, and with no row the cursor reads null and every answer stays unseen.
 * `user_prefs` carries the stamp trigger, so the write happens only when it changes something (the `markUpcomingSeen`
 * rule).
 */
export function markAnswersSeenQuery(askerId: string, now: Date): SQL {
  return sql`insert into ${userPrefs} as mup (user_id, friends_seen_at)
    select ${askerId}, ${now.toISOString()}::timestamptz
    where exists (${unseenAnswers(askerId, now)})
    on conflict (user_id) do update set friends_seen_at = excluded.friends_seen_at
      where mup.friends_seen_at is null or mup.friends_seen_at < excluded.friends_seen_at`;
}

async function countOf(query: SQL, q: Executor): Promise<number> {
  const { rows } = await q.execute<{ n: number }>(query);
  return Number((rows as { n: number }[])[0]?.n ?? 0);
}

/** Open asks waiting on this holder's answer; 0 while the switch is off. */
export async function waitingAsksCount(holderId: string, env: NodeJS.ProcessEnv, now = new Date(), q: Executor = db): Promise<number> {
  return spareRequestsEnabled(env) ? countOf(waitingAsksCountQuery(holderId, now), q) : 0;
}

/** Answers this asker has not seen on `/friends`; 0 while the switch is off. */
export async function unseenAnswersCount(askerId: string, env: NodeJS.ProcessEnv, now = new Date(), q: Executor = db): Promise<number> {
  return spareRequestsEnabled(env) ? countOf(unseenAnswersCountQuery(askerId, now), q) : 0;
}

/** Marks this asker's answers seen; whether it wrote. */
export async function markAnswersSeen(askerId: string, env: NodeJS.ProcessEnv, now = new Date(), q: Executor = db): Promise<boolean> {
  if (!spareRequestsEnabled(env)) return false;
  const done = await q.execute(markAnswersSeenQuery(askerId, now));
  return (done.rowCount ?? 0) > 0;
}
