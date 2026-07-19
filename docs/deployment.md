# Deployment — the-99.dev

Production stack: **Vercel** (Next.js hosting + cron) + **Neon** (serverless Postgres) + **Clerk** (auth) on the **the-99.dev** domain (registered via Cloudflare, 2026-07-18). Target cost: $0/month on free tiers.

## Architecture

- Vercel builds from `main` (`npm run build`); every route is dynamic (server-rendered on demand), so builds need no live database — `DATABASE_URL` only has to exist.
- Neon hosts the Postgres database; the app connects via `@neondatabase/serverless` using `DATABASE_URL`.
- Clerk handles auth; keys are environment-scoped (test vs. production instance).
- Vercel Cron (`vercel.json`) hits `GET /api/cron/scryfall-refresh` Mondays 09:00 UTC to refresh the card catalog, authorized by `Authorization: Bearer $CRON_SECRET`.

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Name | Source | Notes |
|---|---|---|
| `DATABASE_URL` | Neon dashboard → connection string | Use the pooled connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API keys | `pk_live_…` for production |
| `CLERK_SECRET_KEY` | Clerk dashboard → API keys | `sk_live_…` for production |
| `CRON_SECRET` | Generate: `openssl rand -hex 32` | Vercel automatically sends it on cron invocations when the var is set |

`.env.example` mirrors this list for local setup.

## First-time setup

1. **Neon:** create a project (or reuse the dev project with a `production` branch), run migrations against it: `DATABASE_URL=<prod url> npm run db:migrate`, then seed the card catalog: `DATABASE_URL=<prod url> npm run db:seed`.
2. **Clerk:** create a production instance for the-99.dev, note the `pk_live_`/`sk_live_` keys, and configure the domain per Clerk's DNS instructions.
3. **Vercel:** import the GitHub repo, framework preset Next.js, set the four env vars for Production (and Preview if desired — previews can share the dev Neon branch + Clerk test keys).
4. **Domain:** add `the-99.dev` in Vercel → Domains; create the CNAME/A records it prescribes in Cloudflare DNS (DNS-only/grey-cloud, per Vercel's guidance).
5. Verify the cron is registered under Vercel → Project → Cron Jobs after the first production deploy.

## Ongoing

- Deploys are automatic on merge to `main`; PRs get preview deploys.
- CI (`.github/workflows/ci.yml`) gates PRs with typecheck/lint/test/build; Vercel's build is the deploy gate.
- Database schema changes: commit Drizzle migrations (`npm run db:generate`), then run `db:migrate` against production manually — migrations are not run automatically at deploy time.
