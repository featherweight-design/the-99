# Deck Tuning Suggestions Implementation Plan

> **Revised 2026-09-23 (sub-project 5 of the Deck Analysis Epic).** This plan was written on
> 2026-09-07, paused, and is now rebuilt on what the epic has shipped since. The revision is
> in place rather than a successor file, so there is one plan to read. What moved:
>
> 1. **The evidence pack is assembled FROM the Deck Profile** (`src/lib/profile/**`), not from
>    `DeckDetail`, `computeRoleCounts`, the retired `RECOMMENDED_MIX` or `readSynergyCards`.
>    Play data arrives as a new profile fact group, the one `src/lib/profile/types.ts:12-14`
>    anticipates, attached OUTSIDE the cached document (Task 7). The tuning fingerprint is
>    built on `profileFingerprint` rather than hashing the decklist a second time (Task 6).
>    This was amendment (1) of the 2026-09-20 foundation ruling; it is now carried into the
>    tasks rather than sitting above them.
> 2. **No game gate.** `PATTERN_MIN` gates nothing in this feature: it is gone from the
>    constraints, the copy re-exports, `gateReason`, `GateReason.kind` and every test. A deck
>    built tonight gets an answer tonight; games enrich the evidence when they exist and the
>    panel states which it had. This was amendment (2) of the same ruling.
> 3. **One shared model client, in `src/lib/model/`.** The synopsis (sub-project 6) is the
>    epic's other model feature, so the client, its retries and its deadline carry no tuning
>    assumptions (Task 10). The model is `claude-sonnet-5`, recorded per run.
> 4. **The hourly ceiling is replaced by a shared DAILY allowance** (Hugh, 2026-09-23). The
>    synopsis and tuning spend one per-player allowance through the shared client: one counter,
>    one number. It lives in the client's layer, its size is a named constant set once a call's
>    cost is measured, and an exhausted allowance is a stated state (Task 10, Task 12).
> 5. **Split into four PRs** (see *PR boundaries*). PRs A–C are the whole backend and need no
>    design input. **PR D is BLOCKED ON DESIGN — placement addendum**: the handoff mounts the
>    panel on the Games tab and predates the Analysis tab (#753), so no tab is chosen here.
> 6. **Stale references fixed** against `origin/main` at `67f29274`: line numbers, the
>    workflow file, test files that do not exist, and the migration head (0052).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a deck, its logged games and notes when there are any, and a stated deck intent into a small set of grounded cut/add suggestions the player can apply in one tap, produced by a single schema-constrained model call whose every claim is verified against the player's own data before it is shown.

**Architecture:** A pure core and a thin shell. Everything that decides — the fingerprint, the evidence pack, the prompt, the response schema, the six validation rules, the presentation checks, the reaper's arithmetic — lives in `src/lib/tuning/*` as pure functions with no database and no network, so the whole decision surface is unit-testable without either. The deck half of the evidence is the Deck Profile the Analysis tab already computes; the play half is a new profile fact group. The model call goes through `src/lib/model/`, a feature-neutral client that owns the HTTP contract, the deadline, the two bounded retries and the per-player daily allowance. One server action module (`src/app/decks/tuning-actions.ts`) owns the durability contract: a `pending` run row committed in its own transaction before the model call, a partial unique index that makes a second concurrent run impossible, a read-time reaper that fails abandoned rows, and conditional writes on both the success and failure paths so an interrupted run can never overwrite a reaped one. The UI is a panel on the builder page whose placement is Design's to draw.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, Tailwind 4, Drizzle ORM on Neon Postgres, zod 4, Clerk auth, Vitest 4 + jsdom + Testing Library, pnpm. The model call is a raw `fetch` to `https://api.anthropic.com/v1/messages` — there is no `@anthropic-ai/sdk` in this repo and this plan does not add one, matching the existing integration in `scripts/generate-commander-prose.ts`.

**Spec:** `docs/superpowers/specs/2026-09-07-deck-tuning-suggestions-design.md` (§5 amended 2026-09-23 to match this revision)

**Design property table:** `docs/superpowers/design-tables/deck-tuning.md` — every component task must satisfy the rows for its component. The table is the deterministic checklist; the design-review skill verifies against it before the PR opens. Its S4 state 1 (*Below threshold*) is retired by the removed gate; see Task 14.

**Gap report (eng resolutions):** `docs/superpowers/gap-report-deck-tuning.md`

---

## Global Constraints

Every task's requirements implicitly include this section.

**Presentation rules inherited from #9 (the shipped game log). These are not negotiable and apply to model output as well as to our own strings.**

Read every rule below as governing **what reaches the player** — shipped copy, the prompt, the evidence pack, and the model's own output. They do not govern the plan's own prose or its test fixtures: several tests below deliberately feed a `%` to a validator to prove it rejects one, and a rule that forbade writing the character at all would forbid testing the rule.

- **No percentage anywhere.** Not in a suggestion, not in a rationale, not in a citation — and not in the evidence pack, which is why the pack forwards a staple's `commanders of commanderTotal` and drops `StapleRef.avgInclusion` (a proportion the model would happily render as one).
- **No net figure anywhere.** `AxisTally.net` orders and buckets axes; it is never rendered and never enters the evidence pack as a rendered value.
- **Every count carries its denominator.** `2 of 5 games`, never `2 games`.
- **No game gate.** Generation is open at zero games. `PATTERN_MIN` stays where #9 uses it (the Games panel's own headline) and is neither imported nor re-exported by anything in this plan. A pack with no games says so, and the prompt tells the model that play evidence is absent rather than letting it infer patterns from nothing.
- **`axisCopy`** is imported from `src/lib/copy/game-log.ts` and redefined nowhere. `src/lib/copy/deck-tuning.ts` re-exports it.
- **#9's shipped denominator strings must not be changed.** `1 up`, `3 up · 1 down`, `Mana — 2 up, 2 down.`, `2 marked` stay exactly as they ship today. New copy is additive.
- **Fix above Keep** in any axis ordering the evidence pack or the UI produces.
- **A loss is never `--danger`.**
- **Nothing unmounts mid-write.** A pending mutation keeps its component mounted.
- **A refusal preserves what was typed.** A rejected note or intent is still in the field afterwards.
- **One live-region message per settle**, never one per intermediate state.

**Data and schema.**

- **The whole game-note path shipped 2026-09-13**, ahead of the rest of this plan: the column and its check (`deck_games.note`, `src/db/schema.ts:578`, migration `0029_slow_whiplash`), `DeckGame.note` read by `listDeckGames`, `LogGameInput.note` accepted by `logGame`, the History row line, and the form's field and counter. Task 4 is done; Task 3 keeps only its step 6. Do not add the column, the field or the line again. **A game already logged still has no edit path** — #9 ships none by design.
- The game column is **`note`, singular** — `deck_games.note`. `decks.notes` (plural, `src/db/schema.ts:281`) is a different thing.
- **Note ≤ 140 characters. Intent ≤ 120 characters.** The app-seeded intent string must itself fit inside 120.
- **Five failure classes, not four:** `upstream_busy`, `timeout`, `malformed`, `ungrounded`, `interrupted`. `interrupted` is written by the reaper, never by the run itself.
- **`cancelled` is a fourth `status` value**, alongside `pending`, `ok`, `failed`. A player pressing Stop is not a failure.
- **Runs are kept, never replaced.** The history of runs on a deck is the record.
- **Two constraints do real work:** the partial unique index on `deck_id where status = 'pending'`, and `add_oracle_id` as a foreign key into the card catalog.
- **Both outcome writes are guarded by `where status = 'pending'`.** Zero rows affected means "I was reaped or cancelled" — discard the result silently.
- **The Deck Profile is read, not extended in place.** `src/lib/profile/types.ts` is a shared surface with one owner (playbook, *Shared surfaces*). Task 7's one addition to it — the `play` key — goes through the orchestrator for ownership of that PR, and no other file under `src/lib/profile/` changes.

**Model, allowance and validation.**

- **Model: `claude-sonnet-5`** — the current Sonnet, chosen for a structured-output task that must follow nine presentation rules. It is `TUNING_MODEL` in `src/lib/tuning/limits.ts`, passed to the shared client per call, and recorded per run in `deck_suggestion_runs.model`. Nothing in `src/lib/model/` names a model.
- **One model run per press.** The two in-run bounded retries (`upstream_busy`, `malformed`) happen inside that single run row and do not create a second run.
- **One per-player DAILY allowance, shared with the synopsis.** `MODEL_DAILY_ALLOWANCE` in `src/lib/model/allowance.ts` is the only number; a run consumes one unit whether it succeeds or fails, because the call was paid for either way, and a refusal before the call consumes none. Its value is a named placeholder until a call's cost is measured (see *Cost*). An exhausted allowance is a stated state with its own copy and the time it reopens — never a silent failure and never a disabled button without a reason.
- **Three suggestions maximum. Fewer is legitimate** — one well-grounded suggestion beats three padded ones, and zero surviving suggestions is the `ungrounded` outcome, not an error.
- **Six validation rules**, all pure: schema, the card exists, the cut is real, the add is legal (colour identity), the evidence exists, and the nine presentation checks. Every drop increments `dropped_count`.
- **`PROMPT_VERSION`** is a single integer exported from one module. Bumping it invalidates every tuning fingerprint.
- **No bracket claim.** The pack carries no bracket figure and the prompt asks for none. `bracketDelta` has no reachable `[3] → [4]` transition, and a suggestion reasoning about one would cite evidence the app cannot produce.

**Money and formatting.**

- **`formatCents` at `src/lib/decks/price.ts:111-116` is the only price formatter.** `deckTuningCopy.card.price(amount)` is a pass-through that takes an already-formatted string.

**Client-safety.**

- **A module a `"use client"` component value-imports must never touch the database.** `src/lib/decks/read.ts` imports the Drizzle client, which throws at module init without `DATABASE_URL`; `src/lib/decks/status.ts` exists as a separate module for exactly this reason. Server-only here: everything in `src/lib/model/` (the Anthropic call and the allowance store), and `src/lib/tuning/fingerprint.ts` (hashes through `node:crypto`, like `src/lib/profile/fingerprint.ts`). The rest of `src/lib/tuning/` is pure and client-safe. The File Structure table marks each.

**Workflow.**

- Pre-push gate, every push: `pnpm typecheck && pnpm lint && pnpm test`, plus the stub-DB build (`DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`), then `git fetch origin && git rebase origin/main`.
- Stage files by name — never `git add -A`.
- Migrations are generated with `pnpm db:generate`, never handwritten. The head on `main` at revision time is `drizzle/0052_tan_elektra.sql`, and the `analysis-tab` lane generates one too — **`git fetch` and generate against the newest `main` immediately before PR A**, and if a rebase collides, regenerate and re-stamp the ledger rather than renumbering by hand.
- Race and durability behaviour is proved by a probe against a real Postgres (`pnpm probe:tuning-run`, Task 11), never by a jsdom test that stubs the database — the repo's convention for every rule a transaction enforces.

---

## File Structure

**Shared model layer — `src/lib/model/` (all server-only; feature-neutral):**

| File | Responsibility |
|---|---|
| `client.ts` | `callModel({ model, system, user, maxTokens, schema, deadlineMs }, deps?)` — the raw `fetch`, one deadline across both attempts, one retry on `429`/`529`/`5xx`, one retry on a reply that fails the caller's zod schema. Returns `{ ok: true, value } \| { ok: false, errorClass: "upstream_busy" \| "timeout" \| "malformed" }`. Knows no feature. |
| `allowance.ts` | `MODEL_DAILY_ALLOWANCE`, `ALLOWANCE_WINDOW_MS`, `reserveModelCall(tx, userId, feature)` and `readAllowance(userId, now)`. The only counter. |

**Pure core — `src/lib/tuning/` (no database, no network, client-safe unless noted):**

| File | Responsibility |
|---|---|
| `prompt-version.ts` | The single `PROMPT_VERSION` integer. Nothing else. |
| `fingerprint.ts` | **Server-only.** `tuningFingerprint(input)` — a hash over the profile fingerprint, the play group's inputs, the intent and `PROMPT_VERSION`. |
| `evidence.ts` | `buildEvidencePack({ profile, play, intent, owned })` — assembles the pack from a `DeckProfile`. Pure. |
| `prompt.ts` | Renders the evidence pack into the system + user messages. Pure string work. |
| `response-schema.ts` | The zod schema for the model's reply, and the `TuningResponse` type. |
| `validate.ts` | The six validation rules, as pure predicates over a candidate plus the pack. |
| `presentation.ts` | The nine `suggestionRules` checks — the sixth validation rule. |
| `gate.ts` | `gateReason(state)` and the `GateReason` type — the one answer to "why is the button disabled", shared by the panel and by `runTuning`. No game count. |
| `reaper.ts` | `reapCutoff(now)` and the pure arithmetic behind the read-time reap. |
| `limits.ts` | `TUNING_MODEL`, `REAPER_CUTOFF_MS`, `MODEL_TIMEOUT_MS`, `MAX_SUGGESTIONS`, plus `intentRefusal(intent)` and `seededIntent(commanderName)`. |

**Profile fact group:**

| File | Responsibility |
|---|---|
| `src/lib/profile/play.ts` | `ProfilePlay` and `buildPlayGroup(games)` — pure. The play-data group `types.ts:12-14` names, built from `DeckGame[]`. |
| `src/lib/profile/types.ts` | **Shared surface.** Gains `play?: ProfilePlay \| null` on `DeckProfile`, documented as never present in the cached document. |

**Server shell:**

| File | Responsibility |
|---|---|
| `src/app/decks/tuning-actions.ts` | Every server action: `runTuning`, `cancelTuningRun`, `applySuggestion`, `undoSuggestion`, `dismissSuggestion`, `restoreSuggestion`, `saveDeckIntent`, `readTuningEvidence`, `readTuningPanel`. |
| `src/lib/decks/tuning-read.ts` | `readTuningState(deckId, userId, fingerprint)` — the newest run plus its items, reaping on the way past, plus the reader's allowance. |
| `scripts/probe-tuning-run.mts` | `pnpm probe:tuning-run` — the durability contract against a real Postgres. |

**Copy:**

| File | Responsibility |
|---|---|
| `src/lib/copy/deck-tuning.ts` | Exists (the `note` section shipped). Gains `panel`, `failure`, `card`, `intent`, `suggestionRules`, `announce`, `allowance`, and `manifestCopy`; re-exports `axisCopy` from `game-log.ts`. |

**Components — `src/components/decks/` (PR D, BLOCKED ON DESIGN):**

| File | Responsibility |
|---|---|
| `tuning-panel.tsx` | The panel states plus the Stop transition. Owns the run lifecycle. |
| `manifest-rows.tsx` | The generating manifest, ticking on real read completions. |
| `suggestion-card.tsx` | One cut/add pair, its citations, and apply/dismiss/undo/restore. |
| `deck-intent.tsx` | The intent ask, chip, edit, and seeded state. |

**Modified:**

| File | Change |
|---|---|
| `src/db/schema.ts` | `decks.intent` + `decks.intent_seeded`; `deck_suggestion_runs`; `deck_suggestion_items`; `model_calls`. Adds `uniqueIndex` to the pg-core import. (`deck_games.note` shipped.) |
| `src/lib/decks/read.ts` | `DeckDetail.intent` and `.intentSeeded` (`DeckDetail` is at `:168`, `getDeckDetail` at `:219`). |
| `src/app/decks/actions.ts` | `fillDeck` (`:660`) seeds the intent. |
| `src/app/decks/[id]/page.tsx` | Exports `maxDuration` (PR D). |
| the placement Design names | Mounts the tuning panel and the intent control (PR D). |
| `.env.example`, `docs/deployment.md` | `ANTHROPIC_API_KEY` — absent from both today; only the prose workflow reads it. |
| `package.json` | `check:tuning`, `probe:tuning-run`. |

**Scripts and CI:**

| File | Responsibility |
|---|---|
| `scripts/check-tuning.ts` | `pnpm check:tuning` — one live API call against a fixture pack, asserting the response validates. |
| `scripts/fixtures/tuning-pack.json` | The committed fixture pack. |
| `.github/workflows/scryfall-contract.yml` | The "Upstream contract checks" workflow. Gains the tuning step. |

---

## PR boundaries

Four PRs, merged in order, none stacked: each branches from `main` after the previous one merges. Each stays under ~20 files / ~800 lines. A through C are the whole backend and need no design input; D waits for the placement addendum.

| PR | Tasks | Contents | Files (approx.) |
|---|---|---|---|
| **A — schema and the shared client** | 1, 10 | Schema + generated migration (4 new objects), `src/lib/model/client.ts` + `allowance.ts` and tests, schema shape test, `ANTHROPIC_API_KEY` docs. | ~12 |
| **B — the pure core** | 2 (the keys pure code and server refusals read), 5 step 3 (`limits.ts`), 6, 7, 8, 9, 11 steps 1–2 (`reaper.ts`), 12 steps 1–2 (`gate.ts`) | `src/lib/tuning/*` and tests, the copy keys they read, `src/lib/profile/play.ts` + the `play` key on `types.ts` (ownership of that one file sequenced by the orchestrator). No database, no route. | ~20 |
| **C — the server shell** | 3 step 6, 5 (action + seeding), 11 (actions + probe), 12 (read + `readTuningPanel`), 13 (action), 15 (actions), 17 | `tuning-actions.ts`, `tuning-read.ts`, `DeckDetail.intent`, `fillDeck` seeding, the copy keys a server refusal returns, `probe:tuning-run`, `check:tuning` + workflow step. Callable end to end from a probe; nothing mounted. | ~16 |
| **D — the surfaces** | 2 (the keys only a component draws), 5 (component), 13 (component), 14, 15 (component), 16, 18 | **BLOCKED ON DESIGN — placement addendum.** Four components and tests, the mount, `maxDuration`. | ~14 |

The About entry is not in D: this is a multi-round line, and its entries batch at the end of the launch (`AGENTS.md`, *Design pipeline*). The line's plan names that task; D's close-out confirms it is still named.

---

## Cost

**Calls per run.** One model run per press. That run makes **one HTTP request normally, two at most** — the second only after a `429`/`529`/`5xx` or a reply that fails the schema. A timeout is not retried. A refusal at the gate (unchanged inputs, run in flight, allowance spent) makes **zero**.

**Worst case per player per day.** `MODEL_DAILY_ALLOWANCE` runs, across tuning and the synopsis together, so at most `2 × MODEL_DAILY_ALLOWANCE` HTTP requests. The allowance is the only thing bounding spend: the fingerprint gate stops a repeat on unchanged inputs, but a player editing one card between presses changes the fingerprint each time, and without the allowance nothing else stops them.

**Per-call size, to measure rather than assert.** The pack carries ~100 card rows (name, type line, roles), up to the skeleton's staples, the role and land targets, the games with their notes, and the intent. The first `check:tuning` run in PR C records the request's `usage.input_tokens` / `usage.output_tokens` from the response, and **that figure sets `MODEL_DAILY_ALLOWANCE`**: the constant ships in PR A as a named placeholder (`5`) with a comment pointing here, and PR C's description states the measured tokens and the value chosen. The run count is what a player sees; the token figure is what makes it a budget.

---

### Task 1: Schema and migration

**PR A.**

> **Partly shipped 2026-09-13.** `deckGames.note` and its length check are in
> `src/db/schema.ts` already (`:578`), applied by `drizzle/0029_slow_whiplash.sql`. Skip
> that column here. The migration this task generates takes the next free number on
> `main` when PR A is cut — 0053 at revision time, unless the `analysis-tab` lane has
> merged one first.

**Files:**
- Modify: `src/db/schema.ts`
- Create: the next generated `drizzle/00NN_*.sql` (generated — do not handwrite)
- Create: `src/db/schema.test.ts` (new — no schema shape test exists today)

**Interfaces:**
- Consumes: nothing.
- Produces: ~~`deckGames.note`~~ (shipped), `decks.intent`, `decks.intentSeeded`, the tables `deckSuggestionRuns` / `deckSuggestionItems` with the column names every later task imports, and `modelCalls`, the shared allowance's ledger (Task 10).

- [ ] **Step 1: Add `uniqueIndex` to the pg-core import**

The pg-core import at `src/db/schema.ts:2-5` carries `unique` and `foreignKey` among others, and no `uniqueIndex`. Add it. `jsonb` is already imported and used with `.$type<>()` — `deckProfiles.profile` is the nearest form to follow.

- [ ] **Step 2: Add the two columns to `decks`**

`deck_games.note` shipped; do not add it. In `decks` (`src/db/schema.ts:272`), add after `notes` (`:281`):

```typescript
  intent: text("intent"),
  // True while the app's seeded sentence stands unedited. The player's first
  // edit flips it false, which is what tells the chip whether to say "seeded".
  intentSeeded: boolean("intent_seeded").notNull().default(false),
```

`decks` already has a config array (it carries the `declaredBracket` check). Add to it:

```typescript
  check("decks_intent_length_check", sql`${t.intent} is null or char_length(${t.intent}) <= 120`),
```

- [ ] **Step 3: Add the runs table**

```typescript
export const deckSuggestionRuns = pgTable("deck_suggestion_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  deckId: uuid("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  inputFingerprint: text("input_fingerprint").notNull(),
  model: text("model").notNull(),
  promptVersion: integer("prompt_version").notNull(),
  status: text("status").notNull(),
  errorClass: text("error_class"),
  droppedCount: integer("dropped_count").notNull().default(0),
}, (t) => [
  check(
    "deck_suggestion_runs_status_check",
    sql`${t.status} in ('pending', 'ok', 'failed', 'cancelled')`,
  ),
  check(
    "deck_suggestion_runs_error_class_check",
    sql`${t.errorClass} is null or ${t.errorClass} in ('upstream_busy', 'timeout', 'malformed', 'ungrounded', 'interrupted')`,
  ),
  // The constraint that makes a second concurrent run impossible. Partial, on
  // 'pending' only — a deck may accumulate any number of finished runs.
  // The predicate is written as raw SQL, not as `${t.status}`. Drizzle renders a
  // column reference table-qualified, and Postgres rejects a qualified name in
  // an index predicate.
  uniqueIndex("deck_suggestion_runs_one_pending_idx")
    .on(t.deckId)
    .where(sql`status = 'pending'`),
  index("deck_suggestion_runs_deck_created_idx").on(t.deckId, t.createdAt),
  index("deck_suggestion_runs_user_created_idx").on(t.userId, t.createdAt),
]);
```

The `.where()` clause on a unique index is new to this file — no partial index exists in it today. The generated SQL must read `create unique index ... on "deck_suggestion_runs" ("deck_id") where "status" = 'pending';`. Verify that in Step 6.

- [ ] **Step 4: Add the items table**

```typescript
export type TuningCitation = {
  kind: "games" | "note" | "decklist" | "intent";
  /** Rendered by the card. Never a percentage, never a net figure. */
  value: string;
};

export const deckSuggestionItems = pgTable("deck_suggestion_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").notNull().references(() => deckSuggestionRuns.id, { onDelete: "cascade" }),
  // uuid, not text — cards.oracleId is uuid("oracle_id") at src/db/schema.ts:25
  // and Postgres rejects a text→uuid foreign key. Matches deckCards.oracleId.
  addOracleId: uuid("add_oracle_id").notNull().references(() => cards.oracleId),
  cutOracleId: uuid("cut_oracle_id").references(() => cards.oracleId),
  rationale: text("rationale").notNull(),
  rationaleShort: text("rationale_short").notNull(),
  evidence: jsonb("evidence").$type<TuningCitation[]>().notNull(),
  position: integer("position").notNull(),
  verdict: text("verdict").notNull().default("pending"),
  verdictAt: timestamp("verdict_at"),
}, (t) => [
  check(
    "deck_suggestion_items_verdict_check",
    sql`${t.verdict} in ('pending', 'accepted', 'dismissed')`,
  ),
  index("deck_suggestion_items_run_position_idx").on(t.runId, t.position),
]);
```

`addOracleId` referencing `cards.oracleId` is the second load-bearing constraint: a suggestion for a card that is not in the catalog cannot be stored at all.

- [ ] **Step 4b: Add the allowance ledger**

Feature-neutral, because the synopsis spends the same allowance (Task 10). One row per model run, never per HTTP attempt.

```typescript
export const modelCalls = pgTable("model_calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  feature: text("feature").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  check("model_calls_feature_check", sql`${t.feature} in ('tuning', 'synopsis')`),
  // The allowance's only query: this player's calls inside the window.
  index("model_calls_user_created_idx").on(t.userId, t.createdAt),
]);
```

No foreign key to a run: a synopsis has no run table in this plan, and the ledger must not need one to count.

- [ ] **Step 5: Write the schema shape test**

```typescript
// src/db/schema.test.ts
import { describe, expect, it } from "vitest";
import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { deckSuggestionRuns, deckSuggestionItems, deckGames, decks, modelCalls } from "./schema";

describe("tuning schema", () => {
  it("keeps the game note singular and separate from decks.notes", () => {
    const game = getTableConfig(deckGames).columns.map((c) => c.name);
    const deck = getTableConfig(decks).columns.map((c) => c.name);
    expect(game).toContain("note");
    expect(game).not.toContain("notes");
    expect(deck).toContain("notes");
    expect(deck).toContain("intent");
    expect(deck).toContain("intent_seeded");
  });

  it("has exactly one partial unique index, on pending runs", () => {
    const config = getTableConfig(deckSuggestionRuns);
    const unique = config.indexes.filter((i) => i.config.unique);
    expect(unique).toHaveLength(1);
    expect(unique[0].config.name).toBe("deck_suggestion_runs_one_pending_idx");
    expect(unique[0].config.where).toBeDefined();
  });

  it("ties both of an item's card columns to the catalog", () => {
    // Counting the foreign keys proves nothing about which columns carry them.
    // Name the pairs: this is the constraint that makes the uuid column type
    // load-bearing, and a text column would fail to generate against it.
    const fks = getTableConfig(deckSuggestionItems).foreignKeys;
    const pairs = fks.map((fk) => {
      const ref = fk.reference();
      return `${ref.columns[0].name}->${getTableName(ref.foreignTable)}.${ref.foreignColumns[0].name}`;
    });
    expect(pairs).toContain("add_oracle_id->cards.oracle_id");
    expect(pairs).toContain("cut_oracle_id->cards.oracle_id");
    expect(pairs).toContain("run_id->deck_suggestion_runs.id");
  });

  it("indexes the allowance ledger on the one query it answers", () => {
    const idx = getTableConfig(modelCalls).indexes.map((i) => i.config.name);
    expect(idx).toContain("model_calls_user_created_idx");
  });
});
```

- [ ] **Step 6: Run the test and generate the migration**

```bash
pnpm test src/db/schema.test.ts
pnpm db:generate
```

Expected: four passing tests, and one new generated `drizzle/00NN_*.sql` at the next free number on `main` (`git fetch` first; 0053 at revision time). Commit the journal and snapshot Drizzle writes beside it. Open it and confirm the partial index line carries `where "status" = 'pending'`. If Drizzle emitted an unconditional unique index, the `.where()` in Step 3 is wrong — fix it and regenerate rather than editing the SQL by hand.

- [ ] **Step 7: Commit**

```bash
git add src/db/schema.ts src/db/schema.test.ts drizzle/
git commit -m "feat(tuning): schema for deck intent, suggestion runs, and the model allowance ledger"
```

---

### Task 2: Copy module

> **Partly shipped 2026-09-13.** `src/lib/copy/deck-tuning.ts` exists and holds
> the `note` section only — the rest of the sections below arrive with the
> surfaces that draw them, so a copy pass never reads a string nothing renders.

**Split across PRs by that same rule.** PR B adds the keys pure code or a server refusal
returns — `panel.generating`, `panel.unchanged`, `panel.refused`, `allowance`, `failure`,
`suggestionRules`. PR D adds the keys only a component draws. Each batch goes through
`/copy-review` in its own PR.

**Files:**
- Modify: `src/lib/copy/deck-tuning.ts`, `src/lib/copy/deck-tuning.test.ts` (both exist)

**Interfaces:**
- Consumes: `axisCopy` from `src/lib/copy/game-log.ts`. Not `PATTERN_MIN`: nothing in this feature gates on a game count.
- Produces: `deckTuningCopy`, `manifestCopy`, and the re-exported `axisCopy`. Every component and action imports its strings from here and defines none of its own.

- [ ] **Step 1: Write the guard test first**

The value of this test is not that the strings exist — it is that the presentation rules hold across the whole file at once, so a later string added by hand cannot quietly break them.

```typescript
// src/lib/copy/deck-tuning.test.ts
import { describe, expect, it } from "vitest";
import { deckTuningCopy, manifestCopy, axisCopy } from "./deck-tuning";
import { gameLogCopy } from "./game-log";

// Functions are included by their source, not skipped. Most of this file's
// copy is interpolated — `counter(n, max)`, `unchanged(at)` — so a helper that
// walked only the literals would leave the computed strings, the ones most
// likely to reach for a percentage, entirely unguarded.
function allStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function") return [value.toString()];
  if (value && typeof value === "object") return Object.values(value).flatMap(allStrings);
  return [];
}

describe("deck tuning copy", () => {
  it("re-exports the game log's vocabulary rather than redefining it", () => {
    expect(axisCopy.mana).toBeDefined();
  });

  it("carries no below-threshold copy, because nothing gates on a game count", () => {
    expect(Object.keys(deckTuningCopy.panel).filter((k) => k.startsWith("belowThreshold"))).toEqual([]);
  });

  it("never writes a percentage", () => {
    for (const s of allStrings(deckTuningCopy).concat(allStrings(manifestCopy))) {
      expect(s).not.toMatch(/%|percent/i);
    }
  });

  it("amends the game log's optional-note line rather than replacing it", () => {
    expect(gameLogCopy.form.optionalNote).toBe(
      "marks are optional — a result on its own is a game",
    );
    expect(deckTuningCopy.note.optionalNote).not.toBe(gameLogCopy.form.optionalNote);
  });

  it("caps a note at 140 and an intent at 120, and seeds inside the cap", () => {
    expect(deckTuningCopy.note.maxLength).toBe(140);
    expect(deckTuningCopy.note.warnAt).toBe(130);
    expect(deckTuningCopy.intent.maxLength).toBe(120);
    expect(deckTuningCopy.intent.seeded.length).toBeLessThanOrEqual(120);
  });

  it("has a failure object for all five classes", () => {
    for (const k of ["unavailable", "timedOut", "unusable", "nothingHeldUp", "interrupted"]) {
      expect(deckTuningCopy.failure[k as keyof typeof deckTuningCopy.failure]).toBeDefined();
    }
  });

  it("carries a denominator on every counted line", () => {
    expect(deckTuningCopy.panel.results(2, 3)).toContain("of 3");
    expect(deckTuningCopy.card.consequenceOwned(99, "Complete")).toContain("of 99");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
pnpm test src/lib/copy/deck-tuning.test.ts
```

Expected: FAIL — the module exports only `countCharacters` and the `note` section today.

- [ ] **Step 3: Write the copy module**

Transcribe every key from the **Copy keys** section of `docs/superpowers/design-tables/deck-tuning.md` verbatim — that section is the source of truth for the text, and this task is transcription, not authorship. The module's shape:

```typescript
// src/lib/copy/deck-tuning.ts
// Every string the tuning surfaces render. Transcribed from the design table's
// copy-keys section; the wording there wins over anything drawn on a canvas.
export { axisCopy } from "./game-log";

export const manifestCopy = {
  games: { what: "games logged", count: (n: number) => `${n} games`, countOne: "1 game" },
  // ... notes, decklist, collection, intent, progress, collapsed
} as const;

export const deckTuningCopy = {
  // No belowThreshold* keys: the game gate is gone (2026-09-20 ruling). `ready*` must
  // read truthfully at zero games — the addendum redraws it (Task 14).
  // `refused` is the one refusal no gate names: a deck the reader cannot open.
  panel: { /* heading, ready*, generating*, stop, results*, again*, tally*, unchanged*, refused */ },
  // The shared allowance's exhausted state. Not drawn by the tuning handoff, and
  // visible in normal use, unlike the hourly ceiling it replaces — so eng writes a
  // placeholder in the panel's register for PR B and the placement addendum returns
  // the drawn wording, with the synopsis's surface in view, since both show it.
  allowance: { /* spent(reopensAt: Date), remaining(n, of) */ },
  failure: {
    retry: "Try again",
    unavailable: { /* tag, body, kept, note */ },
    timedOut: { /* tag, body, bodyFor, kept, keptNone, note */ },
    unusable: { /* tag, body, kept, note */ },
    nothingHeldUp: { /* tag, body, kept, note */ },
    // The fifth class. The reaper writes it; the run never does. A player who
    // closed the tab mid-run sees this on return, not a failure.
    interrupted: { /* tag, body, kept, note */ },
  },
  card: { /* cut, add, added, owned, notOwned, price, cite*, consequence*, apply*, dismiss*, undo, restore, *Refused */ },
  intent: { /* askLabel, ask, placeholder, save, skip, edit, editAria, seeded, seededAria, maxLength: 120 */ },
  // Shipped. Also carries `hintShort` (the phone's gloss) and the `readBack`
  // pair (the desktop line under the field), neither of which this sketch had.
  note: { /* label, hint, hintShort, counter, maxLength: 140, warnAt: 130, optionalNote, ariaDescription, readBack, readBackEmphasis */ },
  suggestionRules: { /* the nine static rules — see Task 7 */ },
  announce: { /* started, ready, readyOne, unchanged, stopped, failed, applied, undone, dismissed, intentSaved */ },
} as const;
```

`card.price` is a pass-through taking an already-formatted string: `price: (amount: string) => amount`. It must never format cents itself — `formatCents` at `src/lib/decks/price.ts:111-116` is the only formatter in this codebase.

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm test src/lib/copy/deck-tuning.test.ts
```

Expected: PASS, the shipped `note` tests plus these.

- [ ] **Step 5: Commit**

```bash
git add src/lib/copy/deck-tuning.ts src/lib/copy/deck-tuning.test.ts
git commit -m "feat(tuning): copy module for the tuning panel, cards, note, and intent"
```

---

### Task 3: The game note — read and write path

> **The note half shipped 2026-09-13.** `DeckGame.note` is read by
> `listDeckGames`, and `logGame` accepts a `note`: trimmed, blank stored as
> null, and refused rather than truncated past the cap — counted as the column
> counts, in code points. Steps 1–5 are done. **Step 6 is not**: it projects
> `decks.intent` onto `DeckDetail` and belongs to the intent work, not the note.

**Files:** ~~`src/lib/decks/games.ts`, `src/app/decks/actions.ts` (`logGame`),
`src/lib/decks/games.test.ts`, `src/app/decks/actions.test.ts`~~ — shipped. Step
6 still modifies `src/lib/decks/read.ts`.

**Interfaces:** ~~`DeckGame.note`, populated by `listDeckGames`; `logGame`
accepting a `note`~~ — shipped. Task 7's evidence pack still has to read it, and
step 6 still owes `DeckDetail.intent`.

- [x] ~~**Step 1: Write the failing tests**~~ — shipped

```typescript
// src/lib/decks/games.test.ts — add to the existing file
import { describe, expect, it } from "vitest";
import { summarizeGames, type DeckGame } from "./games";

const game = (over: Partial<DeckGame> = {}): DeckGame => ({
  id: "g1", result: "loss", podSize: 4, playedAt: new Date("2026-09-01"),
  worked: [], hurt: [], note: null, ...over,
});

describe("game notes", () => {
  it("summarizes games that carry notes without counting them as marks", () => {
    const s = summarizeGames([game({ note: "flooded out on turn six" })]);
    expect(s.count).toBe(1);
    expect(s.marked).toBe(0);
  });
});
```

The point of the second assertion: a note is not a mark. `marked` is the numerator in "Marked in 3 of 5 games" and adding notes to it would make that line lie.

- [x] ~~**Step 2: Run it to verify it fails**~~ — shipped

```bash
pnpm test src/lib/decks/games.test.ts
```

Expected: FAIL — `note` is not a property of `DeckGame`.

- [x] ~~**Step 3: Add `note` to the type and the read**~~ — shipped

In `src/lib/decks/games.ts`, add to `DeckGame`:

```typescript
  /** Free text the player wrote about this game. Never rendered as a mark. */
  note: string | null;
```

In `listDeckGames`, add `note: deckGames.note` to the first select's projection, and `note: row.note` to the returned map at the end. The second query (the marks join) is untouched.

- [x] ~~**Step 4: Run the test to verify it passes**~~ — shipped

```bash
pnpm test src/lib/decks/games.test.ts
```

Expected: PASS.

- [x] ~~**Step 5: Accept the note in `logGame`**~~ — shipped

`logGame` is **not** a form action. Its signature is `logGame(deckId: string, input: LogGameInput)` (`src/app/decks/actions.ts:1264`), `LogGameInput` is declared at `:822`, and `game-log-form.tsx:199` calls it directly with an object. Do not reach for `FormData` here.

Add to `LogGameInput`:

```typescript
  note?: string;
```

and validate it in the same inline style the action already uses (lines 861-889 — no zod), remembering the action's own comment that "a server action is a public endpoint, so the input's declared type is a claim and not a guarantee":

```typescript
  // As shipped. A non-string is REFUSED rather than read as an empty note: the
  // signature is a claim, and quietly dropping a crafted value hides it.
  if (input.note !== undefined && typeof input.note !== "string") return refuse;
  const note = input.note?.trim() ?? "";
  // Code points, not `.length` — the column's check counts the way Postgres
  // `char_length` does, and `.length` would refuse 71 emoji as 142 characters.
  if (countCharacters(note) > deckTuningCopy.note.maxLength) return refuse;
```

`refuse` is the existing local at line 855. Pass `note: note.length > 0 ? note : null` in the `deckGames` insert. A blank note stores null, not an empty string — so "has a note" is one predicate everywhere.

- [ ] **Step 6: Project the intent onto `DeckDetail`**

**PR C.** The intent control (Task 5, PR D) reads `detail.intent`, and `getDeckDetail` (`src/lib/decks/read.ts:219`) does not select it today. `runTuning` does not go through `DeckDetail` — it reads the one column itself (Task 11) — so this step exists for the surface. Add both columns to the `decks` select and to the `DeckDetail` type at `:168`:

```typescript
  intent: string | null;
  intentSeeded: boolean;
```

- [ ] **Step 7: Run the full suite and commit**

```bash
pnpm test && pnpm typecheck
git add src/lib/decks/games.ts src/lib/decks/games.test.ts src/lib/decks/read.ts src/app/decks/actions.ts
git commit -m "feat(tuning): carry a per-game note and the deck intent through the reads"
```

---

### Task 4: The note field and the history row

> **Shipped 2026-09-13**, both halves — the History row to S2's rows and the
> form's note field to S1 states 1–8, measured by `scripts/probe-game-note.mjs`.
> One errata on the explanatory line; see the design table.

**Files:** ~~all shipped~~ — `src/components/decks/game-log-form.tsx`,
`src/components/decks/game-history-row.tsx`, and both their tests.

**Interfaces:** ~~all shipped~~. The form posts `note`; the row renders it.

**Design table rows satisfied:** ~~S1 states 1–8 and S2~~, both measured by
`scripts/probe-game-note.mjs`, including the 48px / 46px tap-target floor.

- [x] ~~**Step 1: Write the failing component tests**~~ — shipped

```typescript
// src/components/decks/game-log-form.test.tsx — add inside the existing
// `describe("GameLogForm")`. The file already mocks the actions module and
// already owns two helpers: `mount()`, which renders with the component's real
// required props (deckId, isFirstGame, onSaved, onAnnounce), and `open()`,
// which clicks the collapsed CTA. Reuse both. Do not add a second `vi.mock`
// and do not call `render` directly — GameLogForm has no injectable action and
// no `onDone` prop, so a bespoke render will not typecheck.
// CORRECTED, as shipped: the counter appears on focus or content (states 1-2)
// and 130 is where it turns --warning, not where it arrives.
it("shows the counter once the field is touched, and warns at the cap", () => {
  mount();
  open();
  const note = screen.getByLabelText(deckTuningCopy.note.label);
  expect(screen.queryByText(/\/ 140/)).not.toBeInTheDocument();
  fireEvent.focus(note);
  expect(screen.getByText(deckTuningCopy.note.counter("0", "140"))).toBeInTheDocument();
  fireEvent.change(note, { target: { value: "a".repeat(130) } });
  expect(screen.getByText(deckTuningCopy.note.counter("130", "140"))).toHaveClass("text-warning");
});

it("keeps what was typed when the save is refused", async () => {
  logGame.mockResolvedValueOnce({ ok: false, message: "no" });
  mount();
  open();
  const note = screen.getByLabelText(deckTuningCopy.note.label);
  fireEvent.change(note, { target: { value: "flooded out" } });
  fireEvent.click(screen.getByRole("radio", { name: gameLogCopy.form.won }));
  fireEvent.click(save());
  await waitFor(() => expect(screen.getByText("no")).toBeInTheDocument());
  expect(note).toHaveValue("flooded out");
});
```

```typescript
// src/components/decks/game-history-row.test.tsx — add
// GameHistoryRow's required props are deckId, isLast, and onDeleted
// (game-history-row.tsx:37) — omitting them will not typecheck.
const rowProps = { deckId: "d1", isLast: false, onDeleted: () => {} };

it("renders the note when there is one and nothing when there is not", () => {
  const { rerender } = render(<GameHistoryRow {...rowProps} game={{ ...base, note: null }} />);
  expect(screen.queryByText(/flooded/)).not.toBeInTheDocument();
  rerender(<GameHistoryRow {...rowProps} game={{ ...base, note: "flooded out" }} />);
  expect(screen.getByText("flooded out")).toBeInTheDocument();
});
```

- [x] ~~**Step 2: Run them to verify they fail**~~ — shipped

```bash
pnpm test src/components/decks/game-log-form.test.tsx src/components/decks/game-history-row.test.tsx
```

Expected: FAIL — no element with the note label.

- [x] ~~**Step 3: Add the field to the form**~~ — shipped

**As shipped, and this paragraph is corrected — it described two things the design table does not.** An `<input>`, never a `<textarea>`: the table says so outright, and one line is the whole promise. `maxLength={deckTuningCopy.note.maxLength}`, labelled by `deckTuningCopy.note.label`, described by `deckTuningCopy.note.ariaDescription`, hinted with `deckTuningCopy.note.hint` (and `hintShort` below `md:`, where the full gloss pushes the counter onto a second line).

The counter appears **on focus or content** — S1 states 1 and 2 — not at `warnAt`. It turns `--warning` at `warnAt` and stops at the cap with no error. This plan originally held the counter back until 130 to spare a screen reader a live count on every keystroke; the field solves that instead by naming the counter through `aria-describedby` rather than making it a live region, so it is read on demand and never announced.

Amend the existing optional-note line to `deckTuningCopy.note.optionalNote`; do not change `gameLogCopy.form.optionalNote` itself, which other tests assert on.

- [x] ~~**Step 4: Add the note to the history row**~~ — shipped

Render `game.note` when non-null, as the row's own line beneath the marks. Never truncate with an ellipsis in the DOM — the cap is 140 characters and the row can hold it.

- [x] ~~**Step 5: Run the tests to verify they pass, then commit**~~ — shipped

```bash
pnpm test src/components/decks
git add src/components/decks/game-log-form.tsx src/components/decks/game-log-form.test.tsx src/components/decks/game-history-row.tsx src/components/decks/game-history-row.test.tsx
git commit -m "feat(tuning): note field on the game log form and on the history row"
```

---

### Task 5: Deck intent

**Split.** Step 3's `limits.ts` ships in **PR B** (the pure core reads it). Steps 1–3's action and step 6's seeding ship in **PR C**. Steps 4–5, the component, ship in **PR D** and are **BLOCKED ON DESIGN** only as far as where the chip sits; its four states are drawn.

**Files:**
- Create: `src/components/decks/deck-intent.tsx` (PR D)
- Modify: `src/app/decks/tuning-actions.ts` (create the file here, with `saveDeckIntent` as its first action)
- Test: `src/components/decks/deck-intent.test.tsx` (PR D)

**Interfaces:**
- Consumes: `decks.intent` / `decks.intentSeeded` from Task 1; `deckTuningCopy.intent` from Task 2.
- Produces: `saveDeckIntent(deckId: string, formData: FormData): Promise<DeckMutationResult>`, and the `DeckIntent` component. The evidence pack (Task 7) takes the intent `runTuning` reads.

**Design table rows to satisfy:** S3 states 1–4 plus the chip-removed transition.

- [ ] **Step 1: Write the failing action test**

```typescript
// src/app/decks/tuning-actions.test.ts
import { describe, expect, it } from "vitest";
import { intentRefusal } from "../../lib/tuning/limits";

describe("intent length", () => {
  it("refuses an intent over the cap and accepts one at it", () => {
    expect(intentRefusal("a".repeat(121))).not.toBeNull();
    expect(intentRefusal("a".repeat(120))).toBeNull();
    expect(intentRefusal("")).toBeNull();
  });
});
```

The predicate lives in `limits.ts` rather than in the action so it is testable without a database — the action is then a thin caller of it.

- [ ] **Step 2: Run it to verify it fails**

```bash
pnpm test src/app/decks/tuning-actions.test.ts
```

Expected: FAIL — `intentRefusal` is not exported.

- [ ] **Step 3: Write the predicate and the action**

```typescript
// src/lib/tuning/limits.ts
import { deckTuningCopy } from "../copy/deck-tuning";
import { gameLogCopy } from "../copy/game-log";

export const MAX_SUGGESTIONS = 3;
export const REAPER_CUTOFF_MS = 5 * 60 * 1000;
export const MODEL_TIMEOUT_MS = 90_000;
// The current Sonnet. Recorded per run in deck_suggestion_runs.model; the shared
// client names no model of its own. No hourly ceiling here — the per-player daily
// allowance lives in src/lib/model/allowance.ts and is shared with the synopsis.
export const TUNING_MODEL = "claude-sonnet-5";
export const TUNING_MAX_TOKENS = 2_000;

export function intentRefusal(intent: string): string | null {
  // The shipped form refusal, not a tuning-specific string — this is a form
  // rejecting what was typed, which is the case gameLogCopy.form.refused names.
  return intent.length > deckTuningCopy.intent.maxLength ? gameLogCopy.form.refused : null;
}
```

```typescript
// src/app/decks/tuning-actions.ts
"use server";

export async function saveDeckIntent(deckId: string, formData: FormData): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  const raw = formData.get("intent");
  const intent = typeof raw === "string" ? raw.trim() : "";
  const refusal = intentRefusal(intent);
  if (refusal) return { ok: false, message: refusal };

  const updated = await db
    .update(decks)
    .set({ intent: intent.length > 0 ? intent : null, intentSeeded: false })
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
    .returning({ id: decks.id });
  if (updated.length === 0) return { ok: false, message: gameLogCopy.form.refused };

  for (const path of deckSurfaces(deckId)) revalidatePath(path);
  return { ok: true };
}
```

`intentSeeded: false` on every save is the whole provenance rule: the app writes `true` when it seeds, and the player's first edit — which is the only thing that calls this action — flips it false. That single column covers both the seeded state and the edited state.

- [ ] **Step 4: Write the failing component test**

```typescript
// src/components/decks/deck-intent.test.tsx
it("offers the ask below the chip when there is no intent", () => {
  render(<DeckIntent deckId="d1" intent={null} seeded={false} axis="mana" count={4} />);
  expect(screen.getByText(deckTuningCopy.intent.ask("Mana", 4))).toBeInTheDocument();
});

