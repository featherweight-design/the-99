## No-collection entry, PR 3: Precons I own and Home's receipt (2026-10-15)

Handoff: `design/design_handoff_the99_no_collection_entry/` (R2, approved by Hugh): `R1 - PreconPick-Desktop.dc.html`,
`R1 - PreconPick-Phone.dc.html`, `R1 - PreconResult.dc.html`, `STATES-no-collection-entry.md` S2 to S7, the README's
call 4 and §Surfaces, `design-tables/no-collection-entry.md`, and READINESS (R2 audit, R3 re-audit). Plan
`docs/superpowers/plans/2026-10-15-no-collection-entry.md`, PR 3.

Enumerated from the handoff first, then each row verified against the code. ✓ matches; ≈ matches with the deviation
named; — not built here, with where it is.

### The route and its reads

| # | Property | Handoff | Built | |
|---|---|---|---|---|
| 1 | Route | `/decks/precons?pick=own`, a mode of the shipped list | `page.tsx` branches on `pick=own` with `noCollectionEntryEnabled`; off, or any other `pick`, the shipped list (pinned) | ✓ |
| 2 | Cache | its own `cachePageForUser("precons")` key | key `["pick"]`; the plain list keeps `[]` / `[day]` (pinned) | ✓ |
| 3 | Figures | per-box cards (copies) and tokens | `copies` and `tokens` on `PreconSource`, read only for the pick (`readBoxTotals`); tokens join as the add joins them | ✓ |
| 4 | Twin rule | one row per twin pair | `summarisePrecons` folds the twin; the row's `box.twin` carries the Collector's Edition's file and figures | ✓ |
| 5 | Way back | `‹ Home`, or `‹ Collection` by entry | `pickEntry(from)`: `collection` or `home`, a closed set; the link never takes a path off the URL | ✓ |

### S2 · open, nothing ticked

| # | Property | Handoff | Built | |
|---|---|---|---|---|
| 6 | Header | back, `Precons I own` (display 26 desktop, 22 phone), one sentence | as drawn; `pick.sub` desktop, `pick.subPhone` at 390 | ✓ |
| 7 | Kept controls | search, colour pips, result line, year groups (Newest) | `DeckSearchField`, `ColourPips`, `list.result(…, "newest")`, `groupByYear`; the shipped year head (display 17 + mono count) | ≈ the board draws the year head mono; the shipped head is kept, as the call says "kept" |
| 8 | Phone pips | the board draws the search alone | the pips under the search | ≈ the plan keeps pips; the phone board omits them |
| 9 | Row | whole row the label, checkbox first; 56px / checkbox 22 phone, 52px / checkbox 20 desktop | `<label>` with the native box first, `min-h-[56px] md:min-h-[52px]`, 22/20px | ✓ |
| 10 | Row content | pips, name 14/600, mono `SET · Mon YYYY`, then `100 cards` (`100` at 390) | as drawn; the ownership figure dropped | ✓ |
| 11 | Desktop meta, twin | `· also sold as a Collector's Edition` | the shipped `row.twin` clause, desktop only | ✓ |
| 12 | Foot lead | `Select the decks you own.` | `pick.leadNone` | ✓ |
| 13 | Add held | `Add boxes`, `aria-disabled`, .4, never removed; the press moves focus to the search | `aria-disabled`, `opacity-40`; the press focuses the search input | ✓ |

### S3 · some picked

| # | Property | Handoff | Built | |
|---|---|---|---|---|
| 14 | Lead | `3 boxes · 300 cards and 31 tokens`; no tokens clause at 0 | `pick.lead` over `pickTotals` | ✓ |
| 15 | Button | `Add 3 boxes · 300 cards` | `pick.add` | ✓ |
| 16 | Ticked row | `--surface-sunken` ground | `bg-[color:var(--surface-sunken)]` | ✓ |
| 17 | Twin radios | under the ticked row, outside its label; `Regular` (picked) / `Collector's Edition · every card foil`; 44px rows at 390, side by side at 32px with an `EDITION` kicker on desktop | `role="radiogroup"` sibling of the label, Regular on tick; as drawn | ✓ |
| 18 | One edition | a Collector's Edition adds its own printings, never both | one map entry per box; `resolvePick` refuses a box twice and a twin's own file | ✓ |

