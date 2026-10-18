# Admin payments (A): build plan

The last PR of the buying-credits line, split in three: the payments scope's §8.3 and §9 row A
(`boards/scope-payments-2026-10-13.md`), the brief's "20 paid a day, overridable per group in /admin"
(`docs/superpowers/design-briefs/2026-10-16-buying-credits.md` §2), and the UI plan's row A
(`docs/superpowers/plans/2026-10-17-buying-credits-ui.md`). Owner: lane 58. Lane 50 owns Subscription and K2.

## What exists (origin/main, 2026-10-18)

- `PAID_DAILY_LIMIT = 20` (`src/lib/model/allowance-rule.ts:78`), read by `paidRoom` (:177), the ONE comparison
  (`credit-gates.test.ts`). `src/lib/model/allowance.ts` hardcodes it twice: `readAllowance` (:226) and
  `reserveModelCall`'s paid branch (:293-294).
- The free allowance is already per group: `flag_groups.daily_allowance`, resolved by `groupAllowanceQuery`
  (`allowance.ts:83`) through `flag_group_members` (an account is in at most one group). Edited in
  `group-editor.tsx`, written by `writeGroup` (`src/lib/admin/group-writes.ts`) with an `admin_events` row
  (`group_allowance_set`).
- A run funded by ANY lot (welcome included) counts toward the paid limit: `ledgerRows(paid=true)` counts every row
  with a `creditGrantId` (`allowance.ts` ~165). The limit is on banked-credit spends, not on purchases, and stays so.
- `payment_records` (no user id, by design), `credit_grants` (`plan`, `pack`, `welcome`), `stripe_customers`. No admin
  code reads them.
