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

## Open question

The first-signed-in-load fallback needs an "account is new" signal that costs nothing per load. Candidates:
`user_prefs.created_at` (does the row exist before the first load?), or webhook-only with the fallback dropped.
