# Plan: Tuning hub build (roadmap sub-project 5)

2026-10-11. Builds `design/design_handoff_the99_tuning_hub/` (R1 canvas A, R2 canvas C's History
frames) on top of what is already shipped: Suggested changes (`tuning-panel.tsx`) and Proposed
cuts (`cuts-panel.tsx`, #1362), both mounted directly in the Analysis tab today
(`analysis-panel.tsx:217-226`). Mana Balance's engine is on main with no UI
(`src/lib/tuning/mana-balance*.ts`). Approved by the orchestrator as Hugh's proxy before build.

## PR boundaries (one at a time, no stacking)

### PR 1: the landing, the tool switch, the trim-line shortcut

- `TuningToolMark` (four 24-unit inline SVG marks, `currentColor`, `aria-hidden`).
- `TuningHub`: heading `Tuning`, tiles in fixed order, `openTool` state held in the hub, so it
  resets when the Analysis tabpanel unmounts (it already unmounts on every tab switch,
  `builder-shell.tsx:312-314`). Desktop opens a tool under an underline tab row (`All tools` plus
  one tab per tool, marks at 14, a running dot); phone narrows to the tool with a 44px
  `‹ Tuning` back, the mark and `n of N tools`. No route change.
- `ToolTile`: ready, running (accent border, `anim-dots` dot, the tool's status words and
  elapsed `m:ss`), inert (Proposed cuts at 100 or under: dashed, not focusable, the reason as
  its purpose line). Status ink `--fg-muted`, never `--warning` (audit R2 decision 1).
- Tile status reads one server read, `readHubTiles(deckId)`, over `deck_suggestion_runs` and
  the two item tables: per tool the newest run (date, outcome, answered counts) and any pending
  run with its `createdAt`. While a run is pending the landing re-reads every 3s, as both
  panels already do. Dates in US short form: a tile says `Oct 7` (canvas A1), and History rows carry the time (`Oct 7 · 9:40 PM`).
- Suggested changes and Proposed cuts mount inside the hub unchanged.
- Trim line `Proposed cuts →` on `spine-desktop.tsx` and `spine-mobile.tsx`, shown when the
  deck is over (the shipped `built > bodySize`, which is the design table's condition). It
  switches to Analysis, opens Proposed cuts, scrolls the Tuning heading to the top and focuses
  the tool heading. The shell holds a one-shot `{ tool, nonce }` request the hub reads on mount.
- Copy: `src/lib/copy/tuning-hub.ts` from the handoff's copy file, the hub and shortcut blocks
  only, then `/copy-review`.
- Design table: `docs/superpowers/design-tables/tuning-hub.md` already exists (moved in #1362);
  this PR checks the hub rows against what ships and fixes the A1 status ink row.

**When the hub draws (revised by the orchestrator, 2026-10-11, after Hugh questioned a new
switch).** The hub has no switch of its own. It follows the tools' own switches, read by one
function, `tuningHubEnabled` / `hubTools` in `src/lib/tuning/flag.ts`: two or more tools on draws
the hub with a tile per tool; exactly one mounts that tool directly, as today; none leaves the tab
unchanged. A tile counts only once its UI is built (PR 1: Suggested changes and Proposed cuts;
PR 3 adds Mana Balance), and History is part of the hub, appearing with it from PR 2.

**Where the hub mounts (the one call this plan makes beyond the drawing).** The canvas mounts the
hub "with the reading, absent before one", but Proposed cuts deliberately does not wait for a
reading (a deck built long was never read, `analysis-panel.tsx:222-225`). So the hub mounts when
a reading is held OR the deck is over 100. With no reading, the Suggested changes tile is drawn
in the inert treatment Design already drew for Proposed cuts, its purpose line saying it needs a
reading. No new visual; the reason string goes to `/copy-review`.

### PR 2: History (H1 to H4, R2 canvas C)

- Migration: `deck_tool_counts` for FREE runs, one row per tool per list version
  (`unique (deck_id, tool, list_fingerprint)`, `summary jsonb`, `created_at`). Paid runs are
  already one row each in `deck_suggestion_runs`; its `model_call_id` is `not null` and settles
  an allowance, so free runs do not belong there. Proposed cuts' free count writes its row when
  the panel's count is read for a fingerprint not yet recorded; Mana Balance's free count joins in
  PR 3. No `user_data_touch` trigger: neither Home nor `/decks` reads it (`check:list-cache`).
- `readHistory(deckId, { tool?, cursor })`: the union of both tables, newest first, 20 a page.
- `HistoryList` (scroll container 420 / 460, sticky month headings, foot fade, single-select
  tool chips scrolling sideways on phone), `HistoryRow` (date, mark and short name, tier pill,
  summary, outcome), `PastRun` (read-only, with the dashed "the list has moved" note counting
  versions since the run's `read_version`), empty (H2b) and failed (H4).
- The History tile's status: `N runs · 1 running`.

As built (migration 0091), where it departs from or adds to the above:

- The free count is written only for a deck that is over (`summary` = `{ over, roles }`), and the
  write is non-fatal: a failed insert never stops the panel drawing.
- The free count is keyed on the LIST alone (`listFingerprint`), not on the tool's input
  fingerprint, which also moves with a lock, the intent or a declared bracket: one row per version
  of the list, as the foot says.
- A past run states no version and no "changed by N cards" figure. A run reads the live list,
  which can hold edits no committed version has, and no run stores the list it read, so neither
  figure could be stated truthfully; the note reads without one (`pastNoteUncounted`, an
  engineering string for `/copy-review`). Storing the list a run read is a follow-up if the figure
  is wanted.
- History lists and counts only the tools this deployment draws (`hubTools`): a tool whose switch
  is off has no chip and cannot be opened, so its runs are not shown either.
- A Proposed cuts deeper look opens to each named line's reason and its chips, quoted from the
  figures the run stored with its report.
- The desktop row's date column is 114px, not the canvas's 110: `Oct 17 · 10:40 PM` in 11px
  Plex Mono measures about 112px.
- A pending run past the reaper's cutoff reads `failed` in History, never `running`.
- Pages are keyed on `created_at` to the millisecond and the row's uuid, across both tables.
- A past run's line opens to its stored reason (and, for Suggested changes, its citations) as it
  read that day. Suggested's `read from …` manifest line is not drawn: runs do not store it.
- The Mana Balance chip draws only when the hub draws that tool (PR 3).

### PR 3: Mana Balance view (waits for the orchestrator's go on the addendum audit)

Canvas B as revised by the addendum, the land cell's `balance mana →`, the tile, and its free
count recorded to `deck_tool_counts`. Planned when the addendum is audited.

## Route by viewport inventory

`docs/superpowers/inventories/tuning-hub.json`, one route (`/decks/[id]`) at 390 and 1300:

| Row | State | PR |
|---|---|---|
| A1 | Landing, deck over 100 (Proposed cuts offered, `this deck is N over`) | 1 |
| A2 | Landing, deck at 100 (Proposed cuts inert) | 1 |
| A3 | A run in flight on its tile | 1 |
| A4 | A tool open (desktop tab row, phone `‹ Tuning`) | 1 |
| A5 | Your deck: the trim line's `Proposed cuts →` | 1 |
| A6 | Reset: Your deck and back shows the landing | 1 |
| NR | No reading, over 100: Suggested changes inert, Proposed cuts offered | 1 |
| H1-H4 | History ready, filtered, empty, a run opened, failed | 2 |

Fixtures: a `pull:staging` copy of Hugh's decks on a scratch branch; an over-100 deck is made
there, never on staging.

## About entry

Batched to the Tuning line's close-out (roadmap sub-project 7), not these PRs.
