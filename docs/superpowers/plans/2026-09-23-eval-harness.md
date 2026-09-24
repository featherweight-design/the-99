# Eval harness (sub-project 10) — plan

Lane brief: `boards/lanes/eval-harness.md`. Status: **approved by Hugh, 2026-09-23**, with one
change: the Haiku prompt-tuning round (run plan step 2b), added before any spend.

## Goal

Find the cheapest model and prompt configuration whose deck-tuning suggestions and deck overviews
Hugh judges as good as the current Sonnet's. Prove it with the app's own accept contracts and a
blind side-by-side read. Then size the per-player allowance so that full use by Hugh and 6 friends
costs no more than $10 a month.

## What was measured before writing this (free, read-only)

- **Staging holds one account with 19 decks, all whole (97+ cards).** Two decks have logged games,
  the games carry 3 notes between them, and no deck has a stated intent. So the real rated set
  barely exercises tuning's games, note and intent citations, which are the grounding rules most
  likely to separate a cheap model from Sonnet. That gap is handled below as a separate synthetic
  set. It is never shown to Hugh as if it were his.
- **The app's Sonnet 5 calls run with adaptive thinking.** `callModel` sends no `thinking` field,
  and on Sonnet 5 an omitted field means adaptive thinking. Thinking tokens bill as output, so the
  real per-answer cost is probably above the brief's ~$0.05 estimate. The calibration step measures
  it. Haiku 4.5 runs with no thinking when the field is omitted.
- **Prompt caching probably saves almost nothing, and the plan measures that rather than assuming
  it.** The only byte-stable prefix shared across decks is the system message, a few hundred
  tokens. The minimum cacheable prefix is 1,024 tokens on Sonnet 5 and 4,096 on Haiku 4.5, and
  anything shorter silently does not cache. The deck itself is a prefix only across repeats of the
  same deck within the cache TTL, which in the app means the client's one retry and a
  synopsis section retry. Rates: cache write 1.25× input (5-minute TTL) or 2× (1-hour), cache read
  0.1× input.
- **The Batch API is 50% off every token, including cache reads and writes**, and accepts
  structured outputs. Haiku 4.5 supports `output_config.format`. The harness uses batches for every
  run where latency does not matter, which is all of them except the cache measurement: cache hits
  inside a concurrent batch are best-effort, so that one measurement is made with sequential
  real-time calls.

## The rated set

1. **Primary: all 19 staging decks**, read-only, as they stand at the snapshot, split once by a
   seeded shuffle (seed recorded in the results) before any output is seen:
   - **4 development decks**, used only to develop Haiku prompt variants (step 2b), and never
     scored by the decision rule;
   - **15 held-out decks.** Every figure the decision rule reads is computed on these 15, and they
     are the 15 of Hugh's blind read. The same split serves both features.
2. **Evidence overlay (tuning only, automatic metrics only): 6 of the 19 decks**, each given in
   memory a stated intent and a short fixed game log with notes. That covers the games, note and
   intent citation rules the real data never reaches. The overlay text is written into
   `scripts/eval/fixtures/evidence-overlay.json` and committed with PR 1, before any run. It is
   injected into the `EvidencePack` after `buildEvidencePack` returns and before `buildPrompt`, so
   the real prompt builder renders it. Nothing is written to any database. It is never part of the
   blind read.

## The harness (PR 1, `scripts/eval/**`)

- **The real code, imported and never copied.** Tuning: `tuningInputs` → `loadDeckProfileFromHead`
  (uncached, so no request context is needed) → `readOwnedOracleIds` → `buildPlayGroup` →
  `buildEvidencePack` → `buildPrompt` → the request → `tuningResponseSchema` →
  `nameResolver` over one catalog read → `validateSuggestions`. The overview: the synopsis lane's
  PR 2 fact and oracle-text readers → `buildSynopsisFacts` → `buildSynopsisPrompt` →
  `synopsisResponseSchema` → `validateSynopsis`. The overview half starts only once that PR has
  merged, so the harness imports its readers instead of writing its own.
- **One request builder, pinned to the app's.** The batch path cannot go through `callModel`, so
  the harness builds each request with a function whose output a unit test compares
  field for field with what `callModel` hands `messages.parse` (captured through `callModel`'s
  injected `messages`). If the app's request shape changes, that test fails instead of the harness
  quietly measuring a different request.
- **Retries modelled as the app runs them.** A malformed reply gets exactly one more attempt, in a
  follow-up batch, as `callModel` does. The cost of both attempts is charged to that answer.
