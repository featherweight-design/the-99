# Deck tuning — PR A — schema and the shared client

> Part of the deck tuning plan. **Read the index first:** [`2026-09-07-deck-tuning-suggestions.md`](2026-09-07-deck-tuning-suggestions.md) — the Global Constraints, File Structure, PR boundaries and Cost there apply to every task below. Task numbers are shared across all six files.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

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
  // Stored, never hashed: a version bump reopens the gate as its own reason, not as drift.
  profileVersion: integer("profile_version").notNull(),
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
  // Same form as printings_flavor_name_idx (src/db/schema.ts:142-144): Drizzle
  // qualifies the column and Postgres accepts a qualified name in a predicate —
  // drizzle/0023_chubby_lady_vermin.sql applied exactly that.
  uniqueIndex("deck_suggestion_runs_one_pending_idx")
    .on(t.deckId)
    .where(sql`${t.status} = 'pending'`),
  index("deck_suggestion_runs_deck_created_idx").on(t.deckId, t.createdAt),
  index("deck_suggestion_runs_user_created_idx").on(t.userId, t.createdAt),
]);
```

The file's one partial index today is `printings_flavor_name_idx`; this is its first partial UNIQUE index. The generated SQL must read `CREATE UNIQUE INDEX "deck_suggestion_runs_one_pending_idx" ON "deck_suggestion_runs" USING btree ("deck_id") WHERE "deck_suggestion_runs"."status" = 'pending';`. Verify that in Step 6.

- [ ] **Step 4: Add the items table**

```typescript
/** What an apply changed, so undo can put back exactly that — not an approximation of it. */
export type ApplySnapshot = {
  /** The cut's row before the apply; null when the suggestion had no cut. */
  cut: { quantity: number; auto: boolean; proxied: boolean } | null;
  /** The add's row before the apply; quantity 0 when the deck did not hold it. */
  add: { quantity: number; auto: boolean };
};

export type TuningCitation = {
  kind: "games" | "note" | "decklist" | "intent";
  /** Rendered by the card. Never a percentage, never a net figure. */
  value: string;
};

export const deckSuggestionItems = pgTable("deck_suggestion_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").notNull().references(() => deckSuggestionRuns.id, { onDelete: "cascade" }),
  // uuid, not text — cards.oracleId is uuid("oracle_id") at src/db/schema.ts:33
  // and Postgres rejects a text→uuid foreign key. Matches deckCards.oracleId.
  addOracleId: uuid("add_oracle_id").notNull().references(() => cards.oracleId),
  cutOracleId: uuid("cut_oracle_id").references(() => cards.oracleId),
  rationale: text("rationale").notNull(),
  rationaleShort: text("rationale_short").notNull(),
  evidence: jsonb("evidence").$type<TuningCitation[]>().notNull(),
  position: integer("position").notNull(),
  // The deck's permitted brackets with this swap applied, when that differs from the
  // deck's permits without it. Null when the swap moves nothing. Computed by the app
  // through slotDeck (Task 9b), never by the model.
  bracketAfter: integer("bracket_after").array(),
  // Written by applySuggestion, read by undoSuggestion (Task 15). Null until applied.
  undoSnapshot: jsonb("undo_snapshot").$type<ApplySnapshot>(),
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
  // reserved when the run starts, spent on an ok answer, refunded on any failure or
  // Stop (Hugh, 2026-09-23). reserved + spent count against the allowance; refunded does not.
  status: text("status").notNull().default("reserved"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  check("model_calls_feature_check", sql`${t.feature} in ('tuning', 'synopsis')`),
  check("model_calls_status_check", sql`${t.status} in ('reserved', 'spent', 'refunded')`),
  // The allowance's only query: this player's calls inside the window.
  index("model_calls_user_created_idx").on(t.userId, t.createdAt),
]);
```

No foreign key to a run: a synopsis has no run table in this plan, and the ledger must not need one to count. The link runs the other way — `deck_suggestion_runs.model_call_id` (below) — so the run's guarded outcome write can settle its own unit.

Add to `deckSuggestionRuns`:

```typescript
  modelCallId: uuid("model_call_id").notNull().references(() => modelCalls.id),
