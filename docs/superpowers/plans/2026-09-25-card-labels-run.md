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
- **`input_hash` mirrors `proseInputHash`** (`src/lib/prose/prompt.ts`), and is
  `labelInputHash` in `src/lib/labels/prompt.ts` as SHIPPED in PR 3a: sha256 over
  `[oracleId, renderCard(card), LABEL_PROMPT_VERSION, model]`. A card renamed or
  errata'd under its existing oracle id leaves a stored label describing something
  else — the case the prose hash records for the same reason — and **the model is in
  it** too, so switching models relabels rather than silently mixing two models'
  output in one table.

  **It hashes `renderCard`'s OUTPUT rather than a hand-listed set of fields, and that
  is load-bearing.** This bullet originally read
  `[oracleId, name, typeLine, oracleText, …]`, which omits `mana_cost` — a field
  `renderCard` sends and from which an `mv` threshold is derived, so a cost corrected
  under the same oracle id would hash identically, skip, and keep a `mv >= 5` from the
  OLD cost for ever. Hashing the rendered card makes the payload exactly what the
  model is sent, so no field can be forgotten. It also hashes the CAST FACE, because
  that is what `renderCard` applies: hashing both faces would mark a row stale
  whenever a back face changed without changing anything the label was derived from.
- **No `on delete set null`**: a card leaving the catalog takes its label with it.
- Steps: write the migration; add the table to `schema.ts`; `pnpm db:generate` and
  confirm the generated SQL matches; `drizzle-kit check`; commit.

## Task 2 — `db:build:labels`

**Files:** create `scripts/build-card-labels.ts`,
`src/lib/labels/{schema,prompt,parse}.ts`; modify `package.json`.

Promote the sample's four scripts into the app's own modules. `card-labels-schema.mjs`
(DONE in PR 2: it is now `src/lib/labels/schema.ts`, and every consumer imports it)
and `card-labels-prompt.mjs` move under `src/lib/labels/` (BOTH DONE: schema in PR 2, prompt in PR 3a) so the READER and the
writer share one definition of a job; the sample's copies then import from there and
stop being a second source of truth.

- **Input-hash skip**, exactly as `db:build:prose`: a row whose stored `input_hash`
  equals `labelInputHash(card, model)` is skipped and costs nothing. Call that
  function rather than recomputing a payload — the payload is deliberately
  `renderCard`'s output so nothing the model is sent can be left out, and a second
  hand-listed copy is how `mana_cost` went missing the first time. This is
  what makes the weekly hook nearly free and an interrupted run resumable by being
  dispatched again.
- **Resume on interrupt: the hash skip is NOT sufficient on its own.** It recovers
  cards whose labels are already COMMITTED, and says nothing about a batch that was
  submitted and never collected. A process that dies after submission — or while a
  batch is still processing, which for 2,650 batches is most of the run's life —
  leaves work in flight that the next dispatch cannot see, so it submits those
  requests again and pays twice for them.

  So an INTENT is persisted before anything else happens, and reconciled before any new
  submission. Not the batch id: Anthropic assigns `batch_id` only when `batches.create`
  RETURNS, so nothing can record it first, and a process dying between a successful
  `create` and the write leaves no trace at all. The intent goes down with a NULL id,
  the id is stamped on afterwards, and a null id is treated as AMBIGUOUS rather than
  absent — the provider's recent batches are listed and matched on the `custom_id`s this
  run chose. Only a request with no match is re-submitted; an unresolvable one is marked
  `abandoned` and reported, because a silent re-submission is how the double charge
  happens.

  (This paragraph said "submitted batch ids are PERSISTED before anything else happens"
  until PR 3b, which is impossible and contradicted the intents bullet four lines below.
  Three review rounds on #1056 went on building the wrong table shape from it: keyed on
  the provider's id, then with that id globally unique — one `create` returns ONE id for
  every chunk it submitted — then with `custom_id`s that repeat across runs, so a recovery
  listing matched an earlier run's request. All three are answerable from `batches.create`'s
  call site.)

  Two more facts the shape must respect, both from the same place. One provider batch
  holds MANY chunks, so `batch_id` is shared and cannot be unique; `custom_id` carries
  uniqueness instead and must embed a run token. And `custom_id` is length-capped, so the
  token is a hash slice rather than the 29-character run id.

  The sample writes `out/batches.json` at submission for the same reason; the full run
  needs it in the database rather than a file, because a file in a CI runner's workspace
  does not survive the run that wrote it.

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
  never written; those rows keep their absence.

  **A mismatch is REPORTED, with its count, and nothing is queued.** This bullet used to
  end "and are picked up by the next `db:build:labels` against that target, which is the
  run to do afterwards" — which would run the MODEL against production, the exact thing
  pay-once exists to prevent, for labels that already exist on the source and are merely
  describing a different catalog state. The copy says how many differ and lets a human
  decide; the cheap fix is almost always to re-run the catalog refresh so the two agree,
  not to buy the labels a second time.

  **A card the target's catalog does not hold at all is COUNTED, not treated as a mismatch:**
  there is nothing for the label to describe, and a source generated against a newer catalog
  always carries rows the target has never heard of — so the figure is normally non-zero, and
  a large one means the target's catalog refresh has stopped running. Silence is how a real
  gap hides.

  **A row generated under a different prompt version is counted separately too**, and named as
  such: the version is in the hash, so such a row can never match, but that is not a catalog
  difference and reporting it as one sends a reader to re-run a refresh that cannot fix it.
