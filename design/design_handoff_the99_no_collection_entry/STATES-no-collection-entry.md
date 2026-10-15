# States — no-collection entry R2, with the R3 addendum

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
| S8 | Import, box unticked / ticked | (a) entered | Shipped `/decks/import` + `I own these cards. Add them to my collection.` under Deck name, unticked | Import S8 (R2) | Tick it by default; move it off the form |
| S9 | Import pending | press | Shipped `Reading the list`; nothing new | (shipped) | Make the deck before the add settles |
| S10 | Ticked, done | add + deck written | Deck page; strip head `All 100 lines came over clean.`, body `All 100 cards added to your collection.` + History; Shopping 0; nav unlocks | Import S10 (R2) | Reserve copies; a second strip |
| S11 | Ticked, refused | add failed | Import page standing, box ticked, toast alert `addFailed` / `addUnsure` + Try again | Import S11 (R2) | Inline error; make the deck anyway |
| S12 | Imported unticked | import, box off, 0 cards | Shipped deck page, every row to buy, nav still locked; Home: `Add your cards` header, resume row, page line | Import S12 (R2), Empty S12 | An offer after the import; unlock Decks |
| S13 | Started empty | (c): left step 1 with nothing | Collection open: one Upload tile + the group; Commanders, Discover empty states `Nothing to rank yet` → `Add your cards` | Empty S13, Open 7 | A "Start empty" button; `No collection yet` |
| S14 | First CSV over a built collection | upload, ≥1 row | Sync's choice, none picked, Sync disabled (never uploaded); Replace names cards from precons and by hand that would leave | LaterUpload | Preselect Add; redraw Sync's step |
| S15 | Precons switch off | `PRECONS_ENABLED` off | Precons I own absent on step 1, Collection; the About key line hidden | FirstRun S15 | Draw it disabled |
| S16 | Edit switch off | `COLLECTION_EDIT_ENABLED` off | Upload + Paste only; four-slot lock; no import checkbox | FirstRun S16 | Leave Collection open |
| S17 | A box already owned (R3) | the box has a precon History entry | `--success` mark `✓ added Jun 30` after the meta, still pickable; ticked: “You added this box on Jun 30. Adding it again adds a second copy of each card.” as a plain note under the row. With cards in the collection every row also shows `you own 61 of 88` | AddPrecons S17 (R3); PreconPick S17 (R1, zero cards) | Block or disable the pick; mark boxes owned by card overlap; tint the note as a warning |
| S18 | The way in with cards (R3) | Add cards sheet open, nothing on the list, `PRECONS_ENABLED` on | One 52px row `Own precon boxes? Pick them ›` at both widths; on the phone under `Have a file? Upload it instead` | AddPrecons E1 (R3) | A head button; show it once the list has lines |
| S19 | Pick from Collection, done (R3) | every box written, entered from Collection | Back on Collection; the S5 receipt strip under the tabs, `✕` alone | AddPrecons E3 (R3) | Send the player to Home |

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