it("marks an app-seeded intent as seeded and drops the mark once edited", () => {
  const { rerender } = render(<DeckIntent deckId="d1" intent="go wide" seeded />);
  expect(screen.getByLabelText(deckTuningCopy.intent.seededAria)).toBeInTheDocument();
  rerender(<DeckIntent deckId="d1" intent="go wide" seeded={false} />);
  expect(screen.queryByLabelText(deckTuningCopy.intent.seededAria)).not.toBeInTheDocument();
});

it("keeps the typed intent when the save is refused", async () => {
  render(<DeckIntent deckId="d1" intent={null} seeded={false} action={async () => ({ ok: false, message: "no" })} />);
  await userEvent.click(screen.getByRole("button", { name: deckTuningCopy.intent.askLabel }));
  const field = screen.getByPlaceholderText(deckTuningCopy.intent.placeholder);
  await userEvent.type(field, "go wide");
  await userEvent.click(screen.getByRole("button", { name: deckTuningCopy.intent.save }));
  expect(field).toHaveValue("go wide");
});
```

- [ ] **Step 5: Build the component to satisfy those tests and the S3 table rows**

Four states: no intent (the ask), an intent as a chip, the chip in edit, and a seeded chip. `maxLength={deckTuningCopy.intent.maxLength}` on the field. The component stays mounted through the pending save — a chip that vanishes and returns is the mid-write unmount the global constraints forbid. `Skip` dismisses the ask for the visit without writing anything.

- [ ] **Step 6: Seed the intent where the app builds a deck**

Without a writer of `intentSeeded: true`, state 4 is dead code — nothing else in the plan ever sets it. `fillDeck` (`src/app/decks/actions.ts:660`) is the app building a deck on the player's behalf, so it is the seeder. Inside its existing transaction, when `decks.intent` is null, write a one-line intent drawn from the commander and the mix the fill chose, with `intentSeeded: true`.

```typescript
if (deck.intent === null) {
  await tx.update(decks)
    .set({ intent: seededIntent(commanderName), intentSeeded: true })
    .where(eq(decks.id, deckId));
}
```

`seededIntent` lives in `src/lib/tuning/limits.ts` beside `intentRefusal` so the two caps are enforced in one place, and it must return a string of at most `deckTuningCopy.intent.maxLength` characters. Test it at the boundary with the longest commander name in the catalog, not with a short one.

Only fill seeds. A deck the player built card by card has no app-authored intent to disclose, and inventing one would put words in their mouth — which is exactly what the seeded chip exists to be honest about.

- [ ] **Step 7: Run the tests and commit**

```bash
pnpm test src/components/decks/deck-intent.test.tsx src/app/decks/tuning-actions.test.ts
git add src/lib/tuning/limits.ts src/app/decks/actions.ts src/app/decks/tuning-actions.ts src/app/decks/tuning-actions.test.ts src/components/decks/deck-intent.tsx src/components/decks/deck-intent.test.tsx
git commit -m "feat(tuning): deck intent — ask, chip, edit, and seeded provenance"
```

---

### Task 6: Fingerprint

**PR B.**

**Files:**
- Create: `src/lib/tuning/prompt-version.ts`, `src/lib/tuning/fingerprint.ts`
- Test: `src/lib/tuning/fingerprint.test.ts`

**Interfaces:**
- Consumes: `profileFingerprint` (`src/lib/profile/fingerprint.ts:32`) — the deck half is ITS hash, not a second one; `ProfilePlay` (Task 7).
- Produces:
  ```typescript
  export const PROMPT_VERSION = 1;
  export type FingerprintInput = {
    /** `profileFingerprint(head)` — the deck's cards and both commanders, under PROFILE_VERSION. */
    profile: string;
    games: { id: string; result: string; podSize: number; worked: string[]; hurt: string[]; note: string | null }[];
    intent: string | null;
  };
  export function tuningFingerprint(input: FingerprintInput): string;
  ```

**Why it layers rather than duplicates.** The profile fingerprint already answers "have the deck's cards or commanders moved", and it already carries `PROFILE_VERSION`, so a change to how the profile characterizes a deck unlocks a regeneration too. Hashing the decklist a second time here would be a second definition of "the deck changed" that could disagree with the first — `profileFingerprint` deliberately leaves out `auto`, `deck_proxies` and `declared_bracket`, and a private copy that included any of them would unlock a run the profile says is unchanged. The tuning fingerprint adds exactly what the profile excludes by design and the model reads: the games, their notes, the intent, and `PROMPT_VERSION`.

The catalog generation is out, as it is from the profile's: a weekly refresh that moves the staples list does not unlock a regeneration on its own. That is a deliberate trade — the gate exists so a press with nothing new to say is not paid for — and the next deck edit or game picks the new staples up.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/tuning/fingerprint.test.ts
import { describe, expect, it } from "vitest";
import { tuningFingerprint, type FingerprintInput } from "./fingerprint";

const base: FingerprintInput = {
  profile: "p1",
  games: [{ id: "g1", result: "loss", podSize: 4, worked: [], hurt: ["mana"], note: null }],
  intent: null,
};

describe("tuningFingerprint", () => {
  it("ignores the order games arrive in, and the order of their marks", () => {
    const two = { ...base, games: [...base.games, { ...base.games[0], id: "g2", hurt: ["tempo", "mana"] }] };
    const shuffled = { ...two, games: [...two.games].reverse().map((g) => ({ ...g, hurt: [...g.hurt].reverse() })) };
    expect(tuningFingerprint(shuffled)).toBe(tuningFingerprint(two));
  });

  it("changes when the deck's profile fingerprint changes", () => {
    expect(tuningFingerprint({ ...base, profile: "p2" })).not.toBe(tuningFingerprint(base));
  });

  it("changes when a game is added, when a note is written, and when the intent changes", () => {
    expect(tuningFingerprint({ ...base, games: [...base.games, { ...base.games[0], id: "g2" }] }))
      .not.toBe(tuningFingerprint(base));
    expect(tuningFingerprint({ ...base, games: [{ ...base.games[0], note: "flooded" }] }))
      .not.toBe(tuningFingerprint(base));
    expect(tuningFingerprint({ ...base, intent: "go wide" })).not.toBe(tuningFingerprint(base));
  });

  it("fingerprints a deck with no games", () => {
    // No gate: a deck built tonight is a legitimate input, and its hash must be stable.
    const none = { ...base, games: [] };
    expect(tuningFingerprint(none)).toBe(tuningFingerprint(none));
    expect(tuningFingerprint(none)).not.toBe(tuningFingerprint(base));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
pnpm test src/lib/tuning/fingerprint.test.ts
```

