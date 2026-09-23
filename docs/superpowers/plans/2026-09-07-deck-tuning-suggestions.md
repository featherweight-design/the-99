# Deck Tuning Suggestions Implementation Plan

> **Revised 2026-09-23 (sub-project 5 of the Deck Analysis Epic).** This plan was written on
> 2026-09-07, paused, and is now rebuilt on what the epic has shipped since. The revision is
> in place rather than a successor file, so there is one plan to read. What moved:
>
> 1. **The evidence pack is assembled FROM the Deck Profile** (`src/lib/profile/**`), not from
>    `DeckDetail`, `computeRoleCounts`, the retired `RECOMMENDED_MIX` or `readSynergyCards`.
>    Play data arrives as a new profile fact group, the one `src/lib/profile/types.ts:12-14`
>    anticipates, attached OUTSIDE the cached document (Task 7). The tuning fingerprint is
>    built on `listFingerprint` — a new, version-free fingerprint of the player's list added
>    beside `profileFingerprint` in PR A0 — so only the player's own changes read as drift
>    (Task 0, Task 6).
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
> 5. **Split into six PRs, one plan file each** (see *PR boundaries*). PRs A0–C are the whole
>    backend and need no design input. **PR D is BLOCKED ON DESIGN — placement addendum**: the handoff mounts the
>    panel on the Games tab and predates the Analysis tab (#753), so no tab is chosen here.
> 6. **Stale references fixed** against `origin/main` at `67f29274`: line numbers, the
>    workflow file, test files that do not exist, and the migration head (0052).
>
> **Hugh's rulings on this revision, 2026-09-23:**
> - **A suggestion that would move the deck's bracket is SHOWN, FLAGGED** — not dropped and
>   not silent. The app computes the flag with the verdict's own `slotDeck`; the model makes
>   no bracket claim (Task 9b). The flag needs a drawn state, asked of the addendum.
> - **Only a successful answer spends a unit of the allowance.** A failed, timed-out,
>   interrupted or stopped run gives its unit back (Task 10). The accepted cost is in *Cost*.
> - **The allowance window is a rolling 24 hours**, not a fixed daily reset.

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
- **One model run per press.** At most one bounded in-run retry — after an `upstream_busy` or a `malformed` reply, whichever comes first — so at most two HTTP attempts, inside that single run row. A retry never creates a second run.
- **One per-player DAILY allowance, shared with the synopsis.** `MODEL_DAILY_ALLOWANCE` in `src/lib/model/allowance.ts` is the only number; a unit is RESERVED when a run starts (so two concurrent presses cannot both take the last one), becomes SPENT when the run ends `ok`, and is REFUNDED when it ends `failed` — any class, `interrupted` included — or `cancelled` (Hugh, 2026-09-23). A refusal before the call reserves nothing. The window is a rolling 24 hours. Its value is a named placeholder until a call's cost is measured (see *Cost*). An exhausted allowance is a stated state with its own copy and the time it reopens — never a silent failure and never a disabled button without a reason.
- **Three suggestions maximum. Fewer is legitimate** — one well-grounded suggestion beats three padded ones, and zero surviving suggestions is the `ungrounded` outcome, not an error.
- **Six validation rules**, all pure: schema, the card exists, the cut is real, the add is legal (colour identity), the evidence exists, and the nine presentation checks. Every drop increments `dropped_count`.
- **Only the player's changes are drift** (Hugh, 2026-09-23). The fingerprint hashes the list (`listFingerprint`), games, notes, intent and collection stamp, and no version. `PROMPT_VERSION` and `PROFILE_VERSION` are stored as their own columns on each run; a bump reopens the gate under its own reason (`versionMoved`) and never reads as `stale`.
- **The model makes no bracket claim; the app flags a bracket move.** The pack carries no bracket figure and the prompt asks for none — `bracketDelta` has no reachable `[3] → [4]` transition, and a suggestion reasoning about one would cite evidence the app cannot produce. Instead the app computes, per kept suggestion, the deck's permitted brackets with the swap applied, through `slotDeck` itself (Task 9b), and stores the result on the item when it moves. A suggestion that moves the bracket is **shown, flagged** (Hugh, 2026-09-23), never dropped and never silent.

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
| `client.ts` | `callModel({ model, system, user, maxTokens, schema, deadlineMs }, deps?)` — the raw `fetch`, one deadline across both attempts, at most two attempts: one retry after a `429`/`529`/`5xx` or a reply failing the caller's zod schema, not one of each. Returns `{ ok: true, value, usage } \| { ok: false, errorClass: "upstream_busy" \| "timeout" \| "malformed" }`. Knows no feature. |
| `allowance.ts` | `MODEL_DAILY_ALLOWANCE`, `ALLOWANCE_WINDOW_MS`, `AllowanceSpentError`, `reserveModelCall(tx, userId, feature, now)`, `readAllowance(userId, now)` and the pure `allowanceFrom`. The only counter. |

**Pure core — `src/lib/tuning/` (no database, no network, client-safe unless noted):**

| File | Responsibility |
|---|---|
| `prompt-version.ts` | The single `PROMPT_VERSION` integer. Nothing else. |
| `fingerprint.ts` | **Server-only.** `tuningFingerprint(input)` — a hash over `listFingerprint`, the games and notes, the intent and the collection stamp. No version. |
| `evidence.ts` | `buildEvidencePack({ profile, play, intent, owned })` — assembles the pack from a `DeckProfile`. Pure. |
| `prompt.ts` | Renders the evidence pack into the system + user messages. Pure string work. |
| `response-schema.ts` | The zod schema for the model's reply, and the `TuningResponse` type. |
| `validate.ts` | The six validation rules, as pure predicates over a candidate plus the pack. |
| `presentation.ts` | The nine `suggestionRules` checks — the sixth validation rule. |
| `bracket-shift.ts` | `bracketAfter(...)` — the deck's permits with a swap applied, through `slotDeck`. The bracket flag (Hugh, 2026-09-23). |
| `state.ts` | `TuningState` and `TuningItem` — types only, so `gate.ts` and the panel compile without the server read. |
| `run-store.ts` | **Server-only.** `finishRun`, `persistRun`, `ErrorClass` — the guarded outcome writes, importable by the probe. |
| `gate.ts` | `gateReason(state)` and the `GateReason` type — the one answer to "why is the button disabled", shared by the panel and by `runTuning`. No game count. |
| `reaper.ts` | `reapCutoff(now)` and the pure arithmetic behind the read-time reap. |
| `limits.ts` | `TUNING_MODEL`, `TUNING_MAX_TOKENS`, `REAPER_CUTOFF_MS`, `MODEL_TIMEOUT_MS`, `MAX_SUGGESTIONS`, plus `intentRefusal(intent)` and `seededIntent(commanderName)`. |

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
| `.github/workflows/tuning-contract.yml` | New, daily, gated on `TUNING_CHECK_ENABLED`, with `ANTHROPIC_API_KEY` as a secret. Not a step in `scryfall-contract.yml`, whose header promises "no database, no secrets". |

---

## PR boundaries

Six PRs, merged in order, none stacked: each branches from `main` after the previous one merges, and each stays under ~20 files. A0 through C are the whole backend and need no design input; D waits for the placement addendum. **Each PR's tasks live in their own file**, so no plan file passes the ~600-line ceiling a reviewer can read:

| PR | File | Tasks | Contents | Files (approx.) |
|---|---|---|---|---|
| **A0 — `listFingerprint`** | [`2026-09-23-deck-tuning-pr-a0.md`](2026-09-23-deck-tuning-pr-a0.md) | 0 | One additive function beside `profileFingerprint`, and its tests. Ownership granted for this PR alone; the `analysis-tab` lane consumes it too. | 2 |
| **A — schema and the shared client** | [`2026-09-23-deck-tuning-pr-a.md`](2026-09-23-deck-tuning-pr-a.md) | 1, 10 | Schema + generated migration, `src/lib/model/client.ts` + `allowance.ts` and tests, schema shape test, `ANTHROPIC_API_KEY` docs. | ~12 |
| **B1 — inputs** | [`2026-09-23-deck-tuning-pr-b1.md`](2026-09-23-deck-tuning-pr-b1.md) | 2, 5a, 6, 7 | The copy keys pure code and refusals read (intent included), `limits.ts`, the tuning fingerprint, the play group + the `play` key on `types.ts` (ownership sequenced by the orchestrator), the evidence pack. | ~12 |
| **B2 — the decision core** | [`2026-09-23-deck-tuning-pr-b2.md`](2026-09-23-deck-tuning-pr-b2.md) | 8, 9, 9b (pure), 11 (reaper), 12 (state + gate) | Prompt, response schema, presentation + validation, the bracket flag's pure function, `reaper.ts`, `state.ts`, `gate.ts`. No database, no route. | ~14 |
| **C — the server shell** | [`2026-09-23-deck-tuning-pr-c.md`](2026-09-23-deck-tuning-pr-c.md) | 3 step 6, 5, 9b (reads), 11, 12 (read), 13 (action), 15 (actions), 17 | `tuning-actions.ts`, `run-store.ts`, `tuning-read.ts` with `tuningInputs`, `DeckDetail.intent`, seeding in `createDeck` and `fillDeck`, `probe:tuning-run`, `check:tuning` + its workflow. Callable end to end from a probe; nothing mounted. | ~14 |
| **D — the surfaces** | [`2026-09-23-deck-tuning-pr-d.md`](2026-09-23-deck-tuning-pr-d.md) | 2 (component keys), 5 (component), 13 (component), 14, 15 (card), 16, 18 | **BLOCKED ON DESIGN — placement addendum.** Four components and tests, the mount, `maxDuration`. | ~14 |

Tasks 3 (steps 1–5) and 4 shipped on 2026-09-13 (the game note) and are not repeated; git history holds them.

The About entry is not in D: this is a multi-round line, and its entries batch at the end of the launch (`AGENTS.md`, *Design pipeline*). The line's plan names that task; D's close-out confirms it is still named.

---

## Cost

**Calls per run.** One model run per press. That run makes **one HTTP request normally, two at most** — the second only after a `429`/`529`/`5xx` or a reply that fails the schema. A timeout is not retried. A refusal at the gate (unchanged inputs, run in flight, allowance spent) makes **zero**. The bracket flag (Task 9b) is computed in the app — one combo read per kept suggestion, no model call.

**Worst case per player per day.** `MODEL_DAILY_ALLOWANCE` SUCCESSFUL runs, across tuning and the synopsis together, so at most `2 × MODEL_DAILY_ALLOWANCE` HTTP requests for answers the player received.

**What that does not bound, accepted by ruling.** A failed run refunds its unit (Hugh, 2026-09-23), and a failed run does not consume the fingerprint gate (spec §6), so a player facing a flaky upstream can press `Try again` repeatedly and each press costs up to two paid requests with no allowance cost. What bounds it is the player's own presses — one run in flight per deck, each held for up to `MODEL_TIMEOUT_MS` — and nothing else. On a personal-use app that is a fair trade for not charging a player for our upstream's failure. If measured spend ever says otherwise, the lever is a hidden per-day attempt ceiling in `allowance.ts`, counted from the same ledger (every reservation row, refunded or not), without touching the player-facing rule.

**Per-call size, to measure rather than assert.** The pack carries ~100 card rows (name, type line, roles), up to the skeleton's staples, the role and land targets, the games with their notes, and the intent. The first `check:tuning` run in PR C records the request's `usage.input_tokens` / `usage.output_tokens` from the response, and **that figure sets `MODEL_DAILY_ALLOWANCE`**: the constant ships in PR A as a named placeholder (`5`) with a comment pointing here, and PR C's description states the measured tokens and the value chosen. The run count is what a player sees; the token figure is what makes it a budget.

**The conversion rule, fixed now so the number is not a guess later.** `MODEL_DAILY_ALLOWANCE = floor(B / (2 × c))`, where `c` is one attempt's measured cost (input and output tokens at `TUNING_MODEL`'s list price) and `2 ×` is the retry worst case, so the allowance holds even if every successful run needed its retry. `B` is the per-player daily spend Hugh is willing to carry across tuning and the synopsis together — **a product number, asked of Hugh in PR C** with the measured `c` in hand, not chosen here. The synopsis's calls are smaller or larger; when its plan measures them, `c` becomes the larger of the two, so one number stays safe for both.

