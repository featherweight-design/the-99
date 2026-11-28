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
import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { handSide, ownerLinesQuery, ownerSyncedSide, unionLines } from "../wishlist/lines";
import { loadDeckNeed } from "../decks/deck-need";
import { cards, feedDismissals, friendLinks, socialProfiles, spareRequests } from "../../db/schema";
import { named } from "../person-name/mint";
import { resolveFriend } from "./access";
import { isUuid } from "./rules";
import { askRefusal, capCopies, daysLeft, isAnswer, offerAnswerData, offerData, openFloor, requestState, type AskRefusal, type PriorAsk, type StoredStatus } from "./spare-request-rules";
import {
  askLockQuery, expireStaleQuery, faceOf, inAskTransaction, lockFriendshipQuery, type AnswerOutcome, type AskOutcome, type CloseOutcome,
  type IncomingAsk, type OtherSide,
} from "./spare-requests";
import { recordFeedItem } from "./feed-write";
import { loadFriendSpares, loadOwnOffered, loadOwnSpareSplit } from "./spares";
import { loadFriendsWantedPairs, loadFriendWantedGap } from "./wishlist";
import { MAX_SPARES_BATCH } from "./client-rules";

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
  const out = await inAskTransaction(async (tx) => {
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
    const refusal = offerRefusal(
      prior.map((p) => ({ ...p, status: p.status as StoredStatus, initiatedBy: p.initiatedBy as PriorAsk["initiatedBy"] })),
      offererId, now,
    );
    if (refusal) return { ok: false, reason: refusal };
    const [row] = await tx
      .insert(spareRequests)
      .values({ askerUserId: wanterId, holderUserId: offererId, oracleId, createdAt: now, copies, initiatedBy: "holder", standalone: true })
      .returning({ id: spareRequests.id });
    // The wanter's own item, in the same transaction (an ask's item lands on its holder the same way): the offer waits
    // on THEIR answer. Written nothing for a wanter with the kind off.
    await recordFeedItem(tx, { userId: wanterId, kind: "spare-request", dedupeKey: row.id, oracleId, friendUserId: offererId, data: offerData(), now });
    return { ok: true, id: row.id };
  });
  // The unique-index fallback (`asked` from the shared transaction) only fires on a friend's open request with someone
  // else, since this offerer's own open offer is refused above: it is masked like `offerRefusal` masks it.
  return !out.ok && out.reason === "asked" ? { ok: false, reason: "not-spare" } : out;
}

/**
 * Why `offererId` may not offer now, from the wanter's requests for the card. A friend's pending ask or offer with
 * SOMEONE ELSE is theirs to keep private: the offerer is told only `not-spare`, never that the card is in play
 * elsewhere. Their own open offer reads `asked`; a No inside the cooldown, `declined`. Pure, for a test.
 */
