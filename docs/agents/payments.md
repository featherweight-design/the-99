# Payments (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

- **Paid credits in the ledger** (payments PR L, `boards/plan-payments-ledger-2026-10-13.md`, Hugh's answers in
  `boards/scope-payments-2026-10-13.md`). `credit_grants` holds one row per lot of paid credits, `plan` (a
  subscription period; rolls over with no cap while subscribed, `expires_at` set to the period end on cancel) or
  `pack` (never expires, which a check holds). `model_calls.credit_grant_id` names the lot a run spent, null for the
  free allowance. `reserveModelCall`, under the per-player lock it already took, funds from the free allowance while
  it has room, then a plan lot (soonest to expire, then oldest), then a pack lot (oldest), else refuses as before.
  A lot is spent by the rows naming it under the allowance's own rule minus the 24-hour window
  (`src/lib/model/credit-rule.ts`), so a refunded run, or a reservation past its TTL, returns its credit to the lot
  that funded it with no second refund path, and a paid run never counts toward the free window. `Allowance` carries
  `plan` and `pack` when the player holds a lot. Nothing writes a lot yet (the Stripe webhook is K1), so every
  reserve takes the pre-payments path. **"Out of credits" is decided in one place** (L2): `hasCredit` (the free
  allowance has room, or a lot holds a credit), `freeRoom` (the free allowance alone) and `freeCount` (the free
  credits a line shows, never below zero) in `allowance-rule.ts`. Every reader that decides whether a press may start
  asks `hasCredit`, the server gates (`tuning/gate.ts`, `synopsis/read.ts`,
  intake's `closedBy`) and the panels alike (tuning, cuts, fits, and the overview's press note and refusal), after the
  owner's `ownerShare`. (The app-wide spend cap was removed on 2026-10-17, and the Anthropic workspace limits
  bound the whole app's spend. Its `paused` state is gone from the type, the refusals and every reader.) `src/lib/model/credit-gates.test.ts` fails, anywhere else in `src/`, on a
  comparison of `used` against `limit`, on `limit - used` worked out by hand, and on a comparison of the free count.
  The free COUNT a line shows (`N of 5 left`) is still the free allowance's alone: how a paid balance is drawn is the
  buying screens' design (U1). Purged
  with the account; unspent credits are forfeited (Q7). `pnpm probe:payments-ledger` proves it on a scratch branch.

- **Stripe, the webhook half** (payments K1a, scope `boards/scope-payments-2026-10-13.md` §5). `stripe` is pinned
  EXACTLY, and so is the API version in `src/lib/payments/stripe.ts`; an upgrade is its own reviewed change. Its
  types took the type check past Node's default heap in CI (about 2GB, where `main` already sat), so `typecheck`,
  `build` and `vercel-build` run with `NODE_OPTIONS=--max-old-space-size=4096`.
  **Test mode everywhere but production**: `stripeClient()` refuses a live key unless `ADMIN_ENV_LABEL=production`
  and a test key when it is (`key-mode.ts`), and is then null, so a misconfigured deployment does nothing.
  `STRIPE_SECRET_KEY` must be a RESTRICTED key (`rk_`): an account secret key (`sk_`) is refused in either mode.
  On the production project it is live, Production scope alone and Sensitive. `POST /api/stripe-webhook` is public in `src/proxy.ts` and authorized only by the signature over the
  RAW body (`STRIPE_WEBHOOK_SECRET`, and `STRIPE_WEBHOOK_SECRET_PREVIOUS` while a roll overlaps; 5-minute
  tolerance; a signature needs no API key, so the key is asked for only once a Session is known to be ours). It
  answers 503 unconfigured (a completed Checkout with a pack's Price variable unset included, so
  Stripe retries rather than a real payment being refused for good), 400 unsigned or stale, 200 to an event type it ignores, and reads no
  feature switch: a payment already taken is processed even while sales are stopped. **The Stripe account is
  SHARED with Concert Crawl** (one LLC; each app has its own restricted key and endpoint, and every endpoint
  receives every Checkout on the account), so every Session this app creates MUST carry `metadata.app = "the-99"`
  (`PAYMENTS_APP`; the Checkout builder is K1b, and its test pins the tag), and a Session without it is answered
  200 and left alone before anything else is read, with one fixed info line: never a 503, which would have Stripe
  retry another app's payment for days. Only one of OURS waiting on config is 503. A `checkout.session.completed` is a TRIGGER: `fulfilCheckoutSession`
  retrieves the Session from Stripe and `decideFulfilment` (`fulfil-rule.ts`) grants only a paid, one-item,
  quantity-1 Session for a Price in the pack registry (`packs.ts`, $5 for 40), in its currency and amount net of
  tax, whose customer maps through `stripe_customers` to the account its `client_reference_id` and metadata
  name. A disagreement is refused and logged, never fixed; a customer with no account is kept `unattributed` in
  `payment_records` for Hugh to refund by hand. The grant is one transaction: the `stripe_events` row first (a
  conflict is a duplicate), then the `payment_records` row and the `credit_grants` lot, both idempotent on
  Stripe's ids. A refusal, a duplicate or an unattributed payment answers 200; a failure to reach Stripe or the
  database answers 500 and Stripe retries. Logs carry the type and the outcome, never an id or an amount.
  `payment_records` holds no account id and is KEPT through the purge (Hugh, Q6); `stripe_customers` goes, FIRST
  of the payment rows: the grant reads that mapping `FOR SHARE`, so a purge holding it leaves a late payment
  unattributed, and a grant holding it commits before the purge deletes the lots.
  `pnpm check:payments-reads` fails when code under `src/` outside `src/lib/payments/` imports `stripe` or names a
  Stripe table, and runs against the shipped tree inside `pnpm test`. `pnpm probe:payments-webhook` proves the
  grant transaction on a scratch branch.

