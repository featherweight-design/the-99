<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# The 99 — repo conventions

MTG Commander companion: upload a collection CSV, get commander recommendations, build decks from what you own. Next.js 16 (App Router, server actions), React 19, Tailwind 4, Drizzle ORM on Neon Postgres, Clerk auth, Vitest.

## Commands

Package manager is **pnpm** (pinned via `packageManager` in package.json) — never npm or yarn; `pnpm-lock.yaml` is the only lockfile.

- `pnpm dev` / `pnpm build` — build needs `DATABASE_URL` to exist but runs no queries; a stub works: `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`
- `pnpm typecheck` · `pnpm lint` · `pnpm test`
- `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:seed` (Drizzle Kit; seed pulls the Scryfall catalog)

## Workflow

- All work happens in worktrees under `.worktrees/<branch>`; copy `.env` from the repo root into a new worktree before running the app. The main checkout stays clean on `main`.
- Pre-push gate, every push: `pnpm typecheck && pnpm lint && pnpm test` plus the stub-DB build, then `git fetch origin && git rebase origin/main`.
- Database migrations apply automatically during each Vercel **production** build (`vercel-build` → `scripts/vercel-migrate.ts`). Every Vercel project therefore needs `MIGRATE_DATABASE_URL` set — non-sensitive, Production scope only, same value as that project's `DATABASE_URL` — or its production builds fail by design. Preview deployments skip migrations entirely.
- `GET /api/health` (public, unauthenticated) reports migration state — 200 when the schema matches the build or is ahead of it, 503 when migrations are pending or the ledger is unreadable. Use it to confirm a deploy instead of loading a page that depends on the schema.
- `pnpm check:scryfall` validates Scryfall's bulk-data contract (index shape + first entry's required fields) without touching a database. The `Upstream contract checks` workflow runs it daily, because the catalog refresh is weekly and an upstream shape change would otherwise go unnoticed until it failed.
- `pnpm check:manapool` validates ManaPool's price-feed contract (payload shape, a real parse, and
  the `scryfall_id` duplication ratio) without touching a database, and runs daily in that same
  workflow. `/prices/singles` is a documented endpoint of the Mana Pool Public API, but those docs
  warn v1 "is subject to change without notice" and the ingest is weekly, so a silent shape change
  would otherwise sit unnoticed for days.
- `pnpm db:seed:prices` refreshes `printing_prices` from ManaPool. The `Price refresh` workflow runs
  it 09:00 UTC every Monday; it needs the `PRICE_REFRESH_ENABLED` repository variable set to `'true'`
  to fire on schedule. The feed omits out-of-stock cards rather than listing them at zero, so a
  printing absent from `printing_prices` has never been stocked in any run so far, and a row with
  a null `price_cents` but a set `price_cents_foil` is stocked in foil only — neither is "free" or
  "unknown". The ingest upserts and never deletes, so presence is not the same as being stocked
  now: a sold-out printing keeps its last row with a frozen `as_of`, and any reader needing "stocked
  now" compares that `as_of` to the newest one in the table.
- `pnpm db:build:index` rebuilds `commander_support` / `commander_support_cards` from EDHREC.
  The `Commander index` workflow runs it monthly on the 3rd — the catalog refreshes every
  Monday, so by the 3rd a set released in the previous week has already been ingested and
  the name index can resolve it. Needs the `COMMANDER_INDEX_ENABLED` repository variable
  set to `'true'` to fire on schedule.
- The catalog refresh (`.github/workflows/catalog-refresh.yml`) runs 09:00 UTC every Monday and refreshes **both** `catalog-staging` and `catalog-production`. A stale catalog is silent: collection CSV rows whose card is missing land in `unmatched` and are dropped, so a set that lands between refreshes simply appears not to exist.
- Stage files by name — never `git add -A` (`.env` and other untracked files must stay untracked).
- PR reviews follow the Copilot policy in the user-level `~/.claude/CLAUDE.md`. This repo merges via **squash**.

## Caching a list a reader flips between

When a control re-fetches the same list under different parameters — a sort order, an
availability mode — cache the payloads in the component that renders them, keyed on those
parameters, and serve a repeat ask from that cache instead of navigating.
`useDiscoveryCache` in `src/components/commanders/discovery-cache.ts` is the reference
implementation; `commanders-view.tsx` shows the other valid answer, shipping every ranking
in one payload when the set of parameters is small enough to precompute.

- **Never Next's `staleTimes`.** It is a global router setting whose blast radius is every
  route in the app, and this codebase has already shipped a bug that way. Component-held
  state caches the one thing being cached and nothing else.
- **A cache lives for one visit.** Leaving the route unmounts it, so a change made elsewhere
  needs no invalidation — there is nothing left to invalidate by the time the reader returns.
  Do not extend a cache's life past its component without an invalidation story.
- **A fresh server payload always wins** over a cached entry for the same key, and is filed
  on its way past. Adjust that during render, not in an effect, or the previous list paints
  once before being corrected.
- **A cache hit still writes the URL**, via `history.replaceState` rather than the router —
  routing is the request being avoided. Serialise defaults as absences, exactly as the
  navigating path does, and read every parameter you do not own back off the live URL rather
  than rebuilding it.

## Design pipeline

- UI work is gated on design handoffs in `design/design_handoff_the99_*` — no UI until the handoff exists and has a READINESS verdict. Backend/API/DB work may proceed without one.
- Every UI PR passes the design-review skill (property-table enumerate → verify → confirm) before `gh pr create`. Mobile + desktop parity ships in the same PR.
- Pipeline state lives in `docs/superpowers/design-pipeline-status.md`; plans in `docs/superpowers/plans/`; gap reports in `docs/superpowers/gap-report-*.md`.