- Carries `model` and `prompt_version` across unchanged, so a copied row says which
  model produced it and a later audit can tell copied rows from generated ones.
- Never deletes. A card the source has not labelled leaves the target's row alone.

### Task 4c — the production copy is a JOB, never a probe

Writing to production happens through the workflow or the job, exactly as
`db:build:prose` does, and never from a probe or a local invocation.

**NOT YET SATISFIABLE, and deliberately left unsatisfied rather than worked around** (PR 4).
A copy job needs BOTH database URLs at once and no environment has both: `catalog-staging` and
`catalog-production` each hold only their own `CATALOG_DATABASE_URL`, the only repository-level
secret is `ANTHROPIC_API_KEY`, and two jobs cannot share a secret. So the job needs one new
secret holding staging's URL, readable from a production job — a credential decision rather
than a code change. A third environment is the alternative and `commander-prose.yml` already
rejects it: "one more thing to keep in sync for no benefit."

Until then production carries NO labels, which this task's own second paragraph makes harmless:
nothing player-visible reads them until a consumer PR does, and that is behind
`SWAP_TOOLS_ENABLED`. The weekly workflow says so in every run's summary rather than leaving it
to be discovered. Running the copy locally to fill the gap is what this task forbids, so it is
not the workaround. d9 must be told
BEFORE the production copy runs, so Hugh can confirm that the first real consumer —
E1's matching — is ready or behind a switch.

**The labels change nothing player-visible until a consumer PR reads them**, and that
PR is behind `SWAP_TOOLS_ENABLED`. So the order is: generate on staging, validate
against the gold subset (Task 6), copy to production, and only then let a consumer
read it.

## Task 5 — consumers: how E1 reads the labels

