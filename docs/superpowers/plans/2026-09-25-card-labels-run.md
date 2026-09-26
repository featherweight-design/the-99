# Full-run plan: label every card's jobs and their limits

> **APPROVED by Hugh on 2026-09-26**, together with the one-time full run at about
> $41 — above the normal caps, with his approval recorded. Conditions carried into the
> tasks below: a hard stop at $55 worst case, PAY ONCE (generate on staging, copy to
> production), production writes by job or workflow only, and no player-visible change
> until a consumer PR reads the labels behind `SWAP_TOOLS_ENABLED`.
>
> The model is **Sonnet 4.5**. Sonnet 5 was measured on the same 508 cards and does
> NOT beat it on the restriction family this feature turns on — 0.727 against 0.864 on
> the gating subset, and the only model to miss a tribal restriction — despite better
> job recall and a slightly lower projected cost. It follows the sample and its report
> (`2026-09-25-card-labels-report.md`), whose recommendation is **Sonnet 4.5, about
> $41.09 for 31,830 Commander-legal cards** — $28.36 more than Haiku, one time.
>
> **Sonnet wins on gating restrictions (0.864 against 0.767), trigger (0.942 against
> 0.867), recurrence (0.87 against 0.8), job recall (0.834 against 0.761) and
> invented restrictions (5 against 7). Haiku keeps the ramp kind, 0.913 against
> 0.875.** Both models score 1.000 on TRIBAL restrictions, so the Warg's Wolf clause
> is solved by either; the choice turns on the wider gating set and on trigger.
>
> Two corrections stand behind those figures, both recorded in the report: the first
> draft recommended Haiku on a number from an uncommitted command, and the first
> sample was contaminated by two-faced cards — `oracle_text` carries both faces, so
> the model was labelling back-face abilities against front-face-only gold, and the
> text-rules baseline was measured without the `frontFaceOracle` the real consumer
> applies. The sample was re-run.

**Goal:** store one label document per card — its jobs, and the LIMITS on each —
so E1's stand-in matching can refuse a match that shares a job and nothing else.

**Why it is worth building:** today's text rules score **0** on every limit's
non-default subset. Not poorly — zero, because they cannot express a limit. The
sample measured Sonnet at 1.000 on the tribal restriction and 0.875 on the ramp
kind, the two limits behind `Bejeweled Warg` matching `Runadi`.

**Tech:** Drizzle on Neon, the Anthropic batch API, the `scripts/.env` convention.

## Global constraints

- **Nothing runs per request, ever.** This is a build-time pass, read from a table.
- **Spend: a hard stop at $55 worst case**, which is Hugh's approved ceiling with
  roughly 30% headroom over the $41.09 projection — the headroom exists because the
  rates behind that projection are UNVERIFIED (the cost endpoints need an Admin API
  key this repo does not have). **If the projection moves past $50 once real batches
  report their tokens, PAUSE and report rather than continuing.** A hard `--max-usd`
  flag REFUSES rather than truncating. The sample's estimator is the model
  (`scripts/label-cards-run.mts`), including its refusal path.
- `ANTHROPIC_API_KEY` through `scripts/lib/env.mjs`. Never printed, never logged.
- **The job vocabulary is 2b's** (`src/lib/recs/roles.ts`, `src/lib/recs/themes.ts`)
  and the four ramp kinds are d9's ruling. Asserted against those files by
  `card-labels-schema.test.mts`, never copied.
- **Batches go direct to `api.anthropic.com`.** This repo's `ANTHROPIC_BASE_URL`
  proxy (`127.0.0.1:8787`) has no `/v1/messages/batches` route and answers
  `cave_route_not_found`. Batch pricing is half of standard, so this is the
  difference between $41.09 and $82.18.
- **Migration number: check main's journal at build time.** 0067 is next free as of
  2026-09-25 (journal ends 0066_about_seen_ids), and several lanes are open, so it
  will move. A collision is regenerate-and-restamp, not renumber by hand.

---

## Task 1 — storage

**Files:** create `drizzle/00NN_card_labels.sql`; modify `src/db/schema.ts`.

