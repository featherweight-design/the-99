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
 * Kept on purpose: what an ADMIN did, which is the admin's own audit trail: `admin_events.actor_id`,
 * `admin_settings.updated_by`, `flag_groups.created_by`, and the `added_by` / `updated_by` of the flag rows.
 * Rows ABOUT the account go: `admin_events.user_id`, its own switch overrides (`flag_overrides.user_id`) and its
 * group memberships (`flag_group_members.user_id`).
 *
 * Idempotent: an account with no rows purges to all zeros, so a retried webhook is harmless.
 */
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { purgeSocialIn, type SocialPurge } from "../social/purge";
import { ownedSupportLock } from "../discovery/owned-support-lock";

/**
 * Every non-social table holding a row by `user_id`, in delete order. Rows that point at `model_calls`
 * (no `on delete`) go before it, and `model_calls` before the `credit_grants` its rows name. Unspent paid
 * credits are forfeited with the account (Hugh, Q7, 2026-10-13); `decks` goes before `deck_folders` only for tidiness (`folder_id` sets null).
 */
export const PURGE_ORDER = [
  "deck_token_joins", "token_ownership", "token_reads",
  "card_assignments", "pull_releases",
  "deck_suggestion_runs", "deck_synopses", "intake_reads", "intake_read_stops", "fits_reads",
  "deck_games", "deck_notes", "deck_profiles", "mana_trade_applies", "deck_tool_counts", "deck_swaps",
  "decks", "deck_folders",
  "collection_history", "collection_items", "card_art_preferences", "commander_scores", "csv_uploads", "user_prefs",
  "owned_support_counts", "owned_support_stamps",
  "wishlist_items", "rate_hits",
  // The Stripe customer mapping before the paid lots: the webhook holds that row while it grants, so a
  // purge taking it first leaves a late payment unattributed, and one waiting on it deletes the new lot.
  "stripe_customers", "model_calls", "credit_grants",
  "admin_events", "flag_overrides", "flag_group_members",
] as const;

export type PurgeReport = { social: SocialPurge; rows: Record<string, number>; stamp: number };

export async function purgeAccount(userId: string): Promise<PurgeReport> {
  if (typeof userId !== "string" || userId.length === 0) throw new Error("purgeAccount: no user id");
  return db.transaction(async (tx) => {
    // Waits out a refresh of the reader's owned-support store, which would otherwise write rows back
    // after this commits; a refresh that takes the lock after it finds no collection and writes none.
    await tx.execute(ownedSupportLock(userId));
    const { counts: social, friendIds } = await purgeSocialIn(tx, userId);
    const rows: Record<string, number> = {};
    for (const table of PURGE_ORDER) {
      const done = await tx.execute(sql`delete from ${sql.identifier(table)} where user_id = ${userId}`);
      rows[table] = done.rowCount ?? 0;
    }
    // The data stamps LAST, after every row, in user id order, which is where and how any other writer takes
    // them (the deferred triggers, at its commit). Taken earlier, a writer holding a row this purge must
    // delete and waiting on a stamp this purge held would deadlock it. A friend's missing row is created at
    // 0, which reads the same as no row (`userDataStamp`); with no friend nothing is created, so a retried
    // purge still writes nothing.
    const stamped = [...new Set([userId, ...friendIds])].sort();
    if (friendIds.length > 0) {
      await tx.execute(sql`
        insert into user_data_stamps (user_id, stamp)
        select u, 0 from unnest(${sql.param(stamped)}::text[]) as u order by u
        on conflict (user_id) do nothing`);
    }
    await tx.execute(sql`select 1 from user_data_stamps where user_id = any(${sql.param(stamped)}::text[]) order by user_id for update`);
    // Fire every deferred stamp trigger now, with every stamp already held, so none writes this account's
    // stamp back at commit.
    await tx.execute(sql`set constraints all immediate`);
    const stamp = await tx.execute(sql`delete from user_data_stamps where user_id = ${userId}`);
    return { social, rows, stamp: stamp.rowCount ?? 0 };
  });
}
