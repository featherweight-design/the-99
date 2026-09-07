# Deck Tuning Suggestions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a deck's logged games, per-game notes, and a stated deck intent into a small set of grounded cut/add suggestions the player can apply in one tap, produced by a single schema-constrained model call whose every claim is verified against the player's own data before it is shown.

**Architecture:** A pure core and a thin shell. Everything that decides — the fingerprint, the evidence pack, the prompt, the response schema, the six validation rules, the presentation checks, the reaper's arithmetic — lives in `src/lib/tuning/*` as pure functions with no database and no network, so the whole decision surface is unit-testable without either. One server action module (`src/app/decks/tuning-actions.ts`) owns the durability contract: a `pending` run row committed in its own transaction before the model call, a partial unique index that makes a second concurrent run impossible, a read-time reaper that fails abandoned rows, and conditional writes on both the success and failure paths so an interrupted run can never overwrite a reaped one. The UI is a panel on the existing builder page that reads its state from the newest run row.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, Tailwind 4, Drizzle ORM 0.45.2 on Neon Postgres, zod 4.4.3, Clerk auth, Vitest 4 + jsdom + Testing Library, pnpm. The model call is a raw `fetch` to `https://api.anthropic.com/v1/messages` — there is no `@anthropic-ai/sdk` in this repo and this plan does not add one, matching the existing integration in `scripts/generate-commander-prose.ts`.

**Spec:** `docs/superpowers/specs/2026-09-07-deck-tuning-suggestions-design.md`

**Design property table:** `docs/superpowers/design-tables/deck-tuning.md` — every component task must satisfy the rows for its component. The table is the deterministic checklist; the design-review skill verifies against it before the PR opens.

**Gap report (eng resolutions):** `docs/superpowers/gap-report-deck-tuning.md`

---

## Global Constraints

Every task's requirements implicitly include this section.

**Presentation rules inherited from #9 (the shipped game log). These are not negotiable and apply to model output as well as to our own strings.**

- **No percentage anywhere.** Not in a suggestion, not in a rationale, not in a citation.
- **No net figure anywhere.** `AxisTally.net` orders and buckets axes; it is never rendered and never enters the evidence pack as a rendered value.
- **Every count carries its denominator.** `2 of 5 games`, never `2 games`.
- **`PATTERN_MIN = 3`** and **`axisCopy`** are imported from `src/lib/copy/game-log.ts` and redefined nowhere. `src/lib/copy/deck-tuning.ts` re-exports them.
- **#9's shipped denominator strings must not be changed.** `1 up`, `3 up · 1 down`, `Mana — 2 up, 2 down.`, `2 marked` stay exactly as they ship today. New copy is additive.
- **Fix above Keep** in any axis ordering the evidence pack or the UI produces.
- **A loss is never `--danger`.**
- **Nothing unmounts mid-write.** A pending mutation keeps its component mounted.
- **A refusal preserves what was typed.** A rejected note or intent is still in the field afterwards.
- **One live-region message per settle**, never one per intermediate state.

**Data and schema.**

- The new game column is **`note`, singular** — `deck_games.note`. `decks.notes` (plural) already exists at `src/db/schema.ts:170` and is a different thing.
- **Note ≤ 140 characters. Intent ≤ 120 characters.** The app-seeded intent string must itself fit inside 120.
- **Five failure classes, not four:** `upstream_busy`, `timeout`, `malformed`, `ungrounded`, `interrupted`. `interrupted` is written by the reaper, never by the run itself.
- **`cancelled` is a fourth `status` value**, alongside `pending`, `ok`, `failed`. A player pressing Stop is not a failure.
- **Runs are kept, never replaced.** The history of runs on a deck is the record.
- **Two constraints do real work:** the partial unique index on `deck_id where status = 'pending'`, and `add_oracle_id` as a foreign key into the card catalog.
- **Both outcome writes are guarded by `where status = 'pending'`.** Zero rows affected means "I was reaped or cancelled" — discard the result silently.

**Model and validation.**

- **Model: `claude-sonnet-4-6`**, recorded per run in `deck_suggestion_runs.model`.
- **One model call per run.** The two in-run bounded retries (`upstream_busy`, `malformed`) happen inside that single run row and do not create a second run.
- **Three suggestions maximum. Fewer is legitimate** — one well-grounded suggestion beats three padded ones, and zero surviving suggestions is the `ungrounded` outcome, not an error.
- **Six validation rules**, all pure: schema, the card exists, the cut is real, the add is legal (colour identity), the evidence exists, and the nine presentation checks. Every drop increments `dropped_count`.
- **`prompt_version`** is a single integer exported from one module. Bumping it invalidates every fingerprint.

**Money and formatting.**

- **`formatCents` at `src/lib/decks/price.ts:109-114` is the only price formatter.** `deckTuningCopy.card.price(amount)` is a pass-through that takes an already-formatted string.

**Client-safety.**

- **A module a `"use client"` component value-imports must never touch the database.** `src/lib/decks/read.ts` imports the Drizzle client, which throws at module init without `DATABASE_URL`. `src/lib/decks/status.ts` exists as a separate module for exactly this reason. Every `src/lib/tuning/*` module except `client.ts` is pure and client-safe; `client.ts` is server-only and is never imported by a client component.

**Workflow.**

- Pre-push gate, every push: `pnpm typecheck && pnpm lint && pnpm test`, plus the stub-DB build (`DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`), then `git fetch origin && git rebase origin/main`.
- Stage files by name — never `git add -A`.
- Migrations are generated with `pnpm db:generate`, never handwritten. The highest existing migration is `drizzle/0018_spotty_colleen_wing.sql`.

---

## File Structure

**Pure core — `src/lib/tuning/` (no database, no network, client-safe unless noted):**

| File | Responsibility |
|---|---|
| `prompt-version.ts` | The single `PROMPT_VERSION` integer. Nothing else. |
| `fingerprint.ts` | `tuningFingerprint(input)` — a stable hash over decklist, games, notes, intent, and `PROMPT_VERSION`. |
| `evidence.ts` | `buildEvidencePack(input)` — assembles the pack from already-loaded rows. Pure. |
| `prompt.ts` | Renders the evidence pack into the system + user messages. Pure string work. |
| `response-schema.ts` | The zod schema for the model's reply, and the `TuningResponse` type. |
| `validate.ts` | The six validation rules, as pure predicates over a candidate plus the pack. |
| `presentation.ts` | The nine `suggestionRules` checks — the sixth validation rule. |
| `reaper.ts` | `reaperCutoff(now)` and the pure arithmetic behind the read-time reap. |
| `limits.ts` | `TUNING_RUNS_PER_HOUR`, `REAPER_CUTOFF_MS`, `MODEL_TIMEOUT_MS`, `MAX_SUGGESTIONS`. |
| `client.ts` | **Server-only.** The raw `fetch` to Anthropic, with the hard timeout and the two bounded in-run retries. |

**Server shell:**

| File | Responsibility |
|---|---|
| `src/app/decks/tuning-actions.ts` | Every server action: `runTuning`, `cancelTuningRun`, `applySuggestion`, `undoSuggestion`, `dismissSuggestion`, `restoreSuggestion`, `saveDeckIntent`, `readTuningEvidence`. |
| `src/lib/decks/tuning-read.ts` | `readTuningState(deckId, userId, fingerprint)` — the newest run plus its items, reaping on the way past. |