- **Staging is read-only, enforced twice.** Every pooled connection runs
  `set default_transaction_read_only = on` before it is handed out. The harness then refuses to
  start unless `neon.branch_id` reports the staging branch and the setting reads `on`. Checked
  2026-09-23: a `create temp table` through that connection fails with "cannot execute CREATE
  TABLE in a read-only transaction". It follows the scripts `.env` convention; it checks the database it reached, not the URL.
- **Results go to local files only:** `docs/superpowers/eval/runs/<run-id>/`, one JSONL row per
  answer, holding the request hash, model, variant, the raw reply, every usage meter, the
  outcome, the drops and refusals, and the cost. The reports are regenerated from these files, so
  a report can be recomputed without spending.
- **Commands:** `pnpm eval:tuning` and `pnpm eval:synopsis`, each taking `--cells`, `--decks`,
  `--trials` and `--dry-run`. A dry run prints each cell's token count (`count_tokens`, which is
  free) and the projected cost, and sends nothing.

## Spend budget and how the harness enforces it

- **$25 hard cap** for reaching the decision, held in a ledger file
  (`docs/superpowers/eval/ledger.jsonl`), one line appended per batch. Cost is computed from the
  recorded usage meters: input, output, cache write, cache read, at the published per-model rates
  with the batch discount applied.
- **Before each batch is submitted**, the harness takes its worst case: every request's counted
  input tokens plus its full `max_tokens` as output, doubled for a possible retry. If
  spent-so-far plus that worst case crosses $25, the batch is not submitted and the run stops.
  So the cap holds even if every reply runs to its ceiling.
- **Spend is printed after every batch.** At **$15 spent before the halfway point of the run plan
  below**, the harness stops and I report to the orchestrator rather than continuing (brief,
  "Stop and ask").
- **Projected cost of the whole plan: about $12 to $16.** The calibration step replaces that
  estimate with measured figures before anything large is submitted.

## Run plan

0. **Calibration, about $0.50.** Real-time, one deck, one call per cell, to measure real
   input/output/thinking tokens per feature and model. Then re-project the full plan from those
   figures and post the projection to the orchestrator. If the projection is over $20, the plan
   comes back for trimming before anything else runs.
1. **Tuning model sweep:** 19 decks × 3 trials × three cells: Sonnet 5 as shipped (baseline),
   Sonnet 5 at `effort: "low"`, and Haiku 4.5.
2. **Tuning efficiency variants**, each on Haiku 4.5 and the baseline, 19 × 3:
   - **trimmed context**: the pack reduced before the real builder renders it. The staples list is
     capped (at 15), and no card line carries a field the rules and the validator never read. The
     exact cuts are listed in the harness, one line each, with the reason.
   - **tighter output ceiling**: `max_tokens` at the measured 95th percentile of accepted replies
     plus headroom. A ceiling only saves money when it truncates something, so what this
     measures is the malformed rate it costs, and the report says so.
3. **Tuning evidence overlay:** the 6 overlay decks × 3 trials × the three model cells.
4. **The overview, once synopsis PR 2 merges:** steps 1 and 2 repeated. Its trim is the rules
   text: reminder text in parentheses removed, and no rules text for basic lands.
5. **Cache measurement, real-time:** for each feature, the baseline and the cheapest candidate
   sent twice back to back on 3 decks, with `cache_control` on the system block and on the deck
   block. It reports the cache meters and the saving on the retry path. With no saving, the
   report says caching is not worth the lanes' change.
6. **Blind read** (below), one candidate per feature.

**2b. Haiku prompt tuning (Hugh, at approval).** The goal is Haiku with a prompt strengthened for
it, not Haiku on Sonnet's prompt. After step 1, Haiku's measured failures on the 4 development
decks are read: refusal reasons, drops by rule, malformed output, names outside the deck. Up to
**2 rounds** of variants are then aimed at them. Each variant is a TRANSFORM the harness applies to
the real builder's output or to the pack before the real builder renders it: an added system line,
a reordered section, a rule restated. It is never a copy of the prompt and never an edit under
`src/`. Each transform lives in `scripts/eval/variants/`, one file per variant with its reason, and
a unit test asserts it starts from `buildPrompt`'s own output. The best variant on the development
decks then runs on the 15 held-out decks as one more Haiku cell and competes under the same decision
rule, within the same $25 cap and $15 stop. The overview gets the same round once its half runs.
A winning variant goes to the owning lane through the orchestrator as a proposed prompt change,
with its diff against the shipped prompt.

## Automatic metrics, per feature × model × variant

- **Outcome rates:** survived, refused (per section, with each refusal reason counted), malformed
  after the retry, and upstream failure. The vocabulary is the one both features share.
- **Tuning:** suggestions returned per run, suggestions kept per run, and each drop counted by its
  rule (`cardExists`, `addNotLegal`, `duplicate`, and every `suggestionRules` key).
