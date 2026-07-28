# Deployment — the-99.dev

Production stack: **Vercel** (Next.js hosting) + **Neon** (serverless Postgres) + **Clerk** (auth) + **GitHub Actions** (catalog ingest) on the **the-99.dev** domain (registered via Cloudflare, 2026-07-18). Target cost: $0/month on free tiers.

## Architecture

- Vercel builds from `main` (`pnpm build` — Vercel detects pnpm from `pnpm-lock.yaml` and the `packageManager` field); every route is dynamic (server-rendered on demand), so builds need no live database — `DATABASE_URL` only has to exist.
- Neon hosts the Postgres database; the app connects via `@neondatabase/serverless` using `DATABASE_URL`.
- Clerk handles auth; keys are environment-scoped (test vs. production instance).
- The card catalog is refreshed by **GitHub Actions**, not by Vercel — `.github/workflows/catalog-refresh.yml` runs 09:00 UTC on the 1st of each month, on every published release, and on manual dispatch. It replaced a Vercel cron: the Scryfall bulk files (201MB oracle, 620MB printings) have outgrown a serverless function's 300s ceiling, and a runner gives the ingest hours.

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Name | Source | Notes |
|---|---|---|
| `DATABASE_URL` | Neon dashboard → connection string | Use the pooled connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API keys | `pk_live_…` for production |
| `CLERK_SECRET_KEY` | Clerk dashboard → API keys | `sk_live_…` for production |

`.env.example` mirrors this list for local setup.

## Catalog refresh (GitHub → Settings)

| Name | Kind | Scope | Notes |
|---|---|---|---|
| `CATALOG_DATABASE_URL` | Environment secret | `catalog-staging`, `catalog-production` | The Neon connection string for that branch. Same precedent as `MIGRATE_DATABASE_URL`: a separate, explicitly-scoped string rather than reusing the app's |
| `CATALOG_REFRESH_ENABLED` | Repository variable | — | Must be `'true'` or the scheduled and release-triggered runs are skipped. Manual dispatch bypasses it |

The environments are named `catalog-staging` / `catalog-production`, not `staging` / `production`: GitHub environment names are case-insensitively unique and Vercel's integration already owns `Production`. Schedule and release triggers carry no inputs and so target production, matching the cron they replaced.

Manual runs: **Actions → Catalog refresh → Run workflow**, choosing `target` (staging/production) and `job` (`all`, `sets`, `printings`, `oracle`). Each run writes its row counts to the job summary.

## First-time setup

1. **Neon:** create a project (or reuse the dev project with a `production` branch), run migrations against it: `DATABASE_URL=<prod url> pnpm db:migrate`, then seed the catalog: `DATABASE_URL=<prod url> pnpm db:seed && pnpm db:seed:sets && pnpm db:seed:printings` (oracle cards before printings — the printings FK filters against them).
2. **Clerk:** create a production instance for the-99.dev, note the `pk_live_`/`sk_live_` keys, and configure the domain per Clerk's DNS instructions.
3. **Vercel:** import the GitHub repo, framework preset Next.js, set the three env vars for Production (and Preview if desired — previews can share the dev Neon branch + Clerk test keys).
4. **Domain:** add `the-99.dev` in Vercel → Domains; create the CNAME/A records it prescribes in Cloudflare DNS (DNS-only/grey-cloud, per Vercel's guidance).
5. **Catalog refresh:** create the `catalog-staging` and `catalog-production` GitHub environments with their `CATALOG_DATABASE_URL` secrets, set `CATALOG_REFRESH_ENABLED=true`, then dispatch the workflow once against staging to confirm it runs end to end.

## Ongoing

- Deploys are automatic on merge to `main`; PRs get preview deploys.
- CI gates PRs with typecheck/lint/test/build (`.github/workflows/ci.yml`); Vercel's build is the deploy gate.
- Database schema changes: commit Drizzle migrations (`pnpm db:generate`), then run `db:migrate` against production manually — migrations are not run automatically at deploy time.
