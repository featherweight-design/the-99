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

- **Read the part of a file you need, not the whole file.** For anything over a
  few hundred lines, reach for `sed -n 'X,Yp'`, `grep -n` or `rg`, or pass
  `offset`/`limit` to the Read tool. Delegate whole-file reading and broad
  searches to a subagent, whose context is separate and discarded.

  This overrides the general preference for dedicated file tools over shell
  commands, on cost grounds, and only for large files. Measured over 14 recent
  transcripts in this repository (42,650 messages): tool traffic is 93% of all
  context, and within it **206 `Read` calls carried 30.3 MB of characters against
  9.8 MB from 14,147 `Bash` calls** — 147k characters per Read on average, 648k
  at worst, which is most of a context window in one call. The top 1% of tool
  results carry 75% of all result bytes.

  It matters because context is re-read on every turn: a large file read once is
  paid again on every later turn of that session. About 90% of token spend is
  cache reads, and per-turn context size — not session length — is what predicts
  cost. An 11,558-message session holding ~109k context ran $0.25 per message; a
  2,570-message session holding ~581k ran $0.98.

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
- **CI test selection** (`scripts/ci-select.mjs`, rules in `scripts/lib/ci-select.mjs`). A PR's tests are `vitest related` UNION the
  *always set*, which is COMPUTED: every test file whose source mentions `node:fs`, `child_process`,
  `process.cwd()`, `import.meta.url` or the like. The graph alone skipped 10 to 28 tree-reading guards
  in 23 of the last 25 merged PRs, because those guards read files instead of importing them. The FULL
  suite runs when the lockfile, a vitest/tsconfig/eslint/next config, `.nvmrc`, `vitest.setup.ts`,
  `ci.yml`, the selector or package.json dependency fields (or its `test` script) change, when vitest
  cannot read the import graph (a syntax error), under the `ci:full` PR label, and ALWAYS on a push to
  main, which is the net under a selection miss. A test that reads the tree through a helper module,
  never naming `fs` or a path API itself, is invisible to the always set: have the test file mention it.
  The `select` job feeds `test`, which shards the selected files (`vitest run <files> --shard i/N`, N
  from `SHARD_SIZE` 170 per shard, at most 6), and `checks` is red unless `select` succeeded.
  `CI selector calibration` (dispatch-only) breaks one file at a time (`scripts/ci-calibration-cases.json`),
  runs the whole suite, and fails a leg when a test went red that the selector did not choose; run it after
  changing the rules. First run, 2026-10-13: 22 legs; 15 clean, 4 hit the unreadable-graph fallback, and 3 reported one missed tuning test each that did not recur when those three legs were re-run (0 missed).
- `pnpm check:scryfall` validates Scryfall's bulk-data contract (index shape + first entry's required fields) without touching a database. The `Upstream contract checks` workflow runs it daily at 07:00, two hours ahead of the daily catalog refresh, so an upstream shape change is known before the ingest that would fail on it.
- `pnpm check:manapool` validates ManaPool's price-feed contract (payload shape, a real parse, and
  the `scryfall_id` duplication ratio) without touching a database, and runs daily in that same
  workflow. `/prices/singles` is a documented endpoint of the Mana Pool Public API, but those docs
  warn v1 "is subject to change without notice", and the check runs ahead of the daily ingest so a
  shape change is known before that ingest fails on it.
- `pnpm db:seed:prices` refreshes `printing_prices` from ManaPool. It runs as the LAST step of each
  `Catalog refresh` leg, daily, so a day's prices always follow that day's catalog on both sides
  (card-data replicate plan, 2026-09-28). The `Price refresh` workflow lost its cron in the same
  change and stays for a one-off dispatch naming one environment. The feed omits out-of-stock
  cards rather than listing them at zero, so a printing absent from `printing_prices` has never
  been stocked in any run so far, and a row with a null `price_cents` but a set `price_cents_foil`
  is stocked in foil only — neither is "free" or "unknown". The ingest upserts and never deletes,
  so presence is not the same as being stocked now: a sold-out printing keeps its last row with a
  frozen `as_of`, and any reader needing "stocked now" compares that `as_of` to the newest one in
  the table.
- `pnpm db:seed:precons` replaces `precons` and `precon_cards` from MTGJSON's `Commander Deck`
  files (plan `2026-10-11-commander-precons.md`). It runs in each `Catalog refresh` leg after
  printings and before prices, from the same artifact as the rest: `catalog:fetch` keeps MTGJSON's
  `DeckList.json` as fetched and writes ONE derived file of its own (`mtgjson-precons.json`, the kept
  fields of every Commander deck), because 197 deck responses cannot be one hash-checkable upstream
  file. The 197 deck files (~31MB gzipped) are fetched again only when the decks the index lists
  move or the cached derived file is a week old (`canReuse`); the fetch job keeps it in the Actions
  cache. Cards map by `scryfallOracleId` and `scryfallId`, never by name: a card the catalog lacks
  is dropped and counted on its precon (`unmapped_count`), a printing it lacks keeps the card with
  no printing. Twins are one set's decks with identical lists (16 Collector's Editions on
  2026-10-11); a Commander Anthology reprint of an older list is its own row. The publish is one
  transaction under the `catalog-ingest` lock, stamps `catalog_refreshes`, and REFUSES (exit 2,
  nothing written) under 180 kept decks or over 1% unmapped copies. On a database the precon
  migration has not reached it warns and exits 0, and `db:catalog-sources record` records nothing
  for `precons` there, so a refresh that outruns a deploy stays green. `pnpm check:mtgjson` checks
  the contract daily in `Upstream contract checks`; `pnpm measure:precons` runs the planner against
  staging, read-only, and names every precon card a started deck would meet as illegal.
- `pnpm db:build:index` rebuilds `commander_support` / `commander_support_cards` from EDHREC,
  about 4,750 rate-limited requests. Since the card-data replicate plan (2026-09-28) it is built
  ONCE, on staging, and copied to production. The `Commander index` workflow chains on every
  successful scheduled `Catalog refresh` and runs four jobs in order:

  - `gate` asks staging whether a build is due (`pnpm db:index-due`, the rule `indexDue`):
    never while the ledger holds no `ok` index build (no baseline: the first build is a
    dispatched catch-up), and otherwise
    monthly from the 3rd when no `ok` index build has started that month, or 14 days after an
    `expansion` or `commander` set releases when no `ok` build has started since. Reality Fracture
    (released 2026-10-02) comes due on 2026-10-16. A dispatch is always due.
  - `build` first runs `db:restamp:prose` on staging, then `db:build:index` and
    `db:build:staples`, each of which records its own ledger row; the staples row is the newest,
    so a copy refuses a build whose derivation failed.
  - `prose` writes staging's sentences for that build (`db:build:prose`), and runs only when the
    build succeeded.
  - `copy`, in `catalog-production`, runs `db:restamp:prose` on production FIRST, then
    `db:copy:index` and then `db:copy:prose`. The re-stamp is a hard dependency of the index copy:
    a legacy prose hash can only be checked against the inputs its sentence was written from, so
    it has to run before the copy replaces them. A refusal fails the job before anything is copied. It runs over a
    failed or skipped `prose`, because the index copy never depends on the sentences.

  A dispatch takes `mode`: `build+copy`, or `copy-only`, which copies staging's last `ok` build or
  refuses; and `prose`: `generate`, or `skip`, which builds and copies the index and leaves the
  sentences to the next scheduled build (readers serve a stale sentence rather than none). The
  first catch-up after the ledger existed was a `build+copy` with `prose=skip`: a `copy-only`
  refuses on an empty ledger, and generating then would have been paid again five days later. One workflow-wide concurrency group keeps a second EDHREC request stream, and a second
  copy, from ever starting. Needs `COMMANDER_INDEX_ENABLED` set to `'true'` to chain.
- `pnpm db:build:prose` writes one generated sentence per commander into `commander_support.prose`
  — sentence 1 of "Why this commander", and identical for every player, which is why no collection
  change invalidates it. Needs `ANTHROPIC_API_KEY`. The scheduled run is the `prose` job inside
  `Commander index`, on staging, straight after the build whose tags the prompt and the input hash
  are built from; `copy` then installs the sentences on production, so each costs one model call,
  once. The `Commander prose` workflow is dispatch-only since 2026-09-28, for generating against
  one database by hand.

  **Every run is bounded by MEASURED DOLLARS** (Hugh, 2026-09-28). Each reply's `usage` is priced
  through `scripts/eval/lib/pricing.mts` as it lands, and the run stops cleanly once one more
  commander (three attempts, worst case) could cross `PROSE_MAX_USD`, default $6; a
  `--max-commanders` / `PROSE_MAX_COMMANDERS` ceiling (default 2,000 in the workflow) stands beside
  it. What a ceiling defers is written by the next run, since a written row reads as fresh.
  `--dry-run` counts what a run would generate and calls nothing; the staging job prints that
  count to its summary before the real run. Its last three runs took 1.15, 1.18 and 1.26 attempts per
  commander (40 sentences from 46 attempts, 38 from 45, 19 from 24), 1.19 pooled. A row whose stored `prose_input_hash` still matches its inputs is skipped,
  so a re-run costs nothing for a commander whose tags have not moved, and an interrupted run
  resumes by being dispatched again. A commander whose every attempt fails the accept contract
  keeps its null and renders with no paragraph — the state the design draws, and never a truncated
  sentence nobody wrote.
- **The prose input hash takes the top eight themes as a SET and the top three IN ORDER**
  (2026-09-28). A theme entering or leaving the eight changes what a sentence may name, and a move
  among the leading three changes what it leads with; a reorder below them changes neither. The
  old hash took all eight in order, and between two index builds 854 of staging's 1,777 stale
  sentences had moved by order alone. `legacyProseInputHash` keeps the old payload for one job
  only: a row current under it is RE-STAMPED with the new hash, with no model call, by
  `db:build:prose` and `db:restamp:prose`. `db:copy:prose` accepts a legacy-stamped SOURCE row
  whose hash fits the target's inputs and installs it under the new hash, but it never touches
  the target's own rows.

- `pnpm db:restamp:prose [--dry-run]` makes that move on the database `DATABASE_URL` names, and
  nothing else: legacy-current rows take the new stamp, stale rows stay stale, and a re-run
  re-stamps nothing. It FAILS CLOSED on its target: `RESTAMP_TARGET_BRANCH` is never defaulted,
  and the database must report exactly that branch by `neon.branch_id` or it exits 2 having read
  and written nothing. **Run it on a
  database BEFORE that database's inputs move**, because a legacy hash can only be checked against
  the inputs the sentence was written from; once an index copy or rebuild has replaced them, a
  sentence whose themes only reordered reads stale and costs a model call. Measured on scratch
  branches (2026-09-28): production re-stamped 3,379 of 3,379 and staging 1,605 of 1,605, and
  copying the re-stamped production sentences onto staging then installed 536 more, leaving 1,241
  to generate instead of 1,777.

- `pnpm db:copy:prose [--dry-run]` installs sentences staging has generated onto production,
  through the catalog copy harness: `CATALOG_COPY_SOURCE_URL`, `CATALOG_COPY_TARGET_URL` and the
  named `CATALOG_COPY_TARGET_BRANCH`, one source snapshot, and one target transaction under the
  `catalog-ingest` lock with the catalog stamp in it. A sentence costs a model call to produce and
  nothing to move. A row is installed only when the hash the source stored equals the hash the
  *target's* own inputs produce, so a sentence describing themes the target no longer records is
  never written; those rows keep their null and are picked up by the next `db:build:prose` against
  that target. A suppressed commander is skipped before any of that, exactly as the generator skips
  it: a source generated before an id joined the list still holds that sentence, so the copy is the
  one path that could put a pulled sentence back. Nothing is deleted, and there is no build ledger:
  the input hash is the check that a sentence fits the row it lands on.