Expected: FAIL — cannot resolve `./fingerprint`.

- [ ] **Step 3: Implement**

```typescript
// src/lib/tuning/prompt-version.ts
// Bumping this invalidates every stored tuning fingerprint, so every deck becomes
// eligible for a fresh run. That is the intended way to ship a prompt change.
// (PROFILE_VERSION in src/lib/profile/version.ts cites this file as its precedent.)
export const PROMPT_VERSION = 1;
```

```typescript
// src/lib/tuning/fingerprint.ts
// SERVER-ONLY: node:crypto, as src/lib/profile/fingerprint.ts.
import { createHash } from "node:crypto";
import { PROMPT_VERSION } from "./prompt-version";

export function tuningFingerprint(input: FingerprintInput): string {
  const games = [...input.games]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((g) => [
      g.id, g.result, g.podSize,
      [...g.worked].sort().join(","), [...g.hurt].sort().join(","),
      g.note ?? "",
    ].join("|"));

  return createHash("sha256")
    .update(JSON.stringify({ v: PROMPT_VERSION, profile: input.profile, games, intent: input.intent ?? "" }))
    .digest("hex");
}
```

The comparator is the byte order `profileFingerprint` uses rather than `localeCompare`, so the two hashes sort the same way on every runtime.

- [ ] **Step 4: Run the test to verify it passes, then commit**

