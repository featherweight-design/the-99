# Deck tuning — PR C — the server shell

> Part of the deck tuning plan. **Read the index first:** [`2026-09-07-deck-tuning-suggestions.md`](2026-09-07-deck-tuning-suggestions.md) — the Global Constraints, File Structure, PR boundaries and Cost there apply to every task below. Task numbers are shared across all six files.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Build amendments (PR C, 2026-09-23)

What the build changed from the text below, and why. The text is left as written so the
reasoning stays readable; these override it.

1. **The transactions live where a probe can call them.** `startRun` (the reservation and the
   pending row), `saveIntent`, `finishRun`, `persistRun` and `cancelRun` are in
   `src/lib/tuning/run-store.ts`; apply, undo, dismiss and restore are in
   `src/lib/tuning/verdicts.ts`. Each takes the reader's id. `tuning-actions.ts` adds only the
   session and the revalidation. The writers return whether they wrote, and the action
   revalidates only then, rather than taking a `deckId` they never used for the write.
2. **`isUniqueViolation` is `src/lib/db-error.ts`'s,** not a new one. The one written below reads
   `err.code`, which Drizzle's wrapper leaves undefined: `probe:tuning-run` case 3 found that a
   second press threw instead of being refused. The shared helper walks `cause`.
3. **Case 11 is in `actions.test.ts`,** not the probe. `createDeck` and `fillDeck` need a session
   and an EDHREC fetch, which a database probe cannot supply; the stubbed describe records the
   inserts and updates the seeding makes, and both mutations fail it.
4. **The bracket flag's `after` is built from the head `tuningInputs` read** (the same snapshot the
   fingerprint hashes), with one copy of the cut out and one of the add in.
5. **`check:tuning` resolves names through Scryfall's `/cards/named`,** the database-free
   equivalent of the catalog read a run makes, and takes `--dry-run`. Its fixture is a real
   99-card deck read from staging (read-only), with five synthetic games, two notes and an intent.
6. **No live call yet.** Hugh confirmed `TUNING_MODEL` on 2026-09-23. `MODEL_DAILY_ALLOWANCE`
   stays at its placeholder until `check:tuning` has run live once, behind its workflow's
   `TUNING_CHECK_ENABLED` flag; the measured usage and the value it sets follow then.
7. **Copy owed to `/copy-review`:** `intent.seededBrief`, `intent.tooLong`, `intent.refused`,
   `run.refused` and the three `card.*Refused` strings are eng-written placeholders.

---

### Task 3 (step 6 only): `DeckDetail.intent` — PR C

Steps 1–5 (the game note) shipped 2026-09-13.

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

### Task 5: Deck intent

**Split.** `limits.ts` ships in **PR B1** as Task 5a (the pure core reads it). Steps 1–3's action and step 6's seeding ship in **PR C**. Steps 4–5, the component, ship in **PR D** and are **BLOCKED ON DESIGN** only as far as where the chip sits; its four states are drawn.

**Files:**
- Create: `src/components/decks/deck-intent.tsx` (PR D)
- Modify: `src/app/decks/tuning-actions.ts` (create the file here, with `saveDeckIntent` as its first action)
- Test: `src/components/decks/deck-intent.test.tsx` (PR D)

**Interfaces:**
- Consumes: `decks.intent` / `decks.intentSeeded` from Task 1; `deckTuningCopy.intent` from Task 2.
- Produces: `saveDeckIntent(deckId: string, formData: FormData): Promise<DeckMutationResult>`, and the `DeckIntent` component. The evidence pack (Task 7) takes the intent `runTuning` reads.

**Design table rows to satisfy:** S3 states 1–4 plus the chip-removed transition.

- [ ] **Step 1: Add the failing probe cases** (in `scripts/probe-tuning-run.mts`)

`intentRefusal` is unit-tested in Task 5a. What is left is what the database holds, so it is two probe cases:

