# D1: the welcome-credit grant (backend only)

Launch epic D1, ruling L5. 15 credits, expiring 30 days after the account is created, one per account ever. No UI:
the onboarding surface and the credit line's wording are D2 and wait for Design.

## What exists

- `credit_grants` (one row per lot): `source` checked to `plan | pack`; `credit_grants_pack_never_expires_check`
  allows `expires_at` only on `plan`; `external_id` is unique.
- Spend order lives in `credit-rule.ts` (`spendOrder`, `pickGrant`): plan lots before pack lots, soonest expiry first.
  "Out of credits" is decided only in `allowance-rule.ts` (`hasCredit`, `freeRoom`, `freeCount`, `paidAtLimit`), and
  `credit-gates.test.ts` fails on any other comparison. Those read `plan + pack` as the held count.
- The Clerk webhook (`/api/clerk-webhook`) handles `user.created` for invites only, and returns early with no
  reservation. `credit_grants` is already in `PURGE_ORDER`.

## Decisions

1. **Source `welcome`.** The source check becomes `plan | pack | welcome`. The never-expires check is rewritten to:
   a `pack` lot never expires; a `welcome` lot always has `expires_at`; a `plan` lot is unchanged (nullable).
2. **One per account ever.** A partial unique index on `(user_id) where source = 'welcome'`. The write is
   `insert ... on conflict do nothing`, so every path is idempotent. `external_id` is `welcome:<user id>` as well, so the
   existing unique column also holds it.
3. **Spend order: free, welcome, plan, pack.** `spendOrder` ranks `welcome` first among lots. It expires soonest and
   cannot be bought, so spending it first loses the player nothing.
4. **The held count has one definition.** `Allowance` gains `welcome` beside `plan` and `pack`; `creditTotals` returns it.
   A new `heldCredits(a)` in `allowance-rule.ts` replaces the three inline `plan + pack` sums (`hasCredit`,
   `paidAtLimit`, and the credit line's and `/credits` page model's own), so `credit-gates.test.ts` keeps its single
   decision site. The 20-a-day paid limit applies to welcome runs, as to any run a lot funds.
5. **Where it is written.** `grantWelcome(userId, now)` in `src/lib/payments/welcome.ts`, called from the
   `user.created` webhook for EVERY new account (before and independent of the invite branch), and from a first
   signed-in load as the fallback for a missed webhook. The fallback must never grant an EXISTING account:
   it runs only when the account has no `user_prefs` row yet and is created at that moment (see open question).
6. **A deleted account never regrows a grant.** `grantWelcome` refuses an id with a tombstone (`recordDeletion`), so a
   late `user.created` redelivery after `user.deleted` writes nothing.
7. **A switch.** `WELCOME_CREDITS_ENABLED` (feature, `needs: PAYMENTS_ENABLED`) in the registry. Off: nothing is
   granted. A lot already granted is spent whatever the switch says, as a taken payment is.
8. **Constants.** 15 units and 30 days live in one module (`welcome.ts`), exported for D2's live line.

## Proof

- Unit: `spendOrder` with all four kinds; `heldCredits`; `credit-gates.test.ts` still passes unchanged.
- `src/lib/payments/welcome.test.ts`: the insert's shape (units, expiry), idempotence, tombstone refusal, switch off.
- Migration number 0149; the ledger probe `pnpm probe:payments-ledger` gains a welcome lot: spent before a plan lot,
  expires and stops funding at 30 days, second grant writes nothing, purge deletes it. Run on a scratch branch.
- `purge.test.ts` already computes coverage; no change needed, and the probe's purge step asserts it.

## Review outcome (subagent, 2026-10-18) and what changed

- **Written under the purge's lock.** `grantWelcome` takes `pg_advisory_xact_lock(hashtext('invites:' || user id))`, the
  lock `purgeAccount` and `spendInviteOnSignUp` take, then reads the tombstone, then inserts, in one transaction. A plain
  read-then-insert could orphan a lot after a purge.
- **Expiry is born from the account's creation time**, the Clerk event's `created_at`, not `now`: `expires_at = created
  + 30 days`, and nothing is inserted when that is already past. A redelivery cannot extend a lot, and an old account's
  lot would be born expired.
- **No in-page fallback in D1.** `user_prefs` carries no creation time, so it is not a "new account" signal. D1 ships the
  webhook alone. A backfill script was dropped: it needs the target environment's Clerk key and a named database, and a
  missed webhook is rare; an in-page fallback or a backfill is a D2 decision.
- **Third source, every site.** `CreditSource`, `spendOrder`, an exhaustive `creditTotals`, `Allowance.welcome`,
  `heldCredits`, the credit line's `paidHeld`, the `/credits` page model (a welcome row is not "ever bought" and is not
  drawn as a pack), `return.ts`, the ledger probe.
- **The switch** is a full registry entry: flag function, the `flag_overrides_switch_check` rewrite in the same migration,
  admin label, docs. It keeps `needs: PAYMENTS_ENABLED` (L5 ships after payments U2a).
- **Accepted:** 15 credits per Clerk account with no per-email dedupe; a deleted account that signs up again gets another.
- **For D2:** a welcome holder with payments off would be drawn paid-credit lines by the credit line; D2 owns the wording.
