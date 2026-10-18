# Close-out: Buying credits

**Status: PARTIAL.** Everything merged is walked below; the plan card (U3b) is not merged, so its rows are open, and the
`credits` About entry is owed (see About). The line does not close until both land and their rows are ticked here.

**Walked:** 2026-10-18, on `main` at `75b304bb2`; #2109's fixes were re-photographed on its branch (the deletion warning at both widths, the full `rich` sheet), and its last change, the labels' ink, is pinned by a contrast test rather than a photo. #2109 merged as `1f170899d`, against the plan `docs/superpowers/plans/2026-10-17-buying-credits-ui.md`
and the handoff `design/design_handoff_the99_buying_credits/` (approved R2b, #1946). Merged and in scope:

| Plan PR | What | PR |
|---|---|---|
| K1b | Checkout Session for a pack | #1936 |
| U1 | `/credits`, the pack Buy, the Checkout return | #2006, polish #2017 |
| U2a | the 20-a-day paid limit | #2016 |
| U2b | the credit line (L1 to L8), the account-menu chip, the paid-today meter | #2026, #2037, #2062, #2066 |
| D1 | welcome credits (launch epic) | #2042 |
| R | account deletion deletes the Stripe Customer | #2043 |
| K2 | refunds and disputes, the purchase block | #2041, #2098 |
| U5 | the deletion warning | #2069 |
| A1 to A3 | a group's paid limit; the gift ledger; the Payments tab; disputes, Let them buy, revenue net of refunds | #2074, #2076, #2085, #2094, #2106 |
| Sub | the monthly plan, server half | #2091 |
| U3a | cancel, keep and Update card, server actions | #2104 |
| U4 | the pause band, no offers while paused or off | #2105 |

Not merged: **U3b**, the plan card (K1 to K6, R3, the plan offer on P1, L7 and the chip's expiring line proven live,
the reduced card O2/O3 through its `reduced` prop). Its rows below stay open.

**Where.** A scratch branch made from local-dev (`scratch-58-credits-closeout-2026-10-18`, deleted once this was
recorded), brought to `main`'s schema. `next start` ran against it with `ADMIN_USER_IDS` naming the audit account and
`ADMIN_ENV_LABEL` set; the account's `PAYMENTS_ENABLED` and `HELP_ME_CHOOSE_ENABLED` were set by account overrides.
Chromium at 390×844 and 1300×900, the default theme (Low Sun).

**Fixtures,** for the audit account, one state per run, reseeded between runs:
- `rich`: switch on; a 40-credit pack bought yesterday with a $5.31 payment, 17 of it spent on paid runs today; a
  7-credit gift; the free allowance spent (5 runs).
- `never`: switch on, nothing held or bought.
- `paused`: `rich` plus `stripe_customers.purchase_blocked_at` set.
- `off`: switch off, the pack and the gift held, no runs.
- `gone`: switch off, nothing held or bought.
- `admin`: `rich`, the pause, half the payment refunded ($2.65 on `payment_records.refunded_cents`) and an open dispute on it.

## Route inventory

Inventories: `docs/superpowers/inventories/buying-credits-closeout.json` (the `rich` rows),
`buying-credits-closeout-page.json` (one row, run as `never`, `paused` and `off`), `buying-credits-closeout-gone.json`
and `buying-credits-closeout-admin.json`. Every cell of every run reached its surface.

| Surface | Frames | Route | 390 | 1300 | Evidence |
|---|---|---|---|---|---|
| Balance, cells, the pack offer | P1, P3/P4 | `/credits` | ☑ | ☑ | contact sheet `rich` |
| A second pack card | P8 | `/credits` | ☐ | ☐ | not photographed: the registry holds one pack (`pack40`); the layout is covered by the component tests |
| Never bought | P2 | `/credits` | ☑ | ☑ | contact sheet `never` |
| Paid-today line and meter | P5 (17 of 20) | `/credits` | ☑ | ☑ | contact sheet `rich` |
| The meter at the limit | P5b (20 of 20, warning fill) | `/credits` | ☐ | ☐ | not photographed (the fixture holds 17 runs); the component tests and U2b's inventory run |
| History, Receipt, refund line, legal links | P1 | `/credits` | ☑ | ☑ | contact sheet `rich` |
| Checkout closed | R5 | `/credits?checkout=cancelled` | ☑ | ☑ | contact sheet `rich` |
| Processing, added, still processing | R1, R2, R4 | `/credits?checkout=done&session_id=` | ☐ | ☐ | not photographed: needs a Session of the account's own; `probe:credits-return` and the component tests |
| Loading, read failed | P6, P7 | `/credits` | ☐ | ☐ | not photographed; `route-loading.test.ts` and the page tests |
| Buying paused | B1 | `/credits` | ☑ | ☑ | contact sheet `paused`; `probe:payments-reduced` |
| Switch off, held | O4 | `/credits` | ☑ | ☑ | contact sheet `off`; `probe:payments-reduced` |
| Switch off, nothing held | G6, O1 | `/credits` | ☑ | ☑ | contact sheet `gone` (the not-found page) |
| Account-menu chip | M1b | account menu | ☑ sheet | ☑ popover | contact sheet `rich` |
| Credit line, first paid run | L3 | Help me choose (one of six spend surfaces) | ☑ | ☑ | contact sheet `rich`; the other surfaces share the component (below) |
| Credit line, other states | L1, L2, L4 to L6, L8 | spend surfaces | ☐ | ☐ | not photographed here: `credit-line.test.ts` and U2b's per-state runs (`buying-credits-u2.json`) |
| Deletion warning | D1, D2 | Manage account | ☑ sheet | ☑ popover | `probe:delete-warning` with `PROBE_SHOTS` |
| Admin Payments tab | A2b, A3 | `/admin/payments` | ☑ | ☑ | contact sheet `admin` |
| Plan card, plan offer, plan started | K1 to K6, R3 | `/credits` | ☐ | ☐ | **U3b, not merged** |
| Reduced plan card | O2, O3 | `/credits` | ☐ | ☐ | **U3b, not merged** |
| Chip's expiring line, L7 live | M1b, L7 | account menu, spend surfaces | ☐ | ☐ | **U3b, not merged** |

## Structural checks

- **Import equality, the credit line.** The plan names it one component on every spend surface. Every spender imports and
  renders `CreditsText` or `CreditButton` (`src/components/ui/`): `read-band.tsx`, `fits-view.tsx`, `tuning-panel.tsx`,
  `cuts-panel.tsx` and `cuts-free-count.tsx`, `synopsis-body.tsx` and `synopsis-controls.tsx`, `intake-form.tsx` and
  `read-panel.tsx`. No surface draws its own copy. The close-out inventory carries no `shares` block (one route each),
  so `pnpm check:shared` has nothing to read; this was checked by import, not by grep for the name.
- **Probes, re-run here:** `probe:delete-warning` (all pass) on the close-out branch; `probe:payments-reduced` and
  `probe:admin-payments` passed on their own scratch branches as the last PRs merged (#2105, #2106).

## Design review against the whole brief

Each frame was compared against the boards (`R1 - Billing-Page`, `R1 - Checkout-Return`, `R1 - Credit-Line`,
`R1 - Menu-and-Delete`, `R1 - Blocked-and-Off`, `R2b - Picks`), property by property (order, copy, type, ink, spacing,
radius, borders, what each width draws), then each mismatch was checked in the code before it was counted.

**Mismatches found, all fixed in the close-out's fix PR (#2109):**

| Frame | Width | Property | Board | Shipped | Fix |
|---|---|---|---|---|---|
| D1/D2 deletion warning | both | the Plan/Packs split | `.mbody .split`: one `--border` box, 10px radius, a rule between cells, cells 10px by 12px | bare cells 16px apart | the box, the rule, the padding |
| D1/D2 | both | type | labels `--fg-faint` 10px at .12em; sub-line 10.5px; body 13.5px/1.55; refund line 12.5px; body gap 12px | labels `--fg-muted` at .14em; 11px; 14px/1.5; 13px; gap 16px | the board's sizes, tracking and gap; the labels keep `--fg-muted`, because the board's `--fg-faint` is 3.70 to 4.62:1 on `--surface-raised`, under 4.5:1 in four themes (pinned by a test) |
| Pack offer art | both | the diamond's edge | `.dm{border:1.5px solid var(--accent)}` | 1px | 1.5px |
| D1 (1300) | desktop | the support address | one unbroken address | broken at its hyphen, `support@the-` / `99.dev`, reading as two | `SupportLink` never wraps (every caller) |

**Deliberate differences, not defects (each carries its ruling):**

- The pack's Buy button reads `Buy pack`, not `Buy 40 credits · $5`, and the diamond's numeral is 21px, not 17px: Hugh,
  2026-10-17, after his staging purchase (#2017; logged for Design in `boards/design-followups-2026-10-18.md`).
- The chip's count is `--fg`, not `--accent`: the accent on the chip measures 4.48:1 in Low Sun, under 4.5:1, so the
  board cannot be met there (`credit-chip.tsx`, pinned by a test; #2062).
- The menu shows an Admin row: the walked account is an admin. Readers see About, Friends, Manage account, Sign out.

**Matches:** P1 page with cells, total and spend order; P2 never bought (one Free cell, no "Spent in this order", the
empty history); P5 paid-today line and meter; history rows, refund line and support link; R5 cancelled band
(`.band.quiet`); M1b chip (popover at 1300, a 44px press in the sheet at 390); the credit line (L3, `Uses a paid
credit.`); B1 pause band (`.band`, `.hold`), in the offers' place; O4 (no offers section); O1/G6 not-found.

**Not settled by any board, and owned elsewhere:**

- **The Gift cell** (A2a, #2076) has no board: the handoff draws Free, Plan and Packs. It follows the Welcome cell's
  form (no sub-line), in spend order.
- **`N paid` counts welcome and gift credits** (`credit-line.ts`, `paidHeld` is `heldCredits`), though neither was
  bought. The D2 brief (`design-briefs/2026-10-18-welcome-credits-onboarding.md`, item 3) already names it, gifts
  included, for Design. Not changed here (d9, 2026-10-18): welcome credits are switched off everywhere and gifts are
  admin-only and rare, so no player sees it before Design answers. **For D2's build:** `paidHeld` in `credit-line.ts`
  drives two things, and only one of them may change. The line's KIND (`creditLineKind`: `withPaid`, `paidNext`,
  `spent`, `limit`, so whether a run can go ahead) must stay on `heldCredits`, or a reader holding only a gift with the
  free allowance spent is told `spent` while their run still works. Only the COUNT and its WORDS change: `N paid`
  counts `PAID_SOURCES` (plan, pack) alone, and unpaid held credits get the words item 3 draws. As shipped,
  narrowing the count without new words breaks two forms: `paidNext` would read `this run uses 1 of 0 paid`, and
  `firstPaid`/`againPaid` say `Uses a paid credit.` for a gift. D2's test should pin both halves: a gift-only or welcome-only
  holder keeps `paidNext`, and its line names no paid count.
- **The admin Payments tab has no board** in `design/design_handoff_the99_admin/`, so it was walked for reach and
  sense, not against a mock. Its figures agree with the fixture: Paid $5.31 with $2.65 refunded, Tax $0.31, Net $2.50
  (paid less tax, less the refund net of the tax it carried back), the dispute and the paused account with Let them buy.
- **Terms and Privacy** under the refund line come from the launch epic's legal pages, not this handoff.

## States not photographed

- **R1, R2, R4** (processing, added, still processing): each needs a real Checkout Session of the account's own. Proved by
  `pnpm probe:credits-return` (a signed webhook fixture; the grant flips processing to added; a forged Session reads as
  no band) and the return band's component tests.
- **P6, P7** (loading, read failed): `route-loading.test.ts` keeps the route's own loading screen; the page tests draw P7
  for a read that throws.
- **A live purchase, refund and plan:** walked on staging by Hugh, never by a lane (below).

## Hugh's walk on staging

These need Hugh's Stripe steps first, from `boards/hugh-todos.md`:

- **6f** (refunds and disputes): add `charge.refunded`, `charge.dispute.created` and `charge.dispute.closed` to The 99's
  webhook endpoint; give the restricted key Charges: read and Disputes: read. Until then a refund in Stripe never reaches
  the app.
- **6i** (the monthly plan): add `invoice.paid`, `customer.subscription.updated` and `customer.subscription.deleted`;
  give the key Invoices: read and Subscriptions: read. Cancel and keep (U3a) also need Subscriptions **write** and Customer
  portal write, plus `STRIPE_PORTAL_CONFIG` (`docs/agents/payments.md`). Until then the plan cannot be walked live (and U3b's card has
  nothing to draw).

Then: buy a pack with Stripe's test card (R1, R2), refund it (its unspent credits leave the balance), and, once U3b
merges, subscribe, cancel and keep the plan.

## About entry

**Owed; the close-out does not pass without it.** The plan deferred the `credits` entry's edit ("How credits work",
`src/lib/copy/about-entries.ts`) to the launch batch, with one `ABOUT_VERSION` bump (now 14), and the handoff says the
same (README "Not in this round", READINESS). Today the entry teaches only the free allowance: it names no pack, no
plan, no `/credits` and no paid limit. No About artboard draws the edit yet (`design/design_handoff_the99_about/` has
none for buying). **Pending Hugh's call** (on his list, `boards/hugh-todos.md`): whether buying credits owes an About
entry, as an edit to `credits` or a new one. Once he rules, Design draws it in the launch batch and the entry and the
`ABOUT_VERSION` bump land; this row is ticked then.
