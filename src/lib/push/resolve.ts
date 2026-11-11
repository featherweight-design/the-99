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
import { wizardsOutRoute } from "./wizards-out";
import { validTimeZone } from "../time/zoned";
import { parseSaleKey, saleItemsQuery } from "./sale";
import type { PushItem } from "./message";
import { tableIdOfSeatKey } from "./seat";
import { seatPushItem, toPushItem } from "./to-push-item";

/** A feed kind's ref, or the seat notice's (not a feed kind). */
export type OutboxRef = { kind: FeedKind | typeof SEAT_PUSH_KIND; key: string; batch: string };

type Q = Pick<typeof db, "execute" | "select" | "selectDistinct">;

type SaleRow = { due: boolean; id: string; title: string; image: string | null; on_sale_at: string | Date; pre_queue_at: string | Date | null; zone: string | null };

export async function resolvePushItems(
  userId: string, refs: readonly OutboxRef[], env: NodeJS.ProcessEnv, now: Date, q: Q = db,
): Promise<{ items: PushItem[]; dropped: OutboxRef[] }> {
  // The seat notices are not feed items: their own read, through the reader's seat (an unseen notice at a table still open).
  const seats = refs.filter((r) => r.kind === SEAT_PUSH_KIND);
  // A drop's sale push is its own row of the `secret-lair` kind (`sale:<id>`), read from the post alone, not through the feed.
  const isSale = (r: OutboxRef) => r.kind === "secret-lair" && parseSaleKey(r.key) !== null;
  const sales = refs.filter(isSale);
  const feedRefs = refs.filter((r) => r.kind !== SEAT_PUSH_KIND && !isSale(r));
  const stored = feedRefs.flatMap((r) => (isStoredKind(r.kind) ? [{ kind: r.kind as StoredKind, key: r.key }] : []));
  const catalog = feedRefs.flatMap((r) => (isStoredKind(r.kind) ? [] : [{ kind: r.kind as CatalogKind, key: r.key }]));
  const queries = [storedItemsByKeyQuery(userId, stored, now), catalogItemsByKeyQuery(userId, catalog, now)].filter((x) => x !== null);
  const found = (await Promise.all(queries.map((query) => q.execute<FeedRow>(query)))).flatMap(({ rows }) => (rows as FeedRow[]).map(toFeedItem));
  const views = queries.length === 0 ? [] : toViews(found, await lookups(userId, found, q, env));
  const byKey = new Map(views.map((v) => [`${v.kind}\u0000${v.key}`, v]));
  const tableIds = seats.flatMap((r) => { const id = tableIdOfSeatKey(r.key); return isUuid(id) ? [id] : []; });
  const notices = new Map((await unseenSeatNotices(userId, tableIds, q)).map((n) => [n.tableId, n]));
  const saleIds = sales.flatMap((r) => { const id = parseSaleKey(r.key); return id === null ? [] : [id]; });
  const saleRows = saleIds.length === 0 ? [] : ((await q.execute<SaleRow>(saleItemsQuery(saleIds, now))).rows as SaleRow[]);
  const saleById = new Map(saleRows.map((s) => [s.id, s]));
  const items: PushItem[] = [];
  const dropped: OutboxRef[] = [];
  for (const ref of refs) {
    if (isSale(ref)) {
      const id = parseSaleKey(ref.key);
      const sale = id === null ? undefined : saleById.get(id);
      const href = id === null ? null : wizardsOutRoute("secret-lair", `post:${id}`);
      if (!sale || !sale.on_sale_at || !sale.zone || !href) { dropped.push(ref); continue; }
      // An edit moved the send instant later than now: the row waits, neither sent nor dropped (see `saleItemsQuery`).
      if (!sale.due) continue;
      // A zone the runtime does not know, or a time that is not one: this one row is dropped, never the reader's whole flush.
      const onSaleAt = new Date(sale.on_sale_at);
      const preQueueAt = sale.pre_queue_at ? new Date(sale.pre_queue_at) : null;
      if (!validTimeZone(sale.zone) || Number.isNaN(onSaleAt.getTime()) || (preQueueAt && Number.isNaN(preQueueAt.getTime()))) { dropped.push(ref); continue; }
      items.push({ kind: "secret-lair", sale: true, key: ref.key, batch: ref.batch, title: sale.title, onSaleAt, preQueueAt, zone: sale.zone, image: sale.image, href });
      continue;
    }
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
