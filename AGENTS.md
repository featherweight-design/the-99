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

- **Read the part of a file you need, not the whole file.** Over a few hundred lines, use `sed -n`, `grep -n`, `rg` or `offset`/`limit`, and delegate whole-file reads and broad searches to a subagent. Context is re-read every turn, so one big Read is paid for again on every later turn. This overrides the preference for dedicated file tools, for large files only.
  Background: `docs/agents/workflow.md`.
- **MEASURE AGAINST `staging`, NOT `local-dev`.** Ruled 2026-09-20. `local-dev` is a probe
  playground — its accounts are built by fixtures that never commit, never buy and never finish a
  deck, so any FREQUENCY read off it is an artefact of the fixtures rather than a fact about the
  app. `staging` carries the real collection and the decks that actually get played, and it is the
  bar a new change is held to: a threshold, a distribution, a payload delta, a "how often would a
  reader see this" — all of them are counted there.

  This has already cost measurable work twice. The deck-status marks were designed against a
  `local-dev` split of 34 of 34 uncommitted decks, where production is 4 of 8, and shipped a phase
  cascade aimed at a state that barely exists. The commander row's gap line reads 5.4% on the
  seeded fixture account and 67.2% on the reference account **in the same database** — an edge
  case on one and the default on the other.

  Read-only measurement against `staging` is free and needs no permission. **What does NOT change
  is where a probe WRITES**: a script that creates fixtures still points at `local-dev` or a
  scratch branch, and `probe:arrivals` — whose `replaceCollection` DELETES every collection row
  for the user it is given — must never be pointed anywhere else. Measure on staging, mutate on
  local-dev.

- All work happens in worktrees under `.worktrees/<branch>`; copy `.env` from the repo root into a new worktree before running the app. The main checkout stays clean on `main`.
- Pre-push gate, every push: `pnpm typecheck && pnpm lint && pnpm test` plus the stub-DB build, then `git fetch origin && git rebase origin/main`.
- Database migrations apply automatically during each Vercel **production** build (`vercel-build` → `scripts/vercel-migrate.ts`). Every Vercel project therefore needs `MIGRATE_DATABASE_URL` set — **Production scope, and Production alone** — with the same value as that project's `DATABASE_URL`, or its production builds fail by design. Preview deployments skip migrations entirely.

  **The SCOPE is the half that bites, and the sensitivity is not.** A copy scoped to Preview is
  inert, because previews skip migrations; production then finds nothing and refuses to build.
  That is `decideMigration`'s fail-closed branch working — shipping code without its schema is
  what #70 cost — but the message it prints names the variable rather than the scope, so the
  failure reads as "never set" when the truth is "set somewhere it is never read".

  Marking it **Sensitive is correct and is what ships** on both projects, and that is a
  MEASUREMENT rather than a preference: the variable is Sensitive today and production builds
  read it — the 14:54Z and 20:46Z builds on 2026-09-21 logged `migrations applied successfully`,
  and this script fails the build outright when the value is absent, so a build that migrated had
  it. Sensitive additionally keeps the value out of the dashboard, the same treatment
  `DATABASE_URL`, `CLERK_SECRET_KEY` and `CRON_SECRET` carry. The deploy spec's §Credential
  handling was written on the opposite premise — that a build step cannot read a Sensitive
  variable — and carries a note saying so; which of the two was true in July is not established,
  only what is true now.
  This line previously said "non-sensitive", which was wrong, and reading it is a plausible
  route to "re-scope this variable": on 2026-09-21 it moved to Preview on both projects and
  every production deploy failed for five hours, across seven deployments and five merged PRs.
  Nothing was down — the running build kept serving — but nothing new shipped either.
- `GET /api/health` (public, unauthenticated) reports migration state — 200 when the schema matches the build or is ahead of it, 503 when migrations are pending or the ledger is unreadable. Use it to confirm a deploy instead of loading a page that depends on the schema.
- **CI test selection** (`scripts/ci-select.mjs`, rules in `scripts/lib/ci-select.mjs`): a PR runs `vitest related` UNION a computed always-set (tests whose source mentions `node:fs`, `child_process`, `process.cwd()`, `import.meta.url` and the like). The FULL suite runs on lockfile/config/`ci.yml`/selector/dependency changes, an unreadable import graph, the `ci:full` label, and always on a push to main. A test that reads the tree through a helper must itself mention it. `CI selector calibration` (dispatch-only) must be run after changing the rules.
  Background: `docs/agents/ci.md`.
- `pnpm check:scryfall` validates Scryfall's bulk-data contract (index shape + first entry's required fields) without touching a database. It runs daily at 07:00 in `Upstream contract checks`, two hours ahead of the daily catalog refresh.
  Background: `docs/agents/ci.md`.
- `pnpm check:manapool` validates ManaPool's price-feed contract (payload shape, a real parse, and
  the `scryfall_id` duplication ratio) without touching a database, and runs daily in that same
  workflow. `/prices/singles` is a documented endpoint of the Mana Pool Public API, but those docs
  warn v1 "is subject to change without notice", and the check runs ahead of the daily ingest so a
  shape change is known before that ingest fails on it.
- `pnpm db:seed:prices` refreshes `printing_prices` from ManaPool, as the LAST step of each `Catalog refresh` leg. The feed omits out-of-stock cards, a null `price_cents` with a set `price_cents_foil` is foil-only, and the ingest upserts and never deletes, so "stocked now" means comparing a row's `as_of` to the table's newest.
  Background: `docs/agents/catalog-prices-precons.md`.
