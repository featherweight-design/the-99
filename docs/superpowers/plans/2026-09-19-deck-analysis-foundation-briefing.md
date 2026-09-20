# Epic Run Briefing — Deck analysis foundation (sub-project 1)

Feature-specific facts for the `epic-run` of the deck-analysis foundation. Run mechanics
live in the skill; this carries only what is true about THIS epic.

**This is a backend-only epic.** That fact does most of the work below: five of the seven
gates do not fire, the cold-eyes review has no screenshots to look at, and the launch-gating
answer is a real "nothing becomes reachable" rather than an omission. Each of those is
stated explicitly rather than deleted, because a deleted section reads the same as a
forgotten one.

## Source of truth (read in this order)

1. `docs/superpowers/plans/2026-09-19-deck-analysis-foundation.md` — the execution plan.
   21 tasks, six named PR boundaries, `§13 resolutions` (R1–R23) carrying every decision the
   spec deferred. **Follow its order exactly.** Its "Walkthrough ratifications" line records
   the five calls Hugh ruled on 2026-09-19; none is re-opened by this run.
2. `docs/superpowers/specs/2026-09-19-deck-analysis-foundation-design.md` — the spec.
   §2 is the locked rulings; §13 is the list the plan resolves. The plan's "Spec findings"
   section names nine places the spec is wrong or stale — **the plan wins on all nine.**
3. `docs/superpowers/design-briefs/2026-09-19-where-deck-analysis-lives.md` — Round 0 of
   five, out with Design. Its §6a addendum carries the plan deltas Rounds 2–4 draw against.
   Nothing in this epic waits on it.
4. No design handoff exists and none is needed — see "Gates" below.

## Current state (verified 2026-09-19)

- **Repository variables** (`gh api repos/HartiganHM/the-99/actions/variables`):
  `CATALOG_REFRESH_ENABLED=true`, `COMMANDER_INDEX_ENABLED=true`, `PRICE_REFRESH_ENABLED=true`.
  **`COMBO_REFRESH_ENABLED` does not exist** — PR 2 adds the workflow that reads it, and the
  variable must be created (`true`) or the weekly cron silently never fires. Creating it is a
  named close-out step, not an assumption.
- **Environments**: `catalog-staging` and `catalog-production` both exist. The new workflow
  fans out over both through a `plan` job feeding a matrix — never an expression on
  `environment`, the bug this repo has found three times.
- **Migrations**: high-water mark is `drizzle/0039_harsh_lord_hawal.sql`. This epic adds
  0040–0045; the numbering shifts if PRs land out of order, which is why each task says
  "generate", never "write".
- **Test suite**: 6,989 passing on `spec/deck-analysis-foundation` @ `eb7fefdd`; typecheck,
  lint and the stub-DB build all green.
- **Neon topology**: `local-dev`, `catalog-staging`, `catalog-production` per AGENTS.md and
  the topology memory. **NOT verified today** — the Neon MCP token had expired at authoring
  time. Re-verify at kickoff before pointing any script at anything.
- **Things that intentionally do not exist yet**: every table this epic adds; the
  `ANTHROPIC_API_KEY`-dependent prose path is untouched by this epic; no `/decks/[id]`
  analysis route and no About entry (both belong to Tier B).
- **Bookkeeping bindings**: the-99 has **no `releases.ts` and no `progress.md`** — those
  steps in the skill's run loop are Concert Crawl's and do not bind here. This repo's
  equivalents are the AGENTS.md entry per new job/check/probe (Task 21) and GitHub issues for
  follow-ups.

## Risk shape — event-driven, decisively

The epic's core is **records created by something else happening**: a weekly cron sweeps an
API and ingests a 656 MB bulk file; a monthly job widens what it already fetches and writes
composition columns; a derivation step computes a floor from those. Every headline failure is
silent — a cron that never fires logs nothing, a partial publish un-flags cards behind a
green job, a name-index regression drops resolutions and reports success.

Where this epic's bugs will actually come from: **the publish paths and the job wiring**, not
the pure functions. The verdict functions are pure and exhaustively unit-tested; the ingests
touch three upstreams, two databases and four workflows, and every one of the plan's R11/R12
floors exists because a previous ingest in this repo failed quietly in exactly that way.

**Gate 6 is the whole ballgame here.** Over-invest in it; do not spend a night forcing
loading states on a feature with no UI.

## Launch gating — nothing becomes reachable, and that is a decision

**No PR in this plan makes anything newly reachable to an end user.** Stated explicitly per
the template rather than deleted, and it is true in the strong sense: this epic ships no
route, no component, no copy on any surface, and no change to what any existing page renders.

Two things that look like exceptions and are not:

- **Task 3 widens the card-detail read** with a `bracketFlags` field. No component reads it,
  so nothing is drawn. It is a payload field with no consumer until Tier B — the one place a
  player-facing payload changes without a player-facing change.
- **Task 17's `decks.declared_bracket`** (moved to PR 5) is written by no surface. It exists
  so Tier B's Round 3 ask has somewhere to land.

