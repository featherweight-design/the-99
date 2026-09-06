# Deck Game Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a player log the result of a Commander game against one of their decks, tag what worked and what hurt from a fixed eight-axis vocabulary, and read back a pattern once three games exist.

**Architecture:** Two new tables (`deck_games`, `deck_game_axes`) with the axis marks in a child table under a composite primary key, so one axis cannot be marked both ways for the same game. Two server actions in the existing `src/app/decks/actions.ts` write and delete; a new `src/lib/decks/games.ts` reads and aggregates, with the aggregation itself a pure function over already-fetched rows so it is testable without a database. The UI is a third tab on the deck builder, fed by data the deck page fetches and passes down as props.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, Tailwind 4, Drizzle ORM on Neon Postgres, Clerk auth, Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-05-deck-game-log-design.md`

**Design handoff:** `design/design_handoff_the99_game_log/` — `README.md` (component notes and the five §8 answers), `STATES-log-form.md` (the form's fourteen states), `LOW-N-summary.md` (what the aggregate panel shows at N=0/1/2/3+), `game-log · copy strings.ts` (every string). Readiness verdict 🟢 Green, audited 2026-09-05.

## Global Constraints

- Package manager is **pnpm**. Never npm or yarn.
- This repo has **no `pgEnum`**. A constrained string column is `text` plus a `check()` written with the raw `sql` template, following `collection_items_finish_check` at `src/db/schema.ts:143`.
- The schema file is `src/db/schema.ts` — **not** `src/lib/db/schema.ts`.
- Migrations are whatever `pnpm db:generate` emits. **Never hardcode a migration number**, in code or in a comment; the number moves when other branches land first.
- Both new actions revalidate through `deckSurfaces(deckId)` from `src/lib/decks/revalidate.ts`, **not** `claimSurfaces` — neither action changes deck membership.
- `PATTERN_MIN = 3` is exported from `src/lib/copy/game-log.ts` exactly once. The literal `3` is inlined nowhere in the game-log code.
- **No string anywhere prints a percentage.** There is no percentage formatter in this feature at any N.
- **`net` is computed but never rendered.** It orders and buckets the axes; it never reaches the screen.
- Every count that reaches the screen carries its denominator in the same element — `3 of 3`, never a bare `3`.
- Mobile and desktop parity ship in the same PR. Every UI task states both sets of figures.
- Every UI PR passes the design-review skill (property-table enumerate → verify → confirm) before `gh pr create`.
- Pre-push gate, every push: `pnpm typecheck && pnpm lint && pnpm test` plus the stub-DB build (`DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`), then `git fetch origin && git rebase origin/main`.
- Stage files by name. Never `git add -A`.

## Phase split

The spec splits this work at the design gate. **Phase 1 (Tasks 1–5) is backend only and was never design-gated** — schema, both actions, the read and the aggregation. **Phase 2 (Tasks 6–14) is the UI**, gated on the handoff, which is now 🟢 Green. Phase 1 can be implemented and merged without reading a single design document; Phase 2 cannot.

## File Structure

**Created:**

| Path | Responsibility |
|---|---|
| `src/lib/decks/game-axes.ts` | The frozen axis key vocabulary and its order. Keys and the type guard only — no display strings. |
| `src/lib/decks/games.ts` | `listDeckGames` (the query) and `summarizeGames` (a pure aggregation over its result). |
| `src/lib/decks/games.test.ts` | Unit tests for `summarizeGames`. No database. |
| `src/lib/decks/game-headline.ts` | `deriveHeadline` — the pure fallback ladder that picks the one sentence above the buckets. |
| `src/lib/decks/game-headline.test.ts` | Unit tests for the ladder at every N. |
| `src/lib/copy/game-log.ts` | `PATTERN_MIN`, `axisCopy`, `gameLogCopy`. Every string this feature renders. |
| `src/lib/copy/game-log.test.ts` | Guards the copy invariants: no `%`, no `net`, one entry per axis key. |
| `src/components/decks/games-panel.tsx` | The tab panel. Composes the record line, the aggregate panel, the form and the history. |
| `src/components/decks/game-axis-cell.tsx` | One axis cell: label, figure, split bar, gloss. |
| `src/components/decks/game-log-form.tsx` | The inline log form, all fourteen states, including the axis move. |
| `src/components/decks/game-history-row.tsx` | One history row plus its inline delete confirm. |
| `src/components/decks/games-panel.test.tsx` | Panel-level component tests — low-N tiers, bucket order, empty state. |
| `src/components/decks/game-log-form.test.tsx` | Form component tests — the move, the disabled save, the reopen reset. |
| `src/components/decks/game-history-row.test.tsx` | History row tests — the inline confirm. |

**Modified:**

| Path | Change |
|---|---|
| `src/db/schema.ts` | Add `deckGames` and `deckGameAxes` after `deckCards`. |
| `drizzle/` | Whatever `pnpm db:generate` emits. Do not hand-edit. |
| `src/app/decks/actions.ts` | Add `logGame` and `deleteGame`. |
| `src/app/decks/actions.test.ts` | Extend the existing hoisted stub to cover the two new actions. |
| `src/components/decks/builder-tabs.tsx` | Generalise from two hardcoded tabs to a `tabs` array. |
| `src/components/decks/builder-tabs.test.tsx` | Update the mount helper for the new props; add a three-tab keyboard case. |
| `src/components/decks/builder-shell.tsx` | Add `"games"` to the view state and render the panel. |
| `src/app/decks/[id]/page.tsx` | Fetch games, summarise, pass both down. |

### Two deliberate deviations from the spec

**1. Labels live in the copy module, not in `game-axes.ts`.** Spec §3 describes the vocabulary as a frozen `{ key, label }[]`. Shipping it that way puts the axis label in `game-axes.ts` and the worked/hurt glosses in `axisCopy`, which is two homes for one axis's display strings and invites them to drift. Instead `game-axes.ts` owns the keys, their order and the type; `axisCopy` in `src/lib/copy/game-log.ts` owns `{ label, worked, hurt }` and is typed `Record<GameAxisKey, …>` so the compiler rejects a missing or misspelt key. The ordering guarantee the spec wanted from the array survives as `GAME_AXIS_KEYS`.

**2. Refusal messages come from the copy module.** `src/lib/decks/mutation-result.ts` holds the add/remove fallbacks as bare constants, but the handoff already ships `gameLogCopy.form.refused` and `gameLogCopy.history.deleteRefused`. The actions import those rather than defining a second copy of the same sentence. `src/lib/copy/game-log.ts` is plain data with no JSX and no client-only imports, so a server action can import it safely.

---

## Task 1: The axis vocabulary

**Files:**
- Create: `src/lib/decks/game-axes.ts`
- Create: `src/lib/decks/game-axes.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type GameAxisKey`, `const GAME_AXIS_KEYS: readonly GameAxisKey[]`, `function isGameAxisKey(value: string): value is GameAxisKey`, `type AxisPolarity = "worked" | "hurt"`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/decks/game-axes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { GAME_AXIS_KEYS, isGameAxisKey } from "./game-axes";

describe("game axis vocabulary", () => {
  // The order is load-bearing: it is the order marks are drawn in on a history
  // row, and the tie-break when two axes have the same net.
  it("is the eight axes in the specified order", () => {
    expect(GAME_AXIS_KEYS).toEqual([
      "speed",
      "card_flow",
      "mana",
      "interaction",
      "board",
      "resilience",
      "engine",
      "closing",
    ]);
  });

  it("accepts a known key and rejects anything else", () => {
    expect(isGameAxisKey("mana")).toBe(true);
    expect(isGameAxisKey("Mana")).toBe(false);
    expect(isGameAxisKey("tempo")).toBe(false);
    expect(isGameAxisKey("")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/lib/decks/game-axes.test.ts`
Expected: FAIL — "Failed to resolve import ./game-axes".

- [ ] **Step 3: Write the implementation**

Create `src/lib/decks/game-axes.ts`:

```ts
// The fixed vocabulary a game's marks are drawn from. Keys and order only —
// the label and the two glosses live in src/lib/copy/game-log.ts, so an axis
// has exactly one home for its display strings.
//
// The deck_game_axes.axis column is deliberately NOT constrained to this list
// by a check(). Retiring an axis would otherwise orphan every historical row
// that used it; validation happens in the action, where a rejection is a
// message rather than a 500.

export type GameAxisKey =
  | "speed"
  | "card_flow"
  | "mana"
  | "interaction"
  | "board"
  | "resilience"
  | "engine"
  | "closing";

export type AxisPolarity = "worked" | "hurt";

export const GAME_AXIS_KEYS: readonly GameAxisKey[] = [
  "speed",
  "card_flow",
  "mana",
  "interaction",
  "board",
  "resilience",
  "engine",
  "closing",
] as const;

const KEY_SET: ReadonlySet<string> = new Set(GAME_AXIS_KEYS);

export function isGameAxisKey(value: string): value is GameAxisKey {
  return KEY_SET.has(value);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/lib/decks/game-axes.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/decks/game-axes.ts src/lib/decks/game-axes.test.ts
git commit -m "feat(games): fixed axis vocabulary for the game log"
```

---

## Task 2: The two tables and the migration

**Files:**
- Modify: `src/db/schema.ts` (insert after the `deckCards` block, which ends around line 186)
- Create: `drizzle/<generated>.sql` — emitted by `pnpm db:generate`, never hand-written

**Interfaces:**
- Consumes: `decks` from the same file.
- Produces: `deckGames` (columns `id`, `deckId`, `userId`, `result`, `podSize`, `playedAt`, `createdAt`) and `deckGameAxes` (columns `gameId`, `axis`, `polarity`) for Tasks 3, 4 and 5.

- [ ] **Step 1: Add the tables**

Insert into `src/db/schema.ts`, directly after the `deckCards` definition. Every import it needs (`sql`, `pgTable`, `text`, `integer`, `timestamp`, `uuid`, `index`, `check`, `primaryKey`) is already in the file's import block at lines 1–4 — do not add imports.

```ts
/**
 * One logged Commander game against one deck.
 *
 * user_id is denormalised off decks so the read path can filter by owner
 * without a join. It is written from the session, never from the caller, and
 * the action still loads the deck through requireDeck first — the column is a
 * query convenience, not the authorisation boundary.
 *
 * played_at is when the game happened and is what the history sorts on;
 * created_at is when the row was written and exists only to break ties between
 * two games logged for the same day.
 */
export const deckGames = pgTable("deck_games", {
  id: uuid("id").primaryKey().defaultRandom(),
  deckId: uuid("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  result: text("result").notNull(),
  podSize: integer("pod_size").notNull(),
  playedAt: timestamp("played_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  check("deck_games_result_check", sql`${t.result} in ('win', 'loss', 'draw')`),
  check("deck_games_pod_size_check", sql`${t.podSize} between 2 and 8`),
  index("deck_games_deck_played_idx").on(t.deckId, t.playedAt),
]);

/**
 * What worked and what hurt in one game.
 *
 * The composite primary key on (game_id, axis) is the whole point of the
 * table: it makes "mana worked AND mana hurt in the same game" unrepresentable
 * in the database rather than something the aggregation has to reconcile. The
 * form enforces the same rule as a move — ticking an axis on one side unticks
 * it on the other — so a violation reaching Postgres means someone called the
 * action directly.
 *
 * axis is intentionally unconstrained by a check(). Retiring an axis from the
 * vocabulary must not invalidate the games that used it; src/lib/decks/game-axes.ts
 * is the vocabulary, and the action validates against it.
 */
export const deckGameAxes = pgTable("deck_game_axes", {
  gameId: uuid("game_id").notNull().references(() => deckGames.id, { onDelete: "cascade" }),
  axis: text("axis").notNull(),
  polarity: text("polarity").notNull(),
}, (t) => [
  primaryKey({ columns: [t.gameId, t.axis] }),
  check("deck_game_axes_polarity_check", sql`${t.polarity} in ('worked', 'hurt')`),
]);
```

- [ ] **Step 2: Generate the migration**

```bash
pnpm db:generate
```

Expected: a new file under `drizzle/` creating both tables, both foreign keys with `ON DELETE CASCADE`, the three check constraints, the composite primary key and the index. Read it and confirm all of that is present. If Drizzle prompts about a rename, answer that these are new tables — it must never be offered as a rename of an existing one.

- [ ] **Step 3: Verify the schema typechecks and the build survives**

```bash
pnpm typecheck
DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build
```

Expected: both pass. The build runs no queries.

- [ ] **Step 4: Apply the migration locally**

```bash
pnpm db:migrate
```