- `pnpm db:seed:precons` replaces `precons` and `precon_cards` from MTGJSON's Commander decks, after printings and before prices in each `Catalog refresh` leg. Cards map by `scryfallOracleId`/`scryfallId`, never by name. The publish is one transaction under the `catalog-ingest` lock and REFUSES (exit 2, nothing written) under 180 kept decks or over 1% unmapped copies; on a database the migration has not reached it warns and exits 0. `pnpm check:mtgjson` checks the contract daily; `pnpm measure:precons` is read-only against staging.
  Background: `docs/agents/catalog-prices-precons.md`.
- **`catalog_first_seen`** (`src/lib/catalog/first-seen.ts`) records when the catalog first showed a set or precon. A kind's first run is a BASELINE (`baseline: true`): its date is the day stamping began and no reader may call it an arrival. `markUpcomingSeen` writes `user_prefs.upcoming_seen_codes` only when it adds a key (the stamp trigger moves on any UPDATE). Upcoming-precons readers have no caller beyond tests and `pnpm probe:upcoming-precons` until the plan's PR 2 and 3, behind `UPCOMING_PRECONS_ENABLED`.
  Background: `docs/agents/catalog-prices-precons.md`.
- `pnpm db:build:index` rebuilds `commander_support` / `commander_support_cards` from EDHREC (about 4,750 rate-limited requests). It is built ONCE, on staging, and copied to production. The `Commander index` workflow chains on a successful scheduled `Catalog refresh` (needs `COMMANDER_INDEX_ENABLED='true'`) and runs `gate` (`pnpm db:index-due`), `build` (`db:restamp:prose`, `db:build:index`, `db:build:staples`), `prose`, then `copy` in `catalog-production` (`db:restamp:prose` FIRST, then `db:copy:index`, then `db:copy:prose`). A dispatch takes `mode` and `prose` (`generate`|`skip`).
  Background: `docs/agents/commander-index.md`.
- `pnpm db:build:prose` writes one generated sentence per commander into `commander_support.prose` (needs `ANTHROPIC_API_KEY`); the scheduled run is the `prose` job on staging and `copy` installs the sentences on production. Every run is bounded by MEASURED DOLLARS: `PROSE_MAX_USD` (default $6) and `--max-commanders` (default 2,000 in the workflow). A row whose `prose_input_hash` still matches is skipped; a commander whose attempts all fail keeps its null. `--dry-run` calls nothing.
  Background: `docs/agents/commander-index.md`.
- **The prose input hash takes the top eight themes as a SET and the top three IN ORDER.** `legacyProseInputHash` keeps the old payload for one job only: a legacy-current row is re-stamped with no model call.
  Background: `docs/agents/commander-index.md`.
- `pnpm db:restamp:prose [--dry-run]` re-stamps legacy-current rows on the database `DATABASE_URL` names. It FAILS CLOSED: `RESTAMP_TARGET_BRANCH` is never defaulted and must equal the database's `neon.branch_id`, or it exits 2 having read and written nothing. Run it on a database BEFORE that database's inputs move (an index copy or rebuild).
  Background: `docs/agents/commander-index.md`.
- `pnpm db:copy:prose [--dry-run]` installs staging's sentences on production through the catalog copy harness (`CATALOG_COPY_SOURCE_URL`, `CATALOG_COPY_TARGET_URL`, `CATALOG_COPY_TARGET_BRANCH`). A row is installed only when the source's hash equals the hash the TARGET's inputs produce; a suppressed commander is skipped; nothing is deleted.
  Background: `docs/agents/commander-index.md`.
- `pnpm db:copy:labels [--dry-run]` installs staging's card labels on production through the same harness and variables. It never calls a model, installs a label only when it is fresh against production's own card text (`planCopy`, `labelIsFresh`), and never deletes. `Card labels` runs it as a `copy` job in `catalog-production` after every successful `label` job.
  Background: `docs/agents/commander-index.md`.
- `pnpm db:index-due` prints whether the commander index is due (rule `indexDue`, `src/lib/catalog/index-due.ts`) and writes `due=true|false` to `$GITHUB_OUTPUT`. A ledger with no `ok` index build answers NOT due (`no baseline`): the first build is a dispatched catch-up.
  Background: `docs/agents/commander-index.md`.
- **Catalog builds are made once, on staging, and COPIED to production** through `scripts/lib/catalog-copy.ts`, which fails closed in order: (1) `CATALOG_COPY_SOURCE_URL`, `CATALOG_COPY_TARGET_URL` and `CATALOG_COPY_TARGET_BRANCH` are never defaulted, the target must report exactly that `neon.branch_id`, and a same-branch pair is refused; (2) the source's newest `catalog_builds` row of that kind must be finished and ok, and its catalog INPUT fingerprint must equal the source's and the target's now; (3) all reads are one repeatable-read, read-only transaction opened after the source's `catalog-ingest` lock is held; (4) one target transaction under the same lock re-reads the fingerprint, publishes, VERIFIES count-and-md5 of every replaced table and stamps `catalog_refreshes`, rolling back on a mismatch. A refusal exits 2, any other failure 1; the copy job also sets `DATABASE_URL` to the target. `the source's catalog moved since the build` is expected: rebuild on staging, then copy.
  Background: `docs/agents/catalog-copy.md`.
- `pnpm db:catalog-build start|finish <index|combos> [ok|failed]` writes the `catalog_builds` ledger the copy reads. A builder whose output is copied records ITSELF through `recordBuild`; a build that dies between start and finish leaves an unfinished row and the copy refuses it. `db:build:staples` refuses unless the newest `index` row is a finished `ok`, and `db:copy:index` accepts only a newest row whose phase is `staples`. Every run leaves a newer row.
  Background: `docs/agents/catalog-copy.md`.
