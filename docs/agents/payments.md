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

- **Card statements** read `FWDESIGN* THE 99`. The account's shortened descriptor (prefix) `FWDESIGN` is Hugh's Dashboard
  setting, in the sandbox and live (not settable by API). A pack's Checkout carries `payment_intent_data.statement_descriptor_suffix`
  (`STATEMENT_DESCRIPTOR_SUFFIX`, `checkout-rule.ts`). A plan has no code lever: Checkout's `subscription_data` has no descriptor
  and a subscription's PaymentIntent cannot be set, so its descriptor is the plan Product's own `statement_descriptor`
  (`FEATHERWEIGHT THE 99`, set by Hugh on the product in both modes). A finalized subscription invoice cannot be edited.
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


- **The monthly plan** (payments, the subscription PR; worded in the product as a credit bundle that renews, never
  a membership). `STRIPE_PRICE_PLAN_60` (plain env var, $5 a month for 60 credits) names the Price; unset, the plan
  is not on sale and `createPlanCheckout` answers `unconfigured`. It lives in `PLANS` beside `PACKS`, NOT in it:
  `isPackId` is the pack Buy's closed set and `packsConfigured` gates every pack payment. Checkout is mode
  `subscription` with `subscription_data.metadata` (app, plan, user_id), because an invoice carries a snapshot of the
  SUBSCRIPTION's metadata and the session's own tag stops at the session; a second live plan is refused (`already`),
  by `subscriptions` and by Stripe's list for the Customer. The webhook takes three more events: `invoice.paid`,
  `customer.subscription.updated`, `customer.subscription.deleted`. Each is a trigger: the invoice and the
  subscription are retrieved and judged (`decideInvoice`, `decideSubscription`, `subscription-rule.ts`), under a
  transaction advisory lock per SUBSCRIPTION taken before the retrieve, so events for one subscription run in order
  and the state written is the state as it stands, never an older event's. An invoice grants a `plan` lot of 60 for
  `subscription_create` and `subscription_cycle` only, `external_id` = the invoice id, with the invoice's
  `billing_reason` stored on the lot (`credit_grants.billing_reason`, which history labels "first month" by). Its
  `payment_records` row stores the INVOICE id in `checkout_session_id` (the column means "the Stripe object that paid
  for the lot"), which is how a refund of a plan charge finds its lot through `external_id`. `planExpiry` is the one
  rule for the lots: a held, not-cancelling subscription CLEARS the expiry of every live plan lot (a keep, a
  renewal, a resubscribe); `cancel_at_period_end` SETS it to the period end; an ended subscription sets it to the
  period end if ahead, else now. A lapsed lot is never given an expiry again, but a KEEP clears it too (the subscription never ended; a late webhook must not turn timing into lost credits). `supersedes` makes an ended subscription
  terminal for its id and a period end monotone. `readAllowance` fills `planExpiresAt` from the earliest expiry of
  the plan lots that still hold credits. The webhook runs whatever `PAYMENTS_ENABLED` says; another app's objects are
  200 and ignored; a paid invoice whose customer maps to no account is `unattributed` (refund by hand). Stripe setup:
  add the three events to the endpoint, the Price id as `STRIPE_PRICE_PLAN_60`, and the restricted key needs
  Subscriptions read (Checkout's duplicate-plan list) and Invoices read (the invoice webhook and `reconcile:payments` retrieve invoices). Subscriptions write arrives with in-app cancel, U3.

  **Cancel, keep and Update card (U3a, plan E4/E5; no UI yet, the plan card is U3b).** `cancelPlanAction` and
  `keepPlanAction` (`src/app/credits/actions.ts`, logic in `plan-manage.ts`, rule `plan-manage-rule.ts`) set
  `cancel_at_period_end` on the reader's plan. Our `subscriptions` table is only how the id is found: the
  subscription is RE-READ from Stripe and written only when its `metadata.app` is `the-99`, its `metadata.user_id` is the
  reader and its status holds a plan. A repeat answers `unchanged`; a foreign, ended or absent plan answers `not_found`
  with no detail; the action writes NOTHING of ours, so the `customer.subscription.updated` webhook stays the single
  writer of the row and the lots' expiry. `manageCardAction` makes a billing portal Session for the mapped Customer
  (re-read and tag-checked) on `configuration: STRIPE_PORTAL_CONFIG`, `return_url` = `APP_ORIGIN` + `/credits`; an unset or
  malformed id answers `unconfigured`, never the account's default configuration (shared with Concert Crawl). All three
  answer `off` under the payments switch. **Hugh-owned setup:** the restricted key gains Subscriptions WRITE and Customer
  portal WRITE (Sensitive, as the key already is), and `STRIPE_PORTAL_CONFIG` is the `bpc_...` id of a configuration made
  once with the Stripe CLI (`billing_portal configurations create`, metadata `app=the-99`; a plain env var, not a secret),
  set on both Vercel projects. Proof: `pnpm probe:plan-cancel`.
- **A run's units** (Suggested changes v2 pricing, Hugh 2026-10-30; migration 0205). `model_calls.units` (smallint, 1 or 2,
  default 1) is what a run costs. Every feature costs 1, except a Suggested changes v2 run whose REQUESTED count is over 10
  swaps, which costs 2 (`unitsFor` and `ONE_CREDIT_MAX_COUNT` in `src/lib/tuning/v2/charge.ts`). It is still one row:
  `reserveModelCall` takes `units` (default 1) and writes it, and settle, refund and the reapers move that row, so a
  refunded run returns all its units. Every counter over the ledger SUMS units and never counts rows: the free window
  (`allowanceFrom`), a lot's balance (`grantBalances`, `readWelcomeLot`, `heldOnGrant`), the paid limit and the admin's
  free count. `credit-gates.test.ts` fails on a `count(` over `model_calls` outside its named press and run counters.
  **One source funds a whole run**: the free allowance when the whole cost fits there, else the first lot in spend order
  (`pickGrant(balances, units)`) holding all of it, with the paid limit's room for all of it; never free plus a lot,
  never two lots. `reserveModelCall` alone decides a run of 2, with `freeRoom` and `paidRoom` (`allowance-rule.ts`) taking
  its units; `hasCredit` stays a one-credit gate. A run refused only because it costs 2 (a 1-credit run would start)
  carries `costs` on the reservation's refusal, through `startRun`, `startTuningV2` (which answers with
  `deckTuningCopy.allowance.costsTwo`) and `runTuning`. The panel's cue before the press comes with the Small items 7
  handoff.

