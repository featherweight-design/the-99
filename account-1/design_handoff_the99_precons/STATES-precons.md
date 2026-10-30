# STATES: Commander precons (R2)

## R2 deltas (apply over the R1 tables below)
| Id | Change |
|---|---|
| P1 | 390: one 2-up row, pad 12 16 4, gap 8, two 52px cells: `Shop all decks` · `307 · $843.99` (ringed) and `Precons` · `185 decklists`. +68px over today (R1 was +123). 900 unchanged |
| P2 | **drawn** (`decksNoCart`): 900 precon line in its half-width cell; 390 one full-width 52px cell (+60px) |
| Must-not | stacking two full lines on a phone; truncating either cell's meta (both are `nowrap` and fit at 390) |

---

Every frame is drawn at 900 and 390. `scene` is the prop on `Precons.dc.html`. Figures are the brief's. Splits, card names and `‹ ›` commanders are illustrative (G1).

## /decks (P)

| Id | Scene | Head lines | Notes |
|---|---|---|---|
| P1 | `decks` | `Shopping for all decks` (cart, ringed) · `Commander precons · 185 decklists · newest 2 Oct 2026` | 900: two equal cells, gap 12. 390: stacked, cart first |
| P2 | (no frame) | cart line absent (cart E4) | precon line alone; half-width cell at 900, full width at 390 |
| P3 | (no frame) | zero decks (`DecksZero`) | precon line still drawn under the header; a player with no decks may start from one |
| P4 | (no frame) | switch off | no precon line; the cart line takes its shipped full width |

## New deck (N)

| Id | Scene | What draws |
|---|---|---|
| N1 | `newDeck` | Help me choose door, then `Start from a precon` door, then search, as shipped. Desktop sub `createPicker.subDoors` |
| N2 | (no frame) | `helpDoor` off, precon on | precon door alone, first in the list column; sub `createPicker.subPrecon` |
| N3 | (no frame) | no owned commanders | doors still draw above the shipped empty line; the precon door is the way forward |
| N4 | (no frame) | `?commander=` pre-filled door | no precon door (that page already has its commander) |

## The list (L)

| Id | Scene | Result line | Body |
|---|---|---|---|
| L1 | `list` | `185 decklists · newest first` | year heads; rows; `N more from YYYY`; built and twin lines |
| L1n | (no frame) | from New deck (`?from=new`) | back link `‹ New deck`; nothing else changes |
| L1o | (no frame) | `185 decklists · most owned first` | no year heads; rows by owned share, then newest, then A–Z |
| L1f | (no frame) | colour pips on | `12 of 185 decklists`; chip and Clear all filters as `/decks`' chassis |
| L2 | `listEmpty` | as L1 | band `precons.empty.body` + `Upload your collection`; every figure `0 of M`; no built lines |
| L3 | `listNone` | `0 of 185 decklists` · `Clear the search` | centred `No precon matches “q”` + scope sentence + `Clear the search` |
| L4 | `listDown` | none | no chassis; centred `precons.down.*` + `Back to Decks`; door lines elsewhere stay |
| L5 | (no frame) | loading | rows as 3 skeleton rails per year (the shipped list skeleton); figure slot empty until the count arrives |

## The row (R)