```bash
pnpm test src/lib/tuning/fingerprint.test.ts
git add src/lib/tuning/prompt-version.ts src/lib/tuning/fingerprint.ts src/lib/tuning/fingerprint.test.ts
git commit -m "feat(tuning): fingerprint layered on the profile's, plus games, notes and intent"
```

---

### Task 7: The play group and the evidence pack

**PR B.**

**Files:**
- Create: `src/lib/profile/play.ts`, `src/lib/tuning/evidence.ts`
- Modify: `src/lib/profile/types.ts` (**shared surface** — one key, ownership sequenced by the orchestrator)
- Test: `src/lib/profile/play.test.ts`, `src/lib/tuning/evidence.test.ts`

**Interfaces:**
- Consumes: `DeckProfile` (`src/lib/profile/types.ts:292`) — `cards`, `commanderOracleIds`, `colours.identity`, `counts`, `roles`, `skeleton` (its `roleTargets`, `composition`, `staples`, `thinCondition`); `recommendedMix(skeleton, hasPartner)` (`src/lib/decks/mix.ts:107`) for the per-role targets and their `advisory` flag; `DeckGame` and `summarizeGames` (`src/lib/decks/games.ts:7`, `:138`).
- Produces:
  ```typescript
  // src/lib/profile/play.ts — pure, client-safe
  export type ProfilePlay = {
    games: { id: string; result: "win" | "loss" | "draw"; podSize: number; playedAt: string; worked: string[]; hurt: string[]; note: string | null }[];
    summary: {
      count: number;
      marked: number;
      record: { wins: number; losses: number; draws: number };
      /** Fix-first. No `net`: it orders, it never travels. */
      axes: { key: string; worked: number; hurt: number }[];
    };
  };
  export function buildPlayGroup(games: DeckGame[]): ProfilePlay;

  // src/lib/tuning/evidence.ts — pure, client-safe
  export type EvidencePack = {
    commanders: { oracleId: string; name: string }[];
    colorIdentity: string[];
    cards: { oracleId: string; name: string; typeLine: string; roles: string[]; quantity: number; owned: boolean; commander: boolean }[];
    targets: {
      roles: { role: string; have: number; target: number; advisory: boolean }[];
      lands: { have: number; target: number } | null;
      /** The skeleton's own honesty flag: targets taken over too few decks. */
      thin: boolean;
    };
    staples: { oracleId: string; name: string; commanders: number; commanderTotal: number; owned: boolean }[];
    play: ProfilePlay;
    intent: string | null;
  };
  export function buildEvidencePack(input: {
    profile: DeckProfile;
    play: ProfilePlay;
    intent: string | null;
    owned: ReadonlySet<string>;
  }): EvidencePack;
  ```

**Why the play group is attached, not cached.** `types.ts:12-14` promises that a later fact group arrives "as sibling keys … and nothing about the loader, the fingerprint or the cache key changes when they do". The profile's fingerprint is over the deck's cards alone, so a play group computed INSIDE `cachedDeckProfile` would be filed under a key a logged game does not move — the cached document would carry last week's games — and moving the key instead would retire the stored analysis (`deck_profiles`) every time a game is logged, for figures no game can change. So `DeckProfile` gains `play?: ProfilePlay | null`, the cached and stored documents never carry it, and a consumer that wants it composes `{ ...profile, play: buildPlayGroup(games) }` at the read. The doc comment on the key says exactly that.

**Ownership is an input, not a group.** The profile has no ownership group yet (`types.ts:12` lists it as a later one). The pack takes the reader's owned oracle ids as a plain set, read once by `runTuning` over the pack's card and staple ids (`collection_items`, scoped by `user_id`). If an ownership group ships first, this input is where it plugs in.

- [ ] **Step 1: Write the failing play-group test**

```typescript
// src/lib/profile/play.test.ts
it("strips net from every axis it carries", () => {
  for (const axis of buildPlayGroup(games).summary.axes) expect(axis).not.toHaveProperty("net");
});

it("orders axes fix-first", () => {
  const { axes } = buildPlayGroup(games);
  const firstHurt = axes.findIndex((a) => a.hurt > a.worked);
  const firstWorked = axes.findIndex((a) => a.worked > a.hurt);
  expect(firstHurt).toBeLessThan(firstWorked);
});

it("is an empty group, not an absent one, at zero games", () => {
  expect(buildPlayGroup([])).toEqual({
    games: [],
    summary: { count: 0, marked: 0, record: { wins: 0, losses: 0, draws: 0 }, axes: [] },
  });
});

it("serializes playedAt as a string, because the profile is JSON-only", () => {
  expect(typeof buildPlayGroup(games).games[0].playedAt).toBe("string");
});
```

- [ ] **Step 2: Write the failing evidence test**

```typescript
// src/lib/tuning/evidence.test.ts
it("excludes staples already in the deck", () => {
  const pack = buildEvidencePack(input);
  const inDeck = new Set(pack.cards.map((c) => c.oracleId));
  for (const s of pack.staples) expect(inDeck.has(s.oracleId)).toBe(false);
});

it("forwards a staple's breadth as a count with its denominator, and no proportion", () => {
  const [staple] = buildEvidencePack(input).staples;
  expect(staple).toHaveProperty("commanders");
  expect(staple).toHaveProperty("commanderTotal");
  expect(staple).not.toHaveProperty("avgInclusion");
  expect(staple).not.toHaveProperty("weightedRank");
});

it("marks the commanders so a cut can never name one", () => {
  const pack = buildEvidencePack(input);
  const commanders = pack.cards.filter((c) => c.commander).map((c) => c.oracleId);
  expect(commanders).toEqual(input.profile.commanderOracleIds);
});

it("takes role targets from recommendedMix, advisory flag included", () => {
  const lands = buildEvidencePack(input).targets.roles.find((r) => r.role === "land");
  expect(lands?.advisory).toBe(true);
});

it("builds a pack with no games", () => {
  const pack = buildEvidencePack({ ...input, play: buildPlayGroup([]) });
  expect(pack.play.summary.count).toBe(0);
});

it("never carries a figure a percentage could be written from", () => {
  expect(JSON.stringify(buildEvidencePack(input))).not.toMatch(/\b0\.\d+\b/);
});
```

Build `input` in the test from plain literals — a hand-written `DeckProfile` fixture. The function takes an already-loaded profile, which is exactly what makes it testable without a database.

- [ ] **Step 3: Run both to verify they fail**

```bash
pnpm test src/lib/profile/play.test.ts src/lib/tuning/evidence.test.ts
```

- [ ] **Step 4: Implement**

`buildPlayGroup` wraps `summarizeGames` and maps `AxisTally` down to `{ key, worked, hurt }` in fix-first order — the model cannot render a figure it was never given. `playedAt` goes out as an ISO date string.

`buildEvidencePack` reads, and never recomputes, what the profile holds:

- **`cards`** is `profile.cards`, each tagged with every role `profile.roles.cards` files it under (a card can hold several) and `commander: true` for `commanderOracleIds`.
- **`targets.roles`** pairs `profile.roles.counts` with `recommendedMix(profile.skeleton, commanderOracleIds.length > 1).cells`, carrying `advisory` through so the prompt can say a gap is a guide and not a gate. `targets.lands` is `counts.land` against `skeleton.composition?.targets.land`, null when the skeleton has no composition. `thin` is `skeleton.thinCondition`.
- **`staples`** is `skeleton.staples` minus every deck card, in the skeleton's own rank order, with `commanders` / `commanderTotal` forwarded and the ranking figures dropped.
- **`play`** and **`intent`** pass through.

