/**
 * The outbox's rows as push items (plan D1): each (kind, item key) is read through the feed's own pieces, so a push says
 * exactly what Home says. An item that no longer STANDS (a withdrawn offer, an answered ask, an unfriended friend), whose
 * card is gone or that lacks a part of its words, comes back DROPPED, and the caller abandons it. A catalog kind's key (a new
 * set or precon, PR 3c) is read through the feed's own catalog branch (`catalogItemsByKeyQuery`): a set or precon the feed no
 * longer lists is dropped the same way.
 */
import { db } from "../../db";
import { lookups, toViews } from "../feed/home";
import { toFeedItem, type FeedRow } from "../feed/read";
import { isStoredKind, type CatalogKind, type FeedKind, type StoredKind } from "../feed/kinds";
import { storedItemsByKeyQuery } from "../social/feed-items";
import { catalogItemsByKeyQuery } from "./catalog";
import type { PushItem } from "./message";
import { toPushItem } from "./to-push-item";

export type OutboxRef = { kind: FeedKind; key: string; batch: string };

type Q = Pick<typeof db, "execute">;

export async function resolvePushItems(
  userId: string, refs: readonly OutboxRef[], env: NodeJS.ProcessEnv, now: Date, q: Q = db,
): Promise<{ items: PushItem[]; dropped: OutboxRef[] }> {
  const stored = refs.flatMap((r) => (isStoredKind(r.kind) ? [{ kind: r.kind as StoredKind, key: r.key }] : []));
  const catalog = refs.flatMap((r) => (isStoredKind(r.kind) ? [] : [{ kind: r.kind as CatalogKind, key: r.key }]));
  const queries = [storedItemsByKeyQuery(userId, stored, now), catalogItemsByKeyQuery(userId, catalog, now)].filter((x) => x !== null);
  if (queries.length === 0) return { items: [], dropped: [...refs] };
  const found = (await Promise.all(queries.map((query) => q.execute<FeedRow>(query)))).flatMap(({ rows }) => (rows as FeedRow[]).map(toFeedItem));
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
