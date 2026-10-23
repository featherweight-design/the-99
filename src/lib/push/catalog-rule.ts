/**
 * The catalog kinds' push rules (plan `2026-10-22-push.md`, D2 as amended; PR 3c). Pure: no database.
 *
 * A new set or precon has no per-reader row (`catalog_first_seen`), so the cron flush queues its outbox rows itself
 * (`catalog.ts`). The row's `item_key` is the FEED's own key for the item (`set:<code>`, `precon:<file name>`, built by
 * `catalogBranch` in `lib/feed/read.ts`), so a push names exactly what Home lists and the landing's keys match Home's.
 */
import { availableFeedKinds } from "../feed/flag";
import { CATALOG_KINDS, type CatalogKind } from "../feed/kinds";
import { pushEnabled } from "./flag";

const PREFIX: Record<CatalogKind, string> = { "new-set": "set:", "new-precon": "precon:" };

/** The feed's key for a set (by code) or a precon (by file name). The SQL twin is `catalogBranch`'s `key` column. */
export const catalogKey = (kind: CatalogKind, id: string): string => `${PREFIX[kind]}${id}`;

/** The set code or precon file name a key of this kind names, or null when it is not a key of this kind (or names nothing). */
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
  return CATALOG_KINDS.filter((k) => available.includes(k));
}
