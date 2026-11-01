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
import { isStoredKind, SEAT_PUSH_KIND, type CatalogKind, type FeedKind, type StoredKind } from "../feed/kinds";
import { storedItemsByKeyQuery } from "../social/feed-items";
import { unseenSeatNotices } from "../social/rule-zero-notice";
import { isUuid } from "../social/rules";
import { catalogItemsByKeyQuery } from "./catalog";
import type { PushItem } from "./message";
import { tableIdOfSeatKey } from "./seat";
import { seatPushItem, toPushItem } from "./to-push-item";

/** A feed kind's ref, or the seat notice's (not a feed kind). */
export type OutboxRef = { kind: FeedKind | typeof SEAT_PUSH_KIND; key: string; batch: string };

type Q = Pick<typeof db, "execute">;

export async function resolvePushItems(
  userId: string, refs: readonly OutboxRef[], env: NodeJS.ProcessEnv, now: Date, q: Q = db,
): Promise<{ items: PushItem[]; dropped: OutboxRef[] }> {
  // The seat notices are not feed items: their own read, through the reader's seat (an unseen notice at a table still open).
  const seats = refs.filter((r) => r.kind === SEAT_PUSH_KIND);
  const feedRefs = refs.filter((r) => r.kind !== SEAT_PUSH_KIND);
  const stored = feedRefs.flatMap((r) => (isStoredKind(r.kind) ? [{ kind: r.kind as StoredKind, key: r.key }] : []));
  const catalog = feedRefs.flatMap((r) => (isStoredKind(r.kind) ? [] : [{ kind: r.kind as CatalogKind, key: r.key }]));
  const queries = [storedItemsByKeyQuery(userId, stored, now), catalogItemsByKeyQuery(userId, catalog, now)].filter((x) => x !== null);
  const found = (await Promise.all(queries.map((query) => q.execute<FeedRow>(query)))).flatMap(({ rows }) => (rows as FeedRow[]).map(toFeedItem));
  const views = queries.length === 0 ? [] : toViews(found, await lookups(userId, found, q, env));
  const byKey = new Map(views.map((v) => [`${v.kind}\u0000${v.key}`, v]));
  const tableIds = seats.flatMap((r) => { const id = tableIdOfSeatKey(r.key); return isUuid(id) ? [id] : []; });
  const notices = new Map((await unseenSeatNotices(userId, tableIds)).map((n) => [n.tableId, n]));
  const items: PushItem[] = [];
  const dropped: OutboxRef[] = [];
  for (const ref of refs) {
    if (ref.kind === SEAT_PUSH_KIND) {
      const tableId = tableIdOfSeatKey(ref.key);
      const notice = isUuid(tableId) ? notices.get(tableId) : undefined;
      if (notice) items.push(seatPushItem(notice, ref.key, ref.batch));
      else dropped.push(ref);
      continue;
    }
    const view = byKey.get(`${ref.kind}\u0000${ref.key}`);
    const item = view ? toPushItem(view, ref.batch) : null;
    if (item) items.push(item);
    else dropped.push(ref);
  }
  return { items, dropped };
}
