# Deploy-Time Migrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run `drizzle-kit migrate` during each Vercel production build so a merged migration can never deploy unapplied, and make `/commanders` degrade to a recompute instead of a 500 if a migration is ever late anyway.

**Architecture:** A `vercel-build` script runs a guard script before `next build`. The guard's decision logic is a pure function in `src/` (unit-tested under the existing Vitest glob); the script itself is a thin shell that executes the decision. Separately, the two `commander_scores` read paths catch the two Postgres error codes that mean "schema is behind the code" and return their existing cache-miss shapes.

**Tech Stack:** Next.js 16.2.10, Drizzle ORM 0.45 / drizzle-kit 0.31, Neon Postgres, Vitest, tsx, pnpm.

**Source spec:** `docs/superpowers/specs/2026-07-25-deploy-migrations-design.md`

## Global Constraints

- Package manager is **pnpm**. Never npm or yarn. `pnpm-lock.yaml` is the only lockfile.
- All work happens in the worktree `.worktrees/deploy-migrations-70` on branch `feat/deploy-migrations-70`.
- **Stage files by name — never `git add -A`.** `.env` is present in the worktree and must stay untracked.
- Vitest only collects tests matching `src/**/*.test.{ts,tsx}` (`vitest.config.ts:5`). A test placed under `scripts/` will silently never run. All test files in this plan live under `src/`.
- Vitest runs with `globals: false`; import `describe`, `it`, `expect`, `vi` explicitly from `vitest`.
- `src/db/index.ts:9-10` throws at module load when `DATABASE_URL` is unset, so any test importing `store.ts` must `vi.mock` the db module. Follow the existing hoisted-stub pattern at `src/lib/recs/store.test.ts:3-5`.
- Pre-push gate, every push: `pnpm typecheck && pnpm lint && pnpm test`, plus the stub-DB build `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`, then `git fetch origin && git rebase origin/main`.
- Exact env var name: `MIGRATE_DATABASE_URL`. Exact guard value: `VERCEL_ENV === "production"`.
- Schema-lag Postgres codes, exactly these two: `42P01` (undefined_table), `42703` (undefined_column).

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/deploy/migrate-decision.ts` (create) | Pure function: environment → skip / run / fail. All branching logic lives here so it is testable. |
| `src/lib/deploy/migrate-decision.test.ts` (create) | Unit tests for the above. |
| `scripts/vercel-migrate.ts` (create) | Thin shell. Calls the decision function, then spawns `drizzle-kit migrate` or exits. No branching logic beyond acting on the decision. |
| `package.json` (modify) | Add the `vercel-build` script. |
| `src/lib/recs/store.ts` (modify) | Add `isSchemaLagError`; wrap the two read functions. |
| `src/lib/recs/store.test.ts` (modify) | Tests for the fail-soft reads. |
| `drizzle/0005_*.sql` + `drizzle/meta/` (create, generated) | No-op smoke-test migration proving the pipeline on first deploy. |
| `AGENTS.md` (modify) | Record that migrations run in the Vercel build. |

The decision/shell split is the key call: it keeps `scripts/` free of logic that Vitest cannot see.

---

### Task 1: Migration decision function

**Files:**
- Create: `src/lib/deploy/migrate-decision.ts`
- Test: `src/lib/deploy/migrate-decision.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `decideMigration(env: NodeJS.ProcessEnv): MigrationDecision`, where
  `type MigrationDecision = { action: "skip"; reason: string } | { action: "run"; databaseUrl: string } | { action: "fail"; reason: string }`.
  Task 2 imports both the function and the type.

- [ ] **Step 1: Write the failing test**

