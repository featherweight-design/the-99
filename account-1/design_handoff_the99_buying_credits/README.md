# The 99 · Buying credits · R1 (for Hugh's audit, 2026-10-16)

Packs, the monthly plan and cancelling it, and every place credits are counted. Payments lane (p1), behind `PAYMENTS_ENABLED`.

Source of truth: `docs/superpowers/design-briefs/2026-10-16-buying-credits.md` (main). "Rulings that bind the screens" is closed and not reopened here; "What the server can tell a screen" is what these boards draw on, and the gaps below say where they ask for more.

**About these files.** The canvases are design references built in HTML. Open them with `support.js` beside them, then rebuild in the app's stack. Kamigawa (Neon Rain) values, as the shipped shell. **No new tokens, no new motion, no new dependencies.** The pack and plan art is the brand fan (three card backs, the front in accent with the count) in CSS: no images.

## Start here

| Read | For |
|---|---|
| **`The 99 - Buying Credits (R1).dc.html`** | **The three calls, every ruling and where it's honoured, the constraints, the gaps.** |
| `R1 - Credit-Line.dc.html` | §1 · the credit line in every state (L1–L8) on the CreditButton, 390 and desktop; the grammar. |
| `R1 - Surfaces.dc.html` | §1 · the line on the outline press (Suggested changes) and the synopsis row; the surface inventory. |
| `R1 - Billing-Page.dc.html` | §2 · `/credits` (P1–P8) at 390 and desktop. |
| `R1 - Plan-and-Cancel.dc.html` | §3 · the tap (K2→K3), every plan state (K1–K6), options A and B. |
| `R1 - Checkout-Return.dc.html` | §4 · R1–R6. |
| `R1 - Blocked-and-Off.dc.html` | §5 (B1) and §6 (O1–O4). |
| `R1 - Menu-and-Delete.dc.html` | §2's entry (A1–A3) and §7 (D1–D2). |
| `STATES-buying-credits.md` | The state matrix, with what each state must not do. |
| `READINESS.md` | The verdict and what blocks the build. |
| `buying-credits · copy strings.ts` | Every new string, for /copy-review. |

## The three open items, called

### 1 · Where the account menu's entry sits
**No new row.** The balance is a line in the menu's identity block, under the email: `◆ 117 credits ›` in accent mono, and the whole line goes to `/credits` (a 44px press on the phone, inside the sheet; a link in the 300px popover on desktop). A reader who has never bought sees `◆ 3 free credits ›` while payments are on for them; with payments off and nothing ever bought, the line is absent.

Why: Hugh's standing rule is not to add rows to the user menu. The balance is a fact about the account, so it sits with the name and email, and the list stays About, Friends, Manage account, Sign out. The brief's row is drawn as A3 for comparison only.

