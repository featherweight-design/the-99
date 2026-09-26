# Full-run plan: label every card's jobs and their limits

> **HELD FOR HUGH'S APPROVAL.** Nothing in this plan is built or run until he
> picks. It follows the sample and its report
> (`2026-09-25-card-labels-report.md`), whose recommendation is **Haiku 4.5, about
> $12.70 for 31,830 Commander-legal cards**, because Sonnet is not markedly better
> on the two limits that caused the reported false matches.

**Goal:** store one label document per card — its jobs, and the LIMITS on each —
so E1's stand-in matching can refuse a match that shares a job and nothing else.

**Why it is worth building:** today's text rules score **0** on every limit's
non-default subset. Not poorly — zero, because they cannot express a limit. The
sample measured a model at ~90% on the tribal restriction and the ramp kind, which
are exactly the two limits behind `Bejeweled Warg` matching `Runadi`.

**Tech:** Drizzle on Neon, the Anthropic batch API, the `scripts/.env` convention.

## Global constraints

- **Nothing runs per request, ever.** This is a build-time pass, read from a table.
- **Spend:** a hard `--max-usd` flag, defaulting to the projected run cost plus
  20%, that REFUSES rather than truncating. The sample's estimator is the model
  (`scripts/label-cards-run.mjs`), including its refusal path.
- `ANTHROPIC_API_KEY` through `scripts/lib/env.mjs`. Never printed, never logged.
- **The job vocabulary is 2b's** (`src/lib/recs/roles.ts`, `src/lib/recs/themes.ts`)
  and the four ramp kinds are d9's ruling. Asserted against those files by
  `card-labels-schema.test.mts`, never copied.
- **Batches go direct to `api.anthropic.com`.** This repo's `ANTHROPIC_BASE_URL`
  proxy (`127.0.0.1:8787`) has no `/v1/messages/batches` route and answers
  `cave_route_not_found`. Batch pricing is half of standard, so this is the
  difference between $12.70 and $25.40.
- **Migration number: check main's journal at build time.** 0067 is next free as of
  2026-09-25 (journal ends 0066_about_seen_ids), and several lanes are open, so it
  will move. A collision is regenerate-and-restamp, not renumber by hand.

---

## Task 1 — storage

**Files:** create `drizzle/00NN_card_labels.sql`; modify `src/db/schema.ts`.

```
card_labels
  oracle_id      text primary key references cards(oracle_id) on delete cascade
  labels         jsonb not null            -- the jobs array, schema-validated
  model          text not null             -- e.g. claude-haiku-4-5-20251001
  prompt_version text not null             -- LABEL_PROMPT_VERSION
  input_hash     text not null             -- see below
  labelled_at    timestamptz not null default now()
```

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
and `card-labels-prompt.mjs` move under `src/lib/labels/` so the READER and the
writer share one definition of a job; the sample's copies then import from there and
stop being a second source of truth.

- **Input-hash skip**, exactly as `db:build:prose`: a row whose stored `input_hash`
  equals the hash its current inputs produce is skipped and costs nothing. This is
  what makes the weekly hook nearly free and an interrupted run resumable by being
  dispatched again.
- **Resume on interrupt:** the skip IS the resume. No cursor, no state file — a
  re-dispatch re-derives what is missing. The sample's run took one submission;
  31,830 cards is ~2,650 batches of 12, so a run WILL be interrupted at some point
  and must not restart from zero.
- **Face reconciliation, or the run silently loses every two-faced card.** Measured
  in the sample: Sonnet returned `Soulcipher Board` and `Cipherbound Spirit` as
  separate entries where the catalog name is `Soulcipher Board // Cipherbound
  Spirit`; Haiku kept it joined. Reconcile by FACE against the names the batch
  asked for, never by fuzzy match. A card asked for and not returned is recorded as
  a miss, never written as an empty label.
- **A job the schema rejects is DROPPED and RECORDED, never repaired.** A repaired
  label stores the repair rather than the model's answer, and the next re-score
  measures the repair.
