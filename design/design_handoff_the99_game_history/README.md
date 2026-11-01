# The 99 · Game history (account 2, 2026-10-31)

Canvas: https://claude.ai/artifact/1XCrDWAFPn2LzCJtTHvrqU
Status: **Approved by Hugh, 2026-11-01** ("Update the tab order to be Decks/Games/Stats and then you're good to open a PR"), at R1c.
- R1 (6bb2425): the round.
- R1b (14d63cf, Hugh): each game row leads with its deck's commander art (26px, radius 6, the tile's art crop; a pair's first commander) instead of the identity mark. Fixture decks renamed to commanders the design folder has art for (Sai, Lathliss, Dina, Ashling, Zada, Killian).
- R1c (Hugh): the view switch reads **Decks · Games · Stats**. The Tiles segment is renamed Decks (copy only: `decksStatsCopy.view.tiles` = "Decks"; the value, cookie and URL stay `tiles`) and Games sits second, before Stats.

One consolidated view of a player's past games across every deck, at 390 and 1300 for each state, drawn over the shipped Decks page. A history, not a live tracker. Strings marked DRAFT go through `/copy-review`.

Brief: `docs/superpowers/design-briefs/2026-10-31-game-history.md` (main @5750460). Aligned with `design_handoff_the99_game_log` (the row, the low-N ladder), `design_handoff_the99_deck_stats_view` and `design_handoff_the99_lineup` (Stats on /decks, the recency card), `design_handoff_the99_social_r3` (vs line, trophy, snapshots) and `design_handoff_the99_rule_zero` (Log this game). Read on main: `decks-view.tsx`, `lineup/stats-view-switch.tsx`, `lineup/recency-card.tsx`, `lineup/identity-mark.tsx`, `lineup/deck-link.tsx`, `game-history-row.tsx`, `game-vs-line.tsx`, `src/lib/copy/{decks-stats,game-log,refresh}.ts`.

To view a board, open `Main.dc.html` or the board's own page, with `support.js` and `art/` beside it. `scratch-gen/` holds the generator: `ghlib.py` (kit; shell lifted from Small items 7, styles from its `Dates` board), `fx.py` (fixtures), one `b_*.py` per board; `build.py out b_pop:Populated …`, then `node render.js <abs out> Populated …` sets each preview size and reports broken images and overflow; `canvas.py` swaps `art/` for the canvas's `/_blob/` urls (`blobs.json`). Captures in `art/` are the About captures (`about_visual`); commander crops are Rule 0's.

| Board | What |
|---|---|
| `Main.dc.html` | Every call, the open questions, engineering notes |
| `Place.dc.html` | 1 · Where it lives: the Games segment, Stats' door, the landing on a deck's Games tab |
| `Populated.dc.html` | 2 · Every game, every deck: populated, filtered (a deck against a friend), the filter sheet and panel |
| `Rows.dc.html` | 3 · The row: six shapes (opponents, none, note, deleted version, deleted friend deck, anyone seat), social games off |
| `Few.dc.html` | 4 · 1, 2 and 3 games |
| `Edges.dc.html` | 5 · No games, a long history (window, loading, failed), first read failed, a deleted deck |

## The calls

