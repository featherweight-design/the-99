# Card label vocabulary — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development` or
> `superpowers:executing-plans` to implement this task-by-task.

**Goal:** widen the card-label vocabulary to the set Hugh ruled on (2026-09-28), fix the
definitions the gap review found, make a vocabulary change invalidate stale labels by
construction, and re-run the backfill on the new vocabulary.

**Architecture:** the label vocabulary stops being tied by identity to the app's `Role` and
`Theme` unions and becomes a superset of them, checked one way. The prompt's SYSTEM text enters
the input hash so a vocabulary edit re-labels what it invalidates.

**Spec:** Hugh's ruling of 2026-09-28, relayed via d9; gap review summarised in
`boards/overnight-decisions-2026-09-27.md`.

## Global constraints

- **Nothing spends until this plan is approved AND the re-sample is read.** The fresh run gets
  its own $55 hard stop and $50 pause, separate from the ~$12 already spent.
- The re-sample must project **under $50** or it goes back to Hugh.
- **Keep the re-sample's per-card outputs.** Last time they went to an uncommitted `out/` and a
  later question about the `[]` distribution could not be asked at all.
- A fresh backfill run id. The 10,128 old-vocabulary staged rows are discarded; the 400
  `abandoned` rows are left alone, moot under a new id.
- PR rules as always: no stacked PRs, split above ~20 files or ~800 lines.

---

## The decision this plan rests on: decouple, do not extend the app's unions

`src/lib/labels/types.ts` currently ties the label vocabulary to the app's unions **in both
directions**:

```ts
export const ROLES  = [...] as const satisfies readonly Role[];
export const THEMES = [...] as const satisfies readonly Theme[];
type _EveryRoleIsListed  = Covers<Exclude<Role,  (typeof ROLES)[number]>>;
type _EveryThemeIsListed = Covers<Exclude<Theme, (typeof THEMES)[number]>>;
```

`satisfies` rejects a label member that is not an app member; `Covers<…>` rejects an app member
missing from labels. **The two lists must be identical.** So adding `tutor`, `counterspell` and
nine themes to labels would force them into `src/lib/recs/roles.ts` and `src/lib/recs/themes.ts`.

Measured cost of doing that:

- **`Role` reaches the database.** Three tables carry the four role targets —
  `commander_support`, `commander_pair_support`, `identity_composition`. Two more roles means a
  migration on all three, a change to `deriveAndWriteRoleTargets`, and a re-derivation run.
- **19 files consume `ROLE_TARGETS`**, including Role Coverage on `/commanders/[slug]` and the
  decklist. `ROLE_TARGETS` is `Record<Exclude<Role, "land">, number>`, so a new role is a
  compile error until someone invents a target for it.
- **`Theme` drives deck-theme detection**, whose `RULES` are regexes over oracle text, and feeds
  swaps (`stand-ins`, `fits`, `honest`, `gather`) and discovery.

None of that is wanted here. A label says what a CARD does; an app theme says what a DECK is
about, and the app's role classifier is a coarse regex instrument with its own measured targets.
Forcing identity makes every label refinement a database migration.