- `pnpm db:copy:combos [--dry-run]` publishes staging's combo build to production by running the ingest's own `publishFlagsIn` and `publishVariantsIn` against the target, so production's `deck_data_changes` gets its own diff. The builders' floors are re-checked on the source snapshot first.
  Background: `docs/agents/catalog-copy.md`.
- `pnpm db:copy:index [--dry-run]` publishes staging's commander index build to production, replaced EXACTLY in one transaction. The target's `commander_scores` are cleared first; the `prose*` columns are left alone; a pair only a target deck holds is reported and deleted; the target's own labels must reproduce the build's `roleSetFingerprint` or it refuses; the builders' floors are re-checked on the snapshot.
  Background: `docs/agents/catalog-copy.md`.
- **The four catalog ingests** (`seed-sets`, `seed-cards`, `seed-printings`, `seed-prices`) hold the `catalog-ingest` transaction-scoped advisory lock for their whole run (`withCatalogIngestLock`, never a session lock: the Neon pooler is in transaction mode). A copy's publish takes the same lock.
  Background: `docs/agents/catalog-copy.md`.
- **The catalog is fetched ONCE and ingested into both databases from the same bytes.** `pnpm catalog:fetch <dir>` downloads Scryfall's sets, both bulk files and ManaPool's singles and writes `manifest.json`; with `CATALOG_FETCH_DIR=<dir>` set every ingest reads those files instead of the network. Everything after the read runs per database.
  Background: `docs/agents/catalog-copy.md`.
- `pnpm db:catalog-sources verify|record [source ...]` guards an artifact leg on the database `DATABASE_URL` names. `verify`, before any ingest, refuses a file whose bytes are not the manifest's and a source OLDER than what this database last ingested; `record`, after every ingest succeeded, writes each source's `updated_at` and hash to `catalog_sources`. Prefer a fresh `Catalog refresh` dispatch to re-running an old leg. Rule: `manifestRefusal`.
  Background: `docs/agents/catalog-copy.md`.
## Probes

Every `pnpm probe:*` script, its fixture discipline and what it proves lives in
[docs/probes.md](docs/probes.md). Three safety rules apply to every one of them:

- Probes never touch production.
- `probe:arrivals` deletes the given user's whole collection via `replaceCollection`; mutate on
  `local-dev` or a scratch branch, never anywhere else, and measure comparisons on staging.
- A probe that DELETES or RESEEDS the headless (or busiest) account's whole collection, history, uploads or decks calls `assertScratchBranch` (`scripts/lib/scratch-branch.mjs`) before its first write. It
  refuses production, staging AND `local-dev` by `neon.branch_id`: local-dev holds the headless account's real
  snapshot, which other lanes' probes read, and a probe whose guard refused only production and staging wiped
  its collection's printings on 2026-10-15. Run it on a scratch branch made from local-dev (how: docs/probes.md safety rules). A probe that writes
  only rows of its own per-run user id, or deletes only its own marker rows, may still run on local-dev.
- Never `pkill` or `killall` by pattern. Stop a dev server only by the exact PID you started,
  checked first with `ps -o pid=,comm= -p <pid>`.

