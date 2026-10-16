# Readiness audit · Buying credits R1

2026-10-16 · PR #1946 · handoff `design/design_handoff_the99_buying_credits/` (`README.md`, `READINESS.md`,
`STATES-buying-credits.md`, `buying-credits · copy strings.ts`, the main board, the seven `R1 - *` boards,
`R1b - Themes`, `R2 - Options`, `R2b - Picks`) · brief `docs/superpowers/design-briefs/2026-10-16-buying-credits.md`
(#1932) · `AGENTS.md` "Paid credits in the ledger" and "Stripe, the webhook half" · `docs/agents/payments.md`.

I audited this independently of Design's `READINESS.md`, against the tree at `origin/main` 33bb5af39, which is the
handoff branch's merge base, so nothing has landed since that changes a claim below.

## Verdict: 🟡 Yellow

The brief's seven screens are drawn at 390 and desktop, and every state the brief names has a frame. Every locked
ruling holds, including Hugh's four R2/R2b picks (inline cancel with `Keep my plan`, the identity-block chip, the
3-day warning, the crown's diamond). No string carries an em dash, and the About entry is a stated deferral. Credits
cover model runs only; nothing gates a card image, a price or any card data. Eleven gaps remain. Engineering resolves
nine of them without another Design round, and the resolutions below bind the plan unless Hugh overrules one. Two are
Hugh's: whether the monthly spend cap can stop a reader who holds paid credits (gap 10), and whether the
deletion warning names the plan's first-month refund (gap 11, which /copy-review can settle once Hugh rules on the
refund promise). Neither blocks the build.

## Coverage against the brief

| Brief state | Drawn | Note |
|---|---|---|
| §1 Free left, nothing bought; free left, paid held | L1, L2 | `left` turns to `free` only once paid is held |
| §1 Free spent, paid held (press live) | L3, Surfaces L3 | `first` / `again` say `uses a paid credit`; no color change |
| §1 Nothing to spend, payments on | L4, Surfaces L4 | `Get more credits` on its own line under the shipped `spent` line |
| §1 Daily paid limit reached, free spent; a free credit back | L5, L6 | Never `Get more credits`, never `--danger`; the free run is not blocked |
| §1 Before plan expiry | L7, K4, chip | 3 days, `--warning`, plan credits only |
| §1 Blocked | (no frame, by the brief) | Nothing new on the line; `Get more credits` still leads to `/credits` |
| §1 Surface inventory | Surfaces table | All nine named surfaces listed: Suggested changes, synopsis, Proposed cuts, Help me choose, intake, analysis banner, method notice, empty analysis, read band |
| §2 `/credits`: never bought, plan only, packs only, both | P2, P3, P4, P1 | A cell is drawn only for a source held or once held |
| §2 Paid today near and at the limit | P5, P5b | From 15 of 20, as engineering suggested |
| §2 Loading; a read that failed; a second pack | P6, P7, P8 | |
| §2 History and its empty state; refunds line | P1, P2 | |
| §3 Not subscribed; subscribed; cancelled; past due; expired | K1, K2→K3, K3, K5, K6 | Option A built; option B drawn for the record only |
| §4 Processing; added (pack, plan); still processing; cancelled on Stripe | R1, R2, R3, R4, R5 | R6 is a failed re-read, the shared ToastFrame |
| §5 Blocked | B1 | One pause band in place of the buy controls; plan management stays |
| §6 Off, never paid; off with a plan, cancelled, packs only | O1, O2, O3, O4 | Absent, never disabled; `Keep my plan` goes when off (it is a purchase) |
| §2 Menu entry | A1, A2, R2b M1b | Four chip states: holding, never bought, out of credits, expiring |
| §7 Deletion interstitial | D1, D2 | Sheet on the phone, 440 modal on desktop; switch on or off |

Errors the boards do not draw are gap 3.

## Locks, checked

- **Three sources, 1 credit is 1 run, no Eco mode:** the page sub `1 credit is 1 run of any tool`; cells Free, Plan, Packs.
- **Prices:** plan $5 a month for 60 (K1), pack $5 for 40 (pack card). `packs.ts` holds $5 for 40.
- **Plan credits roll over with no cap while subscribed, expire at period end after a cancel, stated on the purchase
  page, at cancel and before it happens; cancel is one obvious tap:** K1's four lines before `Subscribe`; `cancelSays`
  under the full-size neutral `Cancel plan` before the tap; K3 and `endedSays` after it; L7, K4 and the chip 3 days out.
