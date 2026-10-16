# Brief: Buying credits (packs, the plan, cancelling)

2026-10-16. Payments lane (p1), for Design. The engineering half is being built now, behind `PAYMENTS_ENABLED`; no screen draws any of it, and none will until this brief has a handoff with a READINESS verdict.

**Sources.**
- The payments scope, `boards/scope-payments-2026-10-13.md`: §8 (screens), §5 and §6 (security, refunds, disputes, deletion), and "Hugh's answers" (all 16 questions answered, quoted where they bind a screen).
- `AGENTS.md`, under "Paid credits in the ledger" and "Stripe, the webhook half".
- The code: `src/lib/model/allowance-rule.ts` (`Allowance`, `hasCredit`, `freeRoom`, `freeCount`), `src/lib/model/credit-rule.ts` (paid lots), `src/lib/payments/` (packs, fulfilment), `src/lib/copy/credits.ts` and `src/components/ui/credits-text.tsx` (the one credit line every spending surface draws).

**What this brief asks.** Where buying lives, every state each piece has, and how each reads on phone and desktop. One Design round is proposed; the scope's §9 split into U1 and U2 is an engineering split, not a Design one.

**No payment form is drawn.** Paying happens on Stripe's hosted Checkout page, which we do not design. Card details never touch this app. Our screens are everything before the hand-off and everything after the return.

## The problem

Every tool that calls a model spends a credit: Suggested changes, the deck synopsis, Proposed cuts, Help me choose's read, the intake read. Today a player gets a free daily allowance and nothing else. When it runs out, the press is disabled and the line says when the next credit comes back. There is no way forward.

Hugh's answer (Q1): sell more, in two ways, beside the free allowance that stays as the teaser.

## Rulings that bind the screens

Quoted from "Hugh's answers (2026-10-13)" unless marked.

- **Three sources of credits.** The free daily allowance; one monthly plan; one-time packs. 1 credit is 1 run, for every tool. No Eco mode.
- **Prices, a starting point** (Q3; credits may later be raised, never cut):
  - Plan: **$5 a month for 60 credits.**
  - Pack: **$5 for 40 credits, which never expire.**
  - Free: drops to 1 a day once per-group allowances exist (Q16; a separate line, not this one). Friends' groups keep more (5, 3).
- **Plan credits roll over with no cap while subscribed.** After a cancel they last **until the end of the paid period, then expire.** Expiry must be stated **on the purchase page, at cancel time, and before it happens.** **Cancelling stays one obvious tap.**
- **Pack credits never expire** (Q8).
- **Spend order** (engineering, `credit-rule.ts`): free allowance first, then plan credits (soonest to expire first), then pack credits. A failed run gives its credit back to whichever source paid for it, automatically.
- **A daily paid limit: 20 paid credits per player per day**, overridable per group in /admin. The free allowance counts separately, and the unspent balance stays banked. (Not built yet; it is part of this line.)
- **No app-wide monthly cap once payments ship** (Q9). The current "Paused until November 1" state retires with it, so this brief does not redraw it.
- **US only at launch** (Q4), enforced by Stripe. A non-US card is refused on Stripe's page, not ours.
- **Refunds by email** (Q5): unused packs and a plan's first month are refunded in full within 14 days; used credits are not; failed runs already refund themselves. The address is the app's support alias (support@the-99.dev, a Hugh setup task). No refund button in the app at launch.
- **A chargeback blocks buying until resolved, and revokes the credits it bought** (Q11). The free allowance and all data stay untouched. Hugh clears the block by hand.
- **Unspent credits are forfeited when an account is deleted** (Q7). The purchase page says so before payment, and the delete flow warns again when there is a balance.
- **No gifting** (Q15).
- **Payments open to Hugh's group first** (Q13), through the switch's group overrides. With the switch off for a reader, **nothing about buying is drawn at all**: not a disabled button, not a teaser.

## What the server can tell a screen

`Allowance` today carries `used`, `limit`, `nextAt` (when the next free credit comes back), and, while the player holds paid credits, `plan` and `pack` (credits left in each). This line adds, for the billing page:

- **The plan's state:** none; active (renews on a date); cancelled (credits last until a date); past due (a renewal failed and Stripe is retrying, see below).
- **Plan credits left, and when they expire** (only after a cancel).
- **Pack credits left** (never expire).
- **Paid credits used today, against the daily paid limit** (20).
- **Purchase history:** date, what was bought (pack or a plan month), amount, and a link to Stripe's receipt.
- **Blocked:** true while a dispute holds the account.
- **A Checkout's outcome** on return: still processing, added, or cancelled.

Ask for anything else you need and engineering will say whether it can be read.

## The screens

### 1. "Get more credits" wherever credits are counted

Every spending surface draws one credit line through `CreditsText`: `4 of 5 left · reset at 2:01 AM`, and when the free credits are gone, `0 of 5 left · reset at 2:01 AM · What uses credits?`, with the press disabled.

