/**
 * The catalog kinds' push rules (plan `2026-10-22-push.md`, D2 as amended; PR 3c). Pure: no database.
 *
 * A new set or precon has no per-reader row (`catalog_first_seen`), so the cron flush queues its outbox rows itself
 * (`catalog.ts`). The row's `item_key` is the FEED's own key for the item (`set:<code>`, `precon:<file name>`, built by
 * `catalogBranch` in `lib/feed/read.ts`), so a push names exactly what Home lists and the landing's keys match Home's.
 */
import { availableFeedKinds } from "../feed/flag";
import { isAnnouncementKind, type CatalogKind, type FeedKind } from "../feed/kinds";
import { pushEnabled } from "./flag";

const PREFIX: Record<CatalogKind, string> = {
  "new-set": "set:",
  "new-precon": "precon:",
  "secret-lair": "post:",
  "commander-decklists": "post:",
  "wizards-news": "post:",
};

/**
 * The catalog kinds that push today. Wizards' posts are read on Home but not yet pushed: their message and the landing
 * that leaves the app for the post come in Announcements UI 3b, which lifts this filter. Until then nothing queues them,
 * and Settings offers no push box for them (`pushableFeedKinds`).
 */
export const PUSH_CATALOG_KINDS = ["new-set", "new-precon"] as const satisfies readonly CatalogKind[];

/** The kinds a reader may tick under Push in Settings: the available kinds, less Wizards' posts until UI 3b. */
export function pushableFeedKinds(env: NodeJS.ProcessEnv): FeedKind[] {
  return availableFeedKinds(env).filter((k) => !isAnnouncementKind(k));
}

/** The feed's key for a set (by code), a precon (by file name) or a Wizards post (by Contentful id). The SQL twin is `catalogBranch`'s `key` column. */
export const catalogKey = (kind: CatalogKind, id: string): string => `${PREFIX[kind]}${id}`;

/** The set code, precon file name or Wizards post (Contentful) id a key of this kind names, or null when it is not a key of this kind (or names nothing). */
export function parseCatalogKey(kind: CatalogKind, key: string): string | null {
  const prefix = PREFIX[kind];
  if (!key.startsWith(prefix)) return null;
  const id = key.slice(prefix.length);
  return id.length > 0 ? id : null;
}

/**
 * One UTC day's arrivals of a kind share a batch, so the precons one refresh brings are ONE push ("2 new precons are
 * out"). The day is the flush's, the run that queues them: one refresh's arrivals are queued by one run.
 */
export const catalogBatchKey = (kind: CatalogKind, now: Date): string => `${kind}:${now.toISOString().slice(0, 10)}`;

/** The catalog kinds this reader's switches allow pushing: push on, and the kind available to them (a precon needs Precons). */
export function catalogPushKinds(env: NodeJS.ProcessEnv): CatalogKind[] {
  if (!pushEnabled(env)) return [];
  const available = availableFeedKinds(env);
  return PUSH_CATALOG_KINDS.filter((k) => available.includes(k));
}