---

## Self-Review

**Revision 2026-09-23.** The six changes in the header note are carried into every task, not stated above them: no task imports `PATTERN_MIN`, gates on a game count, reads `DeckDetail` for the evidence, hashes the decklist privately, names a model inside `src/lib/model/`, or counts runs per hour. Paths were checked with `git ls-files` against `origin/main` at `67f29274`. Two questions this revision surfaced and did not answer, because they are Design's: where the panel lives, and what *Ready* says with no games (Tasks 14 and 16).

**Orchestrator review, 2026-09-23 (REWORK → applied).** A list-only `listFingerprint` (PR A0) replaces `profileFingerprint` as the drift signal, with both versions stored as columns; one `tuningInputs` serves both call sites; PR B split into B1/B2; the intent keys moved into B1; `createDeck` seeds as well as `fillDeck`; apply/undo call `touchDeck` and `pruneOrphanProxies`, snapshot the cut and add rows, and a cut is one copy; the plan split into this index plus one file per PR; the presentation tests take `notes`; every path that never reaches a call refunds its unit; state 5's primary is enabled as drawn; `TUNING_MAX_TOKENS` is listed; the mount is neutral. Copilot's round 1 is folded in too: the collection stamp in the fingerprint, every non-2xx classed, 99-only role counts against measured targets, the 64-bit lock, the budget conversion rule, and the spec's §4 and §11.