## The welcome lot (launch epic D1, ruling L5)

- `credit_grants.source = 'welcome'`: 15 units, `expires_at` required (the migration rewrites
  `credit_grants_pack_never_expires_check`: a pack never expires, a welcome lot always does, a plan lot may). A partial unique
  index (`credit_grants_welcome_once`) holds one per account ever.
- `grantWelcome(userId, createdAt, env)` (`src/lib/payments/welcome.ts`) runs from the `user.created` webhook for EVERY new
  account, before and apart from the invite spend; either failing answers 500 for a retry. It takes the account's invite lock
  (the purge's), reads the tombstone under it, then inserts `on conflict do nothing`. The expiry is the Clerk event's
  `created_at` plus 30 days, never `now`, so a redelivery cannot extend a lot and an account past its 30 days gets nothing.
- **The admin Payments tab** (`/admin/payments`, admin plan A2b, A3): a UTC month's revenue from `payment_records` per currency (gross, tax, and net of tax and of refunds less the tax they carried back, counted in the payment's month), the disputes still open and the month's, the accounts whose buying is paused with Let them buy, the Costs page's own spend figure beside it, the month's plan, pack and gift lots, the `credits_granted` events, and Grant credits (`grantCredits` → `grantGift`, one `actionId` per grant). Reads in `src/lib/payments/admin-read.ts`. Proof: `pnpm probe:admin-payments`.
- Spend order is free, welcome, plan, gift, pack (`SOURCE_RANK`). A gift (admin plan A-R5) never expires, so it goes after plan lots, which can lapse, and before packs, which were bought and can be refunded; /credits draws its Gift cell only while it holds a credit, like Welcome. `heldCredits` is the one definition of "holds a lot"; the 20-a-day
  paid limit applies to welcome runs. A group can set its own paid limit (`flag_groups.paid_daily_limit`, 1 to 1000, the
  admin group editor's "Daily paid runs"): `paidLimitFor` reads the largest among the player's groups, else
  `PAID_DAILY_LIMIT`, and `readAllowance` and `reserveModelCall` (inside its lock) both take it, so the line and the gate
  never disagree. `PAID_TODAY_SHOWN_FROM` (15) is unchanged: under a group limit of 15 or less the meter shows only once the limit is reached. The `/credits` history leaves welcome lots out (a gift is not a purchase), and the page
  draws a Welcome cell only while it holds a credit.
- There is NO in-page fallback and no backfill script: a missed webhook means no grant. `user_prefs` carries no creation time,
  so it is not a "new account" signal; a fallback is a D2 decision. Accepted: no per-email dedupe, so a deleted account that
  signs up again gets another lot.
- Proof: `pnpm probe:payments-ledger` section `m` (order, expiry, the index, the check, the purge).
- **What the reader is told (D2, plan `2026-10-21-welcome-credits.md`).** `readWelcomeLot` (`src/lib/payments/welcome-read.ts`)
  is the one read that tells a lot used up, expired and absent apart (the allowance drops an expired lot and reads a
  used-up one as `welcome: 0`): one indexed read of the welcome row whose correlated subqueries gather its ledger rows,
  with `remaining` and `isLive` from `credit-rule.ts` deciding what is left. `welcomeState` (`welcome-state.ts`, pure)
  maps it, with `now`, the dismissal, `everBought` (the chip's `boughtFrom`, never restated) and `PAYMENTS_ENABLED`, to
  held, partly, expiring (3 days, `EXPIRY_WARNING_MS`), usedUp, none (expired or no row) or dismissed; `readWelcomeState`
  reads it per request, outside every cached payload. `user_prefs.welcome_strip_dismissed_at` (0159) is the strip's ✕,
  per account, written only while null (the stamp trigger fires on any update) by `dismissWelcomeStripAction`, which
  checks no switch (the strip draws whatever the switches say) and revalidates nothing.
  The `Allowance` carries `welcomeExpiresAt`. The credit line counts welcome in its own segment (`paid` is held less
  welcome), and its expiring tail and the chip's welcome line are dated in the reader's own day (`localDay`), drawn only
  after hydration. A surface wording its own paid form asks `welcomeNext` to say a welcome credit instead.


- **Refunds and disputes** (K2). The webhook also handles `charge.refunded`, `charge.dispute.created` and
  `charge.dispute.closed` (`reverseCharge`, `src/lib/payments/reverse.ts`; rules in `refund-rule.ts`). The charge,
  dispute and PaymentIntent are RETRIEVED; the event is a trigger. A charge is ours when its PaymentIntent has a
  `payment_records` row. With none, a PaymentIntent tagged `the-99` answers 500 while the charge is under 72 hours old (Stripe's redelivery horizon, so a valid Checkout still failing to fulfil is not mistaken for a refused one; a refused Checkout's hand refund therefore retries for up to 72 hours, bounded and noisy by design) (not recorded yet, Stripe
  redelivers); older, the event is recorded and answered 200 `unmatched` with an error log (a refused Checkout never gets a
  record; `reconcile:payments` covers it),
  anything else is Concert Crawl's and is 200 ignored. One transaction: the `stripe_events` row first, the
  `model-allowance:<user>` advisory lock `reserveModelCall` takes, then the lot FOR UPDATE (after
  `stripe_customers`, the purge's order). A refund's target is `min(units, ceil(units * amount_refunded / amount))`
  from the lot's stored MONOTONIC refund claim (`credit_grants.refunded_cents`, `greatest(stored, fetched)` written under the player lock, so a stale snapshot never lowers it or `unrecovered_units`), so replays and out-of-order partials converge; the charge's cumulative refund is ALSO kept on `payment_records.refunded_cents` (`greatest`, written right after the `stripe_events` insert on every refund and dispute event, including `no_grant` paths), account-free so it survives the purge and covers a payment with no lot; `revoked_units` only rises, and
  never past what is unspent (`countsAgainstGrant`); only a WON dispute lowers it, and then to the refund target alone
  (recomputed, never `revoked - took`), unless another dispute on the payment is open OR lost. Every exit (no lot, lot gone mid-event, normal) moves the dispute row through one upsert (`advanceDispute`), so a dispute keeps closing after a purge. The spent part is NOT
  clawed back: the shortfall is `credit_grants.unrecovered_units`, set (not added) by each event, WRITTEN for the admin
  PR to read (no reader yet). A dispute revokes every unspent
  credit, keeps a `payment_disputes` row (no account id, kept through the purge like `payment_records`;
  `units_revoked` is what THIS dispute took) and sets `stripe_customers.purchase_blocked_at`. The lot-revoke is a SNAPSHOT at the event: credits freed afterwards by failed runs stay spendable (known,
  accepted). A win recomputes as above; a loss stays revoked. The dispute row is the state machine (`planDispute`), so a
  `closed` before its `created` cannot revoke a won dispute. **The block is cleared only by an admin**: Let them buy on
  `/admin/payments` (`clearPurchaseBlock`, `src/lib/payments/clear-block.ts`, admin plan A3) nulls it under a row lock and
  writes one `purchase_block_cleared` event in the same transaction; a repeat clears and records nothing. The block is set
  when a dispute is created and again when one is lost, so clearing it while one is still open is allowed, and the press
  says how many are and that losing one pauses buying again. A payment's refund is read off its own
  record (`payment_records.refunded_cents`, capped at the payment), so a purged account's refunds and an unattributed payment's refund still count on the tab. `createPackCheckout` (the one place a Session is made) refuses as
  `blocked`, and `buyPackAction` reads the same helper first; a Session made before a dispute still fulfils when paid; credits already held keep spending. Dashboard: add the three events to the
  endpoint. `pnpm reconcile:payments` is read-only and dry-run only: the last 72 hours of paid `the-99` PaymentIntents
  with no record, and records or pack lots with no paid PaymentIntent, as counts and ids; `RECONCILE_TARGET_BRANCH`
  must equal the database's `neon.branch_id`, and production or staging also need `RECONCILE_READONLY_OK=<branch id>`.
  Proof: `pnpm probe:payments-webhook` (cases j to q).

## From AGENTS.md (moved 2026-10-28)

The rule-form bullets `AGENTS.md` carried for this area until 2026-10-28, verbatim. Where they and the text above differ in wording, both are current.

- **Paid credits in the ledger**: `credit_grants` holds one row per lot (`welcome`, `plan`, `gift` or `pack`); `reserveModelCall` funds from the free allowance, then a welcome lot, a plan lot, a gift lot, a pack lot, else refuses. **"Paid" is `PAID_SOURCES` (plan, pack) everywhere**, never "not welcome": a welcome lot and an admin's gift (`grantGift`, `src/lib/admin/gift.ts`: never expires, idempotent on `gift:<actionId>`, one `credits_granted` event in the same transaction) are held and spent but never bought. **The welcome lot** (`WELCOME_CREDITS_ENABLED`, needs `PAYMENTS_ENABLED`) is 15 credits written once per account by `grantWelcome` on Clerk's `user.created`, expiring 30 days after the ACCOUNT was created; the held count is `heldCredits`; what a reader is told about it is `welcomeState` over `readWelcomeLot`, the one read that tells used up, expired and no lot apart. **"Out of credits" is decided in one place**: `hasCredit`, `freeRoom`, `freeCount` in `allowance-rule.ts`; `src/lib/model/credit-gates.test.ts` fails on any other comparison of `used` against `limit`. Purged with the account. Proof: `pnpm probe:payments-ledger`.
- **Stripe, the webhook half**: `stripe` and the API version are pinned EXACTLY. Test mode everywhere but production, with a RESTRICTED key (`rk_`). `POST /api/stripe-webhook` is authorized only by the signature over the RAW body. The Stripe account is SHARED with Concert Crawl, so every Session this app creates MUST carry `metadata.app = "the-99"`, and a Session without it is answered 200 and left alone, never 503. A completed Checkout is a TRIGGER: `fulfilCheckoutSession` retrieves the Session and `decideFulfilment` grants only what it validates; a disagreement is refused and logged, never fixed. `pnpm check:payments-reads` fails on `stripe` imports outside `src/lib/payments/`. Proof: `pnpm probe:payments-webhook`. Pack Prices must be tax-EXCLUSIVE (Checkout uses Stripe Tax; an inclusive Price is refused as `amount`); Checkout creation (K1b) is in `docs/agents/payments.md`. **Refunds and disputes** (`reverseCharge`): a charge is ours only by a `payment_records` row, a refund revokes the UNSPENT part from the charge's cumulative figure (`revoked_units` only rises, the spent shortfall is written to `unrecovered_units` for the admin PR, no reader yet), a dispute revokes the lot as a snapshot at the event and sets `purchase_blocked_at` (cleared only by an admin's Let them buy on `/admin/payments`, `clearPurchaseBlock`, which records `purchase_block_cleared`; enforced in `createPackCheckout`), only a WON dispute lowers `revoked_units`, to the refund target, and `pnpm reconcile:payments` is read-only. A refund's cumulative figure is also kept on `payment_records.refunded_cents` (monotonic, account-free), so it survives the purge and covers a payment with no lot. **The monthly plan** (`STRIPE_PRICE_PLAN_60`, `PLANS`, `subscriptions`) rides the same webhook: `invoice.paid` grants a 60-credit `plan` lot per invoice (`credit_grants.external_id` = the invoice id, `billing_reason` stored), `customer.subscription.updated`/`deleted` apply `planExpiry` to the live plan lots, all judged on the RETRIEVED objects under a per-subscription lock (`subscribe.ts`, `subscription-rule.ts`). **In-app cancel, keep and Update card** (`cancelPlanAction`, `keepPlanAction`, `manageCardAction`) re-read the subscription or Customer from Stripe and check `metadata.app`/`user_id` before writing, write nothing of ours (the webhook is the one writer), and need the key's Subscriptions and Customer portal WRITE plus the plain env var `STRIPE_PORTAL_CONFIG` (a `bpc_` id; unset means `unconfigured`, never the default configuration); proof `pnpm probe:plan-cancel`.
