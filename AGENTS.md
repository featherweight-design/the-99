<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

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
- `pnpm db:build:prose` writes one generated sentence per commander into `commander_support.prose`
  — sentence 1 of "Why this commander", and identical for every player, which is why no collection
  change invalidates it. Needs `ANTHROPIC_API_KEY`. The `Commander prose` workflow chains off a
  **scheduled** `Commander index` run rather than carrying its own cron, because the prompt and the
  input hash are built from the tags that job writes; dispatch it directly to target staging. A row
  whose stored `prose_input_hash` still matches its inputs is skipped, so a re-run costs nothing for
  a commander whose tags have not moved, and an interrupted run resumes by being dispatched again.
  A commander whose every attempt fails the accept contract keeps its null and renders with no
  paragraph — the state the design draws, and never a truncated sentence nobody wrote.
- `pnpm db:copy:prose` installs sentences one database has already generated onto another,
  reading `PROSE_COPY_SOURCE_URL` and `PROSE_COPY_TARGET_URL` from the environment and taking
  `--dry-run`. A sentence costs a model call to produce and nothing to move, so a database that
  has never been generated against takes them from one that has and pays only for the rows the
  two disagree about. A row is installed only when the hash the source stored equals the hash
  the *target's* own inputs produce, so a sentence describing themes the target no longer
  records is never written; those rows keep their null and are picked up by the next
  `db:build:prose` against that target, which is the run to do afterwards. A suppressed
  commander is skipped before any of that, exactly as the generator skips it: a source
  generated before an id joined the list still holds that sentence, so the copy is the one
  path that could put a pulled sentence back.
- The catalog refresh (`.github/workflows/catalog-refresh.yml`) runs 09:00 UTC every Monday and refreshes **both** `catalog-staging` and `catalog-production`. A stale catalog is silent: collection CSV rows whose card is missing land in `unmatched` and are dropped, so a set that lands between refreshes simply appears not to exist.
- `pnpm probe:claims` proves the deck claim model against a real Postgres by calling the real
  `loadAvailability` — a committed version holds its cards against every other deck's draft, an
  uncommitted removal still claims, and per-card `since` decides between two committed decks. The
  claim model is raw SQL no unit test in this repository can reach, so this script is the only
  proof it behaves. It writes a fixture under a per-run `user_id` and deletes it in a `finally`;
  point it at `local-dev` or a scratch Neon branch, **never production**. On a deck's own page
  `free` is a surplus, not a count of copies: 0 means "holds what it needs and no spare", and a
  negative figure is the number of copies that deck has to buy.
- `pnpm probe:folders` proves deck folders against a real Postgres by calling the real
  queries — a deck files and unfiles, a cross-user move is refused from either side, and
  deleting a folder unfiles its decks without deleting any of them. That last rule is the
  foreign key's `on delete set null`, which no unit test in this repository can reach. It
  writes a fixture under a per-run `user_id` and deletes it in a `finally`; point it at
  `local-dev` or a scratch Neon branch, **never production**.
- `pnpm probe:stats` proves the deck-stats loader against a real Postgres by calling the
  real `loadDeckStats` — a deck the player does not own is refused, both commanders are
  folded into the curve and the spread despite not being `deck_cards` rows, a grouped game
  tally comes back as a record, and each deck's cost is its own. The pure half is unit
  tested; only a database can answer whether the loader assembles the right rows. Same
  fixture discipline as `probe:claims`: a per-run `user_id` deleted in a `finally`, pointed
  at `local-dev` or a scratch branch, **never production**.
- `pnpm probe:writer-version` proves the `commander_scores` writer stamp against a real Postgres:
  a writer that announces `app.writer_version` keeps it, one that says nothing has every row it
  touches marked stale, and the announcement does not outlive its transaction. That last one is
  the point — the column exists so a reader can tell a set written before built commanders were
  scored (rows deleted out of it, otherwise indistinguishable from a whole one) from a current
  one, and an older deployment's UPDATE would otherwise leave its truncated set marked current.
  A trigger is unreachable from any unit test, so this script is the only proof it behaves. Same
  rules as `probe:claims`: per-run `user_id`, deleted in a `finally`, **never production**.
- `pnpm probe:draft` proves the draft readers against a real Postgres by calling the real
  `loadDraftState` and `loadDraftRows` — a brew has no version rather than an empty change
  list, a draft identical to its version is clean, a basics-only edit names no card and still
  counts as a change, `names` covers the changed cards only, an unowned add with a live
  price is quoted and one that has never been stocked is counted out of the coverage, and
  a row's `quantity` is the delta rather than the copy count.
  Those figures come out of a snapshot transaction, a diff, a claim read, a price join and a
  collection lookup, which no unit test here can assemble. Only the diff is transaction-bound:
  the claim, price and collection reads run after that transaction closes, deliberately, because
  a claim is point-in-time whatever boundary is drawn around it — another deck can commit between
  the read and the reader's click — and what makes a pull safe is the server action re-reading
  every claim in its own transaction and refusing with a named reason. The draft's figures may
  therefore mix times, which is the contract, not a gap in it. Same fixture discipline as
  `probe:claims`: a per-run `user_id` deleted in a `finally`, pointed at `local-dev` or a
  scratch branch, **never production**.
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
- `design/` is **reference material, never shipped code**. It sits outside both `public/` and `src/`, so no route serves it and no module imports it. Each handoff's `support.js` is a generated runtime that evaluates code dynamically and loads React from a CDN — it is read by opening that bundle's `.dc.html` from disk, and by nothing else. Never import from `design/`, and never copy a handoff asset into `public/`.