Create `src/lib/deploy/migrate-decision.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { decideMigration } from "./migrate-decision";

const URL = "postgres://u:p@host.neon.tech/db";

describe("decideMigration", () => {
  it("skips when VERCEL_ENV is unset (local or CI build)", () => {
    const d = decideMigration({});
    expect(d.action).toBe("skip");
  });

  it("skips preview deployments so pull requests never touch a shared database", () => {
    const d = decideMigration({ VERCEL_ENV: "preview", MIGRATE_DATABASE_URL: URL });
    expect(d.action).toBe("skip");
  });

  it("skips the development environment", () => {
    const d = decideMigration({ VERCEL_ENV: "development", MIGRATE_DATABASE_URL: URL });
    expect(d.action).toBe("skip");
  });

  it("names the offending value in the skip reason", () => {
    const d = decideMigration({ VERCEL_ENV: "preview" });
    expect(d.action).toBe("skip");
    if (d.action !== "skip") throw new Error("unreachable");
    expect(d.reason).toContain("preview");
  });

  it("fails a production build when MIGRATE_DATABASE_URL is missing", () => {
    const d = decideMigration({ VERCEL_ENV: "production" });
    expect(d.action).toBe("fail");
    if (d.action !== "fail") throw new Error("unreachable");
    expect(d.reason).toContain("MIGRATE_DATABASE_URL");
  });

  it("fails a production build when MIGRATE_DATABASE_URL is blank", () => {
    const d = decideMigration({ VERCEL_ENV: "production", MIGRATE_DATABASE_URL: "   " });
    expect(d.action).toBe("fail");
  });

  it("runs with the trimmed url on a production build", () => {
    const d = decideMigration({ VERCEL_ENV: "production", MIGRATE_DATABASE_URL: ` ${URL} ` });
    expect(d).toEqual({ action: "run", databaseUrl: URL });
  });

  it("ignores MIGRATE_DATABASE_URL outside production rather than running", () => {
    const d = decideMigration({ VERCEL_ENV: "preview", MIGRATE_DATABASE_URL: URL });
    expect(d.action).toBe("skip");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd .worktrees/deploy-migrations-70
pnpm vitest run src/lib/deploy/migrate-decision.test.ts
```

Expected: FAIL — `Failed to resolve import "./migrate-decision"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/deploy/migrate-decision.ts`:

```ts
export type MigrationDecision =
  | { action: "skip"; reason: string }
  | { action: "run"; databaseUrl: string }
  | { action: "fail"; reason: string };

/**
 * Decides whether a Vercel build should apply migrations.
 *
 * A missing url on a production build is a hard failure rather than a skip:
 * silently skipping is exactly what shipped code without its schema in #70, so
 * the misconfigured case has to be louder than the healthy one, not quieter.
 */
export function decideMigration(env: NodeJS.ProcessEnv): MigrationDecision {
  const vercelEnv = env.VERCEL_ENV;

  if (vercelEnv !== "production") {
    return {
      action: "skip",
      reason: `Skipping migrations: VERCEL_ENV is ${vercelEnv ? `"${vercelEnv}"` : "unset"}, not "production".`,
    };
  }

  const databaseUrl = env.MIGRATE_DATABASE_URL?.trim();

  if (!databaseUrl) {
    return {
      action: "fail",
      reason:
        "MIGRATE_DATABASE_URL is not set. A production build must apply migrations before deploying. " +
        "Add it to this Vercel project's environment variables (non-sensitive, Production scope only) " +
        "with the same value as DATABASE_URL.",
    };
  }

  return { action: "run", databaseUrl };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm vitest run src/lib/deploy/migrate-decision.test.ts
```

Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/deploy/migrate-decision.ts src/lib/deploy/migrate-decision.test.ts
git commit -m "feat(deploy): decide whether a Vercel build applies migrations"
```

---

### Task 2: Build script and wiring

**Files:**
- Create: `scripts/vercel-migrate.ts`
- Modify: `package.json` (the `scripts` block)
- Modify: `AGENTS.md` (the Workflow bullet list)

**Interfaces:**
- Consumes: `decideMigration(env: NodeJS.ProcessEnv): MigrationDecision` from `src/lib/deploy/migrate-decision.ts` (Task 1).
- Produces: the `vercel-build` npm script. Nothing imports this task's output.

This task has no unit test — it is an untestable shell by design, which is why Task 1 holds the logic. It is verified by running it directly with different environments.

- [ ] **Step 1: Write the script**

Create `scripts/vercel-migrate.ts`:

```ts
import { spawnSync } from "node:child_process";
import { decideMigration } from "../src/lib/deploy/migrate-decision";