Nothing in the pack is a bracket figure (see *Global Constraints*).

- [ ] **Step 5: Add the key to `DeckProfile`**

```typescript
  /**
   * The play-data group. NEVER present in the cached or stored document: the fingerprint is
   * over the deck's cards, so a group filed under it would go stale on the next logged game.
   * A consumer composes it at the read — `{ ...profile, play: buildPlayGroup(games) }`.
   */
  play?: ProfilePlay | null;
```

Optional, so `buildDeckProfile`, the stored rows and every existing consumer compile unchanged. Ask the orchestrator for this file before the PR opens.

- [ ] **Step 6: Run the tests and commit**

```bash
pnpm test src/lib/profile/play.test.ts src/lib/tuning/evidence.test.ts
git add src/lib/profile/play.ts src/lib/profile/play.test.ts src/lib/profile/types.ts src/lib/tuning/evidence.ts src/lib/tuning/evidence.test.ts
git commit -m "feat(tuning): the play-data profile group and an evidence pack read from the profile"
```

---

### Task 8: Prompt and response schema

**Files:**
- Create: `src/lib/tuning/prompt.ts`, `src/lib/tuning/response-schema.ts`
- Test: `src/lib/tuning/prompt.test.ts`, `src/lib/tuning/response-schema.test.ts`

**Interfaces:**
- Consumes: `EvidencePack` from Task 7; `MAX_SUGGESTIONS` from `limits.ts` (Task 5 step 3, shipped in PR B).

**PR B.**
- Produces:
  ```typescript
  export function buildPrompt(pack: EvidencePack): { system: string; user: string };
  export const tuningResponseSchema: z.ZodType<TuningResponse>;
  export type TuningResponse = {
    suggestions: {
      add: string;              // card name, resolved to an oracle id in Task 9
      cut: string | null;
      rationale: string;
      rationaleShort: string;
      evidence: { kind: "games" | "note" | "decklist" | "intent"; value: string }[];
    }[];
  };
  ```

- [ ] **Step 1: Write the failing schema test**

```typescript
// src/lib/tuning/response-schema.test.ts
import { describe, expect, it } from "vitest";
import { tuningResponseSchema } from "./response-schema";

const ok = {
  suggestions: [{
    add: "Cultivate", cut: "Wastes",
    rationale: "Mana was marked as hurting in 3 of 5 games.",
    rationaleShort: "Mana hurt in 3 of 5",
    evidence: [{ kind: "games", value: "Mana — 3 of 5 games" }],
  }],
};

describe("tuningResponseSchema", () => {
  it("accepts a well-formed reply", () => {
    expect(tuningResponseSchema.safeParse(ok).success).toBe(true);
  });

  it("accepts an empty suggestion list", () => {
    expect(tuningResponseSchema.safeParse({ suggestions: [] }).success).toBe(true);
  });

  it("rejects more than three suggestions", () => {
    const four = { suggestions: Array(4).fill(ok.suggestions[0]) };
    expect(tuningResponseSchema.safeParse(four).success).toBe(false);
  });

  it("rejects a suggestion with no evidence", () => {
    const bare = { suggestions: [{ ...ok.suggestions[0], evidence: [] }] };
    expect(tuningResponseSchema.safeParse(bare).success).toBe(false);
  });

  it("requires the short rationale and caps it", () => {
    const long = { suggestions: [{ ...ok.suggestions[0], rationaleShort: "x".repeat(200) }] };
    expect(tuningResponseSchema.safeParse(long).success).toBe(false);
  });
});
```

The empty list passing is deliberate: zero suggestions is a legitimate answer that becomes the `ungrounded` outcome downstream, not a schema failure.

- [ ] **Step 2: Run it to verify it fails**

```bash
pnpm test src/lib/tuning/response-schema.test.ts
```

Expected: FAIL — cannot resolve `./response-schema`.

- [ ] **Step 3: Write the schema**

```typescript
// src/lib/tuning/response-schema.ts
import { z } from "zod";
import { MAX_SUGGESTIONS } from "./limits";

const citation = z.object({
  kind: z.enum(["games", "note", "decklist", "intent"]),
  value: z.string().min(1).max(120),
});

export const tuningResponseSchema = z.object({
  suggestions: z.array(z.object({
    add: z.string().min(1).max(200),
    cut: z.string().min(1).max(200).nullable(),
    rationale: z.string().min(1).max(400),
    rationaleShort: z.string().min(1).max(80),
    evidence: z.array(citation).min(1).max(4),
  })).max(MAX_SUGGESTIONS),
});
```

- [ ] **Step 4: Write the failing prompt test**

```typescript
// src/lib/tuning/prompt.test.ts
it("hands the model the rules it must obey", () => {
  const { system } = buildPrompt(pack);
  for (const rule of Object.values(deckTuningCopy.suggestionRules)) {
    expect(system).toContain(rule);
  }
});

it("never puts a percentage or a net figure in the evidence it sends", () => {
  const { user } = buildPrompt(pack);
  expect(user).not.toMatch(/%/);
  expect(user).not.toMatch(/\bnet\b/i);
});

it("names the deck intent when there is one and says so when there is not", () => {
  expect(buildPrompt({ ...pack, intent: "go wide" }).user).toContain("go wide");
  expect(buildPrompt({ ...pack, intent: null }).user).toContain("no stated intent");
});

it("says there is no play evidence when there are no games, rather than rendering an empty summary", () => {
  const { user } = buildPrompt({ ...pack, play: buildPlayGroup([]) });
  expect(user).toContain("no games logged");
  expect(user).not.toMatch(/0 of 0/);
});
```

- [ ] **Step 5: Write the prompt**

The system message carries the nine `suggestionRules` verbatim from the copy module — they are the model's instructions and the validator's checklist, and they must be one text so the two cannot drift. The user message renders the pack: the commanders and colour identity, the decklist grouped by role with the commanders marked as uncuttable, the role and land targets with their advisory flags (and the skeleton's thin-sample caveat when `targets.thin`), the game summary with denominators intact and each game's note quoted — or, at zero games, one sentence saying none are logged and that suggestions must rest on the list alone — the intent, and the staples not in the deck with their `commanders of commanderTotal` breadth. Ask for at most `MAX_SUGGESTIONS`, and say plainly that fewer is better than padding.

- [ ] **Step 6: Run both tests and commit**

```bash
pnpm test src/lib/tuning/prompt.test.ts src/lib/tuning/response-schema.test.ts
git add src/lib/tuning/prompt.ts src/lib/tuning/prompt.test.ts src/lib/tuning/response-schema.ts src/lib/tuning/response-schema.test.ts
git commit -m "feat(tuning): schema-constrained prompt and response contract"
```

---

### Task 9: The six validation rules

**PR B.**

**Files:**
- Create: `src/lib/tuning/presentation.ts`, `src/lib/tuning/validate.ts`
- Test: `src/lib/tuning/presentation.test.ts`, `src/lib/tuning/validate.test.ts`

**Interfaces:**
- Consumes: `EvidencePack` (Task 7), `TuningResponse` (Task 8).
- Produces:
  ```typescript
  export function presentationFailures(text: string): string[];
  export type ValidatedSuggestion = {
    addOracleId: string; cutOracleId: string | null;
    rationale: string; rationaleShort: string;
    evidence: TuningCitation[]; position: number;
  };
  export function validateSuggestions(args: {
    response: TuningResponse;
    pack: EvidencePack;
    resolveName: (name: string) => { oracleId: string; colorIdentity: string[] } | null;
  }): { kept: ValidatedSuggestion[]; droppedCount: number };
  ```

`resolveName` is injected rather than queried, which is what keeps this module pure and client-safe. Task 11 passes it a closure over a real `cards.name` lookup.

- [ ] **Step 1: Write the failing presentation test**

```typescript
// src/lib/tuning/presentation.test.ts
import { describe, expect, it } from "vitest";
import { presentationFailures } from "./presentation";

describe("presentationFailures", () => {
  it("passes a line that carries its denominator", () => {
    expect(presentationFailures("Mana hurt in 3 of 5 games.")).toEqual([]);
  });

  it("catches a percentage", () => {
    expect(presentationFailures("Mana hurt in 60% of games.")).not.toEqual([]);
  });

  it("catches a bare count with no denominator", () => {
    expect(presentationFailures("Mana hurt in 3 games.")).not.toEqual([]);
  });

  it("catches a net figure", () => {
    expect(presentationFailures("Mana is net -2 across the log.")).not.toEqual([]);
  });

  it("catches a win rate", () => {
    expect(presentationFailures("Your win rate is low.")).not.toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
pnpm test src/lib/tuning/presentation.test.ts
```

Expected: FAIL — cannot resolve `./presentation`.

- [ ] **Step 3: Implement the nine checks**

One function returning the names of the rules a string breaks. The nine, matching `deckTuningCopy.suggestionRules` one-to-one: no percentage; no net figure; every count carries a denominator; every claim cites; a quoted note is quoted verbatim; the add is inside the colour identity; the cut is in the deck; one cut per add; ownership is a fact about the collection and never a ranking. The first five are text checks and live here; the last four are structural and live in `validate.ts`, but all nine are named by the same copy keys so the model's instructions and the validator agree.

The denominator check is the subtle one: a numeral followed by a countable noun (`games`, `cards`) with no ` of ` between it and a second numeral is a failure. `3 of 5 games` passes; `3 games` does not; `4 lands` in a decklist claim does not need a denominator and is exempted by requiring the noun to be one of the counted nouns.

- [ ] **Step 4: Write the failing validate test**

```typescript
// src/lib/tuning/validate.test.ts
it("drops a card that is not in the catalog and counts the drop", () => {
  const out = validateSuggestions({ response: withAdd("Nonesuch"), pack, resolveName: () => null });
  expect(out.kept).toHaveLength(0);
  expect(out.droppedCount).toBe(1);
});

it("drops a cut that is not in the deck", () => {
  const out = validateSuggestions({ response: withCut("Not In Deck"), pack, resolveName: resolve });
  expect(out.kept).toHaveLength(0);
  expect(out.droppedCount).toBe(1);
});

it("drops a cut that names a commander", () => {
  // The profile's commanders-are-cards converse: they are in the list and can never leave it.
  const out = validateSuggestions({ response: withCut(commanderName), pack, resolveName: resolve });
  expect(out.kept).toHaveLength(0);
  expect(out.droppedCount).toBe(1);
});

it("drops a citation of games when the pack has none", () => {
  const out = validateSuggestions({
    response: withCitation("Mana — 2 of 3 games"), pack: { ...pack, play: buildPlayGroup([]) }, resolveName: resolve,
  });
  expect(out.kept).toHaveLength(0);
});

it("drops an add outside the commander's colour identity", () => {
  const out = validateSuggestions({
    response: withAdd("Lightning Bolt"), pack: { ...pack, colorIdentity: ["G"] },
    resolveName: () => ({ oracleId: "bolt", colorIdentity: ["R"] }),
  });
  expect(out.kept).toHaveLength(0);
  expect(out.droppedCount).toBe(1);
});

it("drops a suggestion whose cited game does not exist in the pack", () => {
  const out = validateSuggestions({ response: withCitation("Mana — 9 of 5 games"), pack, resolveName: resolve });
  expect(out.kept).toHaveLength(0);
});

it("drops a suggestion that breaks a presentation rule", () => {
  const out = validateSuggestions({ response: withRationale("Mana hurt in 60% of games."), pack, resolveName: resolve });
  expect(out.kept).toHaveLength(0);
  expect(out.droppedCount).toBe(1);
});

it("renumbers position over the survivors so the card list has no holes", () => {
  const out = validateSuggestions({ response: threeWhereTheMiddleIsBad, pack, resolveName: resolve });
  expect(out.kept.map((s) => s.position)).toEqual([0, 1]);
  expect(out.droppedCount).toBe(1);
});
```

- [ ] **Step 5: Implement**

Run each suggestion through the six rules in order and keep only those that survive all of them. `droppedCount` is the number that did not. Renumber `position` across the survivors — a hole in the sequence would be a rendering bug waiting to happen.

Colour identity uses the same rule the add path already enforces (`validateCardForDeck` at `src/lib/decks/add-validation.ts:46`); do not write a second, subtly different subset test — extract or reuse.

- [ ] **Step 6: Run both suites and commit**

```bash
pnpm test src/lib/tuning
git add src/lib/tuning/presentation.ts src/lib/tuning/presentation.test.ts src/lib/tuning/validate.ts src/lib/tuning/validate.test.ts
git commit -m "feat(tuning): six validation rules, every drop counted"
```

---

### Task 10: The shared model client and the daily allowance

**PR A.** Nothing here names tuning. The synopsis (sub-project 6) calls the same two functions with its own model, prompt, schema and feature name.

**Files:**
- Create: `src/lib/model/client.ts`, `src/lib/model/allowance.ts`
- Test: `src/lib/model/client.test.ts`, `src/lib/model/allowance.test.ts`
- Modify: `.env.example`, `docs/deployment.md`

**Interfaces:**
- Consumes: `modelCalls` (Task 1).
- Produces:
  ```typescript
  // src/lib/model/client.ts — server-only
  export type ModelErrorClass = "upstream_busy" | "timeout" | "malformed";
  export type ModelOutcome<T> =
    | { ok: true; value: T; usage: { inputTokens: number; outputTokens: number } }
    | { ok: false; errorClass: ModelErrorClass };
  export function callModel<T>(
    request: {
      model: string;           // the caller's; this module names none
      system: string;
      user: string;
      maxTokens: number;
      schema: z.ZodType<T>;    // the reply is JSON text parsed against this
      deadlineMs: number;      // one deadline across both attempts
    },
    deps?: { fetch?: typeof fetch; now?: () => number },
  ): Promise<ModelOutcome<T>>;

  // src/lib/model/allowance.ts — server-only
  export const MODEL_DAILY_ALLOWANCE = 5; // placeholder until measured; see the plan's Cost section
  export const ALLOWANCE_WINDOW_MS = 24 * 60 * 60 * 1000;
  export type ModelFeature = "tuning" | "synopsis";
  export type Allowance = { used: number; limit: number; reopensAt: Date | null };
  /** Inside the caller's transaction: lock, count, insert. Null when spent. */
  export function reserveModelCall(tx: Tx, userId: string, feature: ModelFeature, now: Date): Promise<{ id: string } | null>;
  export function readAllowance(userId: string, now: Date): Promise<Allowance>;
  export function allowanceFrom(callTimes: Date[], now: Date): Allowance; // pure; both of the above use it
  ```

**Why the counter is rows, not a number.** A per-player counter column needs a reset job and loses the history; a ledger row per run is counted over a rolling window by one indexed query, reopens on its own, and says what spent it. `feature` is carried so the cost section's figures can be split later, and for nothing else — the allowance counts both features against one number, which is the ruling.

**Rolling 24 hours, not a calendar day.** A calendar reset has to pick a time zone, and midnight UTC is mid-evening for the players this is built for — the hour a deck is most likely being tuned. A rolling window needs no zone, and `reopensAt` (the oldest counted call plus the window) gives the exhausted state an honest time to name.

**Concurrency.** Two presses on two decks at once must not both take the last unit. `reserveModelCall` takes `pg_advisory_xact_lock(hashtext('model-allowance:' || user_id))` first — the same per-user advisory-lock pattern `replaceCollection` uses — then counts inside the window, then inserts. The caller runs it in the same transaction as its own pending-row insert (Task 11), so a run either holds a unit and a pending row or neither.

- [ ] **Step 1: Write the failing client tests**

`fetch` and `now` are injected, so the whole retry contract is testable with no network.

```typescript
// src/lib/model/client.test.ts
const schema = z.object({ answer: z.string() });
const req = { model: "m", system: "s", user: "u", maxTokens: 100, schema, deadlineMs: 90_000 };

it("retries once on a 529 and succeeds", async () => {
  const calls: number[] = [];
  const fake = async () => { calls.push(1); return calls.length === 1 ? busy() : reply({ answer: "x" }); };
  const out = await callModel(req, { fetch: fake as unknown as typeof fetch });
  expect(out.ok).toBe(true);
  expect(calls).toHaveLength(2);
});

it("gives up as upstream_busy after the one retry", async () => {
  const out = await callModel(req, { fetch: (async () => busy()) as unknown as typeof fetch });
  expect(out).toEqual({ ok: false, errorClass: "upstream_busy" });
});

it("retries once on a reply that fails the caller's schema, then reports malformed", async () => {
  const calls: number[] = [];
  const fake = async () => { calls.push(1); return reply({ wrong: 1 }); };
  const out = await callModel(req, { fetch: fake as unknown as typeof fetch });
  expect(out).toEqual({ ok: false, errorClass: "malformed" });
  expect(calls).toHaveLength(2);
});

it("reports timeout and does not retry it", async () => {
  // fake timers advanced past deadlineMs
});

it("spends one deadline across both attempts, not one each", async () => {
  const arms: number[] = [];
  const fake = (_u: string, init?: RequestInit) => { arms.push(remainingOn(init!.signal!)); return busy(); };
  await callModel(req, { fetch: fake as unknown as typeof fetch });
  expect(arms[1]).toBeLessThan(arms[0]);
});

it("sends the caller's model and names none of its own", async () => {
  let body: { model?: string } = {};
  const fake = async (_u: string, init?: RequestInit) => { body = JSON.parse(String(init!.body)); return reply({ answer: "x" }); };
  await callModel({ ...req, model: "caller-model" }, { fetch: fake as unknown as typeof fetch });
  expect(body.model).toBe("caller-model");
});

it("returns the usage the response reported", async () => {
  // Cost section: the measured tokens are read off this.
});
```

- [ ] **Step 2: Write the failing allowance tests — the pure half**

```typescript
// src/lib/model/allowance.test.ts
const now = new Date("2026-09-23T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

it("counts only calls inside the rolling window", () => {
  expect(allowanceFrom([hoursAgo(1), hoursAgo(25)], now).used).toBe(1);
});

it("reopens when the oldest counted call leaves the window", () => {
  const times = Array.from({ length: MODEL_DAILY_ALLOWANCE }, (_, i) => hoursAgo(20 - i));
  const a = allowanceFrom(times, now);
  expect(a.used).toBe(MODEL_DAILY_ALLOWANCE);
  expect(a.reopensAt).toEqual(new Date(hoursAgo(20).getTime() + ALLOWANCE_WINDOW_MS));
});

it("names no reopening time while units remain", () => {
  expect(allowanceFrom([hoursAgo(1)], now).reopensAt).toBeNull();
});
```

The lock, the count and the insert are a transaction's behaviour and are proved in `probe:tuning-run` (Task 11), which races two reservations for one player's last unit and asserts exactly one wins.

- [ ] **Step 3: Run them to verify they fail**

```bash
pnpm test src/lib/model
```

- [ ] **Step 4: Implement the client**

Raw `fetch` to `https://api.anthropic.com/v1/messages`, the headers `scripts/generate-commander-prose.ts` sends (`content-type`, `x-api-key` from `process.env.ANTHROPIC_API_KEY`, `"anthropic-version": "2023-06-01"`), the caller's `model` and `max_tokens`, and the caller's `system` and `user`. The reply's text block is `JSON.parse`d and checked with `schema.safeParse`; a parse or schema failure is the `malformed` class.

**The deadline is one deadline across both attempts, not a budget each.** Compute `deadline = now() + deadlineMs` once, before the first attempt, and arm each attempt's `AbortController` at `deadline - now()`; skip the retry when nothing is left. At most two HTTP attempts, and only for `429`/`529`/`5xx` (→ `upstream_busy`) and an unparseable reply (→ `malformed`). A timeout is not retried — the budget is the budget, and a second attempt would outrun the route's `maxDuration` and leave no room to write the failure row. A missing key throws: that is a deployment defect, not a failure class a player should see as "try again".

`scripts/generate-commander-prose.ts` keeps its own fetch in this PR. Moving it onto the shared client is a separate change with its own proof (the prose workflow), logged on the board rather than folded in here.

- [ ] **Step 5: Implement the allowance**

`allowanceFrom` is the pure arithmetic. `readAllowance` selects the `created_at` of the reader's `model_calls` rows inside the window (`model_calls_user_created_idx`) and hands them to it. `reserveModelCall` locks, counts through the same arithmetic, and returns null when `used >= MODEL_DAILY_ALLOWANCE`, otherwise inserts `{ userId, feature }` and returns the id.

- [ ] **Step 6: Document the key**

Add `ANTHROPIC_API_KEY=` to `.env.example` with a one-line comment, and a row to `docs/deployment.md`: required in every Vercel project that serves the builder, Sensitive, Production and Preview. Without it, `runTuning` throws at the call rather than recording a failure class. The prose workflow's own repository secret is unaffected.

- [ ] **Step 7: Run the tests and commit**

```bash
pnpm test src/lib/model
git add src/lib/model/client.ts src/lib/model/client.test.ts src/lib/model/allowance.ts src/lib/model/allowance.test.ts .env.example docs/deployment.md
git commit -m "feat(model): one shared model client and a per-player daily allowance"
```

---

### Task 11: The durability contract

**Split.** Steps 1–2 (`reaper.ts`, pure) ship in **PR B**. Steps 3–6 ship in **PR C**.

**Files:**
- Modify: `src/app/decks/tuning-actions.ts` (adds `runTuning` and `cancelTuningRun`)
- Create: `src/lib/tuning/reaper.ts`, `scripts/probe-tuning-run.mts` (+ `probe:tuning-run` in `package.json`)
- Test: `src/lib/tuning/reaper.test.ts`, `src/app/decks/tuning-actions.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 6–10.
- Produces:
  ```typescript
  export function runTuning(deckId: string): Promise<DeckMutationResult>;
  export function cancelTuningRun(deckId: string, runId: string): Promise<DeckMutationResult>;
  export function reapCutoff(now: Date): Date;
  ```

This is the task the spec's §6 exists for. Read §6 before starting it.

- [ ] **Step 1: Write the failing reaper test**

```typescript
// src/lib/tuning/reaper.test.ts
import { describe, expect, it } from "vitest";
import { reapCutoff } from "./reaper";
import { REAPER_CUTOFF_MS } from "./limits";

it("cuts off exactly one window back", () => {
  const now = new Date("2026-09-07T12:00:00Z");
  expect(reapCutoff(now).getTime()).toBe(now.getTime() - REAPER_CUTOFF_MS);
});
```

- [ ] **Step 2: Run it, implement `reapCutoff`, run it again**

```typescript
// src/lib/tuning/reaper.ts
import { REAPER_CUTOFF_MS } from "./limits";

/**
 * A pending run older than this was abandoned — the process that owned it is
 * gone. The reaper fails it as 'interrupted' so the deck can run again; the
 * abandoned process, if it somehow returns, finds zero rows under its own
 * `where status = 'pending'` guard and discards its result.
 */
export function reapCutoff(now: Date): Date {
  return new Date(now.getTime() - REAPER_CUTOFF_MS);
}
```

- [ ] **Step 3: Write `runTuning`**

The order matters and is the whole point. Nothing here trusts the client: **a server action is a public endpoint**, as `logGame`'s own comment says (`src/app/decks/actions.ts`, inside `logGame` at `:1264`), so every gate the panel applies is re-applied here. A stale tab or a replayed request hits the same rule the button does.

```typescript
// 23505 is Postgres's unique_violation. Narrowed by hand rather than by
// instanceof: the driver's error is a plain object with a `code`, and the repo
// already reasons about this code by number in `src/lib/collection/key.ts:7`.
function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err
    && (err as { code?: unknown }).code === "23505";
}