- **Packs never expire:** `packsSub`, `pack.fine`.
- **Spend order free, plan, packs:** `Spent in this order` over the three cells; the line spends free first (L3).
- **20 paid a day, never blocking a free run:** L5, L6, P5, P5b.
- **No app-wide cap:** the `Paused until November 1` state is not redrawn (but see gap 10).
- **US only on Stripe's page:** `Checkout on Stripe · US cards`; no card form is drawn.
- **Refunds by email, 14 days, no refund button:** `page.refunds`.
- **A chargeback blocks buying and revokes what it bought; free and data untouched; no accusation:** B1, `page.blocked`.
- **Forfeit on deletion, said before payment and at deletion:** K1's fourth line, `pack.fine`, D1, D2.
- **No gifting:** nothing drawn offers one.
- **Switch off draws nothing, never a disabled button:** O1 to O4, STATES "must not" columns.
- **Hugh's R2/R2b picks (2026-10-16):** cancel A; the chip in the identity block, no new row; warning at 3 days;
  offer art the crown's diamond; plan and pack cards equal height side by side on desktop.
- **Credits cover AI tools only (Hugh's constraint):** every surface in the inventory is a model run; the menu chip
  and `/credits` gate nothing; no board puts a card image, price, card detail, collection or deck behind credits.
  Card art was dropped from the offers (R2b, C and D withdrawn). `credit-gates.test.ts` already confines the
  "out of credits" decision to `allowance-rule.ts`, so the gate cannot spread without a failing test.
- **About:** no entry and no `ABOUT_VERSION` bump. README "Not drawn", READINESS "Not in this round" and the PR body
  each state it as paused for this line and batched at launch, as the brief rules.
- **Assets:** nothing from `design/` is copied into `public/`; the diamond is drawn from the brand crown.

## Copy

- **Em dashes:** none, in every board, the README, STATES, READINESS and the copy strings file.
- **US English:** no British spelling in the copy strings file. `cancelled` and `cancelling` are the double-L US
  variant and the app's house spelling (69 uses of `cancelled` under `src/components` and `src/lib/copy`), so they
  stay for consistency. `grey` appears once, in board prose (`not a grey link`), and does not ship.
- **To /copy-review with the file:** `del.refund` (gap 11); `del.says`' second sentence (`Nothing else in Manage
  account touches them.`) reads as unclear; `ret.procSays` claims `Payment received`, which is true only when the
  session read says paid (gap 6); the strings gap 3 adds.

## Code claims I checked

- **The credit line.** `Allowance` (`src/lib/model/allowance-rule.ts`) carries `used`, `limit`, `nextAt`, `paused`,
  `ownerShare`, and `plan` / `pack` while a lot is held. `creditsCopy` (`src/lib/copy/credits.ts`) has `first`,
  `again`, `spent` and `clockTime`; `CreditsText` is the one line. G1's additions are new.
- **The ledger.** `credit_grants` holds `plan` and `pack` lots, `expires_at` null until a cancel, `revoked_units`,
  and `external_id` unique. `reserveModelCall` funds free, then plan (soonest to expire), then pack.
- **Stripe.** `fulfilCheckoutSession` grants packs only: `decideFulfilment` refuses `mode: "subscription"` as
  `not_payment_mode` (`fulfil-rule.test.ts`). There is no subscription handling, no Checkout builder (K1b), no
  customer-portal session and no cancel call in `src/lib/payments/`.
- **The switch.** There is no `PAYMENTS_ENABLED` in `src/lib/switches/registry.ts` yet.
- **History.** `payment_records` holds no account id and is kept through the purge; `stripe_customers` maps an
  account to its Stripe customer and is purged.
- **Shared surfaces.** `account-menu.tsx` renders About, then Friends and Admin where they apply, then Manage account
  and Sign out, with the email in the identity block. `SocialModal` (`social/social-modal.tsx`) and `ToastFrame`
  (`collection/edit-toast.tsx`) exist.
- **Themes.** `contract.test.ts` expects six: amonkhet (Low Sun), kamigawa (Neon Rain), ixalan, phyrexia, eldraine
  (Witching Hour), kaldheim (First Frost). `--warning` is `#E0913C` in five themes and `#DEAA29` in amonkhet.

## Gaps, and engineering's resolution

1. **Two of six themes are not drawn.** The boards draw Neon Rain, and R1b draws Low Sun, Witching Hour and First
   Frost. Ixalan and Phyrexia are not drawn.
   - **Resolution:** every color on the boards is a theme token and no token is new, so the two undrawn themes follow
     from their tokens. The one hue risk Design found (`--warning` against the accent in Low Sun) does not recur:
     `--warning` `#E0913C` sits well apart from Ixalan's `#A3C445` and Phyrexia's `#52827A`. The feature's
     contact sheet covers all six themes at both widths, and the expiring state carries its line under the chip in
     every theme, not color alone.
2. **The README's opening still describes the card fan.** "The pack and plan art is the brand fan ... in CSS"
   predates R2b.
   - **Resolution:** build from `R2b - Picks`, as the README's own table and the PR body say. The stale sentence is
     fixed on this branch before merge, as a doc edit with no Design round.
3. **Our own failures are not drawn.** Stripe's failures are Stripe's page, but four presses call our server and can
   fail: starting a Checkout (`Subscribe`, `Buy 40 credits`), `Cancel plan`, `Keep my plan`, and `Update card`.
   Nor is a refusal drawn for a stale page (a blocked account, payments switched off, or a plan already active in
   another tab).
   - **Resolution:** R6's pattern: the shared ToastFrame with the failure and a retry, the card unchanged, no page
     error. A refusal re-reads the page so it shows the true state (B1, the reduced page, or K2). Strings go to
     /copy-review.
4. **The plan has no backend (G2, G3, G4, G8).** Subscription Checkout, its webhooks and the lots they write do not
   exist.
   - **Resolution:** the plan names them as tasks: a subscription Checkout tagged `metadata.app = "the-99"`; the
     invoice and subscription events granting a `plan` lot per paid period and setting `expires_at` on
     cancel-at-period-end; `Cancel plan` and `Keep my plan` as server actions toggling cancel-at-period-end (no
     Checkout, no charge); `Update card` as a customer-portal session limited to the payment method; `first month`
     from the first invoice's billing reason. Past due reads Stripe's subscription status; plan credits keep
     spending while it retries. All Stripe calls stay under `src/lib/payments/` (`check:payments-reads`).
5. **The page's read (G1, G6).** `Allowance` gains paid used today, the paid limit, when paid is back and the plan's
   expiry; the page also needs the plan's state, the blocked flag and history.
   - **Resolution:** the daily paid limit (20, per-group override in /admin) is built in this line, and enforced in
     `reserveModelCall` beside the lot choice, so `hasCredit` stays the one decision. History is read from Stripe by
     the reader's `stripe_customers` id (charges and invoices, with Stripe's receipt URL), since `payment_records`
     holds no account. A refunded row shows as Stripe reports it, with a string for /copy-review. "Ever bought"
     (G6) is a `stripe_customers` row or any `credit_grants` row. `/credits` is not found, and the chip is absent,
     for a reader with the switch off and neither.