const decision = decideMigration(process.env);

if (decision.action === "skip") {
  console.log(decision.reason);
  process.exit(0);
}

if (decision.action === "fail") {
  console.error(decision.reason);
  process.exit(1);
}

console.log("Applying migrations before build...");

// drizzle.config.ts reads DATABASE_URL, which is marked sensitive in Vercel and so
// is unreadable here. Mapping it in the child env keeps the config file as the one
// source of truth for migration settings and leaves `pnpm db:migrate` unchanged.
const result = spawnSync("pnpm", ["exec", "drizzle-kit", "migrate"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: decision.databaseUrl },
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
```

Note on `scripts/seed-cards.ts`: it begins with `import "dotenv/config"`. This script deliberately does **not**, because it must read only the real deployment environment — a stray `.env` in a build container should not be able to redirect a production migration.

- [ ] **Step 2: Verify the script skips outside production**

```bash
pnpm tsx scripts/vercel-migrate.ts
echo "exit=$?"
```

Expected: prints `Skipping migrations: VERCEL_ENV is unset, not "production".` and `exit=0`. No database connection is attempted.

- [ ] **Step 3: Verify the script fails closed on a misconfigured production build**

```bash
VERCEL_ENV=production pnpm tsx scripts/vercel-migrate.ts
echo "exit=$?"
```

Expected: prints the `MIGRATE_DATABASE_URL is not set` message to stderr and `exit=1`.

- [ ] **Step 4: Add the `vercel-build` script**

In `package.json`, add to the `scripts` object immediately after the `"build"` line:

```json
"vercel-build": "tsx scripts/vercel-migrate.ts && next build",
```

Vercel prefers `vercel-build` over `build` when present. `build` stays a bare `next build`, so local builds and the CI stub build are unaffected. `tsx` and `drizzle-kit` are both devDependencies and Vercel installs devDependencies during the build by default.

- [ ] **Step 5: Verify the wired script still skips and then builds**

```bash
DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm vercel-build
```

Expected: the skip message, then a successful `next build`. This proves the chain works without touching a database.

- [ ] **Step 6: Document it in `AGENTS.md`**

Under `## Workflow`, add this bullet after the existing "Pre-push gate" bullet:

```markdown
- Database migrations apply automatically during each Vercel **production** build (`vercel-build` → `scripts/vercel-migrate.ts`). Every Vercel project therefore needs `MIGRATE_DATABASE_URL` set — non-sensitive, Production scope only, same value as that project's `DATABASE_URL` — or its production builds fail by design. Preview deployments skip migrations entirely.
```

- [ ] **Step 7: Commit**

```bash
git add scripts/vercel-migrate.ts package.json AGENTS.md
git commit -m "feat(deploy): apply migrations during the Vercel production build"
```

---

### Task 3: Schema-lag reads degrade to a cache miss

**Files:**
- Modify: `src/lib/recs/store.ts` (add helper; wrap `loadScores` at `:131-160` and `findScoredCommander` at `:169-193`)
- Test: `src/lib/recs/store.test.ts` (append)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `isSchemaLagError(err: unknown): boolean`, exported from `src/lib/recs/store.ts` for direct testing. The signatures of `loadScores` and `findScoredCommander` are unchanged — only their behaviour on a schema-lag error changes.

Background the implementer needs: `commander_scores` is a cache. Both callers already handle a miss correctly — `loadScores` returning no items sends `getRankedList` (`src/lib/recs/ranked-list.ts:29`) down its recompute branch, and `findScoredCommander` returning `null` reaches the fallback at `src/app/commanders/[slug]/page.tsx:22-30`, which resolves from the computed ranking and only 404s if the slug is genuinely absent. So the fix is purely to classify these two error codes as a miss.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/recs/store.test.ts`. Note the file already has the db stub at its top (`stub`, and `vi.mock("../../db", …)`); reuse it rather than adding a second mock.

Add `sql` to the drizzle-orm imports if not already imported, and add `loadScores`, `findScoredCommander`, `isSchemaLagError` to the existing `./store` import.

```ts
import { sql } from "drizzle-orm";
import { beforeEach } from "vitest";

const pgError = (code: string) => Object.assign(new Error(`pg error ${code}`), { code });

type SelectChain = {
  from: () => SelectChain;
  innerJoin: () => SelectChain;
  where: () => SelectChain;
  orderBy: () => Promise<never>;
};

function rejectingSelect(err: unknown): () => SelectChain {
  const chain: SelectChain = {
    from: () => chain,
    innerJoin: () => chain,
    where: () => chain,
    orderBy: () => Promise.reject(err),
  };
  return () => chain;
}

describe("isSchemaLagError", () => {
  it("matches undefined_table, the code from the #70 outage", () => {
    expect(isSchemaLagError(pgError("42P01"))).toBe(true);
  });

  it("matches undefined_column, the same class one deploy later", () => {
    expect(isSchemaLagError(pgError("42703"))).toBe(true);
  });

  it("rejects other postgres errors so real faults still surface", () => {
    expect(isSchemaLagError(pgError("57014"))).toBe(false);
  });

  it("rejects errors carrying no code", () => {
    expect(isSchemaLagError(new Error("connection terminated"))).toBe(false);
  });

  it("rejects non-errors", () => {
    expect(isSchemaLagError(null)).toBe(false);
    expect(isSchemaLagError("42P01")).toBe(false);
  });
});

describe("loadScores when the schema is behind the code", () => {
  beforeEach(() => {
    delete stub.db.select;
  });

  it("reads as an empty cache so the caller recomputes", async () => {
    stub.db.select = rejectingSelect(pgError("42P01"));
    await expect(loadScores("user_1")).resolves.toEqual({ items: [], degradedOracleIds: [] });
  });

  it("treats a missing column the same way", async () => {
    stub.db.select = rejectingSelect(pgError("42703"));
    await expect(loadScores("user_1")).resolves.toEqual({ items: [], degradedOracleIds: [] });
  });

  it("rethrows anything else rather than hiding it behind a recompute", async () => {
    stub.db.select = rejectingSelect(pgError("53300"));
    await expect(loadScores("user_1")).rejects.toThrow("pg error 53300");
  });
});

describe("findScoredCommander when the schema is behind the code", () => {
  // The ranked CTE columns are consumed by eq() and by the select builder, so they
  // are stubbed with real SQL fragments rather than bare objects.
  const col = sql`x`;
  const rankedStub = { oracleId: col, rank: col, anyDegraded: col, slug: col };

  function stubWith(err: unknown) {
    const limit = vi.fn(() => Promise.reject(err));
    stub.db.$with = () => ({ as: () => rankedStub });
    stub.db.select = () => ({ from: () => ({ where: () => ({}) }) });
    stub.db.with = () => ({
      select: () => ({ from: () => ({ where: () => ({ limit }) }) }),
    });
    return limit;
  }

  it("resolves to null so the page falls back to the computed ranking", async () => {
    const limit = stubWith(pgError("42P01"));
    await expect(findScoredCommander("user_1", "atraxa-praetors-voice")).resolves.toBeNull();
    // Proves the query chain actually executed rather than throwing early, which
    // would make the null above a false pass.
    expect(limit).toHaveBeenCalled();
  });

  it("rethrows anything else", async () => {
    stubWith(pgError("53300"));
    await expect(findScoredCommander("user_1", "atraxa-praetors-voice")).rejects.toThrow(
      "pg error 53300",
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
pnpm vitest run src/lib/recs/store.test.ts
```

Expected: FAIL — `isSchemaLagError is not exported`, and the `loadScores` cases reject with `pg error 42P01` instead of resolving.

- [ ] **Step 3: Add the helper**

In `src/lib/recs/store.ts`, add below the imports:

```ts
// Postgres codes meaning the schema is behind the code: 42P01 undefined_table,
// 42703 undefined_column. commander_scores is a cache and both readers already
// handle a miss, so treating these as a miss turns a late migration into a slow
// page instead of the site-wide 500 in #70. Deliberately narrow — a blanket catch
// would convert a real outage into a silent 196-commander recompute per request.
const SCHEMA_LAG_CODES = new Set(["42P01", "42703"]);

export function isSchemaLagError(err: unknown): boolean {
  if (typeof err !== "object" || err === null || !("code" in err)) return false;
  const { code } = err as { code: unknown };
  return typeof code === "string" && SCHEMA_LAG_CODES.has(code);
}
```

- [ ] **Step 4: Wrap `loadScores`**

In `src/lib/recs/store.ts`, change the body of `loadScores` so the query is inside a `try` and a schema-lag error returns the miss shape. The whole function becomes:

```ts
export async function loadScores(
  userId: string,
): Promise<{ items: CommanderListItem[]; degradedOracleIds: string[] }> {
  try {
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
      .orderBy(desc(commanderScores.score), commanderScores.oracleId);

    return {
      items: rows.map(rowToListItem),
      degradedOracleIds: rows.filter((r) => r.synergyState === "degraded").map((r) => r.oracleId),
    };
  } catch (err) {
    if (!isSchemaLagError(err)) throw err;
    return { items: [], degradedOracleIds: [] };
  }
}
```

- [ ] **Step 5: Wrap `findScoredCommander`**

In the same file, keep the existing doc comment above the function and replace the function body. The full result:

```ts
export async function findScoredCommander(
  userId: string,
  slug: string,
): Promise<{ oracleId: string; rank: number; anyDegraded: boolean } | null> {
  try {
    const ranked = db.$with("ranked").as(
      db
        .select({
          oracleId: commanderScores.oracleId,
          slug: commanderScores.slug,
          rank: sql<number>`(row_number() over (order by ${commanderScores.score} desc, ${commanderScores.oracleId}))::int`.as("rank"),
          // Same window pass, so the caller learns whether these ranks came from an
          // outage-era compute without paying a second round trip.
          anyDegraded: sql<boolean>`bool_or(${commanderScores.synergyState} = 'degraded') over ()`.as("any_degraded"),
        })
        .from(commanderScores)
        .where(eq(commanderScores.userId, userId)),
    );
    const [row] = await db
      .with(ranked)
      .select({ oracleId: ranked.oracleId, rank: ranked.rank, anyDegraded: ranked.anyDegraded })
      .from(ranked)
      .where(eq(ranked.slug, slug))
      .limit(1);
    return row ?? null;
  } catch (err) {
    if (!isSchemaLagError(err)) throw err;
    return null;
  }
}
```

Do **not** wrap `persistScores` or `deleteAllScores`. `persistScores` already has a best-effort `try`/`catch` at its caller (`src/lib/recs/ranked-list.ts:53-57`), and `deleteAllScores` backs the user-facing retry action (`src/app/commanders/actions.ts:15-22`) where swallowing a failure would make the Retry button report success while changing nothing.

- [ ] **Step 6: Run the tests to verify they pass**

```bash
pnpm vitest run src/lib/recs/store.test.ts
```

Expected: PASS, including the pre-existing tests in the file.

- [ ] **Step 7: Commit**

```bash
git add src/lib/recs/store.ts src/lib/recs/store.test.ts
git commit -m "fix(recs): read commander_scores as a cache miss when the schema lags"
```

---

### Task 4: Smoke-test migration

**Files:**
- Create: `drizzle/0005_migration_pipeline_smoke_test.sql` (generated)
- Modify: `drizzle/meta/_journal.json` and a new `drizzle/meta/0005_snapshot.json` (both generated)

**Interfaces:**
- Consumes: nothing. Produces nothing consumed by code.

This satisfies acceptance criterion 3 in #70 — a deliberate test migration proving the path end to end. Shipping it in this PR means the very first deploy of the feature also proves the feature.

- [ ] **Step 1: Generate an empty custom migration**

```bash
pnpm drizzle-kit generate --custom --name migration_pipeline_smoke_test
```

Expected: creates `drizzle/0005_migration_pipeline_smoke_test.sql` (empty) plus a matching `drizzle/meta/0005_snapshot.json`, and appends an entry to `drizzle/meta/_journal.json`.

`--custom` is required. A hand-written SQL file with no snapshot entry desynchronises the meta journal from the schema and corrupts the next real `pnpm db:generate`.

- [ ] **Step 2: Add the statement**

Replace the contents of `drizzle/0005_migration_pipeline_smoke_test.sql` with:

```sql
-- No-op. Proves migrations apply during the Vercel build (issue #70) by being
-- recorded in drizzle.__drizzle_migrations without touching any schema object.
SELECT 1;
```

- [ ] **Step 3: Verify the journal has six entries and the schema is unchanged**

```bash
node -e "const j=require('./drizzle/meta/_journal.json');console.log(j.entries.length, j.entries.at(-1).tag)"
```

Expected: `6 0005_migration_pipeline_smoke_test`.

```bash
pnpm drizzle-kit generate --name should_be_empty
```

Expected: `No schema changes, nothing to migrate.` — confirming the custom migration left the snapshot consistent. If this instead generates a migration, delete the generated files and investigate before continuing.

- [ ] **Step 4: Commit**

```bash
git add drizzle/0005_migration_pipeline_smoke_test.sql drizzle/meta/_journal.json drizzle/meta/0005_snapshot.json
git commit -m "chore(db): no-op migration proving the deploy-time migration path"
```

---

### Task 5: Full gate and pull request

**Files:** none modified.

- [ ] **Step 1: Run the full pre-push gate**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Expected: all pass.

- [ ] **Step 2: Run the stub-DB build**

```bash
DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build
```

Expected: successful build. (This runs `build`, not `vercel-build`, matching CI.)

- [ ] **Step 3: Rebase onto current main**

```bash
git fetch origin && git rebase origin/main
```

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin feat/deploy-migrations-70
```

Open the PR with `gh pr create`, titled `feat(deploy): run Drizzle migrations during the Vercel build`. The body must state that `MIGRATE_DATABASE_URL` has to exist in both Vercel projects (non-sensitive, Production scope only) before merge, or production builds will fail by design.

- [ ] **Step 5: Request Copilot review**

Follow the canonical policy in `~/.claude/CLAUDE.md`: POST to `/repos/HartiganHM/the-99/pulls/<n>/requested_reviewers` with `{"reviewers": ["copilot-pull-request-reviewer[bot]"]}` via `--input -`, then verify the response lists the bot. A bare `"Copilot"` returns 200 and attaches nothing.

- [ ] **Step 6: File the follow-up health-endpoint issue**

The spec puts `/api/health` out of scope but on the record as wanted. Open an issue titled `Add /api/health endpoint` covering: database connectivity, applied-migration count read from `drizzle.__drizzle_migrations`, Scryfall catalog freshness, and an authentication decision (the existing `CRON_SECRET` bearer pattern at `src/app/api/cron/scryfall-refresh/route.ts:14-20` is the closest precedent). Reference #70 as the origin.

---

## Post-merge verification

Not a code task — the pipeline can only be proven by a real deployment.

1. Open the staging project's deployment for the merge commit. The build log should show the migration step running and applying `0005_migration_pipeline_smoke_test`.
2. Confirm the same in the production project's build log.
3. Confirm `/commanders` still loads on both.

If a build fails with the `MIGRATE_DATABASE_URL is not set` message, the variable is missing or is scoped to the wrong environment in that project — this is the guard working, not a defect.
