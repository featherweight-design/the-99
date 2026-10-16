# Readiness · Buying credits (R1 to R2b)

**Approved (LGTM, Hugh, 2026-10-16), R2b. Self-assessed: Green for the build, with seven items engineering settles in the plan.** The brief's seven screens are drawn at 390 and desktop: the credit line (§1), `/credits` (§2), the plan and cancelling it (§3), Checkout's return (§4), blocked (§5), payments off (§6), and the deletion warning (§7). Every board was rendered headless and checked: no board cut off, no broken image, no em dash in any string.

**Build from** `The 99 - Buying Credits (R1).dc.html` for the calls and gaps, then the seven `R1 - *` boards (README "Start here"), with `R2b - Picks.dc.html` for the offer art and the menu chip, which supersede the card fan and the R1 menu line wherever those appear. Option B on Plan-and-Cancel was not picked and is not built. `R2 - Options` is the record of what Hugh picked from.

**The brief's rulings, all closed, all honoured** (table on the main board, with frames)
1. Prices, rollover with no cap while subscribed, expiry at period end after a cancel (stated at purchase, at cancel, before it happens), cancel in one obvious tap.
2. Packs never expire; spend order free, plan, packs.
3. 20 paid a day, never blocking a free run; US only on Stripe's page; refunds by email.
4. A dispute blocks buying and revokes what it bought; forfeited on deletion, said before payment and in the delete flow.
5. Switch off: nothing about buying drawn, ever disabled; existing subscribers keep plan management.

**Design's calls**
- **Menu entry:** in the identity block, not a new row (A1), drawn as the M1b chip.
- **Free and paid side by side:** one line on spending surfaces, free first then the paid total; on `/credits`, a total over three cells in spend order.
- **Cancel:** one tap with `Keep my plan` as the undo (A).
- `Get more credits` sits on its own line under the credit line, only when nothing can be spent and payments are on.
- The daily paid line shows on `/credits` from 15 of 20; the expiry warning 3 days out.

**R1b (2026-10-16):** card heights matched side by side on desktop; themes board added. Hugh approved everything else as drawn.

**Decided (Hugh, 2026-10-16):** cancel A; menu entry A1; expiry warning 3 days.

**Decided (Hugh, 2026-10-16):** offer art A, the crown's diamond; art is only ever real cards or player images.

**Decided (Hugh, 2026-10-16):** menu count M1b, the chip carrying the crown's diamond, in four states.

**Settle in the plan** (README gaps G1–G8)
1. `creditsCopy` additions and the `Allowance` fields they need (paid used today, the paid limit, when paid is back, the plan's expiry).
2. Cancel and un-cancel as server actions on Stripe's cancel-at-period-end, from our page.
3. `Update card` as a customer-portal session limited to the payment method.
4. The return's session read and its re-read cadence (2s for a minute, then 10s).
5. `/credits` and the menu line hidden by the same test (switch off and nothing held or bought).
6. The Manage account interstitial whenever paid credits are held.
7. `first month` in history from the first invoice's billing reason.
8. Copy to /copy-review; every new string is in `buying-credits · copy strings.ts`.

**Not in this round**
- The About `credits` entry's edit: paused for this line by the brief, batched at launch.
- Admin revenue and grants, per-group allowances, stage 2.

**Flagged**
- Fixture figures (117 credits, November 16, 2:01 AM) are illustrative, not measured on staging.
- Concert Crawl's `design_handoff_monetization_*` set isn't in this repo; no pattern was taken from it. If Hugh wants its receipt or failure states matched, it needs adding to the repo first.
