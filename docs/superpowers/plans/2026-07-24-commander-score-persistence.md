# Commander Score Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist per-user commander list rows so `/commanders`, `/commanders/[slug]`, and the Home hero all serve from indexed queries instead of recomputing 196 scores and issuing ~196 serial cache reads per request.

**Architecture:** A new `commander_scores` table mirrors `CommanderListItem`. Scores are computed lazily on miss and warmed eagerly via `after()` when a collection upload is confirmed. A `synergy_state` column separates permanent EDHREC absence (`absent`) from transient outage (`degraded`) so the existing Retry button keeps working. A prerequisite refactor turns the per-commander EDHREC cache `SELECT` into one bulk read. All three consumer surfaces route through one shared `getRankedList` helper so the fast/miss/degraded decision exists in exactly one place.

**Tech Stack:** Next.js 16 (App Router, server actions, `after` from `next/server`), Drizzle ORM on Neon Postgres, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-24-commander-score-persistence-design.md`

## Global Constraints

- Package manager is **pnpm**. Never npm or yarn.
- Pre-push gate, every push: `pnpm typecheck && pnpm lint && pnpm test`, plus a stub-DB build: `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`.
- Stage files by name. Never `git add -A`.
- Work happens in the worktree `.worktrees/perf-commander-scores` on branch `perf/commander-score-persistence`.
- Scoring semantics must not change. `src/lib/recs/score.ts` is not modified by this plan. Existing tests in `score.test.ts` must pass unchanged.
- This is backend-only work. No UI changes, so no design handoff or design-review is required.
- Migrations are generated with `pnpm db:generate` (Drizzle Kit, output dir `./drizzle`). Never hand-write the migration SQL file.
- Every test file that transitively imports `src/db/index.ts` must `vi.mock("../../db", () => ({ db: {} }))` **before** the import under test — `db/index.ts` throws at module init when `DATABASE_URL` is unset and `vitest.config.ts` loads no env.

---

## File Structure

**Create:**
- `src/lib/recs/synergy-state.ts` — pure derivation of `SynergyState` from an `EdhrecFetchResult`. No I/O, trivially testable.
- `src/lib/recs/synergy-state.test.ts`
- `src/lib/recs/store.ts` — all `commander_scores` reads/writes. The only module that knows the table exists.
- `src/lib/recs/store.test.ts` — tests the pure row-mapping helpers exported from `store.ts`.
- `src/lib/recs/ranked-list.ts` — the fast-path/miss/degraded orchestration, shared by all three read surfaces.

**Modify:**
- `src/db/schema.ts` — add `commanderScores` table.
- `src/lib/edhrec/client.ts` — extract `resolveEdhrecData`, add `readEdhrecCache`, keep `getEdhrecData` as a thin wrapper.
- `src/lib/recs/recommend.ts` — extract `loadCollectionPool`, add `scoreOneCommander`, use the bulk cache read, return `synergyState` per row.
- `src/lib/recs/recommend.test.ts` — extend the `edhrec/client` mock factory, add `synergyState` to fixtures.
- `src/app/commanders/page.tsx` — read via `getRankedList`.
- `src/app/commanders/[slug]/page.tsx` — resolve slug from the store, score one commander.
- `src/components/home/hero-commander.tsx` — read via `getRankedList`.
- `src/app/commanders/actions.ts` — `retryRecs` clears the user's rows.
- `src/app/collection/actions.ts` — wipe scores in the confirm transaction; warm via `after()`.

---

### Task 1: Add the `commander_scores` table

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/0002_*.sql` (generated — do not hand-write)

**Interfaces:**
- Consumes: nothing.
- Produces: `commanderScores` Drizzle table export and `RoleCounts` type, used by Tasks 3–9.

- [ ] **Step 1: Add the table to the schema**

Append to `src/db/schema.ts` (after `edhrecCache`, before `csvUploads`):

```ts
/** Mirrors the roleCounts shape produced by src/lib/recs/score.ts. */
export type RoleCounts = Record<"ramp" | "draw" | "removal" | "wipes", number>;

export const commanderScores = pgTable("commander_scores", {
  userId: text("user_id").notNull(),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  slug: text("slug").notNull(),
  score: real("score").notNull(),
  fitPool: real("fit_pool").notNull(),
  fitRoles: real("fit_roles").notNull(),
  // Null iff synergyState !== "ok".
  fitSynergy: real("fit_synergy"),
  // "ok" = real EDHREC data; "absent" = 4xx, genuinely not indexed on EDHREC;
  // "degraded" = 5xx/timeout, must be recomputed on next read.
  synergyState: text("synergy_state", { enum: ["ok", "absent", "degraded"] }).notNull(),
  edhrecOwnedCount: integer("edhrec_owned_count"),
  edhrecTotal: integer("edhrec_total"),
  receipts: text("receipts").notNull(),
  colorPoolSize: integer("color_pool_size").notNull(),
  roleCounts: jsonb("role_counts").$type<RoleCounts>().notNull(),
  computedAt: timestamp("computed_at").notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.userId, t.oracleId] }),
  index("commander_scores_rank_idx").on(t.userId, t.score.desc()),
]);
```

`$type<RoleCounts>()` matters: without it Drizzle types the column as `unknown` on select and every read site needs an unchecked cast.

The FK to `cards.oracleId` is a plain reference with no cascade, matching `collection_items` (`schema.ts:22`) and `edhrec_cache` (`schema.ts:46`).

- [ ] **Step 2: Generate the migration**

Run: `pnpm db:generate`
Expected: a new file `drizzle/0002_<name>.sql` containing `CREATE TABLE "commander_scores"` and `CREATE INDEX "commander_scores_rank_idx"`.

- [ ] **Step 3: Verify it typechecks and builds**

Run: `pnpm typecheck && DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat(db): add commander_scores table"
```

