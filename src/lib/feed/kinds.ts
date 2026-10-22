/**
 * The news feed's kinds (menu and Home, handoff calls 6 to 8, G1; plan `2026-10-22-menu-home.md`, "The feed model").
 * A CLOSED set: `user_prefs.feed_kinds` keys, a stored item's kind (by constraint) and Settings' checkboxes are all
 * checked against it.
 *
 * Two families:
 * - CATALOG kinds (`new-set`, `new-precon`) are READ, never written: they come from `catalog_first_seen` at read
 *   time (`read.ts`), so no ingest fans out per account under the `catalog-ingest` lock.
 * - STORED kinds persist as stored items, written by the job that knows the event (`recordFeedItem`, `lib/social/feed-write.ts`).
 *
 * Client-safe: no imports.
 */
export const FEED_KINDS = ["new-set", "new-precon", "price-drop", "trade-match", "spare-request", "combo"] as const;

export type FeedKind = (typeof FEED_KINDS)[number];

export const CATALOG_KINDS = ["new-set", "new-precon"] as const satisfies readonly FeedKind[];
export type CatalogKind = (typeof CATALOG_KINDS)[number];

export const STORED_KINDS = ["price-drop", "trade-match", "spare-request", "combo"] as const satisfies readonly FeedKind[];
export type StoredKind = (typeof STORED_KINDS)[number];

const KIND_SET = new Set<string>(FEED_KINDS);
const STORED_SET = new Set<string>(STORED_KINDS);

export const isFeedKind = (k: unknown): k is FeedKind => typeof k === "string" && KIND_SET.has(k);
export const isStoredKind = (k: unknown): k is StoredKind => typeof k === "string" && STORED_SET.has(k);

/**
 * The lead story's order (Feed-Kinds board, Rules): the first UNSEEN item by this order leads Home, waiting on
 * you first. Every kind appears exactly once.
 */
export const LEAD_PRIORITY: readonly FeedKind[] = ["spare-request", "trade-match", "combo", "price-drop", "new-precon", "new-set"];

/** How long an item stays in the feed (the board: "Fourteen days kept"). */
export const FEED_WINDOW_DAYS = 14;

/**
 * The kinds that wait on the reader's answer: they sort ahead of everything newer ("Order: waiting on you
 * first, then newest").
 */
export const WAITING_KINDS: readonly FeedKind[] = ["spare-request"];

/** The lead story: the first unseen item by `LEAD_PRIORITY`, newest first within a kind; null when nothing is unseen. */
export function leadStory<T extends { kind: FeedKind; unseen: boolean; createdAt: Date }>(items: readonly T[]): T | null {
  let best: T | null = null;
  for (const item of items) {
    if (!item.unseen) continue;
    if (!best) {
      best = item;
      continue;
    }
    const a = LEAD_PRIORITY.indexOf(item.kind);
    const b = LEAD_PRIORITY.indexOf(best.kind);
    if (a < b || (a === b && item.createdAt.getTime() > best.createdAt.getTime())) best = item;
  }
  return best;
}

/** The feed's order: waiting on you first, then newest, then by key so equal times never shuffle. */
export function feedOrder<T extends { kind: FeedKind; createdAt: Date; key: string }>(a: T, b: T): number {
  const wa = WAITING_KINDS.includes(a.kind) ? 0 : 1;
  const wb = WAITING_KINDS.includes(b.kind) ? 0 : 1;
  if (wa !== wb) return wa - wb;
  const t = b.createdAt.getTime() - a.createdAt.getTime();
  if (t !== 0) return t;
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}

/** Unseen: created after the reader last saw Home's feed. Never seen (null) is every item unseen. */
export const isUnseen = (createdAt: Date, seenAt: Date | null): boolean => seenAt === null || createdAt.getTime() > seenAt.getTime();

/** The window's floor: an item at or before it has left the feed. */
export const windowFloor = (now: Date): Date => new Date(now.getTime() - FEED_WINDOW_DAYS * 86_400_000);
