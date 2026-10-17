# Buying credits UI: build plan

Brief: `docs/superpowers/design-briefs/2026-10-16-buying-credits.md` (rulings closed). Handoff:
`design/design_handoff_the99_buying_credits/` (READINESS Green, Hugh LGTM 2026-10-16; build from
`The 99 - Buying Credits (R1).dc.html` and the seven `R1 - *` boards, with `R2b - Picks.dc.html` superseding the card fan
and R1's menu line; `STATES-buying-credits.md` lists every state and what it must not do). Everything ships behind
`PAYMENTS_ENABLED` (shipped in K1b). Money PRs take clean-after-clean. Test mode only. Phone (390) and desktop (1300)
ship together in every UI PR. No About entry (paused for this line by the brief; batched at launch, see "About").

## What exists today (measured, 2026-10-17, main at 85409aca3)

| Fact | Where |
|---|---|
| `/credits` has no page, no loading, no layout. Only `buyPackAction` exists (`src/app/credits/actions.ts`). K1b's Checkout returns to `/credits?checkout=done`, which is a 404 today. | survey |
| `/credits` is Clerk-protected by default (not in `isPublic`); `nav.tsx` `isActive` is a pure path match, so no tab lights with no change (handoff: "no tab lit"). | `src/proxy.ts`, `components/shell/nav.tsx` |
| One pack: `pack40` (40 units, $5). No plan code exists: no subscription Checkout, no portal, no `STRIPE_PRICE_PLAN_*`. `credit_grants.source` already allows `plan`. | `lib/payments/packs.ts`, `db/schema.ts:2390` |
| `success_url` is `${origin}/credits?checkout=done` with **no Session id** (`checkout-rule.ts:43`). The handoff's G5 reads the Session by id from the URL. | gap, see U1 (E1) |
| `Allowance` carries `plan?` and `pack?` totals only. No paid-used-today, no paid limit (**the 20 a day is not coded anywhere**), no "paid back at", no plan expiry. `reserveModelCall` funds free, then plan, then pack. | `lib/model/allowance-rule.ts:110`, `allowance.ts:270` |
| No per-lot reader reaches a screen (`grantBalances` is internal to `allowance.ts`). No history reader. | `lib/model/allowance.ts` |
| `creditsCopy` has no buy, pack, price or balance keys. The credit line renders through `CreditButton` / `CreditsText` on ~20 files, all fed by `creditsCopy` and `lib/intake/standing.ts`. | `lib/copy/credits.ts` |
| Account menu: identity block (name, email), then theme picker, then rows About / Friends / Manage account / Sign out. Manage account calls `clerk.redirectToUserProfile()` directly. `SocialModal` exists for the deletion warning. | `components/shell/account-menu.tsx`, `components/social/social-modal.tsx` |
| Reusable: `ToastFrame` (`edit-toast.tsx`), the `loading.tsx` re-export pattern, `cuts-panel.tsx`'s injectable `setInterval` re-read, `notFound()` on a switch (`friend/[token]/page.tsx`). | survey |

## Rulings this plan makes, E1 to E10 (the handoff's "settle in the plan" list, G1 to G8; named E so they do not collide with the page frames P1 to P8)

| # | Ruling |
|---|---|
| E1 | **G5, the return.** K1b's `success_url` gains `&session_id={CHECKOUT_SESSION_ID}` (a one-line change in `packCheckoutParams` plus its test). The page reads the Session server-side by id, and refuses it unless `metadata.app = "the-99"` and `metadata.user_id` is the viewer. The Session tells the page what was bought; **our own `credit_grants` row (by the fulfilment's `externalId`) tells it whether it landed.** The page never grants and never trusts the URL: a forged `session_id` of another reader's Session reads as no band. The grant lookup by Session id is **also scoped to `user_id` = the viewer**. Re-read every 2s for a minute, then every 10s, by a client re-read of one server action (the `cuts-panel` pattern: injectable interval, stops on unmount). A failed re-read is the shared `ToastFrame`, band unchanged (R6). |
| E2 | **G1, Allowance and the paid limit (orchestrator's money rules, ruled 2026-10-17).** `Allowance` gains `paidUsedToday`, `paidLimit` (20), `paidBackAt`, `planExpiresAt` (set only after a cancel). **The paid limit is ONE pure predicate in `allowance-rule.ts`**, consumed by `reserveModelCall`; `credit-gates.test.ts` is extended so no other comparison decides it. `paidUsedToday` is counted **under the existing `model-allowance:<user>` advisory lock** (`allowance.ts:293`, `pg_advisory_xact_lock`), in the same transaction as the reserve. **Window and counting follow the free allowance exactly:** the same rolling 24 hours (`ALLOWANCE_WINDOW_MS`, `allowance-rule.ts:72`, read at `allowance.ts:166`; no zone, because the window is rolling, not a calendar day), a `reserved` row counts until `RESERVATION_TTL_MS` (`allowance-rule.ts:154`), a `spent` row counts for the window, a `refunded` row (failed, stopped, `nothing_valid`, `reaped`, `late_success`) does **not** count (`allowance-rule.ts:86`, `RefundReason` at `:106`). A paid row is a `model_calls` row carrying `credit_grant_id`. It never refuses a run the free allowance can fund. This is the money path: clean-after-clean. |
| E3 | **G6, hidden together.** One predicate, `readerSeesCredits(switchOn, held, everBought)`, used by the `/credits` page (`notFound()`) and the menu chip. `switchOn` comes from `paymentsEnabled(await requestSwitchEnv(userId))` for the page, the chip and every action, never `process.env`. Switch off, nothing held, never bought: both absent. Anything held or bought keeps the reduced page (O2 to O4). |
| E4 | **G2/G3, cancel and keep.** Two server actions on Stripe's `cancel_at_period_end`, each re-reading the subscription from Stripe and checking `metadata.app`/`user_id` before writing. Land in the subscription-UI PR (U3), after the subscription PR exists. The restricted key gains Subscriptions write (Hugh sets it; name, scope and Sensitive stated, never a file). |
| E10 | **Where Stripe is read, and how the chip stays fresh.** Every Stripe read (the Session, `receipt_url`, the portal, cancel and keep) lives in `src/lib/payments/` (`check:payments-reads`). The menu chip is read **per request, outside every `cachePageForUser` payload** (a `PER_REQUEST_READS` entry in `scripts/lib/list-cache-tables.mjs` if `check:list-cache` needs one). A layout does not re-render on navigation, so the chip refreshes through a small server action it calls on menu open and after a spend or a return from Checkout (the same re-read the credit line's surfaces already do after a run), never from a cached layout value. |
| E5 | **G4, Update card (portal; d9's ruling 2026-10-17: the Stripe account is shared with Concert Crawl, so the dashboard's default portal configuration is neutral).** A server action in `src/lib/payments/` creates `billing_portal.sessions.create` with **its own `return_url` (`APP_ORIGIN` + `/credits`) on every call** and **`configuration: STRIPE_PORTAL_CONFIG`**, a The-99-specific configuration: header "The 99", invoice history on, payment-method update on, billing address only, cancel off (cancel lives in the app), plan switching and quantity off. **Choice: Hugh creates that configuration once with the Stripe CLI (`billing_portal configurations create`, metadata `app=the-99`, the features above; the dashboard edits only the account's default configuration and cannot create a second) and sets its id (`bpc_...`, not a secret) as the plain env var `STRIPE_PORTAL_CONFIG`; the code does not create configurations.** Reason: no runtime write path to portal configuration, no idempotent-create race, and the restricted key needs only **Customer portal: Write** (already being added) for `sessions.create`. A missing or unset `STRIPE_PORTAL_CONFIG` makes the action answer `unconfigured` and the press absent, never a fall-back to the neutral default. Lands with U3. |
| E6 | **G7, the interstitial.** `Manage account` opens `SocialModal` first when paid credits are held (switch on or off), else goes straight to Clerk. Lands in U5. |
| E7 | **G8, `first month`.** History labels the first invoice by Stripe's `billing_reason: subscription_create`, stored on the grant at fulfilment (the subscription PR adds the column); no later guess. |
| E8 | **History needs a reader.** `listCreditHistory(userId)` in `src/lib/payments/` (grants joined to nothing else): pack, plan month, refund or revocation rows. Receipt links: a Charge's `receipt_url`, fetched server-side per row on demand and never stored. |
| E9 | **Copy.** Every string in `buying-credits · copy strings.ts` is a placeholder. Each UI PR runs `/copy-review` on its strings (the lane resolves it; copy never goes to Hugh) before the PR opens. |

## PR order (no stacking: each cut from fresh `main` after the last merges)

**U1 and U2 ahead of the Subscription PR is the orchestrator's ruling (2026-10-17).** Reason: U1 makes the Checkout K1b built reachable, and U2a/U2b are independent of the plan.

The handoff's UI splits against the payments webhook line's existing order (subscription, K2, R, A). One at a time:

| # | PR | Contains | Frames | Bar |
|---|---|---|---|---|
| **U1** | **`/credits` with the pack Buy and Checkout's return** | `src/app/credits/page.tsx` + `loading.tsx` + the return band; P1 (total over Free/Plan/Packs cells, only cells for sources held or once held), P2, P3/P4 variants (without a plan offer yet), **P8 (a second pack card: the layout check, proven with a second fixture pack in the page's contact-sheet fixture)**, P6 loading, P7 read-failed, the `pack40` offer and its Buy press (`buyPackAction` with a per-press uuid; ToastFrame for `off`, `throttled`, `failed`, `unverified`, `unconfigured`, and the `off` outcome reads as the page leaving the offer, never a disabled press), refund line, history (E8); return R1 to R6 (E1); G6 `notFound()` (E3); **every buying offer is gated on the switch, and O4 (packs only, no offers section) lands here**; K1b's `session_id` change; `creditsCopy` additions for the page; the page's inventory JSON. **The staging purchase is Hugh's walk, never a lane write.** | P1 to P4, P6 to P8, R1 to R6, O1, O4 | clean-after-clean |
| **U2a** | **The paid-limit rule and the Allowance fields (no UI)** | E2: the one predicate in `allowance-rule.ts`, `reserveModelCall`'s paid branch, `paidUsedToday` counted under the allowance advisory lock, the four `Allowance` fields (`planExpiresAt` stays unset until the Subscription PR fills it), `credit-gates.test.ts` extended, a ledger probe on a scratch branch (`probe:payments-ledger` extended). **Production `PAYMENTS_ENABLED` waits until U2a has merged.** | none | clean-after-clean (money path) |
| **U2b** | **The credit line, the chip and the meter** | `creditsCopy` `withPaid`, `paidNext`, paid `first`/`again`, `limit`, `limitFree`, `expiring`, `getMore`; L1 to L6 and L8 across every `CreditButton` surface; the menu chip M1b in four states, read per request (E10); the `/credits` daily-paid line and meter (P5, P5b). **L7 and the chip's expiring state are drawn and tested from a fixture here and proven live in U3**, once the Subscription PR fills `planExpiresAt`. | L1 to L6, L8, A1/A2, M1b, P5, P5b | clean-after-clean |
| Sub | Subscription webhooks + plan Checkout | the existing p1 plan (`invoice.paid`, `customer.subscription.updated/deleted`, `STRIPE_PRICE_PLAN_60`, `first month` column, fills `planExpiresAt`) | none | clean-after-clean |
| **U3** | **The plan card** | K1 to K6: Subscribe, Cancel plan (one tap), Keep my plan, Update card, past due, expired; plan offer on P1; R3 "Plan started"; **`probe:plan-cancel`: cancel and keep re-read Stripe's subscription and check `metadata.app`/`user_id` before writing**. | K1 to K6, R3, **L7 and the chip's expiring state, proven live** | clean-after-clean |
| K2 | Refunds and disputes | `charge.refunded`, `charge.dispute.*`, the purchase block, `reconcile:payments` | none | clean-after-clean |
| **U4** | **Blocked and off** | B1 (the pause band), O2 and O3 (reduced page: plan management stays, `Keep my plan` goes); **`probe:payments-reduced`: the readerSeesCredits predicate and the reduced page over every switch/held/bought combination**. | B1, O1 to O4 | clean-after-clean |
| R | Customer delete on account deletion | per the p1 plan | none | clean-after-clean |
| **U5** | **The deletion warning** | D1/D2 `SocialModal` interstitial on Manage account when paid credits are held (E6); **`probe:delete-warning`: shown only with paid credits, switch on and off, never without**. | D1, D2 | clean-after-clean |
| A | Admin revenue, grants, disputes, manual grant | per the p1 plan, **plus the brief's "20 paid a day, overridable per group in /admin"** (a group's paid-limit field beside its allowance, read by the E2 predicate) | admin | clean-after-clean |

Why this order: U1 first because it is the smallest thing that makes a real purchase work (the Checkout the K1b PR built returns to a 404), and everything after reads its page. U2 second because the credit line is the money path (the 20-a-day rule) and touches every spend surface; it is split so the rule (U2a, no UI) is reviewed on its own and the ~20 surfaces (U2b) are reviewed as copy and presentation. U3, U4 and U5 each need a server half that must exist first (the subscription, the dispute block, nothing for U5 but it reads best after R so the "forfeited" sentence and the Stripe Customer delete land together). Each PR is under ~20 files and ~800 lines.

## Readiness audit (against the rebased tree, 2026-10-17)

**Verdict: Green for U1, U2a and U2b; the later UI PRs are blocked only on their own server halves, as sequenced above.** Findings the handoff did not name, each settled here:

1. **The return has no Session id** (P1). The handoff assumed one. Fixed in U1.
2. **The 20-a-day paid limit is not in the code** (E2). The handoff and brief state it as a ruling; the scope board (`boards/scope-payments-2026-10-13.md`) records Hugh's answer. U2a builds it.
3. **No history source exists** (E8). The handoff draws history rows with receipts; U1 builds `listCreditHistory` and the receipt read.
4. **Plan art and the crown's diamond.** R2b's diamond is CSS only, no images and no new tokens (the handoff's own rule). Reuse the existing mark where the app has one; otherwise it is a CSS glyph in `--accent`.
5. **Pack Buy wires a real Stripe Session.** On staging this uses Hugh's test keys; a probe cannot press it. The test purchase is the proof, walked on staging with Stripe's test card, and the signed-fixture probe covers the return.
6. **The fixture figures** (117 credits, November 16) are illustrative; no measurement is claimed.
7. Concert Crawl's monetization handoffs are not in this repo; nothing is taken from them.

## Route x viewport inventory

Authored as `docs/superpowers/inventories/buying-credits.json` in U1 (and extended per PR), photographed by `scripts/contact-sheet.mjs` at 390 and 1300 into one image.

| Surface | Route | Widths | PR |
|---|---|---|---|
| Credits, never bought | `/credits` | both | U1 |
| Credits, packs; a second pack (P8) | `/credits` | both | U1 |
| Return: processing, added, still processing, cancelled | `/credits?checkout=done&session_id=...` / `?checkout=cancelled` | both | U1 |
| Read failed, loading | `/credits` | both | U1 |
| Not found (switch off, nothing held); packs-only offers absent (O4) | `/credits` | both | U1 |
| Credit line L1 to L6, L8 on CreditButton (L7 from a fixture) | each spend surface in the existing inventory (read band, Fits, tuning panel, Suggested changes, synopsis, intake) | both | U2b |
| Menu chip, four states (expiring from a fixture until U3) | account menu | popover (1300), sheet (390) | U2b |
| Paid-today line and meter | `/credits` | both | U2b |
| Plan card states K1 to K6, R3, **L7 and the chip's expiring state, proven live** | `/credits` | both | U3 |
| Blocked, off (O1 to O4) | `/credits` | both | U4 |
| Deletion warning | Manage account interstitial | modal (1300), sheet (390) | U5 |

**Themes.** The contact sheet carries a second pass in Low Sun beside Neon Rain for U1's page and U2b's line and chip (R1b: the expiring state is carried by the line under the chip, not the colour, because `--warning` and the accent are close in hue there). Witching Hour and First Frost are checked once at U3 when the plan card lands.

`pnpm check:shared` applies where one control is drawn on several routes: the credit line is one component on every spend surface (U2b proves import-equality against `CreditButton`).

## Proofs

- U1: `probe:credits-return` (signed webhook fixture, a forged `session_id` of another reader's Session reads as no band, the grant by `externalId` flips processing to added, the re-read cadence pinned through the injectable interval); `buyPackAction` outcomes each have a visible message; the switch-off page is `notFound()`; an emitted-SQL test for the history reader (`.toSQL()`, qualified columns).
- U2a: allowance rule tests for the 20-a-day limit (never blocks a free-funded run; free spent and paid at the limit refuses; the reset time is the earlier of next free and the limit's reset), `credit-gates.test.ts` extended.
- Every UI PR: `design-review` (property table enumerate, verify, confirm) before `gh pr create`, `feature-acceptance` per PR and again at the line's close-out; `/copy-review` on each PR's strings (E9).
- Every money PR: pre-open pass, then clean-after-clean on Copilot, with the PR body's `## Settled` carrying anything pushed back.

## About

The `credits` About entry's edit is **deferred, with a reason**: the brief pauses About entries for this line, to be written once at the end of the launch (one `ABOUT_VERSION` bump), and the close-out does not pass without it. It is a named task of the last UI PR (U5) or the line's close-out, whichever lands last.

## Owed from Hugh (name, scope, Sensitive; never through a file)

- `STRIPE_PRICE_PLAN_60` (when the Subscription PR starts), restricted key Subscriptions write and `STRIPE_PORTAL_CONFIG`, the id of a The-99 portal configuration made once with the Stripe CLI (U3, E5), all in test mode. Pack Price, key, webhook secret are already set on staging (d9 verified a signed webhook end to end).
- `PAYMENTS_ENABLED=true` on staging for the walk.