What DOES go live, operationally: the weekly `Combo refresh` cron (gated on the new
`COMBO_REFRESH_ENABLED` variable, which is the flip) and a new step inside the monthly
`Commander index` workflow. Neither is user-reachable.

**No changelog or About entry is held back, because none is owed.** Sub-project 1 ships no
feature a reader could discover; the About entry and `ABOUT_VERSION` bump are a named task in
the Tier B plan (spec §11.1 says so explicitly, and this line exists because "backend only,
so no entry" is exactly the reasoning that let the post-import summary reach `main` with none).

## Off-happy-path homes — no new USER states; three new RECORD states

No PR here puts a **user** into any state, so the IA question has no rows. The states this
epic creates are records, and each is named with what reads it and what happens while nothing
does.

| New state | Where it lives | Who reaches it | Reversible? |
|---|---|---|---|
| A card flagged mass-land-denial / extra-turn | `card_bracket_flags` | `loadBracketFlags`, the profile, the card-detail payload (drawn by nothing) | Yes — the next ingest replaces the table wholesale |
| A commander/pair with composition + a floor | `commander_support.avg_*`, `commander_pair_support`, `format_staples`, `identity_composition` | `fitSkeleton` via the profile | Yes — recomputed by each index run |
| A deck with `declared_bracket` set | `decks.declared_bracket` | The verdict's `declared` / `declaredOutsidePermits` | Yes — nullable, and no surface writes it yet |
| **Partial use:** flags published, variants not | `card_bracket_flags` fresh, `spellbook_variants` stale | The profile — combos read yesterday's variants, flags read today's | Yes — next run reconciles |

That last row is a deliberate design outcome (plan R12), not a gap: the two stores answer
different questions, so a bulk failure that leaves fresh flags beside yesterday's variants is
coherent. It is listed because it is a state the system can sit in for a week.

## Walk script — the operational journeys

There is no user journey to walk. The equivalent is the job and reader lifecycle, and Gate 5's
four passes map onto it directly. Each journey names where it runs.

### Journey A — the combo ingest (PR 2)

1. **Forward:** `pnpm db:seed:combos` against `local-dev`. Expect: 54 sweep batches, per-source
   flag counts printed, both floors and the resolution share passing, flags published, the
   bulk streamed, variants published, `catalog_refreshes` stamped. Row counts non-zero in all
   three tables.
2. **Reverse:** there is no undo, and that is the point — the analogue is the REFUSAL path.
   Set a floor above the measured count, re-run, and confirm: non-zero exit, both figures
   printed, and `select count(*)` unchanged on all three tables. (Plan Task 6 step 4 makes
   this a required run, not an optional one.)
3. **Repeat:** run it twice in a row. Second run must leave the same row counts and a moved
   `computed_at` — an ingest that doubles its rows or halves them on a second pass is the
   failure R12 exists to prevent.
4. **Resume:** kill the run mid-bulk. Expect: flags already published and standing (they
   commit before the bulk streams), variants untouched from the previous run, non-zero exit.

Runs on `local-dev`. **Never production.**

### Journey B — the index widening and the floor (PRs 3–4)

1. **Forward:** `pnpm db:build:index` then the `db:build:staples` step, against `local-dev`.
   Expect: `avg_*` populated on `commander_support`, pair rows for every distinct pair in
   `decks`, `format_staples` matching a same-sitting re-run of `measure-staples.mts`, and
   `identity_composition` carrying both identity and `count:` buckets.
2. **Reverse:** none — these are derivations, replaced wholesale each run.
3. **Repeat:** re-run staples alone; the floor must be byte-identical for an unchanged index.
   A derivation that moves without its inputs moving is a bug.
4. **Resume:** the index build already supports `RESUME_SINCE`; confirm a resumed run does not
   blank the composition columns of commanders it skips.

### Journey C — the verdict (PRs 5–6)

1. **Forward:** `pnpm probe:bracket` against `local-dev`. Every check green, fixture deleted.
2. **Reverse:** the probe's own `finally` — confirm the fixture user's rows and every sentinel
   are gone afterwards (`select` by the run's `user_id` returns nothing).
3. **Repeat:** run the probe twice; the second run must not collide with the first's leftovers.
   Two per-run `user_id`s, so a collision means cleanup failed.
4. **Resume:** N/A — a probe run is atomic.

Plus the mutation runs the plan names (Task 20 step 4): each must FAIL the probe. A mutation
that passes is a check that measures nothing.

## Gates — which fire, and why the rest do not

| Gate | Fires? | Why |
|---|---|---|
| 1 State reachability | **No** | API→UI seam. No UI PR follows in this epic; Tier B's plan runs it. |
| 2 Forced-state runtime | **No** | Nothing renders. The analogue is Journey A's refusal path, which IS run. |
| 3 Sibling duplicate sweep | **Yes, narrowly** | Not for copy — for CONSTANTS. Tasks 2 and 16 move classifier patterns into production modules; grep that no second copy survives in the measure scripts (the plan makes the scripts import the module, and a leftover local const is exactly this class). |
| 4 design-review both halves | **No** | No handoff, no UI. Recorded rather than skipped silently. |
| 5 Journey lifecycle | **Adapted** | The three journeys above, four passes each, in `docs/superpowers/journey-lifecycle-deck-analysis.md`. |
| 6 Side-effect provenance | **YES — the main event** | Below. |
| 7 Copy review | **No customer-facing strings** | The detection-basis sentences (`"23 of 24 on a curated set…"`) ship as DATA with no surface drawing them; Tier B's copy review covers them when a surface does. Note the-99 has no `jsx-no-literals` rule, so the diff is read by hand — for these PRs that read is trivial. |

**Gate 6, concretely.** For each of the three triggers (`Combo refresh` weekly, `Commander
index` monthly + its staples step, and the profile read that consumes them):

1. **Fires** — dispatch the real workflow and confirm the rows exist, per environment.
2. **Fires once** — dispatch twice; confirm row counts stable and no duplicate-key failure.
   The idempotency mechanism is named explicitly per table: delete-and-refill inside one
   transaction for all five ingest tables, `onConflictDoUpdate` for `commander_support`.
3. **Right audience** — the analogue of "the wrong user" here is **the wrong environment**.
   The three-times-found bug in this repo is a scheduled run reaching production alone. Confirm
   BOTH matrix legs ran on the scheduled path, not just a dispatched one.

Lifecycle: nothing marks these records read; retention is "replaced by the next run"; the
empty state before any trigger has fired is the one that matters most — a profile whose
composition is null and whose staples are absent must report `basis: "none"` and no target,
never a zero. That is a unit test (Task 12) and a probe check (Task 20), because it is the
state every database is in until the first widened index run.

Artifact: `docs/superpowers/side-effects-deck-analysis.md`, recording the command run and the
output seen — not "verified ✅".

## Mid-run cold-eyes review — adapted, still mandatory

The screenshot capture is meaningless here. The adaptation keeps what makes the review work —
a reviewer arriving cold, seeing the whole vertical at once, starved of the build's rationale.

**Trigger:** the moment a deck yields a complete verdict end to end — i.e. when PR 6's
`slotDeck` first runs against a real profile, which is the earliest the "vertical" exists.

**Capture:** run `probe:bracket` with verdict output printing enabled, plus `slotDeck` +
`fitSkeleton` dumped for **five real decks** off `local-dev` — including the motivating deck
(HD - Gods) and at least one pair and one thin-data commander.

**Critic subagent gets:** those five verdict dumps, the spec's §6.2 quoted WotC rules, and
§2's locked rulings. **Not** the plan, the diffs, or any rationale. Its brief: does each
verdict read as TRUE against the quoted rules, does any figure appear without its
denominator, does anything read as a judgement the app did not earn, and would a player
carrying this to a table be misled.

Fix everything valid in-run; notify and keep building; never wait.

## Hard pause points

- **Any production database migration.** The migrations here run automatically on the Vercel
  production build, which is the existing mechanism — but a manual `db:migrate` against
  `catalog-production` is a stop-and-ask.
- **Pointing any script or probe at `catalog-production`.** Every seed and probe in this epic
  is destructive within its scope: `db:seed:combos` deletes and refills three tables for every
  user, and `probe:bracket` writes sentinel rows into shared catalog tables.
- **Any change to the five ratified walkthrough calls** (plan's "Walkthrough ratifications").
  If a review round argues one of them is wrong, stop and ask — they are Hugh's, not a
  reviewer's.

## Notify-and-proceed

- **Creating `COMBO_REFRESH_ENABLED`** — validate the workflow on a manual dispatch against
  staging first, capture the run summary, then create the variable and report. No customer
  impact either way; the cost of waiting is a week of no ingest.
- **Dispatching the ingests against `catalog-staging`** — the standard path for every other
  job in this repo. Capture the printed counts in the run report.
- **Dispatching `Commander index` against `catalog-production`** at close-out. It is the
  existing monthly job with two new columns; the alternative is production sitting with null
  composition until the 3rd. Validate on staging first, capture both summaries.

## Done means

- All six PRs merged at the full `pr-review` bar, in plan order.
- Gate 3 (constants sweep), Gate 5 (three journeys × four passes) and Gate 6 (three triggers)
  each passed with a committed artifact recording **evidence**, not attestation.
- The mid-run cold-eyes pass ran when the first verdict was reachable, and its triage list is
  closed.
- `pnpm probe:bracket` green against `local-dev`, and all six named mutations confirmed to
  fail it.
- `COMBO_REFRESH_ENABLED` created; `Combo refresh` dispatched successfully against BOTH
  environments; `Commander index` dispatched against both, with composition, pairs and the
  staples floor confirmed populated in each.
- AGENTS.md carries an entry for `db:seed:combos`, `check:spellbook`, `db:build:staples`,
  `build:combo-features`, `probe:bracket` and the `Combo refresh` workflow.
- The #10 amendment note is on `docs/superpowers/plans/2026-09-07-deck-tuning-suggestions.md`.
- **No About entry, deliberately** — recorded above, owed by the Tier B round.
- The run report produced via `feature-run-report`.
