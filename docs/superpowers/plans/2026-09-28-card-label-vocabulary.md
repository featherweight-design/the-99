# Card labels — consumer first, then the vocabulary

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development` or
> `superpowers:executing-plans` to implement this task-by-task.

**Goal:** ship a consumer that reads card labels, shape the label schema and vocabulary around
what that consumer needs, and only then pay for a backfill — once.

**Spec:** Hugh's rulings of 2026-09-28, relayed via d9, after a cold review of the first version
of this plan. The gap review is summarised in `boards/overnight-decisions-2026-09-27.md`.

## Why the order changed

The first version of this plan widened the vocabulary and re-ran the backfill, with the consumer
left for later. Hugh reversed it: **the run is paid once, so it must be paid for labels something
actually reads.**

That is not a preference, it is the state of the code. Verified:

- **Nothing in `src/` reads labels.** Outside `src/lib/labels` itself, the only file mentioning
  them is `src/db/schema.ts`, which declares the tables.
- **`jobOf` in `src/lib/swaps/stand-ins.ts:57` still routes through `classifyRoles`** — the
  regex classifier — via `spellRoles`. The swap engine, the one obvious consumer, does not know
  labels exist.

So a vocabulary chosen now would be chosen blind. Every field below is included only because a
named consumer reads it.

## Global constraints

- **Nothing spends until this plan is approved AND the re-sample is read.** The fresh run gets
  its own $55 hard stop and $50 pause, separate from the ~$11.92 already spent (844 collected requests, 10,128 cards, measured from
  `card_label_batches` token columns by d9 on 2026-09-28).
- **The re-sample's WHOLE-RUN PROJECTION must come in under $50** or it goes back to Hugh. Not
  the re-sample's own cost: at ~900–1,000 cards and the measured $0.001291 that is about $1.20
  and could never trip a $50 bar. The figure that matters is Task 6's projection of the full run
  from the re-sample's measured per-card rate.
- **Decouple** the label vocabulary from the app's unions, one-way check (Hugh, 2026-09-28).
- **Leave `REMOVAL_PATTERNS` alone** (Hugh, 2026-09-28). Whether counterspells should leave the
  app's removal figure is a separate decision.
- Per-card outputs from every sample are committed.
- No stacked PRs; split above ~20 files or ~800 lines.

---

## Task 1 — The consumer spec

**Deliverable:** an amendment to the run plan's Task 5, written before any schema or vocabulary
change. **This is the task everything else is derived from.**

It must answer, concretely enough that Task 2 falls out of it:

- **Label-driven `jobOf`.** What replaces `classifyRoles` in `stand-ins.ts`, and what a `Job`
  becomes when it is read from a label rather than inferred from a regex.
- **`sameJob`.** When two labelled cards count as the same job — which fields must match, and
  which are advisory. This is the rule that decides whether a stand-in is honest.
- **Pool words for `tutor` and `counterspell`**, the two new roles, in the same register as the
  existing pool words.
- **A labelled card compared with an unlabelled one — RULED (Hugh, 2026-09-28).** If EITHER
  card lacks a label, **both** are compared by the text reading (`classifyRoles` + `honestJobs`).
  Always like with like. Labels upgrade a comparison only when both cards carry one. No mixing,
  and **no hiding unlabelled cards**.

  Two consequences worth stating, because they shape the whole schedule:

  - **The consumer is shippable before any label exists.** With no labels published, every
    comparison takes the text path, which is exactly today's behaviour — so the consumer can
    land early and inert, and labels light it up later.
  - **It degrades to correct, never to wrong.** A partially labelled catalog produces fewer
    upgraded comparisons, not a mixture of two standards.
- **Copy entries for every new kind**, through `/copy-review` with a picture, never a
  description.

**Then, and only then:** derive the exact list of label fields stand-ins needs. That list is
Task 2's input, and a field absent from it does not get built.

- [ ] Write the amendment.
- [ ] Take the copy through `/copy-review`.
- [ ] Publish the derived field list as the first section of Task 2.

**PR 1 — spec only, no code.**

---

## Task 2 — The schema, derived from Task 1

**Rule: include a field only if the consumer spec reads it.** The candidates below come from the
cold review, with its measurements against staging's 10,128 staged labels. I have not
independently verified those counts — they are the reviewer's, and the plan attributes them
rather than adopting them.

### `affects: self | opponents | each | null` — LOAD-BEARING (Hugh, 2026-09-28)

**A stand-in must match direction.** Self-mill is never offered for opponent-mill, self-discard
never for opponent-discard, and so on. This is a **match gate** in `sameJob`, not advice: a
mismatch disqualifies the stand-in outright.

The reviewer measured **304 self-discard against 146 opponent-discard**, and **129 of 289 mill
labels are self-mill**. Those are opposite jobs wearing one name: self-mill is a graveyard
engine, opponent-mill is a win condition. A stand-in that swaps one for the other is wrong in a
way no limit currently expresses.

This **redefines `restrictedTo` as "what the effect touches"**. Today removal's `restrictedTo`
holds the target's type across ~1,130 rows, while the run plan's Task 5 rule 2 reads it as the
DECK's type. Those are different claims and the rule is currently reading the wrong one. The
redefinition has to be stated in the prompt and re-audited in the gold set.

### `to: hand | battlefield | top` — for tutors and recursion

The reviewer measured that all **32 reanimation cards are labelled like regrowth**. Returning a creature to the battlefield
and returning it to hand are not interchangeable, and a tutor to hand is not a tutor to the
battlefield.

### `method: destroy | exile | bounce | shrink` — the GIVES-UP LINE, not a gate (Hugh, 2026-09-28)

**Bounce for exile is ALLOWED**, and the row's "gives up" line names what is lost — "returns to
hand, not exiled" — in the same honest register as the existing rows. So `method` is built, and
it feeds that line rather than `sameJob`. A reader is told the difference and decides; the engine
does not decide for them.

The visible wording goes through `/copy-review` with a picture. **Any change to the stand-in
row's box goes to Design**, not into this plan.

The reviewer measured **65 of 74 bounce cards labelled removal**. Bounce is removal that gives the card back;
exile is removal that answers recursion. A stand-in that treats them as equal is wrong against
an indestructible or recursive target.

- [ ] For each field: name the consumer rule from Task 1 that reads it, or drop the field.
- [ ] Update `validateJob`, `JOB_FIELDS` and `jobKey`. `jobKey` must stay injective over the new
      fields — it is the identity of a job and a collision silently merges two.
- [ ] Decouple the vocabulary (Hugh's ruling): label-owned `LabelRole`/`LabelTheme`, keeping the
      **one-way** check so every app `Role`/`Theme` must still be labelable.
- [ ] **Verify the decoupling by revert test, not by typecheck:** add a member to the app's
      `Theme` union, confirm `types.ts` fails to compile naming it, revert, record the error in
      the PR body. A green typecheck on unchanged arrays proves nothing.

**PR 2 — schema and types.**

**Ship the consumer INERT on staging as soon as Tasks 1–2 land** (Hugh, 2026-09-28). Ruling 1
makes this safe by construction: with no labels published, every comparison takes the text path,
which is exactly today's behaviour. It puts the label-driven code in front of real decks while
proving it changes nothing — so when labels arrive, the only new variable is the labels.

Why decoupling is needed, measured: `avg_ramp` and its three siblings are columns on
`commander_support`, `commander_pair_support` and `identity_composition`; **13 files import
`ROLE_TARGETS` as a value** (`Record<Exclude<Role, "land">, number>`, so a new role is a compile
error until someone invents a target); **6 files read `recs/themes`**.

*(The first draft said 19. That was `grep -l`, which AGENTS.md warns against by name — it counts
files that only mention the symbol in a comment. Counted by import it is 13, and the conclusion
is unchanged.)* Widening the app's unions is a
database change with user-visible Role Coverage consequences and is **its own plan**, not part of
this one.

---

## Task 2b — BUILD the consumer

The Goal says "ship a consumer", and Tasks 1 and 2 produce a spec and a schema. **Neither builds
anything**, and without this task a builder works through every PR here and ends with no
label-driven comparison. This is that task.

The build itself is the merged run plan's Task 5
(`docs/superpowers/plans/2026-09-25-card-labels-run.md:314`), which already names the files —
`gather.ts`, `stand-ins.ts`, `read.ts`. **This plan does not restate it; it gives it a PR and a
gate**, because that plan was written before the consumer-first ordering and is not sequenced
against anything here.

- [ ] **Label-aware POOL SELECTION, not only comparison.** `spellPool` picks the cheap-unlisted
      slice in SQL with `split_part(u.oracle_text, …) ~* roleWords(a.roles)`
      (`gather.ts:279`) — a regex over oracle text, run **before** `jobOf` or `sameJob` ever see a
      card. So a card that only its LABEL recognises as the same job **never enters the candidate
      list**, and a label-driven matcher over a text-selected pool is incomplete by construction.
      Task 1 must define how the pool admits a label-only candidate, and this task must implement
      it.
- [ ] **Test that a label-only candidate reaches the sheet:** a card whose text carries none of
      the role words, whose label says it does the job, appears as a stand-in. That is the single
      assertion that distinguishes this feature from a no-op.
- [ ] Implement label-driven `jobOf` and `sameJob` per Task 1's spec, reading only the fields
      Task 2 built.
- [ ] `affects` is a **match gate** (ruling 2). `method` feeds the **gives-up line** and is not a
      gate (ruling 3).
- [ ] The text path is untouched and remains the behaviour whenever either card lacks a label
      (ruling 1).
- [ ] **Prove inertness before labels exist:** with `card_labels` empty, the full test suite and
      the swaps probes produce identical results to `origin/main`. That is the claim the inert
      ship rests on, and it is checkable rather than asserted.

**PR 2b — the consumer. This is what ships inert to staging.**

---

## Task 3 — The vocabulary and the tightened definitions

Members as Hugh ruled: roles **`tutor`** (non-land search) and **`counterspell`**; themes
**graveyard hate, discard, stax, clones, theft, poison, goad, doublers, fog**; ramp kinds
**`costReduction`** and **`extraLandDrop`**.

Definitions, each of which needs a gold case in Task 4:

- **`drain`** means damage or life loss aimed **only at opponents** — a Shock is not drain.
- **`clones` vs token copies** — distinguish copying a permanent from making a token copy.
- **`doublers`** — define the class.
- **`fog` vs `protection`** — prevention of combat damage for a turn is not protection.
- **`stax` explicitly includes mass land denial**, so it agrees with `card_bracket_flags`.
- **`goad`** — forced combat.
- **`costReduction` vs `castFree`**, including self-affinity (a cost reduction that only applies
  to the card itself).
- **`scry` and `surveil` are not jobs.**
- Plus the earlier set: `removal` tightened (theft counts; counterspells, tappers, hand attack do
  not), `finisher` covers extra combats and extra turns, `protection` folds in regenerate,
  phasing and umbra armor, the monarch is repeatable `draw`, `mill` records whose library, wipes
  gains a "destroy each" example, rituals are `burstMana`, and every job the prompt names without
  a definition gets one (`finisher`, `castFree`, `drain`, `tribal`, the theme `draw`).

**Hash the SYSTEM prompt into `labelInputHash`.** Today the vocabulary reaches the hash only via
`LABEL_PROMPT_VERSION`, a hand-maintained constant — so widening it without a bump would leave
old-vocabulary labels indistinguishable from new ones and `cardsNeedingLabels` would skip them.
**This makes every existing label stale by design**, which is what the fresh run is for, and it
should be stated rather than discovered.

- [ ] Add a note at `REMOVAL_PATTERNS` recording that labels separate `counterspell` and this
      classifier deliberately does not, because its removal target of 8 was measured with
      counterspells counted. Mirror the note in `SYSTEM`.

**PR 3 — vocabulary and prompt.**

---

## Task 4 — The gold set, rebuilt

- [ ] **Re-audit all 108 existing entries** against the new definitions. Spellseeker becomes
      `tutor`; every entry touched by a tightened definition is re-judged.
- [ ] **At least 8 positives and 4 hard negatives per new or changed job.** The negatives are
      the half that matters: a hard negative for `tutor` is a land search, for `drain` a Shock,
      for `fog` a protection spell.
- [ ] **Cover the jobs that currently have zero gold coverage.** Computed from
      `scripts/lib/card-labels-gold.mts` against `ROLES`/`THEMES`, they are **`etbDraw`, `blink`,
      `finisher`, `deathTrigger`, `tribal`**. Task 3 touches `finisher` and `tribal`; the other
      three it does not. **All five are owed anyway**, because the gate is a per-job bar and a
      job with no gold cases has no measurable precision or recall — it would pass by being
      unmeasurable, which is the one way a bar can be worse than no bar.
- [ ] **Field-level bars for every consumer-read field, not only job kind.** The per-job bars
      score which JOB a card does. `affects` is a hard match gate (ruling 2) and `to`/`method`
      drive matching or the visible gives-up line — so **a model can pass every per-job bar while
      systematically mislabelling the fields that decide behaviour.** Each consumer-read field
      needs its own gold cases, its own precision and recall bar, and its own stop rule.
      `affects` is the strictest, because it is the only field that silently disqualifies an
      honest stand-in when wrong.
- [ ] **Per-job precision and recall bars (Hugh, 2026-09-28): `tutor` ≥0.9, every other job
      ≥0.8.** Tutor is higher because its errors reach beyond stand-ins — tutor agreement feeds
      bracket reach. **Stop rule:** any job under its bar goes back to the prompt before the run. An aggregate figure hides exactly the new jobs this is
      meant to judge.
- [ ] **Re-baseline the floors from the new re-sample**, read from the artifact rather than
      transcribed — the merged run plan's rounded 0.87 against the artifact's 0.868 is the
      precedent for why.

**PR 4 — fixtures and scoring.**

---

## Task 5 — The stratified re-sample

About **40 regex-selected cards per new job, plus 500 random**. Regex selection is what gets a
new job enough instances to score; the random half is what keeps the empty rate honest.

Free gates, none of which costs a model call:

- [ ] **Agreement with `card_bracket_flags`** on `tutor`, mass land denial and extra turns. Two
      independent classifiers over the same cards; disagreement is a finding either way.
- [ ] **Counterspells, tappers and hand attack are out of `removal`.**
- [ ] **Tutors are out of `draw`.**
- [ ] **The empty rate against 12.2%** — 464 of 3,792 on the first backfill's collected cards, read
      off staging by d9 on 2026-09-28. Not in any committed artifact, which is itself the reason
      Task 5 commits per-card outputs. A large move in either direction
      needs explaining before the run.
- [ ] **Per-card outputs committed.** Last time they went to an uncommitted `out/` and the
      `[]`-distribution question could not be asked at all.

**PR 5 — the harness change that commits per-card outputs, then the sample is run.**

---

## Task 6 — Re-estimate the cost from the real prompt

`SYSTEM_TOKENS = 1215` is a constant at `scripts/build-card-labels.ts:501`, measured against the
OLD system prompt. The new one is materially longer — more members, and a definition for every
job — so the constant is wrong the moment Task 3 lands, and it feeds `worstCaseUsd`, `waveSize`
and the ledger reservation.

- [ ] **Re-MEASURE the billed count for the new `SYSTEM`, do not compute one from the string.**
      The constant's own comment (`build-card-labels.ts:492`) says 1,215 is the block **as
      billed**, deliberately not `SYSTEM.length / 4`, which gives 1,084. A derivation is
      therefore either that estimate — which **understates** the figure the $55 hard stop is
      enforced against — or the one-char-per-token bound used for `PER_CARD_TOKENS`, which
      overstates about fourfold and shrinks `waveSize`. Both change a safety property. Use the
      provider's token-counting endpoint, which costs nothing, and update the constant to what it
      returns.
- [ ] **Pin it OFFLINE.** A test that recomputes the provider count cannot run in the normal
      suite: the counting call needs `ANTHROPIC_API_KEY` and `.github/workflows/ci.yml` runs
      `pnpm test` without it — so such a test either fails CI or is skipped, and **a skipped
      guard reports nothing while looking green.** Instead bind the measured constant to a
      SNAPSHOT of `SYSTEM`: the test hashes the current prompt and fails when the hash moves
      without the constant being re-measured. The live count happens once, by hand or in the
      authenticated labels workflow, and the offline test is what stops it going stale.
- [ ] Re-project the whole-run cost from the re-sample's measured per-card rate, and confirm it
      lands under $50 before dispatching anything.

**PR 6 — cost derivation.**

---

## Task 6b — The Gishath trial run (Hugh, 2026-09-28)

**The last check before the ~$50 run**, on a pool small enough to look at in one sitting.

**When:** after the re-sample passes its per-job bars (`tutor` ≥0.9, others ≥0.8) and before the
full run. The consumer (Tasks 1–2) is already live on staging and inert everywhere else.

### Which cards — defined by the code, not re-derived

`loadStandIns`' own header states the pool exactly: "the pool is exactly those three" — the
commander's support list ordered by its figure, the player's own copies, and the cheapest
unlisted cards, the last cut to `UNLISTED_POOL` (600). Plus the deck's own cards, since a cut
card is one side of every comparison.

**Derive the trial's card set from the gather's RAW CANDIDATES — which it does not currently
expose.** My first draft said "run the real gather and union the candidates", citing
`probe:build-from`'s lesson that a second copy of a selection rule drifts from the first. That
reasoning was right and the application was wrong: `loadStandIns` returns `StandInsRead`, which is
post-`sameJob`, post-affordability, post-ranking groups (`gather.ts:68-74`), and `full=true` only
lifts the display cap. **Unioning its output omits precisely the text-mismatched cards labels
could newly admit** — the cards the trial exists to evaluate.

So Task 6b needs a **raw-candidate gather** that returns pre-match oracle ids, with the
`roleWords` filter relaxed, alongside the `cardsNeedingLabels` filter. That is a refactor of
`gather.ts`, not a flag, and it is shared with Task 2b's label-aware pool selection — the same
seam both need.

Size, from local-dev: Gishath's `commander_support_cards` holds **245** rows, `UNLISTED_POOL` is
**600**, the deck is ~99, plus Hugh's owned cards inside the colour identity. **Order 1,500–3,000
distinct cards.**

### What it needs — two changes, and one of them is shared

- **A card-set filter on `cardsNeedingLabels`.** Today it selects every Commander-legal card.
- **A raw-candidate gather** exposing pre-match oracle ids with the `roleWords` filter relaxed
  (see above). Shared with Task 2b, which needs the same seam to admit a label-only candidate.
- **The publish needs nothing.** `publishRun(db, runId)` is already scoped to a run id, and its
  gate is `chunks.length === 0` — every chunk of the run done. A small run COMPLETES, so it
  publishes normally. The "all or nothing" that blocks a partial full run is exactly what makes
  a scoped trial publish cleanly.

*(The first draft claimed one change. It was two, and the second is a refactor.)*

### How the trial's labels relate to the full run

**They are reused, and this falls out of the existing design rather than needing a mechanism.**
`cardsNeedingLabels` skips a card whose stored `card_labels.input_hash` equals what its current
inputs produce. The trial publishes real `card_labels` rows, so the full run **skips those
1,500–3,000 cards and does not pay for them again**.

The converse is also correct and worth stating: if the prompt changes between the trial and the
full run, the hash differs and those cards are re-labelled — which is what should happen, because
they would otherwise be old-vocabulary labels hiding inside a new-vocabulary corpus.

**So the trial cannot make the full run skip a card it should label, nor double-pay one it
already labelled.** Both directions are the hash doing its job, and Task 3's SYSTEM hashing is
what makes the second one true.

### Cost

Its own cap, sized to the pool: **1,500–3,000 cards at the measured ~$0.0012 is $1.80–$3.60**.
Set the cap at **$6** — roughly double the estimate, enough that a longer new prompt does not
truncate the run, and far below anything that needs a second thought. Pause at $5.

### Its PR and its run id

**PR 6b — the card-set filter on `cardsNeedingLabels`.** The only code the trial needs.

The trial dispatches under **its own `backfill-YYYY-MM-DD` id, distinct from the full run's**,
using the date it is run on. Task 8's "one backfill id, typed once" governs the FULL run; the
trial is a separate run with a separate cap, and conflating them would put the trial's spend
inside the full run's ledger. Neither id may be `backfill-2026-09-28`.

### What Hugh does

Tests stand-ins for `HD - Gishath` on staging, against the same deck he walked before, with
label-driven comparisons live for that pool and the text path everywhere else.

### What would STOP the full run

State these before running it, so the trial cannot be rationalised afterwards:

- **A per-job bar missed on a HUMAN-AUDITED subset of the trial's cards.** Precision and recall
  need ground truth, and the trial's 1,500–3,000 committed outputs are PREDICTIONS, not truth —
  scoring them against themselves measures nothing. So the stop rule needs one of two things, and
  the plan must say which before the trial runs: a hand-audited sample of the trial pool with a
  stated minimum number of cases per job, or the free oracles below, which need no ground truth at
  all — agreement with `card_bracket_flags` on tutor and mass land denial, counterspells and
  tappers absent from `removal`, tutors absent from `draw`.
- **Stand-ins visibly worse than the text path** for a deck Hugh knows well. That is the whole
  point of choosing a deck he has walked before.
- **`affects` disagreeing with the card in an obvious case** — a self-mill card offered for an
  opponent-mill cut is ruling 2 broken, and it is a gate, not advice.
- **An empty rate far from the first run's 12.2%** on a real pool, in either direction, without
  an explanation.

Any of those goes back to the prompt or to Hugh, not on to the $50 run.

---

## Task 7 — Recover a stranded claim without help

**The state to end:** a run interrupted between the intent claim and `batches.create` leaves
`intended` rows with a null `batch_id` that no later run under that id can pass — they are absent
from `done`, so they are re-planned, and the claim insert then conflicts on the primary key and
the run dies. It happened twice on 2026-09-28: 127 rows on `weekly-2026-W40`, then 400 on
`backfill-2026-09-28` when the account's spend limit refused a create.

**This replaces the separate follow-up issue.** It is also the riskiest task here, and the plan
says so plainly: a reclaim was built and abandoned after **three consecutive pre-open passes each
found a Critical that the previous fix had introduced.** What follows is the specification those
three failures produced. Each bullet is a constraint, not a suggestion, and each was paid for.

### Evidence — when a row may be re-sent

- **Only when an exhaustive provider search holds no batch for its `custom_id`.** "I could not
  find it" is not "it does not exist"; re-sending a request a successful `create` accepted is the
  double charge the claim exists to prevent.
- **Scope the search to batches created at or after the oldest unresolved intent**, less a small
  skew margin. `submit` writes the intent row *before* `batches.create`, so an older batch cannot
  hold that custom id. Without this scoping, `results()` raising 404 on any batch past the
  provider's 29-day window marks the search inconclusive **for ever**, and an account-wide
  "still processing" flag is set by the run's own in-flight wave — each blocking the recovery
  permanently. Both were live defects.
- **The age test is inverted from the intuitive reading.** A `create` that returned may not be
  listed yet, so a YOUNG absence is the untrustworthy one. Re-send only after an exhaustive
  search has held past a grace period; a recent one is "come back later", never a refusal.

### Exclusion — how two invocations are kept apart

- **The release must change existence: DELETE the row and let the existing insert-claim retake
  it.** An `UPDATE ... SET status='intended' WHERE status='intended'` excludes nothing — under
  READ COMMITTED the loser re-evaluates, still matches, and both callers call `batches.create`.
  Measured on two connections: `A 1, B 1`.
- **Guard on age, or the release deletes a LIVE claim.** A fresh claim is `batch_id` null with
  the status defaulting to `intended` — byte-identical to a stranded row until `stampWave` runs,
  which is *after* the provider call. Without an age cutoff the recovery enables the very double
  charge it exists to prevent.
- **Deleting also refreshes `asked`.** `collectBatch` reads `intent.asked` while a row is still
  `submitted`, so a re-sent chunk carrying pre-crash names resolves every reply to null and
  surfaces only as an unexplained floor shortfall on a wave that was paid for.

### Reachability

- **The verdict must reach the release.** One attempt classified old intents as both reclaimable
  and abandoned, and `main` dies on any abandoned intent — so the recovery never ran for exactly
  the rows it existed to rescue. Trace the decision from the pure function to the caller.
- **Release all reclaimable intents at once, before planning**, not the current wave's share.
  Releasing per wave leaves the rest to a later pass that refuses them.

### The unsolved part, stated rather than hidden

**`expired` rows must NOT be released.** They were charged, and `alreadySpent` reserves them at
worst case by *counting rows with that status* — deleting them destroys the only record of real
spend and hands the budget back. That is worse than the deadlock it would cure. A correct fix
needs a release that preserves the reservation, which means separating a spend row from a claim
row: a change to the ledger's shape, and **out of scope here**. Until then the `expired` path
still cannot resume under its own run id, and its message must say so rather than promise
re-submission.

### Acceptance

- [ ] A probe that **races two connections** on one stranded intent and asserts exactly one wins.
      Nothing else catches the exclusion defect; every single-connection check passed over it.
- [ ] A probe case planting a **live claim** (the column's real default, not a stated date) and
      asserting it survives a release.
- [ ] The pure verdict unit-tested, including that no age makes an inconclusive search
      re-sendable.
- [ ] Mutation-checked: the UPDATE form restored, the age guard removed, the scoping removed —
      each must fail a named check.

**PR 7 — recovery. Late, and it does not block the run:** a fresh run id has no stranded rows in
its path, so the backfill proceeds whether or not this lands.

---

## Task 8 — Operations

- [ ] **Run between two Monday catalog refreshes.** A refresh mid-run changes the card set, and
      `planChunks` is index-keyed: a shifted plan is refused, which strands the run.
- [ ] **`CARD_LABELS_ENABLED` stays off until the backfill publishes**, stated here because two
      live run ids over one stale card set both pay — `reconcile` and `alreadySpent` are each
      filtered by `run_id`, so a weekly run would re-plan the same cards and charge again.
- [ ] **Do not reuse `backfill-2026-09-28`.** It already holds **400 stranded intents** from the
      run the spend limit interrupted, and it passes the workflow's own
      `^backfill-[0-9]{4}-[0-9]{2}-[0-9]{2}$` regex — so a run typed on that date lands straight
      on them and dies at the claim. Task 7 is explicitly excused from blocking the run on the
      grounds that "a fresh run id has no stranded rows in its path"; that is only true of an id
      that has never been used. Pick an unused date, or dispose of the 400 first.
- [ ] **Handle `weekly-2026-W40`'s 127 intents explicitly.** They are `intended`, `batch_id`
      null, $0, unreserved, and they permanently block that run id. Decide: scoped delete (Hugh's
      OK), or leave them and never reuse that id. Say which, in the plan, before the run.
- [ ] **Check account headroom before each dispatch.** The limit was raised on 2026-09-28, so it
      is not the current blocker — but the first attempt died on it mid-run, which is the
      expensive way to find out. The cheapest discriminating check is a one-token
      `messages.create`; `batches.list` succeeds under the limit and proves nothing.
- [ ] **One backfill id, typed once**, of the validated `backfill-YYYY-MM-DD` shape.
- [ ] One dispatch at a time, each only after the previous run has ended; re-dispatch on a poll
      timeout only, same id.
- [ ] On publish, run the gold check: floors from the artifact, **no tolerance**, per-card diff
      on failure.
- [ ] The production copy still waits for Hugh.

---

## What this plan deliberately does not do

- **It does not widen the app's `Role`/`Theme` unions.** Its own plan, if wanted.
- **It does not change `REMOVAL_PATTERNS`.** Hugh's ruling; the divergence is documented at both
  sites instead.
- **It does not add gold coverage for jobs beyond the five named in Task 4.** Those five are
  owed because the per-job bar cannot judge a job with no cases; anything further is worth having
  and is not this plan's work.