- `pnpm db:copy:labels [--dry-run]` installs staging's card labels on production through the same
  harness and the same three variables. PAY ONCE: it never calls a model. A label is installed only
  when it is fresh against production's own card text under the row's OWN prompt version and model
  (`planCopy`, `labelIsFresh`), and it never deletes. Since 2026-10-04 a label stays fresh under the
  version that wrote it (`PROMPT_SYSTEM_SHA256`, append-only); only a card's text moving, or a
  `list:<name>` build redoing it, replaces it. `Card labels` runs it as a `copy` job in `catalog-production` after every
  successful `label` job.

- `pnpm db:index-due` prints whether the commander index is due today, read from the database
  `DATABASE_URL` names, and writes `due=true|false` to `$GITHUB_OUTPUT`. The rule is `indexDue`
  (`src/lib/catalog/index-due.ts`), pure over the catalog's `sets` and the ledger's `ok` index
  builds, and unit tested on the Reality Fracture and Star Trek dates. The release set types are
  one constant, `RELEASE_SET_TYPES`; `draft_innovation` reprint boxes are left out. A ledger
  with no `ok` index build answers NOT due (`no baseline`), so switching the chain on never starts
  a backfill: the first build is a dispatched catch-up, which builds whatever the gate says.
- **Catalog builds are made once, on staging, and COPIED to production** (plan
  `2026-09-28-card-data-replicate.md`, Hugh 2026-09-28). Fetching the same EDHREC and Spellbook
  data twice was the waste; the copy is what replaces the second fetch. Every copy goes through
  one harness, `scripts/lib/catalog-copy.ts`, and fails closed at each step, in this order:

  - **One way, named target.** `CATALOG_COPY_SOURCE_URL`, `CATALOG_COPY_TARGET_URL` and
    `CATALOG_COPY_TARGET_BRANCH` are never defaulted, and the target must report exactly the named
    Neon branch by `neon.branch_id` (the `pull:staging` rule). A same-branch pair is refused.
  - **A successful build of the catalog both sides hold.** The source's newest `catalog_builds`
    row of that kind must be finished and ok, and the catalog INPUT fingerprint it recorded
    (`src/lib/catalog/fingerprint.ts`: the `cards` columns a replicated builder reads) must equal
    the source's now AND the target's. Ids alone are not enough: a card whose text moved on one
    side has the same id and a different classification.
  - **One source instant**: every read in one repeatable-read, read-only transaction, opened
    only once the SOURCE's `catalog-ingest` lock is held, on its own connection. A snapshot is
    fixed at its first statement, and an ingest publishes in more than one transaction, so a read
    that began mid-ingest would be one consistent instant of a mixed generation.
  - **One target transaction**, under the `catalog-ingest` advisory lock, with the target's
    fingerprint re-read inside it, the publish, a count-and-md5 VERIFY of every replaced table
    against the source's, and the `catalog_refreshes` stamp. A mismatch rolls the whole publish
    back.

  **Copied timestamps are exact to the millisecond, not the microsecond**, deliberately. Rows
  travel as Drizzle values and a `timestamp` column maps to a JS `Date`, so a `computed_at` of
  `.060711` lands as `.06`, and verification compares timestamps at that precision. No reader
  compares a timestamp across databases, and each database's own `max(computed_at)` still moves
  with every copy, so the difference is invisible; carrying them as text instead would mean a
  second, untyped row path beside every table's Drizzle one.

  **An expected refusal: `the source's catalog moved since the build`.** The fingerprint covers
  every card, so any catalog refresh that lands after a build (a set added mid-spoiler season, or
  a daily refresh) makes a LATER copy of that older build refuse. That is the copy working: the
  build's facts were derived from a catalog neither side holds any more. The remedy is to rebuild
  on staging, then copy. The chained workflow copies straight after each build and never meets
  it; a manual copy-only dispatch can.

  A refusal exits 2, any other failure 1. The copy job must also set `DATABASE_URL` to the
  target, because the publish bodies' module imports `src/db`; nothing queries through it.

- `pnpm db:catalog-build start|finish <index|combos> [ok|failed]` writes the build ledger the
  copy reads (`catalog_builds`, migration 0074). `start` records the catalog fingerprint the build
  runs against and keeps the row's id in `CATALOG_BUILD_ID_FILE` (default `.catalog-build-id`);
  `finish` closes that row, with `CATALOG_BUILD_REPORT` as its report. A build that dies between
  the two leaves an unfinished row, and the copy refuses it.

  **A builder whose output is copied records ITSELF**, through `recordBuild`
  (`src/lib/catalog/builds.ts`): `db:seed:combos` starts its own row and finishes it `ok` or
  failed, and so do both index steps, `db:build:index` and then `db:build:staples`, so the
  staples row is the newest and a failed derivation leaves it failed. `db:build:staples` refuses
  to run at all unless the newest `index` row is a finished `ok`, so a staples run by hand cannot
  vouch for an index build that failed before it. Each step also stamps its PHASE first in its row's report
  (`phaseReport`), and `db:copy:index` accepts only a newest row whose phase is `staples`: between
  the two steps the newest row is an ok `index` phase over the PREVIOUS staples, and a copy then
  would publish a mixed generation. The staples row also INHERITS the index row's catalog fingerprint rather
  than reading its own, so a catalog refresh landing during the hours-long index step leaves the
  build vouching for the catalog it was derived from, and the copy refuses it. Every run, by hand
  included, leaves a newer row. Without that, a hand-run ingest that
  replaced the flags and died before the variants left an older `ok` row vouching for tables that
  had moved under it, over an unchanged catalog fingerprint, and the copy would publish them.

- `pnpm db:copy:combos [--dry-run]` publishes staging's combo build to production. It is NOT a
  table copy: it runs the ingest's own `publishFlagsIn` and `publishVariantsIn` against the
  target, with logging on, so production's `deck_data_changes` records the diff between ITS
  previous flags and the new ones on its own sequence, which is what its readers' `seen_seq`
  expects. The builders' floors (`classifierCollapse`, `variantsKept`) are re-checked on the
  source snapshot first.

- `pnpm db:copy:index [--dry-run]` publishes staging's commander index build to production: the
  commander and pair headers, both card lists, `format_staples` and `identity_composition`,
  replaced EXACTLY in one transaction. Exact because `readIndexGeneration` keys on
  `max(computed_at)`: a row only the target held, dated later, would pin that maximum and stop the
  copy retiring cached pages. Five rules sit inside that transaction:

  - **The target's `commander_scores` are cleared first**, by the builder's own clear
    (`clearPersistedScoresIn`, under `SCORE_INDEX_LOCK`), so no score outlives the index it was
    scored against, and a copy that fails rolls the clear back with everything else.
  - **The three `prose*` columns are left alone** on a row both sides hold. `db:copy:prose`
    installs them behind an input-hash check this copy does not make. A commander the copy
    deletes takes its sentence with it, which is right: the index no longer lists it.
  - **A pair only a target deck holds is REPORTED and DELETED, never fatal.** The copy is exact,
    so that pair's row goes with everything else the source lacks. Staging's builder sweeps every
    pair `canPair` forms, so a pair missing from it is one the app cannot form; a production-only
    index dispatch for it would last only until the next copy.
  - **The target's own labels must give the role sets the build's `label_*` were derived from**
    (labels everywhere plan, 2026-10-10). The index build records a `roleSetFingerprint` over every
    card an `ok` commander or pair lists in its ledger report (`labels=`, inherited by the staples
    row), and the copy recomputes it from the target's fresh labels and refuses on a mismatch. The
    copy never copies labels itself: a `list:` trial's labels stay on staging until judged, so an
    open trial the build read makes the copy refuse until it is judged and copied by `Card labels`.
    A build that wrote no `label_*` (labels under 90% of the inclusion mass) records `labels=none`
    and is not checked.
  - The floors re-checked on the snapshot are the builders' own: an `ok` commander exists, role
    targets reach `ROLE_TARGET_FLOOR` of the ok commanders and, when any pair is ok, of the ok
    pairs, the pairs reach `LEGAL_PAIR_FLOOR`, and
    `format_staples` is not empty (`index-copy.test.mts`). An empty composition is legitimate
    and is not a floor.

  Measured on two scratch branches of staging: 3,382 commanders, 892,874 support cards, 1,717 pairs
  and 447,232 pair cards copied and verified in 84s at 2.1GB resident.

- **The four catalog ingests hold the `catalog-ingest` lock for their whole run**
  (`withCatalogIngestLock`: `seed-sets`, `seed-cards`, `seed-printings`, `seed-prices`). It is a
  transaction-scoped advisory lock on a dedicated connection, never a session lock, because the
  Neon pooler runs in transaction mode. A copy's publish takes the same lock, so a copy never
  interleaves with a catalog refresh on the target: it waits, then re-reads the fingerprint.

- **The catalog is fetched ONCE and ingested into both databases from the same bytes** (plan
  `2026-09-28-card-data-replicate.md` §4a, Hugh's approval, 2026-09-28). `pnpm catalog:fetch <dir>`
  downloads Scryfall's sets list, both bulk files (index and body) and ManaPool's singles feed into
  `<dir>`, about 155MB in 10s, and writes `manifest.json`: each file's URL, byte length and
  sha256, and each source's `updated_at` (a bulk index's own, or, for the sets list and the price feed,
  the moment that source's own request started). With `CATALOG_FETCH_DIR=<dir>` set, every ingest reads those files instead
  of the network, through one seam per read (`fetchBulkIndex`, `streamBulkEntries`,
  `loadSetsPayload`, `fetchManapoolSingles`); unset, they fetch exactly as before, which is what a
  local `pnpm db:seed` still does. Everything after the read runs per database, unchanged: each
  side keeps its own upserts, its own `deck_data_changes` and its own stamp.

  Proved on two scratch branches of staging from one fetch: both ended with the same input
  fingerprint, the same 103,327 printings by `scryfall_id` md5, and the same 98,095 current prices.

- `pnpm db:catalog-sources verify|record [source ...]` guards a leg that ingests from an artifact,
  against the database `DATABASE_URL` names. `verify`, before any ingest, refuses a file whose
  bytes are not the manifest's, and a source OLDER than what this database last ingested, so a
  re-run of an old artifact cannot roll back what an ARTIFACT ingest recorded; a retry of the same
  artifact goes through as the no-op it is. An ingest outside the artifact path records nothing
  (a `Price refresh` dispatch, a local `pnpm db:seed*`), so after one, an older artifact can
  still be re-run over it: prefer a fresh `Catalog refresh` dispatch to re-running an old leg. `record`, after every ingest succeeded, writes each source's
  `updated_at` and hash to `catalog_sources` (migration 0075). Our own `catalog_refreshes` stamp
  cannot answer this: it moves on every ingest and every copy, and says nothing about how new
  upstream's data was. Both take the sources a run ingests, so a dispatch naming one ingest
  neither judges nor records the others. The rule is `manifestRefusal`, unit tested.

## Probes

Every `pnpm probe:*` script, its fixture discipline and what it proves lives in
[docs/probes.md](docs/probes.md). Three safety rules apply to every one of them:

- Probes never touch production.
- `probe:arrivals` deletes the given user's whole collection via `replaceCollection`; mutate on
  `local-dev` or a scratch branch, never anywhere else, and measure comparisons on staging.
- Never `pkill` or `killall` by pattern. Stop a dev server only by the exact PID you started,
  checked first with `ps -o pid=,comm= -p <pid>`.

- **`job=printings` alone is the sharp tool, and its blast radius is every set.** The ingest
  refuses to publish denominators from a run that skipped orphans, and skipping the oracle
  refresh is what produces orphans — so the two together used to blank `base_set_size` for
  the whole database and leave every set reading `not indexed yet` until a clean run, behind
  a green job. Since #704 the publish clears and fills in one transaction, so a refused run
  leaves the previous denominators standing and EXITS NON-ZERO instead. Dispatch `job=all`
  unless you have a reason not to; the run takes about a minute either way.
- **A `reversible_card` printing is ingested from its FACES**, since 2026-09-21. Scryfall gives
  that layout no top-level `oracle_id`, no `image_uris` and no `flavor_name` — all three sit on
  the faces — so the obvious read produces an FK orphan, and the ingest used to drop the whole
  layout. What that cost is a printing a player OWNS and the catalog denies: the art then
  resolves to the set's representative printing, which is a different collector number with a
  different picture, silently. All 82 that exist carry the SAME oracle id on both faces (one
  card printed on both sides, not two cards sharing stock), which is what makes face 0 an
  answer rather than a guess; the skip is kept for faces that disagree, which is a different
  thing and exists nowhere today. `skippedReversible` in the ingest report is therefore a
  narrow counter now, not a constant ~82.

- **The printings ingest also builds the token catalog** (`tokens`, `token_printings`, `card_tokens`;
  plan `2026-10-11-tokens-for-my-deck.md`), from the same `default_cards` pass: `src/lib/tokens/catalog.ts`
  holds the rules, `publish.ts` the transaction. A token is a `token` or `double_faced_token` printing
  (or a token filed as a `reversible_card`), never an emblem or art-series card; a card makes a token
  only through an `all_parts` entry with `component: "token"`, resolved through a token printing seen in
  the same stream. Tokens and their printings are UPSERTED and never deleted (ownership will reference
  them); `card_tokens` is an exact replace in the same transaction. Not a `cards` column, so the catalog
  fingerprint does not move and no copy is involved. The run REFUSES under a floor (`TOKEN_FLOORS`, about
  half of the 2026-10-11 measurement) and exits non-zero with the previous rows standing, and SKIPS
  cleanly when the tables do not exist yet, because production's migration applies in its next build and
  a refresh can reach it first. `pnpm check:scryfall` scans for a token printing and a card naming it,
  which the first-entry read cannot see.
- **`pnpm db:seed:prices` also prices tokens** (`token_printing_prices`, plan `2026-10-11-tokens-for-my-deck.md`):
  a feed row whose id is a `token_printings` id is written in the SAME transaction as the card rows, and the
  step skips cleanly when the token tables do not exist yet. **A token's link line names Mana Pool's own
  product, not Scryfall's printing**: the table stores the feed's `name`, `set_code` and `number`
  (`product_*`) because they differ from Scryfall's on 42% of priced token printings (a double-faced token
  card is `Soldier // Eldrazi`, `1-17`, under the single token's Scryfall id). `tokenManapoolLine`
  (`src/lib/tokens/price.ts`) builds the line and drops a number Mana Pool cannot place exactly (`1★`) to
  the name alone; `pnpm probe:manapool-token-link` is the proof, in a browser. A run that prices fewer than
  `TOKEN_PRICE_FLOOR` (1,400, half of the 2,919 measured) token printings against a POPULATED token catalog
  writes the card prices, writes NO token prices and exits non-zero: a collapsed id match would otherwise leave
  the table's newest `as_of` unchanged and every old token price reading as live. The same refusal applies when
  fewer than `TOKEN_IDENTITY_SHARE` (90%) of the matched rows carry Mana Pool's name, set and number (100% did on
  2026-10-11): a renamed feed field would otherwise erase every stored product identity.