- Disputes: K2 (#2041, lane 50, open) adds `payment_disputes` and `stripe_customers.purchase_blocked_at`.
- Design: the admin handoff (`design/design_handoff_the99_admin/`) has no revenue, grant or dispute board, and the
  buying-credits README puts them out of scope ("stage 2"). The scope rates this "light".

## Rulings this plan makes

| # | Ruling |
|---|---|
| A-R1 | **A group's paid limit** is a nullable `flag_groups.paid_daily_limit` (1 to 1000), beside `daily_allowance`, edited in the same group editor field pattern, written by `writeGroup` with a new `admin_events` kind `group_paid_limit_set`. Null means `PAID_DAILY_LIMIT`. |
| A-R2 | **One resolved limit.** A single read resolves the reader's group paid limit: `paidLimitFor`, its OWN query on `paid_daily_limit is not null` (reusing `groupAllowanceQuery`, which filters `daily_allowance is not null`, would drop a group that sets only a paid limit). `readAllowance` and `reserveModelCall` both take it, the latter inside its lock, and both paid-today counters (`allowanceFrom(..., limit)`) use it. The gate and the line can never disagree. `paidRoom` stays the only comparison. |
| A-R3 | **The P5 near-limit line stays at `PAID_TODAY_SHOWN_FROM = 15`**, a constant, not a share of the limit. With a group limit under 15, the line shows at the limit (P5b); over 20, it shows from 15 as now. A share would move a ratified threshold for a case nobody has yet. |
| A-R4 | **Admin UI is built from the admin handoff's existing patterns** (the R3 `A1-Masked-list` table, the `C2-Group-members` rows, the group editor's number field). No new handoff: these are internal tables in an established admin idiom, not a new player surface (the scope's "light"). Names are masked as `listAccounts` masks them; nothing reveals an email. |
| A-R5 | **A manual grant** is a new `credit_grants.source = 'gift'`: a support credit Hugh gives. It never expires (the never-expires check requires `gift` with `expires_at is null`). Spend order follows the ledger's "soonest to expire first" (`credit-rule.ts:11-14`): `welcome < plan < gift < pack`, so a plan lot that can lapse goes before a permanent gift, and the gift before the purchased, refundable pack. It is NOT paid. "Paid" is `source in ('plan','pack')` everywhere, never "not welcome": `chip.ts` `everBought`, `return.ts` `listCreditHistory`, `held.ts`, `page-model.ts`. It is held: `Allowance.gift`, `heldCredits`, `creditTotals`, `SOURCE_RANK` and `CreditSource` all gain it, or `creditTotals` reads NaN and the panel refuses a press the server allows. Its `external_id` is `gift:<actionId>`, a uuid the form sends, so a double submit writes one lot. It writes an `admin_events` row `credits_granted` (actor, account, units, note) in the same transaction. Units 1 to 500, a required note. |
| A-R6 | **Revenue** is read from `payment_records` by UTC month: gross (`amount_cents`), tax, net, count, beside the month's model spend on the Costs page. Refunds subtract in A3, from K2's `credit_grants.refunded_cents` (lane 50, #2041). |
| A-R7 | **`admin_events` migrations collide**: each one redeclares both `admin_events_kind_check` and `admin_events_fields_check` whole (`0143`, `0150`). Every PR here rebuilds both from the NEWEST migration on main at merge time, and `credits_granted` gets its own fields arm (`user_id`, `new_value`, `note` not null). |

## PRs (no stacking; each from fresh main after the last merges)

| PR | Contents | Depends on |
|---|---|---|
| **A1** | A-R1 to A-R3, A-R7: migration (`paid_daily_limit` + `group_paid_limit_set`), `paidLimitFor`, the threaded limit in `readAllowance` and `reserveModelCall`, `groups-rule.ts` (validation, events, dirty check), `groups.ts` (the list read), `group-writes.ts`, the group editor's field. Tests: `allowance-rule`, `allowance` with a recording database, `group-writes`, `group-editor`; a limit lowered below today's count (the line at the limit, `paidBackAt` right); a member moved between groups mid-day. `probe:payments-ledger` gains a group-limit case. Lane 50 rebases Subscription over it. | none |
| **A2a** | A-R5's ledger half, NO UI: migration (`gift` in both `credit_grants` checks, `credits_granted` with its fields arm), `credit-rule.ts` (`CreditSource`, `SOURCE_RANK`, `creditTotals`), `allowance-rule.ts` (`Allowance.gift`, `heldCredits`), `allowance.ts` funding order, and the "paid is plan or pack" fix in `chip.ts`, `return.ts`, `page-model.ts`, `held.ts`. The write `grantGift` (admin-only, idempotent on `gift:<actionId>`). Probe: a gift is spent after plan and before pack, `creditTotals`/`heldCredits` count it, it shows in no purchase history and triggers no deletion warning, and the purge removes it. | A1 |
| **A2b** | A-R4, A-R6: the `/admin/payments` tab (revenue by month beside spend, the grants table, the manual grant form), `src/lib/payments/admin-read.ts`. Tests: a non-admin gets 404 on the page and the action; a grant to an unknown account refuses; a double submit writes one lot. A browser probe at 1300 and 390. | A2a |
| **A3** | The dispute list and "clear the block", reading K2's `payment_disputes` and `stripe_customers.purchase_blocked_at`; revenue net of `credit_grants.refunded_cents`. | A2b, K2 (#2041) |

Each money PR takes the clean-after-clean bar. Migrations: the first PR to its merge bar takes the next number
(`ls drizzle/` on origin/main right before merging).

## Proofs

- A1: a group limit of 3 refuses the 4th paid run and `readAllowance` says `paidLimit: 3`; no group, 20; the meter
  shows at the limit. `probe:payments-ledger` on a scratch branch.
- A2a: a gift is spent after plan and before pack; it is held but not "paid" (no purchase history, no deletion
  warning, no `everBought`); its event row lands in the same transaction; a double submit writes one lot.
- A2b: non-admins get 404 on the page and the action; a browser probe of the tab at 1300 and 390.
- A3: a disputed account lists, and clearing the block lets it buy again.

## About

No About entry: admin surfaces have none. The `credits` entry is owed at the line's close-out (UI plan).
