# Account purge (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

- **Deleting an account deletes everything the app holds for it** (Hugh's ruling Q8, 2026-10-12). Clerk's
  `user.deleted` webhook (`POST /api/clerk-webhook`, public in `src/proxy.ts`, authorized only by the Svix signature
  `verifyWebhook` checks against `CLERK_WEBHOOK_SIGNING_SECRET` on every call; with the secret unset it answers 503 and
  does nothing) runs `purgeAccount` (`src/lib/account/purge.ts`) in
  ONE transaction. The social half first (`purgeSocialIn`): it locks in the order every social write does (its
  invites, then the pods it owns or is in, then its friendship rows, which `addMember` also holds while it adds),
  leaves every pod the way a player leaves it (an owned pod passes to its longest-standing member), and deletes both
  directions of every friendship, every invite naming the account and the profile. Then every other table by
  `user_id` in `PURGE_ORDER` (children of `model_calls` before it). Then the data stamps of the account and its
  friends, locked LAST in user id order (where every writer takes them, at its commit), and
  `set constraints all immediate` so the deferred stamp triggers fire before the account's own `user_data_stamps`
  row is deleted, or commit would write it back. Kept on purpose: what an ADMIN did (`admin_events.actor_id`,
  `admin_settings.updated_by`, `flag_groups.created_by`, the flag rows' `added_by` / `updated_by`), the admin's own
  audit trail; the account's own switch overrides and group memberships go. It runs whatever the switches say: deleting a deleted
  account's data is never a feature to hide. It is idempotent, so a Clerk retry is harmless.

  **Coverage is computed, not listed**: `src/lib/account/purge.test.ts` reads `schema.ts` and fails when a table
  holding an account column is neither purged nor kept with a reason, and when a child of a purged table has no
  `on delete` the order does not cover. A new per-user table therefore fails CI until the purge handles it.
  `pnpm probe:purge` searches every text column the DATABASE's catalog lists for the account's id by value and
  proves none holds it afterwards, on a scratch branch.

  **A tombstone, and a sweep that closes the window after the purge** (orchestrator's ruling as Hugh's proxy,
  2026-10-14). The webhook first records the deletion (`recordDeletion`), in its OWN commit before the purge, so a
  purge that fails is still swept: `account_tombstones` holds `id_hash`, the SHA-256 of the Clerk id (random and
  never reissued, so it needs no key), the raw `clerk_id`, and `deleted_at`; a re-run keeps the first row.
  `purgeAccount` itself writes no tombstone, so a probe that purges its own fixtures leaves none. A request already past its auth when the purge committed can still write a row for the account, so a
  Vercel cron (`vercel.json`, every five minutes) calls `GET /api/cron/account-sweep` (public in `src/proxy.ts`,
  authorized only by `CRON_SECRET` as a bearer token, 503 without it), which runs the idempotent purge AGAIN for
  every tombstone still holding its raw id, oldest first and with no cap, so a new tombstone never waits behind
  older ones (`sweepTombstones`, `src/lib/account/sweep.ts`).
  **The window is minutes**: Clerk revokes the account's sessions on delete and a session token lives about a
  minute, so a late write lands before a sweep and is erased by it. **The raw id is held for 24 hours and no
  longer**: the first sweep after `deleted_at` + 24h purges once more and sets `clerk_id` null, after which only
  the hash and the time remain, and nothing can be purged by them. A failed re-purge keeps its raw id for the next
  sweep. The coverage test keeps `account_tombstones.clerk_id` with that reason, and `probe:purge` proves a late
  write erased by the sweep and the raw id retired after the day.

  **Stripe first, database second** (payments PR R, scope §6.3). `purgeAccount` step 0, before the transaction, is
  `deleteStripeCustomerFor` (`src/lib/payments/delete-customer.ts`): no `stripe_customers` row means no Stripe call and
  no key needed; a row means the Customer is retrieved, checked to carry `metadata.app = the-99` and this account's
  `user_id` (the Stripe account is shared with Concert Crawl), then deleted, which also cancels its subscriptions. A
  Customer not so tagged is NEVER deleted: one error-level line, result `foreign`, and the purge goes on (a throw would
  repeat on every retry for ever). 404 or already-deleted is done. Any other failure, or a mapping with no usable
  key, THROWS before anything is purged, so the webhook answers 500, Clerk retries, and the sweep re-runs the purge
  (the mapping row is still there). Between the Stripe delete and the transaction the mapping still exists, so a late
  `checkout.session.completed` can still grant and the purge then deletes that lot with the account; one completing
  AFTER the commit finds no mapping and is kept unattributed (refund by hand; `fulfil.ts` reads the mapping FOR
  SHARE). A Checkout started in that instant fails at `ensureCustomer`: accepted. The restricted key needs Customers
  write, which it already has. The purge reads no feature switch. `src/lib/account/purge-stripe.test.ts` pins the order.
  A Checkout racing step 0 is closed twice: `ensureCustomer` refuses an account with a tombstone (no Customer, no mapping), and the transaction deletes `stripe_customers` `returning` the id and rolls back on one step 0 did not handle, so the 500 and its retry delete that Customer.