export async function runTuning(deckId: string): Promise<DeckMutationResult> {
  const userId = await requireUserId();

  // 0. The inputs. The profile is the deck half of the evidence; the play group
  //    is composed onto it here and never cached with it (Task 7).
  const [profile, games, intent] = await Promise.all([
    cachedDeckProfile(deckId, userId),
    listDeckGames(deckId, userId),
    readDeckIntent(deckId, userId),
  ]);
  if (!profile) return { ok: false, message: deckTuningCopy.panel.refused };
  const play = buildPlayGroup(games);
  const fingerprint = tuningFingerprint({ profile: profile.fingerprint, games, intent });

  // 1. The same gate the panel shows, enforced server-side. gateReason is the
  //    single source of that answer (Task 12), so the disabled button and the
  //    refusal can never disagree. No game count enters it.
  const state = await readTuningState(deckId, userId, fingerprint);
  const gate = gateReason(state);
  if (gate) return { ok: false, message: gate.message };

  // 2. One transaction: reserve a unit of the shared allowance, then the pending
  //    row. Committed before any network call. The allowance lock makes the last
  //    unit single-winner across decks; the partial unique index makes a second
  //    concurrent run on this deck impossible. A run holds both or neither.
  let runId: string;
  try {
    runId = await db.transaction(async (tx) => {
      const unit = await reserveModelCall(tx, userId, "tuning", new Date());
      if (!unit) throw new AllowanceSpentError();
      const [row] = await tx.insert(deckSuggestionRuns).values({
        deckId, userId, inputFingerprint: fingerprint,
        model: TUNING_MODEL, promptVersion: PROMPT_VERSION, status: "pending",
      }).returning({ id: deckSuggestionRuns.id });
      return row.id;
    });
  } catch (err) {
    if (err instanceof AllowanceSpentError) {
      const allowance = await readAllowance(userId, new Date());
      return { ok: false, message: deckTuningCopy.allowance.spent(allowance.reopensAt!) };
    }
    // Only a unique violation on the partial index means "another run for this
    // deck is already in flight". A bare `catch` would report that same message
    // for a dropped connection or a missing column.
    if (!isUniqueViolation(err)) throw err;
    return { ok: false, message: deckTuningCopy.panel.generating };
  }

  // 3. The call. Everything after this point writes conditionally.
  const owned = await readOwnedOracleIds(userId, [
    ...profile.cards.map((c) => c.oracleId),
    ...profile.skeleton.staples.map((s) => s.oracleId),
  ]);
  const pack = buildEvidencePack({ profile, play, intent, owned });
  const { system, user } = buildPrompt(pack);
  const outcome = await callModel({
    model: TUNING_MODEL, system, user, maxTokens: TUNING_MAX_TOKENS,
    schema: tuningResponseSchema, deadlineMs: MODEL_TIMEOUT_MS,
  });

  if (!outcome.ok) return finishRun(runId, deckId, { status: "failed", errorClass: outcome.errorClass });

  // resolveName closes over one catalog read of every name the model returned.
  // Injecting it is what keeps validate.ts pure and client-safe (Task 9).
  const names = outcome.value.suggestions.flatMap((s) => [s.add, ...(s.cut ? [s.cut] : [])]);
  const rows = names.length === 0 ? [] : await db
    .select({ oracleId: cards.oracleId, name: cards.name, colorIdentity: cards.colorIdentity })
    .from(cards)
    .where(inArray(cards.name, names));
  const byName = new Map(rows.map((r) => [r.name, r]));
  const resolveName = (name: string) => byName.get(name) ?? null;

  const { kept, droppedCount } = validateSuggestions({ response: outcome.value, pack, resolveName });
  if (kept.length === 0) {
    return finishRun(runId, deckId, { status: "failed", errorClass: "ungrounded", droppedCount });
  }

  // 4. Items and outcome in one transaction, both guarded.
  return persistRun(runId, deckId, kept, droppedCount);
}
```

`readDeckIntent` is a one-column read of `decks.intent`, scoped by `user_id`; `readOwnedOracleIds` is one `collection_items` read over the given ids. Both live in `tuning-read.ts`. `cachedDeckProfile` is the loader the Analysis tab's press already warms (`src/lib/profile/load.ts:577`), so a player who analysed the deck first pays nothing for the deck half here. Its key is the profile fingerprint, so a card edited since the analysis reads a fresh profile rather than a stale one.

Both writers share one shape. `finishRun` writes an outcome and no items; `persistRun` writes the items and the outcome together:

```typescript
class RunSupersededError extends Error {}

async function finishRun(
  runId: string,
  deckId: string,
  set: { status: "failed"; errorClass: ErrorClass; droppedCount?: number },
): Promise<DeckMutationResult> {
  const written = await db.update(deckSuggestionRuns)
    .set(set)
    .where(and(eq(deckSuggestionRuns.id, runId), eq(deckSuggestionRuns.status, "pending")))
    .returning({ id: deckSuggestionRuns.id });
  // Superseded: the player has already been shown a settled state. Return
  // quietly and do not revalidate — revalidating would yank it out from under them.
  if (written.length === 0) return { ok: true };
  for (const path of deckSurfaces(deckId)) revalidatePath(path);
  return { ok: true };
}

