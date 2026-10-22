/**
 * The outbox's rows as push items (plan D1): each (kind, item key) is read through the feed's own pieces, so a push says
 * exactly what Home says. An item that no longer STANDS (a withdrawn offer, an answered ask, an unfriended friend), whose
 * card is gone or that lacks a part of its words, comes back DROPPED, and the caller abandons it.
 */
import { db } from "../../db";
import { lookups, toViews } from "../feed/home";
import { toFeedItem, type FeedRow } from "../feed/read";
import type { StoredKind } from "../feed/kinds";
import { storedItemsByKeyQuery } from "../social/feed-items";
import type { PushItem } from "./message";
import { toPushItem } from "./to-push-item";

export type OutboxRef = { kind: StoredKind; key: string; batch: string };

type Q = Pick<typeof db, "execute">;

export async function resolvePushItems(
  userId: string, refs: readonly OutboxRef[], env: NodeJS.ProcessEnv, now: Date, q: Q = db,
): Promise<{ items: PushItem[]; dropped: OutboxRef[] }> {
  const query = storedItemsByKeyQuery(userId, refs, now);
  if (!query) return { items: [], dropped: [] };
  const { rows } = await q.execute<FeedRow>(query);
  const found = (rows as FeedRow[]).map(toFeedItem);
  const views = toViews(found, await lookups(userId, found, q, env));
  const byKey = new Map(views.map((v) => [`${v.kind}\u0000${v.key}`, v]));
  const items: PushItem[] = [];
  const dropped: OutboxRef[] = [];
  for (const ref of refs) {
    const view = byKey.get(`${ref.kind}\u0000${ref.key}`);
    const item = view ? toPushItem(view, ref.batch) : null;
    if (item) items.push(item);
    else dropped.push(ref);
  }
  return { items, dropped };
}
