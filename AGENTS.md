<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# The 99 — repo conventions

MTG Commander companion: upload a collection CSV, get commander recommendations, build decks from what you own. Next.js 16 (App Router, server actions), React 19, Tailwind 4, Drizzle ORM on Neon Postgres, Clerk auth, Vitest.

## Commands

Package manager is **pnpm** (pinned via `packageManager` in package.json) — never npm or yarn; `pnpm-lock.yaml` is the only lockfile.

- `pnpm dev` / `pnpm build` — build needs `DATABASE_URL` to exist but runs no queries; a stub works: `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`
- `pnpm typecheck` · `pnpm lint` · `pnpm test`
- `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:seed` (Drizzle Kit; seed pulls the Scryfall catalog)

Rules only. A rule with a background doc names it; that doc holds its history, measurements and every feature- or pipeline-specific rule, so read it before touching that area (index at the end).

## Workflow

- **Read the part of a file you need, not the whole file.** Over a few hundred lines, use `sed -n`, `grep -n`, `rg` or `offset`/`limit`; delegate whole-file reads and broad searches to a subagent. This overrides the preference for dedicated file tools, for large files only. `docs/agents/workflow.md`.
- **Measure on `staging`, mutate on `local-dev` or a scratch branch.** Frequencies read off `local-dev` are fixture artefacts; read-only measurement against staging is free and needs no permission. A probe that WRITES never points at staging. `docs/agents/workflow.md`.
- All work happens in worktrees under `.worktrees/<branch>`; copy `.env` from the repo root into a new worktree before running the app. The main checkout stays clean on `main`.
- Pre-push gate, every push: `pnpm typecheck && pnpm lint`, then `git fetch origin && git rebase origin/main`. **No tests run locally**, not the full suite, not a targeted file and not the stub-DB build: CI runs them under its test selection and a PR merges only on green CI (Hugh, 2026-10-29). `docs/agents/ci.md`.
- **`MIGRATE_DATABASE_URL`**: migrations apply during each Vercel production build, so every Vercel project needs it set — **Production scope, and Production alone**, marked **Sensitive** — with the same value as its `DATABASE_URL`, or production builds fail by design. Never re-scope it: moved to Preview on 2026-09-21, it broke every production deploy for five hours. `docs/agents/ops.md`.
- **Vercel skips builds that cannot change the site**: a diff touching only `docs/`, `design/`, `.github/`, `.claude/` or a root `*.md` is skipped; anything else builds (`docs/superpowers/eval` and `scripts/` are NOT skippable). `docs/agents/ops.md`.
- **Staging deploys once a day** (`Staging sync`, 07:41 UTC, fast-forwards `staging` to main); production builds every main push. To see a change on staging now, dispatch Staging sync. `docs/agents/ops.md`.
- `GET /api/health` (public, unauthenticated) reports migration state — 200 when the schema matches the build or is ahead of it, 503 when migrations are pending or the ledger is unreadable. Use it to confirm a deploy instead of loading a page that depends on the schema.
- Stage files by name — never `git add -A` (`.env` and other untracked files must stay untracked).
- **You are authorized to dispatch the `pr-review` §10b pre-open review subagent without asking.** Immediately before `gh pr create`, dispatch a `general-purpose` agent (never a fork) with `~/.claude/fwd/skills/pr-review/precheck-prompt.md`, then `node ~/.claude/fwd/skills/pr-review/precheck.mjs record <findings-file>` (one finding per line). Verify every finding before acting on it; it never gates the PR. The grant is permanent (Hugh, 2026-09-16); do not propose retiring it on the hit-rate percentage alone. `docs/agents/precheck.md`.
- PR reviews follow the `pr-review` skill (`~/.claude/fwd/skills/pr-review/SKILL.md`), which is the single source of truth across every repo — invoke it rather than working from memory or from any copy. UI features additionally run `feature-acceptance` per PR and again at feature close. This repo merges via **squash**.

## Probes

Every `pnpm probe:*` script, its fixture discipline and what it proves lives in [docs/probes.md](docs/probes.md). Safety rules for every one of them:

- Probes never touch production.
- `probe:arrivals` deletes the given user's whole collection via `replaceCollection`; mutate on `local-dev` or a scratch branch, never anywhere else, and measure comparisons on staging.
- A probe that DELETES or RESEEDS the headless (or busiest) account's whole collection, history, uploads or decks calls `assertScratchBranch` (`scripts/lib/scratch-branch.mjs`) before its first write. It refuses production, staging AND `local-dev` by `neon.branch_id`: local-dev holds the headless account's real snapshot, which other lanes' probes read, and a probe whose guard refused only production and staging wiped its collection's printings on 2026-10-15. Run it on a scratch branch made from local-dev (how: docs/probes.md safety rules). A probe that writes only rows of its own per-run user id, or deletes only its own marker rows, may still run on local-dev.
- Never `pkill` or `killall` by pattern. Stop a dev server only by the exact PID you started, checked first with `ps -o pid=,comm= -p <pid>`.

## Rules for all code

- **A correlated subquery in a single-table select must alias and qualify.** Drizzle drops table qualification in the projection of a single-table select, so `${deckGames.deckId} = ${decks.id}` renders as `"deck_id" = "id"`: always false, count 0, no error. Write:
  ```ts
  sql<number>`(select count(*) from ${deckGames} dg where dg.deck_id = ${decks}.id)::int`
  ```
  Pin it with a `.toSQL()` test asserting the qualified form. `docs/agents/code-rules.md`.
