/**
 * `/friends`' Waiting on you (menu and Home PR 7; board `Friends`, 2a to 2c): the feed's friend items, read for the
 * friends page: a spare request waiting on the reader's answer (spare requests PR 3d; handoff
 * `design_handoff_the99_spare_requests` call 8, board `Friend-Side`) and the trade match ("Colin has a spare Ghalta").
 * Waiting kinds first (`feedOrder`), newest within.
 *
 * A spare request's rows come from `loadIncomingAsks`, NOT the feed: an ask waits here whatever the reader's feed
 * opt-in, since this is the only place to answer it. Each row is always marked unseen: a waiting ask is counted by the
 * Friends badge until it is answered, never cleared by a visit (`waitingAsksCount`), and the diamond says the same.
 *
 * A trade match's rows come from the feed's own read (`feedQuery`), which re-joins the live spares grant on every read, so an
 * unfriend, a share turned off or a card kept back drops the row with no write. `unseen` is measured against
 * `friends_seen_at`, the Friends badge's cursor, never Home's. What a row draws of the friend (their face and the
 * pods the share reaches the viewer through) comes from the same grant's details, read on the viewer: a friend whose
 * grant is gone between the two reads draws no row.
 */
import { inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards } from "../../db/schema";
import { availableFeedKinds } from "../feed/flag";
import { feedQuery, toFeedItem } from "../feed/read";
import { foldGroups, readerZone, rollGroup, rollZone } from "../feed/rollup";
import { feedOrder, type FeedKind } from "../feed/kinds";
import { named } from "../person-name/mint";
import type { ThirdPartyName } from "../person-name/brand";
import { toCommander, type ProfileCommander } from "./commander";
import { loadIncomingFriendRequests, type IncomingFriendRequest } from "./friend-requests";
import { loadIncomingAsks, type IncomingAsk } from "./spare-requests";
import { loadIncomingOffers, offerAsAsk, type IncomingOffer } from "./spare-offers";
import { spareGrantDetailsQuery } from "./spares";

/**
 * The FEED kinds the section draws, in the order they wait on the reader. Friend requests (friend links R1) are not a feed
 * kind: they are read from their own table, lead the section, and mark seen through `markFriendRequestsSeen`.
 */
export const WAITING_ON_YOU_KINDS: readonly FeedKind[] = ["spare-request", "trade-match"];

/**
 * A spare request waiting on the reader's Yes or No; `key` is the request's own id. An OFFER made to the reader (You have it)
 * is the same row turned around: `ask` carries the offerer as `asker`, the copies they put up as `spare` and `copies`, and
 * `offer` says what the reader wants of the card; the answer goes to `answerOfferAction`, not the ask's.
 */
export type SpareRequestRow = { key: string; kind: "spare-request"; createdAt: Date; unseen: true; ask: IncomingAsk; offer?: { want: number } };

/** An incoming offer as the row's `ask`: id, card, face and days are the same; the spare count is what the offerer puts up. */
export function offerRow(o: IncomingOffer): SpareRequestRow {
  const ask = offerAsAsk(o);
  return { key: o.id, kind: "spare-request", createdAt: o.createdAt, unseen: true, ask, offer: { want: o.want } };
}

/** A friend request waiting on the reader's Accept or Decline (friend links R1, F1 to F4); `key` names the requester. */
export type FriendRequestRow = { key: string; kind: "friend-request"; createdAt: Date; unseen: boolean; request: IncomingFriendRequest };

export type WaitingRow = FriendRequestRow | SpareRequestRow | TradeMatchRow;

export type TradeMatchRow = {
  key: string;
  kind: "trade-match";
  createdAt: Date;
  /** Newer than the reader's last `/friends` visit. */
  unseen: boolean;
  card: { oracleId: string; name: string; imageUri: string | null };
  friend: { publicId: string; displayName: ThirdPartyName; commander: ProfileCommander | null };
  /** The pods the friend's share reaches the reader through, in name order. */
  pods: ThirdPartyName[];
  /**
   * True on a single match (the link opens the card's spares sheet with Ask); false on a rolled row, whose press goes to
   * the friend's spares with no card named.
   */
  askable: boolean;
  /**
   * Set when this row stands for the friend's matches on one reader-day (Cart on your wishlist Q1, Home's fold,
   * `rollTradeMatches`): every member's key (the ✕ dismisses them all) and card, newest first. `card` is the first.
   */
  rollup?: { keys: string[]; cards: TradeMatchRow["card"][] };
};