6. **The Checkout return (G5).** The return grants nothing. It reads the Session by id from the success URL, under
   the signed-in reader, and shows R1 only when the Session reads paid, so `Payment received` is true. It re-reads
   every 2s for a minute, then every 10s (R4), and stops on `added` or leaving the page.
7. **Blocked has no store.** Nothing records a dispute yet.
   - **Resolution:** a per-account block row written by the dispute webhook, which also revokes the disputed lot's
     unspent units, and cleared by Hugh in /admin. The purge covers it (`purge.test.ts` fails until it does). Every
     buy action refuses while it stands.
8. **The switch.** `PAYMENTS_ENABLED`, a `feature` switch opened to Hugh's group first through group overrides. Off
   for a reader with nothing bought: nothing is drawn (O1). Off with a plan, balance or history: the reduced page
   (O2 to O4). The webhook reads no switch, as shipped.
9. **The Manage account interstitial (G7).** Shown on every `Manage account` press while paid credits are held,
   whatever the switch, else straight to Clerk. Clerk's hosted account page stays reachable without it by URL; the
   brief accepts that, and the purchase page states the forfeit before payment.
10. **The monthly spend cap can stop a reader who paid. Hugh's call.** Today `paused` refuses a press whatever the
    credits (`allowance-rule.ts`). The brief retires the cap once payments ship, but payments open to one group
    first, so the cap still guards everyone else's free runs.
    - **Engineering's default, unless Hugh overrules:** a run a paid credit funds is never paused; the cap keeps
      pausing free-funded runs until payments are on for everyone, then retires. No new screen: a reader with paid
      credits gets L3, and one without gets today's paused line.
11. **The deletion warning's refund line names packs only. Hugh's call on the promise, then /copy-review.**
    `del.refund` offers a refund for an unused pack bought in the last 14 days. The brief's rule also refunds a
    plan's first month in full within 14 days, and `page.refunds` says so.
    - **Engineering's default:** the interstitial states the same rule as `page.refunds`, so the two never disagree.

## Before build

- /copy-review of `buying-credits · copy strings.ts`, with the Copy section and gaps 3 and 11.
- Hugh's calls: gap 10 (does a paid run ever pause) and gap 11 (the refund promise at deletion). Both have a default
  and neither blocks the build.
- The plan names as tasks: the subscription backend, the paid daily limit, the block row, the switch, the history
  read, the return's re-read, the interstitial, and the six-theme contact sheet, with the resolutions above. The
  About entry is a stated deferral, batched at launch.