10. **Saving an intent flips `intent_seeded` to false**, and a save over the cap writes nothing. Mutation: drop `intentSeeded: false` from the update.
11. **A deck `createDeck` fills is born seeded**, and `fillDeck` seeds only a deck with no intent. Mutation: remove the seed from `createDeck`'s insert.

- [ ] **Step 2: Run the probe to verify both fail**

- [ ] **Step 3: Write the action**

`limits.ts`, with `intentRefusal` and `seededIntent`, shipped in PR B1 (Task 5a). The action:


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

- [ ] **Step 6: Seed the intent where the app builds a deck**

Without a writer of `intentSeeded: true`, state 4 is dead code. **Two paths build a deck on the player's behalf, and both seed:**

- **`createDeck`** (`src/app/decks/actions.ts:248`) — the MAIN path. A new deck built from a commander is filled in its creating transaction and inserted with `filled: true` (`:351`). Seed in the same insert: `intent: seededIntent(commanderName), intentSeeded: true`, so no deck is ever born filled and unseeded.
- **`fillDeck`** (`:660`) — filling an existing deck (`:719` sets `filled`). Inside its transaction, and only when `decks.intent` is null:

```typescript
if (deck.intent === null) {
  await tx.update(decks)
    .set({ intent: seededIntent(commanderName), intentSeeded: true })
    .where(eq(decks.id, deckId));
}
```

`seededIntent` lives in `src/lib/tuning/limits.ts` beside `intentRefusal` so the two caps are enforced in one place, and it must return a string of at most `deckTuningCopy.intent.maxLength` code points. Test it at the boundary with the longest commander name in the catalog, not a short one.

Only a fill seeds. A deck the player built card by card has no app-authored intent to disclose, and inventing one would put words in their mouth — which is exactly what the seeded chip exists to be honest about.

- [ ] **Step 7: Run the probe and commit**

```bash
pnpm probe:tuning-run   # against local-dev
git add src/app/decks/actions.ts src/app/decks/tuning-actions.ts scripts/probe-tuning-run.mts
git commit -m "feat(tuning): save and seed the deck intent"
```

---

### Task 9b (continued): The bracket flag's reads — PR C

> **Amended (B2 amendment 5):** read no add facts and no `combosAfter`. For each kept suggestion,
> build the post-swap profile with `loadDeckProfileFromHead({ ...head, cards: swapped })` (the
> cut's row decremented, the add's incremented) and pass it as `after` beside the run's own
> profile as `before`. At most three builds per run; say so in the Cost section's figures.

The pure function and its interface: Task 9b in the PR B2 file.

- [ ] **Step 3 (PR C): Compute it in `runTuning`**

After `validateSuggestions`, for each kept suggestion: read the add's facts (`cards.game_changer` and `loadBracketFlags`, `src/lib/bracket/flags-read.ts:45` — the reads `load.ts` already uses), read `combosAfter` through `loadAssembledCombos` over the post-swap id set, and set `ValidatedSuggestion.bracketAfter` from `bracketAfter(...)`. `declared` is the deck's `declared_bracket`, read beside the intent. At most three suggestions, so at most three combo reads, and none when the pack's kept list is empty.

**The drawn state is owed by the addendum** (Task 16, ask 4): the card needs a line for "this swap would take the deck to bracket N", at both widths.

---

### Task 11 (continued): `runTuning`, the guarded writes, and the probe — PR C

Files and interfaces: Task 11 in the PR B2 file. `reaper.ts` is already on `main`.

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