| Id | Case | Lines |
|---|---|---|
| R1 | plain | name · `you own N of M` / commander / pips `SET · month` |
| R2 | built (Q2) | + `your deck <Deck> · N shared` (deck name linked, opens that deck; the row's press still opens the precon) |
| R3 | twin (Q1) | + `also sold as a Collector's Edition · the same 100 cards` |
| R4 | two commanders | commander line `Frodo, Adventurous Hobbit + Sam, Loyal Attendant`, wraps, never truncated |
| R5 | unmapped (lock 3) | figure `you own N of M` over the mapped cards; + `1 card not in our catalog yet` mono `--fg-faint` |
| R6 | two built decks | `your decks <A> and <B> · N shared` (the larger share first) |

## The open precon (O)

| Id | Scene | Own box | Groups |
|---|---|---|---|
| O1 | `full` | `You own 91 of 91 of its cards` · bar 100% `--fg-muted` · built sentence | every dot filled; notes `you own 24 of 24` |
| O2 | `partial` | `74 of 85` · `15 basic lands not counted` | dashed dots where not owned; Lands `41` · `you own 22 of 26 · 15 basics not counted`; basics line `Wastes ×15` |
| O3 | `unowned` | `18 of 67` | as O2; nothing louder at a low share |
| O4 | (no frame) | unmapped: + `1 card in this precon isn't in our catalog yet, so 99 are listed.` 12.5 `--fg-body` | the card is absent from its group; nothing else changes |
| O5 | (no frame) | empty collection | `You own 0 of 85`; every dot dashed; band from L2 above the own box |
| O6 | (no frame) | a row pressed | card details as shipped, opened on the precon's printing; no deck actions in it (no Add, no claim) |
| V1 | `twin` | + twin sentence | as O2 |
| V2 | `partners` | + `2 commanders and 98 cards · 100 in all`; two thumbs | group `Commanders 2`, note `you own neither` / `you own both` / `you own 1 of 2` |

## Start a deck (S)

| Id | Scene | What draws |
|---|---|---|
| S1 | `start` | dialog / sheet: title, lead, commander card, name field (prefilled, focused, selected), facts: Cards · You own · Printings; `Cancel` · `Start the deck` |
| S1b | (no frame) | already built | + `You already have HD Tune - Counter Intelligence with this commander. This makes a second deck.` 12.5 `--fg-body`, above the facts. Never blocks |
| S1c | (no frame) | name empty or over `DECK_NAME_MAX` | button disabled; shipped `Name must be 1–N characters.` |
| S1d | (no frame) | pending | `Starting…`, button disabled, `inFlight` guard; Cancel disabled |
| S1e | (no frame) | failed | `precons.start.failed` mono 11 `--danger` above the buttons; dialog stays; name kept |
| S2 | `arrival` | Your deck of the new draft; arrival strip `precons.arrival.*`; status pill `Draft`; Shopping count from the deck's own read |
| S2b | (no frame) | every card owned | strip body `precons.arrival.bodyAll` (no Shopping clause) |
| S2c | (no frame) | strip dismissed, or the deck committed | strip gone for good (per deck) |

## Must-nots
- No verdict word on ownership: never `ready`, `short`, `missing`, `complete`, `need`. No `--success`/`--warning`/`--danger` on a figure or bar. The dot keeps its shipped meaning.
- Selection copy says select / unselect, never tick. (This round has no selection; the rule holds for any added later.)
- No tab on /decks. No change to shelves, the chassis or the tiles.
- No editing affordance on the read-only list: no add, remove, lock, claim, price pick, buy tag, I got it, or quick-add bar.
- A precon is never matched or keyed by name (`fileName` is the key; names repeat across sets).
- The count never includes basics without saying so, and never hides a card that didn't map.
- Start never commits, and never assumes 99: the draft holds the feed's exact list.
- No motion.


---

## R3 addendum · built-from link and v0 (K)
Canvas `The 99 - Precons R3 · Built-from Link.dc.html`; frame `Precons Link.dc.html` (`scene`). Supersedes R2, R6, O1, S1b where they differ. Full rulings in `HANDOFF-R3 · built-from link.md`.

| Id | Scene | What draws |
|---|---|---|
| K1 | `suggest` | strip between header and tabs: `Looks like this started as <Precon>.` · meta `N of its M cards are in this deck · same commander` · `Link it` · ✕ |
| K1d | (no frame) | ✕ pressed: strip gone for this deck + precon, remembered per browser (`deckId+fileName`); Versions foot row unaffected |
| K2 | `suggestSwap` | as K1, lead `…, with a different commander.`; meta names the precon's commander |
| K3 | `linkConfirm` | dialog / sheet: precon card, 3 facts (v0 · Shared · v1), `Cancel` · `Link` |
| K3p | (no frame) | pending / failed as R2 S1d / S1e: `Linking…`; failed line mono 11 `--danger` above the buttons |
| K4 | `linked` | no strip; header unchanged; Versions shows v0 last, naming the precon |
| K5 | `noSuggest` | rule not met (19%): header unchanged; Versions ends in dashed `Built from a precon?` row + `Link a precon`; v1 `initial` |
| K6 | `pickPrecon` | sheet: search, `Shares the most with this deck`, radio rows (select / unselect) with `N of M · in this deck`, foot names selection + consequence, `Link <Precon>` |
| K6n | (no frame) | nothing selected: foot `Select a precon to link.`; button disabled |
| K7 | `openPick` | open precon: `Link a deck` ghost beside Start (docked beside it at 390); sheet of decks most shared first; a deck linked elsewhere carries `built from X · linking moves it here` |
| K8 | `openLinked` | own box: `Your deck <D> was built from this. N of its M cards are still in it.` + `Unlink` |
| K9 | `rows` | row line `your deck <D> · built from this · N shared`; one line per deck, linked first; shared line shown when the addendum's rule holds or linked |
| K10 | `v1diff` | rail: vN current … v1 with delta; dashed divider `from the precon · before your first commit`; v0 dashed row, `the box`; v1's diff + dashed `against v0` box with `kept` count |
| K11 | `ciDiff` | as K10; shipped commander line `<precon commander> → <deck commander>` |
| K12 | `v0open` | v0 panel: full-width dashed note, `Open <Precon> ›`, `Unlink from this precon` |
| K13 | `unlink` | dialog / sheet: what leaves (v0), 1 fact (History), `Cancel` · `Unlink` (bone) |
| K14 | `brewV0` | linked brew: Versions tab drawn (count 1), `Not committed yet…` line, v0 alone, nothing current; `Commit as v1` as today |
| K15 | `suggestTwo` | strip `…one of two precons`; a row + `Link` per precon, same commander first then by share; ✕ dismisses both |
| K16 | `openTwo` | own box: linked deck sentence + `Unlink`, then `Your deck <D2> shares N of its cards.` |

### K must-nots
- Linking or unlinking never changes a card, printing, version, `since`, note, `committed_at`, status or claim.
- v0 never gets `current`, the accent rule, the accent number, `--surface-rail` fill, `committed`, or a games tally. It is never first in the rail.
- No verdict word or status colour on a share; shares are counts (`73 of 85`, `73 shared`).
- Selection copy says select / unselect, never tick.
- No suggestion on a linked deck. No link control or built-from line in the header.


---

## R4 addendum · tiles and Card view (T, G)
Canvas `The 99 - Precons R4 · Tiles and Grid.dc.html`; frame `Precons Tiles.dc.html` (`scene`). Adds a view to L and O; R2 and R3 otherwise stand. Full calls in `HANDOFF-R4 · tiles and card view.md`.

### The list in tiles (T)
| Id | Scene | What draws |
|---|---|---|
| T1 | `tiles` | **default.** Chassis + `ViewToggle` (▦ pressed); year heads; 4-up (900) / 2-up (390) `PreconTile`s; `N more from YYYY` (canvas only) |
| T1o | (no frame) | Most owned in tiles: no year heads; one grid by share, then newest, then A–Z |
| T1f | (no frame) | filtered / searched: as L1f; the grid holds the matches |
| T2 | `rows` | ≣ pressed: R2's rows, unchanged; `?view=rows`; stored `the99:precons:view` |
| T2u | (no frame) | `?view=` absent: stored view, else tiles. `?view=` unknown: ignored |
| T4 | `tilesEmpty` | L2's band above the first year head; every figure `0 of M`; no shared feet |
| T5 | (no frame) | loading: skeleton tiles (`TILE_SHELL`, `--surface-sunken`), 4 per year at 900, 2 at 390 |
| T6 | (no frame) | no match / feed down: L3 / L4 bodies, unchanged; the well still draws in the chassis (L3) |

### The tile (T3)
| Id | Case | What draws |
|---|---|---|
| T3a | high share | `you own 88 of 88` · name · pips `PIP · Mar 2024`; foot: shared deck. No bar, no word, no colour |
| T3b | low share | `18 of 67`, drawn exactly as T3a |
| T3c | linked (R3 K9) | foot line: deck name (link) / `built from this · 73 shared`; linked deck first, one line per deck |
| T3d | twin | one tile; foot `also sold as a Collector's Edition` |
| T3e | partners | two cards staggered in one art box, 66% wide each, 5px radius; caption unchanged |
| T3f | missing art | plate: commander name 12.5 `--fg-muted` + `no card image yet` mono 9 `--fg-locked` |
| T3g | (no frame) unmapped | foot `1 card not in our catalog yet` mono 9.5 `--fg-faint` |

### The open precon (G)
| Id | Scene | What draws |
|---|---|---|
| G0 | `openList` | **default.** R2 list + `ViewToggle` (≣ List view pressed) at the right of the list-note line |
| G1 | `openCard` | ▦ Card view: groups as G0; read-only `DeckCardTile`s, 4-up / 2-up; commander first; dot + `not owned`; nameSub printing; basics one dashed tile per name at the foot of Lands (`×15` · `basic · not counted`) |
| G1p | (no frame) | partners: Commanders group, two tiles, V2 notes |
| G1u | (no frame) | unmapped: as O4; the card has no tile |
| G1e | (no frame) | empty collection: as O5; every tile `not owned` |
| G2 | (no frame) | a tile pressed: card details on the precon's printing (O6); desktop hover preview as the list |
| G3 | (no frame) | stored `the99:precons:openView`; independent of the deck page's view |

### T / G must-nots
- Nothing drawn over a tile's art: no figure, pip, mark or wash.
- No verdict word, bar, dimming or status colour on a tile's figure or a card's state; `not owned` is the only word, and it's the dot's.
- No editing affordance on a Card view tile: no ✕, buy tag, chip, lock, proxy mark, claim or draft edge.
- No caption line added for a state; only the foot grows, and only with the row's own lines.
- A card image box's radius never below 3.1% of its rendered width.
- The view switch never moves Start, Link a deck, the own box or Unlink.
- No motion.