```
card_labels
  oracle_id      uuid primary key references cards(oracle_id) on delete cascade
  labels         jsonb not null            -- the jobs array, schema-validated
  model          text not null             -- e.g. claude-haiku-4-5-20251001
  prompt_version text not null             -- LABEL_PROMPT_VERSION
  input_hash     text not null             -- see below
  labelled_at    timestamptz not null default now()
```

- **`uuid`, not `text`.** `cards.oracle_id` is `uuid("oracle_id")`
  (`src/db/schema.ts:33`), and Postgres requires compatible types either side of a
  foreign key — a `text` column here makes the migration invalid, not merely untidy.
- **Keyed on `oracle_id`, not `scryfall_id`.** A label is a fact about the CARD, not
  the printing; the catalog has 31,830 Commander-legal rows and 31,830 distinct
  oracle ids today, so there is no dedup saving, but a future reprint must not need
  relabelling.
- **`input_hash` mirrors `proseInputHash`** (`src/lib/prose/prompt.ts`): sha256 over
  `[oracleId, name, typeLine, oracleText, LABEL_PROMPT_VERSION, model]`. The name and
  type line are in it because a card renamed or errata'd under its existing oracle
  id leaves a stored label describing something else — the case the prose hash
  records for the same reason. **The model is in it** too, so switching models
  relabels rather than silently mixing two models' output in one table.
- **No `on delete set null`**: a card leaving the catalog takes its label with it.
- Steps: write the migration; add the table to `schema.ts`; `pnpm db:generate` and
  confirm the generated SQL matches; `drizzle-kit check`; commit.

## Task 2 — `db:build:labels`

**Files:** create `scripts/build-card-labels.ts`,
`src/lib/labels/{schema,prompt,parse}.ts`; modify `package.json`.

Promote the sample's four scripts into the app's own modules. `card-labels-schema.mjs`
(DONE in PR 2: it is now `src/lib/labels/schema.ts`, and every consumer imports it)
and `card-labels-prompt.mjs` move under `src/lib/labels/` so the READER and the
writer share one definition of a job; the sample's copies then import from there and
stop being a second source of truth.

- **Input-hash skip**, exactly as `db:build:prose`: a row whose stored `input_hash`
  equals the hash its current inputs produce is skipped and costs nothing. This is
  what makes the weekly hook nearly free and an interrupted run resumable by being
  dispatched again.
- **Resume on interrupt: the hash skip is NOT sufficient on its own.** It recovers
  cards whose labels are already COMMITTED, and says nothing about a batch that was
  submitted and never collected. A process that dies after submission — or while a
  batch is still processing, which for 2,650 batches is most of the run's life —
  leaves work in flight that the next dispatch cannot see, so it submits those
  requests again and pays twice for them.

  So submitted batch ids are PERSISTED before anything else happens and reconciled
  before any new submission: for each recorded id, retrieve it, collect what
  succeeded into staging, and only then decide what is still missing. The sample
  already writes `out/batches.json` at submission for exactly this reason; the full
  run needs it in the database rather than a file, because a file in a CI runner's
  workspace does not survive the run that wrote it.

  Two consequences worth stating: an id that has EXPIRED (the batch API keeps
  results 29 days) is dropped with a warning and its cards re-submitted, and a run
  that finds ids still `in_progress` waits or exits cleanly rather than duplicating
  them.

  **Two requirements the sample's own ledger does NOT meet**, found in review there
  and declined on scope because that tool cannot run again. Both are on this script:

  - **Reconcile INTENTS, not only reservations.** The sample writes an intent before
    `batches.create` so a crash in that window leaves a trace, but nothing clears an
    orphaned intent — so its "refuse while a run is unreconciled" guard would block
    every later run for ever. Collection must clear the intent it owns.
  - **Stamp the run id onto each labels file, and refuse to score across two.** The
    sample checks only that each model's file is complete, so a partial re-run could
    mix fresh output with a stale complete file and publish a comparison of two
    different runs.
- **Send the CAST FACE, or the run relabels abilities the card cannot use.**
  `cards.oracle_text` stores both faces joined by `\n//\n`. Sent whole, the model
  labels a land back's `{T}: Add` as ramp on a card whose front is an Aura. Use
  `castFaceText` (`src/lib/cards/facet.ts`) — it cuts the back for `modal_dfc` and
  `transform` and KEEPS both halves for split, adventure and prepare, where both are
  castable. This was measured, not anticipated: the sample's first run shipped
  without it and had to be re-run, and it moved two conclusions.