- **`job=printings` alone is the sharp tool; its blast radius is every set.** A refused run leaves the previous denominators standing and EXITS NON-ZERO (since #704). Dispatch `job=all` unless you have a reason not to.
  Background: `docs/agents/catalog-ingest-quirks.md`.
- **A `reversible_card` printing is ingested from its FACES** (face 0 supplies `oracle_id`, `image_uris`, `flavor_name`). A layout whose faces disagree on the oracle id is skipped; `skippedReversible` is a narrow counter, not a constant.
  Background: `docs/agents/catalog-ingest-quirks.md`.
- **The printings ingest also builds the token catalog** (`tokens`, `token_printings`, `card_tokens`; rules in `src/lib/tokens/catalog.ts`, transaction in `publish.ts`). Tokens and printings are UPSERTED and never deleted; `card_tokens` is an exact replace. The run REFUSES under `TOKEN_FLOORS` (non-zero exit, previous rows standing) and SKIPS cleanly when the tables do not exist yet.
  Background: `docs/agents/tokens.md`.
- **`pnpm db:seed:prices` also prices tokens** (`token_printing_prices`) in the SAME transaction as card prices, skipping cleanly before the token tables exist. A token's link line uses Mana Pool's own product name, set and number (`tokenManapoolLine`). Against a populated token catalog, under `TOKEN_PRICE_FLOOR` (1,400) priced token printings, or under `TOKEN_IDENTITY_SHARE` (90%) carrying product identity, it writes card prices, NO token prices, and exits non-zero.
  Background: `docs/agents/tokens.md`.
- **Token ownership is recorded by the upload, in its own transaction** (`token_ownership`, `token_reads`, `token_printing_holdings`, `deck_token_printings`). Three states, never two: owned (a row), not owned (no row and a `token_reads` row), not known (neither). Only a confirmed upload writes the marker; a hand mark never does. `writeUploadTokens` runs inside `replaceCollection` and `applyCollectionChange`, so a failing token write rolls the confirm back. A deck's token printing follows the chain: the deck's pick while held, else the most-held printing with art, else the catalog's art; `writeDeckTokenPrintingIn` is the ONE writer and refuses a printing not of that token or not held (`DECK_TOKENS_ENABLED`).
  Background: `docs/agents/tokens.md`.
- **A deck's tokens are read by `loadDeckTokens` and written by two actions** (`DECK_TOKENS_ENABLED`, staging on, production off). A held token is never drawn as joined, and every write that makes a token held deletes ALL the player's joins for it in the same transaction. The actions revalidate the deck page and cart, never Home or `/decks`; `summarisePrices`, `shoppingCount`, status and roll-up stay the cards' alone.
  Background: `docs/agents/tokens.md`.
- **Each ingest stamps `catalog_refreshes`, and every cached list payload is keyed on it** (with the deployment, `src/lib/cache/deployment.ts`). The stamp is deliberately NON-FATAL: a database without the table costs one refresh's staleness and a warning.
  Background: `docs/agents/catalog-copy.md`.
- The catalog refresh (`.github/workflows/catalog-refresh.yml`) runs 09:00 UTC DAILY on both `catalog-staging` and `catalog-production`, prices last. `Combo refresh` and `Commander index` chain on its successful scheduled runs by `workflow_run`, never by cron spacing. A stale catalog is silent: unmatched CSV rows are dropped.
  Background: `docs/agents/catalog-copy.md`.
- `pnpm check:copy-drift` fails when a design table quotes a string the code stopped emitting, in punctuation (`MARKS`) or in words (a rename shape, eight words minimum, prose only). Exact matches are checked across every candidate before near matches. Reach for the matcher before the allowlist: a false positive goes in `scripts/lib/copy-drift-allowlist.mjs` with its reason, as a deliberate diff. It reads `src/lib/copy` and `src/components/**/*.tsx`.
  Background: `docs/agents/guards.md`.
- `pnpm check:tokens` fails when a component reads a CSS custom property that no theme declares (an unset property fails silently). A read with a fallback is not a miss; a token a component sets on its own element is declared for THAT FILE's subtree only; `globals.css` may resolve against any component's declaration. Tests are skipped.
  Background: `docs/agents/guards.md`.
- `pnpm check:border-collision` fails on a bare `border-r` or `border-b` in `.tsx`/`.ts`/`.css` under `src`: the mana palette's `r` and `b` theme colors make them also `border-color`. A bare one needs a SIDE-SPECIFIC color with the SAME variant chain (`border-r-[color:var(--border)]`), and a side override repairs one side only. 
  Background: `docs/agents/guards.md`.
- `pnpm check:collection-routes` fails when a route renders a figure read from `collection_items` and the collection replace does not invalidate it; it compares a computed list against `COLLECTION_ROUTES` in `src/lib/collection/invalidate.ts`, including the `dynamic` flag (`revalidatePath` silently does nothing for a `[param]` route without it).
  Background: `docs/agents/guards.md`.
- `pnpm check:db-pool` (run after `pnpm build`; CI does) fails when the built server carries its own copy of the Neon driver's `Pool`, which makes `db.transaction` silently not transactional. `serverExternalPackages: ["@neondatabase/serverless"]` in `next.config.ts` is the fix.
  Background: `docs/agents/guards.md`.
- **Home and `/decks` cache their whole payload per reader**, keyed on `user_data_stamps`, which every per-user table they read bumps at COMMIT through a deferred `user_data_touch` constraint trigger (`cachePageForUser`, `src/lib/cache/page-cache.ts`; behind `LIST_CACHE_ENABLED`, staging on, production unset). A degraded ranking is served and never stored. **Runbook, and its ORDER is the point:** a cached page looks stale: turn `LIST_CACHE_ENABLED` off (a redeploy) or Vercel Instant Rollback. Writes failing on a `user_data_touch` trigger: FIRST turn the cache off or roll back, THEN run `pnpm list-stamp:triggers disable`; never the other way round, or every cached page is served stale. Never drop `user_data_stamps` while the triggers exist. Permanent removal is a follow-up migration: drop every trigger (read the live set), then the function, then the table. Coming back: `list-stamp:triggers enable`, then a deploy with the switch on.
  Background: `docs/agents/list-cache.md`.
- `pnpm list-stamp:triggers disable|enable` takes every `user_data_touch` trigger out of the
  write path, or puts it back, in ONE transaction. It takes every table lock up front in
  one `lock table` statement under a 5s `statement_timeout`, so the app's writes wait at most ~5s
  once, and a busy database rolls the whole run back. A per-table `lock_timeout` would not do
  that: each table could wait its own 5s while the tables already locked stayed blocked. It reads the triggers the database actually
  has, not a list, and reads them back afterwards. The target is NAMED, the `pull:staging` rule:
  `STAMP_TARGET_URL` and `STAMP_TARGET_BRANCH`, and a branch that does not match what the
  database reports stops the run before anything is altered. Rehearsed on a branch of staging
  migrated to 0073: a wrong branch refused, `disable` took all sixteen and `probe:list-stamp`
  then failed 66 checks, `enable` put them back and it passed. The runbook above says WHEN.

- **Feature switches resolve per reader.** Each `*_ENABLED` variable is the default; `flag_overrides` sits on top (app-wide, per group, per account). Order: the variable set to the literal `off` wins outright (the KILL SWITCH, which no override can raise), then account, then group (OFF wins), then app-wide, then the variable. A `plumbing` switch takes the app-wide override alone; a compound switch names its parent as `needs`. The registry is `src/lib/switches/registry.ts`. Every page, layout, action and route handler decides a switch from `requestSwitchEnv(userId)`, and every flag function and reader REQUIRES its `env`; scripts, probes and evals pass `process.env` themselves. `pnpm check:switch-reads` fails any code under `src/` that hands the `process.env` object on, outside `src/lib/switches/`, tests and its `ALLOWED` list. A cache whose payload depends on a switch carries it in its key.
  Background: `docs/agents/switches.md`.
- **The one-line card row**: every card row is ONE 34px line at EVERY width, in All and Shopping. Two-line phone rows are retired; no row class is gated on `md`. A coarse pointer keeps a 44px hit through `TOUCH_HIT` so no target grows the row. The right-hand columns are fixed by `order` (All: 72px pip track and the ✕; Shopping: 84px buy tag and the ✕). Marks fold by the row's own width (`FOLD`, a container query on `DecklistRow`'s wrapper, at every width); a folded mark is `sr-only`, never `display: none`. The auto tag, the lock mark and the ownership slot never fold.
  Background: `docs/agents/card-row.md`.
