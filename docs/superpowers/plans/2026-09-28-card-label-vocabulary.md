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
- **`jobOf` in `src/lib/swaps/stand-ins.ts:56` still routes through `classifyRoles`** — the
  regex classifier — via `spellRoles`. The swap engine, the one obvious consumer, does not know
  labels exist.

So a vocabulary chosen now would be chosen blind. Every field below is included only because a
named consumer reads it.

## Global constraints

- **Nothing spends until this plan is approved AND the re-sample is read.** The fresh run gets
  its own $55 hard stop and $50 pause, separate from the ~$11.92 already spent.
- The re-sample must project **under $50** or it goes back to Hugh.
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
- **A labelled card compared with an unlabelled one.** The backfill will not be complete on day
  one, and a card with no label is not a card with no jobs. State the comparison explicitly:
  fall back to `classifyRoles`, refuse the comparison, or treat absence as unknown — and say
  what the reader sees in each case.
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

### `affects: self | opponents | each | null`

The reviewer measured **304 self-discard against 146 opponent-discard**, and **129 of 289 mill
labels are self-mill**. Those are opposite jobs wearing one name: self-mill is a graveyard
engine, opponent-mill is a win condition. A stand-in that swaps one for the other is wrong in a
way no limit currently expresses.

This **redefines `restrictedTo` as "what the effect touches"**. Today removal's `restrictedTo`
holds the target's type across ~1,130 rows, while the run plan's Task 5 rule 2 reads it as the
DECK's type. Those are different claims and the rule is currently reading the wrong one. The
redefinition has to be stated in the prompt and re-audited in the gold set.

### `to: hand | battlefield | top` — for tutors and recursion

All **32 reanimation cards are labelled like regrowth**. Returning a creature to the battlefield
and returning it to hand are not interchangeable, and a tutor to hand is not a tutor to the
battlefield.

### `method: destroy | exile | bounce | shrink` — for removal

**65 of 74 bounce cards are labelled removal.** Bounce is removal that gives the card back;
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

Why decoupling is needed, measured: `avg_ramp` and its three siblings are columns on
`commander_support`, `commander_pair_support` and `identity_composition`; **19 files consume
`ROLE_TARGETS`** (`Record<Exclude<Role, "land">, number>`, so a new role is a compile error until
someone invents a target); **6 files read `recs/themes`**. Widening the app's unions is a
database change with user-visible Role Coverage consequences and is **its own plan**, not part of
this one.

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
- [ ] **Cover the jobs that currently have zero gold coverage**, whatever the new vocabulary
      does or does not add.
- [ ] **A per-job precision and recall bar (≥0.8), with a stop rule:** any job under the bar goes
      back to the prompt before the run. An aggregate figure hides exactly the new jobs this is
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
- [ ] **The empty rate against 12.2%** — the first run's figure. A large move in either direction
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

- [ ] **Derive `SYSTEM_TOKENS` from the real `SYSTEM` string** rather than restating it, so it
      cannot drift again.
- [ ] Move the drift flag accordingly.
- [ ] Re-project the whole-run cost from the re-sample's measured per-card rate, and confirm it
      lands under $50 before dispatching anything.

**PR 6 — cost derivation.**

---

## Task 7 — Operations

- [ ] **Run between two Monday catalog refreshes.** A refresh mid-run changes the card set, and
      `planChunks` is index-keyed: a shifted plan is refused, which strands the run.
- [ ] **`CARD_LABELS_ENABLED` stays off until the backfill publishes**, stated here because two
      live run ids over one stale card set both pay — `reconcile` and `alreadySpent` are each
      filtered by `run_id`, so a weekly run would re-plan the same cards and charge again.
- [ ] **Handle `weekly-2026-W40`'s 127 intents explicitly.** They are `intended`, `batch_id`
      null, $0, unreserved, and they permanently block that run id. Decide: scoped delete (Hugh's
      OK), or leave them and never reuse that id. Say which, in the plan, before the run.
- [ ] **Check account headroom before dispatch.** The first attempt died on the Anthropic
      account's own spend limit mid-run. The cheapest discriminating check is a one-token
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
- **It does not reclaim stranded intents.** A reclaim path was built and abandoned after three
  consecutive pre-open passes each found a Critical introduced by the previous fix. A fresh run
  id makes it unnecessary. The design notes, including the unsolved problem that releasing an
  `expired` row destroys the only record of real spend, are with Hugh as a follow-up.