- **Face reconciliation, or the run silently loses every two-faced card.** Measured
  in the sample: Sonnet returned `Soulcipher Board` and `Cipherbound Spirit` as
  separate entries where the catalog name is `Soulcipher Board // Cipherbound
  Spirit`; Haiku kept it joined. Reconcile by FACE against the names the batch
  asked for, never by fuzzy match. A card asked for and not returned is recorded as
  a miss, never written as an empty label.
- **A job the schema rejects is DROPPED and RECORDED, never repaired.** A repaired
  label stores the repair rather than the model's answer, and the next re-score
  measures the repair.
- **Refuse rather than publish a partial pass, and STAGE so that refusing is
  possible.** A run whose returned-card count falls below a floor (say 95% of those
  asked) must leave the previous labels standing and exit non-zero, as
  `db:build:staples` does.

  **That is unachievable if each batch upserts into `card_labels` as it lands** — a
  floor failure at batch 2,600 would leave 2,599 batches published while the plan
  claims the previous set is untouched. So accepted output goes to a run-scoped
  staging table (`card_labels_staging`, same shape plus a `run_id`), the floor is
  evaluated against what staging holds, and the publish is ONE transaction that
  clears and fills. This is the shape #704 arrived at for the printings
  denominators, and for the same reason: a refused run there used to blank every
  set's `base_set_size` behind a green job.

  The publish is `delete` + `insert ... select` inside one transaction rather than a
  per-row upsert, so a reader never sees a mixture. A card in the previous set and
  absent from this run keeps its old label rather than vanishing — the run labels
  what the catalog holds now, and a card that left the catalog is removed by the
  foreign key's cascade instead.
- Steps per module: write the test first (schema validation, hash stability, face
  reconciliation, the refusal floor), run it red, implement, run green, commit.

## Task 3 — caching: DROP the breakpoint

**Files:** modify `src/lib/labels/prompt.ts`.

Measured in the sample, and it contradicts the obvious choice:

- **Sonnet, the recommended model:** 37 cache WRITES against 6 reads over 43
  batches. Batch requests run in parallel, so almost none finds a warm cache. At
  1.25x to write and 0.1x to read that is **$0.0854 against $0.0784** without
  caching — a 9% LOSS.
- **Haiku:** the breakpoint is inert outright. The 1,215-token block is under its
  minimum cacheable length; zero writes and zero reads across two identical calls.

So: **ship with no `cache_control`.** Revisit only if the instruction block grows
past ~2,048 tokens AND batches are submitted sequentially enough for reads to
dominate — both conditions, not either. Record the measurement beside the decision
so the next reader does not "fix" it back.

## Task 4 — the weekly hook

**Files:** create `.github/workflows/card-labels.yml`; modify
`.github/workflows/catalog-refresh.yml` (chain) or add a cron.

- **New or changed cards only**, which the input-hash skip gives for free.
- **After the catalog refresh**, which runs 09:00 UTC Monday: a card the catalog does
  not yet hold cannot be labelled. `Combo refresh` runs 13:00 for this reason; this
  should sit at or after that.
- **GENERATE AGAINST `catalog-staging` ONLY, then COPY to production.** Hugh's ruling
  of 2026-09-26: PAY ONCE. A sentence costs a model call to produce and nothing to
  move, and the same is true of a label — so the fan-out every other refresh workflow
  uses would double the bill for an identical result. This is the one refresh job here
  that must NOT feed a matrix over both environments, and the reason is money rather
  than correctness, which is why it reads as an exception to the pattern beside it.
- **`CARD_LABELS_ENABLED` repository variable**, `'true'` to fire on schedule; a
  manual dispatch labels only staging.
- **One workflow-wide concurrency group.** Not `max-parallel` over a matrix, because
  there is no matrix: the group exists so two scheduled runs cannot put two batch
  streams on the API or race the same staging table.
- A new set is ~390 cards, so a weekly run costs about **50 cents** on Sonnet 4.5 (16
  on Haiku). Either way the ongoing cost is not a consideration; the backfill is.