> **AMENDED 2026-10-02 (the vocabulary plan's Task 1, `2026-09-28-card-label-vocabulary.md`).** This is the consumer
> spec the label schema is derived from, written before any schema change. It carries Hugh's four rulings on #1088
> (2026-09-28): **Q1** compare by text when either card is unlabelled; **Q2** `affects` must match; **Q3** a bounce
> is allowed and its row says so; **Q4** `tutor` is held to ≥0.9 precision and recall in the gold set. The field list
> at the end of this task is the input to the vocabulary plan's Task 2, and a field absent from it is not built.
> Line references are to `origin/main` on 2026-10-02.

### The boundary

`loadStandIns` (`gather.ts:132`) already does the database work and calls `rankStandIns` (`stand-ins.ts:253`), which
already receives the deck as a `DeckLens` (`honest.ts:43`, built at `gather.ts:199-204`). The first version of this task
said `rankStandIns` had no deck context. That was true when it was written and is not now, so the boundary moves by
ONE input, not two:

- **`src/lib/labels/read.ts` (new).** `readLabels(oracleIds): Promise<Map<string, Job[]>>`, one query on
  `card_labels`. A row whose `input_hash` no longer equals `labelInputHash(card, row.model)` (`prompt.ts:264`) of
  the card's current inputs is **absent** from the map, never returned stale: a stale label describes text the card
  no longer has.
- **`loadStandIns`** calls it once, for the original and every candidate it already holds.
- **`rankStandIns`** takes the map as one more argument and stays PURE, so every rule below is unit-testable with no
  database, which is what makes the fallback assertable at all.
- **A server switch, `STAND_IN_LABELS_ENABLED`.** Off (the default, and production until Hugh flips it), `readLabels`
  is not called and the map is empty. `CARD_LABELS_ENABLED` is the labelling workflow's cron kill switch, a
  repository variable, and gating the app on it would tie whether players see labels to whether the cron runs.
  **Release order (d9, 2026-10-02):** after `SWAP_TOOLS_ENABLED` and after the backfill is published to production.
  It changes the QUALITY of stand-ins, not what the app can do, so it owes no About entry.

### Q1 — which reading compares a PAIR

**A pair is compared by labels only when BOTH cards carry a fresh label. Otherwise both are compared by text**
(`jobOf`, `sameJob`, `honestJobs`, exactly as today). Always like with like, decided per pair, never per card or
per job:

- a labelled original against an unlabelled candidate: text, both sides;
- an unlabelled original: text against every candidate, whatever they carry;
- no card is hidden for lacking a label.

Two consequences, both deliberate:

- **It ships before any label exists.** With the map empty (switch off, or no rows) every pair takes the text path,
  which is today's behaviour byte for byte. The consumer can land inert and labels light it up later.
- **It degrades to correct, never to wrong.** A partially labelled catalog gives fewer upgraded pairs, never a pair
  judged by two standards at once.

The first version of this task fell back "per card and per job". That mixes standards inside one comparison, and Q1
rules it out.

### The labelled job, and what "for this deck" means

A label is a list of `Job`s. For the stand-in comparison each job is read as:

- **its key:** `space` + `kind`, plus `rampKind` for ramp. A `role/ramp` job with a null `rampKind` is ramp of no
  kind, and shares with nothing (the E1 rule: a stand-in keeps ramp only in a kind it shares).
- **its deck relevance, for a job that points at the player's OWN cards** (`affects: self` or `null`): a job whose
  `restrictedTo` names a creature type is a job for this deck only when it is the deck's `keyType`; one naming a
  noncreature subtype only when the deck holds or makes it (`DeckLens.held`). This is `honestJobs`' rule
  (`honest.ts:162`) read off a field instead of a regex, and it is where the Warg's Wolf counters stop counting in a
  Dinosaur deck.
- **a job that points at OPPONENTS' cards** (`affects: opponents` or `each`) is never dropped for its restriction:
  there `restrictedTo` is what the effect TOUCHES (the vocabulary plan's redefinition, Task 2), the type of the
  target, and a "destroy target Dragon" does its job in any deck facing Dragons. Its restriction is compared between
  the two cards instead (gate 4 below). Today's `offTypeLine` regex drops such a line in every deck but a Dragon
  deck; this is a deliberate change on the labelled path only.
- **a job that does nothing for the deck is dropped from BOTH cards** before anything is compared, exactly as a
  limited line is today. It is neither kept, gained nor lost.

### `sameJob` with labels — what must match, and what only ranks

A candidate keeps an original's job when it carries a job with the same key that passes every GATE. A candidate that
keeps none of the original's deck-relevant jobs is not offered, as today (E1 ruling d).

**Gates. A mismatch means the job is not kept:**

1. **`rampKind` equal** (d9, 2026-09-25). Each kind matches only itself, so `burstMana` never stands in for
   `tapsForMana`. This alone ends the Warg-for-Runadi ramp match.
2. **`affects` equal (Q2).** Self-mill is never kept for opponent-mill, nor self-discard for opponent-discard.
   `null` (a job with no direction) matches only `null`.
3. **`to` equal where both carry one.** A reanimation (`battlefield`) is not a regrowth (`hand`), and a tutor to the
   battlefield is not a tutor to hand. `top` is a destination of its own. *(The vocabulary plan's Task 2 says these
   are "not interchangeable" without saying gate or advice; this spec reads it as a gate and says so, so it can be
   overruled in one place.)*

4. **A target restriction no NARROWER than the original's**, for a job that points at opponents' cards. The
   candidate's `restrictedTo` must be `null` or equal to the original's: "destroy target creature" is not kept by
   "destroy target Dragon", and the reverse is kept (it does more).

**Advice. A mismatch keeps the job and ranks the row lower:**

5. **`trigger` and `recurrence`.** These were the limits the two models disagreed about most, so treating them as
   hard gates would spend the weakest signal on refusals. A kept job whose trigger or recurrence differs from the
   original's sorts below one that matches, inside the same `shared` count.
6. **`method` (Q3).** Bounce stands in for exile or destroy. The job is kept, the row ranks below one with the same
   method, and its **loses** tags name what is lost (below). The reader is told and decides; the engine does not
   decide for them.

**Counting:**

7. **`modal`.** A modal job is one the card does INSTEAD of another. When a candidate keeps two of the original's
   jobs only through two modal jobs of its own, it is credited ONE in the `shared` count that orders the rows. Both
   still show as kept, since the card can do either.
8. **`threshold`** is not read. Nothing in the consumer compares it, so Task 2 does not build anything new for it.

### What the row draws

The row's `keeps` / `gains` / `loses` tags (`sheet-model.ts:208-213`) are built from the same three lists as today:
`shared`, `extra` and `missing`. A labelled pair fills them from labelled jobs, named with the existing `job` copy.
Two additions, both in the `loses` group. Their wording passed `/copy-review` here, which is the whole of its process (d9, 2026-10-02):

- **A method downgrade (Q3).** The `loses` group names the METHOD the stand-in does not have, so a bounce kept for
  an exile reads **KEEPS removal  LOSES exile** (the groups sit apart by `GROUP_GAP_CLASS`, with no separator glyph; `stand-ins-sheet.tsx:266-285`). Keys: `swapToolsCopy.sheet.method` =
  `{ destroy: "destroy", exile: "exile", bounce: "bounce", shrink: "shrink" }`, drawn as the loss only when the
  original's method is `destroy` or `exile` and the stand-in's differs.

  *`/copy-review`, 2026-10-02:* the vocabulary plan's example wording, `returns to hand, not exiled`, cannot go in this
  slot. The row joins each group's items with commas (`stand-ins-sheet.tsx:278`, drawn in `COMMA_CLASS`), so a tag carrying its own comma
  reads as two losses, `returns to hand` and `not exiled`. Naming the lost method keeps one item per fact, and
  matches what the group already says for a lost job (`loses draw`). Hugh's ruling is what is said, not this
  phrasing: the row tells the reader the stand-in gives up the exile.
- **A trigger or recurrence difference**, which ranks lower (rule 5), draws no tag. Naming every advisory difference
  would make most rows read as losses. The order already says it.

The row's box, its tags' styling and its states do not change, so this needs no Design round.

### Pool admission — a label-only candidate has to reach the comparison

`spellPool` (`gather.ts:260-299`) picks the cheapest unlisted slice in SQL by `roleWords` over the front face's text
(`:279`), BEFORE any comparison. A card that only its LABEL recognises as doing the job never enters the pool, and a
label-driven matcher over a text-selected pool is incomplete by construction.

So when the switch is on and the original is labelled, the pool gains a SECOND unlisted slice beside today's:

- **the text slice, unchanged:** `roleWords` of the original's TEXT roles, cut to the cheapest `UNLISTED_POOL`
  (600), exactly as today;
- **the label slice:** cards with a label row carrying ANY of the original's deck-relevant job keys, one jsonb
  containment test per key, OR-joined (`l.labels @> '[{"space":"role","kind":"removal"}]' or l.labels @> …`; a
  single `@>` against the whole list would demand EVERY job), cut to its own cheapest 600.

The pool is the UNION of the two. Two slices rather than one OR'd slice, because both feed a `limit`: one slice of
600 over both arms would let cheaper label-admitted cards push out text-admitted cards today's sheet offers, and an
unlabelled stand-in could vanish when the switch went on. With two slices, every card today's pool holds is still
held, so the pool only ever grows. A label row stale by hash can admit a card through the label slice; that card
then compares by text (Q1) and is dropped if its text does not match, so a stale row never puts a wrong card on
the sheet.

**A labelled original with no TEXT job.** Today `loadStandIns` skips the pool when `jobOf(original)` is `none`
(`gather.ts:169`), and `rankStandIns` returns early on it (`stand-ins.ts:272`). With the switch on and the original
labelled, the original's job is read from its label: a spell whose label carries a non-land role or theme is a
`spell` job for that gate, its mana value from the card. Without this, the cards labels most help (whose text the
regexes miss) would never get a sheet at all.

**Pool words for the two new roles**, in `ROLE_WORDS`' register (so the TEXT arm finds them too once the app's
`Role` union learns them; until then the label slice alone finds them):

- `tutor`: `search your library for (?![^.]*\mland\M)[^.]*\mcard` (a non-land search, as the vocabulary defines it);
- `counterspell`: `\mcounter target\M`. `removal`'s words already contain `counter target`, deliberately left alone
  (Hugh: leave `REMOVAL_PATTERNS` alone).

### Inertness, checkable rather than asserted

With the switch off, or `card_labels` empty:

- `readLabels` is not called, or returns an empty map, so every pair takes the text path;
- the label slice is not queried (switch off) or matches nothing (no rows), so the pool is exactly today's rows;
- **`pnpm test` and `probe:swap-engine` produce identical output to `origin/main`**, which the consumer's PR shows.

### The test that tells this feature from a no-op

**A label-only candidate reaches the sheet:** a card whose front face carries none of the role words, whose label
says it does the original's job, is admitted by the pool and offered as a stand-in. Every other assertion here could
pass on a build that never reads a label.

### Two-faced cards

A label describes the face the prompt was sent: `castFaceText` (`facet.ts:127`, applied by `renderCard`, `prompt.ts:115-130`), which drops the back face
of a `modal_dfc` or `transform` card and keeps both halves of an adventure or split card. A labelled pair needs no
face step of its own. The TEXT path keeps applying `frontFaceOracle` (`stand-ins.ts:53`), so a land back still cannot
score `ramp` for an Aura on either path.

### `restrictedTo` is the weakness to watch

Measured 0.864 for Sonnet on the gating subset. Two failure directions, costing different things:

- a **missed** restriction is the original bug returning: a card matched into a deck it is dead in;
- an **invented** restriction refuses a stand-in that would have been fine.

If false matches survive, look here first; the gold re-score in Task 6 says whether the stored labels or the rule
is at fault.

### The field list this spec reads — the input to the vocabulary plan's Task 2

| Field | Read by | As |
|---|---|---|
| `space`, `kind` | every rule | the job's key |
| `rampKind` | rule 1 | gate |
| `restrictedTo` (redefined: what the effect touches) | deck relevance; gate 4 | drop an own-cards job the deck does not use; a target restriction may not narrow |
| **`affects`: `self \| opponents \| each \| null`** (new) | rule 2 (Q2); which restriction reading applies | gate |
| **`to`: `hand \| battlefield \| top \| null`** (new) | rule 3 | gate where both carry one |
| **`method`: `destroy \| exile \| bounce \| shrink \| null`** (new) | rule 6 (Q3) | ranks lower, and the `loses` tag |
| `trigger`, `recurrence` | rule 5 | ranks lower |
| `modal` | rule 7 | counting |
| `threshold` | nothing | **not extended**; kept only because existing rows carry it |

New roles the consumer names: **`tutor`** and **`counterspell`**, label-owned (vocabulary plan, Task 2's
decoupling), each with a `job` copy entry: **`a tutor`** and **`a counterspell`** (`/copy-review`, 2026-10-02: countable nouns take the article in this map, as `a finisher` and `a sacrifice outlet` do; both are already shipped strings: `tutor` in `card-mark.ts`, `a counterspell` in `src/lib/swaps/land.ts:295`).

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