- **Token ownership is recorded by the upload, in its own transaction** (`token_ownership`, `token_reads`; plan
  `2026-10-11-tokens-for-my-deck.md`, PR 3). `matchRows` names the token a row is from `token_printings` (never from
  a layout: emblems and art series are not tokens, and a token filed as a `reversible_card` is), the preview payload
  carries the per-token sums, and `writeUploadTokens` runs inside `replaceCollection` AND the ledger's
  `applyCollectionChange`, so a failing token write rolls the whole confirm back. **Three states, never two**:
  owned (a row), not owned (no row, and the account has a `token_reads` row), not known (neither). Only a confirmed
  upload writes the marker, including one that read an EMPTY list (a preview payload with no `tokens` at all, from before
  tokens were read, writes nothing: `recordUploadTokens`); a hand mark (`I have one`) never does, or one mark
  would turn every other token from unknown into not owned. Replace removes upload rows only (and, first, the player's joins for every token whose
  row it removes, since a held token's join is pre-rule); a hand mark an upload
  also reads becomes an upload row. The review screen's `skipped by design` count still includes tokens: they are
  not in `collection_items`.
- **A deck's tokens are read by `loadDeckTokens` and written by two actions** (`DECK_TOKENS_ENABLED`, staging on, production off;
  plan `2026-10-11-tokens-for-my-deck.md`, PR 4a). The makers are the deck's `deck_cards` UNION both commanders (a commander
  makes tokens too), joined through `card_tokens`; `assembleDeckTokens` is the pure half. **A held token is never drawn as joined**
  whatever its `deck_token_joins` row says, and every write that makes a token held also deletes ALL of the player's joins for it, in
  the same transaction: `I have one` and the Shopping row's buy tag (`setTokenHeld`), and an upload that reads it
  (`writeUploadTokens`). Owned means owned for every deck, and unmarking restores no join. Rules text
  is attached only to a token sharing name, colors and P/T with another in the same deck. The loader never throws (a failed read is
  `failed`, drawn as the group's own line), and the actions revalidate the deck page and the cart, never Home or `/decks`: a token
  moves none of their figures. `pnpm probe:deck-tokens` proves the queries on a scratch branch (docs/probes.md).
  **Shopping** (PR 5): a deck's joined tokens are the Tokens group LAST on its Shopping view (`TokensShoppingGroup`), and the buy
  box (`PriceStrip`) takes them in: its figure is what the link buys, a split line keeps the cards' cost apart from the tokens',
  and the link carries a line per token (`tokenShopping`, from the loader's own read). `summarisePrices`, `shoppingCount`, the
  status and the roll-up stay the cards' alone (pinned in `decklist.test.tsx`). The buy tag on a token row is the shipped tag as a
  button of its own: one press marks the token held, no confirm. A joined token whose maker has left the deck stays joined and
  says `from no card in this deck`, with only its remove press (a hand mark on it could be unmarked from nowhere, since the unmark holds the same maker rule).
  **Card details and About** (PR 6): from a deck, a card that makes one of the deck's tokens gets one line at the foot of the
  `In this deck` box (`TokenCardLine`, passed to `ProxyControl` as its `footer`): `Makes an Ally token · In Shopping`
  (or `· in your collection` when every token it makes is held) and a `Tokens ›` press that closes the sheet and scrolls to the
  group. It reads the deck's own tokens through the provider, so it is absent with the switch off, outside a deck and for a
  card no token comes from. The About entry `deck-tokens` follows `DECK_TOKENS_ENABLED` through `AboutSwitch` and is
  `since: 14`, the current version: a switched entry is announced when its switch flips, so the line **bumped nothing** and
  only re-pinned the content hash.
- **Each ingest stamps `catalog_refreshes`, and every cached list payload is keyed on it**
  (#705). That is how a refresh retires readers' caches: `revalidateUserLists` takes a user
  id and a weekly job has no list of readers, so the generation goes in the key instead and
  a stale entry is never asked for rather than hunted down. The DEPLOYMENT rides in the same
  key (`src/lib/cache/deployment.ts`), so a deploy retires every entry too, and no payload needs
  a hand-bumped version to stop the previous build's shape being served. The stamp is deliberately
  NON-FATAL — this workflow runs the seed scripts directly and never runs `db:migrate`, so
  a database without the table costs one refresh's staleness and a warning, not a red job
  after a successful ingest.
- The catalog refresh (`.github/workflows/catalog-refresh.yml`) runs 09:00 UTC DAILY and refreshes **both** `catalog-staging` and `catalog-production`, prices last. It is the one root every replicated job hangs off: `Combo refresh` and `Commander index` chain on its successful scheduled runs by `workflow_run`, never by cron spacing, because GitHub runs a cron hours late when it is busy (the Monday crons of 2026-09-28 ran at 17:27Z). A stale catalog is silent: collection CSV rows whose card is missing land in `unmatched` and are dropped, so a set that lands between refreshes simply appears not to exist.
- `pnpm check:copy-drift` fails when a design table still quotes a string the code stopped
  emitting, in PUNCTUATION or in WORDS. Two checks, and they are built for different drift.

  **Punctuation** was the original: `MARKS` is `[—:,.]`, and a quotation differing from the code
  in one of those and in nothing else is reported. That is what the em-dash sweep needed.

  **Words** was added 2026-09-19, after the `brew` → `draft` rename left sixteen stale quotations
  across four tables and the check printed `No design table quotes a form the code stopped
  emitting` over every one. A rename leaves the punctuation alone, so the first check cannot see
  it by construction. Review found them by reading, three rounds running.

  The word check compares PROSE only — a class string, a CSS declaration and a filename are not
  copy, and indexing them compared Tailwind against Tailwind — and it looks for the SHAPE OF A
  RENAME: the same words in the same places with one or two swapped. Not set overlap, which
  rewards a table for quoting extra context and flags every label-joiner. Eight words minimum:
  below that `upload your collection` and `in your collection` are one substitution apart and
  unrelated.

  **An EXACT match is checked across every candidate before any near match is taken**, and that
  rule is worth more than it looks. Without it a table quoting a shipped string VERBATIM is
  reported the moment a sibling ships one word apart — which three refusals do
  (`We couldn’t add/clear/fill those. The deck is unchanged.`), so two tables quoting `add`
  correctly were reported as stale copies of `clear`.

  **Allowlisting that pair looked like a fix and was the opposite.** It suppressed the symptom
  and blinded the check to that sentence permanently: a later rename of the string those tables
  really quote would never be reported. Fixing the matcher instead cleared three of the four
  rows AND surfaced real drift the fourth had been hiding — `synergy-discovery.md` still quoted
  `lastSlots.fillFailed`, a key deleted when two refusal strings collapsed into one. **Reach for
  the matcher before the allowlist; an entry that hides a bug hides whatever else that bug hid.**

  **A false positive is allowlisted in `scripts/lib/copy-drift-allowlist.mjs`, with its reason,
  and that is a deliberate act that shows up in a diff.** An exemption granted silently is how
  the next rename hides. A row there says "these two look alike to a machine and are unrelated",
  never "this drift is fine". One used to name `deck-tuning.md` as a table for a feature not yet
  built; it came out when #10 shipped, and the first run without it caught real drift in that
  table (`Nothing has changed.` against the shipped `The deck is unchanged.`).

  **Its own failure paths are pinned** in `copy-drift.test.mts`, and they were run before it was
  believed: the first version reported green over a reverted rename, because `prose` tested the
  raw span and rejected every sentence containing `${…}` or a semicolon. That is the same failure
  as the guard it extends, in the guard that was extending it. The property tables ARE the spec someone implements from and they quote copy
  exactly, so a table that has drifted tells the next reader to ship a sentence the app no
  longer says. It runs in CI beside the other checks: static, no server, no browser, about a
  second.

  It exists because the 2026-09-13 em-dash sweep spent FOUR consecutive review rounds on this,
  each round naming a different partial list. Every fix was right and every round found more,
  because a list assembled by reading has a tail. It found **13 stale quotations across seven
  tables** that three hand-built inventories had all missed, because each of those was scoped
  to one PR's diff while the drift came from another PR entirely.

  Eleven of the 13 were invisible to the check's OWN first version, which is the more useful
  lesson: it printed "no design table quotes a form the code stopped emitting" over rows that
  plainly did, and review found that, not the check. **Run a guard's failure path before
  believing its green.** `scripts/lib/copy-drift.test.mts` now pins one case per failure path,
  each written as the shape that defeated the parser; every one of them was confirmed to fail
  against the version it was written for.

  **Nothing is synthesised.** The first version put a dash back where the punctuation now is
  and searched for that; it reported 46 findings, every one false, having rewritten
  `plural(n, "card", "cards")` into `plural(n — "card", …)` and matched it through wildcards
  loose enough to absorb the difference. Instead both sides reduce to their WORDS — `${…}` and
  every swept mark dropped — and a quotation is a finding only when its words match a shipped
  string exactly while its punctuation does not.

  **It reads components, not only `src/lib/copy`.** The convention here is copy-in-definitions
  and the app does not fully obey it, so `src/components/**/*.tsx` is scanned too — including
  JSX TEXT NODES, which are not string literals and which no amount of careful literal-scanning
  would ever see. `review-screen.tsx` draws its matched-count label that way, and two tables
  quoted the pre-sweep form of it.

  **Three parsing mechanics, each paid for by a miss.** Template literals nest, so an
  interpolation is skipped as a balanced `${ }` region rather than closed on the next backtick.
  A sentence assembled across `+` is folded into one string, because that is one sentence on
  screen and a table quotes it whole. And a table's quoted spans are paired by PARITY, never by
  regex search: a search-based matcher re-pairs from the next delimiter whenever a span falls
  outside its length window, and from there it reads the GAPS BETWEEN code spans as though they
  were the quotations. That one is why the first version reported clean over real drift.

  Two exclusions are deliberate. A quotation whose only extra mark is a LEADING dash is the
  component's label-joiner, not drift: `resolution-expander.tsx` renders `— {copy.prompt}`
  where `prompt` carries no dash, and those joiners were ruled deliberate on 2026-09-13. And
  prose that makes a CLAIM about the copy without quoting it — a module header saying
  "transcribed verbatim from the handoff" — is invisible to any string matcher; four of those
  were found by grepping for the claim instead, and no check covers them.

- `pnpm check:tokens` fails when a component reads a CSS custom property that no theme
  declares. It reads every `var(--x)` in `src/**` — including the interpolated
  `var(--${a ? "b" : "c"})` form, where it resolves each string literal in the expression —
  and compares them against every `--x:` in `globals.css`, plus the tokens components declare
  for their own subtrees (`--row-bg`, `--zoom-w`) and the ones `next/font` declares as
  `variable: "--font-plex-mono"`. Static, no browser, about a second.

  An unset custom property **fails silently by design** — that is what CSS does with no
  fallback — which is the whole hazard. `browse-figure.tsx` built a card-art wash from
  `--surface-2` and `--surface-3`; the palette has never had either (they are
  `--surface-raised`, `--elevated`, `--surface-sunken`), so five card tiles rendered as VOIDS
  with a count badge floating over empty space. TypeScript does not read class strings, the
  linter does not resolve CSS variables, and jsdom computes no styles, so typecheck, lint and
  6,676 tests all passed. A screenshot is what found it, which does not scale to 35 figures.

  Its first run across all 482 source files found `--base` in `review-changes.tsx` and
  `commit-sheet.tsx`, declared by no theme: the phone's sticky action bar on
  `/decks/[id]/changes` had no background at all and content scrolled visibly under it. Three
  design-table rows still specified the dead token and were swept in the same pass — nothing
  else catches a table that spells a token the code stopped reading, because `check:copy-drift`
  compares copy strings and this one reads `src/**`.

  Tests are skipped outright rather than exempted from reads only: a token declared in a test
  fixture is not declared for the app, so a component reading one must still be reported.

  **What it is about is SILENCE**, and two rules follow from that — both of which the first
  version got wrong, and review caught. A read carrying a FALLBACK is a parameter with a
  default, not a miss: `var(--bob-duration, 3s)` is `.anim-bob` letting a caller tune it, and a
  typo inside a fallback renders visibly at the fallback rather than invisibly at nothing. And
  a token a component sets on its own element is declared for THAT FILE'S subtree only — the
  first version unioned every file's declarations, so any component could read `--row-bg` with
  the property unset in its subtree and still pass.

  `globals.css` is scanned too, and is the one asymmetry: it may resolve against any
  component's declaration, because a rule selects by class and the element carrying that class
  is drawn by a component — `art-wash.tsx` sets `--art-wash-reduced-opacity` inline and the
  stylesheet reads it back under `prefers-reduced-transparency`. The reverse does not hold.
  Its own misspellings are still reported.

  `scripts/lib/tokens.test.mts` pins one case per failure path, each written as the shape that
  defeated an earlier version — because every failure mode here is a SILENT PASS, the same
  hazard as the bug it catches.

- `pnpm check:border-collision` fails when a `.tsx`, `.ts` or `.css` file under `src` uses a bare
  `border-r` or `border-b`. The mana palette is registered as theme colors named `w`, `u`, `b`,
  `r`, `g`, and Tailwind 4 turns each into a color utility, so `border-r` and `border-b` are
  ALSO `border-color: var(--r)` / `var(--b)`, and the color rule is emitted after the width rule
  and wins: a neutral divider paints mana red or black. Measured by compiling the real stylesheet
  against every utility prefix with each of the five letters: those two are the only ones that
  collide (`border-t`/`border-l` have no color token, and `rounded-r`/`rounded-b` take no color).
  A bare one needs a SIDE-SPECIFIC color beside it (`border-r-[color:var(--border)]`); a generic
  `[border-color:...]` or `border-{token}` is emitted earlier and loses. The override must carry
  the SAME VARIANT CHAIN as the token it fixes, because variant rules are emitted after the plain
  ones: `md:border-r` repaints red from `md` up over a plain override. Static, no browser, and
  `scripts/lib/border-collision.test.mts` runs the whole check against the shipped tree inside
  `pnpm test` as well as in its own CI step. It first shipped as #1272 (44 files fixed at once);
  the second pass added the variant rule and the `.ts` and `.css` files, and found none
  outstanding: 90 bare tokens in `src`, every one overridden at its own variant.

  **A side override repairs one side only** (#1440, bug 3). The bare utility is `border-color` on
  ALL FOUR sides, so a bare token whose class string also draws another side (`md:border` beside
  `md:last:border-b`, or `border-b` beside `border-l`) is reported even with its own side
  override, unless that other side has a color of its own or a zero width takes it back. The
  repair is the width alone (`border-b-[1px]`). The first run of that rule found two carets in
  `shell/nav.tsx` painting a side in mana black.
- `pnpm check:collection-routes` fails when a route renders a figure read out of
  `collection_items` and the collection replace does not invalidate it. It walks every
  `page.tsx`, follows its imports through `src/`, and compares what it finds against
  `COLLECTION_ROUTES` in `src/lib/collection/invalidate.ts`. Static, no server, no database.

  It exists because that list was assembled by READING and was wrong three review rounds
  running, each round naming a route the previous one had missed — `/collection/replace`,
  then `/decks/[id]/import`, then `/decks/new`. The sweep found a fourth nobody had named
  (`/decks/import`), which is the whole argument for computing it: a list built by reading has
  a tail.

  It checks the `dynamic` flag as well as the path, and that half matters more than it looks.
  `revalidatePath` needs its second argument for a route with a `[param]` and **silently does
  nothing without one**, so a path that is present but flagged wrong is invalidated in the
  code review's eyes and not in Next's. All three of the check's failure paths were run
  against it before it was believed: a dropped route, a wrong `dynamic` flag, and a stale
  route that no longer reads the collection.
- `pnpm check:db-pool` fails when the built server carries its own copy of the Neon driver's `Pool`.
  Run it after `pnpm build`; CI does. `db.transaction` (drizzle-orm/neon-serverless) checks a
  connection out of the pool only when `client instanceof Pool`, with `Pool` from ITS copy of
  `@neondatabase/serverless`. Turbopack used to bundle a second copy for `src/db/index.ts`, so the
  check was false and a "transaction" ran its `begin`, its statements and its `commit` on whatever
  pooled connection was free: connections went back to the pool inside an open repeatable-read
  snapshot, and later writes read a world that was seconds old (zero-row UPDATEs of rows committed
  300ms earlier, "deck not found", `40001`). Measured on a production build, 12 concurrent
  two-statement transactions kept one connection 2 or 3 times out of 12 before the fix and 12 of 12
  after. `serverExternalPackages: ["@neondatabase/serverless"]` in `next.config.ts` is the fix; the
  check reads the build, because nothing in source shows it. `tsx` scripts load one copy and were
  never affected.

- **Home and `/decks` cache their whole payload per reader, keyed on a stamp the DATABASE
  moves** (Performance PR 6). `user_data_stamps` holds one counter per reader, and every
  per-user table those two pages read carries the `user_data_touch` constraint trigger, which
  bumps it at COMMIT. `cachePageForUser` (`src/lib/cache/page-cache.ts`) reads the stamp fresh
  on every request and puts it in the key, beside the catalog generation, the deployment, the
  switches and, for Home, the UTC date the Ready-to-build pair rotates on. So a write
  invalidates the pages by construction, whoever wrote it: an action, an `after()`, the render
  path's own score write, a job or a script. Nothing has to remember to call anything, which
  is the point: the tag approach had eleven actions writing those tables without clearing it.

  **Deferred to commit, because an immediate stamp can deadlock.** A per-statement trigger
  takes the reader's stamp row at the first statement and holds it, so two transactions for
  one reader that also lock two rows in opposite order form a cycle through the stamp. At
  commit it is the last lock a transaction takes, and nothing in this schema is deferrable, so
  a transaction waiting on a stamp waits on one that is already committing.
  `probe:list-stamp` shows both halves: the interleaving commits with the shipped trigger and
  deadlocks with `set constraints ... immediate`.

  A degraded ranking is served and never stored (`store: false`), because it recomputes on
  every visit by design. A stamp that cannot be read (a preview deploy runs no migrations)
  renders uncached rather than wrong.

  **It ships behind `LIST_CACHE_ENABLED`** (Hugh, 2026-09-27): `'true'` on staging, unset on
  production until he has watched it. Off means OFF: `cachePageForUser` reads no stamp, stores
  nothing and runs the page exactly as before the cache existed. The triggers run either way.

  **The runbook, and its ORDER is the point:**

  - **A cached page looks stale:** turn `LIST_CACHE_ENABLED` off (a redeploy), or Vercel
    Instant Rollback to the deployment before the cache. Nothing in the database changes.
  - **Writes are failing on a `user_data_touch` trigger:** FIRST turn the cache off or roll back,
    THEN run `pnpm list-stamp:triggers disable` against that database. Never the other way
    round: disabling the triggers while cached code is live freezes every reader's stamp, and
    every cached page is served stale after the writes that should have retired it.
  - **Never drop `user_data_stamps` while the triggers exist.** Every write to a table carrying a `user_data_touch` trigger (`pnpm list-stamp:triggers` reads the live set)
    would then fail on the missing table.
  - **Permanent removal is a follow-up migration**: drop every `user_data_touch` trigger (read the live set, never a count), then the function,
    then the table. `list-stamp:triggers` is the emergency lever, not the way out.
  - **Coming back:** `list-stamp:triggers enable`, then a deploy with the switch on. A stamp that
    sat still while writes landed says nothing about them, and a new deployment starts every
    reader on a fresh miss (the deployment is in the key).

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

- **Feature switches resolve per reader** (admin plan PR 4, brief `2026-10-11-admin-ui.md`). Each `*_ENABLED`
  variable keeps its meaning and is the default; `flag_overrides` holds overrides on top of it, app-wide, per group
  (`flag_groups`, one group per account in `flag_group_members`) or per account. Per switch: the variable set to the
  literal `off` wins outright (the KILL SWITCH: no override can raise it, so a bad override is always beaten by a
  redeploy), then the account's override, then its group's (OFF wins if two apply), then app-wide, then the variable.
  A `plumbing` switch (`LIST_CACHE_ENABLED`, `RATE_LIMIT_ENABLED`, `LABEL_ROLE_COUNTS_ENABLED`, the role basis
  scores are counted by, and since admin PR 8a `ABOUT_SHEET_ENABLED` and `HOW_IT_WORKS_ENABLED`, by Design's answer
  to the brief's open question 2) takes the app-wide override alone. A compound switch names its parent as `needs`
  in the registry, and a switch is tagged `model` exactly when turning it on can let a reader spend (the Analysis
  tab and Swap tools are parents of spending switches); `src/lib/switches/flags.test.ts` holds both to the flag
  functions. An app-wide override still flips one without a deploy, so its readers
  are handed the resolved env too, and a cache whose payload depends on it carries it in its key:
  `discoveryKey` and `commanderRankingsKey` take the basis, the stored scores' `writer_version` carries it
  (`scoreWriterVersion(env)`), and `cachePageForUser` keys on every switch. The registry
  (`src/lib/switches/registry.ts`) is the closed set the table is checked against, and `registry.test.ts` fails when
  `src/` reads a variable it does not name. `resolveSwitchEnv(userId)` reads the overrides through a 30-second
  per-instance memo (an admin write, `src/lib/admin/switch-writes.ts`, commits and then clears its own instance's
  memo; the proxy's memo, which feeds every page's switches, catches up within the 30 seconds), falls back to the
  environment alone when the read fails, and returns an env-shaped object every
  flag function takes as it takes `process.env`; parents stay checked inside the flag functions, so a child override
  never raises its parent. Every page, layout, action and route handler decides a switch from
  `requestSwitchEnv(userId)` (a page that decides switches outside its load resolves once and passes the env in), and
  `cachePageForUser` puts every resolved switch in its key and hands the load that same env.
  **Every flag function, and every reader under `src/` that decides a switch, REQUIRES its `env`**, so leaving it out
  does not compile: the claim model (`loadAvailability`'s `opts.env`, `loadDeckBuyRows`) and every wrapper that
  starts it, `chainArt` (`DECK_PRINTINGS_ENABLED`), the profile store (`StoredProfileDeps.env`, built by
  `requestProfileDeps(env)`), and the role basis, notices, synopsis, discovery and About readers. A script, a probe or
  an eval has no signed-in reader and passes `process.env` itself, saying so. `loadFriendSpares` runs each friend's
  claim model under that FRIEND's switches (`resolveSwitchEnv(friend)`), and the proxy keys About's cookie on the
  reader's resolved entries, so a flip retires exactly the readers it changes. `check:list-cache` knows the two
  override tables reach a cached page through its key alone, and fails if any loader but `page-cache.ts` and the
  resolver it goes through (`src/lib/switches/request.ts`) reads them.
  What still compiles is `fooEnabled(process.env)`, so `pnpm check:switch-reads` (`scripts/lib/switch-reads.mjs`, in
  CI and inside `pnpm test`) fails any code under `src/` that hands the `process.env` OBJECT on (an argument, a
  spread or copy, a `?? process.env` fallback, a variable, a prop), outside `src/lib/switches/`, tests and its
  `ALLOWED` list (a file, its approved uses and a reason a reviewer can check: `src/proxy.ts`'s signed-out request).
  It also fails every PARAMETER DEFAULT of `process.env` (`env = process.env`, destructured in a parameter included)
  but the `keep` entries in `DEFAULTS_PENDING`, each of which reads the environment on purpose and says why:
  `envForPageBasis` (the environment's kill switch) and the model stand-ins' settings readers (`intake/stub.ts`,
  `stubTheReadDeps`, `swaps/fits-read-stub.ts`, `synopsis/stub.ts`), which read `NODE_ENV` and their own `*_LIVE` /
  `*_STUB*` knobs, never a registry switch. Each approved use is pinned by a FINGERPRINT with a count, never a line
  or a per-file total: `<enclosing function, method or module const>:<use>` (`clerkMiddleware():fallback`) and
  `<scope>:default:<param>`, so swapping an approved use for a new one elsewhere in the file fails, and so does a
  listed fingerprint that is gone. A member read and a destructuring read are not findings (a rest element,
  `{ ...e } = process.env`, is a copy and is one); a binding default in a variable
  (`const { env = process.env } = opts`) is a finding. It cannot see the environment reached through anything but
  `process.env` itself, or an env built by hand from member reads.

- **Social foundation** (plan `boards/plan-social-foundation-2026-10-12.md`, Hugh's rulings 2026-10-12), behind
  `SOCIAL_FRIENDS_ENABLED` (`'true'` on staging, unset on production; dark until the first UI PR). Friends are added
  by a single-use invite link or its QR code and never by search; a friendship is two directed `friend_links` rows,
  written in user id order so two readers' stamps lock the same way round; a pod's members are added only from its owner's own friends,
  and a pod passes to the longest-standing member when the owner leaves (so after a hand-on, a member need not be
  the new owner's friend: a pod grants no visibility by itself, and every read that uses one also joins the
  friendship). **Every cross-user read lives in `src/lib/social/`** and joins the
  grant on the session's viewer in the same statement; client payloads carry `social_profiles.public_id`, never a
  Clerk id. `pnpm check:social-reads` fails when a module under `src/` outside that directory touches a social table,
  by schema import, through `db.query`, or by name in raw SQL, and runs against the shipped tree inside `pnpm test`; `pnpm probe:social` proves the
  answers on a scratch branch.

  **Spares are view-only and shared per pod** (Q3, Q12): `loadFriendSpares(viewer, oracleIds)` reads the grants (the
  friendship, the friend's `pod_spare_shares` grant, the friend's membership of that pod and the viewer's, in one
  statement), then runs each granting friend's own claim model, at most four at once, each in a repeatable-read
  snapshot that re-checks that friend's grant first, so a grant revoked mid-read reads nothing. A spare is
  `owned − hard − soft`, so a copy only a draft wants is not spare.
  **A friend's write never moves the viewer's stamp**, so friend data stays out of cached payloads by default; a cached
  page that must draw it puts `await friendGeneration(viewer)` as a bare element of EVERY `cachePageForUser` key on that
  page, for that call's own reader, and `check:list-cache` fails a cached page whose loaders reach `src/lib/social/`
  (the switch module aside) without it. A cached page that draws spares must ALSO carry each friend's resolved
  switches in its key, because `loadFriendSpares` runs each friend's claim model under `resolveSwitchEnv(friend)` and a
  friend's override flip moves no key the viewer's page has; `check:list-cache` refuses `spares.ts`'s import of the
  switch snapshot on a cached page's path until that key exists. `pnpm measure:friend-spares`
  times the per-friend cost (read-only).

- **Deleting an account deletes everything the app holds for it** (Hugh's ruling Q8, 2026-10-12). Clerk's
  `user.deleted` webhook (`POST /api/clerk-webhook`, public in `src/proxy.ts`, authorized only by the Svix signature
  `verifyWebhook` checks against `CLERK_WEBHOOK_SIGNING_SECRET` on every call; with the secret unset it answers 503 and
  does nothing) runs `purgeAccount` (`src/lib/account/purge.ts`) in
  ONE transaction. The social half first (`purgeSocialIn`): it locks in the order every social write does (its
  invites, then the pods it owns or is in, then its friendship rows, which `addMember` also holds while it adds),
  leaves every pod the way a player leaves it (an owned pod passes to its longest-standing member), and deletes both
  directions of every friendship, every invite naming the account and the profile. Then every other table by
  `user_id` in `PURGE_ORDER` (children of `model_calls` before it). Then the data stamps of the account and its
  friends, locked LAST in user id order (where every writer takes them, at its commit), and
  `set constraints all immediate` so the deferred stamp triggers fire before the account's own `user_data_stamps`
  row is deleted, or commit would write it back. Kept on purpose: what an ADMIN did (`admin_events.actor_id`,
  `admin_settings.updated_by`, `flag_groups.created_by`, the flag rows' `added_by` / `updated_by`), the admin's own
  audit trail; the account's own switch overrides and group memberships go. It runs whatever the switches say: deleting a deleted
  account's data is never a feature to hide. It is idempotent, so a Clerk retry is harmless.

  **Coverage is computed, not listed**: `src/lib/account/purge.test.ts` reads `schema.ts` and fails when a table
  holding an account column is neither purged nor kept with a reason, and when a child of a purged table has no
  `on delete` the order does not cover. A new per-user table therefore fails CI until the purge handles it.
  `pnpm probe:purge` searches every text column the DATABASE's catalog lists for the account's id by value and
  proves none holds it afterwards, on a scratch branch.

- **The wishlist** (scope §2, Hugh's rulings Q7 and Q9, 2026-10-12), behind `SOCIAL_WISHLIST_ENABLED`, which stands
  alone (`'true'` on staging, unset on production; dark until its UI PR). `wishlist_items` holds cards wanted
  outside any deck at CARD level (any printing), with `quantity` the copies wanted IN ALL. A line is GOT once the
  collection holds that many, derived on every read and never stored, and it stays until the player clears it.
  The owner's own rows are read and written in `src/lib/wishlist/`; a FRIEND's wishlist is visible (Q7) and is read
  only through `src/lib/social/wishlist.ts`, which joins the viewer's friendship row in the same statement and
  returns the card, the wanted count and got, never an owned count. `pnpm probe:wishlist` proves it on a scratch
  branch.

- **Opponents in the game log** (scope §4, Feature C; Hugh's ruling Q15), behind `SOCIAL_GAMES_ENABLED`, which requires
  `SOCIAL_FRIENDS_ENABLED` (`'true'` on staging, unset on production; dark until its UI PR). `deck_game_opponents`
  holds the seats of a game, seat 1 upward and fewer than its pod size: a friend, a friend's deck, or anyone by a
  catalog commander and an optional label, plus an optional `won` on a loss (one at most). The rows are the game
  owner's and SNAPSHOT the friend's name and the deck's name and commanders at log time, so every read draws the
  snapshot and none depends on a friend's live rows or cache. `logGame` refuses opponents while the switch is off, and
  resolves a friend seat in the game's own transaction: a friend's deck is offered and seated only through the
  viewer's own friendship (`src/lib/social/games.ts`, held FOR SHARE until the game commits), and a pod only seats its
  members who are also friends. `pnpm probe:game-opponents` proves it. The live friend link is never sent to a client and is
  UNLINKED by the account purge (`SOCIAL_UNLINKED`), keeping the snapshot. The label is player-typed and no prompt
  reads the table (`game-opponents.test.ts` pins who may). `summarizeMatchups` splits a deck's games by commander,
  color identity and friend as `GameSummary` cells: counts with denominators, no rate.

- **Security headers and request counting** (payments scope PR S, `boards/scope-payments-2026-10-13.md` §5.8).
  `next.config.ts` sends, on every path, `Strict-Transport-Security` (one year, no `includeSubDomains`, no
  `preload`), `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` and a `Permissions-Policy` that leaves the
  camera to this origin and denies microphone, geolocation, payment and USB (any directive not named keeps its default), all built in `src/lib/security/headers.ts`. The **Content-Security-Policy is REPORT-ONLY**
  and production-only: an enforced policy written blind would take the app down, so the reports
  (`POST /api/csp-report`, public in `src/proxy.ts`, logs a directive, an origin and a page path per violation and
  answers 204) are the measurement the enforced policy is written from. It allows what `src/` loads today (Scryfall art
  and symbols, Clerk's host read out of the publishable key, `'unsafe-inline'` until a nonce is wired through the proxy).
  Read the reports in the Vercel logs (`[csp]`) for a week before enforcing, and check Clerk's hosted pages, the
  service worker and the manifest on staging after any change to the policy.
  `rate_hits` counts hits per player, bucket (`card-detail`, `draw-fields`) and fixed window (`src/lib/rate/`), written
  by `observeHit` in `after()` behind `RATE_LIMIT_ENABLED` (a plumbing switch). **Observe-only**: it logs
  `[rate] would refuse ...` and refuses nothing; the limits are provisional until those logs say what a real reader does.
  Enforcing is a separate change. The table is purged with the account.

- `pnpm check:list-cache` fails when Home or `/decks` reads a per-user table the stamp does
  not cover. It COMPUTES the tables read by following both pages' imports through `src/lib`
  (never `src/components`, which query nothing), and collects every table named by its
  Drizzle binding or by name in raw SQL. The raw half is not optional: `card_assignments`,
  `deck_locks`, `deck_proxies` and `pull_releases` are named only in the claim model's SQL,
  and a binding-only scan passes a page that goes stale on a pull. A table is per-user when
  its own columns carry `user_id`, `deck_id` or `version_id`. The triggers are read out of the
  migrations in the order they apply, a later drop retiring an earlier create, and a trigger
  that is not `DEFERRABLE INITIALLY DEFERRED` does not count. Its failure paths are pinned in
  `scripts/lib/list-cache-tables.test.mts`, which also runs the whole check against the shipped
  tree, so CI runs it inside `pnpm test`. Static, no server, no database.

- `pnpm pull:staging` copies a player's real decks and collection from **staging** into a local
  database, so a browser probe measures the decks that actually get played rather than a fixture
  built by a script that never buys, never commits and never finishes one. It is the answer to
  the gap that let the card mark ship drawing nothing in the deck's card view: every signed-in
  surface is verified against whatever the fixture account happens to own, and no agent can sign
  in as Hugh.

  **Only the Clerk identity changes.** Every surface reads by `user_id`, so re-owning the rows to
  a local account leaves the data — the long deck names, the contested copies, the decks with
  three Game Changers and the decks with none — exactly as it is on staging.

  ```
  PULL_TARGET_URL=<local-dev> PULL_TARGET_BRANCH=br-… pnpm pull:staging [--dry-run] [--replace]
  ```

  **ONE WAY, AND IT FAILS CLOSED.** Source and target are separate variables
  (`THE_99_NEON_STAGING_DIRECT`, `PULL_TARGET_URL`), the target is never defaulted, and the
  caller must NAME the target with `PULL_TARGET_BRANCH` — checked against the branch the target
  actually reports, before anything is deleted. "Not the source" is not the same as "safe to
  delete from": a pasted or mistyped URL naming some other database passes a difference check
  and destroys what it finds. Naming it means a typo no longer matches and the run stops.

  The same-database guard compares `neon.branch_id`, not the URLs and not
  `system_identifier` — local-dev is a BRANCH of staging's project, so the cluster identifier is
  byte-identical on both and would wave the run through.

  **Whose decks:** named with `PULL_FROM_USER_ID`, or inferred only when the source holds decks
  for exactly one account. "The account with the most decks" is a silent choice on a shared
  database with ties broken by the planner. A named account that owns nothing is refused before
  any target write, because every read would come back empty and the run would delete the
  target's snapshot and report success.

  **REPLACING IS OPT-IN.** A run whose target account already holds decks REFUSES; `--replace`
  is how a caller says they meant it, and the common case — a fresh fixture account — has no
  destructive path at all. That is a scope decision rather than a guard: three review rounds ran
  on this file and every finding was about the delete, so the delete stopped being the default.

  **With `--replace` it REPLACES rather than merges** — a merge leaves decks from an older snapshot standing
  beside the new ones and quietly makes the fixture a thing that never existed on staging. Takes
  `--dry-run`, which prints the counts and writes nothing. It is a SNAPSHOT: re-run it before a
  measurement that matters.

  **Both ends are transactional.** The source reads are one `repeatable read` transaction, or
  they combine instants — a commit landing between the deck read and the version read produces a
  deck list that never existed. The target's delete and every insert are one transaction too, or
  a failing insert leaves the old snapshot deleted and a PREFIX of the new one behind. There is
  no `on conflict do nothing`: a conflict means the target already holds that id, probably under
  another user, and skipping the parent would attach these children to a stranger's deck.

  Inserts are batched 500 rows to a statement, because the first version issued one per row over
  ~6,400 rows and did not finish inside two minutes — the cost here is round trips to a
  serverless Postgres, not work.

- `pnpm fetch:mana` downloads Scryfall's mana symbols into `public/mana/` and rewrites the
  manifest the renderer checks before reaching for one. The five WUBRG files the color filter
  draws came from the same place; this is that set extended to the 59 symbols a mana cost can
  contain, filtered on Scryfall's own `appears_in_mana_costs` so tap, energy and loyalty never
  land here. The manifest exists because that list GROWS: a set with a new symbol arrives in the
  daily catalog refresh while these files move only when someone runs this, so the large pip
  falls back to a lettered disc for a symbol it has no art for rather than drawing a 26px hole.
  The script asserts per symbol that its slug equals Scryfall's own filename, which is the one
  way a rename would otherwise ship as a silent 404.

- `pnpm build:mana-sprite` rebuilds `public/mana/sprite.svg`, the ONE file every pip draws from,
  preloaded in the head of every document by the root layout (Hugh, 2026-09-28: pips popped in,
  because a symbol drawn as a CSS background is fetched only when its pip paints). It is a CLASSIC
  sprite: every symbol in its own 100-unit square cell of one row, 10 apart, and a pip picks its
  cell with `background-size` and `background-position` in percentages (`manaSpriteBackground`),
  which hold at any box size. NOT SVG `<view>` fragments, which was the first build: a fragment
  changes what the image shows but not its intrinsic size, so `contain` drew the whole sheet into
  every pip as a thin strip, in Chromium and WebKit alike, with markup identical to a working build.
  `fetch:mana` runs it after writing the files; run it by hand after editing one.
  `mana-sprite.test.ts` fails when the committed sprite is not the build of the committed files, or
  holds a cell for anything but the manifest's slugs; the build and the reader share one sorted order.

- **`/discover` ships whole rows for its first window only** (list payload plan, PR 3). The page
  cuts every row outside its URL's first 25 down to the list columns (`cutToWindow`), and the rest
  of each row's draw fields arrive from `GET /api/discovery-fields?sort=&b=&s=` (`b`, the role basis the page's
  payload was counted by, so a later switch flip never mixes bases) — signed in, at most
  `MAX_FIELDS_BATCH` (200) slugs, answered `private, no-store` from the same cached payload the
  page reads (`loadDiscoveryPayload`), so the two cannot disagree about a row. The window is cut
  at the request and never stored: the cache entry stays keyed on the sort (and the role basis) alone. `probe:payload`
  holds what ships to 0.3MB (the worst account measured 0.253MB for `fit` and 0.133MB for `new`,
  against 1.104MB for the whole entry), and fails with every row shipped whole.

  **The server's window must be the client's.** The page finds its first 25 through
  `lib/discovery/window` — the same search, set, order and colour steps the view runs — so a row
  the view draws on arrival always arrived whole. A row it wants and does not have holds the list
  under `aria-busy` with the previous rows standing, and `Show more` goes busy and ignores a press;
  no new visuals (Hugh, option a).

  **The background fetch never renders.** The loop (`ui/use-withheld-fields.ts`, shared with
  `/collection` since PR 4, and `useDrawFields` wraps it) lives outside React state: one
  batch in flight, the reader's waiting rows first, the rest after `requestIdleCallback`, and a
  render only when a batch lands a row the reader is waiting on. A link click, the Navigation
  API's `navigate`, `pagehide` and unmount abort the batch in flight; a `router.push` away is seen
  only at commit.

  **Measured on the slow profile, the batches cost the next navigation nothing**: pressed at the
  same moment after landing (20s or 30s), `/discover` → `/commanders` reads 1.3s on main and on
  this build, with a batch in flight or with the route blocked. What DID move is WHEN a reader can
  press. The page's document went from 1.41MB (~15.5s to arrive) to 528KB (1.6s), so the page is
  usable at ~7.5s instead of ~17.7s, and a press that early queues behind the app's own startup
  downloads (its JS, the fonts, and at the time Clerk's prebuilt UI, no longer fetched since `prefetchUI={false}` on 2026-10-12) and arrives at ~24s. That is startup
  contention, identical with the fields route blocked, and not this feature's cost. It also means
  a harness that presses "2s after the router exists" compares two different moments on two
  builds with different load times; press at a fixed time after landing instead.

- **`/collection` ships whole cards for its first window only** (list payload plan, PR 4), the same
  shape as `/discover`'s and through the same loop. The page reads its URL (`q c t s avail sort
  dir`), finds the first 200 with `lib/collection/window` (`parseBrowseParams`, then the pure
  `filterCards` and `sortCards` the browser runs), and cuts every other card to the columns a
  filter, a search or a sort reads (`cutCollectionWindow`). The art, the facts and the combo
  partners (`COLLECTION_DRAW_KEYS`) arrive from `GET /api/collection-fields?ids=` in batches of up
  to 200 oracle ids, read from the same cached list the page reads (`loadCollectionList`: one
  loader for both, because the data cache keys an entry on the function it wraps). `printedName`,
  `layout` and `manaCost` stay on every card. The browser parses its own first render with the
  same `parseBrowseParams`, so the cards it draws on arrival are the ones shipped whole. The page
  cuts through `pageWindowIds`, which JOINS the availability it reads beside the cached list first:
  that list carries none, and `?avail=` filters on it, so a cut over the bare list called every
  card free and drew a busy list on every availability URL (the pre-open pass found it).

  **A withheld card is marked by the decoder** (`withheld: true`, from the wire card's own shape),
  never by the fields present on a row afterwards, because a printing pick lays an `imageUri` over
  a row whether it was drawn or not. Fetched fields sit UNDER the row, so a pick's art wins, and
  they are held against the list the page decoded (`served`), not the pick-patched one, or every
  pick would drop them. A reveal or a filter reaching cards whose fields have not landed keeps the
  cards already drawn under `aria-busy`, and `Show more` ignores a press while it waits; no new
  visuals, as on `/discover`. `probe:payload` holds the shipped wire to 1.05MB (0.959MB measured,
  153.6KB gzipped, against 1.122MB with every card whole).

  **Its grid's art waits for the page**, except the first screen's: once the server draws the grid
  (`?view=grid`, or a desktop default), a lazy img still starts on the HTML parse, and on the slow
  profile ~2.4MB of art landed before hydration and held the page at ~20s against ~6s. The tile
  draws `HydratedImg` with the first `GRID_EAGER_TILES` (4) eager; the server cannot know the
  width, so that is a fixed count rather than columns times rows. 4 is measured: it hydrates as
  fast as the bare page at both widths, where 12 cost ~4.7s at 1300.

- `pnpm db:seed:combos` ingests Commander Spellbook into `spellbook_variants`,
  `spellbook_variant_cards` and `card_bracket_flags`. **The sweep runs BEFORE the bulk file**,
  and that order is the whole design: `/estimate-bracket` answers per batch of 600 cards at 80
  requests a minute and returns Scryfall oracle ids directly, so it resolves without a name
  index at all — the plan's whole name-resolution step turned out to be unnecessary and was
  dropped. The bulk file is a SINGLE 656MB JSON document, so it is parsed incrementally rather
  than read into memory; the parser throws on truncation rather than silently ingesting a
  prefix, which is the failure a streaming parse otherwise makes invisible.

  **The publish is two transactions, flags then bulk**, and it refuses rather than publishing a
  partial ingest. Per-source collapse FLOORS are checked first — `mldFromSweep` 30,
  `mldFromRule` 20, `extraTurnFromSweep` 23, `extraTurnFromRule` 26, `sweepResolutionShare`
  0.5, `variantsKept` 53,000 — every one measured on the first real run rather than guessed —
  and `tutorFromRule` 209, half the 419 counted on staging's catalog when the column was added.
  A run under any floor leaves the previous tables standing and exits non-zero, because a
  half-ingested combo index is indistinguishable from a complete one to every reader. The
  classifier floors are `classifierCollapse`, a pure function with one test per floor, rather
  than checks inline in the ingest where nothing asserted them.

  **It also stores the TUTOR** (since 2026-09-22): `isTutor` over the same oracle text, sourced to
  `oracle_rule` alone, because `/collection` selects no oracle text and the mark has to read a
  column. A column added by migration is false on every row until the next run writes it, so the
  tutor mark is dark after a deploy until this job runs — dispatch it rather than wait for Monday.

  `card_bracket_flags` carries per-flag SOURCES (`spellbook_sweep`, `oracle_rule`) with a check
  constraint tying the boolean to a non-empty source array, so a row can never say "true, and
  nobody claims it". An ABSENT id means no flag applies and nothing more — a card the
  sweep resolved and cleared is byte-identical to one it never returned, and no reader may
  describe it as if it could tell them apart.

- `pnpm check:spellbook` validates Spellbook's contract without a database — the index shape,
  a real parse, and the `card_count` versus deduped-`uses` relationship. It runs daily in
  `Upstream contract checks` for the same reason the Scryfall and ManaPool checks do: the
  ingest is weekly, so a silent shape change would sit unnoticed for days.

  One tension is deliberate and worth knowing: it asserts against the LIVE feed rather than a
  fixture, so it can fail for an upstream change that is correct and expected. That is the
  point — a fixture-only check passes forever over a feed that has moved.

- `pnpm build:combo-features` regenerates `produces-kinds.generated.ts`, the vocabulary
  `isInfiniteOrGameEnding` and `producesInfiniteTurns` read. Developer-run rather than
  scheduled, and **the diff IS the review**: the file is a list of upstream's own feature
  strings bucketed by what they mean, and a new bucket assignment is a judgement someone has
  to make rather than a refresh someone can rubber-stamp.

  CARD COUNT IS NEVER THE TEST. A two-card variant producing "infinite squirrels" is a
  two-card variant; what decides whether the bracket system counts it is what it PRODUCES.
  `probe:bracket` proves that against the real index, and the mutation dropping the check
  measured nothing until the probe grew a fixture holding a mundane pair — 703 of 3,842
  sampled two-card variants produce something that is not counted.

- The `Combo refresh` workflow builds Spellbook's index ONCE, on staging, and copies it to
  production (card-data replicate plan, 2026-09-28). It chains on every successful scheduled
  `Catalog refresh` and builds on Mondays alone, judged by the catalog run's own start, so a
  catalog run GitHub started late is still that day's. Its `build` job runs `db:seed:combos` on
  staging, which records its own ledger row, and its `copy` job runs `db:copy:combos`
  in `catalog-production`. A dispatch takes `mode`: `build+copy`, or `copy-only`. One
  workflow-level concurrency group, `combo-refresh`, keeps two runs' copies from overlapping.
  Needs `COMBO_REFRESH_ENABLED` set to `'true'` to chain. Chaining on the catalog is also what
  keeps the ingest after it: variants resolve against `cards`, and a card the catalog does not yet
  hold is dropped as unresolvable.

- `pnpm db:build:staples` derives `format_staples` and `identity_composition` from the
  commander index. It runs as a STEP in `Commander index`'s staging `build` job, straight after
  the index it derives from, and is copied to production with it by `db:copy:index`.

  **It prints its whole derivation, and that is the point rather than a courtesy**: the bucket
  distribution, where the cut falls in it, the weighted-versus-unweighted delta, both sides of
  every condition's boundary, and the per-condition sizes. Sub-project 2 builds against these
  numbers, so the output is what anyone disputing them argues with. `measure-gap-line.mts` is
  the precedent: a threshold nobody can see the working for is an asserted constant with extra
  steps.

  Three rules it learned in review, each the same shape — **a derivation reproducing a ratified
  figure has to reproduce its NULL POLICY too, and a null policy is invisible until the data
  has nulls in it.** `coalesce(deck_count, 1)` and not 0. A row with no inclusion figure
  carries no weight, via a FILTER on the sum and never a `where`, because the ratified floors
  query filters inclusion nowhere and a `where` narrows the breadth denominator with it. Both
  were inert on local-dev — 0 of 859,794 `commander_support_cards` rows have a null inclusion —
  so a re-run reproducing the ratified numbers proved only that the change was inert.

  The count fallback (`count:N`) exists because without it the basis chain's fourth rung is
  dead: the 100-commander bar admits exactly 15 exact identities, and **544 commanders —
  colourless plus every three-plus identity — would look up a key no row carries**. It is
  restricted to the commanders an exact bucket cannot serve, because the chain takes the first
  hit and a wider bucket would drag its own averages with commanders that never read it.

  Neither table is cleared by an empty derivation. `format_staples` refuses and exits non-zero;
  `identity_composition` needs its own branch rather than the same refusal, because an empty
  composition is a LEGITIMATE state until the first widened index run and a hard refusal would
  fail every run until then and take the floors down with it.

- `pnpm measure:load` times the pages and the card-details press in a real browser at 1300x900
  and 390x844. It is the before/after tool every performance PR puts in its body (the performance
  lane, from `plans/2026-09-27-performance-research.md`). Per route (Home, `/decks`, a deck,
  `/collection`, `/commanders`, `/discover`) it reads cold, warm and client-navigation loads:
  TTFB, the first frame `<main>` holds content rather than the route's `LoadingScreen`, when the
  server finished streaming, and the first card image. It also reads the card-details press on the
  deck page, to the dialog and to its art: cold, warm, another cold card, and after INTENT (a
  pointer resting on the card, or focus at 390 as a keyboard reader would), which is what the
  prefetch is for; a tap starts no prefetch, since one started by the press has no head start. The
  median of `MEASURE_RUNS` runs (default 7), printed as a Markdown table, after one discarded
  warm-up load of every route at every width: the first request a route gets after an idle spell
  pays the server's warm-up, and without that pass it read as a regression on whichever width ran
  first (2026-10-12).

  **Every press is timed IN THE PAGE** (`scripts/lib/press-probe.mjs`): from the pointerdown, or the
  push the harness makes itself, to the first animation frame holding the result. Never by when a
  Playwright wait returns, because those re-check on a backoff that reaches 500ms. Timed that way, the
  cold card press read as ~230, ~330 or ~830ms, a false "slow mode" in 2 of 7 runs, while a trace of
  every run showed the dialog at 204-338ms. Card-press DIALOG figures from before 2026-10-13 carry
  that quantization, and the intent press carried ~15-40ms of harness overhead. The art, soft-navigation
  and tile figures were polled every 16ms, so they were never quantized: they read late by that
  interval plus a harness round trip. One press is not on a probe: the `MEASURE_PRESS_AT` startup
  pass reads the page's own clock at the push and at arrival, but finds arrival by polling every
  16ms rather than on the first frame, because it also matches the destination's query. And a press
  that replaced the document (a hard navigation, which Next makes when a deploy lands mid-run) loses
  its probe, so that sample falls back to the wall clock, polled every 16ms.

  **Point it at `next start`, never `next dev`**, whose compile times swamp every figure. The
  server runs on a scratch Neon branch holding a `pull:staging` copy, and the worktree's `.env`
  `DATABASE_URL` must name that branch: `env.mjs` loads `.env` over the shell, so a
  `DATABASE_URL` on the command line reaches the server but not the harness. The harness signs in as
  `E2E_AUDIT_USER_EMAIL` and marks the About entries seen, and refuses production and staging for
  that write, by `neon.branch_id`. Two optional readings:

  - `MEASURE_SERVER_LOG`: the stdout of a server started with `PERF_TIMING=1`. The `[perf]` lines
    `src/lib/perf/timing.ts` logs after each request are attached to the route they timed, so a
    before/after says WHICH read moved. Off, `perfRoute` hands every request one frozen no-op
    tracker, and the test pins that. The line carries route patterns, labels and milliseconds, and
    never an id or a name.
  - `MEASURE_DB_URL` with `MEASURE_DB_BRANCH`: database execution time per warm load, from
    `pg_stat_statements`, reset before each load. The reset is a write, and the figure means
    nothing on a database others are using, so it runs only when the URL reports the named branch,
    and never on production or staging.

  **`MEASURE_PROFILE=slow`** runs every page under Chrome's own Slow 4G (562.5ms latency, 180,000
  bytes/s down) plus a 4x CPU throttle, through CDP: the profile the navigation-pending brief
  measured, so the two tables read side by side. **`MEASURE_ROUTES=collection,discover`** measures
  only the routes named, since a slow run of all six takes a long time. It also prints the card
  images each cold load ASKED for and the kilobytes that landed, and the load event, recorded as
  null past 90s rather than failing the run. That null is a finding: before the grid's art loaded
  lazily, a cold `/collection` at 1300 asked for 200 images (20.3MB) and never reached its load
  event on the slow profile.

  **`MEASURE_DEPLOYED=1` measures deployed staging instead** (Hugh, 2026-10-12: a local server skews
  the figures; option C, production, is off). It refuses any host but `staging.the-99.dev`, and the harness itself writes to no
  database (the pages it loads write what any reader's visit writes, on the measurement account): it signs in with a Clerk sign-in token minted from
  `THE_99_CLERK_SECRET_KEY_STAGING` for the account `THE_99_E2E_AUDIT_USER_EMAIL` names (a testing
  token works only on a development instance; that account holds a copy of Hugh's staging decks and
  collection, made 2026-10-12), takes the deck as `MEASURE_DECK_ID`, lets the proxy set its own About sheet cookie on one document load after sign-in, reads the
  `[perf]` lines from Vercel's runtime logs of `the-99-staging` (which needs `PERF_TIMING=1` there),
  and takes database time from `MEASURE_PGSTAT_URL` as the delta between two `pg_stat_statements`
  snapshots, never a reset (installed on staging 2026-10-12). `MEASURE_SERVER_LOG` and
  `MEASURE_DB_URL` stay local-only and are refused.

  **Two traps it was built around.** Playwright turns the HTTP cache OFF for a context carrying a
  route, and Clerk's testing token is one. So the harness signs in once, carries the session into
  contexts with no route, and only then is "warm" warm. The first version read 0 cached scripts on
  every warm load. And React's `cache` is not request-scoped inside a server action: the first
  timing module keyed its spans on it, and the card-details action logged its total with none of
  its spans. So `perfRoute` returns an explicit tracker instead.

- **`public/sw.js` is the app's service worker** (speed plan, 2026-10-12), registered in production
  only, after the `load` event, by `ServiceWorker` in the root layout. It answers ONE kind of request
  and lets every other one through untouched: `/_next/static/` (content-hashed, cache first, trimmed to
  its newest 600 files). Not the mana sprite: its URL has no hash and the build computes each pip's
  cell from its symbol order, so a cached sprite behind a new build draws the wrong symbols. Never a
  document, an RSC payload, `/api`, an action or anything cross-origin, because those carry a reader's
  own data. `src/app/sw.test.ts` runs the file against a fake worker scope. **To retire it**, ship a
  `sw.js` that unregisters itself (`self.registration.unregister()` in `activate`) rather than deleting
  the file: an update check that finds the script gone keeps the installed worker running on every
  device that has it, while a self-unregistering one leaves on the next visit. Bump `VERSION` in it to drop
  every cache it holds. `measure:load`'s EVICTED figure is the load it exists for: a returning reader
  whose HTTP cache was cleared.

- **Loading the deck page's Tuning tools on demand was tried and reverted** (#1639, reverted 2026-10-13, Hugh's lane
  ruling). `TuningHub` and the three tools behind `onDemand` wrappers, warmed at idle and on intent, took the hub, the
  tools and the `deck-tuning` and `tuning-hub` strings out of the startup chunk (about 34KB gzipped). Measured on deployed
  staging, slow profile, 7 runs: cold deck content 6480 to 6518ms at 1300 (no change, inside the spread); the Analysis tab
  pressed straight after load 2527 to 3393ms (the tools fetched on the press); pressed after idle unchanged; hover intent
  at 1300 3245ms against 2471ms, since 400ms of rest is shorter than the fetch on Slow 4G. Warming any earlier puts the
  chunks back in competition with startup, which cancels the only gain. Tables:
  https://github.com/HartiganHM/the-99/pull/1639#issuecomment-6143963075. Do not retry without reading them. #1633's cut
  (the copy modules out of Home and `/decks`) stands, with its guard `scripts/lib/client-graph.test.mts`.

- `pnpm measure:tutors` prints what `classifyTutor` does to the live catalog — the 22-card
  fixture with a reason per card, the corpus splits, reach against a real combo piece, and the
  first 60 parses for reading. Read-only.

  It exists because a classifier built from a named fixture agrees with that fixture and says
  nothing about the 960 cards nobody listed. Four of its five design decisions contradict what
  the plan assumed, and every one came out of reading the sweep: the hate cards need no
  negation rule (zero of the 960 contain "can't search"); the opponent check is SENTENCE-scoped
  because 65 of the 79 cards mentioning an opponent do so in a different sentence; a graveyard
  destination assembles nothing on its own; and two mana-value phrasings were read inverted
  until they were counted.

  It also splits `alternatives` from `conjunctions` — 81 tutors against 61 on the shipped
  catalog — because collapsing the two is the false positive the classifier was fixed for: a
  tutor for `a legendary creature card` reached any legendary LAND until the and/or structure
  was preserved, and the reach count against one real combo piece fell from 239 to 194.

  Its `unreachable` counter is a structural INVARIANT rather than a live guard, and the
  script says so: `kinds` is either `"any"` or a non-empty list, so an empty one is
  unconstructible and a non-zero figure means `targetWords` started returning an empty array.
  The regression it cannot see is the likelier one — a word DROPPED rather than kept gives
  `words === null` and lands in the `any` bucket, silently widening every such tutor. Watch
  `any` against 129 for that.

- **The bracket system's classifiers are all PARTIAL, and every surface says so.** Mass land
  denial is 22 of 24 on a curated set with both misses named; extra turns have no misses among
  the 56 cards whose text mentions one; combos come from Spellbook's index excluding
  template-gated variants. Those strings live beside the classifiers they describe
  (`oracle-rules.ts`, `combo-features.ts`) and are re-exported by `bracket/rules.ts`, so a
  verdict consumer imports one module while each definition stays where it can be re-measured.

  **The B2/B3 chain-or-loop flag does not exist and is not coming from a reading.** WotC's text
  above bracket 1 is about CHAINING extra turns, which is not a property of a decklist — so the
  count is reported with no verdict attached, and the only thing that violates bracket 3 is a
  measured LOOP: an assembled combo Spellbook records as producing infinite turns. The
  self-recurring single card is NOT detected, and the detection copy says so rather than
  letting the absence read as a clean deck.

- `scripts/contact-sheet.mjs` photographs every surface in a feature's inventory at both widths
  and lays them out as one image, so a route that never got the feature, or a phone that is wrong
  while the desktop is right, is visible in a glance. Inventories live in
  `docs/superpowers/inventories/*.json`.

  Every step verb — `click`, `clickRole`, `fill`, and the selector `wait` — reaches page
  content through `lib/surface.mjs` (`onPage`, `onPageRole`), so an inventory never spells
  `main` itself and the scope has ONE definition. A second prefix would chain `main` inside
  `main` and match nothing. `wait` is scoped for the same reason as the rest:
  `wait: "[role=dialog]"` is in every inventory, and the shell's account sheet is also a
  `role="dialog"` sitting before `<main>`.

  A row that exists at one width only says so with `"widths": ["phone"]` or `["desktop"]`;
  the other width is skipped and reported as such rather than counted a failure. There is
  deliberately no optional click: a step that may find nothing cannot fail, and a cell that
  photographs a closed route reads as coverage. And a run that photographs NOTHING fails,
  whatever the cause — no rows, an empty `widths`, every row skipped by its own.

  `pnpm check:shared <inventory>` answers the half a picture cannot: whether routes that are
  supposed to carry the same control do it by rendering the same component. It reads the same
  inventories, and does nothing for one with no `shares` block. When a `shares` block is present
  it passes only when each row's own `view` imports the named `binding` as a value AND references
  it — the module is not enough (a view can take a constant or a type out of it and render its
  own copy), the exported name is not the local alias, a default or namespace import binds
  something else, and nothing here flags an unused local.

  **`shares.module` names a component that is used as-is, and each row's `view` names the file
  that imports and uses it.** What the check proves is a value import plus a reference — not a
  render, so `const C = Thing` satisfies it. It reads that file directly and does not follow
  composition, so the two have to agree. `FilterChassis` takes its controls as props and is assembled by a
  route-level wrapper, so naming the chassis while the rows named route views failed three routes
  for composing it correctly — and naming a leaf while the rows still name route views would fail
  them again, because the wrapper owns the import. Pick the component first, then set `view` to
  wherever each route renders it, which may be a wrapper.

- Browser scripts reach the page through `scripts/lib/surface.mjs` — `onPage()` and `openSheet()`
  — never a bare selector. The shell renders `NavRail`, `MobileHeader` and `TabBar` around
  `<main>`, and its account menu is a `button[aria-haspopup="dialog"]` at phone width, first in
  document order: an unscoped query finds the shell's control on every route and then measures it
  while naming the surface it meant to measure. That produced two findings in `probe-sets.mjs`
  that looked real and were not. `openSheet()` also waits for whatever is animating on the sheet
  to finish — page sheets arrive under `anim-sheet-in`, the shell's menu under `anim-sheet-up`,
  both 180ms — because a box measured mid-transform reads as hanging below the fold.
  `scripts/lib/surface.test.mts` parses every `probe-*.mjs` and sweeps its string literals for
  the unscoped forms, the same way `env.test.mts` enforces the env convention.

- `pnpm.overrides` in `package.json` pins seven transitive packages to their patched versions.
  They are overrides rather than dependency bumps because not one of the seven is declared here.
  Two rules learned from the round that added them: an override can force a version the PARENT
  never tested against, so it has to be exercised, not assumed — forcing `brace-expansion@5`
  broke ESLint outright (`minimatch@3.1.5` calls `expand` as a function and 5.x changed its
  export shape), and the `esbuild` pin rewires `drizzle-kit` from 0.18.20 across several
  breaking 0.x boundaries on a path CI never runs, so `pnpm db:generate` and `drizzle-kit check`
  are the proof for that one and both pass.

- Stage files by name — never `git add -A` (`.env` and other untracked files must stay untracked).
- **You are authorized to dispatch the `pr-review` §10b pre-open review subagent without asking.** Immediately before `gh pr create`, dispatch a `general-purpose` agent (never a fork — a fork inherits the conversation and reads the code as intended rather than as written) with `~/.claude/skills/pr-review/precheck-prompt.md` as its prompt, then `node ~/.claude/skills/pr-review/precheck.mjs record`. Most sessions carry a system-prompt line forbidding subagent use unless the user requested it; this line is that request, and it is the only subagent use it covers. Verify every finding before acting on it — the pass generates findings, it does not rule on them, and it never gates the PR. The grant is **permanent** — Hugh ruled on 2026-09-16, after 18 scored PRs. Read its scoreboard the way he did: `precheck.mjs report` prints a hit rate against Copilot's round-1 findings (28%) and, above it, the count of defects the pass fixed before the PR ever opened (24, every one past the author's own tests and probes). The hit rate is scored against a denominator the pass deliberately shrinks — anything it finds and fixes never reaches round 1 to be predicted — so a LOW hit rate beside a high pre-open count is the pass working, not failing. Do not propose retiring it on the percentage alone.
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
- **A MULTI-ROUND FEATURE LINE BATCHES ITS ABOUT ENTRIES AT THE END OF THE LAUNCH.** Ruled
  2026-09-21. A line like deck analysis ships five rounds, each a piece of one capability — and
  an `ABOUT_VERSION` bump puts a one-time sheet in front of every account. For a returning account
  it names the new entries and offers the page; a brand-new account's sheet introduces the page in
  one line instead. Until the About rethink ships
  (`docs/superpowers/design-briefs/2026-09-25-about-rethink.md`, Hugh 2026-09-25), a bump still
  redirects every account to `/about` instead. Either way, bumping once per round spends that
  attention five times to announce fragments, and the early
  entries describe a surface the reader cannot use yet. One bump at the end describes the thing
  as it works.

  This moves WHEN, never whether. The entries are still owed, Design still draws them on the
  per-entry artboard, and the LINE's close-out does not pass without them. A readiness audit on
  round N of such a line should not report a missing entry as a finding — it should confirm the
  line's plan names the batched task, or the requirement quietly evaporates.

  **Everything below applies unchanged to a feature that ships in one round.**

- **No FEATURE launches without an About entry, in the same round that ships it.** `/about` is the
  app's own reference, and it is only true if a feature cannot land without one. Three places carry
  it, and the third is the one that catches what the first two miss:
  - **Design** — a UI handoff is not complete without its About entry, drawn on the per-entry
    template artboard in `design/design_handoff_the99_about/` (§8 of the R3 canvas; `STATES-about-r3.md`
    §G). Title, route, `opens`, caption, the specimen component and its fixture props, up to four
    key lines, and the phone reduction.
  - **The plan** — the entry and the `ABOUT_VERSION` bump are a named task, listed beside the PR
    boundaries rather than assumed. A feature whose entry is deferred says so there, with a reason.
  - **The close-out** — `feature-acceptance` does not pass until the entry exists on the page and
    the version moved. A copy edit is not a bump; a new entry always is.

  The version is what makes this matter: a bump shows every account a one-time sheet over whatever
  page they opened, naming the new entries for a returning account (a brand-new account's sheet
  introduces the page in one line). Until the About rethink ships, a bump redirects to
  `/about` instead. Either way, a feature with no entry reaches nobody who is not already
  exploring. The `about.test.ts` content hash does the mechanical half — touching the copy forces
  either a deliberate bump or a deliberate re-pin — but nothing can detect an entry that was never
  written, which is why it is a rule and not a check.

  The first case for it is already on record: the post-import summary merged as #639 and #643 on
  2026-09-14/15, in the middle of the About design round, and reached `main` with no entry.

  **A COSMETIC CHANGE IS NOT A FEATURE, and does not owe an entry.** The rule is about a reader
  discovering something the app can now do. Restyling a surface they already know — moving a mark,
  respacing a chip, changing where an edge is drawn — teaches them nothing they need, and an entry
  for it spends a version bump putting the page in front of every account to announce that a
  caption looks different. Where a cosmetic change is worth describing anyway it is an ORDINARY
  EDIT to the entry that already covers that surface, at whatever version comes next, not a new
  entry and not a bump of its own.

  Card captions is the case on record for this half: it moved every modifier off the card art on
  two routes and added no capability, and Hugh ruled on 2026-09-15 that it carries no entry. The
  ruling is his to make — **Design draws the entries and Hugh decides which features owe one**, and
  he may overrule a determination from either Design or this file.

- `design/` is **reference material, never shipped code**. It sits outside both `public/` and `src/`, so no route serves it and no module imports it. Each handoff's `support.js` is a generated runtime that evaluates code dynamically and loads React from a CDN — it is read by opening that bundle's `.dc.html` from disk, and by nothing else. Never import from `design/`, and never copy a handoff asset into `public/`.

- `scripts/measure-gap-line.mts` measures the commander row's gap line against a real
  database — read-only, no fixture, no locks. It exists because the line's `allPlayed`
  state turned out to be the DEFAULT rather than an edge case, and that is invisible from
  the code: the frequency is a property of the reader's played set, so it reads 5.4% on the
  seeded fixture account and 67.2% on the reference account in the same database. A
  measurement taken against the wrong account is how a state the reader sees two rows out of
  three gets designed as an exception.

  It prints the occupant distribution per lane, the distribution in each sort's first screen,
  the depth of the themes the row would name, and Option E's whole curve — the table the
  design table's rejection of "narrow the played set to each commander's top N tags" is
  sourced from. `MEASURE_USER_ID` picks the account; the default is the busiest, and it lists
  every account it saw rather than picking one silently.

  Two defects in it, both found by the pre-open pass rather than by running it, and both the
  same shape — **a script that restates a rule instead of calling it**. Its `Something new`
  order was a RATIO (unplayed / eligible) where the shipped `byNovelty` ranks on the absolute
  `unplayedCount`, so a commander with 2 eligible tags and 1 unplayed sorted above one with 30
  eligible and 12 unplayed, the reverse of the app; the header meanwhile called that order
  "ascending" while sorting descending, and claimed the script "orders by the same figures the
  lanes do rather than by a proxy" in the same breath. It now imports `byNovelty` and calls it.
  And it said "built decks" throughout: `loadPlayedTags` joins no `deck_versions`, so a BREW
  counts — deliberately — and `novelty.ts` records that this exact wording was corrected there
  once already. Every figure it prints includes brews.