- **Names the model gave that are not in the deck:** a cut naming no card in the deck, an add
  naming no catalog card, a synopsis `[[mark]]` that resolves to nothing.
- **Tokens:** input, output (thinking included, since it bills as output), cache write and
  cache read. Mean and 95th percentile.
- **Cost per answer and cost per ACCEPTED answer**, each at real-time and at batch prices. Tuning's
  accepted answer is a run with at least one suggestion kept. The overview's is a run with all four
  sections passing; a run with only some sections passing is reported beside it. Cost per
  accepted answer is total spend in the cell divided by accepted answers, so a model that refuses
  twice as often costs twice as much per accepted answer.
- **Stability:** the same metrics per trial, so a cell whose pass rate moves between trials shows
  it.

An automatic pass rate says an answer was ALLOWED. It never says the answer was GOOD. That is the
blind read's job.

## The blind comparison Hugh does (PR 2)

- An Artifact page with a `db` capability, which the orchestrator helps publish. For each feature,
  15 decks. Each deck shows the Sonnet baseline's first-trial answer and the candidate's, as the
  player would see them: kept suggestions only, and passing sections, with a refused section
  shown as the app shows it. Left and right are randomized per deck, with a seed stored server
  side. The model is never shown, and neither are cost or token counts.
- Hugh answers **Left better / Right better / Same** per deck, with an optional note. Answers are
  stored in the page's database. The harness reads them back and un-blinds them.
- Each deck's decklist is one click away, so a suggestion can be judged against the deck.
- Only Hugh's picks decide quality. No model grades anything.

## The decision rule (written before any result is seen)

For each feature, with **S** the Sonnet 5 baseline as shipped:

1. **Eligible candidates** are the cells cheaper per accepted answer than S that meet all of:
   - a survived rate no more than 10 points below S's;
   - for tuning, a mean of kept suggestions per run at least 80% of S's, and on the evidence
     overlay a survived rate no more than 10 points below S's;
   - for the overview, a per-section pass rate no more than 5 points below S's on every section;
   - a malformed rate (after the retry) of at most 5%;
   - names outside the deck in no more than 5 points more of answers than S.
2. **The blind candidate** is the eligible cell with the lowest cost per accepted answer. Only
   that one goes to Hugh.
3. **It passes the blind read** when, of the 15 decks, Hugh prefers S on **at most 5**, and
   prefers S on no more than 3 decks more than he prefers the candidate.
4. **If it passes, it is chosen.** If it fails, the next-cheapest eligible cell may get a second
   blind read, with Hugh's agreement and within budget. If no cell passes, **S stays**, along with
   any efficiency variant of S that meets rule 1 against S itself.
5. **The allowance** is sized from the chosen cell's real-time cost per answer, including the
   retry rate the runs measured. The allowance is shared units per player per rolling 24 hours,
   so c is the higher of the two features' costs. Worst case per month is
   30 × (6 × A_friend + A_Hugh) × c ≤ $10, with 30 × A_Hugh × c ≤ $5 as the owner's cap. The
   report gives the largest whole-number allowances that satisfy both, beside `allowance-rule.ts`'s
   own rule, `floor(B / (2c))`.

**The adaptive-thinking finding goes in the report as a direct question for the tuning lane:
should `callModel` set `thinking` or `effort` explicitly?** It is asked with the measured numbers
beside it: thinking tokens per answer, and their share of cost, for Sonnet 5 as shipped and at
`effort: "low"`.

A result the rule did not anticipate, such as the blind read and the automatic metrics pointing
opposite ways by a wide margin, goes to the orchestrator rather than being resolved here.

## Deliverables and PR boundaries (no stacking; each merges before the next opens)

1. **PR 1: the plan, the harness and the tuning runs.** This file, `scripts/eval/**`, the overlay
   fixture, the request-builder test, the `package.json` scripts, and the tuning results and
   metrics report under `docs/superpowers/eval/`. About 10–14 files; results are data files.
2. **PR 2: the overview runs and the blind page.** The overview half of the harness (after synopsis
   PR 2), its results, and the blind-comparison page source under `docs/superpowers/eval/`.
3. **PR 3: the report.** `docs/superpowers/eval/report.md`, holding the chosen model and prompt
   per feature, the measured cost per accepted answer, the allowances, Hugh's blind result, and
   the total spend taken from the ledger.

All three stay inside the fence. The chosen constants (`TUNING_MODEL`, `SYNOPSIS_MODEL`,
`MODEL_DAILY_ALLOWANCE`, any prompt change) are **handed to the tuning and synopsis lanes** through
the orchestrator. This lane never edits them.

## What this lane will ask the orchestrator for

- Publishing the blind page with a `db` capability.
- Notice when synopsis PR 2 merges.