export async function runTuning(deckId: string, opts: { anyway?: boolean } = {}): Promise<DeckMutationResult> {
  const userId = await requireUserId();

  // 0. The inputs, through the ONE function readTuningPanel also calls (Task 6), so
  //    the panel and this action cannot disagree about "nothing changed".
  const inputs = await tuningInputs(deckId, userId);
  if (!inputs) return { ok: false, message: deckTuningCopy.panel.refused };
  const { games, intent, declared, fingerprint } = inputs;

  // 1. The same gate the panel shows, enforced server-side. `anyway` is the drawn
  //    `Suggest again anyway` (design table S4 state 5): it passes `unchanged` and
  //    nothing else. gateReason is the
  //    single source of that answer (Task 12), so the disabled button and the
  //    refusal can never disagree. No game count enters it.
  const state = await readTuningState(deckId, userId, fingerprint);
  const gate = gateReason(state);
  if (gate && !(gate.kind === "unchanged" && opts.anyway)) return { ok: false, message: gate.message };

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
        deckId, userId, inputFingerprint: fingerprint, modelCallId: unit.id,
        model: TUNING_MODEL, promptVersion: PROMPT_VERSION, profileVersion: PROFILE_VERSION, status: "pending",
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

  // 3. Everything after the reservation is in ONE try. A throw anywhere — the profile
  //    read, the ownership read, a missing key — fails the run and refunds its unit, so
  //    no unit is ever spent on a call that was never made (orchestrator review, 2026-09-23).
  //    Everything after this point writes conditionally.
  try {
    const profile = await cachedDeckProfile(deckId, userId);
    if (!profile) return finishRun(runId, deckId, { status: "failed", errorClass: "upstream_busy" });
    const play = buildPlayGroup(games);
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
      .select({ oracleId: cards.oracleId, name: cards.name, colorIdentity: cards.colorIdentity, commanderLegal: cards.commanderLegal })
      .from(cards)
      .where(inArray(cards.name, names));
    const byName = new Map(rows.map((r) => [r.name, r]));
    const resolveName = (name: string) => byName.get(name) ?? null;

    const { kept, droppedCount } = validateSuggestions({ response: outcome.value, pack, resolveName });
    if (kept.length === 0) {
      return finishRun(runId, deckId, { status: "failed", errorClass: "ungrounded", droppedCount });
    }
    // The bracket flag (Task 9b). Shown, never dropped.
    const flagged = await withBracketAfter(profile, declared, kept);

    // 4. Items and outcome in one transaction, both guarded.
    return persistRun(runId, deckId, flagged, droppedCount);
  } catch (err) {
    await finishRun(runId, deckId, { status: "failed", errorClass: "upstream_busy" });
    throw err;
  }
}
```

`readDeckIntent` reads `decks.intent` and `decks.declared_bracket` in one row, scoped by `user_id`; `withBracketAfter` is Task 9b step 3; `readOwnedOracleIds` is one `collection_items` read over the given ids. Both live in `tuning-read.ts`. `cachedDeckProfile` is the loader the Analysis tab's press already warms (`src/lib/profile/load.ts:577`), so a player who analysed the deck first pays nothing for the deck half here. Its key is the profile fingerprint, so a card edited since the analysis reads a fresh profile rather than a stale one.

Both writers share one shape. `finishRun` writes an outcome and no items; `persistRun` writes the items and the outcome together. They live in **`src/lib/tuning/run-store.ts`** (server-only, not a `"use server"` module), exported, so the probe can call the real functions: exported from `tuning-actions.ts` they would become public server actions taking an arbitrary `runId`. `ErrorClass` is declared there beside them — `ModelErrorClass | "ungrounded" | "interrupted"`, the five values the column's check allows:

```typescript
export type ErrorClass = ModelErrorClass | "ungrounded" | "interrupted";

class RunSupersededError extends Error {}

export async function finishRun(
  runId: string,
  deckId: string,
  set: { status: "failed"; errorClass: ErrorClass; droppedCount?: number },
): Promise<DeckMutationResult> {
  // A failed run gives its unit back (Hugh, 2026-09-23), in the same transaction as
  // the outcome, so the two can never disagree.
  const written = await db.transaction(async (tx) => {
    const rows = await tx.update(deckSuggestionRuns)
      .set(set)
      .where(and(eq(deckSuggestionRuns.id, runId), eq(deckSuggestionRuns.status, "pending")))
      .returning({ callId: deckSuggestionRuns.modelCallId });
    for (const r of rows) await settleModelCall(tx, r.callId, "refunded");
    return rows;
  });
  // Superseded: the player has already been shown a settled state — and whoever
  // superseded it settled the unit. Return quietly and do not revalidate.
  if (written.length === 0) return { ok: true };
  for (const path of deckSurfaces(deckId)) revalidatePath(path);
  return { ok: true };
}