async function persistRun(
  runId: string, deckId: string, kept: ValidatedSuggestion[], droppedCount: number,
): Promise<DeckMutationResult> {
  try {
    await db.transaction(async (tx) => {
      const written = await tx.update(deckSuggestionRuns)
        .set({ status: "ok", droppedCount })
        .where(and(eq(deckSuggestionRuns.id, runId), eq(deckSuggestionRuns.status, "pending")))
        .returning({ id: deckSuggestionRuns.id });
      // Zero rows means the reaper or a Stop got here first. Throwing rolls the
      // items back with it, so a superseded run can never leave items behind.
      if (written.length === 0) throw new RunSupersededError();
      await tx.insert(deckSuggestionItems).values(kept.map((s) => ({ ...s, runId })));
    });
  } catch (err) {
    if (err instanceof RunSupersededError) return { ok: true };
    throw err;
  }
  for (const path of deckSurfaces(deckId)) revalidatePath(path);
  return { ok: true };
}
```

The status update comes **before** the item insert inside the transaction, not after. That ordering is what makes "items persisted but status did not" impossible: the guard is evaluated first, and if it fails nothing else in the transaction runs.

- [ ] **Step 4: Write `cancelTuningRun`**

```typescript
export async function cancelTuningRun(deckId: string, runId: string): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  await db.update(deckSuggestionRuns)
    .set({ status: "cancelled" })
    .where(and(
      eq(deckSuggestionRuns.id, runId),
      eq(deckSuggestionRuns.deckId, deckId),
      eq(deckSuggestionRuns.userId, userId),
      eq(deckSuggestionRuns.status, "pending"),
    ));
  for (const path of deckSurfaces(deckId)) revalidatePath(path);
  return { ok: true };
}
```

It takes the `runId` the panel was watching, not just the deck. Scoped to the deck alone, a Stop pressed late — after the watched run settled and the player started another — would cancel the second run instead of the one whose button they pressed. The panel has the id; pass it.

Stop needs no new concurrency primitive — it is the reaper's mechanism fired by hand. A cancelled run is not a failure, so `failed` keeps meaning failure; and because the fingerprint gate only matches **successful** runs, a cancel does not consume the gate.

- [ ] **Step 5: Prove the durability contract against a real Postgres — `pnpm probe:tuning-run`**

Every rule in this task is a fact about what a transaction wrote, which no jsdom test here can reach; a stub that records statements proves the text was issued and nothing about the lock or the guard. So the race cases are a probe, in the repo's convention (`probe:claims`, `probe:score-lock`): `scripts/probe-tuning-run.mts`, a per-run `user_id`, every fixture deleted in a `finally`, each cleanup step on its own. It calls the real `finishRun` / `persistRun` / `reserveModelCall` and stubs only the model (through `callModel`'s injected `fetch`).

Four cases, each written so a mutation fails it:

1. **The reaper got there first.** A run row flipped to `failed`/`interrupted`, then the success path writes `ok`. The row still reads `failed`/`interrupted` and no items exist. Mutation: drop the `status = 'pending'` guard from `persistRun`.
2. **The player pressed Stop.** Same shape with the row `cancelled`. `cancelled` survives. Mutation: the same guard, on `finishRun`.
3. **A second concurrent run on one deck** is refused by the partial index (23505), and the loser holds no allowance unit — the unit and the row share the transaction. Mutation: move the reservation out of the pending-row transaction, and the loser keeps a unit it never spent.
4. **Two presses on two decks race for one player's last allowance unit**, started together on two connections; exactly one reserves. Mutation: remove the advisory lock (it fails on every run, as `probe:arrivals`'s lock case does).

Point it at `local-dev` or a scratch Neon branch, **never production**. The script's `report()` counts its own failures and `process.exit` runs after the `finally`, not inside it — the trap three earlier probes fell into.

- [ ] **Step 6: Run the suite and commit**

```bash
pnpm test src/lib/tuning/reaper.test.ts
PROBE against local-dev: pnpm probe:tuning-run
git add src/app/decks/tuning-actions.ts scripts/probe-tuning-run.mts package.json
git commit -m "feat(tuning): durable run lifecycle with a reaper, a cancel, and guarded writes"
```

---

### Task 12: The read, the gate, and the allowance

**Split.** Steps 1–2 (`gate.ts`, pure) ship in **PR B**; steps 3–5 (`tuning-read.ts`, `readTuningPanel`) in **PR C**. The page wiring is PR D's.

**Files:**
- Create: `src/lib/tuning/gate.ts`, `src/lib/decks/tuning-read.ts`
- Modify: `src/app/decks/tuning-actions.ts` (adds `readTuningPanel`)
- Test: `src/lib/tuning/gate.test.ts`

**Interfaces:**
- Consumes: Tasks 1, 6, 7, 10, 11.
- Produces:
  ```typescript
  // src/lib/tuning/gate.ts — pure, client-safe
  export type GateReason = {
    kind: "in_flight" | "allowance" | "unchanged";
    /** Rendered beside the disabled button, and returned by runTuning's refusal. */
    message: string;
  };
  export function gateReason(state: TuningState): GateReason | null;

  // src/lib/decks/tuning-read.ts — server-only
  export type TuningItem = {
    id: string;
    addOracleId: string; addName: string; addTypeLine: string;
    cutOracleId: string | null; cutName: string | null;
    rationale: string; rationaleShort: string;
    evidence: TuningCitation[];
    position: number;
    verdict: "pending" | "accepted" | "dismissed";
    /** Facts about the collection, never a ranking. */
    owned: boolean; ownedQuantity: number;
    /** Cents, formatted by the card through formatCents. Null when unpriced. */
    priceCents: number | null;
  };
  export type TuningState = {
    run: { id: string; status: string; errorClass: string | null; createdAt: Date; droppedCount: number } | null;
    items: TuningItem[];
    /** The newest ok run's fingerprint, or null if there has never been one. */
    lastOkFingerprint: string | null;
    /** That same row's `createdAt`. Null exactly when lastOkFingerprint is. */
    lastOkAt: Date | null;
    /** lastOkFingerprint !== the fingerprint passed in. */
    stale: boolean;
    /** The reader's shared model allowance — tuning and the synopsis together. */
    allowance: Allowance;
    /** What the evidence will hold, so the panel can say "no games yet" without a gate. */
    gameCount: number;
  };
  export function readTuningState(deckId: string, userId: string, fingerprint: string): Promise<TuningState>;

  // src/app/decks/tuning-actions.ts
  export function readTuningPanel(deckId: string): Promise<TuningState | null>;
  ```

`gameCount` rides on the state for the panel's copy — a deck with no games is told its suggestions come from the list alone — and gates nothing. `TuningItem` is the only shape the card renders; the card does no lookups of its own, which is why the name, type line, ownership, and price are joined here.

- [ ] **Step 1: Write the failing gate test**

`gateReason` is pure and is the single answer to "why is the button disabled", so the disabled button and the reason shown beside it can never disagree.

```typescript
// src/lib/tuning/gate.test.ts
const at = new Date("2026-09-07T10:00:00Z");
const run = (status: string, errorClass: string | null = null) => ({
  id: "run_1", status, errorClass, createdAt: at, droppedCount: 0,
});
const open: Allowance = { used: 0, limit: MODEL_DAILY_ALLOWANCE, reopensAt: null };
// `fresh` is a deck that has never generated — and has no games, which is not a gate.
const fresh: TuningState = {
  run: null, items: [], lastOkFingerprint: null, lastOkAt: null,
  stale: true, allowance: open, gameCount: 0,
};
const settled: TuningState = {
  ...fresh, run: run("ok"), lastOkFingerprint: "fp", lastOkAt: at, stale: false,
};

it("opens a deck with no games and no runs", () => {
  expect(gateReason(fresh)).toBeNull();
});

it("gates while a run is in flight", () => {
  expect(gateReason({ ...fresh, run: run("pending") })?.kind).toBe("in_flight");
});

it("gates when nothing has changed since the last successful run", () => {
  expect(gateReason(settled)?.kind).toBe("unchanged");
});

it("does not gate when the last run failed or was cancelled", () => {
  expect(gateReason({ ...fresh, run: run("failed", "upstream_busy") })).toBeNull();
  expect(gateReason({ ...fresh, run: run("cancelled") })).toBeNull();
});

it("gates when the shared allowance is spent, and names when it reopens", () => {
  const reopensAt = new Date("2026-09-08T09:00:00Z");
  const g = gateReason({ ...fresh, allowance: { used: MODEL_DAILY_ALLOWANCE, limit: MODEL_DAILY_ALLOWANCE, reopensAt } });
  expect(g?.kind).toBe("allowance");
  expect(g?.message).toBe(deckTuningCopy.allowance.spent(reopensAt));
});

it("reports unchanged before allowance, so a spent allowance never hides that a press would be wasted anyway", () => {
  expect(gateReason({ ...settled, allowance: { used: 5, limit: 5, reopensAt: at } })?.kind).toBe("unchanged");
});
```

A failed or cancelled run not consuming the gate is the spec's rule and the reason those cases are tested separately.

- [ ] **Step 2: Run it to verify it fails, then implement `gateReason`**

Three kinds, in this order — the first that applies wins:

```typescript
export function gateReason(state: TuningState): GateReason | null {
  if (state.run?.status === "pending") {
    return { kind: "in_flight", message: deckTuningCopy.panel.generating };
  }
  if (!state.stale && state.lastOkFingerprint !== null) {
    return { kind: "unchanged", message: deckTuningCopy.panel.unchanged(state.lastOkAt!) };
  }
  if (state.allowance.used >= state.allowance.limit) {
    return { kind: "allowance", message: deckTuningCopy.allowance.spent(state.allowance.reopensAt!) };
  }
  return null;
}
```

`unchanged` precedes `allowance` because it is the more useful truth: a player told their allowance is spent will wait for it to reopen and then be told nothing changed. `panel.unchangedCta` is the **button label** on the unchanged state and must not be reused as a message. `allowance.spent(at)` is the stated exhausted state; its wording is not drawn yet and is listed in Task 2 as a key the placement addendum returns, with the synopsis's surface in mind, because both features show it.

`panel.unchanged(...)` takes the time the standing suggestions were generated, which is the newest **ok** run's timestamp — not `state.run.createdAt`, which may belong to a failure that happened afterwards.

An `ungrounded` failure leaves the gate open on unchanged inputs, so `Try again` can re-spend on a call that will very likely fail the same way. That is the spec's rule, and the allowance is now what bounds it.

- [ ] **Step 3: Write `readTuningState`**

It reaps on the way past, in one statement, before reading — **scoped to this deck**:

```sql
update deck_suggestion_runs set status = 'failed', error_class = 'interrupted'
where deck_id = :deckId and status = 'pending' and created_at < :cutoff
```

The spec's §6 writes this unscoped. Scoping it to the deck being read changes nothing about the contract — every deck's read reaps its own — and one player opening a deck no longer writes across other players' rows.

Then it reads: the newest run for the deck with its items ordered by `position`, joined to `cards` for the add and cut names and type lines and to the collection and price tables for `owned` / `ownedQuantity` / `priceCents`; the newest run with `status = 'ok'` for `lastOkFingerprint` / `lastOkAt`; the game count; and `readAllowance(userId, now)`.

- [ ] **Step 4: Write `readTuningPanel`**

The one server action a surface calls to draw the panel. It exists because **the Analysis tab has no address** — `BuilderTabs` is client state, so no route loader can be conditional on the panel being visible, and loading the tuning state on every deck-page render would pay for a read most visits never draw. The action computes the fingerprint (`loadProfileHead` → `profileFingerprint`, `listDeckGames`, the deck's intent), then returns `readTuningState`. `requireUserId` first; a deck the reader does not own reads as null.

Whether PR D calls this on tab open (as `peekProfile` does for the stored analysis) or the route loads it unconditionally is D's decision, made once the addendum says where the panel lives.

- [ ] **Step 5: Run the suite and commit**

```bash
pnpm test src/lib/tuning && pnpm typecheck
git add src/lib/tuning/gate.ts src/lib/tuning/gate.test.ts src/lib/decks/tuning-read.ts src/app/decks/tuning-actions.ts
git commit -m "feat(tuning): read-time reaper, the fingerprint gate, and the shared allowance"
```

---

### Task 13: The manifest

**Split.** `readTuningEvidence` ships in **PR C**; `ManifestRows` in **PR D**. The `games` and `notes` steps report 0 truthfully on a deck with no games — the manifest discloses what the model was handed, and nothing is what it was handed.

**Files:**
- Create: `src/components/decks/manifest-rows.tsx`
- Modify: `src/app/decks/tuning-actions.ts` (adds `readTuningEvidence`)
- Test: `src/components/decks/manifest-rows.test.tsx`

**Interfaces:**
- Consumes: `manifestCopy` (Task 2).
- Produces:
  ```typescript
  export type ManifestStep = "games" | "notes" | "decklist" | "intent";
  export function readTuningEvidence(deckId: string, step: ManifestStep): Promise<{ ok: true; count: number } | { ok: false }>;
  export function ManifestRows(props: { steps: { step: ManifestStep; count: number | null }[] }): JSX.Element;
  ```

**The rule this task exists to honour:** the manifest ticks on a read genuinely completing, never on a timer. It is the honest disclosure of what the model was handed, and a faked progression is exactly the theatre the design rejects.

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/decks/manifest-rows.test.tsx
it("shows a row as pending until its count arrives", () => {
  render(<ManifestRows steps={[{ step: "games", count: null }]} />);
  expect(screen.queryByText(manifestCopy.games.count(5))).not.toBeInTheDocument();
});

it("shows the count once the read has landed", () => {
  render(<ManifestRows steps={[{ step: "games", count: 5 }]} />);
  expect(screen.getByText(manifestCopy.games.count(5))).toBeInTheDocument();
});

it("uses the singular form at one", () => {
  render(<ManifestRows steps={[{ step: "games", count: 1 }]} />);
  expect(screen.getByText(manifestCopy.games.countOne)).toBeInTheDocument();
});

it("reports progress against the real total", () => {
  render(<ManifestRows steps={[{ step: "games", count: 5 }, { step: "notes", count: null }]} />);
  expect(screen.getByText(manifestCopy.progress(1, 2))).toBeInTheDocument();
});
```

- [ ] **Step 2: Run it to verify it fails, then build the component**

Row tap-target floor is **44px mobile, 38px desktop** — the design table's manifest row. Collapsed form uses `manifestCopy.collapsed(parts)`, with callers joining parts with `' · '`.

- [ ] **Step 3: Add `readTuningEvidence`**

Four cheap authorised reads — game count, note count, decklist size, whether an intent is set — one per step. The panel calls them in sequence so each tick lands on a read that actually finished, producing a truthful `3 of 4 read`. `runTuning` then rebuilds the pack server-side from scratch: the manifest is disclosure, not input, and the run must not trust anything the client assembled.

The duplicated reads are cheap and the honesty is the feature. Do not "optimise" this into one call that ticks all four rows at once — that produces a progression the player did not actually watch happen.

- [ ] **Step 4: Run the test and commit**

```bash
pnpm test src/components/decks/manifest-rows.test.tsx
git add src/components/decks/manifest-rows.tsx src/components/decks/manifest-rows.test.tsx src/app/decks/tuning-actions.ts
git commit -m "feat(tuning): evidence manifest that ticks on real reads"
```

---

### Task 14: The tuning panel

**PR D — BLOCKED ON DESIGN — placement addendum.** Two things the addendum returns before this task starts: where the panel lives (Task 16), and the panel with **no game gate**. S4 state 1 (*Below threshold*) is retired, and S4 state 2 (*Ready*) was drawn assuming at least `PATTERN_MIN` games — its briefing names "the strongest Fix". A deck with no games, or games with no marks, has no Fix to name, so *Ready* needs a drawing for that case, and the allowance's exhausted state needs one too. Eng does not improvise either.

**Files:**
- Create: `src/components/decks/tuning-panel.tsx`
- Test: `src/components/decks/tuning-panel.test.tsx`

**Interfaces:**
- Consumes: `deckTuningCopy.panel` and `.failure` and `.announce` (Task 2); `TuningState` and `gateReason` (Task 12); `runTuning` / `cancelTuningRun` (Task 11); `ManifestRows` (Task 13).
- Produces: the `TuningPanel` component. `builder-shell.tsx` mounts it.

