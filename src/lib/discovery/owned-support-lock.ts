import { sql } from "drizzle-orm";

/**
 * The per-reader lock every writer of `owned_support_counts` / `owned_support_stamps` takes inside its
 * transaction: the store's refresh, and the account purge, so a refresh already under way cannot put a
 * deleted account's rows back after the purge commits.
 */
export function ownedSupportLock(userId: string) {
  return sql`select pg_advisory_xact_lock(hashtext(${`owned-support:${userId}`}))`;
}
