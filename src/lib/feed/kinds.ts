/**
 * The news feed's kinds (menu and Home, handoff calls 6 to 8, G1; plan `2026-10-22-menu-home.md`, "The feed model").
 * A CLOSED set: `user_prefs.feed_kinds` keys, a stored item's kind (by constraint) and Settings' checkboxes are all
 * checked against it.
 *
 * Two families:
 * - CATALOG kinds are READ, never written: `new-set` and `new-precon` come from `catalog_first_seen` and the
 *   Announcements kinds from `wizards_announcements`, at read time (`read.ts`), so no ingest fans out per account.
 * - STORED kinds persist as stored items, written by the job that knows the event (`recordFeedItem`, `lib/social/feed-write.ts`).
 *
 * Client-safe: no imports.
 */
/**
 * The Announcements kinds (handoff `design_handoff_the99_announcements`): Wizards' own posts, one row per post in
 * `wizards_announcements` (its `kind` column holds exactly these keys) and nothing per account, so they are CATALOG
 * family, read at read time like `new-set`, and default on. `wizards-news` is the classifier's "Other" (the boards'
 * `wizards-other`: the key shipped in migration 0193 stands).
 */
export const ANNOUNCEMENT_KINDS = ["secret-lair", "commander-decklists", "wizards-news"] as const;
export type AnnouncementFeedKind = (typeof ANNOUNCEMENT_KINDS)[number];

/** In Settings' order: the three Announcements kinds sit after New precons (handoff README, call 7). */
export const FEED_KINDS = ["new-set", "new-precon", ...ANNOUNCEMENT_KINDS, "price-drop", "trade-match", "spare-request", "combo"] as const;

export type FeedKind = (typeof FEED_KINDS)[number];

export const CATALOG_KINDS = ["new-set", "new-precon", ...ANNOUNCEMENT_KINDS] as const satisfies readonly FeedKind[];
export type CatalogKind = (typeof CATALOG_KINDS)[number];

export const STORED_KINDS = ["price-drop", "trade-match", "spare-request", "combo"] as const satisfies readonly FeedKind[];
export type StoredKind = (typeof STORED_KINDS)[number];

const ANNOUNCEMENT_SET = new Set<string>(ANNOUNCEMENT_KINDS);
export const isAnnouncementKind = (k: unknown): k is AnnouncementFeedKind => typeof k === "string" && ANNOUNCEMENT_SET.has(k);

/**
 * Every kind a `push_outbox` row may carry (its `push_outbox_kind_check`): every feed kind. Spelled in the order the
 * constraint was generated in (migration 0193), so the schema renders the same check and no migration follows.
 */
export const PUSH_OUTBOX_KINDS = ["new-set", "new-precon", "price-drop", "trade-match", "spare-request", "combo", ...ANNOUNCEMENT_KINDS] as const satisfies readonly FeedKind[];

/**
 * The kinds ON for a reader who never chose (spare requests G4): "a friend wants your spare" waits on the reader's
 * answer, so it is heard of by default, and Wizards' own announcements start on (handoff README, call 7). A default-on kind is on while it is stamped in `feed_kinds` or absent from both
 * `feed_kinds` and `feed_kinds_declined`; turned off, it moves to `feed_kinds_declined`. Every other kind starts off.
 */
export const DEFAULT_ON_KINDS = ["spare-request", ...ANNOUNCEMENT_KINDS] as const satisfies readonly FeedKind[];
export const isDefaultOn = (k: FeedKind): boolean => (DEFAULT_ON_KINDS as readonly FeedKind[]).includes(k);

const KIND_SET = new Set<string>(FEED_KINDS);
const STORED_SET = new Set<string>(STORED_KINDS);

export const isFeedKind = (k: unknown): k is FeedKind => typeof k === "string" && KIND_SET.has(k);
export const isStoredKind = (k: unknown): k is StoredKind => typeof k === "string" && STORED_SET.has(k);

/**
 * The lead story's order (Feed-Kinds board, Rules; Announcements call 2): the first UNSEEN item by this order leads
 * Home, waiting on you first. Every kind appears exactly once here or in `NEVER_LEADS`.
 */
export const LEAD_PRIORITY: readonly FeedKind[] = [
  "spare-request", "trade-match", "combo", "price-drop", "commander-decklists", "new-precon", "new-set", "secret-lair",
];

/** The kinds that are only ever a row (Announcements call 2: Wizards news never leads). */
export const NEVER_LEADS: readonly FeedKind[] = ["wizards-news"];

/** A kind's place in `LEAD_PRIORITY`; a kind missing from it sorts LAST, never first (`indexOf`'s -1 would be best). */
const leadRank = (k: FeedKind): number => {
  const i = LEAD_PRIORITY.indexOf(k);
  return i === -1 ? Infinity : i;
};

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
 * An answer item never leads, nor a kind in `NEVER_LEADS`.
 */
export function leadStory<T extends { kind: FeedKind; unseen: boolean; createdAt: Date } & MaybeAnswer>(items: readonly T[]): T | null {
  let best: T | null = null;
  for (const item of items) {
    if (!item.unseen || item.answer || NEVER_LEADS.includes(item.kind)) continue;
    if (!best) {
      best = item;
      continue;
    }
    const a = leadRank(item.kind);
    const b = leadRank(best.kind);
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
