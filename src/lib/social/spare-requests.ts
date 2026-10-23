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
 * - The asker's ✕ (handoff G1) is one conditional UPDATE too: an open ask is WITHDRAWN (nobody is told; it holds no
 *   card and no cooldown), an answered or expired one is CLEARED from the asker's list (`asker_cleared_at`, never a
 *   delete, so a cleared No still holds that friend back). Ask instead withdraws the open ask and asks the next friend
 *   in ONE transaction under the same lock: a refusal of the new ask leaves the first open.
 * - An ask carries `copies` (capped at the friend's spare count) and the asker's deck, stored only when the deck is
 *   the asker's own (G2). Both are display only.
 * - "No longer spare" is derived at read (G3): an open ask for a card the holder no longer offers leaves the holder's
 *   Waiting on you and badge (`loadOwnOffered`), and reads `unavailable` to the asker (`loadFriendSpares`).
 *
 * Nothing returned carries a Clerk id: the other side is a `public_id` and a display name.
 */
import { and, eq, sql, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { cards, decks, friendLinks, socialProfiles, spareRequests, userPrefs } from "../../db/schema";
import { isUniqueViolation } from "../db-error";
import { resolveFriend } from "./access";
import { MAX_SPARES_BATCH } from "./client-rules";
import type { ProfileCommander } from "./commander";
import { recordFeedItem } from "./feed-write";
import { spareRequestsEnabled } from "./flag";
import { isUuid } from "./rules";
import {
  askRefusal, askShown, askerState, capCopies, daysLeft, declineFloor, isAnswer, openFloor, requestState, shownFloor,
  type AskRefusal, type AskerState, type PriorAsk, type StoredStatus,
} from "./spare-request-rules";
import { loadFriendSpares, loadOwnOffered } from "./spares";

type Executor = Pick<typeof db, "execute">;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type AskOutcome = { ok: true; id: string } | { ok: false; reason: "off" | "not-friend" | "not-spare" | "gone" | AskRefusal };
export type AnswerOutcome = { ok: true } | { ok: false; reason: "off" | "gone" };
export type CloseOutcome = { ok: true; closed: "withdrawn" | "cleared" } | { ok: false; reason: "off" | "gone" };

/** What an ask may carry beyond the card (G2): both re-validated on the server, both display only. */
export type AskExtras = { copies?: unknown; deckId?: unknown };

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
 * The asker's own deck, read and KEY SHARE locked in the ask's transaction: one row back means `deck_id` may be
 * stored (G2). Every ask path takes its locks in ONE order: the advisory lock, the friendship rows, this deck, then
 * request rows. Friendship before deck is the purge's order (`purgeSocialIn` locks friend_links before it deletes
 * decks); deck before request is a deck delete's (the deck, then its `on delete set null`), so a delete in progress
 * is waited out and then reads as no deck, and one that comes later waits for the ask.
 */
export function ownDeckQuery(askerId: string, deckId: string): SQL {
  return sql`select odk.id from ${decks} odk where odk.id = ${deckId} and odk.user_id = ${askerId} for key share`;
}

/** The deck to store with the ask, locked (`ownDeckQuery`); not the asker's (or not a deck) is null, never a refusal. */
async function lockOwnDeck(tx: Tx, a: Asking): Promise<string | null> {
  if (!isUuid(a.deckId)) return null;
  return (await tx.execute(ownDeckQuery(a.askerId, a.deckId))).rows.length > 0 ? a.deckId : null;
}

/** One ask, decided: who asks whom for what, with the copies already capped. */
export type Asking = { askerId: string; holderId: string; oracleId: string; copies: number; deckId: unknown; now: Date };

/**
 * The ask's transaction body, for `askForSpare` and Ask instead (`askInsteadForSpare`), which runs it after its own
 * withdraw in the same transaction. It takes `askLockQuery` (re-entrant: Ask instead already holds it) and the
 * friendship rows before anything else, writes the stale asks expired, applies the rules, and inserts with the
 * holder's feed item. A refusal returns before any write of its own.
 */
export async function askIn(tx: Tx, a: Asking): Promise<AskOutcome> {
  await tx.execute(askLockQuery(a.askerId, a.oracleId));
  const links = await tx.execute(lockFriendshipQuery(a.askerId, a.holderId));
  if (links.rows.length !== 2) return { ok: false, reason: "not-friend" };
  const deckId = await lockOwnDeck(tx, a);
  await tx.execute(expireStaleQuery(a.askerId, a.oracleId, a.now));
  const prior = await tx
    .select({
      holderUserId: spareRequests.holderUserId, status: spareRequests.status,
      createdAt: spareRequests.createdAt, answeredAt: spareRequests.answeredAt,
    })
    .from(spareRequests)
    .where(and(eq(spareRequests.askerUserId, a.askerId), eq(spareRequests.oracleId, a.oracleId)));
  const refusal = askRefusal(prior.map((p) => ({ ...p, status: p.status as StoredStatus })), a.holderId, a.now);
  if (refusal) return { ok: false, reason: refusal };
  const [row] = await tx
    .insert(spareRequests)
    .values({ askerUserId: a.askerId, holderUserId: a.holderId, oracleId: a.oracleId, createdAt: a.now, copies: a.copies, deckId })
    .returning({ id: spareRequests.id });
  await recordFeedItem(tx, { userId: a.holderId, kind: "spare-request", dedupeKey: row.id, oracleId: a.oracleId, friendUserId: a.askerId, now: a.now });
  return { ok: true, id: row.id };
}

/**
 * The checks every ask runs before its transaction: the switch, the friend, and the card one of that friend's spares
 * offered to the asker, whose count caps the copies. A refusal here writes nothing.
 */
async function prepareAsk(
  askerId: string, friendPublicId: unknown, oracleId: unknown, env: NodeJS.ProcessEnv, now: Date, extras: AskExtras,
): Promise<Asking | Extract<AskOutcome, { ok: false }>> {
  if (!spareRequestsEnabled(env)) return { ok: false, reason: "off" };
  if (!isUuid(oracleId)) return { ok: false, reason: "not-spare" };
  const holderId = await resolveFriend(askerId, friendPublicId);
  if (!holderId) return { ok: false, reason: "not-friend" };
  const offered = (await loadFriendSpares(askerId, [oracleId])).find((s) => s.oracleId === oracleId && s.friend.publicId === friendPublicId);
  if (!offered) return { ok: false, reason: "not-spare" };
  return { askerId, holderId, oracleId, copies: capCopies(extras.copies, offered.spare), deckId: extras.deckId, now };
}

/** Thrown inside a transaction to roll it back while handing its refusal out. */
class Refused extends Error {
  constructor(readonly outcome: AskOutcome) {
    super("refused");
  }
}

async function inAskTransaction(body: (tx: Tx) => Promise<AskOutcome>): Promise<AskOutcome> {
  try {
    return await db.transaction(async (tx) => {
      const out = await body(tx);
      if (!out.ok) throw new Refused(out);
      return out;
    });
  } catch (e) {
    if (e instanceof Refused) return e.outcome;
    // Belt and braces under `askLockQuery`: the partial unique index lets one open row through, and the other is `asked`.
    if (isUniqueViolation(e)) return { ok: false, reason: "asked" };
    throw e;
  }
}

/**
 * Asks the friend `friendPublicId` for a spare of `oracleId`. `asked` when the asker already has an open ask for the
 * card (to anyone), `declined` when this friend said No to it inside the cooldown. `extras` carries the copies and
 * the deck (G2).
 */
export async function askForSpare(
  askerId: string, friendPublicId: unknown, oracleId: unknown, env: NodeJS.ProcessEnv, now = new Date(), extras: AskExtras = {},
): Promise<AskOutcome> {
  const asking = await prepareAsk(askerId, friendPublicId, oracleId, env, now, extras);
  if ("ok" in asking) return asking;
  return inAskTransaction((tx) => askIn(tx, asking));
}

/**
 * Ask instead's withdraw (G1), apart so a test can render it: the asker's own open, unexpired ask `requestId` for
 * this card, to someone other than the friend now asked. One row back means it was withdrawn.
 */
export function withdrawForInsteadQuery(askerId: string, requestId: string, oracleId: string, holderId: string, now: Date): SQL {
  return sql`update ${spareRequests} isr set status = 'withdrawn'
    where isr.id = ${requestId} and isr.asker_user_id = ${askerId} and isr.oracle_id = ${oracleId}
      and isr.status = 'open' and isr.created_at > ${openFloor(now).toISOString()}::timestamptz
      and isr.holder_user_id <> ${holderId}
    returning isr.id`;
}

/**
 * Ask instead (G1): withdraws the asker's open ask `fromRequestId` for the card and asks `friendPublicId` instead,
 * in ONE transaction under the asker-and-card lock, the new friendship rows locked before the withdraw (the order
 * every ask takes them). `gone` when the first ask is not the asker's open, unexpired ask for this card to another
 * friend; any refusal of the new ask rolls the withdraw back, so the first ask stays open.
 */
export async function askInsteadForSpare(
  askerId: string, fromRequestId: unknown, friendPublicId: unknown, oracleId: unknown, env: NodeJS.ProcessEnv,
  now = new Date(), extras: AskExtras = {},
): Promise<AskOutcome> {
  const asking = await prepareAsk(askerId, friendPublicId, oracleId, env, now, extras);
  if ("ok" in asking) return asking;
  if (!isUuid(fromRequestId)) return { ok: false, reason: "gone" };
  return inAskTransaction(async (tx) => {
    await tx.execute(askLockQuery(askerId, asking.oracleId));
    const links = await tx.execute(lockFriendshipQuery(askerId, asking.holderId));
    if (links.rows.length !== 2) return { ok: false, reason: "not-friend" };
    // The deck after the friendship and before the withdraw writes a request row (`ownDeckQuery`'s order); `askIn`
    // takes it again, re-entrantly.
    await lockOwnDeck(tx, asking);
    const gone = await tx.execute(withdrawForInsteadQuery(askerId, fromRequestId, asking.oracleId, asking.holderId, now));
    if ((gone.rowCount ?? gone.rows.length) === 0) return { ok: false, reason: "gone" };
    return askIn(tx, asking);
  });
}

/** ✕ on an OPEN ask (G1): the asker's own, still open and unexpired. Nobody is told. One row back means it landed. */
export function withdrawQuery(askerId: string, requestId: string, now: Date): SQL {
  return sql`update ${spareRequests} wdr set status = 'withdrawn'
    where wdr.id = ${requestId} and wdr.asker_user_id = ${askerId}
      and wdr.status = 'open' and wdr.created_at > ${openFloor(now).toISOString()}::timestamptz
    returning wdr.id`;
}

/**
 * ✕ on an ANSWERED or EXPIRED ask (G1): the asker's own, not yet cleared. It leaves the asker's list and nothing
 * else: the row stays, so a cleared No still holds that friend back. An open ask past its days is written `expired`
 * as it goes, a real state change that frees the card as the next ask would.
 */
export function clearQuery(askerId: string, requestId: string, now: Date): SQL {
  const floor = openFloor(now).toISOString();
  return sql`update ${spareRequests} csr set asker_cleared_at = ${now.toISOString()}::timestamptz,
      status = case when csr.status = 'open' then 'expired' else csr.status end
    where csr.id = ${requestId} and csr.asker_user_id = ${askerId} and csr.asker_cleared_at is null
      and (csr.status in ('yes', 'no', 'expired') or (csr.status = 'open' and csr.created_at <= ${floor}::timestamptz))
    returning csr.id`;
}

/** The asker's ✕ on one of their asks: withdraws it while open, else clears it from their list. */
export async function closeSpareRequest(
  askerId: string, requestId: unknown, env: NodeJS.ProcessEnv, now = new Date(), q: Executor = db,
): Promise<CloseOutcome> {
  if (!spareRequestsEnabled(env)) return { ok: false, reason: "off" };
  if (!isUuid(requestId)) return { ok: false, reason: "gone" };
  const landed = (r: { rowCount?: number | null; rows: unknown[] }) => (r.rowCount ?? r.rows.length) > 0;
  if (landed(await q.execute(withdrawQuery(askerId, requestId, now)))) return { ok: true, closed: "withdrawn" };
  if (landed(await q.execute(clearQuery(askerId, requestId, now)))) return { ok: true, closed: "cleared" };
  return { ok: false, reason: "gone" };
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

/** The other side of an ask: never a Clerk id. `commander` is their face, or null for initials. */
export type OtherSide = { publicId: string; displayName: string; commander: ProfileCommander | null };
export type AskCard = { name: string; imageUri: string | null };

export type IncomingAsk = {
  id: string; oracleId: string; card: AskCard; copies: number;
  /** The asker's deck the card is for, by name, or null. */
  deckName: string | null;
  /** How many spare copies of the card the HOLDER offers now. */
  spare: number;
  asker: OtherSide; createdAt: Date; daysLeft: number;
};

/** A face from a row's three commander columns (the `toCommander` rule, on raw SQL's names). */
function faceOf(r: { commander_oracle_id: string | null; commander_name: string | null; commander_art: string | null }): ProfileCommander | null {
  if (r.commander_oracle_id === null || r.commander_name === null) return null;
  return { oracleId: r.commander_oracle_id, name: r.commander_name, artCropUri: r.commander_art };
}

/**
 * The holder's open, unexpired asks from current friends, newest first, with what the row draws: the card, the
 * copies, the asker's face and the asker's deck NAME, which is read only through the live friendship this statement
 * joins (the asker chose to send it with the ask). Apart so a test can render it.
 */
export function incomingAsksQuery(holderId: string, now: Date): SQL {
  return sql`select isr.id, isr.oracle_id, isr.created_at, isr.copies, isp.public_id::text as public_id, isp.display_name,
      ic.name as card_name, ic.image_uri as card_image, idk.name as deck_name,
      icc.oracle_id as commander_oracle_id, icc.name as commander_name, icc.art_crop_uri as commander_art
    from ${spareRequests} isr
    join ${friendLinks} ifl on ifl.user_id = isr.holder_user_id and ifl.friend_user_id = isr.asker_user_id
    join ${socialProfiles} isp on isp.user_id = isr.asker_user_id
    join ${cards} ic on ic.oracle_id = isr.oracle_id
    left join ${decks} idk on idk.id = isr.deck_id and idk.user_id = isr.asker_user_id
    left join ${cards} icc on icc.oracle_id = isp.commander_oracle_id
    where isr.holder_user_id = ${holderId} and isr.status = 'open'
      and isr.created_at > ${openFloor(now).toISOString()}::timestamptz
    order by isr.created_at desc, isr.id`;
}

type Face = { commander_oracle_id: string | null; commander_name: string | null; commander_art: string | null };
type IncomingRow = Face & {
  id: string; oracle_id: string; created_at: Date | string; copies: number; public_id: string; display_name: string;
  card_name: string; card_image: string | null; deck_name: string | null;
};

/**
 * Waiting on you's spare-request rows. An ask for a card the holder NO LONGER OFFERS (kept back, under their
 * threshold, or claimed by their decks since; `loadOwnOffered`, the rule friends read their spares by) is left out:
 * it is not theirs to answer any more (G3). `env` is the holder's own resolved switches.
 */
export async function loadIncomingAsks(holderId: string, env: NodeJS.ProcessEnv, now = new Date(), q: Executor = db): Promise<IncomingAsk[]> {
  if (!spareRequestsEnabled(env)) return [];
  const rows = (await q.execute<IncomingRow>(incomingAsksQuery(holderId, now))).rows as IncomingRow[];
  if (rows.length === 0) return [];
  const offered = await loadOwnOffered(holderId, rows.map((r) => r.oracle_id), env);
  return rows.flatMap((r) => {
    const spare = offered.get(r.oracle_id);
    if (spare === undefined) return [];
    const createdAt = new Date(r.created_at);
    return [{
      id: r.id, oracleId: r.oracle_id, card: { name: r.card_name, imageUri: r.card_image }, copies: Number(r.copies),
      deckName: r.deck_name, spare, createdAt, daysLeft: daysLeft(createdAt, now),
      asker: { publicId: r.public_id, displayName: r.display_name, commander: faceOf(r) },
    }];
  });
}

export type MyAsk = {
  id: string; oracleId: string; card: AskCard; copies: number; deckName: string | null;
  /** The asker's own deck the ask was for (their own id, so Ask again can carry it), or null. */
  deckId: string | null;
  holder: OtherSide;
  state: AskerState;
  /** Days left on an open (or unavailable, or unneeded) ask; null once answered or expired. */
  daysLeft: number | null;
  createdAt: Date; answeredAt: Date | null;
  /**
   * The asker cleared it from their list: read only with `keepClearedDeclines`, for a No still inside its cooldown
   * (which still holds that friend back). Your requests never draws one.
   */
  cleared: boolean;
};

/**
 * The asker's asks to current friends that the list may still show (`askShown`), newest first: never a withdrawn one
 * nor one the asker cleared. `oracleIds` narrows it to those cards (the Shopping read). Apart for a test.
 */
export function myAsksQuery(askerId: string, now: Date, oracleIds?: readonly string[], keepClearedDeclines = false): SQL {
  const only = oracleIds ? sql` and msr.oracle_id = any(${sql.param([...oracleIds])}::uuid[])` : sql``;
  // Shopping's read keeps a No the asker cleared while it still holds that friend back, so the modal draws Declined
  // rather than an Ask the write would refuse; Your requests (the list the ✕ clears) never does.
  const cleared = keepClearedDeclines
    ? sql`(msr.asker_cleared_at is null or (msr.status = 'no' and msr.answered_at > ${declineFloor(now).toISOString()}::timestamptz))`
    : sql`msr.asker_cleared_at is null`;
  return sql`select msr.id, msr.oracle_id, msr.status, msr.created_at, msr.answered_at, msr.copies,
      msp.public_id::text as public_id, msp.display_name, mc.name as card_name, mc.image_uri as card_image, mdk.name as deck_name,
      mdk.id as deck_id, msr.asker_cleared_at is not null as cleared,
      mcc.oracle_id as commander_oracle_id, mcc.name as commander_name, mcc.art_crop_uri as commander_art
    from ${spareRequests} msr
    join ${friendLinks} mfl on mfl.user_id = msr.asker_user_id and mfl.friend_user_id = msr.holder_user_id
    join ${socialProfiles} msp on msp.user_id = msr.holder_user_id
    join ${cards} mc on mc.oracle_id = msr.oracle_id
    left join ${decks} mdk on mdk.id = msr.deck_id and mdk.user_id = msr.asker_user_id
    left join ${cards} mcc on mcc.oracle_id = msp.commander_oracle_id
    where msr.asker_user_id = ${askerId} and msr.created_at > ${shownFloor(now).toISOString()}::timestamptz
      and msr.status <> 'withdrawn' and ${cleared}${only}
    order by msr.created_at desc, msr.id`;
}

type MyRow = Face & {
  id: string; oracle_id: string; status: StoredStatus; created_at: Date | string; answered_at: Date | string | null;
  copies: number; public_id: string; display_name: string; card_name: string; card_image: string | null; deck_name: string | null;
  deck_id: string | null; cleared: boolean;
};

export type MyAsksOptions = {
  /**
   * The cards the asker's lists still want. Given, an open ask for a card outside it reads `unneeded` (G3); absent,
   * no ask does. The holder's side never reads the asker's decks.
   */
  stillNeeded?: ReadonlySet<string>;
  /** Only these cards. */
  oracleIds?: readonly string[];
  /** Keep a cleared No inside its cooldown (`myAsksQuery`): the per-card read, never the list. */
  keepClearedDeclines?: boolean;
};

/** One shown ask as stored, before the live derivation (`deriveMyAsks`). Opaque outside this module. */
export type ShownAsk = { r: MyRow; a: { status: Exclude<StoredStatus, "withdrawn">; createdAt: Date; answeredAt: Date | null } };

/** The asker's shown asks as stored (`myAsksQuery`, then `askShown`), newest first. No live read. */
export async function readShownAsks(
  askerId: string, now: Date, opts: Pick<MyAsksOptions, "oracleIds" | "keepClearedDeclines"> = {}, q: Executor = db,
): Promise<ShownAsk[]> {
  if (opts.oracleIds && opts.oracleIds.length === 0) return [];
  const { rows } = await q.execute<MyRow>(myAsksQuery(askerId, now, opts.oracleIds, opts.keepClearedDeclines));
  return (rows as MyRow[]).flatMap((r) => {
    if (r.status === "withdrawn") return [];
    const a = { status: r.status, createdAt: new Date(r.created_at), answeredAt: r.answered_at == null ? null : new Date(r.answered_at) };
    return askShown(a, now) ? [{ r, a: { ...a, status: r.status as Exclude<StoredStatus, "withdrawn"> } }] : [];
  });
}

/** The cards whose OPEN asks need their holder's live offer (`loadFriendSpares`) to read open or unavailable. */
export function openAskCards(shown: readonly ShownAsk[], now: Date): string[] {
  return [...new Set(shown.filter(({ a }) => requestState(a, now) === "open").map(({ r }) => r.oracle_id))];
}

/** The key `deriveMyAsks` looks a holder's live offer up by: the card and the holder's public id. */
export const offerKey = (oracleId: string, publicId: string): string => `${oracleId} ${publicId}`;

/**
 * Each shown ask as the asker sees it (`askerState`): `offered` holds `offerKey`s for the holders who offer the card
 * now (needed for the open asks' cards only), `stillNeeded` as `MyAsksOptions` describes. Pure.
 */
export function deriveMyAsks(
  shown: readonly ShownAsk[], now: Date, offered: ReadonlySet<string>, stillNeeded?: ReadonlySet<string>,
): MyAsk[] {
  return shown.map(({ r, a }) => {
    const state = askerState(a, now, {
      offered: offered.has(offerKey(r.oracle_id, r.public_id)),
      needed: stillNeeded ? stillNeeded.has(r.oracle_id) : true,
    });
    const open = state === "open" || state === "unavailable" || state === "unneeded";
    return {
      id: r.id, oracleId: r.oracle_id, card: { name: r.card_name, imageUri: r.card_image }, copies: Number(r.copies),
      deckName: r.deck_name, deckId: r.deck_id, holder: { publicId: r.public_id, displayName: r.display_name, commander: faceOf(r) },
      state, daysLeft: open ? daysLeft(a.createdAt, now) : null, createdAt: a.createdAt, answeredAt: a.answeredAt,
      cleared: r.cleared === true,
    };
  });
}

/**
 * Whether the asker may ask this ask's holder for its card again now, by the write's own rule (`askRefusal`) over the
 * asker's shown asks for the card. `asks` must be read WITH `keepClearedDeclines`: a No the asker cleared still holds
 * that friend back for the cooldown. Public ids stand in for the holder, since they name one person each. `offered` is
 * whether the holder offers the card to the asker NOW (`loadFriendSpares`): without it the write refuses `not-spare`.
 */
export function canAskAgain(ask: MyAsk, asks: readonly MyAsk[], now: Date, offered: boolean): boolean {
  if (!offered) return false;
  const prior: PriorAsk[] = asks.filter((m) => m.oracleId === ask.oracleId).map((m) => ({
    holderUserId: m.holder.publicId,
    status: m.state === "unavailable" || m.state === "unneeded" ? "open" : m.state,
    createdAt: m.createdAt, answeredAt: m.answeredAt,
  }));
  return askRefusal(prior, ask.holder.publicId, now) === null;
}

/**
 * The asker's list (Your requests, Shopping). An OPEN ask reads `unavailable` when its holder no longer offers the card
 * to the asker (one `loadFriendSpares` read for the open asks' cards, the rule the Ask press checked), then `unneeded`
 * per `stillNeeded` (`askerState`).
 */
export async function loadMyAsks(
  askerId: string, env: NodeJS.ProcessEnv, now = new Date(), opts: MyAsksOptions = {}, q: Executor = db,
): Promise<MyAsk[]> {
  if (!spareRequestsEnabled(env)) return [];
  const shown = await readShownAsks(askerId, now, opts, q);
  const openCards = openAskCards(shown, now);
  const offered = new Set(
    openCards.length === 0 ? [] : (await loadFriendSpares(askerId, openCards)).map((s) => offerKey(s.oracleId, s.friend.publicId)),
  );
  return deriveMyAsks(shown, now, offered, opts.stillNeeded);
}

/** One ask as `GET /api/spare-requests` serves it to the asker (the Shopping modal and the row marks). */
export type AskStateLine = {
  id: string; oracleId: string; holder: { publicId: string; displayName: string }; state: AskerState;
  daysLeft: number | null; createdAt: string; answeredAt: string | null;
};

/**
 * The asker's shown asks for these cards, as the route serves them: never a Clerk id. Null when the ids are not a
 * batch the route accepts (1 to `MAX_SPARES_BATCH` card ids), checked before anything is read.
 */
export async function loadAskStates(
  askerId: string, oracleIds: readonly unknown[], env: NodeJS.ProcessEnv, now = new Date(),
): Promise<AskStateLine[] | null> {
  if (oracleIds.length === 0 || oracleIds.length > MAX_SPARES_BATCH || !oracleIds.every(isUuid)) return null;
  const asks = await loadMyAsks(askerId, env, now, { oracleIds: oracleIds as string[], keepClearedDeclines: true });
  return asks.map((m) => ({
    id: m.id, oracleId: m.oracleId, holder: { publicId: m.holder.publicId, displayName: m.holder.displayName }, state: m.state,
    daysLeft: m.daysLeft, createdAt: m.createdAt.toISOString(), answeredAt: m.answeredAt ? m.answeredAt.toISOString() : null,
  }));
}

/**
 * The Friends badge's spare-request half (plan PR 2). Two counts with two clearings, so the shell keeps them apart:
 * - WAITING: the holder's open, unexpired asks from current friends, whatever their feed opt-in (Waiting on you is
 *   the only place to answer one), less those for a card the holder no longer offers (G3). Cleared by answering (or
 *   the asker withdrawing), never by a visit.
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
    where usr.asker_user_id = ${askerId} and usr.status in ('yes', 'no') and usr.asker_cleared_at is null
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

/**
 * Open asks waiting on this holder's answer; 0 while the switch is off. The SQL count runs first (the shell reads it
 * on every page) and only when it finds one are the rows loaded and filtered by what the holder still offers (G3), so
 * the badge and Waiting on you always agree.
 */
export async function waitingAsksCount(holderId: string, env: NodeJS.ProcessEnv, now = new Date(), q: Executor = db): Promise<number> {
  if (!spareRequestsEnabled(env)) return 0;
  if ((await countOf(waitingAsksCountQuery(holderId, now), q)) === 0) return 0;
  return (await loadIncomingAsks(holderId, env, now, q)).length;
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
