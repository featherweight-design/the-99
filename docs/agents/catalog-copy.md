# Catalog copy (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

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
