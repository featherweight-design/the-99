/**
 * The account purge (Hugh's ruling Q8, 2026-10-12): when a player deletes their account, every row the app
 * holds for them goes, in ONE transaction, so a failure part-way leaves the account whole rather than half
 * deleted. It is the app's first delete-a-user path. The Clerk `user.deleted` webhook
 * (`src/app/api/clerk-webhook/route.ts`) is its only caller.
 *
 * - Social first (`purgeSocialIn`): pods are left the way a player leaves them, so a pod the account owned
 *   passes to its longest-standing member; then both directions of every friendship, every invite naming
 *   the account, and the profile.
 * - Then every other table owning a row by `user_id`, in `PURGE_ORDER`. Tables reached only through a deck,
 *   a version or a run go with their parent by `on delete cascade`; the coverage test
 *   (`purge.test.ts`) fails when a new table is neither listed here nor cascaded from one that is.
 * - `user_data_stamps` last. Its triggers are deferred to commit, so they would write the stamp row back
 *   after it was deleted; `set constraints all immediate` fires them first (and moves each friend's stamp),
 *   then the account's own stamp row is deleted.
 *
 * Kept on purpose: `admin_events` rows the account ACTED in (`actor_id`, the admin's own audit trail) and
 * `admin_settings.updated_by`. Rows ABOUT the account (`admin_events.user_id`) go.
 *
 * Idempotent: an account with no rows purges to all zeros, so a retried webhook is harmless.
 */
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { purgeSocialIn, type SocialPurge } from "../social/purge";

/**
 * Every non-social table holding a row by `user_id`, in delete order. Rows that point at `model_calls`
 * (no `on delete`) go before it; `decks` goes before `deck_folders` only for tidiness (`folder_id` sets null).
 */
export const PURGE_ORDER = [
  "deck_token_joins", "token_ownership", "token_reads",
  "card_assignments", "pull_releases",
  "deck_suggestion_runs", "deck_synopses", "intake_reads", "intake_read_stops", "fits_reads",
  "deck_games", "deck_notes", "deck_profiles", "mana_trade_applies", "deck_tool_counts", "deck_swaps",
  "decks", "deck_folders",
  "collection_history", "collection_items", "card_art_preferences", "commander_scores", "csv_uploads", "user_prefs",
  "model_calls",
  "admin_events",
] as const;

export type PurgeReport = { social: SocialPurge; rows: Record<string, number>; stamp: number };

export async function purgeAccount(userId: string): Promise<PurgeReport> {
  if (typeof userId !== "string" || userId.length === 0) throw new Error("purgeAccount: no user id");
  return db.transaction(async (tx) => {
    const social = await purgeSocialIn(tx, userId);
    const rows: Record<string, number> = {};
    for (const table of PURGE_ORDER) {
      const done = await tx.execute(sql`delete from ${sql.identifier(table)} where user_id = ${userId}`);
      rows[table] = done.rowCount ?? 0;
    }
    // Fire every deferred stamp trigger now, so none writes this account's stamp back at commit.
    await tx.execute(sql`set constraints all immediate`);
    const stamp = await tx.execute(sql`delete from user_data_stamps where user_id = ${userId}`);
    return { social, rows, stamp: stamp.rowCount ?? 0 };
  });
}