```

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

Expected: four passing tests, and one new generated `drizzle/00NN_*.sql` at the next free number on `main` (`git fetch` first; 0053 at revision time). Commit the journal and snapshot Drizzle writes beside it. Open it and confirm the partial index line carries `WHERE "deck_suggestion_runs"."status" = 'pending'`. If Drizzle emitted an unconditional unique index, the `.where()` in Step 3 is wrong — fix it and regenerate rather than editing the SQL by hand.

- [ ] **Step 7: Commit**

```bash
git add src/db/schema.ts src/db/schema.test.ts drizzle/
git commit -m "feat(tuning): schema for deck intent, suggestion runs, and the model allowance ledger"
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
  /** Thrown inside the caller's transaction to roll back a run that found the allowance spent. */
  export class AllowanceSpentError extends Error {}
  /** Inside the caller's transaction: lock, count, insert. Null when spent. */
  export function reserveModelCall(tx: Tx, userId: string, feature: ModelFeature, now: Date): Promise<{ id: string } | null>;
  /** Inside the outcome write's transaction. Only moves a 'reserved' row, so settling twice is a no-op. */
  export function settleModelCall(tx: Tx, callId: string, to: "spent" | "refunded"): Promise<void>;
  export function readAllowance(userId: string, now: Date): Promise<Allowance>;
  /** Pure; both readers use it. Takes the times of the rows that count — reserved and spent. */
  export function allowanceFrom(callTimes: Date[], now: Date): Allowance;
  ```

**Why the counter is rows, not a number.** A per-player counter column needs a reset job and loses the history; a ledger row per run is counted over a rolling window by one indexed query, reopens on its own, and says what spent it. `feature` is carried so the cost section's figures can be split later, and for nothing else — the allowance counts both features against one number, which is the ruling.

**Rolling 24 hours, not a calendar day.** A calendar reset has to pick a time zone, and midnight UTC is mid-evening for the players this is built for — the hour a deck is most likely being tuned. A rolling window needs no zone, and `reopensAt` (the oldest counted call plus the window) gives the exhausted state an honest time to name.

**Concurrency.** Two presses on two decks at once must not both take the last unit. `reserveModelCall` takes `pg_advisory_xact_lock(hashtextextended('model-allowance:' || user_id, 0))` first — the 64-bit form `replaceCollection` uses (`src/lib/collection/import.ts:141`), with a prefix so it never contends with that lock — then counts inside the window, then inserts. The caller runs it in the same transaction as its own pending-row insert (Task 11), so a run either holds a unit and a pending row or neither.

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
  vi.useFakeTimers();
  const calls: number[] = [];
  const fake = (_u: string, init?: RequestInit) => new Promise<Response>((_r, reject) => {
    calls.push(1);
    init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
  });
  const pending = callModel(req, { fetch: fake as unknown as typeof fetch });
  await vi.advanceTimersByTimeAsync(req.deadlineMs + 1);
  expect(await pending).toEqual({ ok: false, errorClass: "timeout" });
  expect(calls).toHaveLength(1);
  vi.useRealTimers();
});

it("spends its one retry once, even when the two failures differ", async () => {
  const calls: number[] = [];
  const fake = async () => { calls.push(1); return calls.length === 1 ? busy() : reply({ wrong: 1 }); };
  const out = await callModel(req, { fetch: fake as unknown as typeof fetch });
  expect(out).toEqual({ ok: false, errorClass: "malformed" });
  expect(calls).toHaveLength(2);
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
  const out = await callModel(req, { fetch: (async () => reply({ answer: "x" }, { input_tokens: 812, output_tokens: 90 })) as unknown as typeof fetch });
  expect(out.ok && out.usage).toEqual({ inputTokens: 812, outputTokens: 90 });
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

The lock, the count, the insert and the settle are a transaction's behaviour and are proved in `probe:tuning-run` (Task 11): it races two reservations for one player's last unit and asserts exactly one wins, and asserts that each failure path gives its unit back.

- [ ] **Step 3: Run them to verify they fail**

```bash
pnpm test src/lib/model
```

- [ ] **Step 4: Implement the client**

Raw `fetch` to `https://api.anthropic.com/v1/messages`, the headers `scripts/generate-commander-prose.ts` sends (`content-type`, `x-api-key` from `process.env.ANTHROPIC_API_KEY`, `"anthropic-version": "2023-06-01"`), the caller's `model` and `max_tokens`, and the caller's `system` and `user`. The reply's text block is `JSON.parse`d and checked with `schema.safeParse`; a parse or schema failure is the `malformed` class.

**The deadline is one deadline across both attempts, not a budget each.** Compute `deadline = now() + deadlineMs` once, before the first attempt, and arm each attempt's `AbortController` at `deadline - now()`; skip the retry when nothing is left. At most two HTTP attempts in total — one retry, spent on whichever retryable condition comes first: `429`/`529`/`5xx` (→ `upstream_busy`) or an unparseable reply (→ `malformed`). A second retryable failure reports its own class. **Every other non-2xx** — `400`, `401`, `403`, `404`, any status not named above — is `upstream_busy` with no retry, and the status and response body are logged server-side (`console.error`), because each of those is a deployment defect (a bad key, a retired model id, a malformed request) that a second attempt cannot fix. **A missing key is the same**: `upstream_busy`, logged, no request made. The client never throws for an upstream or configuration fault, so a run always reaches a terminal outcome through `finishRun` and its unit is refunded — and the player sees the drawn `unavailable` failure, not a dropped connection. `runTuning`'s own `try` (Task 11) covers anything that still throws. A timeout is not retried — the budget is the budget, and a second attempt would outrun the route's `maxDuration` and leave no room to write the failure row. 

`scripts/generate-commander-prose.ts` keeps its own fetch in this PR. Moving it onto the shared client is a separate change with its own proof (the prose workflow), logged on the board rather than folded in here.

- [ ] **Step 5: Implement the allowance**

`allowanceFrom` is the pure arithmetic. `readAllowance` selects the `created_at` of the reader's `model_calls` rows inside the window whose status is `reserved` or `spent` (`model_calls_user_created_idx`) and hands them to it — a `refunded` row never counts (Hugh, 2026-09-23: only a successful answer spends a unit). A `reserved` row counts because it is a run in flight, and not counting it is exactly how two concurrent presses would both take the last unit. `settleModelCall` moves a row from `reserved` to `spent` or `refunded` and nothing else. `reserveModelCall` locks, counts through the same arithmetic, and returns null when `used >= MODEL_DAILY_ALLOWANCE`, otherwise inserts `{ userId, feature }` and returns the id.

- [ ] **Step 6: Document the key**

Add `ANTHROPIC_API_KEY=` to `.env.example` with a one-line comment, and a row to `docs/deployment.md`: required in every Vercel project that serves the builder, Sensitive, Production and Preview. Without it, `runTuning` throws at the call rather than recording a failure class. The prose workflow's own repository secret is unaffected.

- [ ] **Step 7: Run the tests and commit**

```bash
pnpm test src/lib/model
git add src/lib/model/client.ts src/lib/model/client.test.ts src/lib/model/allowance.ts src/lib/model/allowance.test.ts .env.example docs/deployment.md
git commit -m "feat(model): one shared model client and a per-player daily allowance"
```

---