**Design table rows to satisfy:** S4 states 2 (and the addendum's zero-evidence *Ready*), 3, 4, 5, 6a–6d, the allowance state, **6e (interrupted, undrawn)**, and the `Stop` transition. The action row is a **fixed band across all six states** — 56px desktop, primaries 44px on mobile. Getting that band right is what stops the panel jumping as it changes state.

State 6e has no drawing. Build it from the four drawn failure states' shared structure — tag, body, kept line, note — with `deckTuningCopy.failure.interrupted`'s strings. That is the audit's finding A resolution, and it is eng's to build, not a Design round-trip.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/components/decks/tuning-panel.test.tsx
it("shows the reason beside a disabled button rather than only disabling it", () => {
  render(<TuningPanel state={unchangedState} />);
  expect(screen.getByRole("button", { name: deckTuningCopy.panel.unchangedCta })).toBeDisabled();
  expect(screen.getByText(/nothing has changed/i)).toBeInTheDocument();
});

it("offers Stop only while a run is pending", () => {
  const { rerender } = render(<TuningPanel state={pendingState} />);
  expect(screen.getByRole("button", { name: deckTuningCopy.panel.stop })).toBeInTheDocument();
  rerender(<TuningPanel state={okState} />);
  expect(screen.queryByRole("button", { name: deckTuningCopy.panel.stop })).not.toBeInTheDocument();
});

it("renders the interrupted failure with its own copy", () => {
  render(<TuningPanel state={interruptedState} />);
  expect(screen.getByText(deckTuningCopy.failure.interrupted.tag)).toBeInTheDocument();
});

it("announces once per settle, not once per intermediate state", async () => {
  render(<TuningPanel state={pendingState} />);
  const live = screen.getByRole("status");
  expect(live).toHaveTextContent(deckTuningCopy.announce.started);
  // advance the manifest through all four steps
  expect(live.textContent?.match(/read/g) ?? []).toHaveLength(0);
});

it("opens at zero games rather than gating", () => {
  // No gate at zero games: the primary is enabled, and the panel says the
  // suggestions will come from the list alone. Copy per the addendum.
  render(<TuningPanel state={{ ...fresh, gameCount: 0 }} />);
  expect(screen.getByRole("button", { name: deckTuningCopy.panel.readyCta })).toBeEnabled();
});
```

- [ ] **Step 2: Run them to verify they fail, then build the panel**

Six states driven off `TuningState` plus `gateReason`. Never render a percentage or a net figure; every count carries its denominator; a disabled primary always shows why beside it.

- [ ] **Step 3: Run the tests and commit**

```bash
pnpm test src/components/decks/tuning-panel.test.tsx
git add src/components/decks/tuning-panel.tsx src/components/decks/tuning-panel.test.tsx
git commit -m "feat(tuning): the tuning panel across all six states"
```

---

### Task 15: The suggestion card and its verdicts

**Files:**
- Create: `src/components/decks/suggestion-card.tsx`
- Modify: `src/app/decks/tuning-actions.ts` (adds `applySuggestion`, `undoSuggestion`, `dismissSuggestion`, `restoreSuggestion`)
- Test: `src/components/decks/suggestion-card.test.tsx`, additions to `src/app/decks/tuning-actions.test.ts`

**Interfaces:**
- Consumes: `deckTuningCopy.card` (Task 2); `formatCents` (`src/lib/decks/price.ts:111-116`); `statusPill` (`src/lib/decks/status.ts`); the item rows from Task 12.
- Produces:
  ```typescript
  export function applySuggestion(itemId: string): Promise<DeckMutationResult>;
  export function undoSuggestion(itemId: string): Promise<DeckMutationResult>;
  export function dismissSuggestion(itemId: string): Promise<DeckMutationResult>;
  export function restoreSuggestion(itemId: string): Promise<DeckMutationResult>;
  ```

**Design table rows to satisfy:** S5 states 1–6, the persistence row, and the candidate-not-shown row. Apply/dismiss tap floor **44px mobile, 32px desktop**, and **apply is never adjacent to a destructive control** — the dismiss control must not sit beside it in the tap order.

- [ ] **Step 1: Write the failing action tests**

```typescript
it("applies a pair as one transaction — the cut leaves and the add arrives together", async () => {
  // Assert both deck_cards changes and the item verdict land, or none do.
});

it("refuses to apply twice", async () => {
  // Second call on an already-accepted item returns ok:false with applyRefused.
});

it("undoes a pair back to exactly the prior deck", async () => {
  // The cut returns at its prior quantity and the add is gone.
});

it("keeps a dismissed suggestion restorable", async () => {
  // dismiss then restore returns the item to 'pending'.
});
```

The apply path must reuse the existing row-locking pattern in `addCardToDeck` (`src/app/decks/actions.ts:467`, `select 1 from decks ... for update` at `:495`) rather than inventing a second concurrency approach, and must revalidate through `revalidateClaims(deckId, userId)` (`src/lib/decks/revalidate-claims.ts:18`) the way that action does, not `claimSurfaces` directly.

**Split.** The four actions ship in **PR C**, and their tests are cases in `probe:tuning-run` rather than jsdom tests: "both `deck_cards` changes land or none do" and "undo returns exactly the prior deck" are facts about a transaction. Add them as cases 5–8, with the mutation for each (drop the transaction; skip restoring the cut's prior quantity). The card and its tests ship in **PR D**.

- [ ] **Step 2: Run them to verify they fail, then implement the four actions**

Each writes the item's `verdict` and `verdictAt` and mutates the deck in the same transaction, then revalidates `deckSurfaces(deckId)`.

- [ ] **Step 3: Write the failing card tests**

```typescript
it("cites with the denominator intact and never a percentage", () => {
  render(<SuggestionCard item={itemCitingGames} />);
  expect(screen.getByText(/of 5 games/)).toBeInTheDocument();
  expect(screen.queryByText(/%/)).not.toBeInTheDocument();
});

it("quotes a cited note verbatim", () => {
  render(<SuggestionCard item={itemCitingNote} />);
  expect(screen.getByText(/flooded out on turn six/)).toBeInTheDocument();
});

it("states ownership as a fact, not a ranking", () => {
  render(<SuggestionCard item={unownedItem} />);
  expect(screen.getByText(deckTuningCopy.card.notOwned)).toBeInTheDocument();
});

it("formats an unowned card's price through formatCents", () => {
  render(<SuggestionCard item={{ ...unownedItem, priceCents: 120 }} />);
  expect(screen.getByText(/\$1\.20/)).toBeInTheDocument();
});

it("shows the applied verdict with the shipped status wording", () => {
  render(<SuggestionCard item={appliedItem} built={99} ownedCount={99} />);
  expect(screen.getByText(/Complete/)).toBeInTheDocument();
});

it("stays mounted while applying and keeps the card in place", async () => {
  render(<SuggestionCard item={item} action={pendingForever} />);
  await userEvent.click(screen.getByRole("button", { name: deckTuningCopy.card.apply }));
  expect(screen.getByText(deckTuningCopy.card.applying)).toBeInTheDocument();
  expect(screen.getByText(item.addName)).toBeInTheDocument();
});
```

The status test is why `statusPill` is a dependency: the applied verdict tells the player what their deck is now, and it must say it in the words the rest of the app already uses.

- [ ] **Step 4: Build the card, run the tests, commit**

```bash
pnpm test src/components/decks/suggestion-card.test.tsx src/app/decks/tuning-actions.test.ts
git add src/components/decks/suggestion-card.tsx src/components/decks/suggestion-card.test.tsx src/app/decks/tuning-actions.ts src/app/decks/tuning-actions.test.ts
git commit -m "feat(tuning): suggestion card with apply, undo, dismiss, and restore"
```

---

### Task 16: Mount it — BLOCKED ON DESIGN, placement addendum

**PR D.** Not started until the placement addendum returns and its readiness audit is approved.

The tuning handoff mounts the panel and the intent control on the **Games** tab. It was drawn before the **Analysis** tab existed (#753), which now reads the same Deck Profile the evidence is built from and is where the synopsis (sub-project 6) is headed. (`SynopsisSlot`, `src/components/decks/analysis-panel.tsx:211`, is being removed by the `analysis-tab` lane, so do not plan against it.) Where the panel belongs — Games, Analysis, or split between them — is a design decision, and this plan does not make it.

What the addendum must return, as named asks:

1. **The tab** the panel and the intent control live on, at both widths.
2. **The zero-evidence *Ready* state** and the retirement of S4 state 1 (Task 14).
3. **The allowance's exhausted state**, drawn once for both model features.

What eng already knows about any answer, so the addendum need not solve it:

- **Neither tab has an address.** `BuilderTabs` (`src/components/decks/builder-tabs.tsx:89`) is client state, so the mount cannot be a route loader conditional on the tab. The panel reads through `readTuningPanel` (Task 12) on first open, as the Analysis tab's `peekProfile` does, or the page loads it unconditionally; Task 12 step 4 leaves that choice here.
- **`BuilderShell` is not mounted in jsdom** — `src/lib/decks/builder-tab-specs.ts` says it is too heavy, and no `builder-shell.test.tsx` exists. The mount's test is a `builderTabSpecs` case plus a browser probe that presses the tab (a URL sweep cannot reach a surface a press opens), not a render of the shell.
- **`maxDuration`.** Server actions inherit the invoking route's limit, and `runTuning`'s budget is `MODEL_TIMEOUT_MS` (90s) plus the outcome write. Add `export const maxDuration = 120;` to `src/app/decks/[id]/page.tsx`; precedent `src/app/collection/replace/page.tsx:12`.
- **The shell's owner.** `BuilderTabs` and the Analysis tab's frame are a shared surface (playbook); if the answer is the Analysis tab, the orchestrator sequences the edit.

- [ ] **Step 1: Wire the panel where the addendum says, with the test named above**
- [ ] **Step 2: Run the whole gate and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build
```

---

### Task 17: The contract check

**Files:**
- Create: `scripts/check-tuning.ts`, `scripts/fixtures/tuning-pack.json`
- Modify: `package.json`, `.github/workflows/scryfall-contract.yml` (the "Upstream contract checks" workflow — there is no `upstream-contracts.yml`)

**Interfaces:**
- Consumes: `buildPrompt`, `tuningResponseSchema`, `callModel` with `TUNING_MODEL`, `validateSuggestions`.

**PR C.** Its first run is also the cost measurement: print the response's `usage` and put the figure, and the `MODEL_DAILY_ALLOWANCE` it sets, in PR C's description (see *Cost*).
- Produces: `pnpm check:tuning`.

This is the only place a live API call happens outside a real run. It exists because the model is upstream in exactly the way Scryfall and ManaPool are, and a silent contract change would otherwise sit unnoticed.

- [ ] **Step 1: Write the fixture**

A realistic evidence pack as JSON — a five-game log with two notes, a decklist, a stated intent, a role gap. Committed, so the check is reproducible.

- [ ] **Step 2: Write the script**

Follow the shape of `scripts/check-scryfall-contract.ts`: read the key through `scripts/lib/env.mjs`'s `requireEnv`, accumulate failures rather than throwing on the first, `console.error` the list and `process.exit(1)` if any. Per spec §9 it asserts five things, not two: the reply parses against `tuningResponseSchema`; at least one suggestion survives `validateSuggestions`; the surviving suggestion cites the axis the fixture marks as hurting; its add is inside the fixture commander's colour identity; and its cut is a card the fixture decklist actually contains. A model that starts returning fluent, well-formed, ungrounded answers is exactly the drift a shape-only check would miss. It touches no database.

- [ ] **Step 3: Add the script and the workflow step**

```json
"check:tuning": "tsx scripts/check-tuning.ts"
```

Add a step to `.github/workflows/scryfall-contract.yml`, after `check:spellbook`, with `if: always()` so it runs even when an earlier check fails, gated on a repository variable — `TUNING_CHECK_ENABLED == 'true'` — matching how the price refresh and commander index workflows are gated. Unlike the Scryfall and ManaPool checks, this one costs money per run, so the gate is not optional.

- [ ] **Step 4: Run it locally once and commit**

```bash
pnpm check:tuning
git add scripts/check-tuning.ts scripts/fixtures/tuning-pack.json package.json .github/workflows/scryfall-contract.yml
git commit -m "feat(tuning): daily contract check against the live model"
```

---

### Task 18: Design review and PR

**Files:** none created. This task is the gate. Steps 1–3 are PR D's; steps 4–5 run for **each** of the four PRs, and every PR also runs the `pr-review` §10b pre-open pass before `gh pr create`.

- [ ] **Step 1: Run the design-review skill's verify pass**

Agent 2 against `docs/superpowers/design-tables/deck-tuning.md` and the four new components plus the three modified ones. Both passes: visual properties, and state reachability across S1–S5 including S4's 6e.

- [ ] **Step 2: Fix every gap, then run Agent 3**

Only previously-flagged items. Zero gaps before the PR opens.

- [ ] **Step 3: Write the gap report**

`docs/superpowers/gap-report-deck-tuning-implementation.md`.

- [ ] **Step 4: Full gate, rebase, push, open the PR**

```bash
pnpm typecheck && pnpm lint && pnpm test && DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build
git fetch origin && git rebase origin/main
git push -u origin <branch>
```

PR A's body names the new tables and that `ANTHROPIC_API_KEY` must be set in every Vercel project serving the builder before PR C merges. PR C's body names the durability contract, the five failure classes, the `cancelled` status, and the fact that `ANTHROPIC_API_KEY` must be set in every Vercel project serving the builder before this merges.

- [ ] **Step 5: Copilot review rounds**

Per the `pr-review` skill, including its round and time limits. PR C touches a destructive path (apply and undo mutate the deck), so its merge bar is clean-after-clean on that path.

- [ ] **Step 6: Close out**

Keep `design/design_handoff_the99_deck_tuning/` and the placement addendum — handoffs are kept after a build. The property table and the gap reports stay. Update `docs/superpowers/design-pipeline-status.md` through whoever owns it at the time (the orchestrator sequences that file). Run `feature-acceptance` on PR D and again at the line's close.

---

## Self-Review

**Revision 2026-09-23.** The six changes in the header note are carried into every task, not stated above them: no task imports `PATTERN_MIN`, gates on a game count, reads `DeckDetail` for the evidence, hashes the decklist privately, names a model inside `src/lib/model/`, or counts runs per hour. Paths were checked with `git ls-files` against `origin/main` at `67f29274`. Two questions this revision surfaced and did not answer, because they are Design's: where the panel lives, and what *Ready* says with no games (Tasks 14 and 16).

**Spec coverage.** §4 data model → Task 1. §5 fingerprint, gate, allowance → Tasks 6, 10, 12. §6 reaper, error classes, guarded writes → Tasks 10, 11, 12. §7 pipeline and evidence pack → Tasks 7, 10, 11. §8 validation → Task 9. §9 testing strategy and `check:tuning` → Tasks 9, 17. §11 testing, including both halves of the reaper race → Task 11 Step 5. The note, intent, panel, card, and manifest surfaces → Tasks 3, 4, 5, 13, 14, 15, 16.

**Gaps found and closed during review.** The spec never says where `Stop` writes; Task 11 resolves it with a fourth `status` value rather than overloading `failed`. The spec's error-class table has five entries but reads as four in one place; Global Constraints and Task 2's test both pin it at five. The seeded-intent provenance needed a column the spec does not name; Task 1 adds `intent_seeded`, Task 5 explains why one column covers both states, and Task 5 Step 6 gives it its only writer — without which state 4 would be unreachable.

A pre-implementation code review of this plan found and closed eight further defects, each of which would have cost a task or worse:

- `deck_suggestion_items` declared its card foreign keys as `text`, but `cards.oracleId` is `uuid` — the migration would not have applied. Both columns are now `uuid`.
- `runTuning` enforced neither the fingerprint gate nor the hourly ceiling (now the shared allowance). A server action is a public endpoint, so both are now re-checked server-side through the same `gateReason` the panel uses.
- `DeckDetail` does not carry `intent`. Task 3 Step 6 extends `getDeckDetail` for the intent control; `runTuning` reads the column itself.
- `logGame` takes `LogGameInput`, not `FormData`. Task 3 Step 5 was rewritten against the real signature.
- `TuningItem` was used by Task 15 and defined nowhere, and nothing joined the name, ownership, or price the card renders. Task 12 now defines it and joins them.
- `MODEL_TIMEOUT_MS` armed per attempt plus one retry could reach ~180s against a 120s route limit, orphaning the pending row. It is now one deadline across both attempts.
- The partial index predicate used `${t.status}`, which Drizzle renders table-qualified and Postgres rejects in an index predicate. It is now raw `status = 'pending'`.
- `cancelTuningRun` was scoped to the deck, so a late Stop could cancel a run the player never watched. It now takes the `runId`.

Also corrected: the reaper is scoped to the deck being read rather than sweeping every user's rows on every page load; `gateReason` returns a distinct message per kind rather than one generic refusal; the tuning read cannot join the page's first `Promise.all` because it depends on that call's output; and `check:tuning` asserts §9's five conditions rather than shape alone.

**Type consistency.** `ValidatedSuggestion.addOracleId` (Task 9) matches `deckSuggestionItems.addOracleId` (Task 1). `TuningCitation` is declared once, in `schema.ts`, and imported by `validate.ts` and the card. `ManifestStep`'s four values match `manifestCopy`'s four groups and `readTuningEvidence`'s parameter. `gateReason` returns the same `GateReason` the panel switches on.

**Open decisions carried into implementation.** Two, both Design's and both gating PR D only: the placement addendum's tab, and its zero-evidence *Ready* and allowance states. One number is set by measurement in PR C: `MODEL_DAILY_ALLOWANCE`. Every question the original audit left to eng is answered above: the fifth failure class, `Stop`'s status, the manifest's honesty, the timeout budget, and the intent provenance column.