Expected: the migration applies cleanly against the local branch database.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts drizzle
git commit -m "feat(games): deck_games and deck_game_axes tables"
```

---

## Task 3: `logGame`

**Files:**
- Modify: `src/app/decks/actions.ts` (append at the end of the file)
- Modify: `src/app/decks/actions.test.ts` (extend the hoisted stub, add a describe block)

**Interfaces:**
- Consumes: `requireUserId` from `../../lib/auth`, `requireDeck` (module-private, `src/app/decks/actions.ts:412`), `deckSurfaces` from `../../lib/decks/revalidate`, `DeckMutationResult` from `../../lib/decks/mutation-result`, `deckGames` / `deckGameAxes` from `../../db/schema`, `GAME_AXIS_KEYS` / `isGameAxisKey` / `type GameAxisKey` from `../../lib/decks/game-axes`, `gameLogCopy` from `../../lib/copy/game-log`.
- Produces:
  ```ts
  export type LogGameInput = {
    result: "win" | "loss" | "draw";
    podSize: number;
    playedAt?: Date;
    worked: string[];
    hurt: string[];
  };
  export async function logGame(deckId: string, input: LogGameInput): Promise<DeckMutationResult>;
  ```

**Ordering note:** this task imports `gameLogCopy.form.refused` from `src/lib/copy/game-log.ts`, which Task 6 creates. If Phase 1 is being implemented on its own ahead of Phase 2, create the copy module at Task 6's Step 3 now and do Task 6's tests later — the module is plain data and has no dependency on anything in Phase 2.

- [ ] **Step 1: Write the failing tests**

Append to `src/app/decks/actions.test.ts`. The hoisted `stub` at the top of that file already exposes `state.insertCalls` and a `tx` object; add `deckGames: []` handling to `makeSelectBuilder()` only if a test needs to read one back (this task's tests do not — Task 4's do).

```ts
describe("logGame", () => {
  beforeEach(() => {
    stub.state.insertCalls.length = 0;
    stub.state.deckRows = [{ id: "deck_1", userId: "user_1" }];
  });

  it("writes the game and one row per mark", async () => {
    const result = await logGame("deck_1", {
      result: "win",
      podSize: 4,
      worked: ["mana", "board"],
      hurt: ["card_flow"],
    });

    expect(result).toEqual({ ok: true });

    const games = stub.state.insertCalls.filter((c) => c.table === "deck_games");
    expect(games).toHaveLength(1);
    expect(games[0].values).toMatchObject({
      deckId: "deck_1",
      userId: "user_1",
      result: "win",
      podSize: 4,
    });

    const axes = stub.state.insertCalls.filter((c) => c.table === "deck_game_axes");
    expect(axes[0].values).toEqual([
      { gameId: expect.any(String), axis: "mana", polarity: "worked" },
      { gameId: expect.any(String), axis: "board", polarity: "worked" },
      { gameId: expect.any(String), axis: "card_flow", polarity: "hurt" },
    ]);
  });

  // No marks at all is the fifteen-second log, and it is valid. The axis
  // insert must be skipped entirely rather than called with an empty array,
  // which Drizzle rejects.
  it("writes no axis rows when nothing is marked", async () => {
    const result = await logGame("deck_1", {
      result: "loss", podSize: 4, worked: [], hurt: [],
    });
    expect(result).toEqual({ ok: true });
    expect(stub.state.insertCalls.filter((c) => c.table === "deck_game_axes")).toHaveLength(0);
  });

  // A crafted duplicate would otherwise collide with the (game_id, axis)
  // primary key and surface as a 500 rather than a refusal.
  it("deduplicates a repeated key within one list", async () => {
    await logGame("deck_1", {
      result: "win", podSize: 4, worked: ["mana", "mana"], hurt: [],
    });
    const axes = stub.state.insertCalls.filter((c) => c.table === "deck_game_axes");
    expect(axes[0].values).toHaveLength(1);
  });

  it.each([
    ["an unknown result", { result: "forfeit", podSize: 4, worked: [], hurt: [] }],
    ["a pod below two", { result: "win", podSize: 1, worked: [], hurt: [] }],
    ["a pod above eight", { result: "win", podSize: 9, worked: [], hurt: [] }],
    ["a fractional pod", { result: "win", podSize: 4.5, worked: [], hurt: [] }],
    ["an axis outside the vocabulary", { result: "win", podSize: 4, worked: ["tempo"], hurt: [] }],
    ["an axis on both sides", { result: "win", podSize: 4, worked: ["mana"], hurt: ["mana"] }],
  ])("refuses %s without throwing", async (_label, input) => {
    const result = await logGame("deck_1", input as never);
    expect(result.ok).toBe(false);
    expect(stub.state.insertCalls).toHaveLength(0);
  });

  it("refuses a game played in the future", async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const result = await logGame("deck_1", {
      result: "win", podSize: 4, playedAt: tomorrow, worked: [], hurt: [],
    });
    expect(result.ok).toBe(false);
    expect(stub.state.insertCalls).toHaveLength(0);
  });

  // Neither action changes deck membership, so the collection and commander
  // surfaces must not be revalidated.
  it("revalidates only the deck surfaces", async () => {
    stub.state.revalidated.length = 0;
    await logGame("deck_1", { result: "draw", podSize: 3, worked: [], hurt: [] });
    expect(stub.state.revalidated).toEqual(["/decks/deck_1", "/decks", "/"]);
  });
});
```

To make the last case observable, change the existing `next/cache` mock from `revalidatePath: () => {}` to:

```ts
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => { stub.state.revalidated.push(path); },
}));
```

and add `revalidated: [] as string[]` to the `state` object inside `vi.hoisted`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/app/decks/actions.test.ts -t logGame`
Expected: FAIL — `logGame` is not exported from `./actions`.

- [ ] **Step 3: Write the implementation**

Append to `src/app/decks/actions.ts`:

```ts
export type LogGameInput = {
  result: "win" | "loss" | "draw";
  podSize: number;
  /** When the game was played. Defaults to now. Never in the future. */
  playedAt?: Date;
  worked: string[];
  hurt: string[];
};

const GAME_RESULTS = ["win", "loss", "draw"] as const;

/**
 * Record one game against a deck.
 *
 * Every rejection is returned as { ok: false, message } rather than thrown:
 * the form renders it through the shipped MutationError and keeps every value
 * the player typed, which a thrown error would destroy along with the form.
 *
 * There is no `for update` here, unlike addCardToDeck. That lock exists to keep
 * two concurrent adds from both seeing 98 cards and pushing the deck to 100.
 * A game log has no such ceiling — two concurrent logs are simply two games.
 */
export async function logGame(
  deckId: string,
  input: LogGameInput,
): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);

  const refuse = { ok: false as const, message: gameLogCopy.form.refused };

  if (!GAME_RESULTS.includes(input.result)) return refuse;
  if (!Number.isInteger(input.podSize) || input.podSize < 2 || input.podSize > 8) return refuse;

  const playedAt = input.playedAt ?? new Date();
  if (playedAt.getTime() > Date.now()) return refuse;

  if (!input.worked.every(isGameAxisKey)) return refuse;
  if (!input.hurt.every(isGameAxisKey)) return refuse;

  // Dedupe within a list before checking across them, so ['mana','mana'] is a
  // single mark rather than a primary-key collision, while ['mana'] on both
  // sides is still the contradiction the composite key exists to forbid.
  const worked = [...new Set(input.worked)] as GameAxisKey[];
  const hurt = [...new Set(input.hurt)] as GameAxisKey[];
  if (worked.some((key) => hurt.includes(key))) return refuse;

  try {
    await db.transaction(async (tx) => {
      const [game] = await tx
        .insert(deckGames)
        .values({ deckId, userId, result: input.result, podSize: input.podSize, playedAt })
        .returning({ id: deckGames.id });

      const marks = [
        ...worked.map((axis) => ({ gameId: game.id, axis, polarity: "worked" })),
        ...hurt.map((axis) => ({ gameId: game.id, axis, polarity: "hurt" })),
      ];
      // Drizzle rejects an empty values array, and no marks is a valid log.
      if (marks.length > 0) await tx.insert(deckGameAxes).values(marks);
    });
  } catch {
    return refuse;
  }

  for (const path of deckSurfaces(deckId)) revalidatePath(path);
  return { ok: true };
}
```

Add to the existing import block at the top of the file: `deckGames, deckGameAxes` to the `../../db/schema` import, and two new imports:

```ts
import { isGameAxisKey, type GameAxisKey } from "../../lib/decks/game-axes";
import { gameLogCopy } from "../../lib/copy/game-log";
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test src/app/decks/actions.test.ts`
Expected: PASS — the new `logGame` block plus every pre-existing test in the file still green.

- [ ] **Step 5: Commit**

```bash
git add src/app/decks/actions.ts src/app/decks/actions.test.ts
git commit -m "feat(games): logGame action with validation returned, not thrown"
```

---

## Task 4: `deleteGame`

**Files:**
- Modify: `src/app/decks/actions.ts` (append after `logGame`)
- Modify: `src/app/decks/actions.test.ts`

**Interfaces:**
- Consumes: everything Task 3 consumes.
- Produces: `export async function deleteGame(deckId: string, gameId: string): Promise<DeckMutationResult>;`

- [ ] **Step 1: Write the failing tests**

Append to `src/app/decks/actions.test.ts`. This block needs the select stub to answer a `deck_games` read; add a `deckGames: [] as { id: string; deckId: string }[]` array to `state` and a branch in `makeSelectBuilder()` returning `state.deckGames` when `nameOf(table) === "deck_games"`.

```ts
describe("deleteGame", () => {
  beforeEach(() => {
    stub.state.deckRows = [{ id: "deck_1", userId: "user_1" }];
    stub.state.deckGames = [{ id: "game_1", deckId: "deck_1" }];
    stub.state.deleteCalls.length = 0;
    stub.state.revalidated.length = 0;
  });

  it("deletes the game and revalidates the deck surfaces", async () => {
    const result = await deleteGame("deck_1", "game_1");
    expect(result).toEqual({ ok: true });
    expect(stub.state.deleteCalls).toEqual([{ table: "deck_games", id: "game_1" }]);
    expect(stub.state.revalidated).toEqual(["/decks/deck_1", "/decks", "/"]);
  });

  // The axis rows go with it through ON DELETE CASCADE. An explicit delete of
  // deck_game_axes here would be a second source of truth for the same rule.
  it("does not delete the axis rows itself", async () => {
    await deleteGame("deck_1", "game_1");
    expect(stub.state.deleteCalls.some((c) => c.table === "deck_game_axes")).toBe(false);
  });

  // requireDeck proves the caller owns deck_1; it says nothing about whether
  // game_9 belongs to deck_1. Without the second check, a player could delete
  // another player's game by naming their own deck.
  it("refuses a game that belongs to a different deck", async () => {
    stub.state.deckGames = [{ id: "game_1", deckId: "deck_other" }];
    const result = await deleteGame("deck_1", "game_1");
    expect(result.ok).toBe(false);
    expect(stub.state.deleteCalls).toHaveLength(0);
  });

  it("refuses a game that does not exist", async () => {
    stub.state.deckGames = [];
    const result = await deleteGame("deck_1", "game_1");
    expect(result.ok).toBe(false);
    expect(stub.state.deleteCalls).toHaveLength(0);
  });
});
```

Add to the hoisted stub a `deleteCalls: [] as { table: string; id: string }[]` array and a `db.delete(table)` builder that records `{ table: nameOf(table), id }` from the `where` clause and resolves.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/app/decks/actions.test.ts -t deleteGame`
Expected: FAIL — `deleteGame` is not exported.

- [ ] **Step 3: Write the implementation**

Append to `src/app/decks/actions.ts`:

```ts
/**
 * Remove one logged game. The axis rows follow through ON DELETE CASCADE.
 *
 * There is no edit action by design, so this is the whole correction path: a
 * game logged wrong is deleted and logged again. That is why the history row's
 * confirm is inline and one step rather than a dialog — it is a routine
 * operation, not an exceptional one.
 */
export async function deleteGame(
  deckId: string,
  gameId: string,
): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);

  const refuse = { ok: false as const, message: gameLogCopy.history.deleteRefused };

  // requireDeck above proves the caller owns this deck. It does not prove this
  // game is on it, and the delete is keyed by game id alone — so confirm the
  // pairing before touching anything.
  const [game] = await db
    .select({ id: deckGames.id, deckId: deckGames.deckId })
    .from(deckGames)
    .where(eq(deckGames.id, gameId));
  if (!game || game.deckId !== deckId) return refuse;

  try {
    await db.delete(deckGames).where(eq(deckGames.id, gameId));
  } catch {
    return refuse;
  }

  for (const path of deckSurfaces(deckId)) revalidatePath(path);
  return { ok: true };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test src/app/decks/actions.test.ts`
Expected: PASS — every block in the file.

- [ ] **Step 5: Commit**

```bash
git add src/app/decks/actions.ts src/app/decks/actions.test.ts
git commit -m "feat(games): deleteGame action, ownership checked on both deck and game"
```

---

## Task 5: The read path and the aggregation

**Files:**
- Create: `src/lib/decks/games.ts`
- Create: `src/lib/decks/games.test.ts`

**Interfaces:**
- Consumes: `db` from `../../db`, `deckGames` / `deckGameAxes` from `../../db/schema`, `GAME_AXIS_KEYS` / `type GameAxisKey` / `type AxisPolarity` from `./game-axes`.
- Produces:
  ```ts
  export type DeckGame = {
    id: string;
    result: "win" | "loss" | "draw";
    podSize: number;
    playedAt: Date;
    worked: GameAxisKey[];
    hurt: GameAxisKey[];
  };
  export type AxisTally = { key: GameAxisKey; worked: number; hurt: number; net: number };
  export type GameSummary = {
    count: number;
    record: { wins: number; losses: number; draws: number };
    axes: AxisTally[];
    keep: AxisTally[];
    fix: AxisTally[];
    mixed: AxisTally[];
  };
  export async function listDeckGames(deckId: string, userId: string): Promise<DeckGame[]>;
  export function summarizeGames(games: DeckGame[]): GameSummary;
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/lib/decks/games.test.ts`. Only `summarizeGames` is tested — it is pure, which is the entire reason the aggregation was split out from the query.

```ts
import { describe, expect, it } from "vitest";
import { summarizeGames, type DeckGame } from "./games";

function game(over: Partial<DeckGame> = {}): DeckGame {
  return {
    id: "g",
    result: "win",
    podSize: 4,
    playedAt: new Date("2026-09-01"),
    worked: [],
    hurt: [],
    ...over,
  };
}