- **Any free text a player types that reaches a model prompt goes through `playerText`** (`src/lib/model/player-text.ts`), and its system prompt carries `PLAYER_TEXT_SYSTEM_RULE`. A field that reaches a prompt without it is a defect. `docs/agents/code-rules.md`.
- **No model prompt carries who the player is**: `scripts/lib/prompt-identity.test.mts` fails on an identity field or import, and a new prompt path registers in its `CALLERS`. `docs/agents/guards.md`.
- **Writing the address bar without navigating goes through `mirrorUrl`** (`src/lib/url/mirror.ts`), never `history.replaceState` directly: Next adopts the URL and drops a pending navigation. `docs/agents/code-rules.md`.
- **Caching a list a reader flips between**: cache the payloads in the component, keyed on the parameters (`useDiscoveryCache`), and write the URL via `mirrorUrl`. **Never Next's `staleTimes`.** `docs/agents/code-rules.md`.
- **Feature switches resolve per reader**: every page, layout, action and route handler decides a switch from `requestSwitchEnv(userId)`; a variable set to `off` is the kill switch no override raises. `pnpm check:switch-reads` fails code under `src/` that hands `process.env` on. `docs/agents/switches.md`.
- **Every cross-user read lives in `src/lib/social/`** and joins the grant on the viewer in the same statement; client payloads carry `public_id`, never a Clerk id (`pnpm check:social-reads`). `docs/agents/social.md`.
- **Another reader's name is a `ThirdPartyName`**, minted by `named()` only in `src/lib/social/` and drawn only by `PersonName`, `PersonText` or `personAttrs` (`src/lib/person-name/`), which mark it `ph-no-capture` for PostHog; never reveal or stringify it elsewhere (`pnpm check:third-party-names`). `docs/agents/social.md`.
- **Stripe**: the account is SHARED with Concert Crawl, so every Session this app creates MUST carry `metadata.app = "the-99"`; `stripe` imports stay in `src/lib/payments/` (`pnpm check:payments-reads`). `docs/agents/payments.md`.
- **"Paid" is `PAID_SOURCES` (plan, pack) everywhere**, never "not welcome"; **"out of credits" is decided only in `allowance-rule.ts`** (`credit-gates.test.ts` fails on any other `used`/`limit` comparison). `docs/agents/payments.md`.
- **`pnpm.overrides`**: an override can force a version its parent never tested, so exercise it (`brace-expansion@5` broke ESLint). `docs/agents/ci.md`.
- **Design pipeline**: no UI until its `design/design_handoff_the99_*` handoff exists and has a READINESS verdict (backend/API/DB work may proceed). Every UI PR passes the design-review skill before `gh pr create`; mobile + desktop parity ships in the same PR. An About label only at Hugh's discretion. `design/` is reference material, never shipped code: never import from it or copy its assets into `public/`. `docs/agents/design-pipeline.md`.

## Where the rest lives (`docs/agents/`)

- `account-purge.md` — account deletion: Clerk webhook, `purgeAccount`, the sweep cron.
- `bracket.md` — bracket classifiers, `measure:tutors`, Help me choose's bracket reach.
- `card-row.md` — the one-line card row.
- `catalog-copy.md` — build once on staging, copy to production: the copy harness, ledger, ingest lock, catalog fetch/sources, the daily refresh.
- `catalog-ingest-quirks.md` — `job=printings`, reversible cards, mana symbols and sprite.
- `catalog-prices-precons.md` — prices, precons, precon Overviews and their carry-over, `catalog_first_seen`.
- `ci.md` — CI test selection, upstream contract checks, `pnpm.overrides`.
- `code-rules.md` — the full Drizzle subquery, `playerText`, `mirrorUrl` and list-cache rules.
- `collection-features.md` — Collection Sync, deck-owned import, card scanning (scan-index), wishlist.
- `combos-staples.md` — Spellbook ingest, near combos, `Combo refresh`, staples.
- `commander-index.md` — the EDHREC index, prose and its caps, labels, `db:index-due`.
- `commanders-place.md` — the Commanders place and its paths.
- `contact-sheet.md` — contact sheets, `check:shared`, `surface.mjs`.
- `design-pipeline.md` — handoffs, READINESS, About labels, `design/`.
- `guards.md` — the cross-cutting `check:*` guards (copy drift, tokens, border collision, collection routes, db-pool, list cache, public reads), prompt identity, the Fan Content notice, public loaders. A feature's own guard lives in its feature doc (`check:switch-reads` in switches.md, `check:social-reads` in social.md, `check:payments-reads` in payments.md, `check:shared` in contact-sheet.md, the upstream contract checks in ci.md and catalog-prices-precons.md).
- `list-cache.md` — the Home and `/decks` cache, its runbook ORDER, `list-stamp:triggers`.
- `list-payloads.md` — `/discover` and `/collection` first-window payloads.
- `measure.md` — `measure:load`, the reverted Tuning tools split, the gap-line measure.
- `moments.md` — moments.
- `ops.md` — migrations and `MIGRATE_DATABASE_URL`, Vercel skips, staging sync, cost check, nav-stall, security headers, Costs page, Sentry, PostHog.
- `payments.md` — credits ledger, Stripe webhook, refunds, the plan.
- `precheck.md` — the §10b pre-open review grant.
- `pull-staging.md` — `pull:staging`.
- `push.md` — push notifications.
- `service-worker.md` — `public/sw.js`.
- `social.md` — friends, invites, spare requests, signature card, friend decks, game opponents.
- `strategy.md` — strategy focus.
- `switches.md` — feature switch resolution.
- `tokens.md` — the token catalog, prices, ownership, deck tokens.
- `workflow.md` — reading files, measuring on staging.