export async function persistRun(
  runId: string, deckId: string, kept: ValidatedSuggestion[], droppedCount: number,
): Promise<DeckMutationResult> {
  try {
    await db.transaction(async (tx) => {
      const written = await tx.update(deckSuggestionRuns)
        .set({ status: "ok", droppedCount })
        .where(and(eq(deckSuggestionRuns.id, runId), eq(deckSuggestionRuns.status, "pending")))
        .returning({ callId: deckSuggestionRuns.modelCallId });
      // Zero rows means the reaper or a Stop got here first. Throwing rolls the
      // items back with it, so a superseded run can never leave items behind.
      if (written.length === 0) throw new RunSupersededError();
      await tx.insert(deckSuggestionItems).values(kept.map((s) => ({ ...s, runId })));
      // The only path that spends a unit: an answer the player will see.
      await settleModelCall(tx, written[0].callId, "spent");
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
  await db.transaction(async (tx) => {
    const rows = await tx.update(deckSuggestionRuns)
      .set({ status: "cancelled" })
      .where(and(
        eq(deckSuggestionRuns.id, runId),
        eq(deckSuggestionRuns.deckId, deckId),
        eq(deckSuggestionRuns.userId, userId),
        eq(deckSuggestionRuns.status, "pending"),
      ))
      .returning({ callId: deckSuggestionRuns.modelCallId });
    // A Stop is not an answer: its unit comes back.
    for (const r of rows) await settleModelCall(tx, r.callId, "refunded");
  });
  for (const path of deckSurfaces(deckId)) revalidatePath(path);
  return { ok: true };
}
```

It takes the `runId` the panel was watching, not just the deck. Scoped to the deck alone, a Stop pressed late — after the watched run settled and the player started another — would cancel the second run instead of the one whose button they pressed. The panel has the id; pass it.

Stop needs no new concurrency primitive — it is the reaper's mechanism fired by hand. A cancelled run is not a failure, so `failed` keeps meaning failure; and because the fingerprint gate only matches **successful** runs, a cancel does not consume the gate.

- [ ] **Step 5: Prove the durability contract against a real Postgres — `pnpm probe:tuning-run`**

Every rule in this task is a fact about what a transaction wrote, which no jsdom test here can reach; a stub that records statements proves the text was issued and nothing about the lock or the guard. So the race cases are a probe, in the repo's convention (`probe:claims`, `probe:score-lock`): `scripts/probe-tuning-run.mts`, a per-run `user_id`, every fixture deleted in a `finally`, each cleanup step on its own. It calls the real `finishRun` / `persistRun` (from `run-store.ts`) and `reserveModelCall`, and stubs only the model (through `callModel`'s injected `fetch`).

Four cases, each written so a mutation fails it:

1. **The reaper got there first.** A run row flipped to `failed`/`interrupted`, then the success path writes `ok`. The row still reads `failed`/`interrupted` and no items exist. Mutation: drop the `status = 'pending'` guard from `persistRun`.
2. **The player pressed Stop.** Same shape with the row `cancelled`. `cancelled` survives. Mutation: the same guard, on `finishRun`.
3. **A second concurrent run on one deck** is refused by the partial index (23505), and the loser holds no allowance unit — the unit and the row share the transaction. Mutation: move the reservation out of the pending-row transaction, and the loser keeps a unit it never spent.
4. **Two presses on two decks race for one player's last allowance unit**, started together on two connections; exactly one reserves. Mutation: remove the advisory lock (it fails on every run, as `probe:arrivals`'s lock case does).
9. **Only an answer spends a unit.** After an `ok` run the unit reads `spent`; after a `failed` run, a Stop, and a reaped run it reads `refunded` and the allowance's `used` is back where it was. Mutation: settle `spent` in `finishRun`.

Point it at `local-dev` or a scratch Neon branch, **never production**. The script's `report()` counts its own failures and `process.exit` runs after the `finally`, not inside it — the trap three earlier probes fell into.

- [ ] **Step 6: Run the suite and commit**

```bash
pnpm test src/lib/tuning/reaper.test.ts
PROBE against local-dev: pnpm probe:tuning-run
git add src/app/decks/tuning-actions.ts src/lib/tuning/run-store.ts scripts/probe-tuning-run.mts package.json
git commit -m "feat(tuning): durable run lifecycle with a reaper, a cancel, and guarded writes"
```

---

### Task 12 (continued): the read — PR C

Types and the gate: Task 12 in the PR B2 file.

- [ ] **Step 3: Write `readTuningState`**

It reaps on the way past, in one statement, before reading — **scoped to this deck**:

```sql
update deck_suggestion_runs set status = 'failed', error_class = 'interrupted'
where deck_id = :deckId and status = 'pending' and created_at < :cutoff
returning model_call_id
```

and refunds each returned unit through `settleModelCall` in the same transaction — an interrupted run is a failure, and a failure gives its unit back. The spec's §6 writes this unscoped. Scoping it to the deck being read changes nothing about the contract — every deck's read reaps its own — and one player opening a deck no longer writes across other players' rows.

Then it reads: the newest run for the deck with its items ordered by `position`, and the newest ok run's `prompt_version` / `profile_version` against `PROMPT_VERSION` / `PROFILE_VERSION` for `versionMoved`, joined to `cards` for the add and cut names and type lines and to the collection and price tables for `owned` / `ownedQuantity` / `priceCents`; the newest run with `status = 'ok'` for `lastOkFingerprint` / `lastOkAt`; the game count; and `readAllowance(userId, now)`.

- [ ] **Step 4: Write `readTuningPanel`**

The one server action a surface calls to draw the panel. It exists because **the Analysis tab has no address** — `BuilderTabs` is client state, so no route loader can be conditional on the panel being visible, and loading the tuning state on every deck-page render would pay for a read most visits never draw. The action calls `tuningInputs` — the same function `runTuning` calls — then returns `readTuningState`. It never builds the profile. `requireUserId` first; a deck the reader does not own reads as null.

Whether PR D calls this on tab open (as `peekProfile` does for the stored analysis) or the route loads it unconditionally is D's decision, made once the addendum says where the panel lives.

- [ ] **Step 5: Run the suite and commit**

```bash
pnpm test src/lib/tuning && pnpm typecheck
git add src/lib/tuning/gate.ts src/lib/tuning/gate.test.ts src/lib/decks/tuning-read.ts src/app/decks/tuning-actions.ts
git commit -m "feat(tuning): read-time reaper, the fingerprint gate, and the shared allowance"
```

---

### Task 13 (partial): `readTuningEvidence` — PR C

The manifest's interface: Task 13 in the PR D file.

- [ ] **Step 3: Add `readTuningEvidence`**

Four cheap authorised reads — game count, note count, decklist size, whether an intent is set — one per step. The panel calls them in sequence so each tick lands on a read that actually finished, producing a truthful `3 of 4 read`. `runTuning` then rebuilds the pack server-side from scratch: the manifest is disclosure, not input, and the run must not trust anything the client assembled.

The duplicated reads are cheap and the honesty is the feature. Do not "optimise" this into one call that ticks all four rows at once — that produces a progression the player did not actually watch happen.

---

### Task 15: The suggestion card and its verdicts

**Files:**
- Create: `src/components/decks/suggestion-card.tsx`
- Modify: `src/app/decks/tuning-actions.ts` (adds `applySuggestion`, `undoSuggestion`, `dismissSuggestion`, `restoreSuggestion`)
- Test: `src/components/decks/suggestion-card.test.tsx` (PR D); probe cases 5–8 in `scripts/probe-tuning-run.mts` (PR C)

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

- [ ] **Step 1: Write the failing probe cases** (in `scripts/probe-tuning-run.mts`, PR C)

5. **Apply is one transaction** — the cut leaves, the add arrives and the verdict lands, or none do. Mutation: split the writes across two transactions and fail the second.
6. **Apply refuses twice** — a second call on an accepted item returns `ok: false` and changes no `deck_cards` row. Mutation: drop the `verdict = 'pending'` guard.
7. **Undo returns exactly the prior deck** — the cut's row at its snapshotted quantity, `auto` flag and proxy mark; the add's row back to its snapshotted quantity (gone when that was 0). Fixture: a cut card held at 2 copies, `auto: true`, proxied, so a restore that approximates any of the three fails. Mutation: restore the cut at quantity 1 with `auto: false`.
8. **Dismiss then restore** returns the item to `pending` with the deck untouched.

**What a cut and an add ARE.** A cut removes ONE copy — the same rule `removeCardFromDeck` applies (`src/app/decks/actions.ts:606`): decrement a multiple, delete the row at zero. An add inserts one copy at `auto: false` (the player chose it), or increments a row the deck already holds. Commanders are never cut; validation drops that before a suggestion is stored (Task 9).

**Every write a list mutation makes, this makes too.** In the apply transaction and the undo transaction alike: the `for update` on the deck row first, then the `deck_cards` changes, then `pruneOrphanProxies(tx, deckId)` when a cut deleted a row (as `removeCardFromDeck` does), then `touchDeck(tx, deckId)` (`src/lib/decks/touch.ts:74`) — which also raises the `analysis-tab` lane's `dirty` flag, correctly, because applying a suggestion is an edit. Apply writes the `ApplySnapshot` onto the item in the same transaction, before it changes anything, and undo reads it back and clears it.

The apply path must reuse the existing row-locking pattern in `addCardToDeck` (`src/app/decks/actions.ts:467`, `select 1 from decks ... for update` at `:495`) rather than inventing a second concurrency approach, and must revalidate through `revalidateClaims(deckId, userId)` (`src/lib/decks/revalidate-claims.ts:18`) the way that action does, not `claimSurfaces` directly.

**Split.** The four actions ship in **PR C**, and their tests are cases in `probe:tuning-run` rather than jsdom tests: "both `deck_cards` changes land or none do" and "undo returns exactly the prior deck" are facts about a transaction. Those are cases 5–8 above. The card and its tests ship in **PR D**.

- [ ] **Step 2: Run the probe to verify the new cases fail, then implement the four actions**

Each writes the item's `verdict` and `verdictAt` and mutates the deck in the same transaction, then revalidates through `revalidateClaims(deckId, userId)`, which covers `deckSurfaces` and the claim surfaces a deck mutation moves.

---

### Task 17: The contract check

**Files:**
- Create: `scripts/check-tuning.ts`, `scripts/fixtures/tuning-pack.json`
- Modify: `package.json`
- Create: `.github/workflows/tuning-contract.yml`

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

Add `.github/workflows/tuning-contract.yml`: a daily schedule plus `workflow_dispatch`, one job gated on a repository variable — `TUNING_CHECK_ENABLED == 'true'`, matching how the price refresh and commander index workflows are gated — with `ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}` in its env, the secret the `Commander prose` workflow already reads. It is its own workflow rather than a step in `scryfall-contract.yml` (the "Upstream contract checks" workflow; there is no `upstream-contracts.yml`) because that file's header promises "No database, no secrets", and a step there would fail at `requireEnv` on every run. Unlike the Scryfall and ManaPool checks, this one costs money per run, so the gate is not optional.

- [ ] **Step 4: Run it locally once and commit**

```bash
pnpm check:tuning
git add scripts/check-tuning.ts scripts/fixtures/tuning-pack.json package.json .github/workflows/tuning-contract.yml
git commit -m "feat(tuning): daily contract check against the live model"
```

---