describe("summarizeGames", () => {
  it("returns an empty summary for no games", () => {
    const s = summarizeGames([]);
    expect(s.count).toBe(0);
    expect(s.record).toEqual({ wins: 0, losses: 0, draws: 0 });
    expect(s.axes).toEqual([]);
    expect(s.keep).toEqual([]);
    expect(s.fix).toEqual([]);
    expect(s.mixed).toEqual([]);
  });

  it("counts the record across all three results", () => {
    const s = summarizeGames([
      game({ result: "win" }),
      game({ result: "win" }),
      game({ result: "loss" }),
      game({ result: "draw" }),
    ]);
    expect(s.count).toBe(4);
    expect(s.record).toEqual({ wins: 2, losses: 1, draws: 1 });
  });

  // An axis nobody has ever marked is absent, not a zero row — otherwise the
  // panel would draw eight cells at N=1 for one marked axis.
  it("omits an axis with no marks", () => {
    const s = summarizeGames([game({ worked: ["mana"] })]);
    expect(s.axes.map((a) => a.key)).toEqual(["mana"]);
  });

  it("buckets by net, and mixed is exactly net zero", () => {
    const s = summarizeGames([
      game({ worked: ["mana", "board"], hurt: ["card_flow"] }),
      game({ worked: ["board"], hurt: ["mana", "card_flow"] }),
    ]);
    expect(s.keep.map((a) => a.key)).toEqual(["board"]);
    expect(s.fix.map((a) => a.key)).toEqual(["card_flow"]);
    expect(s.mixed.map((a) => a.key)).toEqual(["mana"]);
  });

  it("orders each bucket by absolute net, then by key", () => {
    const s = summarizeGames([
      game({ hurt: ["card_flow", "mana", "speed"] }),
      game({ hurt: ["card_flow", "mana"] }),
      game({ hurt: ["card_flow"] }),
    ]);
    // card_flow at -3 leads; mana and speed at -2 and -1 follow by magnitude.
    expect(s.fix.map((a) => a.key)).toEqual(["card_flow", "mana", "speed"]);

    const tied = summarizeGames([game({ hurt: ["mana", "board"] })]);
    // Equal magnitude falls back to the vocabulary order, not alphabetical:
    // board precedes mana in GAME_AXIS_KEYS.
    expect(tied.fix.map((a) => a.key)).toEqual(["board", "mana"]);
  });

  it("carries both counts so the cell can print a denominator", () => {
    const s = summarizeGames([
      game({ worked: ["mana"] }),
      game({ hurt: ["mana"] }),
      game({ worked: ["mana"] }),
    ]);
    expect(s.axes[0]).toEqual({ key: "mana", worked: 2, hurt: 1, net: 1 });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/lib/decks/games.test.ts`
Expected: FAIL — "Failed to resolve import ./games".

- [ ] **Step 3: Write the implementation**

Create `src/lib/decks/games.ts`:

```ts
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { deckGames, deckGameAxes } from "../../db/schema";
import { GAME_AXIS_KEYS, type AxisPolarity, type GameAxisKey } from "./game-axes";

export type DeckGame = {
  id: string;
  result: "win" | "loss" | "draw";
  podSize: number;
  playedAt: Date;
  worked: GameAxisKey[];
  hurt: GameAxisKey[];
};

export type AxisTally = {
  key: GameAxisKey;
  worked: number;
  hurt: number;
  /** Orders and buckets the axes. NEVER rendered — see the plan's constraints. */
  net: number;
};

export type GameSummary = {
  count: number;
  record: { wins: number; losses: number; draws: number };
  axes: AxisTally[];
  keep: AxisTally[];
  fix: AxisTally[];
  mixed: AxisTally[];
};

/**
 * Every game on a deck, newest first, with its marks attached.
 *
 * Two queries and a join in memory rather than one joined query: a joined read
 * returns one row per mark and has to be de-duplicated back into games anyway,
 * and the mark set per deck is small enough that the second round trip is
 * cheaper than that reassembly is to get wrong. created_at breaks the tie when
 * two games share a played_at, which the date-only form makes common.
 */
export async function listDeckGames(deckId: string, userId: string): Promise<DeckGame[]> {
  const rows = await db
    .select({
      id: deckGames.id,
      result: deckGames.result,
      podSize: deckGames.podSize,
      playedAt: deckGames.playedAt,
    })
    .from(deckGames)
    .where(and(eq(deckGames.deckId, deckId), eq(deckGames.userId, userId)))
    .orderBy(desc(deckGames.playedAt), desc(deckGames.createdAt));

  if (rows.length === 0) return [];

  const marks = await db
    .select({ gameId: deckGameAxes.gameId, axis: deckGameAxes.axis, polarity: deckGameAxes.polarity })
    .from(deckGameAxes)
    .innerJoin(deckGames, eq(deckGames.id, deckGameAxes.gameId))
    .where(and(eq(deckGames.deckId, deckId), eq(deckGames.userId, userId)))
    .orderBy(asc(deckGameAxes.axis));

  const byGame = new Map<string, { worked: GameAxisKey[]; hurt: GameAxisKey[] }>();
  for (const row of rows) byGame.set(row.id, { worked: [], hurt: [] });
  for (const mark of marks) {
    const bucket = byGame.get(mark.gameId);
    if (!bucket) continue;
    // A row whose axis has since left the vocabulary is dropped from the read
    // rather than deleted from the table — the game itself is still history.
    const key = mark.axis as GameAxisKey;
    if (!GAME_AXIS_KEYS.includes(key)) continue;
    (mark.polarity as AxisPolarity) === "worked" ? bucket.worked.push(key) : bucket.hurt.push(key);
  }

  return rows.map((row) => ({
    id: row.id,
    result: row.result as DeckGame["result"],
    podSize: row.podSize,
    playedAt: row.playedAt,
    worked: byGame.get(row.id)!.worked,
    hurt: byGame.get(row.id)!.hurt,
  }));
}

/**
 * Pure. Takes rows that are already loaded and returns everything the panel
 * draws — which is what makes the whole aggregation testable without a
 * database, and why listDeckGames does no counting of its own.
 *
 * There is deliberately no minimum-games gate here. summarizeGames answers the
 * same way at N=1 as at N=30; PATTERN_MIN is a rendering decision the panel
 * makes about ink and headings, not a rule about what the data means.
 */
export function summarizeGames(games: DeckGame[]): GameSummary {
  const record = { wins: 0, losses: 0, draws: 0 };
  const tallies = new Map<GameAxisKey, AxisTally>();

  for (const g of games) {
    if (g.result === "win") record.wins += 1;
    else if (g.result === "loss") record.losses += 1;
    else record.draws += 1;

    for (const key of g.worked) tally(tallies, key).worked += 1;
    for (const key of g.hurt) tally(tallies, key).hurt += 1;
  }

  const axes = [...tallies.values()].map((t) => ({ ...t, net: t.worked - t.hurt }));

  return {
    count: games.length,
    record,
    axes: sortAxes(axes),
    keep: sortAxes(axes.filter((a) => a.net > 0)),
    fix: sortAxes(axes.filter((a) => a.net < 0)),
    mixed: sortAxes(axes.filter((a) => a.net === 0)),
  };
}

function tally(map: Map<GameAxisKey, AxisTally>, key: GameAxisKey): AxisTally {
  const existing = map.get(key);
  if (existing) return existing;
  const created = { key, worked: 0, hurt: 0, net: 0 };
  map.set(key, created);
  return created;
}

// Strongest signal first. The tie-break is the vocabulary order rather than
// alphabetical, so two axes of equal weight always appear in the same sequence
// they appear in on the form and on a history row.
function sortAxes(axes: AxisTally[]): AxisTally[] {
  return [...axes].sort((a, b) => {
    const byMagnitude = Math.abs(b.net) - Math.abs(a.net);
    if (byMagnitude !== 0) return byMagnitude;
    return GAME_AXIS_KEYS.indexOf(a.key) - GAME_AXIS_KEYS.indexOf(b.key);
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test src/lib/decks/games.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/decks/games.ts src/lib/decks/games.test.ts
git commit -m "feat(games): read path with a pure summarizeGames"
```

**Phase 1 ends here.** At this point the feature is fully writable and readable with no UI. Run the full gate before moving on: `pnpm typecheck && pnpm lint && pnpm test` plus the stub-DB build.

---

# Phase 2 — the UI

Everything below is gated on `design/design_handoff_the99_game_log/`, which passed its readiness audit 🟢 Green on 2026-09-05. Read `README.md`'s component-notes table before starting: it carries the exact geometry for every element, and each UI task below cites the row it implements rather than restating the figures a second time where they run long.

### Four corrections carried from the readiness audit

The audit resolved these eng-side rather than sending the handoff back. Where a task below conflicts with the handoff's literal text, these win.

1. **The tab is an underline, not a pill.** The Games-tab row of the component-notes table describes a "999px pill, brass solid selected", but its own operative clause is `BuilderTabs` **unchanged**, and the shipped `BuilderTabs` is a `border-b-2` underline. The shipped treatment wins: Task 7 changes the component's props and keyboard handling and touches no className. The count separator in that row (`· {n}`) does match `gameLogCopy.tab.labelWithCount`.
2. **`--base` does not exist.** The Result group's "Won selected: `--success` fill, `--base` label" names a token that is in no theme block of `src/app/globals.css`. The label on a filled swatch is **`--bg`**, which is what every other filled control in the app uses.
3. **The N=1 mark ordering is the vocabulary order.** `LOW-N-summary.md` pins it ("marks under `What that one game said` in vocabulary order"); the spec left it unstated. `summarizeGames` already returns ties in `GAME_AXIS_KEYS` order, so at N=1 — where every tally is ±1 and the magnitudes are equal — the vocabulary order falls out of the existing sort with no special case.
4. **The axis cell copies `role-counter-cell`, it does not import it.** Decision 7 asks for that cell's geometry with a two-segment bar and a different fill. `role-counter-cell.tsx` and `role-counter-strip.tsx` are **read, not edited** — extracting a shared primitive to serve two callers with different bars would cost more than the duplication.

## Task 6: The copy module

**Files:**
- Create: `src/lib/copy/game-log.ts`
- Create: `src/lib/copy/game-log.test.ts`
- Source: `design/design_handoff_the99_game_log/game-log · copy strings.ts`

**Interfaces:**
- Consumes: `type GameAxisKey` from `../decks/game-axes`.
- Produces: `export const PATTERN_MIN = 3;`, `export const axisCopy: Record<GameAxisKey, { label: string; worked: string; hurt: string }>`, `export const gameLogCopy` with sections `tab`, `empty`, `headline`, `buckets`, `cell`, `form`, `history`, `announce`.

- [ ] **Step 1: Copy the handoff file into place**

```bash
cp "design/design_handoff_the99_game_log/game-log · copy strings.ts" src/lib/copy/game-log.ts
```

Then make exactly three edits to the copied file and nothing else — the strings themselves are Design's and are not to be reworded:

1. Add `import type { GameAxisKey } from "../decks/game-axes";` at the top.
2. Type the export as `export const axisCopy: Record<GameAxisKey, { label: string; worked: string; hurt: string }> = { … }` so a missing or misspelt key is a compile error rather than a blank label at runtime.
3. Replace the file's header comment path with `// src/lib/copy/game-log.ts — deck game log (#9).` and keep the rest of that comment, including the line stating that no string prints a percentage and no string prints `net`.

- [ ] **Step 2: Write the failing test**

Create `src/lib/copy/game-log.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { GAME_AXIS_KEYS } from "../decks/game-axes";
import { PATTERN_MIN, axisCopy, gameLogCopy } from "./game-log";

// Walk every string the module exports, following functions by calling them
// with plausible arguments, so an invariant cannot be broken in a branch no
// test happens to render.
function allStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function") {
    const out: string[] = [];
    for (const args of [[0], [1], [2], [3], [0, 0], [2, 3], [3, 1, 1]]) {
      try {
        const result = (value as (...a: number[]) => unknown)(...args);
        if (typeof result === "string") out.push(result);
      } catch {
        // A string function with a different arity — covered by another tuple.
      }
    }
    return out;
  }
  if (value && typeof value === "object") return Object.values(value).flatMap(allStrings);
  return [];
}

describe("game log copy", () => {
  it("has one entry per axis and no extras", () => {
    expect(Object.keys(axisCopy).sort()).toEqual([...GAME_AXIS_KEYS].sort());
  });

  // The pattern threshold is a judgement Design made once. Inlining 3 anywhere
  // else means the next person changes it in one place and not the other.
  it("exports the pattern threshold as the single source", () => {
    expect(PATTERN_MIN).toBe(3);
  });

  // The governing rule of the whole feature: a count out of three games is a
  // count, and dressing it as 67% claims a precision three games cannot carry.
  it("never prints a percentage", () => {
    for (const s of allStrings(gameLogCopy)) expect(s).not.toMatch(/%/);
    for (const s of allStrings(axisCopy)) expect(s).not.toMatch(/%/);
  });

  it("never names net", () => {
    for (const s of allStrings(gameLogCopy)) expect(s).not.toMatch(/\bnet\b/i);
  });

  // A minus sign in a figure would read as a score. The cell says "3 of 3",
  // never "−3".
  it("never prints a signed figure", () => {
    for (const s of allStrings(gameLogCopy.cell)) expect(s).not.toMatch(/[−-]\d/);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails, then passes**

Run: `pnpm test src/lib/copy/game-log.test.ts`
Expected before Step 1's edits: FAIL on the axis-key test if any key was mistyped. After the copy and the three edits: PASS, 5 tests. If the percentage or `net` tests fail, the failure is in the copied strings — report it rather than editing Design's wording.

- [ ] **Step 4: Commit**

```bash
git add src/lib/copy/game-log.ts src/lib/copy/game-log.test.ts
git commit -m "feat(games): game log copy module with its invariants under test"
```

---

## Task 7: Generalise `BuilderTabs` to an arbitrary number of tabs

**Files:**
- Modify: `src/components/decks/builder-tabs.tsx`
- Modify: `src/components/decks/builder-tabs.test.tsx`
- Modify: `src/components/decks/builder-shell.tsx` (the call site, at the `<BuilderTabs …>` element)

**Interfaces:**
- Consumes: `addPanelCopy` from `../../lib/copy/decks-builder` (already imported by `builder-shell.tsx`).
- Produces:
  ```ts
  export type BuilderView = "deck" | "consider" | "games";
  export interface BuilderTabSpec {
    id: BuilderView;
    label: string;
    /** Omitted entirely when there is nothing to count — the tab then shows a bare label. */
    count?: number;
    accessibleName: string;
  }
  interface BuilderTabsProps {
    tabs: readonly BuilderTabSpec[];
    view: BuilderView;
    onViewChange: (view: BuilderView) => void;
    children?: React.ReactNode;
  }
  ```

**Why this is its own task:** the shipped component hardcodes two tabs. Its `onKeyDown` maps ArrowRight to the literal `"consider"` and ArrowLeft to the literal `"deck"`, and `Tab` requires a `count`. A third tab cannot be added without replacing both, and the Games tab shows a bare `Games` at zero rather than `Games · 0` (handoff README, Decision 8), so the count has to become optional. Doing this as a mechanical refactor first, with the existing keyboard tests still green, keeps the regression risk off the feature task.

- [ ] **Step 1: Update the existing tests to the new props, and add the three-tab cases**

In `src/components/decks/builder-tabs.test.tsx`, replace the `mount` helper:

```tsx
const DECK_TAB = { id: "deck" as const, label: "In deck", count: 12, accessibleName: "In deck, 12 cards" };
const CONSIDER_TAB = { id: "consider" as const, label: "Consider", count: 30, accessibleName: "Consider, 30 cards" };
const GAMES_TAB = { id: "games" as const, label: "Games", count: 3, accessibleName: "Games, 3 logged" };

function mount(
  view: BuilderView = "deck",
  onViewChange = vi.fn(),
  tabs: readonly BuilderTabSpec[] = [DECK_TAB, CONSIDER_TAB],
) {
  render(<BuilderTabs tabs={tabs} view={view} onViewChange={onViewChange} />);
  return onViewChange;
}
```

Every existing assertion in the file stays exactly as written — that is the point of the refactor. Then append:

```tsx
describe("BuilderTabs — three tabs", () => {
  const three = [DECK_TAB, CONSIDER_TAB, GAMES_TAB];

  it("steps one tab at a time rather than jumping to an end", () => {
    const onViewChange = mount("consider", vi.fn(), three);
    fireEvent.keyDown(tabs()[1], { key: "ArrowRight" });
    expect(onViewChange).toHaveBeenCalledWith("games");
  });

  it("wraps at both ends", () => {
    const onViewChange = mount("deck", vi.fn(), three);
    fireEvent.keyDown(tabs()[0], { key: "ArrowLeft" });
    expect(onViewChange).toHaveBeenCalledWith("games");

    onViewChange.mockClear();
    const second = mount("games", onViewChange, three);
    fireEvent.keyDown(tabs()[2], { key: "ArrowRight" });
    expect(second).toHaveBeenCalledWith("deck");
  });

  it("puts End on the last tab, not on Consider", () => {
    const onViewChange = mount("deck", vi.fn(), three);
    fireEvent.keyDown(tabs()[0], { key: "End" });
    expect(onViewChange).toHaveBeenCalledWith("games");
  });

  // Decision 8: the Games tab never disappears, and at zero it is a bare label
  // rather than "Games · 0" — a zero beside a label reads as a failure state.
  it("renders no count element when count is omitted", () => {
    render(
      <BuilderTabs
        tabs={[DECK_TAB, { id: "games", label: "Games", accessibleName: "Games, none logged" }]}
        view="deck"
        onViewChange={vi.fn()}
      />,
    );
    expect(tabs()[1]).toHaveAccessibleName("Games, none logged");
    expect(tabs()[1].textContent).toBe("Games");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/components/decks/builder-tabs.test.tsx`
Expected: FAIL — `BuilderTabs` does not accept a `tabs` prop.

- [ ] **Step 3: Rewrite the component**

In `src/components/decks/builder-tabs.tsx`, keep every className and every ARIA attribute exactly as shipped. The only changes are the props, the map, and the keyboard handler:

```tsx
export type BuilderView = "deck" | "consider" | "games";

export interface BuilderTabSpec {
  id: BuilderView;
  label: string;
  /** Omitted when there is nothing to count. A bare label renders instead. */
  count?: number;
  accessibleName: string;
}

interface BuilderTabsProps {
  tabs: readonly BuilderTabSpec[];
  view: BuilderView;
  onViewChange: (view: BuilderView) => void;
  children?: React.ReactNode;
}
```

The handler becomes index arithmetic over `tabs` rather than two literals. Keep the existing guard — the desktop toolbar rides this row as a child, and acting on its arrow keys would make the sort select unusable by keyboard:

```tsx
function onKeyDown(e: React.KeyboardEvent) {
  if ((e.target as HTMLElement).getAttribute("role") !== "tab") return;
  const current = tabs.findIndex((t) => t.id === view);
  let next: number;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (current + 1) % tabs.length;
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (current - 1 + tabs.length) % tabs.length;
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = tabs.length - 1;
  else return;

  e.preventDefault();
  const id = tabs[next].id;
  onViewChange(id);
  document.getElementById(`tab-${id}`)?.focus();
}
```

In `Tab`, make `count` optional and render the `<span aria-hidden>` only when it is a number:

```tsx
{typeof count === "number" && <span aria-hidden>{count}</span>}
```

The rest of `Tab` — the `flex items-baseline gap-[6px] min-h-[44px] pb-[8px] md:pb-[10px]` className, the `border-b-2` selected/unselected branch, `aria-controls={selected ? panelId : undefined}` and `tabIndex={selected ? 0 : -1}` — is unchanged.

- [ ] **Step 4: Update the call site**

In `src/components/decks/builder-shell.tsx`, replace the `deckCount` / `considerCount` props with the array. The labels and accessible names still come from `addPanelCopy`, exactly as they did:

```tsx
<BuilderTabs
  tabs={[
    { id: "deck", label: addPanelCopy.tabs.deck, count: built, accessibleName: addPanelCopy.tabs.deckAria(built) },
    { id: "consider", label: addPanelCopy.tabs.consider, count: suggestions.length, accessibleName: addPanelCopy.tabs.considerAria(suggestions.length) },
  ]}
  view={view}
  onViewChange={setView}
>
```

The Games entry is added in Task 8, not here — this task changes shape only, never behaviour.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test src/components/decks/builder-tabs.test.tsx && pnpm typecheck`
Expected: PASS — the six original keyboard tests plus the four new ones.

- [ ] **Step 6: Commit**

```bash
git add src/components/decks/builder-tabs.tsx src/components/decks/builder-tabs.test.tsx src/components/decks/builder-shell.tsx
git commit -m "refactor(decks): BuilderTabs takes a tab list instead of two hardcoded tabs"
```

---

## Task 8: Fetch the games and mount an empty Games panel

**Files:**
- Modify: `src/app/decks/[id]/page.tsx`
- Modify: `src/components/decks/builder-shell.tsx`
- Create: `src/components/decks/games-panel.tsx`

**Interfaces:**
- Consumes: `listDeckGames` / `summarizeGames` / `type DeckGame` / `type GameSummary` from `../../lib/decks/games` (Task 5), `gameLogCopy` from `../../lib/copy/game-log` (Task 6), `BuilderTabSpec` from `./builder-tabs` (Task 7).
- Produces:
  ```ts
  export interface GamesPanelProps {
    deckId: string;
    games: DeckGame[];
    summary: GameSummary;
  }
  export function GamesPanel(props: GamesPanelProps): React.ReactElement;
  ```
  `BuilderShellProps` gains `games: DeckGame[]` and `gameSummary: GameSummary`.

**Why the panel starts empty:** this task proves the data reaches the screen and the third tab behaves, with nothing drawn inside but a heading. Tasks 9–13 fill it. Splitting it this way means a reviewer can reject the wiring without rejecting the aggregate panel, and vice versa.

- [ ] **Step 1: Fetch on the page**

In `src/app/decks/[id]/page.tsx`, add `listDeckGames` to the existing `Promise.all` — it is independent of every other read there, so it must not become a fourth sequential await:

```tsx
const [{ suggestions, degraded, shoppingFigures }, allDecks, ranked, games] = await Promise.all([
  getDeckSuggestions(id),
  listDecksWithStats(userId),
  openSlots > 0 ? readSynergyCards(userId, detail.commander.oracleId, []) : [],
  listDeckGames(id, userId),
]);
```

Summarise once here rather than in the panel — the function is pure and the page is already a server component, so doing it on the client would ship the aggregation to the browser for no gain:

```tsx
const gameSummary = summarizeGames(games);
```

Pass both to `BuilderShell`: `games={games} gameSummary={gameSummary}`.

Add the import: `import { listDeckGames, summarizeGames } from "../../../lib/decks/games";`

- [ ] **Step 2: Add the tab and the panel to the shell**

In `src/components/decks/builder-shell.tsx`:

- Add `games: DeckGame[];` and `gameSummary: GameSummary;` to `BuilderShellProps`, and destructure both.
- Append a third entry to the `tabs` array from Task 7. The count is omitted at zero so the tab reads as a bare `Games`:

  ```tsx
  {
    id: "games",
    label: gameLogCopy.tab.label,
    count: games.length > 0 ? games.length : undefined,
    accessibleName: gameLogCopy.tab.aria(games.length),
  },
  ```

  If `gameLogCopy.tab` has no `aria` member after Task 6, add one there rather than composing the string here — every string in this feature comes from the copy module.

- Extend the panel ternary to a three-way branch. Keep the existing `id` / `role` / `aria-labelledby` shape:

  ```tsx
  {view === "games" ? (
    <div id="panel-games" role="tabpanel" aria-labelledby="tab-games">
      <GamesPanel deckId={deck.id} games={games} summary={gameSummary} />
    </div>
  ) : view === "consider" ? (
    …existing ConsiderPanel branch, unchanged…
  ) : (
    …existing deck branch, unchanged…
  )}
  ```

- [ ] **Step 3: Create the panel shell**

Create `src/components/decks/games-panel.tsx`. At this task it renders only its own container and the history heading; Tasks 9–13 add the rest.

```tsx
"use client";

import type { DeckGame, GameSummary } from "../../lib/decks/games";
import { gameLogCopy } from "../../lib/copy/game-log";

export interface GamesPanelProps {
  deckId: string;
  games: DeckGame[];
  summary: GameSummary;
}

export function GamesPanel({ games, summary }: GamesPanelProps) {
  return (
    <section className="px-[16px] py-[14px] md:px-[30px] md:py-[20px]">
      <h2 className="font-mono uppercase text-[9px] md:text-[11px] tracking-[0.1em] md:tracking-[0.12em] text-[color:var(--fg-faint)]">
        {gameLogCopy.history.heading}
      </h2>
      <p className="sr-only">{summary.count} games</p>
      <ul>
        {games.map((g) => (
          <li key={g.id}>{g.result}</li>
        ))}
      </ul>
    </section>
  );
}
```

The `<p className="sr-only">` and the bare `<li>` are scaffolding for this task only. Task 12 replaces the list and Task 9 replaces the paragraph — neither survives into the final feature, and the design-review pass in Task 14 will fail if either does.

- [ ] **Step 4: Verify by hand in the browser**

```bash
pnpm dev
```

Open a deck with no games. Expected: a third tab reading a bare `Games`, no count beside it; clicking it shows the heading; the arrow keys walk all three tabs and wrap. Then log a game directly against the database or through a temporary call to `logGame`, reload, and confirm the tab now reads `Games · 1`.

- [ ] **Step 5: Run the gate and commit**

Run: `pnpm typecheck && pnpm lint && pnpm test`

```bash
git add src/app/decks/\[id\]/page.tsx src/components/decks/builder-shell.tsx src/components/decks/games-panel.tsx
git commit -m "feat(games): fetch the game log and mount the Games tab"
```

---

## Task 9: The derived headline and the record line

**Files:**
- Create: `src/lib/decks/game-headline.ts`
- Create: `src/lib/decks/game-headline.test.ts`
- Modify: `src/components/decks/games-panel.tsx`

**Interfaces:**
- Consumes: `type GameSummary` / `type AxisTally` from `./games`, `PATTERN_MIN` / `axisCopy` / `gameLogCopy` from `../copy/game-log`.
- Produces:
  ```ts
  export type Headline = { heading: string; sub: string; record: string };
  export function deriveHeadline(summary: GameSummary): Headline | null;
  ```
  `null` when there are no games — the empty state (Task 13) is the whole tab at N=0.

**The ladder** (handoff `LOW-N-summary.md`, "Headline fallback order at every N≥1"): strongest Fix → strongest Keep → a plain Mixed-only statement → the record line alone. `summary.fix` and `summary.keep` are already sorted strongest-first by Task 5, so "strongest" is `[0]` and there is no new ranking rule here.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/decks/game-headline.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { deriveHeadline } from "./game-headline";
import { summarizeGames, type DeckGame } from "./games";
import { PATTERN_MIN } from "../copy/game-log";

function game(over: Partial<DeckGame> = {}): DeckGame {
  return { id: "g", result: "win", podSize: 4, playedAt: new Date("2026-09-01"), worked: [], hurt: [], ...over };
}

describe("deriveHeadline", () => {
  it("is null with no games, because the empty state replaces the whole panel", () => {
    expect(deriveHeadline(summarizeGames([]))).toBeNull();
  });

  it("leads with the strongest Fix when one exists", () => {
    const h = deriveHeadline(summarizeGames([
      game({ hurt: ["card_flow", "mana"] }),
      game({ hurt: ["card_flow"], worked: ["board"] }),
      game({ hurt: ["card_flow"], worked: ["board"] }),
    ]))!;
    expect(h.heading).toContain(axisLabel("card_flow"));
    expect(h.heading).not.toContain(axisLabel("board"));
  });

  it("falls to the strongest Keep when nothing is negative", () => {
    const h = deriveHeadline(summarizeGames([
      game({ worked: ["board"] }),
      game({ worked: ["board"] }),
      game({ worked: ["board", "mana"] }),
    ]))!;
    expect(h.heading).toContain(axisLabel("board"));
  });

  it("states the mixed case plainly when every axis is net zero", () => {
    const h = deriveHeadline(summarizeGames([
      game({ worked: ["mana"] }),
      game({ hurt: ["mana"] }),
      game({ worked: ["board"] }),
      game({ hurt: ["board"] }),
    ]))!;
    expect(h.heading).toBe(gameLogCopy.headline.findingNone);
  });

  it("falls all the way to the record when nothing is marked at all", () => {
    const h = deriveHeadline(summarizeGames([game(), game(), game()]))!;
    expect(h.heading).toBe(gameLogCopy.headline.recordOnly);
  });

  // The whole point of PATTERN_MIN: below it, the panel must not claim a
  // pattern it does not have, however lopsided one axis looks.
  it("uses the one-game voice at N=1 even with a strong mark", () => {
    const h = deriveHeadline(summarizeGames([game({ hurt: ["mana"] })]))!;
    expect(h.heading).toBe(gameLogCopy.headline.oneGame);
    expect(h.sub).toBe(gameLogCopy.headline.oneGameNote);
  });

  it("uses the two-game voice at N=2", () => {
    const h = deriveHeadline(summarizeGames([game({ hurt: ["mana"] }), game({ hurt: ["mana"] })]))!;
    expect(h.heading).toBe(gameLogCopy.headline.twoGames);
  });

  it("switches to the pattern voice exactly at PATTERN_MIN", () => {
    const games = Array.from({ length: PATTERN_MIN }, () => game({ hurt: ["mana"] }));
    const h = deriveHeadline(summarizeGames(games))!;
    expect(h.heading).not.toBe(gameLogCopy.headline.twoGames);
    expect(h.heading).toContain(axisLabel("mana"));
  });

  it("renders the record with draws only when there are draws", () => {
    const noDraws = deriveHeadline(summarizeGames([game({ result: "win" }), game({ result: "loss" })]))!;
    expect(noDraws.record).toBe(gameLogCopy.headline.record(1, 1));

    const withDraws = deriveHeadline(summarizeGames([
      game({ result: "win" }), game({ result: "loss" }), game({ result: "draw" }),
    ]))!;
    expect(withDraws.record).toBe(gameLogCopy.headline.recordWithDraws(1, 1, 1));
  });

  it("never prints a percentage or a signed number", () => {
    const h = deriveHeadline(summarizeGames([
      game({ hurt: ["mana"] }), game({ hurt: ["mana"] }), game({ hurt: ["mana"] }),
    ]))!;
    for (const s of [h.heading, h.sub, h.record]) {
      expect(s).not.toMatch(/%/);
      expect(s).not.toMatch(/[−-]\d/);
    }
  });
});
```

Add at the top of that file, beside the other imports:

```ts
import { axisCopy, gameLogCopy } from "../copy/game-log";
const axisLabel = (key: keyof typeof axisCopy) => axisCopy[key].label;
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/lib/decks/game-headline.test.ts`
Expected: FAIL — "Failed to resolve import ./game-headline".

- [ ] **Step 3: Write the implementation**

Create `src/lib/decks/game-headline.ts`:

```ts
import { PATTERN_MIN, axisCopy, gameLogCopy } from "../copy/game-log";
import type { AxisTally, GameSummary } from "./games";

export type Headline = {
  /** The Cinzel line. */
  heading: string;
  /** The 13.5px body line beneath it. */
  sub: string;
  /** The record, rendered mono inside the sub line. */
  record: string;
};

/**
 * The one sentence above the buckets.
 *
 * Derived on every render rather than stored: a headline written at log time
 * would be wrong the moment the next game was logged or an old one deleted.
 *
 * The ladder is strongest Fix, then strongest Keep, then a plain statement when
 * everything cancels out, then the record alone. summary.fix and summary.keep
 * arrive sorted strongest-first from summarizeGames, so "strongest" is [0] and
 * this function introduces no ranking of its own.
 *
 * Below PATTERN_MIN the ladder is not consulted at all. Two games with the same
 * axis marked twice is not a pattern, and a headline that named it would be the
 * feature lying about how much it knows.
 */
export function deriveHeadline(summary: GameSummary): Headline | null {
  if (summary.count === 0) return null;

  const record = summary.record.draws > 0
    ? gameLogCopy.headline.recordWithDraws(summary.record.wins, summary.record.losses, summary.record.draws)
    : gameLogCopy.headline.record(summary.record.wins, summary.record.losses);

  if (summary.count === 1) {
    return { heading: gameLogCopy.headline.oneGame, sub: gameLogCopy.headline.oneGameNote, record };
  }
  if (summary.count < PATTERN_MIN) {
    return { heading: gameLogCopy.headline.twoGames, sub: gameLogCopy.headline.twoGamesNote, record };
  }

  const worst: AxisTally | undefined = summary.fix[0];
  if (worst) {
    return {
      heading: gameLogCopy.headline.finding(axisCopy[worst.key].label, worst.hurt, summary.count),
      sub: gameLogCopy.headline.sub,
      record,
    };
  }

  const best: AxisTally | undefined = summary.keep[0];
  if (best) {
    return {
      heading: gameLogCopy.headline.findingKeep(axisCopy[best.key].label, best.worked, summary.count),
      sub: gameLogCopy.headline.sub,
      record,
    };
  }

  // Every axis cancelled out, or nothing was ever marked. The two cases read
  // differently: one is a deck with no clear tendency, the other is a log with
  // no marks in it at all.
  if (summary.axes.length > 0) {
    return { heading: gameLogCopy.headline.findingNone, sub: gameLogCopy.headline.subAll, record };
  }
  return { heading: gameLogCopy.headline.recordOnly, sub: gameLogCopy.headline.sub, record };
}
```

If any of `finding`, `findingKeep`, `findingNone`, `recordOnly`, `twoGamesNote`, `record` or `recordWithDraws` has a different arity in the copied module, match the copy module — it is Design's file and this function adapts to it, not the reverse.

- [ ] **Step 4: Render it in the panel**

In `src/components/decks/games-panel.tsx`, replace the `<p className="sr-only">` scaffold with the record block, above the history heading. Component-notes row **Record line**: Cinzel 26px `--fg` (20px phone), body 13.5px `--fg-body` beneath, and the record itself mono 13px `--accent` tabular inside that body line.

```tsx
const headline = deriveHeadline(summary);
```

```tsx
{headline && (
  <header className="mb-[14px] md:mb-[20px]">
    <h3 className="font-display text-[20px] md:text-[26px] leading-[1.2] text-[color:var(--fg)]">
      {headline.heading}
    </h3>
    <p className="mt-[6px] text-[13.5px] leading-[1.5] text-[color:var(--fg-body)]">
      <span className="font-mono text-[13px] tabular-nums text-[color:var(--accent)]">
        {headline.record}
      </span>
      {" — "}
      {headline.sub}
    </p>
  </header>
)}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test src/lib/decks/game-headline.test.ts && pnpm typecheck`
Expected: PASS, 10 tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/decks/game-headline.ts src/lib/decks/game-headline.test.ts src/components/decks/games-panel.tsx
git commit -m "feat(games): derived headline and record line"
```

---

## Task 10: The axis cell and the bucket panel

**Files:**
- Create: `src/components/decks/game-axis-cell.tsx`
- Modify: `src/components/decks/games-panel.tsx`
- Create: `src/components/decks/games-panel.test.tsx`
- Read (do not edit): `src/components/decks/role-counter-cell.tsx`

**Interfaces:**
- Consumes: `type AxisTally` from `../../lib/decks/games`, `PATTERN_MIN` / `axisCopy` / `gameLogCopy` from `../../lib/copy/game-log`.
- Produces:
  ```ts
  export interface GameAxisCellProps {
    tally: AxisTally;
    /** Total games logged — the denominator, and what decides whether the bar takes colour. */
    gameCount: number;
  }
  export function GameAxisCell(props: GameAxisCellProps): React.ReactElement;
  ```

**Geometry** — component-notes rows **Axis cell** and **Split bar**, plus `LOW-N-summary.md`:

- The cell copies `role-counter-cell.tsx`'s geometry verbatim, with the fill one surface step up: `role-counter-cell` sits on `bg-surface-sunken`, so this one sits on `--surface`. Read that file and mirror its label, figure, bar and caption classes rather than inventing new ones.
- 200px wide on desktop and wrapping; a 44px row at phone laid out label · sub · figure.
- The bar is 5px, radius 999px, track `--elevated`, two flex segments — worked `--success`, hurt `--warning`. No transition.
- **Below `PATTERN_MIN` the bar is a single `--border-strong` segment** and neither `--success` nor `--warning` appears anywhere in the cell. Colour is the claim that a pattern exists.
- The figure is `{marks} of {count}` — `gameLogCopy.cell.figure` — never a signed number. At one mark the copy module has the dedicated `figureOneUp` / `figureOneDown` forms.

**Bucket layout** — component-notes rows **Bucket heading** and **Mixed line**, plus README Decision 7:

- **Fix is drawn above Keep.** The thing to fix is why the tab exists.
- Bucket headings are mono 10px uppercase, `letter-spacing .14em`, `--warning` for Fix and `--success` for Keep, each with a mono 10px `--fg-locked` gloss beside it.
- **At N=1 there are no bucket headings at all** — the marks appear under `gameLogCopy.buckets.oneGameHeading` in vocabulary order.
- Mixed is never a third group of cells. It is one line above a `1px --border` rule: a mono 10px uppercase `--fg-faint` label plus a mono 11px `--fg-muted` sentence, no colour.
- Bucket contents render in `summarizeGames`' output order, unmodified.

- [ ] **Step 1: Write the failing tests**

Create `src/components/decks/games-panel.test.tsx`. These are the seven mechanical checks from `LOW-N-summary.md` turned into assertions.

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GamesPanel } from "./games-panel";
import { summarizeGames, type DeckGame } from "../../lib/decks/games";
import { gameLogCopy } from "../../lib/copy/game-log";

function game(over: Partial<DeckGame> = {}): DeckGame {
  return { id: Math.random().toString(), result: "win", podSize: 4, playedAt: new Date("2026-09-01"), worked: [], hurt: [], ...over };
}

function mount(games: DeckGame[]) {
  return render(<GamesPanel deckId="deck_1" games={games} summary={summarizeGames(games)} />);
}

// The mock deck from the handoff: 2–1 across three games, card_flow 3 of 3
// against, board and engine 2 of 3 for, mana one up one down, interaction 1 of 3.
const MOCK: DeckGame[] = [
  game({ result: "win", worked: ["board", "engine"], hurt: ["card_flow", "mana"] }),
  game({ result: "win", worked: ["board", "engine", "mana"], hurt: ["card_flow"] }),
  game({ result: "loss", hurt: ["card_flow", "interaction"] }),
];

describe("GamesPanel — the aggregate", () => {
  it("draws Fix above Keep", () => {
    const { container } = mount(MOCK);
    const text = container.textContent!;
    expect(text.indexOf(gameLogCopy.buckets.fix)).toBeLessThan(text.indexOf(gameLogCopy.buckets.keep));
  });

  it("prints every count with its denominator", () => {
    mount(MOCK);
    expect(screen.getByText(gameLogCopy.cell.figure(3, 3))).toBeInTheDocument();
    expect(screen.getByText(gameLogCopy.cell.figure(2, 3))).toBeInTheDocument();
  });

  it("never prints a percentage", () => {
    const { container } = mount(MOCK);
    expect(container.textContent).not.toMatch(/%/);
  });

  it("never prints a signed figure", () => {
    const { container } = mount(MOCK);
    expect(container.textContent).not.toMatch(/[−-]\d/);
  });

  // Mixed is one line, not a third column of cells — mana is net zero here.
  it("states Mixed on a line rather than drawing cells for it", () => {
    mount(MOCK);
    const mixed = screen.getByText(gameLogCopy.buckets.mixed);
    expect(mixed).toBeInTheDocument();
    expect(within(mixed.parentElement!).queryByRole("meter")).toBeNull();
  });
});

describe("GamesPanel — low N", () => {
  it("shows no bucket headings at one game", () => {
    mount([game({ worked: ["board"], hurt: ["mana"] })]);
    expect(screen.queryByText(gameLogCopy.buckets.fix)).toBeNull();
    expect(screen.queryByText(gameLogCopy.buckets.keep)).toBeNull();
    expect(screen.getByText(gameLogCopy.buckets.oneGameHeading)).toBeInTheDocument();
  });

  // Colour is the claim that a pattern exists. One game is not a pattern.
  it("uses no success or warning ink at one game", () => {
    const { container } = mount([game({ worked: ["board"], hurt: ["mana"] })]);
    expect(container.innerHTML).not.toContain("--success");
    expect(container.innerHTML).not.toContain("--warning");
  });

  it("names both buckets at two games but still withholds the ink", () => {
    const { container } = mount([
      game({ hurt: ["mana"] }),
      game({ hurt: ["mana"], worked: ["board"] }),
    ]);
    expect(screen.getByText(gameLogCopy.buckets.fix)).toBeInTheDocument();
    expect(container.innerHTML).not.toContain("--success");
  });

  it("orders one game's marks by the vocabulary, not by strength", () => {
    const { container } = mount([game({ worked: ["engine"], hurt: ["mana", "speed"] })]);
    const text = container.textContent!;
    // GAME_AXIS_KEYS order: speed, …, mana, …, engine.
    expect(text.indexOf("Speed")).toBeLessThan(text.indexOf("Mana"));
    expect(text.indexOf("Mana")).toBeLessThan(text.indexOf("The deck's plan"));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/components/decks/games-panel.test.tsx`
Expected: FAIL — the panel renders only the headline and the history heading, so every bucket assertion misses.

- [ ] **Step 3: Write the cell**

Create `src/components/decks/game-axis-cell.tsx`:

```tsx
// One axis's standing across the log. Geometry is role-counter-cell's, copied
// rather than imported: that cell draws one bar against a target, this one
// draws two segments against each other, and a shared primitive taking a
// discriminated union to serve both would be harder to read than the copy.
// role-counter-cell.tsx is READ here, never edited.
import { PATTERN_MIN, axisCopy, gameLogCopy } from "../../lib/copy/game-log";
import type { AxisTally } from "../../lib/decks/games";

export interface GameAxisCellProps {
  tally: AxisTally;
  gameCount: number;
}

export function GameAxisCell({ tally, gameCount }: GameAxisCellProps) {
  const marks = tally.worked + tally.hurt;
  // Below the threshold the bar is one neutral segment. Splitting it into
  // success and warning would claim a pattern from two games.
  const patterned = gameCount >= PATTERN_MIN;

  const figure = marks === 1
    ? (tally.worked === 1 ? gameLogCopy.cell.figureOneUp : gameLogCopy.cell.figureOneDown)
    : gameLogCopy.cell.figure(marks, gameCount);

  return (
    <div className="w-full md:w-[200px] min-h-[44px] md:min-h-[72px] flex md:block items-center justify-between gap-[10px] rounded-[7px] md:rounded-[9px] px-[12px] py-[7px] md:px-[14px] md:py-[11px] bg-[color:var(--surface)] border border-[color:var(--border)]">
      <div className="min-w-0">
        <div className="font-mono uppercase truncate text-[8.5px] md:text-[10px] tracking-[0.06em] md:tracking-[0.1em] text-[color:var(--fg-body)]">
          {axisCopy[tally.key].label}
        </div>
        <div className="font-mono text-[8px] md:text-[9px] text-[color:var(--fg-faint)]">
          {gameCount === 1 ? gameLogCopy.cell.subOneGame : gameLogCopy.cell.sub(tally.worked, tally.hurt)}
        </div>
      </div>

      <div className="font-mono font-semibold text-[13px] md:text-[16px] md:mt-[3px] text-[color:var(--fg)] tabular-nums whitespace-nowrap">
        {figure}
      </div>

      {/* Track and segments. No transition — the bar is a reading, not a change. */}
      <div className="hidden md:block rounded-full overflow-hidden mt-[8px] h-[5px] bg-[color:var(--elevated)]">
        {patterned ? (
          <div className="flex h-full">
            <div className="h-full" style={{ width: pct(tally.worked, marks), background: "var(--success)" }} />
            <div className="h-full" style={{ width: pct(tally.hurt, marks), background: "var(--warning)" }} />
          </div>
        ) : (
          <div className="h-full" style={{ width: "100%", background: "var(--border-strong)" }} />
        )}
      </div>
    </div>
  );
}

// A bar width, not a rendered figure. No string this produces reaches the
// screen — the percentage ban is about what the player reads, and a flex
// segment's width is not a claim about frequency.
function pct(part: number, whole: number): string {
  return whole === 0 ? "0%" : `${(part / whole) * 100}%`;
}
```

- [ ] **Step 4: Compose the buckets in the panel**

In `src/components/decks/games-panel.tsx`, between the header from Task 9 and the history heading, add the aggregate. Branch on `summary.count === 1` for the no-headings tier:

```tsx
{summary.count === 1 ? (
  <section className="mb-[16px] md:mb-[24px]">
    <h4 className={BUCKET_HEADING} style={{ color: "var(--fg-faint)" }}>
      {gameLogCopy.buckets.oneGameHeading}
    </h4>
    <p className="font-mono text-[10px] text-[color:var(--fg-locked)] mt-[2px]">
      {gameLogCopy.buckets.oneGameNote}
    </p>
    <div className="flex flex-wrap gap-[6px] md:gap-[8px] mt-[8px]">
      {summary.axes.map((t) => (
        <GameAxisCell key={t.key} tally={t} gameCount={summary.count} />
      ))}
    </div>
  </section>
) : (
  <>
    <Bucket
      heading={gameLogCopy.buckets.fix}
      gloss={gameLogCopy.buckets.fixNote}
      colour="var(--warning)"
      tallies={summary.fix}
      gameCount={summary.count}
    />
    <Bucket
      heading={gameLogCopy.buckets.keep}
      gloss={gameLogCopy.buckets.keepNote}
      colour="var(--success)"
      tallies={summary.keep}
      gameCount={summary.count}
    />
    {summary.mixed.length > 0 && (
      <div className="pt-[10px] mb-[16px] md:mb-[24px] border-t border-[color:var(--border)]">
        <span className={BUCKET_HEADING} style={{ color: "var(--fg-faint)" }}>
          {gameLogCopy.buckets.mixed}
        </span>{" "}
        <span className="font-mono text-[11px] text-[color:var(--fg-muted)]">
          {summary.mixed.length === 1
            ? gameLogCopy.buckets.mixedLine(axisCopy[summary.mixed[0].key].label)
            : gameLogCopy.buckets.mixedLineMulti(summary.mixed.map((t) => axisCopy[t.key].label))}
        </span>
      </div>
    )}
  </>
)}
```

with, in the same file:

```tsx
const BUCKET_HEADING = "font-mono uppercase text-[10px] tracking-[0.14em]";

function Bucket({ heading, gloss, colour, tallies, gameCount }: {
  heading: string; gloss: string; colour: string; tallies: AxisTally[]; gameCount: number;
}) {
  if (tallies.length === 0) return null;
  return (
    <section className="mb-[16px] md:mb-[24px]">
      <div className="flex items-baseline gap-[8px]">
        {/* Below PATTERN_MIN the heading is named but neutral — see LOW-N-summary. */}
        <h4 className={BUCKET_HEADING} style={{ color: gameCount >= PATTERN_MIN ? colour : "var(--fg-faint)" }}>
          {heading}
        </h4>
        <span className="font-mono text-[10px] text-[color:var(--fg-locked)]">{gloss}</span>
      </div>
      <div className="flex flex-wrap gap-[6px] md:gap-[8px] mt-[8px]">
        {tallies.map((t) => (
          <GameAxisCell key={t.key} tally={t} gameCount={gameCount} />
        ))}
      </div>
    </section>
  );
}
```

**Fix is rendered before Keep.** Do not reorder these two elements.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test src/components/decks/games-panel.test.tsx`
Expected: PASS, 9 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/decks/game-axis-cell.tsx src/components/decks/games-panel.tsx src/components/decks/games-panel.test.tsx
git commit -m "feat(games): axis cells, split bars and the Fix/Keep/Mixed buckets"
```

---

## Task 11: The inline log form

**Files:**
- Create: `src/components/decks/game-log-form.tsx`
- Create: `src/components/decks/game-log-form.test.tsx`
- Modify: `src/components/decks/games-panel.tsx`
- Source of truth: `design/design_handoff_the99_game_log/STATES-log-form.md` — all fourteen states

**Interfaces:**
- Consumes: `logGame` / `type LogGameInput` from `../../app/decks/actions` (Task 3), `GAME_AXIS_KEYS` / `type GameAxisKey` from `../../lib/decks/game-axes`, `axisCopy` / `gameLogCopy` from `../../lib/copy/game-log`, `MutationError` from `./mutation-error`.
- Produces:
  ```ts
  export interface GameLogFormProps {
    deckId: string;
    /** Called after a successful save so the panel can announce it. */
    onSaved: (isFirst: boolean) => void;
    /** Called when an axis moves columns, for the live region. */
    onAnnounce: (message: string) => void;
    isFirstGame: boolean;
  }
  export function GameLogForm(props: GameLogFormProps): React.ReactElement;
  ```

**The fourteen states**, condensed from `STATES-log-form.md`. Read that file — this list is the contract, not a summary to work from:

| # | State | Behaviour |
|---|---|---|
| 1 | Collapsed | A 44px `Log a game` row. Brass-**outline** button, `1px --accent`, label 13.5px 600 `--accent`, radius 8px, `10px 18px`; full-width 44px at phone. Never brass-solid — `Build this deck` owns solid brass. |
| 2 | Just opened | Form replaces the row in place. Save **disabled**. Pod defaults to 4, result has **no** default. |
| 3 | Result only | Save **enabled**. This is the fifteen-second log and it must be reachable in two taps. |
| 4 | Partial, one column | Marks in `worked` only, or `hurt` only. Nothing special. |
| 5 | Partial, both columns | Both populated with disjoint keys. Nothing special. |
| 6 | **The conflict** | Ticking an axis already ticked in the other column **moves** it. The vacated row shows `moved to {other column}` for one beat with a `1px dashed --border-strong` border, then returns to rest. No dialog, no error, no undo. |
| 7 | All eight marked | Allowed. There is no cap. |
| 8 | Marks, no result | Save **disabled** and **no error text**. A disabled save is never accompanied by an error. |
| 9 | Future `playedAt` | The date input refuses it via `max`. The action refuses it too (Task 3). |
| 10 | Saving | Every control disabled. **Nothing unmounts** — the form must not collapse or swap to a spinner. |
| 11 | Saved | Collapses to state 1, focus returns to the `Log a game` button, the save is announced in the existing live region. **No toast.** |
| 12 | Refused | The form stays open with **every value preserved**, and `MutationError` renders under the save button. |
| 13 | Cancelled | Collapses immediately. **No confirm**, whatever was typed. |
| 14 | Reopened | The form **does not remember**. Pod is back to 4, result is unset, no marks. |

- [ ] **Step 1: Write the failing tests**

Create `src/components/decks/game-log-form.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GameLogForm } from "./game-log-form";
import { gameLogCopy, axisCopy } from "../../lib/copy/game-log";

const logGame = vi.fn(async () => ({ ok: true as const }));
vi.mock("../../app/decks/actions", () => ({ logGame: (...a: unknown[]) => logGame(...(a as [])) }));

function mount(onAnnounce = vi.fn()) {
  render(
    <GameLogForm deckId="deck_1" isFirstGame={false} onSaved={vi.fn()} onAnnounce={onAnnounce} />,
  );
  return onAnnounce;
}

const open = () => fireEvent.click(screen.getByRole("button", { name: gameLogCopy.form.open }));
const save = () => screen.getByRole("button", { name: gameLogCopy.form.save });

describe("GameLogForm", () => {
  // State 2 → 3. The fifteen-second log is result-then-save, and nothing else.
  it("enables save on a result alone", () => {
    mount();
    open();
    expect(save()).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: gameLogCopy.form.won }));
    expect(save()).toBeEnabled();
  });

  // State 8. A disabled control that also shouts at you is telling the player
  // off for something they have not finished doing.
  it("shows no error text while save is disabled", () => {
    mount();
    open();
    fireEvent.click(screen.getByRole("checkbox", { name: new RegExp(axisCopy.mana.label) }));
    expect(save()).toBeDisabled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  // State 6 — the whole reason the child table has a composite key.
  it("moves an axis between columns rather than marking it twice", () => {
    const onAnnounce = mount();
    open();
    const worked = screen.getAllByRole("checkbox", { name: new RegExp(axisCopy.mana.label) })[0];
    const hurt = screen.getAllByRole("checkbox", { name: new RegExp(axisCopy.mana.label) })[1];

    fireEvent.click(worked);
    expect(worked).toBeChecked();

    fireEvent.click(hurt);
    expect(hurt).toBeChecked();
    expect(worked).not.toBeChecked();
    expect(onAnnounce).toHaveBeenCalledWith(gameLogCopy.announce.moved(axisCopy.mana.label, gameLogCopy.form.hurtLabel));
  });

  it("submits the two lists disjoint", async () => {
    mount();
    open();
    fireEvent.click(screen.getByRole("radio", { name: gameLogCopy.form.lost }));
    fireEvent.click(screen.getAllByRole("checkbox", { name: new RegExp(axisCopy.mana.label) })[0]);
    fireEvent.click(screen.getAllByRole("checkbox", { name: new RegExp(axisCopy.mana.label) })[1]);
    fireEvent.click(save());
    await waitFor(() => expect(logGame).toHaveBeenCalled());
    expect(logGame.mock.calls[0][1]).toMatchObject({ worked: [], hurt: ["mana"] });
  });

  // State 7. Marking everything is a legitimate thing to say about a game.
  it("puts no cap on how many axes can be marked", () => {
    mount();
    open();
    for (const box of screen.getAllByRole("checkbox")) {
      if (!(box as HTMLInputElement).checked) fireEvent.click(box);
    }
    expect(screen.getAllByRole("checkbox").filter((b) => (b as HTMLInputElement).checked)).toHaveLength(8);
  });

  // State 9 — the browser refuses before the action has to.
  it("caps the date at today", () => {
    mount();
    open();
    const date = screen.getByLabelText(gameLogCopy.form.played) as HTMLInputElement;
    expect(date.max).toBe(new Date().toISOString().slice(0, 10));
  });

  // State 12. There is no edit action, so a refusal that cleared the form would
  // make the player retype a game they have already described once.
  it("keeps every value when the save is refused", async () => {
    logGame.mockResolvedValueOnce({ ok: false, message: gameLogCopy.form.refused } as never);
    mount();
    open();
    fireEvent.click(screen.getByRole("radio", { name: gameLogCopy.form.won }));
    fireEvent.click(screen.getAllByRole("checkbox", { name: new RegExp(axisCopy.mana.label) })[0]);
    fireEvent.click(save());
    await screen.findByRole("alert");
    expect(screen.getByRole("radio", { name: gameLogCopy.form.won })).toBeChecked();
    expect(screen.getAllByRole("checkbox", { name: new RegExp(axisCopy.mana.label) })[0]).toBeChecked();
  });

  // State 13.
  it("cancels without a confirm", () => {
    mount();
    open();
    fireEvent.click(screen.getByRole("radio", { name: gameLogCopy.form.won }));
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.form.cancel }));
    expect(screen.getByRole("button", { name: gameLogCopy.form.open })).toBeInTheDocument();
  });

  // State 14. A form that remembered would quietly log a second game with the
  // first game's pod size.
  it("forgets everything when reopened", () => {
    mount();
    open();
    fireEvent.click(screen.getByRole("radio", { name: gameLogCopy.form.won }));
    fireEvent.click(screen.getByRole("radio", { name: "6" }));
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.form.cancel }));
    open();
    expect(screen.getByRole("radio", { name: gameLogCopy.form.won })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "4" })).toBeChecked();
    expect(save()).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/components/decks/game-log-form.test.tsx`
Expected: FAIL — "Failed to resolve import ./game-log-form".

- [ ] **Step 3: Write the component**

Create `src/components/decks/game-log-form.tsx`. The state is four pieces and a transition — no form library, no reducer.

```tsx
"use client";

import { useRef, useState, useTransition } from "react";
import { logGame } from "../../app/decks/actions";
import { GAME_AXIS_KEYS, type GameAxisKey } from "../../lib/decks/game-axes";
import { axisCopy, gameLogCopy } from "../../lib/copy/game-log";
import { MutationError } from "./mutation-error";

export interface GameLogFormProps {
  deckId: string;
  onSaved: (isFirst: boolean) => void;
  onAnnounce: (message: string) => void;
  isFirstGame: boolean;
}

type Result = "win" | "loss" | "draw";
const POD_SIZES = [2, 3, 4, 5, 6, 7, 8];
const today = () => new Date().toISOString().slice(0, 10);

export function GameLogForm({ deckId, onSaved, onAnnounce, isFirstGame }: GameLogFormProps) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [podSize, setPodSize] = useState(4);
  const [playedAt, setPlayedAt] = useState(today);
  const [worked, setWorked] = useState<GameAxisKey[]>([]);
  const [hurt, setHurt] = useState<GameAxisKey[]>([]);
  const [moved, setMoved] = useState<GameAxisKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const openButton = useRef<HTMLButtonElement>(null);

  // State 14: reopening starts from nothing. The reset lives here rather than
  // on close so a refusal (state 12) cannot reach it — the form stays mounted
  // and populated through a refusal, and only a successful save or a cancel
  // brings it back through this path.
  function collapse() {
    setOpen(false);
    setResult(null);
    setPodSize(4);
    setPlayedAt(today());
    setWorked([]);
    setHurt([]);
    setMoved(null);
    setError(null);
    openButton.current?.focus();
  }

  // State 6. Ticking an axis in one column removes it from the other, so the
  // two lists are disjoint by construction and the server never has to
  // reconcile a contradiction it cannot store anyway.
  function toggle(key: GameAxisKey, column: "worked" | "hurt") {
    const [mine, setMine, theirs, setTheirs] = column === "worked"
      ? [worked, setWorked, hurt, setHurt] as const
      : [hurt, setHurt, worked, setWorked] as const;

    if (mine.includes(key)) {
      setMine(mine.filter((k) => k !== key));
      return;
    }
    setMine([...mine, key]);
    if (theirs.includes(key)) {
      setTheirs(theirs.filter((k) => k !== key));
      setMoved(key);
      onAnnounce(gameLogCopy.announce.moved(
        axisCopy[key].label,
        column === "worked" ? gameLogCopy.form.workedLabel : gameLogCopy.form.hurtLabel,
      ));
      // One beat, then the vacated row returns to rest. A permanent marker
      // would accumulate as the player revises.
      window.setTimeout(() => setMoved((m) => (m === key ? null : m)), 1200);
    }
  }

  function submit() {
    if (!result || isPending) return;
    startTransition(async () => {
      setError(null);
      const outcome = await logGame(deckId, {
        result, podSize, playedAt: new Date(`${playedAt}T12:00:00`), worked, hurt,
      });
      if (!outcome.ok) {
        // State 12: nothing is cleared. There is no edit action, so a wiped
        // form means retyping a game the player has already described.
        setError(outcome.message);
        return;
      }
      onSaved(isFirstGame);
      collapse();
    });
  }

  if (!open) {
    // State 1. Brass OUTLINE, never solid — `Build this deck` owns solid brass
    // and logging a game is not the app's goal.
    return (
      <button
        ref={openButton}
        type="button"
        onClick={() => setOpen(true)}
        className="w-full md:w-auto min-h-[44px] rounded-[8px] px-[18px] py-[10px] text-[13.5px] font-semibold border border-[color:var(--accent)] text-[color:var(--accent)] bg-transparent cursor-pointer"
      >
        {gameLogCopy.form.open}
      </button>
    );
  }

  return (
    <div className="rounded-[12px] p-[20px] bg-[color:var(--surface)] border border-[color:var(--border-strong)]">
      {/* …result group, pod group, date field, the two axis fieldsets, save/cancel… */}
    </div>
  );
}
```

Fill the container from the component-notes rows, keeping every figure exactly as written there:

- **Result group** — three 40px segments (44px phone), radius 8px, in a `role="radiogroup"` labelled `gameLogCopy.form.resultLabel`, **no default**. Won selected: `--success` fill with a **`--bg`** label (see correction 2 above — the handoff's `--base` does not exist). Lost and Draw selected: `1px --accent`, label `--fg`, no fill. Unselected: `1px --border`, label `--fg-body`.
- **Pod group** — seven 40px squares (44px phone), radius 8px, mono 14px 600, `role="radiogroup"` labelled `gameLogCopy.form.podLabel` with `gameLogCopy.form.podHint` beside it. Selected: `1px --accent`, `--accent` label, `color-mix(in srgb, var(--accent) 12%, transparent)` fill. Default 4.
- **Date** — a `<input type="date">` labelled `gameLogCopy.form.played`, `max={today()}`, defaulting to today with `gameLogCopy.form.playedToday` as its hint.
- **Axis columns** — two `<fieldset>`s, one per polarity, mapped over `GAME_AXIS_KEYS` so both columns are in vocabulary order. The `<legend>` is mono 10px uppercase `letter-spacing .14em`, `--success` for worked and `--warning` for hurt, with a mono 10px `--fg-locked` `gameLogCopy.form.marked(n)` counter beside it.
- **Axis row** — a `<label>` wrapping the checkbox, min-height 46px (48px phone), `--surface` on `1px --border`, radius 8px, padding `5px 12px`, gap 11px. Label 13.5px `--fg`; gloss mono 10px **`--fg-faint`**. Checked: fill `--elevated-hover`, border `--accent-shadow`, gloss `--fg-muted`. When `moved === key` the border is `1px dashed --border-strong` and the gloss is replaced by `gameLogCopy.form.movedToHurt` / `movedToWorked` in `--fg-locked`.
  The gloss is **`--fg-faint`, not `--fg-locked`** — the handoff measures the latter at 2.84:1 on `--surface` and calls this out as the one string in the design that cannot afford to be hard to read.
- **Axis checkbox** — 18px (20px phone), radius 5px, `1px --border-strong`; checked gets `1px --accent`, `color-mix(in srgb, var(--accent) 12%, transparent)` fill and a `✓` in the column's colour. It is `aria-hidden` decoration over a visually-hidden input; the whole row is the hit area.
- **Save / Cancel** — brass-solid `gameLogCopy.form.save` (`gameLogCopy.form.saving` while pending) and a neutral ghost `gameLogCopy.form.cancel`. 48px, 44px stacked full-width at phone. `disabled={!result || isPending}`; **every** control takes `disabled={isPending}` for state 10, and nothing unmounts while saving.
- **Refusal** — `{error && <MutationError message={error} />}` directly under the save button. No new surface.

- [ ] **Step 4: Mount it in the panel**

In `src/components/decks/games-panel.tsx`, render `<GameLogForm …>` between the aggregate and the history heading. The panel owns the live-region message:

```tsx
const [announcement, setAnnouncement] = useState("");
```

```tsx
<GameLogForm
  deckId={deckId}
  isFirstGame={games.length === 0}
  onAnnounce={setAnnouncement}
  onSaved={(isFirst) =>
    setAnnouncement(isFirst ? gameLogCopy.announce.savedFirst : gameLogCopy.announce.saved)
  }
/>
<span className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</span>
```

This mirrors the live region already at `src/components/decks/builder-shell.tsx:512` — same `sr-only` / `aria-live="polite"` / `aria-atomic="true"` shape, one message per settle.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test src/components/decks/game-log-form.test.tsx`
Expected: PASS, 9 tests.

- [ ] **Step 6: Walk all fourteen states in the browser**

`pnpm dev`, then open a deck's Games tab and reproduce each row of the table above at both widths. State 10 is the one to watch: the form must stay on screen with its controls disabled, not swap to a spinner.

- [ ] **Step 7: Commit**

```bash
git add src/components/decks/game-log-form.tsx src/components/decks/game-log-form.test.tsx src/components/decks/games-panel.tsx
git commit -m "feat(games): inline log form, with the axis conflict resolved as a move"
```

---

## Task 12: The history row and its inline delete confirm

**Files:**
- Create: `src/components/decks/game-history-row.tsx`
- Create: `src/components/decks/game-history-row.test.tsx`
- Modify: `src/components/decks/games-panel.tsx` (replace the Task 8 scaffold `<li>`)

**Interfaces:**
- Consumes: `deleteGame` from `../../app/decks/actions` (Task 4), `type DeckGame` from `../../lib/decks/games`, `GAME_AXIS_KEYS` from `../../lib/decks/game-axes`, `axisCopy` / `gameLogCopy` from `../../lib/copy/game-log`, `MutationError` from `./mutation-error`.
- Produces:
  ```ts
  export interface GameHistoryRowProps {
    deckId: string;
    game: DeckGame;
    isLast: boolean;
    onDeleted: (wasLast: boolean) => void;
  }
  export function GameHistoryRow(props: GameHistoryRowProps): React.ReactElement;
  ```

**Geometry** — component-notes rows **History row**, **Result square**, **Mark chip**, **— no marks**, **Delete**:

- Row: min-height 52px (64px phone, two lines), `--surface` on `1px --border`, radius 9px, padding `8px 12px 8px 14px`, gap 14px. Slots in order: result 26px · meta 132px mono 11px tabular · marks, wrapping · delete 30px.
- Result square: 26px, radius 7px, mono 12px 600. `W` is `1px --success` with a `--success` label; `L` and `D` are `1px --border-strong` with a `--fg-body` label. **Never `--danger`** — a loss is not an error.
- Mark chip: mono 10.5px `--fg-body` on `--elevated`, radius 999px, padding `4px 11px 4px 8px`, with a 6px filled dot — `--success` for worked, `--warning` for hurt. **Vocabulary order, not grouped by direction**, so one game's marks read in the same sequence as the form that produced them.
- No marks: `gameLogCopy.history.noMarks` (an em dash), mono `--fg-locked`, in the chip slot. Absence, not a gap.
- Delete: a 30px `×` (44px phone), `1px --border`, glyph `--fg-locked`, `--danger` on hover, with **one inline confirm in the row**: `gameLogCopy.history.confirm` · `confirmYes` / `confirmNo`. §4 has no edit action, so this is the correction path and a stray tap loses the only copy of a game.

**No inline-confirm pattern exists anywhere in this codebase** — this is net-new UI with nothing to copy. Build it as the row swapping its own contents, not as a popover or a dialog.

- [ ] **Step 1: Write the failing tests**

Create `src/components/decks/game-history-row.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GameHistoryRow } from "./game-history-row";
import { axisCopy, gameLogCopy } from "../../lib/copy/game-log";
import type { DeckGame } from "../../lib/decks/games";

const deleteGame = vi.fn(async () => ({ ok: true as const }));
vi.mock("../../app/decks/actions", () => ({ deleteGame: (...a: unknown[]) => deleteGame(...(a as [])) }));

const GAME: DeckGame = {
  id: "game_1",
  result: "loss",
  podSize: 4,
  playedAt: new Date("2026-09-01T12:00:00"),
  worked: ["engine"],
  hurt: ["speed", "mana"],
};

function mount(game: DeckGame = GAME, onDeleted = vi.fn()) {
  render(<GameHistoryRow deckId="deck_1" game={game} isLast={false} onDeleted={onDeleted} />);
  return onDeleted;
}

describe("GameHistoryRow", () => {
  // Vocabulary order, not grouped by direction — the row reads in the same
  // sequence as the form that produced it.
  it("draws the marks in vocabulary order regardless of polarity", () => {
    const { container } = mount();
    const text = container.textContent!;
    expect(text.indexOf(axisCopy.speed.label)).toBeLessThan(text.indexOf(axisCopy.mana.label));
    expect(text.indexOf(axisCopy.mana.label)).toBeLessThan(text.indexOf(axisCopy.engine.label));
  });

  it("shows an em dash rather than an empty slot when nothing was marked", () => {
    mount({ ...GAME, worked: [], hurt: [] });
    expect(screen.getByText(gameLogCopy.history.noMarks)).toBeInTheDocument();
  });

  // A loss is a result, not an error state.
  it("never paints a loss in the danger colour", () => {
    const { container } = mount();
    expect(container.innerHTML).not.toContain("--danger");
  });

  // One confirm, in the row. There is no edit action, so a stray tap would
  // destroy the only copy of a game.
  it("asks once, in the row, before deleting", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.history.delete }));
    expect(deleteGame).not.toHaveBeenCalled();
    expect(screen.getByText(gameLogCopy.history.confirm)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.history.confirmYes }));
    await waitFor(() => expect(deleteGame).toHaveBeenCalledWith("deck_1", "game_1"));
  });

  it("backs out of the confirm without deleting", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.history.delete }));
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.history.confirmNo }));
    expect(deleteGame).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: gameLogCopy.history.delete })).toBeInTheDocument();
  });

  it("renders the refusal in the row and keeps the game", async () => {
    deleteGame.mockResolvedValueOnce({ ok: false, message: gameLogCopy.history.deleteRefused } as never);
    mount();
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.history.delete }));
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.history.confirmYes }));
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(gameLogCopy.history.deleteRefused)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/components/decks/game-history-row.test.tsx`
Expected: FAIL — "Failed to resolve import ./game-history-row".

- [ ] **Step 3: Write the component**

Create `src/components/decks/game-history-row.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { deleteGame } from "../../app/decks/actions";
import { GAME_AXIS_KEYS, type GameAxisKey } from "../../lib/decks/game-axes";
import { axisCopy, gameLogCopy } from "../../lib/copy/game-log";
import type { DeckGame } from "../../lib/decks/games";
import { MutationError } from "./mutation-error";

export interface GameHistoryRowProps {
  deckId: string;
  game: DeckGame;
  isLast: boolean;
  onDeleted: (wasLast: boolean) => void;
}

const RESULT_GLYPH = {
  win: gameLogCopy.history.won,
  loss: gameLogCopy.history.lost,
  draw: gameLogCopy.history.drawn,
} as const;

export function GameHistoryRow({ deckId, game, isLast, onDeleted }: GameHistoryRowProps) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // One pass over the vocabulary rather than concatenating the two lists:
  // grouping the marks by direction would break the row's reading order away
  // from the form's, for no gain.
  const marks: { key: GameAxisKey; polarity: "worked" | "hurt" }[] = GAME_AXIS_KEYS.flatMap((key) =>
    game.worked.includes(key) ? [{ key, polarity: "worked" as const }]
      : game.hurt.includes(key) ? [{ key, polarity: "hurt" as const }]
      : [],
  );

  function confirm() {
    startTransition(async () => {
      setError(null);
      const outcome = await deleteGame(deckId, game.id);
      if (!outcome.ok) {
        setError(outcome.message);
        setConfirming(false);
        return;
      }
      onDeleted(isLast);
    });
  }

  return (
    <li className="flex flex-wrap md:flex-nowrap items-center gap-[14px] min-h-[64px] md:min-h-[52px] rounded-[9px] pl-[14px] pr-[12px] py-[8px] bg-[color:var(--surface)] border border-[color:var(--border)]">
      {/* Result square — never --danger. A loss is a result, not an error. */}
      <span
        aria-hidden
        className="flex-none flex items-center justify-center w-[26px] h-[26px] rounded-[7px] font-mono text-[12px] font-semibold"
        style={
          game.result === "win"
            ? { border: "1px solid var(--success)", color: "var(--success)" }
            : { border: "1px solid var(--border-strong)", color: "var(--fg-body)" }
        }
      >
        {RESULT_GLYPH[game.result]}
      </span>

      <span className="flex-none w-[132px] font-mono text-[11px] tabular-nums text-[color:var(--fg-faint)]">
        {gameLogCopy.history.meta(game.playedAt, game.podSize)}
      </span>

      <span className="flex-1 min-w-0 flex flex-wrap gap-[6px]">
        {marks.length === 0 ? (
          <span className="font-mono text-[10.5px] text-[color:var(--fg-locked)]">
            {gameLogCopy.history.noMarks}
          </span>
        ) : (
          marks.map(({ key, polarity }) => (
            <span
              key={key}
              className="inline-flex items-center gap-[6px] rounded-full pl-[8px] pr-[11px] py-[4px] font-mono text-[10.5px] bg-[color:var(--elevated)] text-[color:var(--fg-body)]"
            >
              <span
                aria-hidden
                className="w-[6px] h-[6px] rounded-full flex-none"
                style={{ background: polarity === "worked" ? "var(--success)" : "var(--warning)" }}
              />
              {axisCopy[key].label}
            </span>
          ))
        )}
      </span>

      {/* One inline confirm, in the row. §4 has no edit action, so deleting is
          the whole correction path and a stray tap loses the only copy. */}
      {confirming ? (
        <span className="flex-none flex items-center gap-[8px]">
          <span className="text-[11.5px] text-[color:var(--fg-body)]">{gameLogCopy.history.confirm}</span>
          <button type="button" disabled={isPending} onClick={confirm}
            className="min-h-[30px] px-[10px] rounded-[7px] text-[11.5px] border border-[color:var(--border-strong)] text-[color:var(--danger)] bg-transparent cursor-pointer">
            {gameLogCopy.history.confirmYes}
          </button>
          <button type="button" disabled={isPending} onClick={() => setConfirming(false)}
            className="min-h-[30px] px-[10px] rounded-[7px] text-[11.5px] border border-[color:var(--border)] text-[color:var(--fg-body)] bg-transparent cursor-pointer">
            {gameLogCopy.history.confirmNo}
          </button>
        </span>
      ) : (
        <button type="button" aria-label={gameLogCopy.history.delete} onClick={() => setConfirming(true)}
          className="flex-none flex items-center justify-center w-[44px] h-[44px] md:w-[30px] md:h-[30px] rounded-[7px] border border-[color:var(--border)] text-[color:var(--fg-locked)] hover:text-[color:var(--danger)] bg-transparent cursor-pointer">
          ×
        </button>
      )}

      {error && <span className="w-full"><MutationError message={error} /></span>}
    </li>
  );
}
```

- [ ] **Step 4: Replace the panel scaffold**

In `src/components/decks/games-panel.tsx`, swap the Task 8 placeholder `<li>{g.result}</li>` for the real row, and announce a delete through the same live region the form uses:

```tsx
<ul className="flex flex-col gap-[6px] md:gap-[8px] mt-[10px]">
  {games.map((g) => (
    <GameHistoryRow
      key={g.id}
      deckId={deckId}
      game={g}
      isLast={games.length === 1}
      onDeleted={(wasLast) =>
        setAnnouncement(wasLast ? gameLogCopy.announce.deletedLast : gameLogCopy.announce.deleted)
      }
    />
  ))}
</ul>
```

The row itself does not remove anything from `games` — `deleteGame` revalidates through `deckSurfaces()`, so the server sends the shortened list back.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test src/components/decks/game-history-row.test.tsx && pnpm test src/components/decks/games-panel.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/decks/game-history-row.tsx src/components/decks/game-history-row.test.tsx src/components/decks/games-panel.tsx
git commit -m "feat(games): history rows with an inline delete confirm"
```

---

## Task 13: The empty state

**Files:**
- Modify: `src/components/decks/games-panel.tsx`
- Modify: `src/components/decks/games-panel.test.tsx`
- Read (do not edit): `src/components/decks/provenance-line.tsx` — the scope note copies its shape
- Source: `design/design_handoff_the99_game_log/brand/` — the card-fan mark

**Interfaces:** no new exports. `GamesPanel` returns the empty state instead of its usual body when `games.length === 0`.

**Geometry** — component-notes row **Empty state**: the brand sheet's card-fan mark at 150px (96px phone), a Cinzel 26px headline (21px phone), two body paragraphs at 14.5px `--fg-body`, a brass-**solid** CTA, and the scope note in the shipped provenance shape — `--surface-sunken`, `border-left 3px --accent`, a 20px `i` disc. This is the one place in the feature where the CTA is solid brass: at zero games the CTA *is* the tab.

**The pitch is the third game, not the first** (handoff §8.4). `gameLogCopy.empty.heading` is `Three games is a pattern.` — the empty state sells what the player gets at `PATTERN_MIN`, not the act of logging one game.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/decks/games-panel.test.tsx`:

```tsx
describe("GamesPanel — empty", () => {
  it("replaces the whole panel, headline and history included", () => {
    mount([]);
    expect(screen.getByText(gameLogCopy.empty.heading)).toBeInTheDocument();
    expect(screen.queryByText(gameLogCopy.history.heading)).toBeNull();
    expect(screen.queryByText(gameLogCopy.buckets.fix)).toBeNull();
  });

  it("still offers the form", () => {
    mount([]);
    expect(screen.getByRole("button", { name: gameLogCopy.empty.cta })).toBeInTheDocument();
  });

  // §8.4: the pitch is the third game. Selling "log a game" sells the chore.
  it("pitches the pattern rather than the first game", () => {
    mount([]);
    expect(screen.getByText(gameLogCopy.empty.cost)).toBeInTheDocument();
    expect(screen.getByText(gameLogCopy.empty.scope)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm test src/components/decks/games-panel.test.tsx -t empty`
Expected: FAIL — the panel currently renders its history heading at zero games.

- [ ] **Step 3: Add the branch**

At the top of `GamesPanel`'s return, before the header:

```tsx
if (games.length === 0) {
  return (
    <section className="px-[16px] py-[24px] md:px-[30px] md:py-[40px] text-center">
      <CardFanMark className="mx-auto w-[96px] md:w-[150px]" />
      <h3 className="font-display text-[21px] md:text-[26px] mt-[16px] text-[color:var(--fg)]">
        {gameLogCopy.empty.heading}
      </h3>
      <p className="mt-[10px] text-[14.5px] leading-[1.55] text-[color:var(--fg-body)]">
        {gameLogCopy.empty.body}
        <em>{gameLogCopy.empty.bodyQuote}</em>
        {gameLogCopy.empty.bodyAfter}
      </p>
      <p className="mt-[8px] text-[14.5px] leading-[1.55] text-[color:var(--fg-body)]">
        {gameLogCopy.empty.cost}
      </p>
      <div className="mt-[18px]">
        <GameLogForm
          deckId={deckId}
          isFirstGame
          onAnnounce={setAnnouncement}
          onSaved={() => setAnnouncement(gameLogCopy.announce.savedFirst)}
          ctaLabel={gameLogCopy.empty.cta}
          ctaSolid
        />
      </div>
      <p className="mt-[8px] font-mono text-[10.5px] text-[color:var(--fg-locked)]">
        {gameLogCopy.empty.ctaNote}
      </p>
      {/* Scope note in the shipped provenance shape — read provenance-line.tsx
          for the exact treatment rather than approximating it here. */}
      <div className="flex items-start gap-[11px] mt-[24px] text-left rounded-[9px] px-[15px] py-[11px] bg-[color:var(--surface-sunken)] border border-[color:var(--border)] border-l-[3px] border-l-[color:var(--accent)]">
        <span aria-hidden className="flex-none flex items-center justify-center w-[20px] h-[20px] rounded-full font-display font-bold text-[12px] border-[1.5px] border-[color:var(--accent)] text-[color:var(--accent)]">i</span>
        <p className="text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">{gameLogCopy.empty.scope}</p>
      </div>
      <span className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</span>
    </section>
  );
}
```

This requires two additions to `GameLogForm`'s props from Task 11 — add them there:

```ts
/** Overrides the collapsed button's label. Defaults to gameLogCopy.form.open. */
ctaLabel?: string;
/** Brass-solid collapsed button. True only in the empty state, where the CTA is the tab. */
ctaSolid?: boolean;
```

`CardFanMark` is the brand sheet's mark. Extract it from `design/design_handoff_the99_game_log/brand/The 99 - Brand Sheet.dc.html` as an inline SVG component at the bottom of `games-panel.tsx` with `aria-hidden` and `focusable="false"` — it is decoration and the heading carries the meaning. Do not add an image file or a new token; the mark uses `currentColor` and inherits `--accent` from a wrapper.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test src/components/decks/games-panel.test.tsx`
Expected: PASS — the twelve aggregate and low-N tests plus the three empty-state tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/decks/games-panel.tsx src/components/decks/games-panel.test.tsx src/components/decks/game-log-form.tsx
git commit -m "feat(games): empty state pitching the third game"
```

---

## Task 14: Parity pass, design review and the PR

**Files:** no new files. This task verifies what Tasks 6–13 built.

- [ ] **Step 1: Remove the scaffolding**

Confirm nothing from Task 8's placeholder survives: the `<p className="sr-only">{summary.count} games</p>` and the bare `<li>{g.result}</li>` must both be gone from `src/components/decks/games-panel.tsx`.

```bash
grep -n "summary.count} games\|{g.result}" src/components/decks/games-panel.tsx
```

Expected: no output.

- [ ] **Step 2: Run the seven mechanical checks from `LOW-N-summary.md`**

These are already covered by tests, but run them as greps too — a test only sees the branches it renders.

```bash
grep -rn "%" src/lib/copy/game-log.ts src/components/decks/game-axis-cell.tsx src/components/decks/games-panel.tsx | grep -v "width\|color-mix\|100%\|0%"
grep -rn "\.net\b" src/components/decks/ | grep -i "game"
grep -rn "PATTERN_MIN\|\b3\b" src/components/decks/game-axis-cell.tsx src/components/decks/games-panel.tsx
```

Expected: the first two produce nothing. The third shows `PATTERN_MIN` imported and used, and no bare `3` standing in for the threshold.

- [ ] **Step 3: Mobile and desktop parity in the browser**

`pnpm dev`. At 375px and at 1280px, walk: the empty state; one game; two games; the mock deck's three games (2–1, `card_flow` 3 of 3 against, `board` and `engine` 2 of 3 for, `mana` mixed, `interaction` 1 of 3 against); a game with no marks; and a delete. Both widths ship in this PR.

- [ ] **Step 4: Run the design-review skill**

Property-table enumerate → verify → confirm, against `design/design_handoff_the99_game_log/README.md`'s component-notes table. Every row in that table gets a verdict. This is required before `gh pr create` for any UI PR in this repo.

Watch for the responsive-split trap: prefer one element carrying responsive classes over two elements toggled by `hidden` / `md:block`. A doubled subtree reads as a match on both columns and hides a real divergence.

- [ ] **Step 5: Update the tracker**

In `docs/superpowers/design-pipeline-status.md`, the `**#9**` row in the 🟢 Ready-for-implementation table ends `Plan not yet written`. Replace that clause with a pointer to `docs/superpowers/plans/2026-09-05-deck-game-log.md`.

- [ ] **Step 6: Run the full gate and push**

```bash
pnpm typecheck && pnpm lint && pnpm test
DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build
git fetch origin && git rebase origin/main
```

- [ ] **Step 7: Open the PR and run the Copilot cycle**

Request the review after opening **and after every fix push** — a push does not trigger a re-review. The merge bar is in `~/.claude/CLAUDE.md`: no Critical/High/Medium findings outstanding, and at least two successful rounds, where a successful round is one with no comments or only Low/Nit findings. Fix every valid comment including nits, and when a nit reveals a class, sweep the whole class in the same push rather than patching the one flagged instance.

---

## Self-review

**Spec coverage.** §3's two tables and the vocabulary → Tasks 1–2. §4's `logGame` and `deleteGame`, including all five validation rules, the dedupe, the absent `FOR UPDATE` and the absent edit action → Tasks 3–4. §5's `listDeckGames`, the pure `summarizeGames`, the three buckets and the absent minimum-games gate → Task 5. §6's third tab, the fetch in `page.tsx` and the props hand-off → Tasks 7–8. §7's testing → the test file in every task. §8's five answers → Task 6 (8.1 labels and glosses), Task 10 (8.2 Mixed as a line, 8.5 the three low-N dials), Task 11 (8.3 inline and expanding in place), Task 13 (8.4 the third-game pitch). §9's #10 handoff is out of scope for this plan and is not touched.

**Handoff coverage.** Every row of the component-notes table is claimed by a task: Games tab pill → 7; Record line → 9; `Log a game`, Form container, Result group, Pod group, Axis column, Axis row, Axis checkbox, Moved row, Save/Cancel, Refusal → 11; Axis cell, Split bar, Bucket heading, Mixed line → 10; History row, Result square, Mark chip, no-marks, Delete → 12; Empty state → 13. `STATES-log-form.md`'s fourteen states → Task 11's table and tests. `LOW-N-summary.md`'s four tiers and seven checks → Tasks 10 and 14.

**Placeholders.** The one instruction that points elsewhere rather than showing code is Task 11's Step 3 bullet list, which cites the component-notes rows by name for the form's interior. That is deliberate: those rows carry exact figures, and copying them into this plan creates a second source that can drift from Design's. Every other step carries the code it needs. Task 6 copies a file that exists at a stated path; Task 2's migration is generated, and the plan says explicitly not to hardcode its number.

**Type consistency.** `GameAxisKey` and `AxisPolarity` originate in Task 1 and are used unchanged in 3, 5, 10, 11, 12. `DeckGame`, `AxisTally` and `GameSummary` originate in Task 5 and are used unchanged in 8, 9, 10, 12, 13. `DeckMutationResult` is the shipped type and both actions return it. `BuilderView` gains `"games"` in Task 7 and is consumed in 8. `GameLogFormProps` gains `ctaLabel` and `ctaSolid` in Task 13, which names Task 11's file as the place to add them.

**Known gaps, carried forward deliberately.** The handoff's gap report lists eight; none blocks implementation. The two worth naming at review are that pod size defaults to 4 and is the field most likely to be logged wrong, and that the history has no filter or grouping — both are fine at the volume one player generates and neither is designed around here.
