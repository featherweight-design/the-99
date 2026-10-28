# Measure (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

- `pnpm measure:load` times the pages and the card-details press in a real browser at 1300x900
  and 390x844. It is the before/after tool every performance PR puts in its body (the performance
  lane, from `plans/2026-09-27-performance-research.md`). Per route (Home, `/decks`, a deck,
  `/collection`, `/commanders`, `/discover`) it reads cold, warm and client-navigation loads:
  TTFB, the first frame `<main>` holds content rather than the route's `LoadingScreen`, when the
  server finished streaming, and the first card image. It also reads the card-details press on the
  deck page, to the dialog and to its art: cold, warm, another cold card, and after INTENT (a
  pointer resting on the card, or focus at 390 as a keyboard reader would), which is what the
  prefetch is for; a tap starts no prefetch, since one started by the press has no head start. The
  median of `MEASURE_RUNS` runs (default 7), printed as a Markdown table, after one discarded
  warm-up load of every route at every width: the first request a route gets after an idle spell
  pays the server's warm-up, and without that pass it read as a regression on whichever width ran
  first (2026-10-12).

  **Every press is timed IN THE PAGE** (`scripts/lib/press-probe.mjs`): from the pointerdown, or the
  push the harness makes itself, to the first animation frame holding the result. Never by when a
  Playwright wait returns, because those re-check on a backoff that reaches 500ms. Timed that way, the
  cold card press read as ~230, ~330 or ~830ms, a false "slow mode" in 2 of 7 runs, while a trace of
  every run showed the dialog at 204-338ms. Card-press DIALOG figures from before 2026-10-13 carry
  that quantization, and the intent press carried ~15-40ms of harness overhead. The art, soft-navigation
  and tile figures were polled every 16ms, so they were never quantized: they read late by that
  interval plus a harness round trip. One press is not on a probe: the `MEASURE_PRESS_AT` startup
  pass reads the page's own clock at the push and at arrival, but finds arrival by polling every
  16ms rather than on the first frame, because it also matches the destination's query. And a press
  that replaced the document (a hard navigation, which Next makes when a deploy lands mid-run) loses
  its probe, so that sample falls back to the wall clock, polled every 16ms.

  **Point it at `next start`, never `next dev`**, whose compile times swamp every figure. The
  server runs on a scratch Neon branch holding a `pull:staging` copy, and the worktree's `.env`
  `DATABASE_URL` must name that branch: `env.mjs` loads `.env` over the shell, so a
  `DATABASE_URL` on the command line reaches the server but not the harness. The harness signs in as
  `E2E_AUDIT_USER_EMAIL` and marks the About entries seen, and refuses production and staging for
  that write, by `neon.branch_id`. Two optional readings:

  - `MEASURE_SERVER_LOG`: the stdout of a server started with `PERF_TIMING=1`. The `[perf]` lines
    `src/lib/perf/timing.ts` logs after each request are attached to the route they timed, so a
    before/after says WHICH read moved. Off, `perfRoute` hands every request one frozen no-op
    tracker, and the test pins that. The line carries route patterns, labels and milliseconds, and
    never an id or a name.
  - `MEASURE_DB_URL` with `MEASURE_DB_BRANCH`: database execution time per warm load, from
    `pg_stat_statements`, reset before each load. The reset is a write, and the figure means
    nothing on a database others are using, so it runs only when the URL reports the named branch,
    and never on production or staging.

  **`MEASURE_PROFILE=slow`** runs every page under Chrome's own Slow 4G (562.5ms latency, 180,000
  bytes/s down) plus a 4x CPU throttle, through CDP: the profile the navigation-pending brief
  measured, so the two tables read side by side. **`MEASURE_ROUTES=collection,discover`** measures
  only the routes named, since a slow run of all six takes a long time. It also prints the card
  images each cold load ASKED for and the kilobytes that landed, and the load event, recorded as
  null past 90s rather than failing the run. That null is a finding: before the grid's art loaded
  lazily, a cold `/collection` at 1300 asked for 200 images (20.3MB) and never reached its load
  event on the slow profile.

  **`MEASURE_DEPLOYED=1` measures deployed staging instead** (Hugh, 2026-10-12: a local server skews
  the figures; option C, production, is off). It refuses any host but `staging.the-99.dev`, and the harness itself writes to no
  database (the pages it loads write what any reader's visit writes, on the measurement account): it signs in with a Clerk sign-in token minted from
  `THE_99_CLERK_SECRET_KEY_STAGING` for the account `THE_99_E2E_AUDIT_USER_EMAIL` names (a testing
  token works only on a development instance; that account holds a copy of Hugh's staging decks and
  collection, made 2026-10-12), takes the deck as `MEASURE_DECK_ID`, loads one document after sign-in (the proxy set its About sheet cookie there until About moved to Home's banner, and sets none since), reads the
  `[perf]` lines from Vercel's runtime logs of `the-99-staging` (which needs `PERF_TIMING=1` there),
  and takes database time from `MEASURE_PGSTAT_URL` as the delta between two `pg_stat_statements`
  snapshots, never a reset (installed on staging 2026-10-12). `MEASURE_SERVER_LOG` and
  `MEASURE_DB_URL` stay local-only and are refused.

  **Two traps it was built around.** Playwright turns the HTTP cache OFF for a context carrying a
  route, and Clerk's testing token is one. So the harness signs in once, carries the session into
  contexts with no route, and only then is "warm" warm. The first version read 0 cached scripts on
  every warm load. And React's `cache` is not request-scoped inside a server action: the first
  timing module keyed its spans on it, and the card-details action logged its total with none of
  its spans. So `perfRoute` returns an explicit tracker instead.

- **Loading the deck page's Tuning tools on demand was tried and reverted** (#1639, reverted 2026-10-13, Hugh's lane
  ruling). `TuningHub` and the three tools behind `onDemand` wrappers, warmed at idle and on intent, took the hub, the
  tools and the `deck-tuning` and `tuning-hub` strings out of the startup chunk (about 34KB gzipped). Measured on deployed
  staging, slow profile, 7 runs: cold deck content 6480 to 6518ms at 1300 (no change, inside the spread); the Analysis tab
  pressed straight after load 2527 to 3393ms (the tools fetched on the press); pressed after idle unchanged; hover intent
  at 1300 3245ms against 2471ms, since 400ms of rest is shorter than the fetch on Slow 4G. Warming any earlier puts the
  chunks back in competition with startup, which cancels the only gain. Tables:
  https://github.com/HartiganHM/the-99/pull/1639#issuecomment-6143963075. Do not retry without reading them. #1633's cut
  (the copy modules out of Home and `/decks`) stands, with its guard `scripts/lib/client-graph.test.mts`.

- `scripts/measure-gap-line.mts` measures the commander row's gap line against a real
  database — read-only, no fixture, no locks. It exists because the line's `allPlayed`
  state turned out to be the DEFAULT rather than an edge case, and that is invisible from
  the code: the frequency is a property of the reader's played set, so it reads 5.4% on the
  seeded fixture account and 67.2% on the reference account in the same database. A
  measurement taken against the wrong account is how a state the reader sees two rows out of
  three gets designed as an exception.

  It prints the occupant distribution per lane, the distribution in each sort's first screen,
  the depth of the themes the row would name, and Option E's whole curve — the table the
  design table's rejection of "narrow the played set to each commander's top N tags" is
  sourced from. `MEASURE_USER_ID` picks the account; the default is the busiest, and it lists
  every account it saw rather than picking one silently.

  Two defects in it, both found by the pre-open pass rather than by running it, and both the
  same shape — **a script that restates a rule instead of calling it**. Its `Something new`
  order was a RATIO (unplayed / eligible) where the shipped `byNovelty` ranks on the absolute
  `unplayedCount`, so a commander with 2 eligible tags and 1 unplayed sorted above one with 30
  eligible and 12 unplayed, the reverse of the app; the header meanwhile called that order
  "ascending" while sorting descending, and claimed the script "orders by the same figures the
  lanes do rather than by a proxy" in the same breath. It now imports `byNovelty` and calls it.
  And it said "built decks" throughout: `loadPlayedTags` joins no `deck_versions`, so a BREW
  counts — deliberately — and `novelty.ts` records that this exact wording was corrected there
  once already. Every figure it prints includes brews.

- **`pnpm measure:strategy`** (`scripts/measure-strategy-axes.mts`) is the strategy-focus groundwork's re-test (research
  `boards/strategy-focus-research-2026-10-18.md`). The label themes have no word for artifact, Equipment and Aura,
  vehicle, big-creature or single-creature-type decks, so `src/lib/strategy/axes.ts` reads those off the front face's
  type line. `cards` holds no power, so a big creature is a creature of mana value 6 or more, a named proxy. Each axis
  scores `copies × ln(lift)` (floor 5 copies, baseline share floored at 0.5%), against two baselines printed apart: the
  catalog, and the commander's 64 highest-inclusion nonland cards. A list built around its commander's plan reads near
  0 against that average by construction, and an EDHREC average against itself always does. Its first run
  (2026-10-18): the catalog peak names the axis a reader would for nearly every list, but it does not separate precons
  from tuned decks (medians: decks 62.6, precons 56.9, older precons 42.3, `HD Tune` decks 46.3). It now scores through the shipped
  rule (`scoredAxes` in `src/lib/strategy/score.ts`, which drops `tribal` when a creature type scores) and also prints the
  radar and the stability run that set `MIN_NONLAND`; see `docs/agents/strategy.md`.

