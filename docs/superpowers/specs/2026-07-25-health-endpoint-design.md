# `/api/health` — migration-state endpoint

**Issue:** #78, split out of #70.

## Problem

#70's outage was invisible until a user loaded `/commanders` and got a 500. PR #77 made migrations run during the Vercel production build and fail the build when they cannot, but a *running* deployment still cannot be asked whether its schema is current. The only way to find out is to exercise a page that depends on it.

## Endpoint

`GET /api/health`, unauthenticated.

```json
{
  "applied": 6,
  "expected": 6,
  "latestApplied": "0005_migration_pipeline_smoke_test",
  "pending": [],
  "status": "ok",
  "checkedAt": "2026-07-25T21:03:49.986Z"
}
```

| `status` | Meaning | HTTP |
|---|---|---|
| `ok` | Every shipped migration is applied | 200 |
| `ahead` | Database has more migrations than this build ships | 200 |
| `behind` | Migrations shipped but not applied — the #70 condition | 503 |
| `error` | The migration ledger could not be read | 503 |

`behind` returns 503 so an uptime check treats it as an outage. `ahead` returns 200: under expand-contract the schema leads the code by design, and during any rollout the old and new deployments briefly disagree.

## How the comparison works

`expected` comes from `drizzle/meta/_journal.json`, imported so the tag list is bundled into the serverless function — `drizzle/` is not present in the deployed filesystem. `applied` is `count(*)` from `drizzle.__drizzle_migrations`.

**Counts, not hashes.** The migrations table stores a hash of each SQL file but not its tag; the journal stores tags but no hashes. Joining them would require re-hashing the `.sql` files at runtime, and those files are not in the bundle. Drizzle applies migrations in journal order and never backfills a gap, so position is a sound stand-in for identity. `latestApplied` and `pending` are derived by indexing the tag list.

**`created_at` is deliberately not reported.** That column is copied from the journal's `when` — the time the migration was *generated*, not applied. It is byte-identical across every database holding that migration, so exposing it as an applied-at time would be actively misleading. Verified: `0005`'s journal `when` (1785011120038) matches its `created_at` on the production, staging, and local-dev branches, including on a branch where it was applied hours later. `latestApplied` already identifies the migration, and `checkedAt` gives response freshness.

## Security

The route is added to the public matcher in `src/proxy.ts`, which otherwise Clerk-protects everything but `/` and `/api/cron`.

The payload is migration counts and tag names only. Tag names are repository contents and already public in git. The database error is caught and **not** echoed: a connection failure message can carry the host, database name, and in some drivers credentials, and this endpoint is unauthenticated. A test asserts the payload cannot grow a details field carrying them.

## Components

| File | Responsibility |
|---|---|
| `src/lib/health/migration-status.ts` | `compareMigrations` — pure count-to-tags comparison |
| `src/lib/health/migration-journal.ts` | Bundles the shipped tag list from `_journal.json` |
| `src/lib/health/check.ts` | Queries the ledger, catches failure, returns the report |
| `src/app/api/health/route.ts` | Maps the report to a status code |
| `src/proxy.ts` | Adds `/api/health` to the public matcher |

`runtime = "nodejs"` because the neon-serverless websocket driver does not run on Edge. `dynamic = "force-dynamic"` because a cached health check reports the state of a past deployment, which is worse than no health check.

## Testing

Unit tests cover the comparison (ok / behind / ahead / fresh database / no migrations, plus the off-the-end index when the schema is ahead), the check's error handling including the no-leak assertion, and the route's four status-code mappings.

Verified live against the local-dev Neon branch, which was genuinely one migration behind: the endpoint returned `behind` with `pending: ["0005_migration_pipeline_smoke_test"]` and HTTP 503, then `ok` with HTTP 200 after `pnpm db:migrate`.

## Out of scope

Reporting anything beyond migration state — connection pool health, EDHREC reachability, Clerk status. Each has a different failure signature and a different remedy; bundling them behind one status code would make the endpoint ambiguous.
