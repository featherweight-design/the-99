# The 99 · Log-your-game reminder (account 2, 2026-11-21)

Canvas: https://claude.ai/artifact/SqfAbKgXeauwgf14vge2Wq (Version 3, R1)
Status: **R1, awaiting Hugh's review.** No handoff PR until it is approved.

A light, stateful addendum to Rule 0 and the life tracker: remind every player at a Rule 0 table to log the game
after it ends. It touches Home, a push, and the table page once the table has closed. Low Sun theme, drawn over the
shipped Home captures (`public/about/pages/amonkhet`) and the shipped table page parts used by
`design_handoff_the99_life_tracker` (S4, S6 and U5 boards).

To view a board, open any `*.dc.html` with `support.js` and `art/` beside it (`scratch-gen/map.json` maps blob ids to
`art/` files). `scratch-gen/` holds the generators: `gen_log.py` (every board but L2), `gen_l2.py` (L2, from the
life tracker's U5 boards) and `subst.py` (blob ids, measured heights, `canvas.json`).

## Locked (the prompt, Hugh 2026-11-21)

1. When a game result is saved, every other seated player whose seat has a deck gets one push.
2. Anyone with an unlogged game from a table gets a Home card until they log it or dismiss it.
3. Both open that player's own Log this game form, pre-filled ("Seats filled; change anything.").
4. Logging stays per player. Nothing is logged for anyone automatically.

## Boards

| Board | What |
|---|---|
| Main | The calls, in one place |
| H1 OneGame (Phone, Desktop) | Home right after a game: Tonight's table, then **Game to log** under it |
| H2 Several (Phone, Desktop) | Three games to log: one card, one row per game, newest first; the oldest on its last day |
| H3 Dismissed (Phone, Desktop) | The card hidden with ✕: shared toast with Undo |
| N1 Push (Phone, Desktop) | iPhone lock screen at the 9:00 release (one game); macOS banner for two games from one table |
| C1 InWindow (Phone, Desktop) | Closed table inside the week: **Your game** card over Log this game |
| C2 Ended (Phone, Desktop) | Closed table after the week: why nothing is filled in, **Log it by hand** |
| L1 Logged (Phone, Desktop) | Closed table after you logged: a check note, no Log |
| L2 Device (Phone, Desktop) | The open table on the device that ran the game: Colin logged, you have not |

## The calls

### 1. The Home card (H1 to H3)

- **Shell**: `home-table-card.tsx`'s, unchanged (surface-rail, 1px accent border, the seats' art blurred behind,
  14px radius; one row from `xl`). It lives in the same `data-home-tables` block, **after** every Tonight's table card:
  while the table is open the open table comes first; once it closes the reminder leads Home.
- **One game** (H1): kicker `Game to log`, the pod and date (`Thursday night · Thu, Nov 19`) beside it; the heading is the
  result (`Colin won`, `You won`, `A draw`); the four seat tiles from the Last game card (art, name, place, the winner
  ringed); `Seats and result are filled in for {deck} until {date}.`; **Log this game** (ACCENT_BUTTON) opens the
  viewer's own form, filled in. Desktop: one row, left column 230px (kicker, result, pod and date), tiles and
  sentence in the middle, the button, then ✕.
- **No rounds or length** on server-drawn cards: they live only on the device that ran the game. The date stands in.
- **Dismiss** (H3): a bare ✕, 44px hit box, top right (desktop: after the button). It hides that game's reminder for
  that player only; the shared toast says `Reminder hidden. Log this game stays on the table until {date}.` with
  **Undo**. Hiding also drops a push still waiting for that game.
- **Several games** (H2): from two on, one card, kicker `Games to log · N`. One row per game, newest first: the
  winner's face (40px, ringed), the result, `{pod} · {Mon D}`, `{your deck}, {your place}`, a `Log` pill (the whole
  row is the link, at least 68px tall) and the row's own ✕. A game on its last day carries `Last day` in
  `--warning`. Up to 4 rows; more adds `Show N more` under them (not drawn: four games in a week is the realistic top).