/** The section's rows, waiting kinds first and newest within; empty while every kind it draws is off for the reader. */
export async function loadWaitingOnYou(viewerId: string, env: NodeJS.ProcessEnv, now: Date): Promise<WaitingRow[]> {
  const [asks, offers, matches, friendAsks] = await Promise.all([
    loadIncomingAsks(viewerId, env, now),
    loadIncomingOffers(viewerId, now),
    loadTradeMatchRows(viewerId, env, now),
    loadIncomingFriendRequests(viewerId, env),
  ]);
  const requests = asks.map((ask): SpareRequestRow => ({ key: ask.id, kind: "spare-request", createdAt: ask.createdAt, unseen: true, ask }));
  // Friend requests first, newest first (call 1), then the spare requests and trade matches in the feed's order.
  const friends = friendAsks.map((request): FriendRequestRow => ({
    key: `friend:${request.requester.publicId}`, kind: "friend-request", createdAt: request.sentAt, unseen: request.unseen, request,
  }));
  return [...friends, ...[...requests, ...offers.map(offerRow), ...matches].sort(feedOrder)];
}

/**
 * The trade matches, from the feed's read with `friends_seen_at` as the cursor, each friend's matches on one reader-day
 * folded into one row as Home folds them (`foldTradeMatchRows`, #3441).
 */
async function loadTradeMatchRows(viewerId: string, env: NodeJS.ProcessEnv, now: Date): Promise<TradeMatchRow[]> {
  const kinds = availableFeedKinds(env).filter((k) => k === "trade-match");
  const query = feedQuery(viewerId, kinds, now, "friends_seen_at");
  if (!query) return [];
  const items = ((await db.execute(query)).rows as Parameters<typeof toFeedItem>[0][]).map(toFeedItem).sort(feedOrder);
  const matches = items.flatMap((i) => (i.kind === "trade-match" && i.oracleId && i.friend ? [{ ...i, oracleId: i.oracleId, friend: i.friend }] : []));
  if (matches.length === 0) return [];
  const [grants, info, zone] = await Promise.all([
    spareGrantDetailsQuery(viewerId),
    db.select({ oracleId: cards.oracleId, name: cards.name, imageUri: cards.imageUri }).from(cards)
      .where(inArray(cards.oracleId, [...new Set(matches.map((m) => m.oracleId))])),
    readerZone(viewerId),
  ]);
  const grantOf = new Map(grants.map((g) => [g.publicId, g]));
  const cardOf = new Map(info.map((c) => [c.oracleId, c]));
  return foldTradeMatchRows(matches.flatMap((m) => {
    const grant = grantOf.get(m.friend.publicId);
    const card = cardOf.get(m.oracleId);
    if (!grant || !card) return [];
    return [{
      key: m.key,
      kind: "trade-match" as const,
      createdAt: m.createdAt,
      unseen: m.unseen,
      card,
      friend: { publicId: grant.publicId, displayName: named(grant.displayName), commander: toCommander(grant) },
      pods: grant.pods.map((pod) => named(pod)),
      askable: true,
    }];
  }), rollZone(zone));
}

/**
 * Each friend's matches on one reader-day folded into the first of them in the rows' order (the newest): unseen when
 * any member is, not askable, `rollup` carrying every member's key and card. A group of one is left as it was. The
 * twin of `rollTradeMatches`, on the same group (`rollGroup`) and fold (`foldGroups`), so this list, Home and both badges fold alike. Pure.
 */
export function foldTradeMatchRows(rows: readonly TradeMatchRow[], zone: string): TradeMatchRow[] {
  return foldGroups(rows, (r) => rollGroup(r.friend.publicId, r.createdAt, zone), (members) => ({
    ...members[0],
    unseen: members.some((m) => m.unseen),
    askable: false,
    rollup: { keys: members.map((m) => m.key), cards: members.map((m) => m.card) },
  }));
}