- **Collection Sync** (`COLLECTION_SYNC_ENABLED`, needs `COLLECTION_EDIT_ENABLED`; staging on, production unset). A Sync merges an upload against a BASE per holding key; conflicts are answered app or file, nothing pre-picked, and a confirm with an undecided conflict refuses (`planSync`, pure). The base is the last FILE (the newest confirmed upload that is an ANCHOR, `readSyncBase`), never the collection after it. It writes through `writeRows` as one `upload_sync` ledger entry; the confirm REQUIRES the preview's `planDigest` and refuses as `stale` when the plan under the lock differs. A Sync changing nothing writes nothing. Proofs: `pnpm probe:collection-sync`, `pnpm measure:sync`.
  Background: `docs/agents/collection-features.md`.
- **A way in without a collection** (`NO_COLLECTION_ENTRY_ENABLED`, needs `COLLECTION_EDIT_ENABLED`). `importDeck` with `own: true` and a uuid `actionId` adds the list's cards to the collection and writes the deck in ONE transaction (`importDeckOwned`), so a refusal leaves neither; the ledger entry carries source `deck:<deck id>`. Off, or with `own` unset, the import is as shipped. Proof: `pnpm probe:deck-own`.
  Background: `docs/agents/collection-features.md`.
- **Social foundation** (`SOCIAL_FRIENDS_ENABLED`). Friends are added by single-use invite link or QR, never search; a friendship is two directed `friend_links` rows written in user id order. **Every cross-user read lives in `src/lib/social/`** and joins the grant on the session's viewer in the same statement; client payloads carry `social_profiles.public_id`, never a Clerk id. `pnpm check:social-reads` fails when a module outside that directory touches a social table. Spares are view-only, per pod (`loadFriendSpares`, `GET /api/friend-spares`). A friend's write never moves the viewer's stamp, so a cached page that draws friend data puts `await friendGeneration(viewer)` in EVERY `cachePageForUser` key (`check:list-cache` enforces it), and a page drawing spares must also key each friend's resolved switches.
  Background: `docs/agents/social.md`.
- **Deleting an account deletes everything the app holds for it.** Clerk's `user.deleted` webhook (`POST /api/clerk-webhook`, authorized only by the Svix signature; 503 with the secret unset) records a tombstone in its own commit, then runs `purgeAccount` (`src/lib/account/purge.ts`) in ONE transaction: the social half first, then every table by `user_id` in `PURGE_ORDER`, then the data stamps locked LAST in user id order. A five-minute Vercel cron (`GET /api/cron/account-sweep`, `CRON_SECRET` bearer) re-runs the idempotent purge for each tombstone, and retires the raw Clerk id after 24 hours. `src/lib/account/purge.test.ts` computes coverage from `schema.ts`: a new per-user table fails CI until the purge handles it. Proof: `pnpm probe:purge`.
  Background: `docs/agents/account-purge.md`.
- **Card scanning matches on the server** (`CARD_SCAN_ENABLED`, needs `COLLECTION_EDIT_ENABLED`). `POST /api/card-scan/match` takes a 256-float fingerprint (signed in, switch re-checked, 404 off, `private, no-store`); `scan_index` holds one pgvector `halfvec(256)` row per printing face. `pnpm db:seed:scan-index <dir>` publishes in ONE transaction on a NAMED target (`SCAN_INDEX_TARGET_URL`, `SCAN_INDEX_TARGET_BRANCH`, checked by `neon.branch_id`), refuses a wrong model, a row off unit length or under 100,000 rows, and never goes through the Neon MCP.
  Background: `docs/agents/collection-features.md`.
- **The wishlist** (`SOCIAL_WISHLIST_ENABLED`, standalone). `wishlist_items` holds a card-level want with `quantity` copies IN ALL; a card the collection holds that many of is COLLECTED and leaves the list, swept by `sweepCollectedIn` INSIDE the write that reached the want. A read never deletes. A friend's wishlist is read only through `src/lib/social/wishlist.ts`. Proof: `pnpm probe:wishlist`.
  Background: `docs/agents/collection-features.md`.
- **Opponents in the game log** (`SOCIAL_GAMES_ENABLED`, requires `SOCIAL_FRIENDS_ENABLED`). `deck_game_opponents` rows SNAPSHOT the friend's and deck's names at log time, and `logGame` refuses opponents while the switch is off. The live friend link is never sent to a client and is unlinked by the purge. The player-typed label reaches no prompt.  Proof: `pnpm probe:game-opponents`.
  Background: `docs/agents/social.md`.
- **Moments** (`MOMENTS_ENABLED`; staging on, production unset): one-time bubbles beside a control a reader has not used, in a FIXED ORDER (`src/lib/moments/registry.ts`), one per visit, each following its tool's switch; a control can be a FALLBACK for its moment (`useMomentAnchor`'s `fallback`). The spent set is `user_prefs.moments_spent`, append-only, written only when it adds an id. Nothing arrives while a surface is open over the page.
  Background: `docs/agents/moments.md`.
- **Stuck-loader reports** (`NAV_STALL_LOG_ENABLED`, plumbing; staging on, production off): a loading screen up 8 seconds sends ONE report per navigation to `POST /api/nav-stall` (always 204), which logs one line with no reader or deployment id. Find them with `vercel logs -p the-99 -q "nav-stall"`.
  Background: `docs/agents/ops.md`.
