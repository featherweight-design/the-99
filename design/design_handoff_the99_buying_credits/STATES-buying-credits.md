# Buying credits R1 · states

Every state at 390 and desktop unless marked. "Must not" lists what the build must not do in that state.

## §1 · The credit line (Credit-Line, Surfaces)

| State | Frames | Press | Line | Must not |
|---|---|---|---|---|
| Free left, nothing bought | L1 | live, `◆ 1 credit` | `4 of 5 left · reset at 2:01 AM` (unchanged) | show a paid count; show `Get more credits` |
| Free left, paid held | L2 | live | `4 of 5 free · reset at 2:01 AM · 114 paid` | split plan and packs on the line |
| Free spent, paid held | L3, Surfaces L3 | **live** | `0 of 5 free · reset at 2:01 AM · this run uses 1 of 114 paid`; `first` / `again` say `uses a paid credit` | disable the press; color the line |
| Nothing to spend, payments on | L4, Surfaces L4 | disabled, no segment | shipped `spent` line, then `Get more credits →` under it | drop the About link; draw `Get more credits` inside the press |
| Paid limit reached, free spent | L5 | disabled | `Today's 20 paid credits are used. 94 more are banked · back at 2:01 AM` (the earlier of next free and the limit's reset) | say "buy more"; show `Get more credits`; use `--danger` |
| Paid limit reached, a free credit back | L6 | live | `1 of 5 free · reset at 6:40 AM · paid back at 2:01 AM (daily limit)` | block the free run |
| Plan cancelled, ≤ 3 days to expiry | L7 | live | L2/L3 form + ` · 74 plan credits expire Nov 16` in `--warning` | warn earlier than 3 days; warn for packs |
| Payments off for the reader | L8 | as shipped | free-only forms; paid forms if paid is held | draw a disabled `Get more credits` |
| Blocked by a dispute | (no frame) | as by balance | as by balance; `Get more credits` still leads to `/credits` | say anything about the dispute on the line |

## §2 · `/credits` (Billing-Page)

| State | Frames | Shows | Must not |
|---|---|---|---|
| Plan and packs | P1 | total, Free/Plan/Packs cells, Your plan (active), pack on sale, history, refund line | put the plan under "Get more credits" once subscribed |
| Never bought | P2 | Free cell only, plan and pack offers, history empty state | draw empty Plan/Packs cells |
| Plan only | P3 | Free + Plan cells; pack on sale | draw a Packs cell |
| Packs only | P4 | Free + Packs cells; plan offered | draw a Plan cell |
| Near the paid limit (15–19) | P5 | the paid-today line with a neutral meter | show it below 15 |
| At the paid limit | P5b | the line in `--warning` meter, "nothing banked is lost" | close buying; `--danger` |
| Loading | P6 | title at once, blocks for the rest (400ms delay) | spinner |
| The read failed | P7 | one sentence + Try again | a toast (it isn't transient) |
| A second pack (layout check) | P8 | one more card in the same column | redraw the section |

## §3 · The plan (Plan-and-Cancel)

| State | Frames | Card | Must not |
|---|---|---|---|
| Not subscribed | K1 | 60 a month, $5; rollover, renewal, expiry-after-cancel, forfeit-on-delete, all before `Subscribe · $5 a month`; `Checkout on Stripe · US cards` | hide any of the four lines behind a link |
| Subscribed | K2 | renews date, plan credits, `Cancel plan` (neutral, full size), what it does under it, `Update card ↗` | bury cancel in an overflow; red; a grey link |
| Cancelled, in the paid month | K3 | `Ends November 16`, expiry restated, `Keep my plan` (undo, no charge) | a "we're sorry" step; an offer to stay |
| ≤ 3 days to expiry | K4 | border and words in `--warning` | email (there is none) |
| Past due | K5 | payment didn't go through, credits still work, `Update card ↗` primary, `Cancel plan` text | stop credits spending while Stripe retries |
| Expired | K6 | the K1 offer again; history keeps the months | keep a Plan cell at 0 forever (it goes once the plan credits are gone) |

Option B (confirm sheet) is drawn for comparison; build A unless Hugh picks B.

## §4 · Back from Checkout (Checkout-Return)

| State | Frames | Band | Must not |
|---|---|---|---|
| Processing | R1 | `Adding your 40 credits`, 2px moving bar; re-read every 2s | grant anything on return; spin forever |
| Pack added | R2 | `40 pack credits added` + Receipt ↗; Packs cell `+40` | auto-dismiss while on the page |
| Plan started | R3 | `Plan started: 60 credits added`, renews date | hide Cancel plan |
| Still processing (~1 min) | R4 | honest copy, no double charge, support address; re-read every 10s | alarm color |
| Cancelled on Stripe | R5 | one quiet line, bare ✕ | alarm; any change to the page |
| A re-read failed | R6 | the shared ToastFrame; band unchanged | a page error |

## §5, §6 · Blocked and off (Blocked-and-Off)

| State | Frames | Shows | Must not |
|---|---|---|---|
| Blocked | B1 | balances (revoked credits gone), Your plan (Cancel, Update card), one pause band with the support address, history | accuse; show it on any other page; disable rather than remove |
| Off, never paid | O1 | nothing new: shipped line, menu without the line, `/credits` not found | a disabled button; a teaser |
| Off, with a plan | O2 | reduced page: balances, Your plan (Cancel, Update card), history, refunds | packs, Subscribe |
| Off, plan cancelled | O3 | as O2, the card without `Keep my plan` | Keep my plan (it's a purchase) |
| Off, packs only | O4 | balances, history, refunds; no offers section | an empty "Get more credits" heading |

## §2 entry and §7 (Menu-and-Delete)

| State | Frames | Shows | Must not |
|---|---|---|---|
| Menu, holding credits | A1 | `◆ 117 credits ›` under the email | a new menu row |
| Menu, never bought, payments on | A2 | `◆ 3 free credits ›` | the line when payments are off and nothing was bought |
| Manage account, paid held | D1, D2 | interstitial: total, split by source, forfeit sentence, refund pointer, `Continue to Manage account`, ✕ | show it with no paid credits; replace it with a billing-page line |