### Task 4b — `db:copy:labels`, so the model runs once

**Files:** create `scripts/copy-card-labels.ts`; modify `package.json`.

The `db:copy:prose` pattern, for the same reason it exists there: a label costs a model
call to produce and nothing to move.

- Reads `LABEL_COPY_SOURCE_URL` and `LABEL_COPY_TARGET_URL`, and takes `--dry-run`.
  Source and target are SEPARATE variables and the target is never defaulted, as
  `pull:staging` learned: "not the source" is not the same as "safe to write to".
- **Installs a row only when the hash the source stored equals the hash the TARGET'S
  own inputs produce.** A label describing an oracle text the target no longer holds is
  never written; those rows keep their absence and are picked up by the next
  `db:build:labels` against that target, which is the run to do afterwards.
- Carries `model` and `prompt_version` across unchanged, so a copied row says which
  model produced it and a later audit can tell copied rows from generated ones.
- Never deletes. A card the source has not labelled leaves the target's row alone.

### Task 4c — the production copy is a JOB, never a probe

Writing to production happens through the workflow or the job, exactly as
`db:build:prose` does, and never from a probe or a local invocation. d9 must be told
BEFORE the production copy runs, so Hugh can confirm that the first real consumer —
E1's matching — is ready or behind a switch.

**The labels change nothing player-visible until a consumer PR reads them**, and that
PR is behind `SWAP_TOOLS_ENABLED`. So the order is: generate on staging, validate
against the gold subset (Task 6), copy to production, and only then let a consumer
read it.

## Task 5 — consumers: how E1 reads the labels

**Files:** modify `src/lib/swaps/gather.ts` and `src/lib/swaps/stand-ins.ts`; create
`src/lib/labels/read.ts`.

**The boundary has to move, and that is the bulk of this PR.** `loadStandIns`
(`gather.ts:110`) does the database work and calls `rankStandIns`
(`stand-ins.ts:238`), which today receives `original`, `candidates`, `priced` and
the catalog's creature subtypes — **neither the labels nor any deck context**. The
`restrictedTo` rule below needs the deck's key creature type, which is deck context.
So:

- `loadStandIns` additionally reads the label rows for the original and every
  candidate (one query, keyed on the oracle ids it already has), and derives the
  deck's key creature type from the deck it already loaded.
- `rankStandIns` takes two new inputs: a `Map<oracleId, Job[]>` and the deck's key
  creature type (nullable — a deck with no tribal lean restricts nothing).
- It stays PURE, so every rule below is unit-testable without a database, which is
  what makes the fallback behaviour assertable at all.

Without that, PR 5 cannot consume the labels no matter what the matching rules say.

A stand-in currently matches on a job KIND. With labels it must agree on the limits
too, in this order of strictness:

1. **`rampKind` must be equal.** d9's ruling: each kind matches only itself. A
   `burstMana` never matches `makesTreasure` or `tapsForMana`. This alone kills the
   Warg-vs-Runadi ramp match.
2. **`restrictedTo` must be compatible with the DECK**, not merely equal to the
   original's. A Wolf-restricted counter is a real job in a Wolf deck and dead in a
   Dinosaur one, so the test is against the deck's key creature type (2b's ruling a),
   not against the card being replaced.
