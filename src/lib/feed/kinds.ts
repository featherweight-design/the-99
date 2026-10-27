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

/**
 * The kinds ON for a reader who never chose (spare requests G4): "a friend wants your spare" waits on the reader's
 * answer, so it is heard of by default. A default-on kind is on while it is stamped in `feed_kinds` or absent from both
 * `feed_kinds` and `feed_kinds_declined`; turned off, it moves to `feed_kinds_declined`. Every other kind starts off.
 */
export const DEFAULT_ON_KINDS = ["spare-request"] as const satisfies readonly StoredKind[];
export const isDefaultOn = (k: FeedKind): boolean => (DEFAULT_ON_KINDS as readonly FeedKind[]).includes(k);

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

/**
 * An item of a waiting kind that waits on nothing: the answer to the reader's OWN spare request (`answer` set, the
 * `answerOf` marker). It reads as an ordinary item, newest first, and never leads (the board draws it as a row).
 */
type MaybeAnswer = { answer?: string | null };
const waits = (i: { kind: FeedKind } & MaybeAnswer): boolean => WAITING_KINDS.includes(i.kind) && !i.answer;

/**
 * The lead story: the first unseen item by `LEAD_PRIORITY`, newest first within a kind; null when nothing is unseen.
 * An answer item never leads.
 */
export function leadStory<T extends { kind: FeedKind; unseen: boolean; createdAt: Date } & MaybeAnswer>(items: readonly T[]): T | null {
  let best: T | null = null;
  for (const item of items) {
    if (!item.unseen || item.answer) continue;
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
export function feedOrder<T extends { kind: FeedKind; createdAt: Date; key: string } & MaybeAnswer>(a: T, b: T): number {
  const wa = waits(a) ? 0 : 1;
  const wb = waits(b) ? 0 : 1;
  if (wa !== wb) return wa - wb;
  const t = b.createdAt.getTime() - a.createdAt.getTime();
  if (t !== 0) return t;
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}

/** Unseen: created after the reader last saw Home's feed. Never seen (null) is every item unseen. */
export const isUnseen = (createdAt: Date, seenAt: Date | null): boolean => seenAt === null || createdAt.getTime() > seenAt.getTime();

/** The window's floor: an item at or before it has left the feed. */
export const windowFloor = (now: Date): Date => new Date(now.getTime() - FEED_WINDOW_DAYS * 86_400_000);
