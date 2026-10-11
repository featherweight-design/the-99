# Plan: Tuning hub build (roadmap sub-project 5)

2026-10-11. Builds `design/design_handoff_the99_tuning_hub/` (R1 canvas A, R2 canvas C's History
frames) on top of what is already shipped: Suggested changes (`tuning-panel.tsx`) and Proposed
cuts (`cuts-panel.tsx`, #1362), both mounted directly in the Analysis tab today
(`analysis-panel.tsx:217-226`). Mana Balance's engine is on main with no UI
(`src/lib/tuning/mana-balance*.ts`). Approved by the orchestrator as Hugh's proxy before build.

## PR boundaries (one at a time, no stacking)

### PR 1: the landing, the switch, the trim-line shortcut

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
  panels already do. Dates in US short form (`Oct 7 · 9:40 PM`).
- Suggested changes and Proposed cuts mount inside the hub unchanged.
- Trim line `Proposed cuts →` on `spine-desktop.tsx` and `spine-mobile.tsx`, shown when the
  deck is over (the shipped `built > bodySize`, which is the design table's condition). It
  switches to Analysis, opens Proposed cuts, scrolls the Tuning heading to the top and focuses
  the tool heading. The shell holds a one-shot `{ tool, nonce }` request the hub reads on mount.
- Copy: `src/lib/copy/tuning-hub.ts` from the handoff's copy file, the hub and shortcut blocks
  only, then `/copy-review`.
- Design table: `docs/superpowers/design-tables/tuning-hub.md` already exists (moved in #1362);
  this PR checks the hub rows against what ships and fixes the A1 status ink row.

**Which tiles draw before their tool exists.** The hub ships behind a new switch,
`TUNING_HUB_ENABLED` (`'true'` AND `ANALYSIS_TAB_ENABLED`), on staging only until all four tools
are in. Off, the Analysis tab is exactly today's. On, a tile draws only when its tool's own switch
is on and its tool is built: PR 1 draws Suggested changes and Proposed cuts, PR 2 adds History,
PR 3 adds Mana Balance. The two-tile grid is a staging-only transition; production turns the hub
on once the four are there. `docs/deployment.md` gets the row.

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
