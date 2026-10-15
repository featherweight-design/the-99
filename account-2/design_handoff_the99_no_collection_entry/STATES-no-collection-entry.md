# States — no-collection entry R1

Brief §States, every one at 390 and 1300. The canvas column names the R1 board.

| # | State | Trigger | Shown | Canvas | Must not |
|---|---|---|---|---|---|
| S1 | First run, nothing chosen | 0 cards, 0 decks | Step 1: Upload a CSV (fill), Paste a list, then `No file? Start another way` with Precons I own · Import a deck · Add cards by hand. Lock on Commanders, Discover, Decks | FirstRun-Desktop S1, FirstRun-Phone S1 | Fill or border any of the three; put them above the upload |
| S2 | Precon pick, open | (b) entered | `/decks/precons?pick=own` in rows, nothing ticked, `Tick the boxes you own.`, add held | PreconPick S2 | Remove the add; show `you own 0 of N` on every row |
| S3 | Some picked | ≥1 box ticked | `Add N boxes · M cards`; lead `N boxes · M cards and T tokens`; a ticked twin shows Regular / Collector's Edition | PreconPick S3 | Add both editions; nest the radios in the checkbox's label |
| S4 | Pending | press | `Adding…`, list inert (aria-busy), search, pips and Cancel disabled | PreconPick S4 | Move the rail or the list |
| S5 | Done | all boxes written | Home dashboard, nav unlocked, receipt strip naming boxes, cards, tokens, History | PreconResult S5 | Animate the unlock; toast a success |
| S6 | Refused | `notFound` / `failed` | The pick standing, ticks kept, ToastFrame alert `We couldn’t add those. Your collection is unchanged.` + Try again | PreconResult S6 | Draw an inline error; clear the ticks |
| S7 | Part-failed | one box fails after others land | Landed rows untick with `✓ added just now`; failed stays ticked; toast names both; nav unlocks | PreconResult S7 | Retry silently; leave landed boxes ticked |
| S8 | Import done, own offer | deck imported, 0 cards | Shipped arrival strip + second line: `Already own these? …` `Add 100 cards` · `Not now` | Import S8 | Show the offer when the collection had cards (R1) |
| S9 | Own these, pending | press | `Adding…` on the offer only; deck unchanged | Import S9 | Touch the list or rail before it settles |
| S10 | Own these, done | lines written | Strip: `100 cards added to your collection. Nothing left to buy.` + History; To buy 0; nav unlocks | Import S10 | Reserve copies; keep buy tags |
| S11 | Own these, refused | failure | Toast alert, offer standing | Import S11 | Inline error; dismiss the strip |
| S12 | Offer declined | Not now / ✕ | Deck with 100 To buy; Shopping head line keeps the offer; nav still locked; Home: `Add your cards` header, resume row, page line | Import S12, Empty S12 | Unlock Decks; leave the offer unfindable |
| S13 | Started empty | (c): left step 1 with nothing | Collection open: one Upload tile + the group; Commanders, Discover empty states `Nothing to rank yet` → `Add your cards` | Empty S13, Open 7 | A "Start empty" button; `No collection yet` |
| S14 | First CSV over a built collection | upload, ≥1 row | Sync's choice, none picked, Sync disabled (never uploaded); Replace names cards from precons and by hand that would leave | LaterUpload | Preselect Add; redraw Sync's step |
| S15 | Precons switch off | `PRECONS_ENABLED` off | Precons I own absent on step 1, Collection; the About key line hidden | FirstRun S15 | Draw it disabled |
| S16 | Edit switch off | `COLLECTION_EDIT_ENABLED` off | Upload + Paste only; four-slot lock; no offer, no Shopping line | FirstRun S16 | Leave Collection open |
| S17 | A box already owned | the box has a precon History entry | `added Oct 13` on the row, still pickable; ticked: “Adding it again adds a second copy of each card.” | PreconPick S17 | Block the pick; mark boxes owned by card overlap |

## The lock

| Element | 1300 | 390 |
|---|---|---|
| Locked slots | Commanders, Discover, Decks in the well (Collection open, edit on) | the bracket over tabs 3–5 |
| Words | page line `Commanders, Discover and Decks open once your cards are in.` (first run, and Home with decks) | `OPEN ONCE YOUR CARDS ARE IN` |
| Note button | first run `Go to step 1`; elsewhere `Add your cards` → /collection | same |
| Note extra | with ≥1 deck: `Your decks are on Home until then.` | same |
| Lifts | the first card written, by any path (precon box, deck add, Add cards, I got it, upload) | same |

## Tokens used

Existing only: `--surface`, `--surface-inset`, `--surface-rail`, `--surface-sunken`, `--elevated`, `--border`,
`--border-strong`, `--fg`, `--fg-body`, `--fg-muted`, `--fg-faint`, `--fg-locked`, `--accent`, `--success`,
`--warning` (Replace's warning, buy tags). No new tokens.