3. **`trigger` and `recurrence`** are advisory: a mismatch DOWNRANKS rather than
   excludes. They were the limits the two models disagreed about most (and the
   report's blind sheet is mostly trigger disagreements), so treating them as hard
   gates would spend the models' weakest signal on refusals.
4. **`modal` matters for counting, not matching.** A modal job is one the card does
   INSTEAD of another; anything summing a card's jobs must not credit both.

**The fallback must apply `frontFaceOracle`,** as `stand-ins.ts:47` already does.
Measuring the baseline without it understated the text rules in the sample, and
shipping a fallback without it would let a land back score `ramp` for an Aura.

**Text rules stay as the FALLBACK**, per card and per job: a card with no label row,
or whose label row is stale by hash, is matched by `classifyRoles`/`cardThemes`
exactly as today. That keeps the feature working on a database this pass has never
run against — which is every database until it does — and makes the rollout
reversible by ignoring one table.

**`restrictedTo` is the weakness to watch, and it is why the model choice is
Sonnet.** Measured 0.864 for Sonnet on the gating subset against 0.767 for Haiku —
so roughly one gating restriction in seven is still missed on the recommended model,
and just under one in four on the cheaper one. TRIBAL restrictions are 1.000 on both
and need no watching.

Two failure directions, costing different things, and both are measured:

- a **missed** restriction is the original bug returning — a card matched into a
  deck it is dead in (Sonnet 6 of 44 wrong, Haiku 10 of 43);
- an **invented** restriction refuses a stand-in that would have been fine (Sonnet
  5, Haiku 7).

If false matches survive this pass, look here first; the gold re-score in Task 6 is
what tells you whether the stored labels or the matching rule is at fault.

## Task 6 — validation: re-score a gold subset

**Files:** create `scripts/check-card-labels.mts`.

After the run, score the STORED labels for the 108 gold cards against
`card-labels-gold.mts`, using the sample's scorer, and compare to the sample's
figures:

| | sample (Sonnet) | after the run |
|---|---|---|
| tribal restriction | 1.000 | must not drop |
| restrictedTo (gating) | 0.864 | must not drop |
| rampKind | 0.875 | must not drop |
| trigger | 0.942 | must not drop |
| recurrence | 0.87 | must not drop |
| spurious restrictions | 5 | must not rise |

- **A drop means the pass is not what was measured** — a prompt edit, a model
  change, a parse regression — and is a hard failure, not a warning.
- Non-default scoring only, for the reason the report gives: the default-inclusive
  figure flatters a labeller that emits no limits.
- Cheap enough to run in CI on the labels already stored (no model calls), so it
  guards the table rather than the run.

## PR boundaries

Five PRs. Each is independently reviewable and none leaves the tree broken.

1. **Storage** — Task 1. Migration and schema only, no reader, no writer. Mergeable
   on its own: an unused table costs nothing.
2. **The label modules** — Task 2's `src/lib/labels/*` plus tests, and the sample's
   scripts re-pointed at them. No script, no calls, no spend. This is where the
   schema stops being duplicated.
3. **`db:build:labels`** — Task 2's script, Task 3's caching decision, the spend cap,
   the refusal floor, face reconciliation. **Held until Hugh approves the spend**,
   then run once against staging before production.
4. **The weekly hook and the copy step** — Tasks 4, 4b and 4c. After PR 3 has run
   cleanly by hand at least once; a workflow that has never succeeded manually should
   not be put on a cron. The copy ships WITH the hook rather than after it, because
   pay-once is what makes the hook single-target: shipping a staging-only generator
   with no way to install its output would leave production unlabelled indefinitely.
5. **Consumers and validation** — Tasks 5 and 6 together, because the validation is
   what makes the consumer change safe to believe. Behind the labels being present:
   with an empty table this PR is a no-op by construction, which is what makes it
   reversible.

**Not stacked.** Each rebases on main after the previous merges.

## What would make this plan wrong

- **If Hugh picks Haiku** to save the $28.36, only the cost table, the Task 6
  thresholds and `model` in the input hash change; no structure moves. The plan is
  model-agnostic, and the input hash carrying the model means a later switch
  relabels rather than mixing two models' output in one table.
- **A HYBRID is not proposed, because it is not measured.** Haiku is better at ramp
  kinds (0.913 against 0.875) and Sonnet at restrictions and triggers, so labelling each field
  with its stronger model is an obvious thought — but nothing in the sample measures
  a two-pass merge, and the merge itself has a cost the sample did not pay (two runs,
  plus a rule for reconciling a job the two models disagree about the EXISTENCE of).
  It would need its own sample before it belonged in a plan.
- **If `restrictedTo` at 0.864 is not good enough**, the answer is a prompt round
  aimed at that field, re-scored against the same gold set, rather than a different
  model — the per-limit split is what makes that affordable to decide.
- **If E1's matching ends up needing a limit the schema has no field for**, the gold
  set already names three: a pooled threshold (`Technomancer`'s "total mana value 6
  or less"), a resource limit (`Gatewatch Beacon`'s loyalty counters), and a Saga's
  chapter ordering. None blocks this plan; all three would need a schema round.