**Spec coverage.** §4 data model → Task 1. §5 fingerprint, gate, allowance → Tasks 6, 10, 12. §6 reaper, error classes, guarded writes → Tasks 10, 11, 12. §7 pipeline and evidence pack → Tasks 7, 10, 11. §8 validation → Task 9. §9 testing strategy and `check:tuning` → Tasks 9, 17. §11 testing, including both halves of the reaper race → Task 11 Step 5. The note, intent, panel, card, and manifest surfaces → Tasks 3, 4, 5, 13, 14, 15, 16.

**Gaps found and closed during review.** The spec never says where `Stop` writes; Task 11 resolves it with a fourth `status` value rather than overloading `failed`. The spec's error-class table has five entries but reads as four in one place; Global Constraints and Task 2's test both pin it at five. The seeded-intent provenance needed a column the spec does not name; Task 1 adds `intent_seeded`, Task 5 explains why one column covers both states, and Task 5 Step 6 gives it its only writer — without which state 4 would be unreachable.

A pre-implementation code review of this plan found and closed eight further defects, each of which would have cost a task or worse:

- `deck_suggestion_items` declared its card foreign keys as `text`, but `cards.oracleId` is `uuid` — the migration would not have applied. Both columns are now `uuid`.
- `runTuning` enforced neither the fingerprint gate nor the hourly ceiling (now the shared allowance). A server action is a public endpoint, so both are now re-checked server-side through the same `gateReason` the panel uses.
- `DeckDetail` does not carry `intent`. Task 3 Step 6 extends `getDeckDetail` for the intent control; `runTuning` reads the column itself.
- `logGame` takes `LogGameInput`, not `FormData`. Task 3 Step 5 was rewritten against the real signature.
- `TuningItem` was used by Task 15 and defined nowhere, and nothing joined the name, ownership, or price the card renders. Task 12 now defines it and joins them.
- `MODEL_TIMEOUT_MS` armed per attempt plus one retry could reach ~180s against a 120s route limit, orphaning the pending row. It is now one deadline across both attempts.
- ~~The partial index predicate used `${t.status}`, which Drizzle renders table-qualified and Postgres rejects.~~ Withdrawn at the 2026-09-23 revision: a qualified predicate is accepted, and `drizzle/0023` applied one. The predicate uses `${t.status}`, following `printings_flavor_name_idx`.
- `cancelTuningRun` was scoped to the deck, so a late Stop could cancel a run the player never watched. It now takes the `runId`.

Also corrected: the reaper is scoped to the deck being read rather than sweeping every user's rows on every page load; `gateReason` returns a distinct message per kind rather than one generic refusal; the tuning read cannot join the page's first `Promise.all` because it depends on that call's output; and `check:tuning` asserts §9's five conditions rather than shape alone.

**Type consistency.** `ValidatedSuggestion.addOracleId` (Task 9) matches `deckSuggestionItems.addOracleId` (Task 1). `TuningCitation` is declared once, in `schema.ts`, and imported by `validate.ts` and the card. `ManifestStep`'s four values match `manifestCopy`'s four groups and `readTuningEvidence`'s parameter. `gateReason` returns the same `GateReason` the panel switches on.

**Open decisions carried into implementation.** Two, both Design's and both gating PR D only: the placement addendum's tab, and its zero-evidence *Ready* and allowance states. One number is set by measurement in PR C: `MODEL_DAILY_ALLOWANCE`. Every question the original audit left to eng is answered above: the fifth failure class, `Stop`'s status, the manifest's honesty, the timeout budget, and the intent provenance column.
