# Brief: Game history (a player's past games across all decks)

**For:** Claude Design. **Prompt:** to be written by the orchestrator from this brief.
**Existing handoffs to extend:** `design/design_handoff_the99_game_log/` (the Games tab on a deck, its history rows,
the log form), `design/design_handoff_the99_rule_zero/` (Log this game from a table), and the deck stats beads.
Where a shipped component and a handoff disagree, the component wins.

## The ask

A consolidated view of a player's past games across all of their decks. Today a game can only be read one deck at a
time. **Open for Design: where this lives and what it shows.** This brief inventories what exists so Design starts from
it.

## What exists today

**The log (deck game log, #9).** Each logged game is a `deck_games` row on one deck (`src/db/schema.ts`):
- `result` (win, loss or draw), `pod_size` (2 to 8), `played_at` (what history sorts on), an optional 140-character
  `note`, and an optional `version_id` (the deck version played; old games stay if the version is deleted).
- `deck_game_axes`: what worked or hurt, from a fixed vocabulary (`src/lib/decks/game-axes.ts`).
- `deck_game_opponents`: up to 7 seats, each a friend (name snapshot), a friend's deck (deck and commander snapshots),
  or anyone by catalog commander and an optional label of 30 characters or fewer; and which opponent won a game the
  owner lost.
- Opponents sit behind the social games switch, and every row draws its snapshot, never a friend's live rows.

**Where it is drawn.**
- The deck's **Games tab** (`src/components/decks/games-panel.tsx`): a headline, an aggregate, the inline log form, then
  the history rows (`game-history-row.tsx`) newest first, and matchups (`game-matchups.tsx`) split by commander, color
  identity and friend, as counts with denominators and no rate. The handoff draws confidence rather than gating:
  no percentages at any N, the figure `net` is never rendered, and the heading is a description below 3 games and a
  finding from 3 (`LOW-N-summary.md`, `PATTERN_MIN = 3`).
- **Deck stats beads** per deck (`src/lib/decks/stats-query.ts`, `deck-stats-results.tsx`): the results grouped per deck.
- **Rule 0**: `Log this game` from a table opens the seated deck's Games tab with the form open and every other seat
  filled in. A game logged this way is an ordinary `deck_games` row on that deck. There is no table id on the row.

**Reads that already span decks (none drawn):** `src/lib/lineup/load.ts` reads every game for the lineup as
result, date and pod size only, with no deck name and no opponents. `src/lib/profile/play.ts` summarizes games for deck
tuning. No page lists games across decks, Home draws no game section, and the Me page brief
(`2026-10-21-me-page.md`) does not mention games.

**Visibility.** Games are owner-only. Every read filters on the owner, and no friend-facing read touches `deck_games`.
A friend's name or deck inside a game is the owner's snapshot of it. A consolidated view inherits this: it is the
reader's own history and is never shown to a friend.

## Hugh's constraints

- Games with no opponents logged, and old games, must read as well as full ones.
- Nothing in the view judges a deck or a player: the Games tab's rule of describing, not grading, carries over.

## The situations to design for

1. **"What have I played lately?"** Across all decks, newest first, with each game's deck.
2. **"How has this deck done against that friend or commander?"** Today only inside one deck; a consolidated view might
   answer it across decks.
3. **A reader with one deck, or a few games**: the view must not feel empty or rigged.
4. **A reader with a long history**: paging or grouping.
5. **Correcting a game** (no edit action exists today for a note; Design says whether the view is read-only).

## Every state to draw

At 390 and on desktop:
1. A populated view with games from several decks.
2. A few games only (1, 2, then 3 and over, matching `PATTERN_MIN`).
3. No games yet: where a reader is pointed, and how it relates to Log this game and the deck's own log form.
4. A game with opponents, a game with none, a game with a deleted version or a deleted friend deck (snapshots).
5. A long history: grouping, paging or window.
6. Failure to load.
7. The social games switch off: opponents absent, view otherwise whole.
8. A deck that was deleted after games were logged on it (games cascade with the deck today; Design notes what the
   view assumes).

## Open calls for Design

1. **Placement.** A new place or tab, a section on Home, the Me page, a view inside Decks, or the deck stats beads
   growing a door. Design recommends one and says what it displaces.
2. **Content.** The row (deck, date, result, pod, opponents, note), whether axes appear, and any aggregate above the list.
3. **Filters and grouping.** By deck, by opponent, by month, by result; which are worth the room on a phone.
4. **Relation to the deck's Games tab.** Whether a row opens that deck's tab at that game, and whether the tab
   remains the only place to log.
5. **Aggregates.** What a cross-deck summary may say without grading (counts with denominators, no rate), and how it
   reads at low N.

## Not in scope

- Editing or deleting a game from the view (the log form's own rules stay).
- Showing a reader's games to friends, or any friend's games to the reader.
- New logged fields.
- Rule 0 tables themselves (brief D).
- An About entry: Hugh decides at launch.

## What eng builds before the handoff lands

A cross-deck read joining games to their deck's name and the opponents, owner-only, windowed. The UI waits on this
handoff.
