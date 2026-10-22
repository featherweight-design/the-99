/**
 * `/friends`' Waiting on you (menu and Home PR 7; board `Friends`, 2a to 2c): the feed's friend items, read for the
 * friends page. Today that is the trade match ("Colin has a spare Ghalta"); a spare request joins it with G5.
 *
 * The rows come from the feed's own read (`feedQuery`), which re-joins the live spares grant on every read, so an
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
import { feedOrder, type FeedKind } from "../feed/kinds";
import { toCommander, type ProfileCommander } from "./commander";
import { spareGrantDetailsQuery } from "./spares";

/** The kinds the section draws, in the order they wait on the reader. */
export const WAITING_ON_YOU_KINDS: readonly FeedKind[] = ["trade-match"];

export type WaitingRow = {
  key: string;
  kind: "trade-match";
  createdAt: Date;
  /** Newer than the reader's last `/friends` visit. */
  unseen: boolean;
  card: { oracleId: string; name: string; imageUri: string | null };
  friend: { publicId: string; displayName: string; commander: ProfileCommander | null };
  /** The pods the friend's share reaches the reader through, in name order. */
  pods: string[];
};

/** The section's rows, newest first; empty while every kind it draws is off for the reader. */
export async function loadWaitingOnYou(viewerId: string, env: NodeJS.ProcessEnv, now: Date): Promise<WaitingRow[]> {
  const kinds = availableFeedKinds(env).filter((k) => WAITING_ON_YOU_KINDS.includes(k));
  const query = feedQuery(viewerId, kinds, now, "friends_seen_at");
  if (!query) return [];
  const items = ((await db.execute(query)).rows as Parameters<typeof toFeedItem>[0][]).map(toFeedItem).sort(feedOrder);
  const matches = items.flatMap((i) => (i.kind === "trade-match" && i.oracleId && i.friend ? [{ ...i, oracleId: i.oracleId, friend: i.friend }] : []));
  if (matches.length === 0) return [];
  const [grants, info] = await Promise.all([
    spareGrantDetailsQuery(viewerId),
    db.select({ oracleId: cards.oracleId, name: cards.name, imageUri: cards.imageUri }).from(cards)
      .where(inArray(cards.oracleId, [...new Set(matches.map((m) => m.oracleId))])),
  ]);
  const grantOf = new Map(grants.map((g) => [g.publicId, g]));
  const cardOf = new Map(info.map((c) => [c.oracleId, c]));
  return matches.flatMap((m) => {
    const grant = grantOf.get(m.friend.publicId);
    const card = cardOf.get(m.oracleId);
    if (!grant || !card) return [];
    return [{
      key: m.key,
      kind: "trade-match" as const,
      createdAt: m.createdAt,
      unseen: m.unseen,
      card,
      friend: { publicId: grant.publicId, displayName: grant.displayName, commander: toCommander(grant) },
      pods: grant.pods,
    }];
  });
}