---

### Task 2: Bulk EDHREC cache read

The current `getEdhrecData` reads the cache one row at a time (`src/lib/edhrec/client.ts:25-26`). Called once per candidate from the fanout, that is ~196 round-trips per compute. Extract the decision logic so it can be driven from a pre-fetched map, keeping the single-commander entry point for the deck-suggestion path.

**Files:**
- Modify: `src/lib/edhrec/client.ts`

**Interfaces:**
- Consumes: `edhrecCache` (existing), `parseEdhrecPayload`, `commanderSlug`.
- Produces:
  - `type EdhrecCacheRow = { commanderOracleId: string; payload: unknown; fetchedAt: Date }`
  - `readEdhrecCache(oracleIds: string[]): Promise<Map<string, EdhrecCacheRow>>`
  - `resolveEdhrecData(commanderOracleId: string, commanderName: string, cached: EdhrecCacheRow | undefined): Promise<EdhrecFetchResult>`
  - `getEdhrecData(commanderOracleId: string, commanderName: string): Promise<EdhrecFetchResult>` — unchanged signature.

- [ ] **Step 1: Rewrite `client.ts` around the extracted core**

Replace the body of `src/lib/edhrec/client.ts` below the `EdhrecFetchResult` type with:

```ts
export type EdhrecCacheRow = {
  commanderOracleId: string;
  payload: unknown;
  fetchedAt: Date;
};

/** One query for many commanders — the fanout would otherwise issue one SELECT each. */
export async function readEdhrecCache(oracleIds: string[]): Promise<Map<string, EdhrecCacheRow>> {
  if (oracleIds.length === 0) return new Map();
  const rows = await db.select().from(edhrecCache)
    .where(inArray(edhrecCache.commanderOracleId, oracleIds));
  return new Map(rows.map((r) => [r.commanderOracleId, r]));
}

/**
 * Cache-decision + fetch logic, driven by an already-read cache row so callers
 * can bulk-read. `cached` undefined means "no row", not "not looked up".
 */
export async function resolveEdhrecData(
  commanderOracleId: string,
  commanderName: string,
  cached: EdhrecCacheRow | undefined,
): Promise<EdhrecFetchResult> {
  if (cached && Date.now() - cached.fetchedAt.getTime() < TTL_MS) {
    return { data: parseEdhrecPayload(cached.payload), unreachable: false };
  }

  try {
    const res = await fetch(
      `https://json.edhrec.com/pages/commanders/${commanderSlug(commanderName)}.json`,
      { headers: { "User-Agent": "the-99/1.0" }, signal: AbortSignal.timeout(10_000) },
    );
    if (res.status >= 400 && res.status < 500) {
      if (cached) return { data: parseEdhrecPayload(cached.payload), unreachable: false };
      return { data: null, unreachable: false };
    }
    if (!res.ok) throw new Error(`edhrec ${res.status}`);
    const payload = await res.json();
    const now = new Date();
    await db.insert(edhrecCache)
      .values({ commanderOracleId, payload, fetchedAt: now })
      .onConflictDoUpdate({
        target: edhrecCache.commanderOracleId,
        set: { payload, fetchedAt: now },
      });
    return { data: parseEdhrecPayload(payload), unreachable: false };
  } catch {
    if (cached) return { data: parseEdhrecPayload(cached.payload), unreachable: false };
    return { data: null, unreachable: true };
  }
}

export async function getEdhrecData(
  commanderOracleId: string,
  commanderName: string,
): Promise<EdhrecFetchResult> {
  const cache = await readEdhrecCache([commanderOracleId]);
  return resolveEdhrecData(commanderOracleId, commanderName, cache.get(commanderOracleId));
}
```

Change the import on line 1 from `import { eq } from "drizzle-orm";` to `import { inArray } from "drizzle-orm";`.

Keep the existing explanatory comments about 4xx vs 5xx semantics — they document a decision from PR #53 and must not be lost.

- [ ] **Step 2: Verify nothing regressed**

Run: `pnpm typecheck && pnpm test`
Expected: typecheck clean, all existing tests pass. `getEdhrecData`'s signature and behaviour are unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/lib/edhrec/client.ts
git commit -m "perf(edhrec): allow bulk cache reads via resolveEdhrecData"
```

---

### Task 3: `SynergyState` derivation

**Files:**
- Create: `src/lib/recs/synergy-state.ts`
- Test: `src/lib/recs/synergy-state.test.ts`

**Interfaces:**
- Consumes: `EdhrecFetchResult` from `src/lib/edhrec/client.ts` (type-only import, so no `db` mock is needed).
- Produces: `type SynergyState = "ok" | "absent" | "degraded"`, `synergyStateFrom(r: EdhrecFetchResult): SynergyState`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/recs/synergy-state.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { synergyStateFrom } from "./synergy-state";

const data = { topCards: ["Sol Ring"], inclusionByName: { "Sol Ring": 90 } };