- **Creating a Checkout Session** (K1b) is `buyPackAction` (`src/app/credits/actions.ts`), behind `PAYMENTS_ENABLED`
  (unset on production and on staging until Hugh's Stripe test keys exist; Hugh's group first, Q13; the `off` literal
  stops every sale while the webhook keeps settling). It takes a pack id from the closed registry and a uuid press id,
  nothing else, and refuses a reader without a verified email. `createPackCheckout` (`checkout.ts`) refuses the 11th
  Session in an hour (`checkout` in `RATE_RULES`, the one ENFORCED bucket, whatever `RATE_LIMIT_ENABLED` says), makes
  the reader's Stripe Customer once (`ensureCustomer`: a per-account idempotency key, then the mapping read back, so a
  race keeps the stored one), and creates the Session from `packCheckoutParams` under the press's idempotency key: the
  facts `decideFulfilment` checks (one item at the registry's Price, the customer, `client_reference_id`,
  `metadata.app`, `pack` and `user_id`, on the PaymentIntent too), cards only, Stripe Tax, and return URLs on
  `APP_ORIGIN`, never a request header (unset or not a bare `https` origin, nothing is created). Stripe Tax is why each
  pack Price must be tax-EXCLUSIVE: an inclusive Price makes the amount net of tax differ from the registry's, and the
  webhook refuses that payment as `amount`. A test builds a Session's params and runs them through `decideFulfilment`,
  so the two halves cannot drift. Nothing is granted on the return.
- **Account deletion reaches Stripe** (`src/lib/payments/delete-customer.ts`, called by `purgeAccount` as step 0, before its transaction). With a `stripe_customers` mapping it retrieves the Customer and deletes it ONLY when `metadata.app` is `the-99` and `metadata.user_id` is the account (the Stripe account is shared); a Customer not so tagged is left in place, logged, and the purge goes on. Deleting cancels its subscriptions. **A 404 from Stripe counts as done**, so a deployment keyed to the wrong Stripe mode or account would drop the mapping and strand the Customer; the guard against that is `keyAllowed` tying key mode to the environment (production = live key only), not this code. Any other failure or no usable key throws and the purge does nothing. A Checkout started between the Stripe delete and the purge transaction fails at `ensureCustomer` (the account is being deleted; accepted). Needs only Customers write, which the restricted key already has.


## The welcome lot (launch epic D1, ruling L5)

- `credit_grants.source = 'welcome'`: 15 units, `expires_at` required (the migration rewrites
  `credit_grants_pack_never_expires_check`: a pack never expires, a welcome lot always does, a plan lot may). A partial unique
  index (`credit_grants_welcome_once`) holds one per account ever.
- `grantWelcome(userId, createdAt, env)` (`src/lib/payments/welcome.ts`) runs from the `user.created` webhook for EVERY new
  account, before and apart from the invite spend; either failing answers 500 for a retry. It takes the account's invite lock
  (the purge's), reads the tombstone under it, then inserts `on conflict do nothing`. The expiry is the Clerk event's
  `created_at` plus 30 days, never `now`, so a redelivery cannot extend a lot and an account past its 30 days gets nothing.
- Spend order is free, welcome, plan, pack (`SOURCE_RANK`). `heldCredits` is the one definition of "holds a lot"; the 20-a-day
  paid limit applies to welcome runs. A group can set its own paid limit (`flag_groups.paid_daily_limit`, 1 to 1000, the
  admin group editor's "Daily paid runs"): `paidLimitFor` reads the largest among the player's groups, else
  `PAID_DAILY_LIMIT`, and `readAllowance` and `reserveModelCall` (inside its lock) both take it, so the line and the gate
  never disagree. `PAID_TODAY_SHOWN_FROM` (15) is unchanged: under a group limit of 15 or less the meter shows only once the limit is reached. The `/credits` history leaves welcome lots out (a gift is not a purchase), and the page
  draws a Welcome cell only while it holds a credit.
- There is NO in-page fallback and no backfill script: a missed webhook means no grant. `user_prefs` carries no creation time,
  so it is not a "new account" signal; a fallback is a D2 decision. Accepted: no per-email dedupe, so a deleted account that
  signs up again gets another lot.
- Proof: `pnpm probe:payments-ledger` section `m` (order, expiry, the index, the check, the purge).