- **Refuse rather than publish a partial pass.** A run whose returned-card count
  falls below a floor (say 95% of those asked) leaves the previous labels standing
  and exits non-zero, as `db:build:staples` does. A half-labelled table is
  indistinguishable from a complete one to every reader.
- Steps per module: write the test first (schema validation, hash stability, face
  reconciliation, the refusal floor), run it red, implement, run green, commit.

## Task 3 — caching: DROP the breakpoint

**Files:** modify `src/lib/labels/prompt.ts`.

Measured in the sample, and it contradicts the obvious choice:

- **Sonnet:** 37 cache WRITES against 6 reads over 43 batches. Batch requests run in
  parallel, so almost none finds a warm cache. At 1.25x to write and 0.1x to read
  that is **$0.0854 against $0.0784** without caching — a 9% LOSS.
- **Haiku:** the breakpoint is inert. The ~1,280-token block is under its minimum
  cacheable length; zero writes and zero reads, measured across two identical calls.

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
- **Both `catalog-staging` and `catalog-production`**, through a `plan` job feeding a
  matrix — never an expression on `environment`, which is the bug `Catalog refresh`,
  `Price refresh`, `Commander index` and `Combo refresh` all had and which sent
  every scheduled run to production alone.
- **`CARD_LABELS_ENABLED` repository variable**, `'true'` to fire on schedule; a
  manual dispatch labels only the environment it names.
- **`max-parallel: 1` under one workflow-wide concurrency group**, as `Commander
  index` uses: two legs submitting batches at once double the spend and race the
  same table.
- A new set is ~390 cards, so a weekly run costs about **16 cents** on Haiku.

## Task 5 — consumers: how E1 reads the labels

**Files:** modify `src/lib/swaps/stand-ins.ts`; create `src/lib/labels/read.ts`.

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

**Text rules stay as the FALLBACK**, per card and per job: a card with no label row,
or whose label row is stale by hash, is matched by `classifyRoles`/`cardThemes`
exactly as today. That keeps the feature working on a database this pass has never
run against — which is every database until it does — and makes the rollout
reversible by ignoring one table.

**`restrictedTo` is the weakness to watch.** Measured 0.725 for Haiku on the gating
subset: about a quarter of gating restrictions are wrong, and a wrong one is either
a false match (the bug returning) or a good stand-in refused. If false matches
survive this pass, look here first, and consider Sonnet for this field alone —
0.857 — before re-running everything.

## Task 6 — validation: re-score a gold subset

**Files:** create `scripts/check-card-labels.mts`.

After the run, score the STORED labels for the 108 gold cards against
`card-labels-gold.mjs`, using the sample's scorer, and compare to the sample's
figures:

| | sample (Haiku) | after the run |
|---|---|---|
| tribal restriction | 87.5% | must not drop |
| rampKind | 95.5% | must not drop |
| trigger | 0.938 | must not drop |
| restrictedTo (gating) | 0.725 | must not drop |

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
4. **The weekly hook** — Task 4. After PR 3 has run cleanly by hand at least once;
   a workflow that has never succeeded manually should not be put on a cron.
5. **Consumers and validation** — Tasks 5 and 6 together, because the validation is
   what makes the consumer change safe to believe. Behind the labels being present:
   with an empty table this PR is a no-op by construction, which is what makes it
   reversible.

**Not stacked.** Each rebases on main after the previous merges.

## What would make this plan wrong

- **If Hugh picks Sonnet**, only the cost table and `model` in the input hash change;
  no structure moves. The recommendation is Haiku, but the plan is model-agnostic.
- **If `restrictedTo` at 0.725 is not good enough**, the answer is a second pass on
  that field alone rather than a better model everywhere — the report's per-limit
  split is what makes that affordable to decide.
- **If E1's matching ends up needing a limit the schema has no field for**, the gold
  set already names three: a pooled threshold (`Technomancer`'s "total mana value 6
  or less"), a resource limit (`Gatewatch Beacon`'s loyalty counters), and a Saga's
  chapter ordering. None blocks this plan; all three would need a schema round.