**Copy:**

| File | Responsibility |
|---|---|
| `src/lib/copy/deck-tuning.ts` | `deckTuningCopy` and `manifestCopy`; re-exports `PATTERN_MIN` and `axisCopy` from `game-log.ts`. |

**Components — `src/components/decks/`:**

| File | Responsibility |
|---|---|
| `tuning-panel.tsx` | The six panel states plus the Stop transition. Owns the run lifecycle. |
| `manifest-rows.tsx` | The generating manifest, ticking on real read completions. |
| `suggestion-card.tsx` | One cut/add pair, its citations, and apply/dismiss/undo/restore. |
| `deck-intent.tsx` | The intent ask, chip, edit, and seeded state. |

**Modified:**

| File | Change |
|---|---|
| `src/db/schema.ts` | `deck_games.note`; `decks.intent` + `decks.intent_seeded`; `deck_suggestion_runs`; `deck_suggestion_items`. Adds the `uniqueIndex` import. |
| `src/lib/decks/games.ts` | `DeckGame.note`, read by `listDeckGames`. |
| `src/lib/decks/read.ts` | `DeckDetail.intent` and `.intentSeeded`, projected by `getDeckDetail`. |
| `src/app/decks/actions.ts` | `logGame` accepts and stores the note. |
| `src/app/decks/[id]/page.tsx` | Reads tuning state; exports `maxDuration`. |
| `src/components/decks/game-log-form.tsx` | The note field. |
| `src/components/decks/game-history-row.tsx` | The note, when present. |
| `src/components/decks/builder-shell.tsx` | Mounts the tuning panel and the intent control. |
| `.env.example`, `docs/deployment.md` | `ANTHROPIC_API_KEY`. |

**Scripts and CI:**

| File | Responsibility |
|---|---|
| `scripts/check-tuning.ts` | `pnpm check:tuning` — one live API call against a fixture pack, asserting the response validates. |
| `.github/workflows/upstream-contracts.yml` | Adds the tuning check, gated on a repository variable. |

---

### Task 1: Schema and migration

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/0019_*.sql` (generated — do not handwrite)
- Test: `src/db/schema.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `deckGames.note`, `decks.intent`, `decks.intentSeeded`, and the tables `deckSuggestionRuns` / `deckSuggestionItems` with the column names every later task imports.

- [ ] **Step 1: Add `uniqueIndex` to the pg-core import**

`src/db/schema.ts` lines 2-4 currently import `pgTable, text, integer, real, timestamp, jsonb, boolean, primaryKey, uuid, index, check, date`. Add `uniqueIndex` to that list. `jsonb` is already imported and already used with `.$type<>()` at line 351 — follow that form.

- [ ] **Step 2: Add the three columns to existing tables**

In `deckGames` (currently `src/db/schema.ts:201-213`), add after `createdAt`:

```typescript
  // Singular. decks.notes (plural) already exists and is a different thing.
  note: text("note"),
```

and add a length check to the config array, alongside the existing checks:

```typescript
    check("deck_games_note_length_check", sql`${t.note} is null or char_length(${t.note}) <= 140`),
```

In `decks` (currently `src/db/schema.ts:165-177`), add after `notes`:

```typescript
  intent: text("intent"),
  // True while the app's seeded sentence stands unedited. The player's first
  // edit flips it false, which is what tells the chip whether to say "seeded".
  intentSeeded: boolean("intent_seeded").notNull().default(false),
```

`decks` currently has no config array. Add one:

```typescript
}, (t) => [
  check("decks_intent_length_check", sql`${t.intent} is null or char_length(${t.intent}) <= 120`),
]);
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

- [ ] **Step 5: Write the schema shape test**

```typescript
// src/db/schema.test.ts
import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import { deckSuggestionRuns, deckSuggestionItems, deckGames, decks } from "./schema";

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

  it("ties every item to a catalog card", () => {
    const fks = getTableConfig(deckSuggestionItems).foreignKeys;
    const tables = fks.map((fk) => fk.reference().foreignTable);
    expect(tables).toHaveLength(3);
  });
});
```

- [ ] **Step 6: Run the test and generate the migration**

```bash
pnpm test src/db/schema.test.ts
pnpm db:generate
```

Expected: three passing tests, and one new file `drizzle/0019_*.sql`. Open it and confirm the partial index line carries `where "status" = 'pending'`. If Drizzle emitted an unconditional unique index, the `.where()` in Step 3 is wrong — fix it and regenerate rather than editing the SQL by hand.

- [ ] **Step 7: Commit**

```bash
git add src/db/schema.ts src/db/schema.test.ts drizzle/
git commit -m "feat(tuning): schema for game notes, deck intent, and suggestion runs"
```

---

### Task 2: Copy module

**Files:**
- Create: `src/lib/copy/deck-tuning.ts`
- Test: `src/lib/copy/deck-tuning.test.ts`

**Interfaces:**
- Consumes: `PATTERN_MIN` and `axisCopy` from `src/lib/copy/game-log.ts`.
- Produces: `deckTuningCopy`, `manifestCopy`, and the re-exported `PATTERN_MIN` / `axisCopy`. Every component and action imports its strings from here and defines none of its own.

- [ ] **Step 1: Write the guard test first**

The value of this test is not that the strings exist — it is that the presentation rules hold across the whole file at once, so a later string added by hand cannot quietly break them.

```typescript
// src/lib/copy/deck-tuning.test.ts
import { describe, expect, it } from "vitest";
import { deckTuningCopy, manifestCopy, PATTERN_MIN, axisCopy } from "./deck-tuning";
import { gameLogCopy } from "./game-log";

function allStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function") return [];
  if (value && typeof value === "object") return Object.values(value).flatMap(allStrings);
  return [];
}

