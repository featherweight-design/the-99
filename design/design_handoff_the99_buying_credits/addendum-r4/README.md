# The 99 · Buying credits · R4 addendum · approved (Hugh, 2026-10-21)

`design_handoff_the99_buying_credits/addendum-r4/` · 2026-10-21 · account 2

Four rulings and gaps on `/credits` from the monthly plan's build (U3b). An addendum round: no new surface, token, motion or dependency. Source of truth: this handoff as merged (`STATES-buying-credits.md` names the states) and `/credits` as shipped on main at `2ad3d1a` (`src/components/credits/`, `src/lib/copy/credits-page.ts`, `src/lib/payments/page-model.ts`). Where the build departs from a board, the shipped value is Hugh's ruling, and these boards redraw to it.

Named R4 because account 1's `addendum-r3` (2026-10-18, on `design-assets`) is still out for Hugh's audit and touches none of these items.

Design canvas: **The 99 · Buying credits R4 addendum** (account 2). Kamigawa (Neon Rain) values, as the R1 boards.

## Files

| File | Item |
|---|---|
| `Main.dc.html` | All four items and their answers |
| `Free-Line.dc.html` | 1 (placements A and B, P2 and P1, 390 and desktop) |
| `Pack-First.dc.html` | 2 (K1, P2, P4 at 390 and desktop) |
| `Cells.dc.html` | 3 (five balance cases at 390, three at desktop) |
| `Subscribe.dc.html` | 4 (K1 at 390, 360 and desktop) |

Every board was rendered and measured: nothing clipped, paired desktop cards equal in height and top edge except where A is noted below.

## Items and answers

| # | Item | Answer |
|---|---|---|
| 1 | **Launch blocker (C1):** the line that browsing is free and only what's written for the reader costs credits | **Drawn.** String (`creditsPageCopy.viewsFree`, FINAL: Hugh with the copywriter, 2026-10-21): `Browsing is always free. Anything we write just for you uses a credit.` No "AI" or "model". C1's quoted wording in the launch epic is amended to this line in the handoff PR. IBM Plex Sans 13px/1.5 in `--fg-body`, no link, icon or tint. **Placement B, picked by Hugh (2026-10-21): a third line in the page head** under `1 credit is 1 run of any tool · What uses credits?`. A (under the Get more credits heading, above the pack card, the brief's suggestion) stays drawn for the record; don't build it. Measured, A makes the pack card 32px shorter than the plan card on desktop once subscribed (P1, P3: 214px against 245px), breaking R1b's equal heights; B moves nothing and shows on every state, the reduced, paused, loading and read-failed pages included (`CreditsHead`). A shows only where the offers do. |
| 2 | Pack first (Billing-Page P2, P4's plan offer; Plan-and-Cancel K1) | **Redrawn to the build.** Phone: the pack card above the plan card, 14px apart. From `md`: pack left, plan right in one grid row, equal heights (309px each, measured), presses at each card's foot. Subscribed states keep Your plan left and Get more credits right (a held plan isn't an offer). L6 overrides R1's plan-first order. |
| 3 | K6 and the Plan cell (K6, P1/P3) | **Confirmed, as built.** Plan shows while plan credits or a plan are held (active, cancelled in its month, past due), so it can read 0 beside a plan that renews; it goes once the plan credits are gone and no plan is held (K6). Packs stays once any pack was bought, at 0 too: pack credits never expire, so the 0 stays true. Gift (prompt 7) and Welcome show only while they hold a credit. R1's P-table rule "drawn for a source held or once held" now reads: except the plan, per K6. |
| 4 | The Subscribe label (K1, copy `plan.subscribe`) | **Confirmed: `Subscribe · $5 a month`, as built.** The R1 boards and STATES K1 drew the price on the press; the copy strings file's bare `Subscribe` was the file's slip. A recurring charge carries price and interval at the point of purchase. `Buy pack` stays bare: one charge, priced on the card. One line at 360. |

## Decisions (Hugh, 2026-10-21)

- Item 1: the copywriter's line, final, in placement **B**. No "AI" or "model" on the page.
- Items 2 to 4: as answered above.

## For engineering

- Item 1: add `viewsFree: "Browsing is always free. Anything we write just for you uses a credit."` to `creditsPageCopy`. `CreditsHead` renders it as a `<p>` after the sub (`m-0 mt-[4px] max-w-[900px] text-[13px] leading-[1.5] text-[color:var(--fg-body)]`), so the page, its loading screen and its read-failed state all carry it. This closes C1 once it ships.
- Items 2 to 4: nothing to build. The handoff PR corrects the copy strings file (`plan.subscribe` reads `Subscribe · $5 a month`, `page.viewsFree` added) and adds K6's exception to the README's cell rule.

## Not in this round

The plan card's other states (K2 to K5), Checkout return, the menu chip, About entries. No new strings besides item 1's.