- **Out of free credits, no paid credits, payments on:** the line needs a way forward. Draw where "Get more credits" sits on that line, or beside it. It goes to the billing page (§2).
- **Out of free credits, paid credits left:** the press is NOT disabled; the next run spends a paid credit. Draw how the line says that a press now spends a paid credit, and how many are left (for example plan and pack together, or split). Today this state draws the free count at 0 and nothing else.
- **Daily paid limit reached:** paid credits are banked but today's 20 are used. The press is disabled; the line says when it reopens. Different from "out of credits": the player has credits and must not be told they need to buy more.
- **Blocked by a dispute:** a run can still spend free and banked credits that survived the revoke; only buying is blocked. Draw nothing new on the credit line for this; the block shows on the billing page (§5).
- **Surfaces carrying the line today:** Suggested changes (tuning panel), the deck synopsis (overview), Proposed cuts, Help me choose's read (fits view), the intake read, and the analysis banner, method notice, empty analysis and read band. Phone and desktop for each; engineering will hand over an inventory of routes and widths.

### 2. The Credits and billing page

A new route (for example `/credits`). Reached from the account menu (a new entry beside About and Friends, phone and desktop) and from every "Get more credits".

It holds, in an order Design chooses:
- **Free allowance:** the count and when the next credit comes back.
- **Plan credits** and **pack credits** left. When the plan is cancelled, the plan credits' expiry date sits with them.
- **Today's paid credits** against the daily limit, if Design thinks a reader needs it before they hit it (engineering suggests showing it only when near or at the limit).
- **The plan card** (§3).
- **The packs on sale:** one today ($5 for 40). Draw for one, but a second pack must fit without a redraw. The pack line states, before the press, that pack credits never expire and are forfeited if the account is deleted.
- **Purchase history:** date, item, amount, receipt link (opens Stripe's receipt). Empty state for a player who has bought nothing.
- **Refunds:** one line with the support address and the 14-day rule.
- **States:** never bought anything; plan only; packs only; both; blocked (§5); loading; a read that failed.

### 3. The plan, and cancelling it

**Not subscribed.** The plan card offers $5 a month for 60 credits, and states before the press:
- credits roll over with no cap while subscribed;
- after a cancel, they last until the end of the paid month, then expire;
- the plan renews monthly until cancelled.

The press goes to Stripe Checkout (§4).

**Subscribed.** The card shows the renewal date and the plan credits left, and a **Cancel plan** control that reads as one obvious tap (Hugh's words). Engineering's proposal: the tap opens a short confirm that names the date and the count, for example `Your 74 plan credits last until November 16, then expire. Pack credits are not affected.`, with one confirm and one keep. Design may judge whether that confirm is one tap too many; the ruling requires that the expiry is stated at cancel time, so it has to be said somewhere before the cancel lands.

**Cancelled, still in the paid period.** The card says the plan ends on a date and the plan credits expire then, with a way to resubscribe (which keeps the credits, since the player is subscribed again).

**Before expiry.** The ruling requires a warning before plan credits expire. Engineering proposes a line on the credit line and the billing page from 3 days before the date; Design picks the lead time and where it shows. There is no email.

**Past due.** A renewal failed; Stripe retries for a while. The plan credits stay spendable while it retries. The card needs a state that says the payment failed and offers to update the card (a hand-off to Stripe's own hosted billing page; we draw only the link). If every retry fails the plan ends as a cancel would, at the end of the period already paid.

**Expired.** The plan credits are gone and the card is back to not subscribed. History keeps the months paid.

### 4. Checkout's return states

The player leaves for Stripe's page and comes back to the billing page with an outcome. **The return never grants anything**: credits are added only when Stripe's signed webhook lands, which is usually a second or two later and can be longer.

- **Processing:** back from a paid Checkout before the credits have landed. The page re-reads on its own; draw the state, not a spinner forever.
- **Added:** the credits landed. Name what was added (`40 pack credits added`, or the plan's first 60).
- **Still processing after about a minute:** honest copy that it can take longer, that the player will not be charged twice, and the support address.
- **Cancelled:** the player backed out on Stripe's page. Nothing was charged; the page is as it was, with no alarm.

### 5. Disputed or blocked

A chargeback revokes the unspent credits it bought and blocks buying until Hugh clears it. On the billing page: the buy controls are replaced by one calm line that buying is paused for this account and the support address. The free allowance and every other part of the app work as before. No other page shows it. It is not an accusation; most disputes are a misunderstanding.

### 6. Payments switched off

For a reader with `PAYMENTS_ENABLED` off: no "Get more credits", no account menu entry, and the billing route is not found. The credit lines read exactly as they do today. Nothing to draw, but the handoff should say so, so no surface grows a disabled button.

### 7. The account-deletion warning

Q7 asks the delete flow to warn when a balance would be forfeited. Deletion today happens inside Clerk's hosted account page (`Manage account` in the account menu), which we cannot change. Design's call: either the warning lives on our billing page (a standing line under the balance), or the menu's `Manage account` gains an interstitial when a balance exists. Engineering has no preference beyond the ruling being met before the delete.

## Not in this brief

- The About `credits` entry's edit (About entries are paused for this line; it batches at launch).
- The admin's revenue, grants and manual grant (§8.3 of the scope; the existing admin handoff's patterns cover it, light).
- Per-group free allowances and the drop of the free tier to 1 (Q16; its own line).
- Stage 2: more tiers, yearly billing, the $1 freeze.

## Prior art

Concert Crawl's `design_handoff_monetization_*` set covers failure and receipt states for the same Stripe account; reuse its patterns, not its tiers.

## Copy

All strings here are placeholders and go to `/copy-review`, never to Hugh. US English, no em dashes.