### 2 · How free and paid balances read side by side
- **On a spending surface:** one line, free first (it's spent first), then the paid total as one number: `4 of 5 free · reset at 2:01 AM · 114 paid`. `left` becomes `free` only once paid credits are held; a reader who never bought reads today's line unchanged. Plan and packs split only on `/credits`, where expiry matters.
- **On `/credits`:** one total (`117 credits to spend`) over three cells in spend order (Free, Plan, Packs), joined by the brand diamond and labelled `Spent in this order →`. A cell is drawn only for a source the reader holds or once held.

### 3 · How cancel reads, not buried, not pushy
**Option A (called, drawn on every board):** `Cancel plan` is a full-size neutral button, the plan card's first control, with what it does written directly under it before the press (`Cancelling keeps your 74 plan credits until November 16, then they expire. Pack credits aren't affected.`). One tap cancels. The card turns at once to `Ends November 16` with the expiry restated, and offers `Keep my plan`, which undoes the cancel at no charge until the date. No sheet, no red, no "are you sure", no offer to stay.

The ruling needs expiry stated at cancel time: it is, beside the button before the tap and on the card after it. A mistaken tap costs nothing. Hugh prefers an inline option to an extra step.

**Option B (engineering's proposal):** a confirm sheet with the same words, `Cancel plan` and `Keep my plan`. Drawn beside A on Plan-and-Cancel for Hugh's pick (G10).

## Other calls made on the way

- **`Get more credits` placement:** its own line directly under the credit line, aligned with it (left on desktop; centered on the phone where the surface centers its line). Shown only when nothing can be spent and payments are on. The About link (`What uses credits?`) stays.
- **The paid press:** the `◆ 1 credit` segment is unchanged; `first` / `again` say `uses a paid credit` when the run will spend one. No color change: spending what you bought isn't a warning.
- **Daily paid limit:** shown on `/credits` only from 15 of 20 (engineering's suggestion, kept), as a line with a small neutral meter; at the limit the meter turns `--warning` and the line says nothing banked is lost. Never `--danger`.
- **Expiry warning:** 3 days before the date (G9). The plan card's border and words, the Plan cell and every credit line turn `--warning` (L7, K4).
- **Past due:** the card says the payment didn't go through, credits still work, and `Update card ↗` is the press. Cancel stays one tap as a text button.
- **Checkout return:** a band under the title, above the balance. Processing has a 2px moving bar and re-reads every 2s; after a minute it becomes R4's honest copy and re-reads every 10s. Cancelled is one quiet line with a bare ✕. A failed re-read is transient, so it's the shared ToastFrame.
- **Blocked:** one band with a pause mark, in place of the buy controls. Plan management stays. Nothing anywhere else. `Get more credits` still leads to `/credits`, where the pause is explained.
- **Payments off:** absent, never disabled. The reduced page keeps balances, Your plan (Cancel plan, Update card), history and the refund line; `Keep my plan` is a purchase and goes too.
- **Deletion warning:** the SocialModal (sheet on phone, 440 modal on desktop), titled with the paid total, a split by source, the forfeit sentence, a pointer to the 14-day refund, and one `Continue to Manage account` press. Shown on every Manage account press while paid credits are held, switch on or off.
- **Page title:** `Credits`, with `1 credit is 1 run of any tool · What uses credits?` under it. No tab lit in the bar.

## Gaps

| # | Gap | Who |
|---|---|---|
| G1 | `creditsCopy` gains `withPaid`, `paidNext`, paid forms of `first` / `again`, `limit`, `limitFree`, `expiring`, `getMore`. `Allowance` needs paid-used-today, the paid limit, when paid is back, and the plan's expiry (after a cancel). | Eng |
| G2 | Cancel from our page in one tap: a server action setting Stripe's cancel-at-period-end, not a trip to Stripe's portal. | Eng |
| G3 | `Keep my plan` during the paid month clears cancel-at-period-end (no Checkout, no charge). After the date, subscribing is a new Checkout. | Eng |
| G4 | `Update card` opens a Stripe customer-portal session limited to the payment method. | Eng |
| G5 | The return reads the Checkout session by id from the success URL; re-read every 2s for a minute, then every 10s. | Eng |
| G6 | `/credits` is not found for a reader with the switch off and no plan, balance or purchase. The menu line follows the same test. | Eng |
| G7 | `Manage account` opens the interstitial when paid credits are held (switch on or off), else goes straight to Clerk. | Eng |
| G8 | History says `first month` for the subscription's first invoice (Stripe's billing reason). | Eng |
| G9 | Expiry warning lead time drawn at 3 days. Confirm, or name another. | Hugh |
| G10 | Cancel: A (inline with undo) or B (confirm). | Hugh |
| G11 | Every new string is a placeholder in the copy strings file, for /copy-review. | Note |

## Not drawn

- The paused state (`Paused until November 1`): it retires with payments.
- The About `credits` entry's edit (About entries are paused for this line), admin revenue and grants, per-group allowances, stage 2.
- Stripe's pages (Checkout, receipt, card update).
- Concert Crawl's monetization handoffs aren't in this repo; nothing was lifted from them.
