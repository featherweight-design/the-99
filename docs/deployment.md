# Deployment — the-99.dev

Production stack: **Vercel** (Next.js hosting) + **Neon** (serverless Postgres) + **Clerk** (auth) + **GitHub Actions** (catalog ingest) on the **the-99.dev** domain (registered via Cloudflare, 2026-07-18). Target cost: $0/month on free tiers.

## Architecture

- Vercel builds from `main` (`pnpm build` — Vercel detects pnpm from `pnpm-lock.yaml` and the `packageManager` field); every route is dynamic (server-rendered on demand), so builds need no live database — `DATABASE_URL` only has to exist.
- Neon hosts the Postgres database; the app connects via `@neondatabase/serverless` using `DATABASE_URL`.
- Clerk handles auth; keys are environment-scoped (test vs. production instance).
- The card catalog is refreshed by **GitHub Actions**, not by Vercel — `.github/workflows/catalog-refresh.yml` runs 09:00 UTC every Monday, on every published release, and on manual dispatch. It replaced a Vercel cron: the Scryfall bulk files (201MB oracle, 620MB printings) have outgrown a serverless function's 300s ceiling, and a runner gives the ingest hours.

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Name | Source | Notes |
|---|---|---|
| `DATABASE_URL` | Neon dashboard → connection string | Use the pooled connection string |
| `MIGRATE_DATABASE_URL` | Same value as this project's `DATABASE_URL` | **Production scope, and Production alone.** The build applies migrations and refuses to build without it. A copy scoped to Preview is inert — previews skip migrations — and the build then reports it missing while the dashboard lists it, which cost five hours on 2026-09-21. Sensitive is fine; the build reads it either way |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API keys | `pk_live_…` for production |
| `CLERK_SECRET_KEY` | Clerk dashboard → API keys | `sk_live_…` for production |
| `ANTHROPIC_API_KEY` | Anthropic Console → API keys | Read by the one model client (`src/lib/model/client.ts`) for deck tuning and the deck synopsis. Sensitive, **Production and Preview** — unlike `MIGRATE_DATABASE_URL`, a preview serves the builder and would otherwise record every run as a failure. Without it the client makes no request, returns `upstream_busy` and logs `[model] configuration`; the feature calling it records that as a failed run, and a failed run's allowance unit is refunded by that feature's outcome write (deck tuning's server PR). The `Commander prose` workflow reads its own copy as a repository secret |
| `MODEL_OWNER_USER_ID` | Clerk dashboard → Users → the owner's user id (`user_…`) | Read in one place, `dailyLimitFor` in `src/lib/model/allowance.ts`. That account gets 10 model runs (tuning and the synopsis together) per rolling 24 hours, and is refused once its own month-to-date spend would pass its $5 testing share; every other account gets 3 and no share. **Unset or empty, no account is the owner and everyone gets 3** — the limit fails closed. Not sensitive. The app-wide $20-a-month hard stop (`src/lib/model/spend-rule.ts`) applies to everyone either way |
| `NOTICES_ENABLED` | `'true'` or unset | Read in one place, `noticesEnabled` in `src/lib/notices/flag.ts`. `'true'` shows deck notices: the tile's notice, the header's tag, the Notices sheet, the check before the overview, a press's recompute when the data under a reading moved (H1), and the overview's data check (D11). Anything else hides all of them. **Set on the-99-staging only** until the feature is walked (the 2026-09-24 release ruling), then on production. Server-side, so a change needs a redeploy. The change log is written by the ingests whether or not it is set. Not sensitive |
| `SWAP_TOOLS_ENABLED` | `'true'` or unset | Read in one place, `swapToolsEnabled` in `src/lib/swaps/flag.ts`. `'true'` draws the swap tools: the Shopping limit and its marks, the stand-ins sheet, Take and Undo swap, and Fits your decks. **Any other value, or unset, draws none of them.** Per Hugh's release ruling (2026-09-24) it is `'true'` on staging and unset on production until he walks the feature. Not sensitive. Vercel binds variables to a deployment, so a change needs a redeploy |
| `NEVER_CUT_ENABLED` | `'true'` or unset | Read in one place, `neverCutEnabled` in `src/lib/decks/never-cut-flag.ts`. `'true'` runs Locked (never cut): the lock mark, the mode, `setCardLocked`, and every filter that reads a lock. **Any other value, or unset, runs none of them, filters included**, so a lock row written on staging changes nothing in production. Per Hugh's release ruling (2026-09-24) it is `'true'` on staging and unset on production until he walks the feature. Not sensitive. Vercel binds variables to a deployment, so a change needs a redeploy |

`.env.example` mirrors this list for local setup.

## Catalog refresh (GitHub → Settings)

| Name | Kind | Scope | Notes |
|---|---|---|---|
| `CATALOG_DATABASE_URL` | Environment secret | `catalog-staging`, `catalog-production` | The Neon connection string for that branch. Same precedent as `MIGRATE_DATABASE_URL`: a separate, explicitly-scoped string rather than reusing the app's |
| `CATALOG_REFRESH_ENABLED` | Repository variable | — | Must be `'true'` or the scheduled and release-triggered runs are skipped. Manual dispatch bypasses it |

The environments are named `catalog-staging` / `catalog-production`, not `staging` / `production`: GitHub environment names are case-insensitively unique and Vercel's integration already owns `Production`. Schedule and release triggers carry no inputs and so fan out over **both** environments, one job each; only a manual dispatch refreshes a single environment. Both jobs must stay green — a failure in either leaves that catalog stale, which surfaces later as collection rows that silently fail to match.

Manual runs: **Actions → Catalog refresh → Run workflow**, choosing `target` (staging/production) and `job` (`all`, `sets`, `printings`, `oracle`). Each run writes its row counts to the job summary.

## First-time setup

1. **Neon:** create a project (or reuse the dev project with a `production` branch), run migrations against it: `DATABASE_URL=<prod url> pnpm db:migrate`, then seed the catalog: `export DATABASE_URL=<prod url>` and run `pnpm db:seed && pnpm db:seed:sets && pnpm db:seed:printings` (oracle cards before printings — the printings FK filters against them).
2. **Clerk:** create a production instance for the-99.dev, note the `pk_live_`/`sk_live_` keys, and configure the domain per Clerk's DNS instructions.
3. **Vercel:** import the GitHub repo, framework preset Next.js, set the three env vars for Production (and Preview if desired — previews can share the dev Neon branch + Clerk test keys).
4. **Domain:** add `the-99.dev` in Vercel → Domains; create the CNAME/A records it prescribes in Cloudflare DNS (DNS-only/grey-cloud, per Vercel's guidance).
5. **Catalog refresh:** create the `catalog-staging` and `catalog-production` GitHub environments with their `CATALOG_DATABASE_URL` secrets, set `CATALOG_REFRESH_ENABLED=true`, then dispatch the workflow once against staging to confirm it runs end to end.

## Ongoing

- Deploys are automatic on merge to `main`; PRs get preview deploys.
- CI gates PRs with typecheck/lint/test/build (`.github/workflows/ci.yml`); Vercel's build is the deploy gate.
- Database schema changes: commit Drizzle migrations (`pnpm db:generate`) and merge. **Every Vercel production build applies them** before `next build` (`vercel-build` → `scripts/vercel-migrate.ts`, since #77); there is no manual `db:migrate` step against production, and a build whose migration fails does not deploy. Preview deploys skip migrations entirely. `GET /api/health` reports the applied-versus-expected count if you want to confirm a deploy without loading a page.
