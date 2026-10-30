# STATES: Shopping for all decks (R1)

Every frame is drawn at 900 and 390. `scene` is the prop on `All Decks Cart.dc.html`. Fixture: staging, 7 of 21 decks, 307 copies, $843.99, 307 of 307 priced. Card prices are illustrative. Deck figures are the roll-up's.

## /decks

| Id | Scene | Entry line | Tile |
|---|---|---|---|
| A1 | `entry` | `Shopping for all decks` · `307 to buy · $843.99 · 7 decks` · › | `N to buy · $X` becomes a raised second link → `/decks/shopping?deck=<id>` |
| A1-0 | (no frame) | **absent** when `shopping.byDeck` is empty | as shipped |
| A1-np | (no frame) | `entry.figureNoPrice` when `total.cents` is 0 | `detailToBuyNoPrice`, as shipped |

## The cart

| Id | Scene | Selections | View | List | Checkout |
|---|---|---|---|---|---|
| A2 | `all` | 7 of 7 · `Deselect all` | by card | 291 lines, commanders → most decks → A–Z | `$843.99` · `307 copies · 7 decks` · provenance · link · `sends(291)` |
| A3 | `some` | 5 of 7 (Omnath, Mutant Menace off) · `Select all` · phone fold open | by card | lines re-read: `2 · Gishath, Thorin` etc. | `$466.52` · `197 copies · 5 decks` · `sends(188)` |
| A4 | `none` | 0 of 7 · `Select all` | switch hidden | dashed `none` block with `Select all 7 decks` | copies line `0 of 7 decks selected` · provenance · `noneSelected`, no figure, no link |
| A5 | `byDeck` | in each shelf header | by deck | 7 shelves, the arrival deck unfolded | as A2 |
| A5-t | (no frame) | `?deck=` names a deselected or absent deck | by deck | all folded, no error | as selected |

## The Sol Ring line (owned 17, held 17; `3 · Gishath, Kratos, Thorin`)

| Id | Scene | Line | Tag | Confirm / receipt | Totals |
|---|---|---|---|---|---|
| S0 | `all` | listed · `you own 17 · all 17 in other decks` | `buy · $3.87`, wash 13% | — | 307 · $843.99 |
| S1 | `confirm` | listed | wash 24% + focus ring (open) | `For 3 decks on this cart` · 3 × `needs 1` · owned fact · stepper 3 · `confirm.need(3,3)` · `readAgain` | unchanged |
| S1b | `confirmTwo` | listed | open | stepper 2 of 3 decks → the deck list becomes ContestedCardRow (square marks): `Give the 2 copies to` · `2 of 2 given` · Gishath default (neutral) `gets it` · Kratos `buys it` · Thorin picked (`--accent`) `gets it` · footer `Tap HD -Thorin again to undo this.` + `Back to first listed` | unchanged |
| S1c | (no frame) | as S1b, brew refusal kept (G11) | open | brew options inert, default order, `contested.draftNoteMany` | unchanged |
| S2 | `buying` | listed | `buy · adding…` at 0.75; other presses on this card disabled | confirm closed | unchanged until the read |
| S3 | `bought` | held slot `Sol Ring · in your collection` · `3 added` | — | toast `Sol Ring added · ×3` · `CMM #400 · Nonfoil` · `covered([Gishath, Kratos, Thorin])` · History · Undo | 304 · $840.12 · 290 lines |
| S4 | `partial` | after S1b: `1 · Kratos` · `you own 19 · all 19 in other decks` · `2 added this visit` | `buy · $1.29` | toast `×2` · `covered([Gishath, Thorin])` + `asPicked` + `still(Kratos, 1)` | 305 · $841.41 |
| S5 | (no frame) | Undo from S3/S4 | — | shipped revert; the line comes back on the next read | re-read |
| S6 | (no frame) | the read covers a deck not on the line (senior took it) | — | `covered` names the decks the read says, never the decks pressed | re-read |

## Checkout and return

| Id | Scene | What shows |
|---|---|---|
| K1 | `ret` | after the link is pressed and the tab regains focus: one `back` band over the list, dismissable, once per visit. Nothing is marked bought |
| K2 | (no frame) | the link is the shipped `ExternalLink`, new tab. The href is one `manapoolAddDeckUrl` over merged lines (lock 5) |
| K3 | (not drawn) | over the URL limit: engineering refusal until Hugh answers open question 6 |

## Prices, thin and empty

| Id | Scene | What shows |
|---|---|---|
| T1 | `sold` | `buy · sold out` on Star of Extinction; figure line `· 305 of 307 priced`; total sums priced copies only |
| T2 | `priceFail` | no figure; provenance slot `checkout.unread` (--fg-locked); link stays; tags bare `buy`; select figures copies only |
| E1 | `one` | one select, no `Select all`, no switch; sub `1 of 21 decks is missing cards` |
| E2 | `cmdrOnly` | the commander-only deck has a select and leads the list as a `commander` line |
| E3 | `empty` | message centred in the page body, `Back to Decks`; no figure, no link (direct visit only) |
| E4 | `entryNone` | /decks with no entry line; the page is exactly as it ships today |
| P1 | (all phone frames) | the list scrolls in a 460px box with a 36px fade, and the checkout dock sits right under it (sticky to the viewport in the build) |

## Must-nots
- No verdict word (`short`, `conflict`, `held up`, `taken`) and no `--warning`/`--danger` on the ownership fact. The buy tag's own `--warning` is the shipped tag, unchanged.
- Deselecting never writes. Nothing in a deck, its version or its Shopping list moves.
- The cart's per-deck figure never differs from the tile's. Both read `loadShoppingRollup`.
- A missing price is never `$0.00`. A total never subtracts a purchase. It is read again.
- One link. No per-deck links, no chunked links, no clipboard fallback this round.
- No motion. Selecting re-renders the figures in place.
