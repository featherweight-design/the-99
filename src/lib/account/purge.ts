/**
 * The account purge (Hugh's ruling Q8, 2026-10-12): when a player deletes their account, every row the app
 * holds for them goes, in ONE transaction, so a failure part-way leaves the account whole rather than half
 * deleted. It is the app's first delete-a-user path. It has two callers: the Clerk `user.deleted` webhook
 * (`src/app/api/clerk-webhook/route.ts`), which runs it first, and the account sweep (`sweep.ts`, a cron),
 * which runs it again for a day to erase writes that landed after it.
 *
 * - Social first (`purgeSocialIn`): pods are left the way a player leaves them, so a pod the account owned
 *   passes to its longest-standing member; then both directions of every friendship, every invite naming
 *   the account, and the profile.
 * - The invite tree is kept, with this account's side of each edge set null (`unlinkInvitesIn`).
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
 * Step 0, before the transaction: the account's Stripe Customer is deleted (`deleteStripeCustomerFor`), which also
 * cancels its subscriptions. A Stripe failure, or a Customer that is not this app's, THROWS with nothing purged, so the
 * webhook answers 500 and Clerk and the sweep retry; the mapping row is still there for the retry. Stripe first, database
 * second: the other order would delete the mapping and strand the Customer.
 *
 * Idempotent: an account with no rows purges to all zeros, so a retried webhook is harmless.
 *
 * The account's TOMBSTONE is not written here: `recordDeletion` writes it, and the webhook calls that FIRST,
 * in its own commit, so a purge that fails is still swept, and a probe that purges its own fixtures leaves
 * none. The account sweep re-runs this purge for every tombstone younger than a day (`sweep.ts`).
 */
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { purgeSocialIn, type SocialPurge } from "../social/purge";
import { invitationIdsIn, revokeAfterPurge, unlinkInvitesIn } from "../invites/purge";
import { ownedSupportLock } from "../discovery/owned-support-lock";
import { tombstoneHash } from "./tombstone";
import { deleteStripeCustomerFor } from "../payments/delete-customer";
import { stripeClient } from "../payments/stripe";

/**
 * Every non-social table holding a row by `user_id`, in delete order. Rows that point at `model_calls`
 * (no `on delete`) go before it, and `model_calls` before the `credit_grants` its rows name. Unspent paid
 * credits are forfeited with the account (Hugh, Q7, 2026-10-13); `decks` goes before `deck_folders` only for tidiness (`folder_id` sets null).
 */
export const PURGE_ORDER = [
  "scan_lab_results", "scan_lab_cadence",
  "deck_token_joins", "deck_token_printings", "token_ownership", "token_printing_holdings", "token_reads",
  "card_assignments", "pull_releases",
  "deck_suggestion_runs", "deck_synopses", "intake_reads", "intake_read_stops", "fits_reads",
  "deck_games", "deck_notes", "deck_profiles", "mana_trade_applies", "deck_tool_counts", "deck_swaps",
  "decks", "deck_folders",
  "collection_history", "collection_items", "card_art_preferences", "commander_scores", "csv_uploads", "user_prefs",
  "owned_support_counts", "owned_support_stamps",
  "wishlist_items", "wishlist_collected", "spare_keep", "rate_hits",
  "push_subscriptions", "push_outbox", "feed_dismissals",
  "invite_reservations", "invite_balances",
  "flyer_claims", "feedback",
  // The Stripe customer mapping before the paid lots: the webhook holds that row while it grants, so a
  // purge taking it first leaves a late payment unattributed, and one waiting on it deletes the new lot.
  "stripe_customers", "subscriptions", "model_calls", "credit_grants",
  "admin_events", "flag_overrides", "flag_group_members",
] as const;

export { tombstoneHash };

/**
 * Record that the account was deleted: the hash of its id, the raw id for a day, and when. Its own statement,
 * committed before the purge runs, so the sweep re-purges the account even when that purge fails. A re-run
 * keeps the first row: the sweep's day is counted from the deletion, not from a retry.
 */
export async function recordDeletion(userId: string): Promise<void> {
  if (typeof userId !== "string" || userId.length === 0) throw new Error("recordDeletion: no user id");
  await db.execute(sql`
    insert into account_tombstones (id_hash, clerk_id) values (${tombstoneHash(userId)}, ${userId})
    on conflict (id_hash) do nothing`);
}

export type PurgeReport = {
  social: SocialPurge;
  rows: Record<string, number>;
  invitesUnlinked: number;
  /** Clerk invitations the account's reservations held, and how many were revoked once the purge committed. */
  invitations: { found: number; revoked: number };
  stamp: number;
};

export async function purgeAccount(
  userId: string,
  deps: {
    revoke?: (invitationId: string) => Promise<boolean>;
    revokeFor?: (email: string, reservationId: string) => Promise<boolean>;
    /** The Stripe client, resolved only when the account has a Customer mapping. Tests pass a fake. */
    stripe?: Parameters<typeof deleteStripeCustomerFor>[1];
  } = {},
): Promise<PurgeReport> {
  if (typeof userId !== "string" || userId.length === 0) throw new Error("purgeAccount: no user id");
  const handled = await deleteStripeCustomerFor(userId, deps.stripe ?? stripeClient);
  const { report, invitationIds } = await db.transaction(async (tx) => {
    // Waits out a refresh of the reader's owned-support store, which would otherwise write rows back
    // after this commits; a refresh that takes the lock after it finds no collection and writes none.
    await tx.execute(ownedSupportLock(userId));
    // The invite lock every spend takes for the sender and the newcomer (`lockSenderIn`, `invites:<id>`): a spend and
    // this purge of either account take turns, so a spend never commits rows for an account while it is being purged.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`invites:${userId}`}))`);
    const { counts: social, friendIds } = await purgeSocialIn(tx, userId);
    // The tree is kept with this account's side set null (`INVITES_UNLINKED`).
    const invitesUnlinked = await unlinkInvitesIn(tx, userId);
    // Read before the reservations are deleted below; revoked after this commits.
    const invitationIds = await invitationIdsIn(tx, userId);
    const rows: Record<string, number> = {};
    for (const table of PURGE_ORDER) {
      const done = await tx.execute(sql`delete from ${sql.identifier(table)} where user_id = ${userId}${table === "stripe_customers" ? sql` returning stripe_customer_id` : sql``}`);
      rows[table] = done.rowCount ?? 0;
      if (table === "stripe_customers") {
        // A first Checkout can be awaiting `customers.create` when step 0 finds no mapping, then store one before
        // this runs. Any mapping this delete takes that step 0 did not handle would strand its Customer, so the
        // transaction rolls back, the caller answers 500, and the retry's step 0 deletes it. Deleting with
        // `returning` makes the check and the delete one statement, so no insert can slip between them.
        const ids = (done.rows as { stripe_customer_id: string }[]).map((r) => r.stripe_customer_id);
        if (ids.some((id) => id !== handled.customerId)) {
          console.error("[account-purge] a Stripe customer appeared during the purge; rolled back for a retry");
          throw new Error("Stripe customer appeared during the purge");
        }
      }
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
    return { report: { social, rows, invitesUnlinked, stamp: stamp.rowCount ?? 0 }, invitationIds };
  });
  return { ...report, invitations: await revokeAfterPurge(invitationIds, deps) };
}
