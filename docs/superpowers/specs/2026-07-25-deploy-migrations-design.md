# Run Drizzle migrations during the Vercel build

**Issue:** #70 — `/commanders` returned `42P01 relation "commander_scores" does not exist` on staging and production for roughly two hours on 2026-07-25. #64 shipped code that queries `commander_scores` alongside migrations `0002`–`0004` that create it; the code deployed automatically and the migrations never ran.

**Goal:** Merging a PR that adds a migration applies that migration to staging and production without anyone remembering to do it, and a migration that is late anyway degrades the page instead of breaking it.

## Environments

Staging and production are separate Vercel projects, each bound to its own Neon database branch. Staging is a deployed test environment, not a promotion gate — production does not wait on it, and this design does not introduce sequencing between them.

## Decision: migrate in the build step

`drizzle-kit migrate` runs immediately before `next build`, in the same build, in each project. Ordering is correct by construction: the two are sequential commands in one process, so the build cannot finish before the migration does and the migration cannot be skipped.

Two alternatives were considered and rejected.

A **GitHub Action on push to `main`** races Vercel's auto-deploy — both fire on the same push, leaving a window where new code runs against the old schema. It narrows the outage window rather than closing it.

A **GitHub Action that owns the deploy trigger** (disable Vercel auto-deploy for `main`, migrate, then fire deploy hooks) closes the window and keeps credentials in write-only repo secrets. It was rejected because its main additional benefit is gating production on staging, which is not wanted, and it costs ownership of the deploy trigger — a broken workflow file would mean nothing ships.

### Credential handling

Both projects mark `DATABASE_URL` as **Sensitive** in Vercel. This section was written on the
premise that a build step cannot read a Sensitive variable, and that the build therefore needs a
separate one.

> **Measured 2026-09-21, and the premise does not hold today.** `MIGRATE_DATABASE_URL` is stored
> **Sensitive** on both projects and production builds read it: the 14:54Z and 20:46Z builds logged
> `Applying migrations before build… migrations applied successfully`, and `decideMigration` fails
> the build outright when the value is absent, so a build that migrated had the value in
> `process.env`. Whether Vercel changed this behaviour since July or the premise was wrong when
> written is not established here — only that a Sensitive, Production-scoped variable is readable
> by the build. The separate variable is kept regardless, for the scoping control below.

Each project gets `MIGRATE_DATABASE_URL` — same value as that project's `DATABASE_URL`, and
**scoped to the Production environment only**. It is stored Sensitive, like its siblings.

Production-only scoping is the security control that matters: it means a preview build cannot read the variable, so a pull request cannot add a build step that exfiltrates it.

Two exposure questions were checked rather than assumed:

- **Can it reach the client bundle?** No. Next.js 16.2.10 inlines environment variables into browser JavaScript only when prefixed `NEXT_PUBLIC_` (`node_modules/next/dist/docs/01-app/02-guides/environment-variables.md:156,198`: "Non-`NEXT_PUBLIC_` environment variables are only available in the Node.js environment"). Inlining is opt-in by prefix and `MIGRATE_DATABASE_URL` does not carry it.
- **Can it reach build logs?** Possibly, in a failure — a connection error may print host and database name. This was accepted on the reasoning that build logs are visible only to dashboard members, the same audience that can read the variable itself. Both projects now store it **Sensitive**, which Vercel redacts from logs and from the dashboard alike, so the exposure this line accepted is narrower than when it was written.

## Components

### 1. `package.json`

```json
"vercel-build": "tsx scripts/vercel-migrate.ts && next build"
```

Vercel runs `vercel-build` in preference to `build` when it exists. Local `pnpm build` and the CI stub build are unaffected, so CI keeps running `next build` with no database.

### 2. `scripts/vercel-migrate.ts`

TypeScript run through `tsx`, matching `scripts/seed-cards.ts` and the existing `db:seed` script. `tsx` is already a devDependency, so this adds no dependency and keeps the script type-checked by `pnpm typecheck` alongside the rest of the repo.

The decision logic lives in `src/lib/deploy/migrate-decision.ts` rather than in the script. Vitest's `include` is `src/**/*.test.{ts,tsx}`, so a test file placed beside the script under `scripts/` would be collected by nothing and silently never run. Keeping the branching in `src/` leaves the script a thin shell — read the decision, act on it — with the logic under test.

Behaviour, in order:

1. If `process.env.VERCEL_ENV !== "production"`, log that migrations were skipped and exit 0. Preview deployments report `preview` and take this branch. Each project's own top-level deployment reports `production` regardless of which project it is, so the single condition covers staging and production while each resolves its own database.
2. If `MIGRATE_DATABASE_URL` is unset or empty, print an explanatory error and exit 1.
3. Otherwise run `drizzle-kit migrate` as a child process with `DATABASE_URL` set to the value of `MIGRATE_DATABASE_URL`, inheriting stdio so migration output reaches the build log. Exit with the child's exit code.

`drizzle.config.ts` is not modified. It continues to read `DATABASE_URL`, which keeps one source of truth for migration configuration and keeps local `pnpm db:migrate` working unchanged.

`drizzle-kit` is a devDependency (`^0.31.10`). Vercel installs devDependencies during the build by default, so no dependency moves.