### S4 · pending

| # | Property | Handoff | Built | |
|---|---|---|---|---|
| 19 | Button, lead | `Adding…`; `Adding 3 boxes to your collection…` | `pick.adding`, `pick.addingLead` | ✓ |
| 20 | List | inert, `aria-busy`, .55 | `aria-busy`, `inert`, `opacity-[.55]` | ✓ |
| 21 | Controls | search, pips and Cancel disabled; nothing moves | a disabled `fieldset` over search and pips; Cancel `disabled` | ✓ |

### S5 · done

| # | Property | Handoff | Built | |
|---|---|---|---|---|
| 22 | Where | Home's dashboard | `router.push` to Home with `?precons=<entry ids>` whichever page the pick was opened from: Home is the one page that reads the receipt. A pick that added nothing goes back to its entry | ✓ |
| 23 | Strip | arrival band anatomy: `--surface-rail`, `✓` `--success`, `✕` alone, `role="status"` | `ArrivalBandShell` + `ArrivalDismiss` inside `role="status"` | ✓ |
| 24 | Desktop text | `3 precons added to your collection:` (bold) `Abzan Armor, Sultai Arisen and Temur Roar. 300 cards and 31 tokens.` `History`, 13.5px | `pick.receipt.head` / `body`, 13.5px; four or more read `A, B and 4 others` | ✓ |
| 25 | Phone text | one line, mono 10.5: `3 precons added · 300 cards · History` | `pick.receipt.phone` | ✓ |
| 26 | Dismiss | its own key, not `arrivalDismissKey(deckId)` | `pickReceiptDismissKey` (first entry id) | ✓ |
| 27 | The claim | read from the ledger | `readPickReceipt`: the reader's own precon adds that still stand; outside Home's cached payload; spent off the URL once seen and held for the visit | ✓ |

### S6 · refused

| # | Property | Handoff | Built | |
|---|---|---|---|---|
| 28 | Toast | shared `ToastFrame`, centre, `role="alert"`, above the add bar, holds on hover and focus, `Try again` | `ToastFrame placement="center"` lifted by the foot's height (`lift`, now honoured at centre), `useToastClock` with the holds | ✓ |
| 29 | Words | `We couldn’t add those. Your collection is unchanged.`; thrown: `Couldn’t confirm the cards were added. Try again and they won’t be added twice.` | `start.owned.addFailed` / `addUnsure` | ✓ |
| 30 | Pick | standing, ticks kept, focus to the add | ticks and ids kept; focus returns to the add | ✓ |

### S7 · part-failed

| # | Property | Handoff | Built | |
|---|---|---|---|---|
| 31 | Rows | landed untick with `--success` `✓ added just now`; the failed box stays ticked | as drawn: a tag on desktop, in place of the meta line at 390 | ✓ |
| 32 | Toast | `Added Abzan Armor and Sultai Arisen. We couldn’t add Temur Roar.` | `pick.partFailed` | ✓ |
| 33 | Retry | none silent; Try again re-sends the failed box with its own id | ids kept per box and edition, dropped only once that box lands | ✓ |
| 34 | Cancel → Done | Done goes to Home with S5's strip naming what landed | desktop Done carries the landed entries | ✓ |
| 35 | Phone Done | the phone foot draws no Cancel or Done | the header's way back carries the receipt once a box has landed | ≈ the board draws no way to the receipt at 390 |
| 36 | Nav | unlocks the moment a box lands | `addPrecons` retires the collection readers in its response when any box landed | ✓ |

### Not here

S17 (the `✓ added <date>` mark), S18 and S19 and `you own N of M` with cards are PR 5. About is PR 6.
