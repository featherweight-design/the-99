# Log-your-game reminder: plan

Handoff: `design/design_handoff_the99_log_reminder/` (READINESS Yellow). Approved by Hugh 2026-11-22. Three PRs, in order, no stacking, each opened after the previous merges. Each is RISKY (`/code-review medium` plus the risk checklist, Copilot off).

The feature: after a Rule 0 night, a player who sat at a table and has not logged the game is reminded (closed-table page link, a Home card, a push), and the Log opens on the game they played.

## PR boundaries

| PR | Scope | Files (est.) |
| --- | --- | --- |
| 1 DATA (this PR) | Retention to `expires_at + 7 days`; a game is addressable (`game=` on the Log URL); result seats keyed per game; `deck_games` remembers which game it logged; the log prefill gate moves to the 7-day window. No UI, no copy. | 10 to 14 |
| 2 SURFACES | Log link on the closed-table page for a clock-expired table; Home card (per-request read in `PER_REQUEST_READS`, read in `src/lib/social/`, joined to the grant on the viewer, `public_id` only, `ThirdPartyName` for names); dismissal table plus its `purgeAccount` entry; dismiss does not revalidate Home. Phone and desktop in one PR, design-review table, contact sheet, feature-acceptance. | 12 to 16 |
| 3 PUSH | Push kind `rule_zero_log` (constraint migration, `PushItem` variant, per-table merge, `ThirdPartyName` at flush), behind `PUSH_ENABLED` and the reader's push settings; copy through copy-review. No new switch. | 6 to 8 |

## PR 1 in detail

### Retention

Today `setTable` deletes the pod's clock-expired tables (`expires_at <= now()`), so a night's table and its result vanish when the pod sets the next one, and the Log works only until the original morning (`tableLoggable`).

- `setTable` deletes only tables past `expires_at + interval '7 days'`. Result seats, seats and `rule_zero_seen` cascade with the table.
- A kept clock-expired table must never read as open. Every pod-table lookup already filters `tableOpen` (`closed_at is null and expires_at > now()`), so a kept row cannot shadow a new table, occupy the pod, or draw as OPEN in `rule-zero-open.ts`, the pod row, the Home table card, or `setTable`'s one-open-table check. A test pins each: the predicate stays the single source and a row past its morning but inside 7 days is not open.
- New predicate `tableKept` (`expires_at + interval '7 days' > now()`, the database clock) in `rule-zero-open.ts`. Every read that surfaces an ended table (the closed-table read, the log prefill) applies it in SQL. `tableLoggable` (inside the night) is unchanged: the tracker's roster, save and Undo stay inside the night.
- **No sweep.** There is no cron over `rule_zero_tables` and this PR adds none. A pod that never sets another table keeps its last table's rows past 7 days, inert: every read filters its own window, so they read as nothing. They go on the pod's next `setTable`, with the pod (cascade), or in the account purge (`purgeRuleZeroIn` removes tables by setter, closer or seat membership with no expiry filter). A test pins that an 8-day-old table of an idle pod reads as nothing on the log and closed-table reads, and that `purgeRuleZeroIn` removes it.

### A game is addressable

A table can now hold several games inside the window, so a log names its game.

- `rule_zero_result_seats.started_at` (when the tracker issued the game's roster) becomes the game's id. Backfill `started_at = saved_at` where null, then `not null`.
- Key swap, in one migration, on a table of at most 8 rows per live table: drop the primary key `(table_id, user_id)` and the seat unique, add primary key `(table_id, started_at, user_id)` and unique `(table_id, started_at, seat)`.
- `saveTableResult` no longer deletes the table's rows: it replaces only this game's rows. A roster older than the newest stored game still refuses (`mayReplace`), so a stale device cannot add an out-of-order game. Undo already deletes one game's rows.
- `deck_games.rule_zero_game_at timestamptz` (additive, nullable, no backfill, no index): the game a log drew. A log made before this column carries null and keeps the old rule (a game logged at or after the result's save).
- "Logged" is per game: a deck game of the viewer at this table with `rule_zero_game_at` equal to the game's `started_at`, or null and created at or after the save. `loggedSinceSave` takes the game.
- The Log URL accepts `game=<epoch ms>` beside `table=` (`logPrefillTable` and the Log href builder in `table-view.ts`). Without `game=` the Log picks the newest game the viewer played and has not logged. The game id is milliseconds since the epoch, floored, compared in SQL as `floor(extract(epoch from started_at) * 1000)`. The tableRef the form posts carries the game, and `logGame` stores it in `rule_zero_game_at` only past the same grant check that stores `rule_zero_table_id`.
- Only the log prefill gate moves to the 7-day window (`tableSeatsQuery`, `resultSeatsQuery`, the closed-table read's `loggable`). Nothing else.

### Migrations against live traffic

Both migrations apply during the Vercel production build. Additive first: the `deck_games` column is a nullable add with no default (metadata only on Postgres 11 and later). The key swap runs in one migration statement block: backfill, `set not null`, drop, add. `rule_zero_result_seats` holds one row per seat of each tracked game, so the lock is brief. Row counts on staging: read-only check pending (no read target available to this lane at plan time; the table is bounded by games tracked, and the migration does not depend on the count). If it ever held millions the key swap would need a concurrent index build; it does not.

### purgeAccount

`rule_zero_result_seats` and `deck_games` are already in the purge. The new column holds a timestamp, no identity. A test confirms an idle pod's 8-day-old table and its result seats are removed by `purgeRuleZeroIn`.

### Tests

- kept expired table never reads open (`tableOpen`, pod table lookup, `setTable` check)
- `setTable` deletes only past 7 days (rendered SQL)
- `tableKept` window in the closed-table read and prefill
- result seats per game: two games coexist; a stale roster refuses; Undo removes one game
- logged per game: game 1 logged does not hide game 2
- `game=` parsing and href
- purge covers an idle pod's old table

## Not in PR 1

Surfaces, copy, push, dismissal storage: PR 2 and PR 3.