- **Security headers**: `next.config.ts` sends HSTS, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` and `Permissions-Policy` on every path (`src/lib/security/headers.ts`). The Content-Security-Policy is REPORT-ONLY and production-only; reports go to `POST /api/csp-report`. Read the `[csp]` Vercel logs for a week before enforcing. `rate_hits` (`RATE_LIMIT_ENABLED`, plumbing) is observe-only: it logs `[rate] would refuse ...` and refuses nothing.
  Background: `docs/agents/ops.md`.
- **Paid credits in the ledger**: `credit_grants` holds one row per lot (`plan` or `pack`); `reserveModelCall` funds from the free allowance, then a plan lot, then a pack lot, else refuses. **"Out of credits" is decided in one place**: `hasCredit`, `freeRoom`, `freeCount` in `allowance-rule.ts`; `src/lib/model/credit-gates.test.ts` fails on any other comparison of `used` against `limit`. Purged with the account. Proof: `pnpm probe:payments-ledger`.
  Background: `docs/agents/payments.md`.
- **Stripe, the webhook half**: `stripe` and the API version are pinned EXACTLY. Test mode everywhere but production, with a RESTRICTED key (`rk_`). `POST /api/stripe-webhook` is authorized only by the signature over the RAW body. The Stripe account is SHARED with Concert Crawl, so every Session this app creates MUST carry `metadata.app = "the-99"`, and a Session without it is answered 200 and left alone, never 503. A completed Checkout is a TRIGGER: `fulfilCheckoutSession` retrieves the Session and `decideFulfilment` grants only what it validates; a disagreement is refused and logged, never fixed. `pnpm check:payments-reads` fails on `stripe` imports outside `src/lib/payments/`. Proof: `pnpm probe:payments-webhook`.
  Background: `docs/agents/payments.md`.
- `pnpm check:list-cache` fails when Home or `/decks` reads a per-user table the stamp does not cover; it COMPUTES the tables by following both pages' imports through `src/lib` (raw SQL names included) and reads the triggers out of the migrations. It runs inside `pnpm test`.
  Background: `docs/agents/guards.md`.
- `pnpm pull:staging` copies a player's real decks and collection from **staging** into a local database: `PULL_TARGET_URL=<local-dev> PULL_TARGET_BRANCH=br-… pnpm pull:staging [--dry-run] [--replace]`. ONE WAY and FAILS CLOSED: the target is never defaulted, `PULL_TARGET_BRANCH` must equal the `neon.branch_id` the target reports, and the source's account is named with `PULL_FROM_USER_ID` or inferred only when the source holds exactly one. A target account already holding decks REFUSES unless `--replace`, which replaces rather than merges. Both ends are transactional. It is a snapshot: re-run it before a measurement that matters.
  Background: `docs/agents/pull-staging.md`.
- `pnpm fetch:mana` downloads Scryfall's mana symbols into `public/mana/` and rewrites the manifest the renderer checks (a symbol with no art falls back to a lettered disc). `pnpm build:mana-sprite` rebuilds `public/mana/sprite.svg`, the ONE file every pip draws from (a classic sprite of 100-unit cells, not `<view>` fragments); `fetch:mana` runs it, and `mana-sprite.test.ts` fails when it is stale.
  Background: `docs/agents/catalog-ingest-quirks.md`.
- **`/discover` ships whole rows for its first window only** (25): `cutToWindow` cuts the rest to list columns and the draw fields arrive from `GET /api/discovery-fields?sort=&b=&s=` (signed in, at most `MAX_FIELDS_BATCH` 200, `private, no-store`). The server's window must be the client's (`lib/discovery/window`). `probe:payload` holds the wire to 0.3MB.
  Background: `docs/agents/list-payloads.md`.
- **`/collection` ships whole cards for its first window only** (200), the same shape: `cutCollectionWindow`, fields from `GET /api/collection-fields?ids=`, a withheld card marked by the decoder (`withheld: true`). The page cuts through `pageWindowIds`, which joins availability first. Its grid's art waits for the page except `GRID_EAGER_TILES` (4). `probe:payload` holds the wire to 1.05MB.
  Background: `docs/agents/list-payloads.md`.
- `pnpm db:seed:combos` ingests Commander Spellbook into `spellbook_variants`, `spellbook_variant_cards` and `card_bracket_flags`. The sweep runs BEFORE the bulk file. The publish is two transactions (flags, then bulk) and REFUSES a partial ingest under any collapse floor, leaving the previous tables standing and exiting non-zero. It also stores the tutor mark (`isTutor`), dark after a deploy until this job runs: dispatch it. `card_bracket_flags` carries per-flag sources; an ABSENT id means no flag applies and nothing more.
  Background: `docs/agents/combos-staples.md`.
- `pnpm check:spellbook` validates Spellbook's LIVE feed contract, no database, daily.
  Background: `docs/agents/ci.md`.
- `pnpm build:combo-features` regenerates `produces-kinds.generated.ts`. Developer-run; the diff IS the review. CARD COUNT IS NEVER THE TEST: what a variant PRODUCES decides whether the bracket system counts it (`probe:bracket`).
  Background: `docs/agents/combos-staples.md`.
- The `Combo refresh` workflow builds Spellbook's index ONCE on staging, Mondays only, and copies it to production (`db:copy:combos`). It chains on the scheduled `Catalog refresh` (needs `COMBO_REFRESH_ENABLED='true'`); a dispatch takes `mode` `build+copy` or `copy-only`; one `combo-refresh` concurrency group.
  Background: `docs/agents/combos-staples.md`.
- `pnpm db:build:staples` derives `format_staples` and `identity_composition` from the commander index, as a STEP in `Commander index`'s staging `build` job, copied by `db:copy:index`. It prints its whole derivation. A derivation reproducing a ratified figure must reproduce its NULL POLICY too: `coalesce(deck_count, 1)`, and a FILTER on the inclusion sum, never a `where`. Neither table is cleared by an empty derivation.
  Background: `docs/agents/combos-staples.md`.
- `pnpm measure:load` times pages and the card-details press in a real browser at 1300x900 and 390x844: the before/after tool every performance PR puts in its body. Point it at `next start`, never `next dev`, on a scratch Neon branch holding a `pull:staging` copy whose URL the worktree's `.env` `DATABASE_URL` names; it refuses production and staging for its one write, by `neon.branch_id`. Presses are timed IN THE PAGE (`scripts/lib/press-probe.mjs`), never by a Playwright wait. Options (`MEASURE_PROFILE`, `MEASURE_ROUTES`, `MEASURE_DB_URL`, `MEASURE_DEPLOYED=1` for staging.the-99.dev only) are in the background file.
  Background: `docs/agents/measure.md`.
- **`public/sw.js` is the app's service worker**, registered in production only. It CACHES `/_next/static/` (cache first, newest 600 files) and lets every other request through, except that a page load whose network FAILS is answered with the one page it keeps, `/offline` (fetched with `credentials: "omit"`, public in `src/proxy.ts`). Never the mana sprite, a reader's document, an RSC payload, `/api`, an action or anything cross-origin. To retire it, ship a `sw.js` that unregisters itself; bump `VERSION` to drop every cache. `src/app/sw.test.ts` pins this.
  Background: `docs/agents/service-worker.md`.
- **Loading the deck page's Tuning tools on demand was tried and reverted** (#1639, 2026-10-13). Do not retry without reading the tables at https://github.com/HartiganHM/the-99/pull/1639#issuecomment-6143963075. #1633's cut stands, with its guard `scripts/lib/client-graph.test.mts`.
  Background: `docs/agents/measure.md`.
- `pnpm measure:tutors` prints what `classifyTutor` does to the live catalog (read-only). A classifier built from a fixture agrees with that fixture; watch `any` against 129 for a dropped word, since `unreachable` is only a structural invariant.
  Background: `docs/agents/bracket.md`.
- **The bracket system's classifiers are all PARTIAL, and every surface says so.** The partial-detection strings live beside their classifiers (`oracle-rules.ts`, `combo-features.ts`) and are re-exported by `bracket/rules.ts`. There is no B2/B3 chain-or-loop flag: the only thing that violates bracket 3 is a measured LOOP, an assembled combo Spellbook records as producing infinite turns.
  Background: `docs/agents/bracket.md`.
- `scripts/contact-sheet.mjs` photographs every surface in a feature's inventory (`docs/superpowers/inventories/*.json`) at both widths into one image. Every step verb reaches content through `lib/surface.mjs`, a row existing at one width says `"widths"`, there is no optional click, and a run that photographs nothing fails. `pnpm check:shared <inventory>` checks that routes sharing a control import and reference the same component (`shares.module` names the component used as-is; each row's `view` names the file that imports it).
  Background: `docs/agents/contact-sheet.md`.
- Browser scripts reach the page through `scripts/lib/surface.mjs` (`onPage()`, `openSheet()`), never a bare selector, because the shell renders its own controls around `<main>`. `scripts/lib/surface.test.mts` sweeps every `probe-*.mjs` for unscoped forms.
  Background: `docs/agents/contact-sheet.md`.
- `pnpm.overrides` in `package.json` pins seven transitive packages to patched versions. An override can force a version its parent never tested, so exercise it (`brace-expansion@5` broke ESLint; the `esbuild` pin is proved by `pnpm db:generate` and `drizzle-kit check`).
  Background: `docs/agents/ci.md`.
- Stage files by name — never `git add -A` (`.env` and other untracked files must stay untracked).
- **You are authorized to dispatch the `pr-review` §10b pre-open review subagent without asking.** Immediately before `gh pr create`, dispatch a `general-purpose` agent (never a fork) with `~/.claude/skills/pr-review/precheck-prompt.md`, then `node ~/.claude/skills/pr-review/precheck.mjs record`. Verify every finding before acting on it; it never gates the PR. The grant is permanent (Hugh, 2026-09-16); do not propose retiring it on the hit-rate percentage alone.
  Background: `docs/agents/precheck.md`.
- PR reviews follow the `pr-review` skill (`~/.claude/skills/pr-review/SKILL.md`), which is the single source of truth across every repo — invoke it rather than working from memory or from any copy. UI features additionally run `feature-acceptance` per PR and again at feature close. This repo merges via **squash**.

## A correlated subquery in a single-table select must alias and qualify

Drizzle omits table qualification from column references interpolated into a `sql` template in
the **projection** of a select whose `from` names a **single** table. A correlated subquery
written the obvious way:

```ts
sql`select count(*) from ${deckGames} where ${deckGames.deckId} = ${decks.id}`
```

renders as `select count(*) from "deck_games" where "deck_id" = "id"`. Both bare names resolve
against `deck_games`, so it compares each row's foreign key to its own primary key — always
false, count always 0, no error. Alias the inner table and write both sides out:

```ts
sql<number>`(
  select count(*) from ${deckGames} dg
  where dg.deck_id = ${decks}.id
)::int`
```

- **The collision is what bites, not the missing prefix.** Unqualified names are harmless when
  the inner table has no column of that name, because Postgres then falls through to the outer
  query. `id` collides constantly; `built` in `getDeckReviewHeader` survived for months purely
  because `deck_cards` has no `id` column.
- **A join saves you, a `where` saves you, the projection does not.** With two tables in the
  `from`, or with the same `sql` in `.where()`, Drizzle qualifies correctly. Confirmed by
  rendering all three through `PgDialect.sqlToQuery`.
- **A `.toSQL()` test catches it; a component test never will.** Component tests receive the
  figure as a prop and stay green however the query was written. Rendering the query and asserting
  on the emitted string does catch it, needs no database, and is what `src/lib/decks/built.test.ts`
  already does for `notBuiltBy` — assert the qualified form, `"deck_games"."deck_id"`, rather than
  that the column name appears anywhere. Keep a probe for the returned figure: emitted SQL proves
  the question, a fixture whose true count is known proves the answer, and `probe:versions` asserts
  both tab-row figures for exactly that reason. When a count reads 0 and should not, print
  `.toSQL()` first.

## Any new model input from a player goes through `playerText`

SQL is parameterized (Drizzle), URL params parse to closed sets, server actions re-validate, and
a model's own OUTPUT goes through `validate.ts`. Free text a player TYPES — deck intent, a game
note, Look deeper's free-text question — is the one input that reached a prompt verbatim, framed
only by a sentence asking the model to read it "after the colon". That sentence is a request, not
a boundary. `playerText(label, text, maxChars)` in `src/lib/model/player-text.ts` is the boundary:
it collapses line breaks (so the text cannot start what reads as a new line of instructions),
breaks any literal occurrence of its own delimiter tags inside the text (so the player's words
cannot forge a close and continue past it), and re-checks the field's own cap. Every system prompt
that calls it also carries its one `PLAYER_TEXT_SYSTEM_RULE` line, naming the tags and stating
that anything between them is data, never an instruction.

**Any new free-text field a player types that reaches a model prompt goes through `playerText`.**
Catalog data (a card name, oracle text) is not in scope — the player cannot type it, so it carries
no injection surface — but intent, notes, a free-text question, or anything of that shape is. A
field that reaches a prompt without it is a defect.

## Writing the address bar without navigating

Every `history.replaceState` a page makes to mirror its own state (a filter, a sort, a view, an
open card) or to strip a one-time parameter goes through `mirrorUrl` (`src/lib/url/mirror.ts`),
never `history.replaceState` directly. Next patches `replaceState` so its router adopts the URL
it is given, and adopting a URL while a navigation is pending DROPS that navigation: on main,
`/collection`'s and `/discover`'s mirror effects re-wrote the page's own current URL about 700ms
after a push to `/decks`, and in 3 of 4 cases the reader never left (1f's startup diagnostic,
2026-09-29). `mirrorUrl` makes two rules one definition:

- **A write equal to the live URL is not made.** It changes nothing a reader sees, and it is the
  write that was adopted over the pending push. A path check alone does not catch it, because
  the path has not moved while the push is pending.
- **A write is made only on the page it describes.** Its path must be the live one, and the live
  one must be the path the router has committed, which the provider reports from `usePathname()`
  in a layout effect. A browser Back or Forward moves the address before Next commits the new
  page, so a late write from the page being left would otherwise land over the destination,
  whether it named its own path or read `location.pathname`. Next writes the address in an
  insertion effect, before the provider's layout effect, and every mirror runs in a passive
  effect after both, so a page's own first write sees its own path.
- **No rule about pending navigations.** One was built and dropped (#1145, rounds 4 to 9): every
  fix to when the pending state was published exposed the next timing edge, and no measured case
  showed a legitimate write racing a tap. The two rules above cover every dropped navigation 1f's
  diagnostic logged on main.

`src/lib/a11y/dialog.ts` is the one `replaceState` outside it, deliberately: it puts back the URL
a history POP moved, which is a restore rather than a mirror, and it already skips an equal
write.

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
- **A cache hit still writes the URL**, via `mirrorUrl` rather than the router —
  routing is the request being avoided. Serialise defaults as absences, exactly as the
  navigating path does, and read every parameter you do not own back off the live URL rather
  than rebuilding it.

## Design pipeline

- UI work is gated on design handoffs in `design/design_handoff_the99_*` — no UI until the handoff exists and has a READINESS verdict. Backend/API/DB work may proceed without one.
- Every UI PR passes the design-review skill (property-table enumerate → verify → confirm) before `gh pr create`. Mobile + desktop parity ships in the same PR.
- Pipeline state lives in `docs/superpowers/design-pipeline-status.md`; plans in `docs/superpowers/plans/`; gap reports in `docs/superpowers/gap-report-*.md`.
- **A MULTI-ROUND FEATURE LINE BATCHES ITS ABOUT ENTRIES AT THE END OF THE LAUNCH** (ruled 2026-09-21): one `ABOUT_VERSION` bump at the end, not one per round. This moves WHEN, never whether: the entries are still owed and the line's close-out does not pass without them.
  Background: `docs/agents/design-pipeline.md`.
- **No FEATURE launches without an About entry, in the same round that ships it.** Three places carry it: Design (the per-entry artboard in `design/design_handoff_the99_about/`), the plan (the entry and the `ABOUT_VERSION` bump are a named task, or a stated deferral with a reason), and the close-out (`feature-acceptance` does not pass until the entry exists and the version moved). A COSMETIC CHANGE is not a feature and owes no entry; it is an ordinary edit to the entry that covers the surface. Design draws the entries and Hugh decides which features owe one.
  Background: `docs/agents/design-pipeline.md`.
- `design/` is **reference material, never shipped code**. It sits outside both `public/` and `src/`, so no route serves it and no module imports it. Each handoff's `support.js` is a generated runtime that evaluates code dynamically and loads React from a CDN — it is read by opening that bundle's `.dc.html` from disk, and by nothing else. Never import from `design/`, and never copy a handoff asset into `public/`.

- `scripts/measure-gap-line.mts` measures the commander row's gap line against a real database (read-only; `MEASURE_USER_ID` picks the account, default the busiest). The frequency is a property of the reader's played set, so measure the right account. It must import and call shipped rules (`byNovelty`), never restate them, and its figures include brews.
  Background: `docs/agents/measure.md`.