### 2. How long it lasts (the window)

- **A week.** Seats and result stay filled in until **6 am seven days after the table's night** (Thursday's table
  closed Fri 6 am, so its games fill in until Fri, Nov 27, 6 am). Weekly game nights are the common rhythm: a week
  covers a forgotten weekend, and the next game night brings its own reminder.
- Unchanged: Tonight's table still leaves at 6 am; Undo still ends at 6 am or at the first log (Undo addendum).
- **Closed table page, inside the week** (C1): for a seated player whose game is not logged yet, a **Your game** card
  (the Last game card's shell, drawn from the saved result: kicker, date, result, tiles) with
  `You haven’t logged it yet. Seats and result are filled in for {deck} until {date}.`, then **Log this game** and
  **Back to Friends** (the host-closed layout, C3 to C5). Two games from one table: one card each, newest first, each
  with its own Log this game.
- **After the week** (C2): a clock note, `Logging from this table ended {date} at 6 am, so nothing is filled in now.
  Your game with {deck} can still be logged by hand.`, then **Log it by hand** (the deck's Games tab, blank form)
  and Back to Friends. The card on Home is gone.
- **Logged** (L1): the Your game card keeps the result with a check note `You logged this game on {day} at {time}.
  It’s on {deck}’s Games tab.`; no Log button. Everyone not seated, or seated without a deck, sees the shipped page.

### 3. The push (N1)

- **Kind**: a new outbox kind beside the seat push (`rule_zero_log`, not a feed kind): no What's new row, no
  Settings checkbox, the master push switch alone (`src/lib/feed/kinds.ts:47` pattern). Queued in the result save's
  transaction for every seated player but the saver whose Start seat has a deck. `item_key` is `game:{tableId}:{startedAt}`.
- **Timing: keeps the 21:00 to 09:00 hold** (unlike the seat push). A game saved at 10:41 pm goes out at 9:00 the
  next morning. At release the flush drops games the player has logged, hidden, or that were undone, so the people
  who logged at the table hear nothing. A game saved before 21:00 goes out live.
- **One push per table per release**: two games from one table merge; two tables stay two pushes.
- **Copy** (for copy-review):
  - One game: title `{winner} won at {pod}’s table` (`You won at…`, `A draw at…`); body `Log your game: {deck} and every seat are filled in.`
  - Title over 40 characters: title `{winner} won. Log your game`; body `From {pod}’s table. {deck} and every seat are filled in.`
  - Two games, one table: title `{n} games at {pod}’s table`; body `{first} won, then {second} did. Log both: every seat is filled in.` (`then you did`)
- **Landing**: one game opens that player's Log this game form for it; several open Home, where the card lists them.
- No card image (icon only, as the seat push).

### 4. The device that ran the game (L2)

The Last game card's `Not logged yet: Log this game fills it in.` reads wrong once the note above it says
`Colin logged this game at 10:41 pm, so this ending stays.` It becomes
**`You haven’t logged it yet: Log this game fills it in.`** and follows the Home card's rule exactly: the viewer's own
log since the result was saved (`loggedSinceSave`). Log anywhere and both go together.

### 5. The result dialog (not drawn)

Optional copy-review line for `tracker.result.logWin`: `Everyone seated gets a reminder, with Colin’s win filled in.`
It tells the player holding the device that nobody needs chasing.

## Needs from engineering

1. **Keep every game's result.** Today a save deletes the table's earlier result (`saveTableResult` replaces it), so a
   rematch would wipe the first game's fill. Results key on (table, `started_at`); the prefill, the card and Undo read
   one game.
2. **Log prefill window**: `tableLoggable` (6 am) still gates the tracker and Undo; the log prefill and the reminder read
   `expires_at + 7 days` for seated players.
3. **Dismissal**: one row per (player, game) holding when it was hidden; Undo deletes it.
4. **Push**: `rule_zero_log` in `PUSH_OUTBOX_ALL_KINDS`, NOT in `HOLD_EXEMPT_KINDS`; merged per table on release.
