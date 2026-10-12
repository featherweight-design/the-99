# STATES: Stats on /decks, R2 deltas

| Id | Scene (`Decks Stats.dc.html`) | What's new |
|---|---|---|
| S1 | `first` | First visit: `recency` open, the rest folded with summary lines. `Expand all` |
| L2 | `open` | All open (replaces L1). Clustered pips throughout. The bracket chart in rows. Among: lines + rank. Jobs grid and What each deck is worth (proposals). Curve against lands is cut |
| T5 | `partner` | Wanted by your commanders filtered to HD - Gods: the select shows its mark, chips `40% or more · 4` / `20% or more · 11`, and rows read the pair's own list |
| F2 | `finished` | As F1, with R2 drawing |
| fold | any card | Head press toggles it. Summary visible only when folded. Remembered per device. `Collapse all` when every card is open |
| mark | prop `mark` | `cluster` (drawn: 1 · 2 in a row · 3 triangle · 4 diamond · 5 star, WUBRG clockwise from top) · `pips` · `symbols` · `stripes` (R1) |

R2 must-nots, added:
- The word "Lineup" never reaches a player.
- A folded card always shows its summary line. It's never a bare title.
- Among: a rank never comes with "best", "worst", "too" or a color.
- Pips are never the only label. Every chip and row prints the deck name.

---

# STATES: Lineup (R1)

Every frame is drawn at 900 and 390. `scene` is the prop on `Lineup.dc.html`, and `lineupEnabled` mirrors `LINEUP_ENABLED`. Staging: 21 decks, 3 brews (Gishath, Kratos, Thorin), 6 played, 14 analyzed.

## Switch and placement

| Id | Scene | LINEUP_ENABLED | View row | Body |
|---|---|---|---|---|
| P0 | `decksOff` | off | shelves (900) / `All decks 21 ▼` (390), as shipped | tiles. No Lineup read |
| P1 | `decks` | on | `Tiles · Lineup` (Tiles) + shelves / shelf trigger | tiles. Tile `…` menu: shipped items + `Among your decks` |
| L1 | `lineup` | on | `Tiles · Lineup` (Lineup) + `All decks · Finished only` + scope line | seven cards |
| — | `?view=lineup`, switch off | off | as P0 | tiles. The param is ignored |

## Filter

| Id | Position | Scope line | What narrows | What doesn't |
|---|---|---|---|---|
| L1 | All decks (default) | `21 decks · 3 brews included` | — | — |
| F1 | Finished only | `18 finished decks · 3 brews left out` | lanes, Never played (12 of 18), slots, colors, shared rows (Sol Ring 17 of 17), wanted count, strips, medians | owned counts, the collection's copy total, value total |

## Cards (L1)

| Card | Draws | Press | Empty / thin |
|---|---|---|---|
| When each deck last played | `won 2 of 7` · `7 games · pods of 3–5`. 6 lanes, newest first. Never played · 15 of 21 | deck name → deck | T2: no lanes, all in Never played |
| Brackets and colors | 9 slots, 14 squares. Not analyzed 7. Facts. Colors W10 U10 B6 R11 G8 C1 | slot → names its decks; name → deck | T3: empty slots, 21 not analyzed |
| Cards your decks share | 8 rows by decks. Filled = held, dashed = wanted, none left | card → card detail; row → decks with no copy + cart link | T1: one sentence |
| Your collection, put to work | 2 unit fields + fact + wanted by your commanders (40% · 67 / 20% · 144) | deck → deck; card → card | — |
| This deck among yours | 6 strips. Chosen deck in accent | select → deck list; dot → deck | T1: absent |
| Decks that share the most (proposal) | 4 pairs | pair → cards both play | needs 2 decks |
| Curve against lands (proposal) | 21 squares, median lines | square → deck | — |

## Thin data

| Id | Scene | Cards drawn | What differs |
|---|---|---|---|
| T1 | `one` | recency, spread, shared, collection | lead sentence. Shared: `A card is shared once two decks play it. You have one deck.` No strips |
| T2 | `noGames` | recency | `No games logged yet.` + where games come from. No results line |
| T3 | `noAnalysis` | spread | slots empty, sentence, 21 under not analyzed. Colors drawn |
| T4 | `colorless` | spread, among | Eldrazi grey, ringed. Slot 3 open with `colorless`. Colorless row 1 |
| T5 | `partner` | collection, among | Gods counted once, WUR. Wanted row `read from the pair’s own list` |

## Must-nots
- No verdict word (`short`, `crowded`, `gap` as a judgment, `missing`, `unused`, `dead`, `best`, `worst`) and no `--warning` / `--danger` on a chart. The one `--warning` is the link to the cart, as on Money.
- The word "labels" never appears. Jobs are "the same cards as each deck’s Jobs".
- Never "tick". Select / unselect only. Lineup has no checkbox this round. The filter is a segmented choice.
- Never-played decks are never hidden or folded away, under any filter.
- No adjusted results, no win rate, no percentage of games.
- A per-copy total never counts a shared card once per deck. Only the strips (each deck's own value) do, and their foot says so.
- Lineup never re-derives a deck's bracket, date or record. It reads the deck's own.
- No Lineup read, switch or `?view` with `LINEUP_ENABLED` off.