describe("synergyStateFrom", () => {
  it("real data → ok", () => {
    expect(synergyStateFrom({ data, unreachable: false })).toBe("ok");
  });
  it("no data, service reachable (4xx) → absent", () => {
    expect(synergyStateFrom({ data: null, unreachable: false })).toBe("absent");
  });
  it("no data, service unreachable (5xx/timeout) → degraded", () => {
    expect(synergyStateFrom({ data: null, unreachable: true })).toBe("degraded");
  });
  it("data present wins even if unreachable is somehow set", () => {
    // client.ts returns stale-cache hits as unreachable:false, but the state
    // must be driven by data presence so a future contract change cannot
    // mark a row with real synergy data for refetch.
    expect(synergyStateFrom({ data, unreachable: true })).toBe("ok");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/recs/synergy-state.test.ts`
Expected: FAIL — cannot resolve `./synergy-state`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/recs/synergy-state.ts`:

```ts
import type { EdhrecFetchResult } from "../edhrec/client";

/**
 * "absent" and "degraded" both mean "no synergy data", but only "degraded" is
 * worth retrying: it signals a service outage, whereas "absent" is a settled
 * fact about a commander EDHREC does not index. Persisting them identically
 * would break the Retry button (see commanders/actions.ts).
 */
export type SynergyState = "ok" | "absent" | "degraded";

export function synergyStateFrom(r: EdhrecFetchResult): SynergyState {
  if (r.data !== null) return "ok";
  return r.unreachable ? "degraded" : "absent";
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/lib/recs/synergy-state.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recs/synergy-state.ts src/lib/recs/synergy-state.test.ts
git commit -m "feat(recs): derive synergy state from EDHREC fetch result"
```

---

### Task 4: Thread `synergyState` through `recommendCommanders`

`recommendCommanders` currently discards the `unreachable` flag after OR-ing it into `degraded` (`src/lib/recs/recommend.ts:114`). The per-commander state must survive so it can be persisted. This task also extracts the collection query so Task 8 can score a single commander without duplicating it.

**Files:**
- Modify: `src/lib/recs/recommend.ts`
- Modify: `src/lib/recs/recommend.test.ts`

**Interfaces:**
- Consumes: `readEdhrecCache`, `resolveEdhrecData` (Task 2); `synergyStateFrom` (Task 3).
- Produces:
  - `RankedCommander` gains `synergyState: SynergyState`
  - `loadCollectionPool(userId: string): Promise<{ collection: PoolCard[]; uniqueCardsRead: number }>`

- [ ] **Step 1: Update imports and the `RankedCommander` type**

In `src/lib/recs/recommend.ts`, change:

```ts
import { getEdhrecData } from "../edhrec/client";
```

to:

```ts
import { readEdhrecCache, resolveEdhrecData } from "../edhrec/client";
import { synergyStateFrom, type SynergyState } from "./synergy-state";
```

and change:

```ts
export type RankedCommander = CommanderScore & { slug: string };
```

to:

```ts
export type RankedCommander = CommanderScore & { slug: string; synergyState: SynergyState };
```

- [ ] **Step 2: Update `finalizeRecommendations` to carry the state through**

Change its parameter type from `results: CommanderScore[]` to
`results: (CommanderScore & { synergyState: SynergyState })[]` — the spread on line 75
already carries the extra field through, so the body needs no other change.

- [ ] **Step 3: Extract the collection query**

Insert above `recommendCommanders`:

```ts
/**
 * The scoring pool for one user. Extracted so the detail page can score a
 * single commander without re-running the whole fanout.
 */
export async function loadCollectionPool(
  userId: string,
): Promise<{ collection: PoolCard[]; uniqueCardsRead: number }> {
  const owned = await db
    .selectDistinctOn([cards.oracleId], {
      oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine,
      oracleText: cards.oracleText, keywords: cards.keywords,
      colorIdentity: cards.colorIdentity, commanderLegal: cards.commanderLegal,
      imageUri: cards.imageUri, manaCost: cards.manaCost,
    })
    .from(collectionItems)
    .innerJoin(cards, eq(collectionItems.oracleId, cards.oracleId))
    .where(eq(collectionItems.userId, userId))
    // Postgres requires DISTINCT ON expressions to lead the ORDER BY.
    .orderBy(cards.oracleId);

  // Score against commander-legal cards only, matching the deck-suggestion and
  // search pools — banned/not-legal cards must not inflate pool size, role
  // counts, or EDHREC overlap.
  return { collection: owned.filter((c) => c.commanderLegal), uniqueCardsRead: owned.length };
}
```

- [ ] **Step 4: Rewrite `recommendCommanders` to use it, bulk-read the cache, and record state**

Replace the whole body of `recommendCommanders` with:

```ts
export async function recommendCommanders(
  userId: string,
): Promise<RecommendResult> {
  const { collection, uniqueCardsRead } = await loadCollectionPool(userId);
  const candidates = collection.filter((c) => isCommanderCandidate(c));

  // One cache read for the whole fanout — a per-commander SELECT here meant
  // ~196 round-trips on every compute, warm or cold.
  const cache = await readEdhrecCache(candidates.map((c) => c.oracleId));

  // Fetch EDHREC data with bounded concurrency: sequential awaits would make
  // cold loads with dozens of candidates exceed the page's time budget.
  const CONCURRENCY = 5;
  let degraded = false;
  const results: (CommanderScore & { synergyState: SynergyState })[] = [];
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const scored = await Promise.all(
      candidates.slice(i, i + CONCURRENCY).map(async (commander) => {
        const result = await resolveEdhrecData(
          commander.oracleId, commander.name, cache.get(commander.oracleId),
        );
        // `unreachable` only flips true on real service outage (5xx/network/timeout
        // with no cache). 4xx (commander not on EDHREC) is a per-commander data
        // absence, not a service issue — data === null but unreachable === false.
        if (result.unreachable) degraded = true;
        return {
          ...scoreCommander({
            commander, collection, edhrecTopCards: result.data?.topCards ?? null,
          }),
          synergyState: synergyStateFrom(result),
        };
      }),
    );
    results.push(...scored);
  }
  results.sort((a, b) => b.score - a.score);

  const finalized = finalizeRecommendations(results, uniqueCardsRead, candidates.length);
  return { ...finalized, degraded };
}
```

- [ ] **Step 5: Add `scoreOneCommander` for the detail page**

Append to `src/lib/recs/recommend.ts`:

```ts
/**
 * Full score for a single commander, for the detail page. Costs one collection
 * query plus one EDHREC resolve instead of the ~196 the fanout would do.
 * Returns null when the commander is no longer in the user's collection.
 */
export async function scoreOneCommander(
  userId: string,
  oracleId: string,
  slug: string,
): Promise<RankedCommander | null> {
  const { collection } = await loadCollectionPool(userId);
  const commander = collection.find((c) => c.oracleId === oracleId);
  if (!commander) return null;

  const cache = await readEdhrecCache([oracleId]);
  const result = await resolveEdhrecData(oracleId, commander.name, cache.get(oracleId));
  return {
    ...scoreCommander({ commander, collection, edhrecTopCards: result.data?.topCards ?? null }),
    slug,
    synergyState: synergyStateFrom(result),
  };
}
```

- [ ] **Step 6: Fix the test mock factory**

`src/lib/recs/recommend.test.ts:5` mocks `../edhrec/client` with only `getEdhrecData`. Vitest
throws "No X export is defined on the mock" for any other import the module under test pulls
in, so update it to:

```ts
vi.mock("../edhrec/client", () => ({
  getEdhrecData: vi.fn(),
  readEdhrecCache: vi.fn(async () => new Map()),
  resolveEdhrecData: vi.fn(async () => ({ data: null, unreachable: false })),
}));
```

`stubScore` feeds `finalizeRecommendations`, whose parameter type now requires `synergyState`.
Add it to the returned object:

```ts
    fitPool: 0, fitRoles: 0, fitSynergy: null, score,
    synergyState: "ok" as const,
```

(match the existing property order in the stub; the point is that `synergyState: "ok" as const`
is present).

- [ ] **Step 7: Run the full suite**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: typecheck clean; all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/recs/recommend.ts src/lib/recs/recommend.test.ts
git commit -m "perf(recs): bulk-read EDHREC cache and track per-commander synergy state"
```

---

### Task 5: The score store

**Files:**
- Create: `src/lib/recs/store.ts`
- Test: `src/lib/recs/store.test.ts`

**Interfaces:**
- Consumes: `commanderScores`, `RoleCounts` (Task 1); `RankedCommander` (Task 4); `cards`.
- Produces:
  - `type ScoreRowWithCard`
  - `toScoreRow(userId: string, r: RankedCommander): typeof commanderScores.$inferInsert`
  - `rowToListItem(row: ScoreRowWithCard): CommanderListItem`
  - `persistScores(userId: string, ranked: RankedCommander[]): Promise<void>`
  - `loadScores(userId: string): Promise<{ items: CommanderListItem[]; degradedOracleIds: string[] }>`
  - `findScoredCommander(userId: string, slug: string): Promise<{ oracleId: string; rank: number } | null>`
  - `deleteAllScores(userId: string): Promise<void>`

- [ ] **Step 1: Write the failing test for the pure mappers**

Create `src/lib/recs/store.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

// store.ts imports the db client, which throws at module init without DATABASE_URL.
vi.mock("../../db", () => ({ db: {} }));

import { rowToListItem, toScoreRow } from "./store";
import type { RankedCommander } from "./recommend";

const ranked = (over: Partial<RankedCommander> = {}): RankedCommander => ({
  oracleId: "11111111-1111-1111-1111-111111111111",
  name: "Atraxa, Praetors' Voice",
  colorIdentity: ["W", "U", "B", "G"],
  imageUri: "https://x.test/a.jpg",
  typeLine: "Legendary Creature — Phyrexian Angel Horror",
  oracleText: "Flying, vigilance, deathtouch, lifelink",
  manaCost: "{G}{W}{U}{B}",
  colorPoolSize: 420,
  edhrecOwnedCount: 30,
  edhrecTotal: 100,
  roleCounts: { ramp: 10, draw: 8, removal: 9, wipes: 3 },
  roleGaps: [],
  roleCards: { ramp: [], draw: [], removal: [], wipes: [] },
  overlapOwned: ["Sol Ring", "Cultivate"],
  overlapMissing: [],
  fitPool: 15,
  fitRoles: 25,
  fitSynergy: 18,
  score: 58,
  slug: "atraxa-praetors-voice",
  synergyState: "ok",
  ...over,
});

describe("toScoreRow", () => {
  it("carries the list fields and drops detail-only ones", () => {
    const row = toScoreRow("user_1", ranked());
    expect(row.userId).toBe("user_1");
    expect(row.slug).toBe("atraxa-praetors-voice");
    expect(row.score).toBe(58);
    expect(row.synergyState).toBe("ok");
    // Detail-only fields must not be persisted.
    expect(row).not.toHaveProperty("roleCards");
    expect(row).not.toHaveProperty("overlapMissing");
    expect(row).not.toHaveProperty("oracleText");
  });

  it("preformats receipts rather than storing the raw overlap list", () => {
    expect(typeof toScoreRow("user_1", ranked()).receipts).toBe("string");
  });

  it("stores null fitSynergy for a degraded row", () => {
    const row = toScoreRow("user_1", ranked({ fitSynergy: null, synergyState: "degraded" }));
    expect(row.fitSynergy).toBeNull();
    expect(row.synergyState).toBe("degraded");
  });

  it("persists the slug so the detail URL survives a re-rank", () => {
    // Slugs are assigned in rank order with -2/-3 dedup, so recomputing after a
    // rank change could hand the same commander a different slug. Persisting it
    // is what decouples the URL from the ranking.
    expect(toScoreRow("user_1", ranked({ slug: "atraxa-praetors-voice-2" })).slug)
      .toBe("atraxa-praetors-voice-2");
  });
});

describe("rowToListItem", () => {
  it("rehydrates a list item by joining card fields", () => {
    const item = rowToListItem({
      slug: "atraxa-praetors-voice",
      score: 58,
      fitPool: 15,
      fitRoles: 25,
      fitSynergy: 18,
      synergyState: "ok",
      edhrecOwnedCount: 30,
      edhrecTotal: 100,
      receipts: "own Sol Ring, Cultivate",
      colorPoolSize: 420,
      roleCounts: { ramp: 10, draw: 8, removal: 9, wipes: 3 },
      name: "Atraxa, Praetors' Voice",
      colorIdentity: ["W", "U", "B", "G"],
      imageUri: "https://x.test/a.jpg",
    });
    expect(item.name).toBe("Atraxa, Praetors' Voice");
    expect(item.slug).toBe("atraxa-praetors-voice");
    expect(item.score).toBe(58);
    expect(item.imageUri).toBe("https://x.test/a.jpg");
  });

  it("maps a degraded row to a null fitSynergy list item", () => {
    const item = rowToListItem({
      slug: "x", score: 40, fitPool: 10, fitRoles: 6, fitSynergy: null,
      synergyState: "degraded", edhrecOwnedCount: null, edhrecTotal: null,
      receipts: "", colorPoolSize: 100,
      roleCounts: { ramp: 1, draw: 1, removal: 1, wipes: 0 },
      name: "X", colorIdentity: ["R"], imageUri: null,
    });
    expect(item.fitSynergy).toBeNull();
    expect(item.edhrecTotal).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/recs/store.test.ts`
Expected: FAIL — cannot resolve `./store`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/recs/store.ts`:

```ts
import { and, desc, eq, notInArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, commanderScores, type RoleCounts } from "../../db/schema";
import { receiptsPreview } from "./format";
import type { CommanderListItem, RankedCommander } from "./recommend";
import type { SynergyState } from "./synergy-state";

export type ScoreRowWithCard = {
  slug: string;
  score: number;
  fitPool: number;
  fitRoles: number;
  fitSynergy: number | null;
  synergyState: SynergyState;
  edhrecOwnedCount: number | null;
  edhrecTotal: number | null;
  receipts: string;
  colorPoolSize: number;
  roleCounts: RoleCounts;
  name: string;
  colorIdentity: string[];
  imageUri: string | null;
};

export function toScoreRow(userId: string, r: RankedCommander) {
  return {
    userId,
    oracleId: r.oracleId,
    slug: r.slug,
    score: r.score,
    fitPool: r.fitPool,
    fitRoles: r.fitRoles,
    fitSynergy: r.fitSynergy,
    synergyState: r.synergyState,
    edhrecOwnedCount: r.edhrecOwnedCount,
    edhrecTotal: r.edhrecTotal,
    receipts: receiptsPreview(r.overlapOwned),
    colorPoolSize: r.colorPoolSize,
    roleCounts: r.roleCounts,
    computedAt: new Date(),
  };
}

export function rowToListItem(row: ScoreRowWithCard): CommanderListItem {
  return {
    slug: row.slug,
    name: row.name,
    colorIdentity: row.colorIdentity,
    colorPoolSize: row.colorPoolSize,
    roleCounts: row.roleCounts,
    edhrecOwnedCount: row.edhrecOwnedCount,
    edhrecTotal: row.edhrecTotal,
    receipts: row.receipts,
    fitPool: row.fitPool,
    fitRoles: row.fitRoles,
    fitSynergy: row.fitSynergy,
    score: row.score,
    imageUri: row.imageUri,
  };
}

/**
 * Upsert rather than delete-then-insert: the after() warm and an inline compute
 * from a concurrent page load can run at once, and under READ COMMITTED a second
 * transaction's DELETE cannot see the first's uncommitted rows — its INSERT would
 * then collide on the composite primary key and abort the render. Both writers
 * derive from the same collection snapshot, so last-write-wins is safe.
 */
export async function persistScores(userId: string, ranked: RankedCommander[]): Promise<void> {
  const rows = ranked.map((r) => toScoreRow(userId, r));
  const keep = rows.map((r) => r.oracleId);
  await db.transaction(async (tx) => {
    await tx.delete(commanderScores).where(
      keep.length === 0
        ? eq(commanderScores.userId, userId)
        : and(eq(commanderScores.userId, userId), notInArray(commanderScores.oracleId, keep)),
    );
    for (let i = 0; i < rows.length; i += 500) {
      await tx.insert(commanderScores).values(rows.slice(i, i + 500)).onConflictDoUpdate({
        target: [commanderScores.userId, commanderScores.oracleId],
        set: {
          slug: sql`excluded.slug`,
          score: sql`excluded.score`,
          fitPool: sql`excluded.fit_pool`,
          fitRoles: sql`excluded.fit_roles`,
          fitSynergy: sql`excluded.fit_synergy`,
          synergyState: sql`excluded.synergy_state`,
          edhrecOwnedCount: sql`excluded.edhrec_owned_count`,
          edhrecTotal: sql`excluded.edhrec_total`,
          receipts: sql`excluded.receipts`,
          colorPoolSize: sql`excluded.color_pool_size`,
          roleCounts: sql`excluded.role_counts`,
          computedAt: sql`excluded.computed_at`,
        },
      });
    }
  });
}

export async function loadScores(
  userId: string,
): Promise<{ items: CommanderListItem[]; degradedOracleIds: string[] }> {
  const rows = await db
    .select({
      oracleId: commanderScores.oracleId,
      slug: commanderScores.slug,
      score: commanderScores.score,
      fitPool: commanderScores.fitPool,
      fitRoles: commanderScores.fitRoles,
      fitSynergy: commanderScores.fitSynergy,
      synergyState: commanderScores.synergyState,
      edhrecOwnedCount: commanderScores.edhrecOwnedCount,
      edhrecTotal: commanderScores.edhrecTotal,
      receipts: commanderScores.receipts,
      colorPoolSize: commanderScores.colorPoolSize,
      roleCounts: commanderScores.roleCounts,
      name: cards.name,
      colorIdentity: cards.colorIdentity,
      imageUri: cards.imageUri,
    })
    .from(commanderScores)
    .innerJoin(cards, eq(commanderScores.oracleId, cards.oracleId))
    .where(eq(commanderScores.userId, userId))
    .orderBy(desc(commanderScores.score));

  return {
    items: rows.map(rowToListItem),
    degradedOracleIds: rows.filter((r) => r.synergyState === "degraded").map((r) => r.oracleId),
  };
}

/**
 * Resolves a persisted slug to its commander and rank without reading every row.
 * Rank comes from the stored ordering, so it matches the list the user clicked from.
 */
export async function findScoredCommander(
  userId: string,
  slug: string,
): Promise<{ oracleId: string; rank: number } | null> {
  const ranked = db.$with("ranked").as(
    db
      .select({
        oracleId: commanderScores.oracleId,
        slug: commanderScores.slug,
        rank: sql<number>`(row_number() over (order by ${commanderScores.score} desc))::int`.as("rank"),
      })
      .from(commanderScores)
      .where(eq(commanderScores.userId, userId)),
  );
  const [row] = await db
    .with(ranked)
    .select({ oracleId: ranked.oracleId, rank: ranked.rank })
    .from(ranked)
    .where(eq(ranked.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function deleteAllScores(userId: string): Promise<void> {
  await db.delete(commanderScores).where(eq(commanderScores.userId, userId));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/lib/recs/store.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Run the full gate and commit**

Run: `pnpm typecheck && pnpm lint && pnpm test`

```bash
git add src/lib/recs/store.ts src/lib/recs/store.test.ts
git commit -m "feat(recs): commander score store with list-row mapping"
```

---

### Task 6: The shared ranked-list read path

Three surfaces need the ranked list. Putting the fast/miss/degraded decision in one
`cache()`-wrapped helper keeps them from drifting and dedups the work when a single request
touches two of them.

**Files:**
- Create: `src/lib/recs/ranked-list.ts`

**Interfaces:**
- Consumes: `loadScores`, `persistScores` (Task 5); `recommendCommanders`, `toListItem` (Task 4); `getCollectionStats` from `src/lib/home/summary.ts`.
- Produces: `getRankedList(userId: string): Promise<RankedList>` where
  `RankedList = { items: CommanderListItem[]; degraded: boolean; uniqueCardsRead: number; candidateCount: number }`.

- [ ] **Step 1: Write the module**

Create `src/lib/recs/ranked-list.ts`:

```ts
import { cache } from "react";
import { getCollectionStats } from "../home/summary";
import { recommendCommanders, toListItem, type CommanderListItem } from "./recommend";
import { loadScores, persistScores } from "./store";

export type RankedList = {
  items: CommanderListItem[];
  degraded: boolean;
  uniqueCardsRead: number;
  candidateCount: number;
};

/**
 * Ranked commander list for a user, served from commander_scores when possible.
 *
 * Miss and degraded both recompute the full set. The spec describes repairing
 * only the degraded rows, but a full recompute is the same work the page did
 * before this change, happens only after an actual EDHREC outage, and avoids a
 * second write path. A user with a collection but no legendary creatures also
 * takes the recompute branch on every load; that costs one collection query and
 * zero EDHREC calls, so it is not worth a sentinel row to avoid.
 */
export const getRankedList = cache(async function getRankedList(
  userId: string,
): Promise<RankedList> {
  const [stored, stats] = await Promise.all([loadScores(userId), getCollectionStats(userId)]);

  if (stored.items.length > 0 && stored.degradedOracleIds.length === 0) {
    return {
      items: stored.items,
      degraded: false,
      uniqueCardsRead: stats.uniqueCards,
      candidateCount: stored.items.length,
    };
  }

  const recs = await recommendCommanders(userId);
  await persistScores(userId, recs.results);
  return {
    items: recs.results.map(toListItem),
    degraded: recs.degraded,
    uniqueCardsRead: recs.uniqueCardsRead,
    candidateCount: recs.candidateCount,
  };
});
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm typecheck && pnpm lint`
Expected: clean. (No test file — the module is pure orchestration over already-tested units and
would need a full DB mock to exercise.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/recs/ranked-list.ts
git commit -m "feat(recs): shared ranked-list read path over persisted scores"
```

---

### Task 7: Serve `/commanders` and the Home hero from the store

**Files:**
- Modify: `src/app/commanders/page.tsx`
- Modify: `src/components/home/hero-commander.tsx`

**Interfaces:**
- Consumes: `getRankedList` (Task 6).
- Produces: no new exports.

- [ ] **Step 1: Replace the data-loading block in `/commanders`**

In `src/app/commanders/page.tsx`, replace:

```ts
  const [recs, decks] = await Promise.all([
    recommendCommanders(userId),
    listRecentDecks(userId, 1),
  ]);

  const { results, degraded, uniqueCardsRead, candidateCount } = recs;
```

with:

```ts
  const [list, decks] = await Promise.all([
    getRankedList(userId),
    listRecentDecks(userId, 1),
  ]);

  const { items, degraded, uniqueCardsRead, candidateCount } = list;
```

Change the render block to pass `results={items}` instead of `results={results.map(toListItem)}`.
The `candidateCount === 0` guard already reads the destructured local and needs no edit.

Replace the import on line 4:

```ts
import { getRankedList } from "../../lib/recs/ranked-list";
```

(`recommendCommanders` and `toListItem` are no longer used here — remove them from the import
or lint will fail on unused bindings.)

- [ ] **Step 2: Confirm the empty-collection guard still short-circuits**

Read the top of `src/app/commanders/page.tsx`. The existing early return for a user with no
collection must remain *above* this block so a brand-new user never reaches `getRankedList`.
Do not move it.

- [ ] **Step 3: Point the Home hero at the same helper**

In `src/components/home/hero-commander.tsx`, replace the import on line 1:

```ts
import { getRankedList } from "../../lib/recs/ranked-list";
```

and replace line 70:

```ts
  const { items, degraded } = await getRankedList(userId);
  const top = items[0];
```

`top` is now a `CommanderListItem`. The component reads only `top.colorIdentity`, `top.name`,
`top.edhrecOwnedCount`, `top.edhrecTotal`, `top.slug`, and `top.imageUri`, all of which are list
fields, and `completeness(top)` needs only `edhrecOwnedCount`/`edhrecTotal`. If `pnpm typecheck`
reports any other field, that field must be added to `CommanderListItem` and to
`commander_scores` — do not widen the type with a cast.

Update the component's doc comment: it currently says "expensive (dozens of EDHREC fetches)",
which is now only true on a cold miss.

- [ ] **Step 4: Run the gate**

Run: `pnpm typecheck && pnpm lint && pnpm test && DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/commanders/page.tsx src/components/home/hero-commander.tsx
git commit -m "perf(commanders): serve ranked list and home hero from persisted scores"
```

---

### Task 8: Serve `/commanders/[slug]` without the fanout

`src/app/commanders/[slug]/page.tsx:13` calls `recommendCommanders` and matches on a
freshly-derived slug. Two problems: it re-scores all ~196 commanders to render one, and the
slug it derives depends on live rank order (`recommend.ts:70-77` assigns `-2`/`-3` suffixes in
rank order), so it can disagree with the persisted slug the list linked to and 404.

**Files:**
- Modify: `src/app/commanders/[slug]/page.tsx`

**Interfaces:**
- Consumes: `findScoredCommander` (Task 5), `scoreOneCommander` (Task 4), `getRankedList` (Task 6).
- Produces: no new exports.

- [ ] **Step 1: Rewrite the page**

Replace the whole of `src/app/commanders/[slug]/page.tsx` with:

```tsx
import { notFound } from "next/navigation";
import { requireUserId } from "../../../lib/auth";
import { scoreOneCommander } from "../../../lib/recs/recommend";
import { getRankedList } from "../../../lib/recs/ranked-list";
import { findScoredCommander } from "../../../lib/recs/store";
import { CommanderDetail } from "../../../components/commanders/detail";

export default async function CommanderDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const userId = await requireUserId();

  // Fast path: the slug is persisted, so resolving it is one indexed lookup and
  // scoring is one commander rather than the whole candidate set.
  const found = await findScoredCommander(userId, slug);
  if (found) {
    const commander = await scoreOneCommander(userId, found.oracleId, slug);
    if (!commander) notFound();
    return (
      <CommanderDetail commander={commander} rank={found.rank} isBestFit={found.rank === 1} />
    );
  }

  // No persisted rows yet (first visit, or arriving here before /commanders).
  // getRankedList computes and persists, so the next hit takes the fast path.
  await getRankedList(userId);
  const retry = await findScoredCommander(userId, slug);
  if (!retry) notFound();
  const commander = await scoreOneCommander(userId, retry.oracleId, slug);
  if (!commander) notFound();
  return <CommanderDetail commander={commander} rank={retry.rank} isBestFit={retry.rank === 1} />;
}
```

- [ ] **Step 2: Run the gate**

Run: `pnpm typecheck && pnpm lint && pnpm test && DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add "src/app/commanders/[slug]/page.tsx"
git commit -m "perf(commanders): resolve detail page from persisted slug"
```

---

### Task 9: Invalidate on upload and warm via `after()`

**Files:**
- Modify: `src/app/collection/actions.ts`
- Modify: `src/app/collection/replace/page.tsx`

**Interfaces:**
- Consumes: `commanderScores` (Task 1), `recommendCommanders` (Task 4), `persistScores` (Task 5).
- Produces: no new exports.

- [ ] **Step 1: Wipe scores inside the existing confirm transaction**

`confirmUpload` is the only writer of `collection_items`, so this is the only invalidation point
needed. Add the delete alongside the existing collection wipe so invalidation is atomic with the
replace:

```ts
  await db.transaction(async (tx) => {
    await tx.delete(collectionItems).where(eq(collectionItems.userId, userId));
    // Every score component derives from the collection, so a replace invalidates all of them.
    await tx.delete(commanderScores).where(eq(commanderScores.userId, userId));
    for (let i = 0; i < values.length; i += 500) {
      await tx.insert(collectionItems).values(values.slice(i, i + 500));
    }
    await tx.update(csvUploads).set({ confirmedAt: new Date() }).where(eq(csvUploads.id, uploadId));
  });
```

Add `commanderScores` to the existing `../../db/schema` import.

- [ ] **Step 2: Warm after the response**

After the `revalidatePath` calls at the end of `confirmUpload`, add:

```ts
  // Warm the new collection's scores without blocking the upload response. If this
  // is cut short by the route's max duration, /commanders recomputes on first visit —
  // the warm is an optimisation, never a correctness requirement.
  after(async () => {
    try {
      const recs = await recommendCommanders(userId);
      await persistScores(userId, recs.results);
    } catch {
      // Swallow: the lazy path in getRankedList is the correctness backstop.
    }
  });
```

Add imports:

```ts
import { after } from "next/server";
import { recommendCommanders } from "../../lib/recs/recommend";
import { persistScores } from "../../lib/recs/store";
```

- [ ] **Step 3: Raise `maxDuration` for the upload route**

A cold fanout is ~40 sequential batches. `confirmUpload` is invoked only from
`src/components/collection/replace-flow.tsx:26`, i.e. the `/collection/replace` segment, and
`maxDuration` on a page governs Server Actions invoked from it. Add to
`src/app/collection/replace/page.tsx`:

```ts
export const maxDuration = 300;
```

Note for the PR description: 300s exceeds Vercel's Hobby-plan 60s ceiling. On Hobby the warm is
truncated and the lazy path covers it — correct, just slower on first visit.

- [ ] **Step 4: Run the gate**

Run: `pnpm typecheck && pnpm lint && pnpm test && DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/collection/actions.ts src/app/collection/replace/page.tsx
git commit -m "feat(collection): invalidate and warm commander scores on upload confirm"
```

---

### Task 10: Make Retry clear the user's scores

`retryRecs` relies on nothing being cached (`src/app/commanders/actions.ts:8-10`). With
persistence, revalidating alone would re-read the same degraded rows.

It must delete **all** the user's rows, not just the degraded ones. Deleting only the degraded
rows would leave a table that is non-empty with nothing degraded — exactly the fast-path
condition in `getRankedList` — so the deleted commanders would be missing from the list
permanently.

**Files:**
- Modify: `src/app/commanders/actions.ts`

**Interfaces:**
- Consumes: `deleteAllScores` (Task 5).
- Produces: no new exports.

- [ ] **Step 1: Rewrite the action**

Replace the whole file with:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "../../lib/auth";
import { deleteAllScores } from "../../lib/recs/store";

/**
 * Retry action for the commanders recommendations page.
 *
 * Clears the user's persisted scores so the next render recomputes from scratch,
 * refetching any commander whose synergy data was missed during an EDHREC outage.
 * Deleting only the 'degraded' rows would leave a non-empty, non-degraded table —
 * the fast path — and those commanders would drop out of the list for good.
 */
export async function retryRecs() {
  const userId = await requireUserId();
  await deleteAllScores(userId);
  revalidatePath("/commanders");
}
```

Note `requireUserId()`'s return value is now used, where before it was called only for its auth
side effect.

- [ ] **Step 2: Run the gate**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/commanders/actions.ts
git commit -m "fix(commanders): retry clears persisted scores before recompute"
```

---

### Task 11: Manual verification against the dev database

**Files:** none modified.

- [ ] **Step 1: Apply the migration**

Run: `pnpm db:migrate`
Expected: `commander_scores` created.

- [ ] **Step 2: Verify cold then warm**

Start `pnpm dev`, sign in, and visit `/commanders`.
- First load populates the table. Confirm with
  `SELECT synergy_state, count(*) FROM commander_scores GROUP BY synergy_state;` — expect ~196 rows total.
- Reload. Confirm the page renders and no EDHREC requests are made (no outbound fetches in the
  dev server log).

- [ ] **Step 3: Verify rank order is unchanged**

Record the top 10 commander names and scores from `main` (check it out in a second worktree) and
compare against the persisted ordering. They must match exactly — scoring semantics were not
changed.

- [ ] **Step 4: Verify the detail page and hero**

- Click through from `/commanders` to a detail page. It must render with the same rank shown in
  the list, and the dev log must show at most one EDHREC fetch.
- Load `/` and confirm the hero shows the same top commander as `/commanders` row 1.
- Visit a detail URL for a commander whose slug carries a `-2` suffix, if the collection has a
  name collision. It must not 404.

- [ ] **Step 5: Verify invalidation and warming**

Re-upload `data/the-vault.csv` via `/collection/replace`. Immediately after confirm, query the
table: it should be empty or repopulating. Within a few seconds it should hold ~196 rows again
without visiting `/commanders`.

- [ ] **Step 6: Verify Retry**

Manually degrade a row:
`UPDATE commander_scores SET synergy_state = 'degraded', fit_synergy = NULL WHERE user_id = '<id>' AND slug = '<some-slug>';`
Load `/commanders`, confirm the degraded note renders **and the full list is still present**,
click Retry, and confirm the row returns to `ok` and the row count is unchanged.

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
| --- | --- |
| `commander_scores` data model | 1 |
| Bulk EDHREC cache read | 2 |
| `synergy_state` derivation | 3, 4 |
| Read path (fast / miss / degraded) | 6, 7 |
| Detail page served from persisted slug | 5, 8 |
| Write path — invalidation | 9 |
| Write path — `after()` warm + `maxDuration` | 9 |
| `retryRecs` behaviour | 10 |
| Slug persisted, decoupled from rank | 1, 5, 8 |
| Card fields joined not duplicated | 5 |
| Testing — unit | 3, 5 |
| Testing — integration/manual | 11 |

**Known deviations from the spec, and why:**

1. *Degraded repair.* The spec repairs only degraded rows in place; `getRankedList` recomputes
   the full set when any row is degraded. Simpler, bounded by the work the page already did
   before this change, and only triggered by a real EDHREC outage. It also makes the spec's
   "rank preservation under partial repair" test moot — there is no partial repair — so that
   test is not written.
2. *`retryRecs` scope.* The spec says Retry deletes the user's degraded rows. It must delete all
   of them; see Task 10 for why the narrower version silently truncates the list.
3. *Upsert, not replace.* The spec's write path implies `onConflictDoUpdate`; `persistScores`
   implements exactly that plus a `notInArray` sweep for commanders that left the collection.
   A delete-then-insert would deadlock or abort against a concurrent writer.
4. *Detail page and Home hero.* Not in the spec's read-path section, which covers `/commanders`
   only. Both call `recommendCommanders` today and are affected by slug persistence, so leaving
   them would ship a 404 regression and two remaining 196-score hot paths.

**Type consistency:** `synergyState` is spelled identically in schema (`synergyState`/
`synergy_state`), `RankedCommander`, `toScoreRow`, `ScoreRowWithCard`, and `loadScores`.
`SynergyState` is defined once in `synergy-state.ts`; `RoleCounts` once in `db/schema.ts`.
`getRankedList` returns `items`, and every consumer destructures `items` — not `results`.

**No unused exports:** every store export has a caller — `persistScores` (Tasks 6, 9),
`loadScores` (6), `findScoredCommander` (8), `deleteAllScores` (10), `toScoreRow`/`rowToListItem`
(internal + tests).

**Placeholder scan:** no TBDs; every code step contains complete code.