## `pnpm measure:any-cards-fill <fixture.json>`

Help me choose's "Any cards" fill run on a real collection, through the real `buildFillPlan` (no budget, no bracket).
It prints the role counts, the nonland cards by LABEL (the residual's rows are role `other` but still ramp or removal),
the land drops, the owned cards under the 10% floor that got in, and the cards EDHREC lists at 40% or more that were
left out. The fixture is `{ commander, rows: [[oracle id, quantity], ...] }`, pulled read-only and kept OUTSIDE the repo
(it is a player's collection). The script seeds those rows under its own fixture account, so it runs only on a scratch
branch made from local-dev (`assertScratchBranch` refuses production, staging and local-dev). For a before/after, run it
from two checkouts against the same branch and fixture. First used for Any cards fill tune #2 (Szarel, 2026-10-22).

## From AGENTS.md (moved 2026-10-28)

The rule-form bullets `AGENTS.md` carried for this area until 2026-10-28, verbatim. Where they and the text above differ in wording, both are current.

- `pnpm measure:load` times pages and the card-details press in a real browser at 1300x900 and 390x844: the before/after tool every performance PR puts in its body. Point it at `next start`, never `next dev`, on a scratch Neon branch holding a `pull:staging` copy whose URL the worktree's `.env` `DATABASE_URL` names; it refuses production and staging for its one write, by `neon.branch_id`. Presses are timed IN THE PAGE (`scripts/lib/press-probe.mjs`), never by a Playwright wait. Options (`MEASURE_PROFILE`, `MEASURE_ROUTES`, `MEASURE_DB_URL`, `MEASURE_DEPLOYED=1` for staging.the-99.dev only) are in the background file.
- **Loading the deck page's Tuning tools on demand was tried and reverted** (#1639, 2026-10-13). Do not retry without reading the tables at https://github.com/HartiganHM/the-99/pull/1639#issuecomment-6143963075. #1633's cut stands, with its guard `scripts/lib/client-graph.test.mts`.
- `scripts/measure-gap-line.mts` measures the commander row's gap line against a real database (read-only; `MEASURE_USER_ID` picks the account, default the busiest). The frequency is a property of the reader's played set, so measure the right account. It must import and call shipped rules (`byNovelty`), never restate them, and its figures include brews.