**So: the label vocabulary gets its own unions and a ONE-WAY check** — every app `Role` and
`Theme` must still be labelable, so nothing upstream goes stale, but labels may name things the
app has no concept of. That preserves everything the current tie was written to catch (its
comment: "a rule added there would otherwise leave this a stale third copy with nothing
failing") and drops only the half that is now in the way.

**If Hugh wants the app's roles widened too, that is a separate plan.** It is a database change
with user-visible consequences on Role Coverage, and it should not ride along inside a labelling
change.

---

## Task 1 — Decouple the vocabulary (no vocabulary change yet)

**Files:** modify `src/lib/labels/types.ts`; add `src/lib/labels/types.test.ts` cases.

Introduce label-owned unions and keep the one-way guarantee:

```ts
/** Every app Role, plus roles the app has no concept of. */
export type LabelRole = Role | "tutor" | "counterspell";
export type LabelTheme = Theme | "graveyardHate" | …;

// ONE WAY, deliberately. An app Role missing from the label vocabulary is a compile error —
// that is what the old two-way tie was for. A LABEL role the app does not have is allowed:
// a label describes a card, an app role drives Role Coverage and three tables of targets.
type _EveryAppRoleIsLabelable  = Covers<Exclude<Role,  (typeof ROLES)[number]>>;
type _EveryAppThemeIsLabelable = Covers<Exclude<Theme, (typeof THEMES)[number]>>;
```

- [ ] **Step 1** — add `LabelRole`/`LabelTheme`, retype `ROLES`/`THEMES` as
      `readonly LabelRole[]` / `readonly LabelTheme[]`, keep both `Covers<…>` lines unchanged.
      No members added yet, so the arrays are byte-identical and the diff is types only.
- [ ] **Step 2** — `pnpm typecheck`. Expected: clean. This task changes no behaviour.
- [ ] **Step 3** — prove the remaining guarantee still bites: add a member to the app's `Theme`
      union locally, confirm `types.ts` fails to compile naming it, revert. Record the error
      text in the PR body. **Without this the task is unverified** — the whole point is that one
      direction still fails.
- [ ] **Step 4** — commit.

**PR 1 boundary.** Types only, no vocabulary change, no prompt change. Small and separately
reviewable, and it makes PR 2's diff about the vocabulary rather than about the type surgery.

---

## Task 2 — The vocabulary, the definitions, and the hash

**Files:** modify `src/lib/labels/types.ts`, `src/lib/labels/prompt.ts`,
`src/lib/labels/schema.ts`, `scripts/lib/card-labels-schema.test.mts`,
`src/lib/labels/prompt.test.ts`.

### 2a — members

- Roles: add **`tutor`** (non-land search) and **`counterspell`**.
- Themes: add **`graveyardHate`, `discard`, `stax`, `clones`, `theft`, `poison`, `goad`,
  `doublers`, `fog`**.
- Ramp kinds: add **`costReduction`** and **`extraLandDrop`**.

`RAMP_KINDS` is label-owned already, so it needs no decoupling.

### 2b — definitions in `SYSTEM`

Every one of these is a prompt edit, and each needs a gold case in Task 3:

- **`removal` tightened**: theft counts; counterspells, tappers and hand attack do not.
- **`drain`** includes burn to players.
- **`finisher`** covers extra combats and extra turns.
- **`protection`** folds in regenerate, phasing and umbra armor.
- **the monarch** counts as repeatable `draw`.
- **`mill`** records whose library.
- **wipes** gains an example worded "destroy each".
- **rituals are `burstMana`**, stated.
- **Define every job the prompt names without a definition**: `finisher`, `castFree`, `drain`,
  `tribal`, and the theme `draw`. The gap review found these named in the vocabulary list and
  never defined, which is the likeliest cause of the marginal calls (Cheering Fanatic →
  `castFree`?).

### 2c — reconciling `counterspell` with the app's removal classifier

`src/lib/recs/roles.ts:18` has `REMOVAL_PATTERNS` including `/counter target/`, so the app
counts a counterspell as removal for Role Coverage. With a `counterspell` label role the two
classifiers disagree.

**They are reconciled by saying what each is for, not by changing the app.** The label is a
per-card fact; `classifyRoles` is a coarse deck-level instrument whose removal target (8) was
measured WITH counterspells included. Dropping `/counter target/` would shift every deck's
removal count and every Role Coverage figure on `/commanders/[slug]` and the decklist, against
targets derived on the old definition — a user-visible change that belongs to its own decision.

- [ ] **Step 1** — add a comment at `REMOVAL_PATTERNS` recording that the label vocabulary
      separates `counterspell`, that this classifier deliberately does not, and why (targets
      were measured on this definition).
- [ ] **Step 2** — add the same note to the labels' `SYSTEM` where `removal` is defined, so a
      reader of either lands on the same explanation.

### 2d — hash the SYSTEM prompt

`labelInputHash` covers `[oracleId, renderCard(card), LABEL_PROMPT_VERSION, model]`. The
vocabulary lives in `SYSTEM` and reaches the hash **only** through a hand-maintained constant. A
vocabulary edit without a bump leaves every already-labelled card holding old-vocabulary labels,
indistinguishable from new ones, and `cardsNeedingLabels` skips them.

```ts
// The SYSTEM prompt, hashed rather than versioned by hand. The card half already does this —
// "EXACTLY the string the model is sent, so no sent field can be forgotten here" — and the
// system half was left to a constant someone has to remember. It was not bumped for the
// vocabulary widening; nothing would have failed, and the corpus would have been silently mixed.
createHash("sha256").update(SYSTEM).digest("hex").slice(0, 16),
```

- [ ] **Step 1** — add the SYSTEM digest to the hash payload, keeping `LABEL_PROMPT_VERSION`
      for deliberate re-labels that do not change the text.
- [ ] **Step 2** — test: two different `SYSTEM` strings give different hashes for one card;
      the same string gives the same hash. **Mutation:** remove the digest from the payload and
      confirm the first test fails.
- [ ] **Step 3** — record in the PR body that this makes every existing label stale by design,
      which is what the fresh run is for.

### 2e — validator

`schema.ts`'s `validateJob` and `JOB_FIELDS` must accept the new kinds, and `jobKey` is
unchanged (it already serialises `kind` opaquely). Add rejection cases for a theme in the role
space and vice versa, as the existing tests do.

**PR 2 boundary.** Vocabulary, prompt, validator, hash, and their tests. Estimate ~8 files.

---

## Task 3 — Gold set cases for every new and changed job

**Files:** modify the gold set fixture and `scripts/label-cards-score.mts` if the per-job report
needs new rows.

- [ ] One hand-checked case per NEW member: `tutor`, `counterspell`, and each of the nine
      themes, plus `costReduction` and `extraLandDrop`.
- [ ] One per CHANGED definition, chosen to be wrong under the old wording and right under the
      new: a theft card (now `removal`), a burn-to-face card (now `drain`), an extra-combat card
      (now `finisher`), a regenerator (now `protection`), a monarch card (now repeatable
      `draw`), a "destroy each" wipe, a ritual (`burstMana`).
- [ ] The score report must break down **per job**, not only in aggregate, or a new job's
      accuracy is invisible inside a global figure.

**This is the gate.** Hugh's condition is per-job accuracy from the gold check, so a new member
without a gold case cannot be judged at all.

**PR 3 boundary.** Fixtures and scoring only.

---

## Task 4 — Keep the re-sample's per-card outputs

**Files:** modify `scripts/label-cards-run.mts`.

`out/` is not committed, so last time the sample's per-card labels were unrecoverable and the
`[]`-share question could not be answered. Write them to
`docs/superpowers/benchmarks/<date>-card-labels-sample.json` — committed, one row per card with
its labels — alongside the existing aggregates.

- [ ] Guard the size: 508 cards of small label arrays is well under a megabyte; assert the file
      is written and non-empty rather than assuming.

**PR 4 boundary.** One script, one artifact path.

---

## Task 5 — The re-sample, then the run (no code)

Nothing here spends until Tasks 1–4 are merged and Hugh has approved this plan.

- [ ] **Re-sample** on the new vocabulary, ~$2, per-card outputs kept. Report **per-job
      accuracy** from the gold check and **cost per card**.
- [ ] **Gate:** the projection must come in under $50. If it does not, back to Hugh.
- [ ] **Fresh backfill** under a new id (`backfill-YYYY-MM-DD`, the validated shape),
      `cap=55 pause=50`. One dispatch at a time, each only after the previous run has ended,
      re-dispatch on a poll timeout only, same id.
- [ ] Report each run id and its ended figures; flag if measured cost per card drifts above
      $0.0013.
- [ ] On publish, run the gold check: floors read from the score artifact, **no tolerance**, and
      a per-card diff printed on failure.
- [ ] The production copy still waits for Hugh.

---

## What this plan deliberately does not do

- **It does not widen the app's `Role`/`Theme` unions.** That is a database migration across
  three tables plus a re-derivation plus Role Coverage changes, and it is not needed to label
  cards. If it is wanted, it is its own plan.
- **It does not change `REMOVAL_PATTERNS`.** Doing so shifts every Role Coverage figure against
  targets measured on the current definition. Task 2c records the divergence instead.
- **It does not reclaim or delete the stranded rows.** A new run id makes them moot; they are
  `abandoned`, `batch_id` null, and book $0.