export function offerRefusal(prior: readonly PriorAsk[], offererId: string, now: Date): AskRefusal | "not-spare" | null {
  const refusal = askRefusal(prior, offererId, now, "holder");
  if (refusal === "asked" && !prior.some((p) => p.holderUserId === offererId && requestState(p, now) === "open")) return "not-spare";
  return refusal;
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
    returning aor.id, aor.holder_user_id, aor.oracle_id`;
}

/**
 * The wanter answers an offer made to them. Yes changes nothing else in the app (as an ask's Yes). An answer that lands
 * tells the offerer in the SAME transaction: a `spare-request` feed item on them marked `offer` and with the answer
 * (`offerAnswerData`), whose push `recordFeedItem` queues. Nothing is written for an answer that changed no row.
 */
export async function answerOffer(wanterId: string, requestId: unknown, answer: unknown, now = new Date()): Promise<AnswerOutcome> {
  if (!isUuid(requestId) || !isAnswer(answer)) return { ok: false, reason: "gone" };
  return db.transaction(async (tx) => {
    const [who] = (await tx.execute<{ holder_user_id: string }>(offererQuery(wanterId, requestId))).rows;
    if (!who) return { ok: false, reason: "gone" } as const;
    await tx.execute(lockFriendshipQuery(wanterId, who.holder_user_id));
    const done = await tx.execute<{ id: string; holder_user_id: string; oracle_id: string }>(answerOfferQuery(wanterId, requestId, answer, now));
    const row = done.rows[0];
    if (!row) return { ok: false, reason: "gone" } as const;
    await recordFeedItem(tx, {
      userId: row.holder_user_id, kind: "spare-request", dedupeKey: row.id, oracleId: row.oracle_id, friendUserId: wanterId,
      data: offerAnswerData(answer), now,
    });
    return { ok: true } as const;
  });
}

/** The state of the viewer's spare of a card on a friend's wishlist, as the tile's mark draws it (handoff states). */
export type OfferMark = "asked" | "offered" | "accepted";
export type OfferMarkRow = { mark: OfferMark; requestId: string; daysLeft: number; copies: number };

/**
 * Per card, what stands between the viewer and one friend about the card: `asked` (the friend asked the viewer for it,
 * open), `offered` (the viewer offered it, open), `accepted` (a Yes on one of the viewer's spares: the friend's ask, or the viewer's offer). Anything else draws no mark: no row,
 * declined, expired, withdrawn. One statement over the friend's rows against the viewer's spare (asks of the viewer and the viewer's offers), through the live friendship; an
 * open row wins over an older Yes. Reads only requests the viewer is party to. The row's id and days left ride along for the sheet's Yes and No.
 */
export async function loadOfferMarks(viewerId: string, friendPublicId: unknown, oracleIds: readonly unknown[], now = new Date()): Promise<Map<string, OfferMarkRow>> {
  const ids = [...new Set(oracleIds.filter(isUuid))];
  const out = new Map<string, OfferMarkRow>();
  if (!isUuid(friendPublicId) || ids.length === 0) return out;
  const rows = await db
    .select({
      id: spareRequests.id, oracleId: spareRequests.oracleId, status: spareRequests.status, createdAt: spareRequests.createdAt,
      initiatedBy: spareRequests.initiatedBy, copies: spareRequests.copies,
    })
    .from(spareRequests)
    .innerJoin(socialProfiles, and(eq(socialProfiles.publicId, friendPublicId)))
    .innerJoin(friendLinks, and(eq(friendLinks.userId, viewerId), eq(friendLinks.friendUserId, socialProfiles.userId)))
    // The friend as asker, the viewer as holder: the friend's own ask of the viewer, or the viewer's offer to them.
    .where(and(inArray(spareRequests.oracleId, ids), eq(spareRequests.askerUserId, socialProfiles.userId), eq(spareRequests.holderUserId, viewerId)));
  for (const r of rows) {
    const state = requestState({ status: r.status as StoredStatus, createdAt: r.createdAt }, now);
    const mark: OfferMark | null = state === "open" ? (r.initiatedBy === "holder" ? "offered" : "asked") : state === "yes" ? "accepted" : null;
    if (!mark) continue;
    const had = out.get(r.oracleId);
    if (!had || (mark !== "accepted" && had.mark === "accepted")) out.set(r.oracleId, { mark, requestId: r.id, daysLeft: daysLeft(r.createdAt, now), copies: r.copies });
  }
  return out;
}

/** What a friend's Wishlist tab draws of one card the viewer can spare (`HaveItCard.mark` null: nothing is open or agreed). */
export type HaveItCard = {
  oracleId: string; spare: number; mark: OfferMark | null; requestId: string | null; daysLeft: number | null; copies: number | null;
  /** The viewer's Offer threshold when it holds this spare back (0 < spare < threshold): the tile draws muted, the sheet explains and cannot offer. Absent for an offerable card. */
  under?: number;
};

/**
 * The friend's wishlist cards the viewer can spare, each with its mark (You have it, PR 3b): the viewer's own spare rule
 * (`loadOwnSpareSplit`, in batches) joined to `loadOfferMarks`. A card the viewer cannot spare is absent, whatever its row says.
 * A spare their own threshold holds back comes back with `under` set and no mark (You have it R2: unofferable, and the Offer
 * write's own re-check still refuses it); a card they kept back is absent.
 * The friend's quantity and `held` stay with the caller's lines and the write: neither is read here.
 */
export async function loadHaveIt(viewerId: string, friendPublicId: unknown, oracleIds: readonly string[], now = new Date()): Promise<HaveItCard[]> {
  const ids = [...new Set(oracleIds)];
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += MAX_SPARES_BATCH) batches.push(ids.slice(i, i + MAX_SPARES_BATCH));
  const [spares, marks] = await Promise.all([
    Promise.all(batches.map((b) => loadOwnSpareSplit(viewerId, b))),
    loadOfferMarks(viewerId, friendPublicId, ids, now),
  ]);
  const out: HaveItCard[] = [];
  for (const got of spares) {
    for (const [oracleId, spare] of got.offered) {
      const m = marks.get(oracleId);
      out.push({ oracleId, spare, mark: m?.mark ?? null, requestId: m?.requestId ?? null, daysLeft: m?.daysLeft ?? null, copies: m?.copies ?? null });
    }
    for (const [oracleId, spare] of got.under) {
      out.push({ oracleId, spare, mark: null, requestId: null, daysLeft: null, copies: null, under: got.min });
    }
  }
  return out;
}

/**
 * Per friend, how many of their still-wanted cards the viewer can spare (G7: the `/friends` chip). Keyed by the
 * friend's public id; a friend with none is absent. Cards go through `loadOwnOffered` (the viewer's own rule) in
 * batches; a friend's quantity or `held` never reaches here.
 */
export async function loadSparableCounts(viewerId: string): Promise<Map<string, number>> {
  const pairs = await loadFriendsWantedPairs(viewerId);
  const out = new Map<string, number>();
  if (pairs.length === 0) return out;
  const oracles = [...new Set(pairs.map((p) => p.oracleId))];
  const spare = new Set<string>();
  const batches: string[][] = [];
  for (let i = 0; i < oracles.length; i += MAX_SPARES_BATCH) batches.push(oracles.slice(i, i + MAX_SPARES_BATCH));
  for (const got of await Promise.all(batches.map((b) => loadOwnOffered(viewerId, b)))) for (const id of got.keys()) spare.add(id);
  for (const p of pairs) if (spare.has(p.oracleId)) out.set(p.publicId, (out.get(p.publicId) ?? 0) + 1);
  return out;
}

/**
 * Per friend, how many of their offered spares the viewer wants (friend trades: the `/friends` you want chip), the
 * sparable count's other direction. The viewer's own wanted cards are their still-wanted wishlist lines plus the cards
 * their decks still need; each friend's offer goes through `loadFriendSpares` (the grant read, that friend's own rule).
 * Keyed by public id; a friend with none is absent.
 */
export async function loadWantedCounts(viewerId: string): Promise<Map<string, number>> {
  const [{ rows }, need] = await Promise.all([
    db.execute<{ oracle_id: string }>(ownerLinesQuery(viewerId)),
    loadDeckNeed(viewerId),
  ]);
  const wanted = [...new Set([...rows.map((r) => r.oracle_id), ...Object.keys(need)])];
  const out = new Map<string, number>();
  if (wanted.length === 0) return out;
  const batches: string[][] = [];
  for (let i = 0; i < wanted.length; i += MAX_SPARES_BATCH) batches.push(wanted.slice(i, i + MAX_SPARES_BATCH));
  // Each card is one line per friend in a batch, and the batches never share a card, so a plain count is distinct cards.
  for (const got of await Promise.all(batches.map((b) => loadFriendSpares(viewerId, b)))) {
    for (const s of got) out.set(s.friend.publicId, (out.get(s.friend.publicId) ?? 0) + 1);
  }
  return out;
}

/** An offer waiting on the reader's Yes or No (the wanter): who offers, which card, how many they have, and what the reader wants. */
export type IncomingOffer = {
  id: string; oracleId: string; card: { name: string; imageUri: string | null };
  /** The copies the offerer put on the table (their spare, capped by what the reader lacks). */
  copies: number;
  /** What the reader's own wishlist line wants of the card. */
  want: number;
  offerer: OtherSide;
  createdAt: Date; daysLeft: number;
};

/** The reader's open, unexpired offers from current friends, newest first; a ✕ (`ask:<id>`) hides one. Apart for a test. */
export function incomingOffersQuery(wanterId: string, now: Date): SQL {
  return sql`select ior.id, ior.oracle_id, ior.created_at, ior.copies, iop.public_id::text as public_id, iop.display_name,
      ic.name as card_name, ic.image_uri as card_image,
      (select max(iw.quantity) from (${unionLines(handSide(sql`select ior.asker_user_id`, sql`ior.oracle_id`), ownerSyncedSide(sql`select ior.asker_user_id`, sql`ior.oracle_id`))}) iw) as want,
      icc.oracle_id as commander_oracle_id, icc.name as commander_name, icc.art_crop_uri as commander_art
    from ${spareRequests} ior
    join ${friendLinks} ifl on ifl.user_id = ior.asker_user_id and ifl.friend_user_id = ior.holder_user_id
    join ${socialProfiles} iop on iop.user_id = ior.holder_user_id
    join ${cards} ic on ic.oracle_id = ior.oracle_id
    left join ${cards} icc on icc.oracle_id = iop.commander_oracle_id
    where ior.asker_user_id = ${wanterId} and ior.initiated_by = 'holder' and ior.status = 'open'
      and ior.created_at > ${openFloor(now).toISOString()}::timestamptz
      and not exists (select 1 from ${feedDismissals} idd where idd.user_id = ior.asker_user_id and idd.key = 'ask:' || ior.id::text)
    order by ior.created_at desc, ior.id`;
}

type OfferRow = {
  id: string; oracle_id: string; created_at: Date | string; copies: number; public_id: string; display_name: string;
  card_name: string; card_image: string | null; want: number | null;
  commander_oracle_id: string | null; commander_name: string | null; commander_art: string | null;
};

/** The offers waiting on the reader, as Waiting on you draws them. One whose card left the reader's wishlist stays out: nothing to want. */
export async function loadIncomingOffers(wanterId: string, now = new Date()): Promise<IncomingOffer[]> {
  const rows = (await db.execute<OfferRow>(incomingOffersQuery(wanterId, now))).rows as OfferRow[];
  return rows.flatMap((r) => {
    if (r.want === null) return [];
    const createdAt = new Date(r.created_at);
    return [{
      id: r.id, oracleId: r.oracle_id, card: { name: r.card_name, imageUri: r.card_image }, copies: Number(r.copies), want: Number(r.want),
      offerer: { publicId: r.public_id, displayName: named(r.display_name), commander: faceOf(r) }, createdAt, daysLeft: daysLeft(createdAt, now),
    }];
  });
}

/** Offers waiting on the reader's answer, for the Friends badge beside `waitingAsksCount`. */
export async function waitingOffersCount(wanterId: string, now = new Date()): Promise<number> {
  return (await loadIncomingOffers(wanterId, now)).length;
}

/** An incoming offer as an `IncomingAsk`, turned around: the offerer is the `asker`, the copies they put up are `spare` and `copies`. Waiting on you and Home's lead draw it with the ask's own parts. */
export function offerAsAsk(o: IncomingOffer): IncomingAsk {
  return { id: o.id, oracleId: o.oracleId, card: o.card, copies: o.copies, deckName: null, spare: o.copies, asker: o.offerer, createdAt: o.createdAt, daysLeft: o.daysLeft };
}