describe("deck tuning copy", () => {
  it("re-exports the game log's vocabulary rather than redefining it", () => {
    expect(PATTERN_MIN).toBe(3);
    expect(axisCopy.mana).toBeDefined();
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

Expected: FAIL — cannot resolve `./deck-tuning`.

- [ ] **Step 3: Write the copy module**

Transcribe every key from the **Copy keys** section of `docs/superpowers/design-tables/deck-tuning.md` verbatim — that section is the source of truth for the text, and this task is transcription, not authorship. The module's shape:

```typescript
// src/lib/copy/deck-tuning.ts
// Every string the tuning surfaces render. Transcribed from the design table's
// copy-keys section; the wording there wins over anything drawn on a canvas.
export { PATTERN_MIN, axisCopy } from "./game-log";

export const manifestCopy = {
  games: { what: "games logged", count: (n: number) => `${n} games`, countOne: "1 game" },
  // ... notes, decklist, collection, intent, progress, collapsed
} as const;

export const deckTuningCopy = {
  panel: { /* heading, belowThreshold*, ready*, generating*, stop, results*, again*, tally*, unchanged* */ },
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
  note: { /* label, hint, counter, maxLength: 140, warnAt: 130, optionalNote, ariaDescription */ },
  suggestionRules: { /* the nine static rules — see Task 7 */ },
  announce: { /* started, ready, readyOne, unchanged, stopped, failed, applied, undone, dismissed, intentSaved */ },
} as const;
```

`card.price` is a pass-through taking an already-formatted string: `price: (amount: string) => amount`. It must never format cents itself — `formatCents` at `src/lib/decks/price.ts:109-114` is the only formatter in this codebase.

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm test src/lib/copy/deck-tuning.test.ts
```

Expected: PASS, six tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/copy/deck-tuning.ts src/lib/copy/deck-tuning.test.ts
git commit -m "feat(tuning): copy module for the tuning panel, cards, note, and intent"
```

---

### Task 3: The game note — read and write path

**Files:**
- Modify: `src/lib/decks/games.ts:6-13` (the `DeckGame` type), `:52-94` (`listDeckGames`)
- Modify: `src/app/decks/actions.ts:849-922` (`logGame`)
- Test: `src/lib/decks/games.test.ts`

**Interfaces:**
- Consumes: `deckGames.note` from Task 1; `deckTuningCopy.note.maxLength` from Task 2.
- Produces: `DeckGame.note: string | null`, populated by `listDeckGames`; `logGame` accepting a `note` form field. The evidence pack (Task 5) and the history row (Task 4) both read `DeckGame.note`.

- [ ] **Step 1: Write the failing tests**

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

- [ ] **Step 2: Run it to verify it fails**

```bash
pnpm test src/lib/decks/games.test.ts
```

Expected: FAIL — `note` is not a property of `DeckGame`.

- [ ] **Step 3: Add `note` to the type and the read**

In `src/lib/decks/games.ts`, add to `DeckGame`:

```typescript
  /** Free text the player wrote about this game. Never rendered as a mark. */
  note: string | null;
```

In `listDeckGames`, add `note: deckGames.note` to the first select's projection, and `note: row.note` to the returned map at the end. The second query (the marks join) is untouched.

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm test src/lib/decks/games.test.ts
```

Expected: PASS.

- [ ] **Step 5: Accept the note in `logGame`**

`logGame` is **not** a form action. Its signature is `logGame(deckId: string, input: LogGameInput)` (`src/app/decks/actions.ts:849-851`), `LogGameInput` is declared at `:822`, and `game-log-form.tsx:199` calls it directly with an object. Do not reach for `FormData` here.

Add to `LogGameInput`:

```typescript
  note?: string;
```

and validate it in the same inline style the action already uses (lines 861-889 — no zod), remembering the action's own comment that "a server action is a public endpoint, so the input's declared type is a claim and not a guarantee":

```typescript
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (note.length > deckTuningCopy.note.maxLength) return refuse;
```

`refuse` is the existing local at line 855. Pass `note: note.length > 0 ? note : null` in the `deckGames` insert. A blank note stores null, not an empty string — so "has a note" is one predicate everywhere.

- [ ] **Step 6: Project the intent onto `DeckDetail`**

Tasks 5, 7, 11, and 16 all read `detail.intent`, and `getDeckDetail` does not select it today. Add both columns to the `decks` select in `src/lib/decks/read.ts` and to the `DeckDetail` type at `:74-100`:

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

**Files:**
- Modify: `src/components/decks/game-log-form.tsx`
- Modify: `src/components/decks/game-history-row.tsx`
- Test: `src/components/decks/game-log-form.test.tsx`, `src/components/decks/game-history-row.test.tsx`

**Interfaces:**
- Consumes: `deckTuningCopy.note` from Task 2; `DeckGame.note` from Task 3; the `logGame` note field from Task 3.
- Produces: no new exports. The form posts `note`; the row renders it.

**Design table rows to satisfy:** S1 states 1–8 (note field) and S2 (history row, note absent / note present). Tap-target floor for the note field: **48px mobile, 46px desktop**.

- [ ] **Step 1: Write the failing component tests**

```typescript
// src/components/decks/game-log-form.test.tsx — add
it("counts down only as the note approaches its cap", async () => {
  render(<GameLogForm deckId="d1" onDone={() => {}} />);
  const note = screen.getByLabelText(deckTuningCopy.note.label);
  await userEvent.type(note, "a".repeat(129));
  expect(screen.queryByText(/129/)).not.toBeInTheDocument();
  await userEvent.type(note, "a");
  expect(screen.getByText(deckTuningCopy.note.counter(130, 140))).toBeInTheDocument();
});

// GameLogForm takes no injectable action — it imports logGame directly
// (game-log-form.tsx:199). Mock the module, the way the file's existing tests do.
vi.mock("../../app/decks/actions", () => ({
  logGame: vi.fn(async () => ({ ok: false, message: "no" })),
}));

it("keeps what was typed when the save is refused", async () => {
  render(<GameLogForm deckId="d1" onDone={() => {}} />);
  const note = screen.getByLabelText(deckTuningCopy.note.label);
  await userEvent.type(note, "flooded out");
  await userEvent.click(screen.getByRole("button", { name: gameLogCopy.form.save }));
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

- [ ] **Step 2: Run them to verify they fail**

```bash
pnpm test src/components/decks/game-log-form.test.tsx src/components/decks/game-history-row.test.tsx
```

Expected: FAIL — no element with the note label.

- [ ] **Step 3: Add the field to the form**

A `<textarea name="note">` with `maxLength={deckTuningCopy.note.maxLength}`, labelled by `deckTuningCopy.note.label`, described by `deckTuningCopy.note.ariaDescription`, hinted with `deckTuningCopy.note.hint`. The counter renders only once the length reaches `deckTuningCopy.note.warnAt` — below that it is absent from the DOM, not merely hidden, because a screen reader reading a live counter on every keystroke is the noise the design is avoiding. Amend the existing optional-note line to `deckTuningCopy.note.optionalNote`; do not change `gameLogCopy.form.optionalNote` itself, which other tests assert on.

- [ ] **Step 4: Add the note to the history row**

Render `game.note` when non-null, as the row's own line beneath the marks. Never truncate with an ellipsis in the DOM — the cap is 140 characters and the row can hold it.

- [ ] **Step 5: Run the tests to verify they pass, then commit**

```bash
pnpm test src/components/decks
git add src/components/decks/game-log-form.tsx src/components/decks/game-log-form.test.tsx src/components/decks/game-history-row.tsx src/components/decks/game-history-row.test.tsx
git commit -m "feat(tuning): note field on the game log form and on the history row"
```

---

### Task 5: Deck intent

**Files:**
- Create: `src/components/decks/deck-intent.tsx`
- Modify: `src/app/decks/tuning-actions.ts` (create the file here, with `saveDeckIntent` as its first action)
- Test: `src/components/decks/deck-intent.test.tsx`

**Interfaces:**
- Consumes: `decks.intent` / `decks.intentSeeded` from Task 1; `deckTuningCopy.intent` from Task 2.
- Produces: `saveDeckIntent(deckId: string, formData: FormData): Promise<DeckMutationResult>`, and the `DeckIntent` component. The evidence pack (Task 6) reads `intent` off `DeckDetail`.

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

export const MAX_SUGGESTIONS = 3;
export const REAPER_CUTOFF_MS = 5 * 60 * 1000;
export const MODEL_TIMEOUT_MS = 90_000;
export const TUNING_RUNS_PER_HOUR = 5;

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

Without a writer of `intentSeeded: true`, state 4 is dead code — nothing else in the plan ever sets it. `fillDeck` (`src/app/decks/actions.ts:511`) is the app building a deck on the player's behalf, so it is the seeder. Inside its existing transaction, when `decks.intent` is null, write a one-line intent drawn from the commander and the mix the fill chose, with `intentSeeded: true`.

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

**Files:**
- Create: `src/lib/tuning/prompt-version.ts`, `src/lib/tuning/fingerprint.ts`
- Test: `src/lib/tuning/fingerprint.test.ts`

**Interfaces:**
- Consumes: `DeckGame` from Task 3.
- Produces:
  ```typescript
  export const PROMPT_VERSION = 1;
  export type FingerprintInput = {
    cards: { oracleId: string; quantity: number }[];
    games: { id: string; result: string; podSize: number; worked: string[]; hurt: string[]; note: string | null }[];
    intent: string | null;
  };
  export function tuningFingerprint(input: FingerprintInput): string;
  ```

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/tuning/fingerprint.test.ts
import { describe, expect, it } from "vitest";
import { tuningFingerprint, type FingerprintInput } from "./fingerprint";

const base: FingerprintInput = {
  cards: [{ oracleId: "a", quantity: 1 }, { oracleId: "b", quantity: 2 }],
  games: [{ id: "g1", result: "loss", podSize: 4, worked: [], hurt: ["mana"], note: null }],
  intent: null,
};

describe("tuningFingerprint", () => {
  it("ignores the order the inputs arrive in", () => {
    const shuffled = { ...base, cards: [...base.cards].reverse() };
    expect(tuningFingerprint(shuffled)).toBe(tuningFingerprint(base));
  });

  it("changes when a quantity changes", () => {
    const more = { ...base, cards: [{ oracleId: "a", quantity: 2 }, { oracleId: "b", quantity: 2 }] };
    expect(tuningFingerprint(more)).not.toBe(tuningFingerprint(base));
  });

  it("changes when a game is added, when a note is written, and when the intent changes", () => {
    expect(tuningFingerprint({ ...base, games: [...base.games, { ...base.games[0], id: "g2" }] }))
      .not.toBe(tuningFingerprint(base));
    expect(tuningFingerprint({ ...base, games: [{ ...base.games[0], note: "flooded" }] }))
      .not.toBe(tuningFingerprint(base));
    expect(tuningFingerprint({ ...base, intent: "go wide" })).not.toBe(tuningFingerprint(base));
  });

  it("is stable across calls", () => {
    expect(tuningFingerprint(base)).toBe(tuningFingerprint(base));
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
// Bumping this invalidates every stored fingerprint, so every deck becomes
// eligible for a fresh run. That is the intended way to ship a prompt change.
export const PROMPT_VERSION = 1;
```

```typescript
// src/lib/tuning/fingerprint.ts
import { createHash } from "node:crypto";
import { PROMPT_VERSION } from "./prompt-version";

export function tuningFingerprint(input: FingerprintInput): string {
  const cards = [...input.cards]
    .sort((a, b) => a.oracleId.localeCompare(b.oracleId))
    .map((c) => `${c.oracleId}:${c.quantity}`);
  const games = [...input.games]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((g) => [
      g.id, g.result, g.podSize,
      [...g.worked].sort().join(","), [...g.hurt].sort().join(","),
      g.note ?? "",
    ].join("|"));

  return createHash("sha256")
    .update(JSON.stringify([PROMPT_VERSION, cards, games, input.intent ?? ""]))
    .digest("hex");
}
```

`node:crypto` keeps this module off the client. That is acceptable here and only here: the fingerprint is computed server-side and never by a component. Every other `src/lib/tuning/*` module except `client.ts` stays client-safe.

- [ ] **Step 4: Run the test to verify it passes, then commit**

```bash
pnpm test src/lib/tuning/fingerprint.test.ts
git add src/lib/tuning/prompt-version.ts src/lib/tuning/fingerprint.ts src/lib/tuning/fingerprint.test.ts
git commit -m "feat(tuning): stable fingerprint over decklist, games, notes, and intent"
```

---

### Task 7: Evidence pack

**Files:**
- Create: `src/lib/tuning/evidence.ts`
- Test: `src/lib/tuning/evidence.test.ts`

**Interfaces:**
- Consumes: `DeckDetail` (`src/lib/decks/read.ts:74-100`), `DeckGame` and `GameSummary` (`src/lib/decks/games.ts`), `computeRoleCounts` / `RECOMMENDED_MIX` (`src/lib/decks/mix.ts`), and the staples rows returned by `readSynergyCards`.
- Produces:
  ```typescript
  export type EvidencePack = {
    commander: { name: string; colorIdentity: string[] };
    cards: { oracleId: string; name: string; typeLine: string; role: string; quantity: number; owned: boolean }[];
    games: { result: string; podSize: number; playedAt: string; worked: string[]; hurt: string[]; note: string | null }[];
    summary: { count: number; marked: number; record: { wins: number; losses: number; draws: number }; axes: { key: string; worked: number; hurt: number }[] };
    roleGaps: { role: string; have: number; target: number; advisory: boolean }[];
    intent: string | null;
    staples: { oracleId: string; name: string; typeLine: string; owned: boolean }[];
  };
  export function buildEvidencePack(input: EvidencePackInput): EvidencePack;
  ```

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/tuning/evidence.test.ts
import { describe, expect, it } from "vitest";
import { buildEvidencePack } from "./evidence";

describe("buildEvidencePack", () => {
  it("strips net from the axes it forwards", () => {
    const pack = buildEvidencePack(input);
    for (const axis of pack.summary.axes) expect(axis).not.toHaveProperty("net");
  });

  it("keeps the denominator by carrying the game count alongside the tallies", () => {
    const pack = buildEvidencePack(input);
    expect(pack.summary.count).toBe(5);
    expect(pack.summary.marked).toBeLessThanOrEqual(pack.summary.count);
  });

  it("orders axes fix-first", () => {
    const pack = buildEvidencePack(input);
    const firstHurt = pack.summary.axes.findIndex((a) => a.hurt > a.worked);
    const firstWorked = pack.summary.axes.findIndex((a) => a.worked > a.hurt);
    expect(firstHurt).toBeLessThan(firstWorked);
  });

  it("excludes staples already in the deck", () => {
    const pack = buildEvidencePack(input);
    const inDeck = new Set(pack.cards.map((c) => c.oracleId));
    for (const s of pack.staples) expect(inDeck.has(s.oracleId)).toBe(false);
  });

  it("does no network and no database work", () => {
    // The whole test file imports no db module. If buildEvidencePack ever
    // reaches for one, this suite fails at import time without DATABASE_URL.
    expect(typeof buildEvidencePack).toBe("function");
  });
});
```

Build `input` in the test from plain literals — the function takes already-loaded rows, which is exactly what makes it testable without a database.

- [ ] **Step 2: Run it to verify it fails**

```bash
pnpm test src/lib/tuning/evidence.test.ts
```

Expected: FAIL — cannot resolve `./evidence`.

- [ ] **Step 3: Implement**

Assemble the seven fields above. Three rules do real work in this function:

- **`net` never leaves.** Map `AxisTally` down to `{ key, worked, hurt }`. The model cannot render a figure it was never given.
- **Fix before Keep.** Order the axes hurt-dominant first, matching what the panel shows, so the model's reading of the evidence and the player's reading of the same screen agree.
- **Staples exclude the deck.** Call the staples reader with the deck's oracle ids as covered ids, or filter here; either way a card already in the 99 is never offered as an add.

Group `cards` by role using `computeRoleCounts`, and derive `roleGaps` from `RECOMMENDED_MIX` — `advisory` is carried through so the prompt can say a gap is a guide and not a gate.

- [ ] **Step 4: Run the test to verify it passes, then commit**

```bash
pnpm test src/lib/tuning/evidence.test.ts
git add src/lib/tuning/evidence.ts src/lib/tuning/evidence.test.ts
git commit -m "feat(tuning): pure evidence pack from decklist, games, notes, gaps, and staples"
```

---

### Task 8: Prompt and response schema

**Files:**
- Create: `src/lib/tuning/prompt.ts`, `src/lib/tuning/response-schema.ts`
- Test: `src/lib/tuning/prompt.test.ts`, `src/lib/tuning/response-schema.test.ts`

**Interfaces:**
- Consumes: `EvidencePack` from Task 7; `MAX_SUGGESTIONS` from Task 5's `limits.ts`.
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
```

- [ ] **Step 5: Write the prompt**

The system message carries the nine `suggestionRules` verbatim from the copy module — they are the model's instructions and the validator's checklist, and they must be one text so the two cannot drift. The user message renders the pack: commander and colour identity, decklist grouped by role, the game summary with denominators intact, each game's note quoted, the role gaps marked advisory where they are, the intent, and the staples not in the deck. Ask for at most `MAX_SUGGESTIONS`, and say plainly that fewer is better than padding.

- [ ] **Step 6: Run both tests and commit**

```bash
pnpm test src/lib/tuning/prompt.test.ts src/lib/tuning/response-schema.test.ts
git add src/lib/tuning/prompt.ts src/lib/tuning/prompt.test.ts src/lib/tuning/response-schema.ts src/lib/tuning/response-schema.test.ts
git commit -m "feat(tuning): schema-constrained prompt and response contract"
```

---

### Task 9: The six validation rules

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

it("drops an add outside the commander's colour identity", () => {
  const out = validateSuggestions({
    response: withAdd("Lightning Bolt"), pack: { ...pack, commander: { name: "X", colorIdentity: ["G"] } },
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

Colour identity uses the same rule the add path already enforces (`validateCardForDeck` at `src/lib/decks/add-validation.ts:42-55`); do not write a second, subtly different subset test — extract or reuse.

- [ ] **Step 6: Run both suites and commit**

```bash
pnpm test src/lib/tuning
git add src/lib/tuning/presentation.ts src/lib/tuning/presentation.test.ts src/lib/tuning/validate.ts src/lib/tuning/validate.test.ts
git commit -m "feat(tuning): six validation rules, every drop counted"
```

---

### Task 10: The model client

**Files:**
- Create: `src/lib/tuning/client.ts`
- Test: `src/lib/tuning/client.test.ts`
- Modify: `.env.example`, `docs/deployment.md`

**Interfaces:**
- Consumes: `buildPrompt` (Task 8), `tuningResponseSchema` (Task 8), `MODEL_TIMEOUT_MS` (Task 5).
- Produces:
  ```typescript
  export const TUNING_MODEL = "claude-sonnet-4-6";
  export type ModelOutcome =
    | { ok: true; response: TuningResponse }
    | { ok: false; errorClass: "upstream_busy" | "timeout" | "malformed" };
  export function callTuningModel(pack: EvidencePack, deps?: { fetch?: typeof fetch; now?: () => number }): Promise<ModelOutcome>;
  ```

**Server-only.** No client component imports this module.

- [ ] **Step 1: Write the failing test**

`fetch` is injected so the whole retry contract is testable with no network.

```typescript
// src/lib/tuning/client.test.ts
it("retries once on a 529 and succeeds", async () => {
  const calls: number[] = [];
  const fake = async () => { calls.push(1); return calls.length === 1 ? busy() : good(); };
  const out = await callTuningModel(pack, { fetch: fake as unknown as typeof fetch });
  expect(out.ok).toBe(true);
  expect(calls).toHaveLength(2);
});

it("gives up as upstream_busy after the one retry", async () => {
  const fake = async () => busy();
  const out = await callTuningModel(pack, { fetch: fake as unknown as typeof fetch });
  expect(out).toEqual({ ok: false, errorClass: "upstream_busy" });
});

it("retries once on unparseable output and then reports malformed", async () => {
  const calls: number[] = [];
  const fake = async () => { calls.push(1); return garbage(); };
  const out = await callTuningModel(pack, { fetch: fake as unknown as typeof fetch });
  expect(out).toEqual({ ok: false, errorClass: "malformed" });
  expect(calls).toHaveLength(2);
});

it("reports timeout when the call outruns its budget", async () => {
  const fake = (_u: string, init?: RequestInit) => new Promise((_r, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
  });
  const out = await callTuningModel(pack, { fetch: fake as unknown as typeof fetch });
  expect(out).toEqual({ ok: false, errorClass: "timeout" });
});
```

```typescript
it("spends one deadline across both attempts, not one each", async () => {
  // First attempt returns 529 after MODEL_TIMEOUT_MS - 1000ms. The retry must
  // be armed at ~1000ms, not at a fresh MODEL_TIMEOUT_MS.
  const arms: number[] = [];
  const fake = (_u: string, init?: RequestInit) => { arms.push(remainingOn(init!.signal!)); return busy(); };
  await callTuningModel(pack, { fetch: fake as unknown as typeof fetch });
  expect(arms[1]).toBeLessThan(arms[0]);
});
```

The timeout test needs fake timers advanced past `MODEL_TIMEOUT_MS`.

- [ ] **Step 2: Run it to verify it fails**

```bash
pnpm test src/lib/tuning/client.test.ts
```

Expected: FAIL — cannot resolve `./client`.

- [ ] **Step 3: Implement**

Raw `fetch` to `https://api.anthropic.com/v1/messages`, mirroring `scripts/generate-commander-prose.ts`: `"anthropic-version": "2023-06-01"`, `x-api-key` from `process.env.ANTHROPIC_API_KEY`, model `TUNING_MODEL`.

**`MODEL_TIMEOUT_MS` is one deadline across both attempts, not a budget each.** Compute `deadline = now() + MODEL_TIMEOUT_MS` once, before the first attempt, and arm each attempt's `AbortController` at `deadline - now()`. A per-attempt budget plus one retry would allow ~180s against the route's `maxDuration = 120`, and the run would be killed mid-flight leaving an orphaned pending row — the one case §6 admits it cannot cover. If the deadline has already passed when a retry would start, return `timeout` without attempting it.

At most **two** HTTP attempts total, and only for the two retryable conditions:

- an overloaded/rate-limited upstream (`429`, `529`, `5xx`) → retry once, then `upstream_busy`
- output that does not parse against `tuningResponseSchema` → retry once, then `malformed`

A timeout is **not** retried — the budget is the budget, and a second attempt would blow the route's `maxDuration` and leave no room to write the failure row.

Both attempts happen inside one run row. The spec's "no automatic retry" rule is about not starting a second run behind the player's back; a bounded retry inside the run the player asked for is the same run.

- [ ] **Step 4: Document the key**

Add `ANTHROPIC_API_KEY=` to `.env.example` with a one-line comment, and a row to `docs/deployment.md` noting it is required in every Vercel project that serves the builder, sensitive, all scopes. Without it, `runTuning` fails as `upstream_busy` rather than throwing — a missing key must not take the builder page down.

- [ ] **Step 5: Run the test and commit**

```bash
pnpm test src/lib/tuning/client.test.ts
git add src/lib/tuning/client.ts src/lib/tuning/client.test.ts .env.example docs/deployment.md
git commit -m "feat(tuning): bounded model call with one retry per retryable class"
```

---

### Task 11: The durability contract

**Files:**
- Modify: `src/app/decks/tuning-actions.ts` (adds `runTuning` and `cancelTuningRun`)
- Create: `src/lib/tuning/reaper.ts`
- Test: `src/lib/tuning/reaper.test.ts`, `src/app/decks/tuning-actions.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 6–10.
- Produces:
  ```typescript
  export function runTuning(deckId: string): Promise<DeckMutationResult>;
  export function cancelTuningRun(deckId: string): Promise<DeckMutationResult>;
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

The order matters and is the whole point. Nothing here trusts the client: **a server action is a public endpoint**, as `logGame`'s own comment at `src/app/decks/actions.ts:858` says, so every gate the panel applies is re-applied here. A stale tab or a replayed call must not spend money on unchanged inputs.

```typescript
export async function runTuning(deckId: string): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  const detail = await getDeckDetail(deckId, userId);
  if (!detail) return { ok: false, message: gameLogCopy.form.refused };

  const games = await listDeckGames(deckId, userId);
  const fingerprint = tuningFingerprint({ cards: detail.cards, games, intent: detail.intent });

  // 1. The same gate the panel shows, enforced server-side. gateReason is the
  //    single source of that answer (Task 12) so the disabled button and the
  //    refusal can never disagree — and so a caller bypassing the button hits
  //    the identical rule.
  const state = await readTuningState(deckId, userId, fingerprint);
  const gate = gateReason(state, games.length);
  if (gate) return { ok: false, message: gate.message };

  // 2. The pending row, in its own transaction, committed before any network
  //    call. The partial unique index makes a second concurrent run impossible:
  //    the loser gets a unique violation, not a second run.
  let runId: string;
  try {
    const [row] = await db.insert(deckSuggestionRuns).values({
      deckId, userId, inputFingerprint: fingerprint,
      model: TUNING_MODEL, promptVersion: PROMPT_VERSION, status: "pending",
    }).returning({ id: deckSuggestionRuns.id });
    runId = row.id;
  } catch {
    // A unique violation on the partial index. Another run for this deck is
    // already in flight — say so, rather than reporting a generic refusal.
    return { ok: false, message: deckTuningCopy.panel.generating };
  }

  // 3. The call. Everything after this point writes conditionally.
  const staples = await readSynergyCards(
    userId, detail.commander.oracleId, detail.cards.map((c) => c.oracleId),
  );
  const pack = buildEvidencePack({ detail, games, summary: summarizeGames(games), staples });
  const outcome = await callTuningModel(pack);

  if (!outcome.ok) return finishRun(runId, deckId, { status: "failed", errorClass: outcome.errorClass });

  // resolveName closes over one catalog read of every name the model returned.
  // Injecting it is what keeps validate.ts pure and client-safe (Task 9).
  const names = outcome.response.suggestions.flatMap((s) => [s.add, ...(s.cut ? [s.cut] : [])]);
  const rows = names.length === 0 ? [] : await db
    .select({ oracleId: cards.oracleId, name: cards.name, colorIdentity: cards.colorIdentity })
    .from(cards)
    .where(inArray(cards.name, names));
  const byName = new Map(rows.map((r) => [r.name, r]));
  const resolveName = (name: string) => byName.get(name) ?? null;

  const { kept, droppedCount } = validateSuggestions({ response: outcome.response, pack, resolveName });
  if (kept.length === 0) {
    return finishRun(runId, deckId, { status: "failed", errorClass: "ungrounded", droppedCount });
  }

  // 4. Items and outcome in one transaction, both guarded.
  return persistRun(runId, deckId, kept, droppedCount);
}
```

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

- [ ] **Step 5: Write the race tests — both halves**

```typescript
// src/app/decks/tuning-actions.test.ts
it("discards its result when the reaper got there first", async () => {
  // Arrange a run row already flipped to 'failed'/'interrupted', then let the
  // generation path try to write 'ok'. Assert the row still reads
  // failed/interrupted and that no items were inserted.
});

it("discards its result when the player pressed Stop", async () => {
  // Same shape, with the row flipped to 'cancelled'. Assert cancelled survives.
});

it("refuses a second concurrent run on the same deck", async () => {
  // Two inserts of a pending row for one deck; the second must reject.
});
```

Both halves are required by the spec's §11. Testing only the reaper half would leave the Stop half — the one a player actually triggers — unproven.

- [ ] **Step 6: Run the suite and commit**

```bash
pnpm test src/app/decks/tuning-actions.test.ts src/lib/tuning/reaper.test.ts
git add src/lib/tuning/reaper.ts src/lib/tuning/reaper.test.ts src/app/decks/tuning-actions.ts src/app/decks/tuning-actions.test.ts
git commit -m "feat(tuning): durable run lifecycle with a reaper, a cancel, and guarded writes"
```

---

### Task 12: The read, the gate, and the ceiling

**Files:**
- Create: `src/lib/decks/tuning-read.ts`
- Modify: `src/app/decks/[id]/page.tsx`
- Test: `src/lib/tuning/gate.test.ts`

**Interfaces:**
- Consumes: Tasks 1, 6, 11.
- Produces:
  ```typescript
  // src/lib/tuning/gate.ts — pure, client-safe
  export type GateReason = {
    kind: "too_few_games" | "unchanged" | "ceiling" | "in_flight";
    /** Rendered beside the disabled button, and returned by runTuning's refusal. */
    message: string;
  };
  export function gateReason(state: TuningState, gameCount: number): GateReason | null;

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
    /** lastOkFingerprint !== the fingerprint passed in. */
    stale: boolean;
    runsThisHour: number;
  };
  export function readTuningState(deckId: string, userId: string, fingerprint: string): Promise<TuningState>;
  ```

`readTuningState` takes three arguments everywhere, including in the File Structure table. `TuningItem` is the only shape the card renders — the card does no lookups of its own, which is why the name, type line, ownership, and price are joined here rather than passed around the component tree.

- [ ] **Step 1: Write the failing gate test**

`gateReason` is pure, lives in `src/lib/tuning/gate.ts`, and is the single answer to "why is the button disabled" — so the disabled button and the reason shown beside it can never disagree.

```typescript
// src/lib/tuning/gate.test.ts
it("gates below the pattern minimum", () => {
  expect(gateReason(fresh, PATTERN_MIN - 1)?.kind).toBe("too_few_games");
});

it("gates when nothing has changed since the last successful run", () => {
  expect(gateReason({ ...fresh, stale: false, run: okRun }, 5)?.kind).toBe("unchanged");
});

it("does not gate when the last run failed", () => {
  expect(gateReason({ ...fresh, stale: false, run: failedRun }, 5)).toBeNull();
});

it("does not gate when the last run was cancelled", () => {
  expect(gateReason({ ...fresh, stale: false, run: cancelledRun }, 5)).toBeNull();
});

it("gates at the hourly ceiling", () => {
  expect(gateReason({ ...fresh, runsThisHour: TUNING_RUNS_PER_HOUR }, 5)?.kind).toBe("ceiling");
});
```

A failed or cancelled run not consuming the gate is the spec's rule and the reason these two cases are tested separately.

- [ ] **Step 2: Run it to verify it fails, then implement `gateReason`**

```bash
pnpm test src/lib/tuning/gate.test.ts
```

- [ ] **Step 3: Write `readTuningState`**

It reaps on the way past, in one statement, before reading — **scoped to this deck**:

```sql
update deck_suggestion_runs set status = 'failed', error_class = 'interrupted'
where deck_id = :deckId and status = 'pending' and created_at < :cutoff
```

The spec's §6 writes this unscoped. Scoping it to the deck being read is a strict improvement and changes nothing about the contract: every deck's page read reaps its own, so no pending row outlives the cutoff, and one player opening a deck no longer writes across every other player's rows on every page load.

Then it reads three things: the newest run for the deck with its items ordered by `position`, joined to `cards` for the add and cut names and type lines and to the collection and price tables for `owned` / `ownedQuantity` / `priceCents`; the newest run with `status = 'ok'` for `lastOkFingerprint`; and the user's run count in the last hour for the ceiling. `stale` is `lastOkFingerprint !== fingerprint` — deliberately not a comparison against the newest run of *any* status, because a failed or cancelled run must not consume the gate.

- [ ] **Step 3b: Write `gateReason`**

Four kinds, in this order — the first that applies wins:

```typescript
export function gateReason(state: TuningState, gameCount: number): GateReason | null {
  if (state.run?.status === "pending") {
    return { kind: "in_flight", message: deckTuningCopy.panel.generating };
  }
  if (gameCount < PATTERN_MIN) {
    return { kind: "too_few_games", message: deckTuningCopy.panel.belowThresholdNote(gameCount) };
  }
  if (state.runsThisHour >= TUNING_RUNS_PER_HOUR) {
    return { kind: "ceiling", message: deckTuningCopy.panel.unchangedCta };
  }
  if (!state.stale && state.lastOkFingerprint !== null) {
    return { kind: "unchanged", message: deckTuningCopy.panel.unchanged(when) };
  }
  return null;
}
```

Each kind carries its own message, so a refusal always says which of the four happened. Returning one generic string for all of them would defeat §6's rule that the panel names the cause.

An `ungrounded` failure leaves the gate open on unchanged inputs, which lets `Try again` re-spend on a call that will very likely fail the same way. That is the spec's rule — a failed run does not consume the gate — and it stands, because the alternative traps a deck whose inputs cannot change until it plays another game. The hourly ceiling is what bounds the cost.

- [ ] **Step 4: Wire the page**

In `src/app/decks/[id]/page.tsx`, the tuning read **cannot** join the existing `Promise.all` at line 36: it needs a fingerprint, and the fingerprint needs `games`, which that same `Promise.all` produces. Compute the fingerprint after it resolves, then read the tuning state in the sequential section alongside the existing `loadPrices` call:

```typescript
const fingerprint = tuningFingerprint({ cards: detail.cards, games, intent: detail.intent });
const [priced, tuning] = await Promise.all([
  loadPrices([...]).catch(() => null),
  readTuningState(id, userId, fingerprint),
]);
```

Pass `tuning` into `BuilderShell`.

Add at the top of the file:

```typescript
// Server actions inherit the invoking route's limit, and runTuning's budget is
// the model call (90s) plus room to write the outcome row. Precedent:
// src/app/collection/replace/page.tsx:12.
export const maxDuration = 120;
```

- [ ] **Step 5: Run the full suite and the stub build, then commit**

```bash
pnpm test && pnpm typecheck && DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build
git add src/lib/tuning/gate.ts src/lib/tuning/gate.test.ts src/lib/decks/tuning-read.ts "src/app/decks/[id]/page.tsx"
git commit -m "feat(tuning): read-time reaper, the fingerprint gate, and the hourly ceiling"
```

---

### Task 13: The manifest

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

**Files:**
- Create: `src/components/decks/tuning-panel.tsx`
- Test: `src/components/decks/tuning-panel.test.tsx`

**Interfaces:**
- Consumes: `deckTuningCopy.panel` and `.failure` and `.announce` (Task 2); `TuningState` and `gateReason` (Task 12); `runTuning` / `cancelTuningRun` (Task 11); `ManifestRows` (Task 13).
- Produces: the `TuningPanel` component. `builder-shell.tsx` mounts it.

**Design table rows to satisfy:** S4 states 1, 2, 3, 4, 5, 6a–6d, **6e (interrupted, undrawn)**, and the `Stop` transition. The action row is a **fixed band across all six states** — 56px desktop, primaries 44px on mobile. Getting that band right is what stops the panel jumping as it changes state.

State 6e has no drawing. Build it from the four drawn failure states' shared structure — tag, body, kept line, note — with `deckTuningCopy.failure.interrupted`'s strings. That is the audit's finding A resolution, and it is eng's to build, not a Design round-trip.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/components/decks/tuning-panel.test.tsx
it("shows the reason beside a disabled button rather than only disabling it", () => {
  render(<TuningPanel state={unchangedState} gameCount={5} />);
  expect(screen.getByRole("button", { name: deckTuningCopy.panel.unchangedCta })).toBeDisabled();
  expect(screen.getByText(/nothing has changed/i)).toBeInTheDocument();
});

it("offers Stop only while a run is pending", () => {
  const { rerender } = render(<TuningPanel state={pendingState} gameCount={5} />);
  expect(screen.getByRole("button", { name: deckTuningCopy.panel.stop })).toBeInTheDocument();
  rerender(<TuningPanel state={okState} gameCount={5} />);
  expect(screen.queryByRole("button", { name: deckTuningCopy.panel.stop })).not.toBeInTheDocument();
});

it("renders the interrupted failure with its own copy", () => {
  render(<TuningPanel state={interruptedState} gameCount={5} />);
  expect(screen.getByText(deckTuningCopy.failure.interrupted.tag)).toBeInTheDocument();
});

it("announces once per settle, not once per intermediate state", async () => {
  render(<TuningPanel state={pendingState} gameCount={5} />);
  const live = screen.getByRole("status");
  expect(live).toHaveTextContent(deckTuningCopy.announce.started);
  // advance the manifest through all four steps
  expect(live.textContent?.match(/read/g) ?? []).toHaveLength(0);
});

it("keeps a below-threshold deck honest about how many games it has", () => {
  render(<TuningPanel state={fresh} gameCount={1} />);
  expect(screen.getByText(deckTuningCopy.panel.belowThresholdNote(1))).toBeInTheDocument();
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
- Consumes: `deckTuningCopy.card` (Task 2); `formatCents` (`src/lib/decks/price.ts:109-114`); `statusPill` (`src/lib/decks/status.ts`); the item rows from Task 12.
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

The apply path must reuse the existing row-locking pattern in `addCardToDeck` (`src/app/decks/actions.ts:424`, `select 1 from decks ... for update`) rather than inventing a second concurrency approach, and must call `claimSurfaces(deckId)` the way that action does.

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

### Task 16: Mount it on the builder

**Files:**
- Modify: `src/components/decks/builder-shell.tsx`
- Test: `src/components/decks/builder-shell.test.tsx`

**Interfaces:**
- Consumes: `TuningPanel` (Task 14), `DeckIntent` (Task 5), `TuningState` (Task 12).
- Produces: no new exports. `BuilderShell` gains a `tuning: TuningState` prop.

- [ ] **Step 1: Write the failing test**

```typescript
it("shows the tuning panel on the Games tab", async () => {
  render(<BuilderShell {...props} tuning={fresh} />);
  await userEvent.click(screen.getByRole("tab", { name: /games/i }));
  expect(screen.getByText(deckTuningCopy.panel.heading)).toBeInTheDocument();
});

it("offers the intent ask beside the panel", async () => {
  render(<BuilderShell {...props} tuning={fresh} deck={{ ...props.deck, intent: null }} />);
  await userEvent.click(screen.getByRole("tab", { name: /games/i }));
  expect(screen.getByText(deckTuningCopy.intent.askLabel)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run it, wire the panel and the intent control into the Games tab, run it again**

- [ ] **Step 3: Run the whole gate and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build
git add src/components/decks/builder-shell.tsx src/components/decks/builder-shell.test.tsx
git commit -m "feat(tuning): mount the tuning panel and intent on the builder"
```

---

### Task 17: The contract check

**Files:**
- Create: `scripts/check-tuning.ts`, `scripts/fixtures/tuning-pack.json`
- Modify: `package.json`, `.github/workflows/upstream-contracts.yml`

**Interfaces:**
- Consumes: `buildPrompt`, `tuningResponseSchema`, `callTuningModel`, `validateSuggestions`.
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

Add a step to `.github/workflows/upstream-contracts.yml` with `if: always()` so it runs even when an earlier check fails, gated on a repository variable — `TUNING_CHECK_ENABLED == 'true'` — matching how the price refresh and commander index workflows are gated. Unlike the Scryfall and ManaPool checks, this one costs money per run, so the gate is not optional.

- [ ] **Step 4: Run it locally once and commit**

```bash
pnpm check:tuning
git add scripts/check-tuning.ts scripts/fixtures/tuning-pack.json package.json .github/workflows/upstream-contracts.yml
git commit -m "feat(tuning): daily contract check against the live model"
```

---

### Task 18: Design review and PR

**Files:** none created. This task is the gate.

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
git push -u origin feat/deck-tuning
```

The PR body names the durability contract, the five failure classes, the `cancelled` status, and the fact that `ANTHROPIC_API_KEY` must be set in every Vercel project serving the builder before this merges.

- [ ] **Step 5: Copilot review rounds**

Per the policy in `~/.claude/CLAUDE.md`. This PR touches a destructive path (apply and undo mutate the deck) and an integration that spends money — no round cap, and a clean round on the apply/undo path is not on its own a stop signal.

- [ ] **Step 6: Close out**

Delete `design/design_handoff_the99_deck_tuning/` in the same PR — a consumed handoff becomes a second source of truth. The property table and the gap reports stay. Update `docs/superpowers/design-pipeline-status.md`.

---

## Self-Review

**Spec coverage.** §4 data model → Task 1. §5 fingerprint, gate, ceiling → Tasks 6, 12. §6 reaper, error classes, guarded writes → Tasks 10, 11, 12. §7 pipeline and evidence pack → Tasks 7, 10, 11. §8 validation → Task 9. §9 testing strategy and `check:tuning` → Tasks 9, 17. §11 testing, including both halves of the reaper race → Task 11 Step 5. The note, intent, panel, card, and manifest surfaces → Tasks 3, 4, 5, 13, 14, 15, 16.

**Gaps found and closed during review.** The spec never says where `Stop` writes; Task 11 resolves it with a fourth `status` value rather than overloading `failed`. The spec's error-class table has five entries but reads as four in one place; Global Constraints and Task 2's test both pin it at five. The seeded-intent provenance needed a column the spec does not name; Task 1 adds `intent_seeded`, Task 5 explains why one column covers both states, and Task 5 Step 6 gives it its only writer — without which state 4 would be unreachable.

A pre-implementation code review of this plan found and closed eight further defects, each of which would have cost a task or worse:

- `deck_suggestion_items` declared its card foreign keys as `text`, but `cards.oracleId` is `uuid` — the migration would not have applied. Both columns are now `uuid`.
- `runTuning` enforced neither the fingerprint gate nor the hourly ceiling. A server action is a public endpoint, so both are now re-checked server-side through the same `gateReason` the panel uses.
- `DeckDetail` does not carry `intent`, and four tasks read it. Task 3 Step 6 now extends `getDeckDetail`.
- `logGame` takes `LogGameInput`, not `FormData`. Task 3 Step 5 was rewritten against the real signature.
- `TuningItem` was used by Task 15 and defined nowhere, and nothing joined the name, ownership, or price the card renders. Task 12 now defines it and joins them.
- `MODEL_TIMEOUT_MS` armed per attempt plus one retry could reach ~180s against a 120s route limit, orphaning the pending row. It is now one deadline across both attempts.
- The partial index predicate used `${t.status}`, which Drizzle renders table-qualified and Postgres rejects in an index predicate. It is now raw `status = 'pending'`.
- `cancelTuningRun` was scoped to the deck, so a late Stop could cancel a run the player never watched. It now takes the `runId`.

Also corrected: the reaper is scoped to the deck being read rather than sweeping every user's rows on every page load; `gateReason` returns a distinct message per kind rather than one generic refusal; the tuning read cannot join the page's first `Promise.all` because it depends on that call's output; and `check:tuning` asserts §9's five conditions rather than shape alone.

**Type consistency.** `ValidatedSuggestion.addOracleId` (Task 9) matches `deckSuggestionItems.addOracleId` (Task 1). `TuningCitation` is declared once, in `schema.ts`, and imported by `validate.ts` and the card. `ManifestStep`'s four values match `manifestCopy`'s four groups and `readTuningEvidence`'s parameter. `gateReason` returns the same `GateReason` the panel switches on.

**Open decisions carried into implementation.** None. Every question the audit left to eng is answered above: the fifth failure class, `Stop`'s status, the manifest's honesty, the timeout budget, and the intent provenance column.