**Step 2 fails the build deliberately.** A missing variable in a production build is the exact condition that produced the outage — code deploying without its schema. Treating it as a silent skip would reproduce the incident quietly, so the absent-variable case is louder than the normal case rather than quieter.

### 3. Vercel dashboard, both projects

Add `MIGRATE_DATABASE_URL`, **Production scope and Production alone**, matching that project's `DATABASE_URL`. Manual one-time setup; it cannot be scripted from the repository. Sensitive is fine and is what ships — the build reads it either way — and the SCOPE is the half that breaks production: a Preview-scoped copy is inert, because previews skip migrations, so the build sees nothing and fails closed (2026-09-21, five hours of failed deploys).

### 4. `AGENTS.md`

A line under Workflow recording that migrations run automatically in the Vercel build, that the mechanism is `vercel-build` → `scripts/vercel-migrate.ts`, and that `MIGRATE_DATABASE_URL` must exist in a Vercel project for its deployments to succeed. Without this note the failure mode for a newly created environment is a confusing build error.

## Failure behaviour

A failing migration exits non-zero, which fails the build, which means Vercel never promotes the deployment and the previous one continues serving. Unmigrated code cannot reach users. The worst case degrades from "production returns 500" to "production runs the previous release."

## Schema-lag reads degrade to a cache miss

Automation makes a late migration unlikely but not impossible, and the failure in #70 was worse than it needed to be. `getRankedList` (`src/lib/recs/ranked-list.ts:29`) calls `loadScores` inside a `Promise.all` that runs before the empty-collection guard, so every `/commanders` request threw — including for users with no collection, who had no scores to read in the first place.

`commander_scores` is a cache. Both readers already handle a miss correctly:

- `loadScores` returning no items sends `getRankedList` down the recompute branch, which is the same work the page did before scores were persisted.
- `findScoredCommander` returning `null` reaches an existing fallback at `src/app/commanders/[slug]/page.tsx:22-30` that resolves the commander from the computed ranking and only 404s when the slug is genuinely absent.

The cache layer is sound; it simply does not classify "the table isn't there" as a miss. The fix is to make it do so.

A shared helper in `src/lib/recs/store.ts` inspects a caught error's Postgres `code` and re-throws unless it is:

- `42P01` `undefined_table` — the code from the #70 outage
- `42703` `undefined_column` — the same class one deploy later, when new code reads a column whose migration has not landed

Applied at the two read sites, `loadScores` returns `{ items: [], degradedOracleIds: [] }` and `findScoredCommander` returns `null`.

**Why not catch every error.** A blanket catch would convert a genuine database outage into a silent full recompute — 196 EDHREC-dependent scores — on every request, hiding the real fault behind expensive work. Matching the two schema-lag codes targets the incident precisely and lets every other failure surface.

Writes are deliberately excluded. `persistScores` already runs inside a best-effort `try`/`catch` at `ranked-list.ts:53-57`. `deleteAllScores` backs the user-facing retry action (`src/app/commanders/actions.ts:15-22`), which clears scores so the next render recomputes after an EDHREC outage; swallowing its failure would make the Retry button report success while changing nothing.

## Testing

**Unit tests** cover what can be tested without a deployment:

- `src/lib/deploy/migrate-decision.ts`: `decideMigration` returns `skip` when `VERCEL_ENV` is `preview`, `development`, or unset; returns `fail` when `VERCEL_ENV` is `production` and `MIGRATE_DATABASE_URL` is missing or blank; returns `run` carrying the trimmed url when both are present. The script itself stays untested — mapping the three outcomes onto `process.exit` and one `spawnSync` is thin enough that a test would restate the implementation.
- `store.ts`: `loadScores` returns the empty shape and `findScoredCommander` returns `null` when the query rejects with `code: "42P01"` or `"42703"`; both re-throw for any other error, including an error with no `code`.

**End-to-end proof** requires a real deployment, satisfying the third acceptance criterion in #70. Generate an empty migration with `pnpm drizzle-kit generate --custom --name migration_pipeline_smoke_test`, which writes both the SQL file and a matching meta snapshot. Put `SELECT 1;` in it — enough to be recorded in `drizzle.__drizzle_migrations` without touching any object. Merge, then confirm both projects' build logs show it applied.

The `--custom` flag is required rather than hand-writing the SQL file. A migration with no corresponding snapshot entry desynchronises `drizzle/meta/_journal.json` from the schema, corrupting the next real `pnpm db:generate`.

## Out of scope

A **`/api/health` endpoint** is worth having and gets its own issue. It needs decisions this change does not — database connectivity, applied-migration count, Scryfall catalog freshness, and an authentication model. Migration visibility here comes from the build log, which lists each applied migration per deployment and is readable in the dashboard.

**Expand-contract migration discipline** — writing migrations so new code tolerates the old schema for one deploy — remains a good practice and is what would have made #70 a non-event regardless of ordering. It is a convention rather than a mechanism, so this change does not attempt to enforce it. The `42703` handling above is the mechanical half.

## Acceptance

Mapped to #70's stated criteria:

1. *Merging a migration applies it to staging and prod without manual intervention* — `vercel-build` runs `drizzle-kit migrate` before every production build in both projects.
2. *Applied-migration count observable without a local shell* — each deployment's build log lists the migrations applied.
3. *A deliberate test migration proves the path end to end* — the `--custom` smoke-test migration above.