1. **Placement.** A third segment on the Decks view row: **Decks · Games · Stats** (`?view=games`) on the shipped switch (R1c: Tiles renamed Decks, Games second). It displaces nothing: no rail item, no user-menu row, no Home section. One door: *See every game ›* on Stats' *When each deck last played* card. Drawn when Stats is (`LINEUP_ENABLED`, one deck or more).
2. **The row.** The shipped `GameHistoryRow` with its deck added (commander art + name: the row's first line on the phone, a 230px column on desktop, the Stats lanes' width) and a chevron; the ✕ removed. Every shipped slot stays: result square (W `--success`, L and D neutral), *N-player · date*, version stamp (`—` when deleted), marks, vs line (snapshot, trophy), note. The whole row is one press: the deck's Games tab at that game (`?tab=games&game=<id>`), scrolled into view and ringed for 2s.
3. **Filters and grouping.** Deck, Result, Played against (friends first, then commanders, with the reader's count of games against each; searchable). Phone: the deck picker in the shelf picker's slot; Result and Played against in the shipped filter sheet behind *Filter games*. Desktop: three dropdowns on the view row, Played against in the anchored panel. Active filters are chips on the shipped *No filters on* line. Grouped by month, newest first.
4. **Relation to the Games tab.** The tab stays the only place to log, correct or delete. Rule 0 games are ordinary rows with no table id, and a table expires after 24h, so a row has no Rule 0 link; Rule 0 is pointed to from the empty state.
5. **Aggregates.** Headline in the Games tab's voice: *23 games logged. 9–12–2.* Then counts: decks, pod sizes, span; *most played X, 8 of 23* from 3 games when one deck leads outright. Filters scope it: *5 games logged. 2–3.* · *HD - Sai with Colin at the table · pods of 4 · Aug to Oct 2026* · *Colin won 2 of the 3 you lost*. No percentages, rates, rankings, never `net`.
6. **Low N.** Under 3 games: a count (with the record from 2), one DRAFT line on where games come from, no filters. From 3 (`PATTERN_MIN`): filters and most played.
7. **Empty.** *No games logged yet.* + DRAFT body; *Log one on* [the shipped deck select, last-opened deck] **Log a game** (opens that deck's Games tab, form open); a Rule 0 line with *Your pods ›* when the social switches are on and the reader has a pod. No decks at all: the shipped `decks-zero` page, no view row.
8. **Long history.** 50 a read, *Showing 50 of 212 games* + **Show 50 more** (Loading… with the spinner); month heads count the whole month. Failure: shared toast with Try again, list kept.
9. **First read failed.** As Stats: the deck tiles stay drawn; Games adds the shared toast (*We couldn't load your games.* + Try again).
10. **Social games off.** No vs lines, no Played against; otherwise whole.
11. **A deleted deck.** Games cascade with the deck, as the shipped confirm says; no tombstone. A friend's deleted deck stays as its snapshot.

## Closed with the approval (drawn as is)

- Q1: the recency card's door only, or also *Every deck's games ›* on the deck's Games tab?
- Q2: keep the marks in the row (drawn, matches the shipped row) or drop them here?
- Q3: the two DRAFT lines.

## New strings (DRAFT unless shipped)

- `view.games`: "Games"; `view.tiles`: "Tiles" → "Decks" (R1c)
- `recency.everyGame`: "See every game ›"
- `games.headline(n, w, l, d)`: "N games logged." / "N games logged. W–L(–D)." (the Games tab's form)
- `games.span`: "N decks · pods of a–b · Jul to Oct 2026" (Stats' `pods` and `span`)
- `games.mostPlayed(deck, k, n)`: "most played {deck}, k of n"
- `games.scoped(deck, friend)`: "{deck} with {friend} at the table"
- `games.beatMe(friend, k, losses)`: "{friend} won k of the {losses} you lost"
- `games.low` DRAFT: "Games from every deck land here, newest first."
- `games.empty.title`: "No games logged yet."; `games.empty.body` DRAFT: "Every game you log, on any deck, lands here: who won, the pod, the date, who sat across the table."; `games.empty.pick`: "Log one on"; `games.empty.log`: "Log a game"; `games.empty.ruleZero`: "Playing with a pod? Its Rule 0 check seats the table, and Log this game fills in every seat for you." + "Your pods ›"
- `games.filter`: "Filter games", "All decks", "Any result", "Played against", "Friend or commander", "Won", "Lost", "Drawn", "Show N games", "Clear all"
- `games.count(n)`: "N games"; `games.window(k, n)`: "Showing k of n games"; `games.more`: "Show 50 more"; `games.loading`: "Loading…"; `games.all(n)`: "All n games"
- `games.failed`: "We couldn’t load your games."; `games.moreFailed`: "We couldn’t load more games." (+ "Try again")

## Errata (Small items 9, B1, 2026-11-01)

Confirmed as built; the shared pieces win over this handoff's boards:

- The Decks · Games · Stats switch is the shared compact `SegmentedSwitch`, 195×46 at 13px, with a hairline before the deck select (boards: 207×46, 14px, no hairline).
- The failed-read toast is the shared `ToastFrame`, centred, 358×54 (boards: pinned right, 356×58).
- Filter games uses the shared Sheet; the deck select is 16px below `md`.
- Filters that match nothing: see `design_handoff_the99_small_items_9/Games-NoMatch.dc.html`.
