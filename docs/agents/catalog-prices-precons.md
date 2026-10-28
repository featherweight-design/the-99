# Catalog prices precons (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

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
  no printing. Each row also keeps how many of its copies the box holds in foil (`foil_quantity`, from
  MTGJSON's `isFoil`), and `precon_tokens` keeps the deck's `tokens[]` at their token printings; a token the
  token catalog lacks is dropped and counted in the run's line (1 of the feed's tokens on 2026-10-14, when only
  31 of 197 decks listed any). A cached derived file without either field reads as no cache. Twins are one set's decks with identical lists (16 Collector's Editions on
  2026-10-11); a Commander Anthology reprint of an older list is its own row. The publish is one
  transaction under the `catalog-ingest` lock, stamps `catalog_refreshes`, and REFUSES (exit 2,
  nothing written) under 180 kept decks or over 1% unmapped copies. On a database the precon
  migration has not reached it warns and exits 0, and `db:catalog-sources record` records nothing
  for `precons` there, so a refresh that outruns a deploy stays green. `pnpm check:mtgjson` checks
  the contract daily in `Upstream contract checks`; `pnpm measure:precons` runs the planner against
  staging, read-only, and names every precon card a started deck would meet as illegal.

- **When the catalog first showed a set or a precon** is `catalog_first_seen` (`src/lib/catalog/first-seen.ts`; upcoming-precons
  engineering half, 2026-10-14), written at the end of `seed-sets` and `db:seed:precons` and skipped with a warning on a database the
  migration has not reached. A table of its own because `precons` is REPLACED every run, and a column on `sets` would fail an ingest that
  outran its migration. **The first run for a kind is a BASELINE** (`baseline: true`): everything it stamps was already there, so its
  date is the day stamping began, and no reader may call it an arrival. `lib/precons/upcoming.ts` reads the upcoming Commander sets
  (type `commander`, not digital, released after today's UTC day; an upcoming precon is a SET before it is a `precons` row, since MTGJSON
  lists a deck at release), and keeps a set already released for 30 days (`RELEASED_GRACE_DAYS`) while no `precons` row lists it
  (`lower(precons.set_code) = sets.code`: MTGJSON's codes are uppercase). `user_prefs.upcoming_seen_codes` holds what a reader has been
  shown: a set code for a set announced, `lists:<code>` for its decklists listed, and `markUpcomingSeen` writes only when it adds a key,
  because `user_prefs` carries the `user_data_touch` trigger since 0123 and any UPDATE moves the stamp. `revealed.ts` reads a set's
  revealed commanders, `arrivals-read.ts` the precons listed in the last 30 days, and `arrivals.ts` holds the pure rules (the banner's
  lines, the seen keys, the countdown, `new`, the Announced filters). **None has a caller beyond its tests and
  `pnpm probe:upcoming-precons`** until the plan's PR 2 and 3 (`2026-10-14-upcoming-precons.md`), behind `UPCOMING_PRECONS_ENABLED`.

## Pre-written precon Overviews

Hugh, 2026-10-27: a player sees how a precon plays before choosing it, and a deck started from that precon carries the
Overview over as its own synopsis while its list is the precon's. The Overview depends on nothing about the player (it
reads only the list and the catalog), so it is catalog data, `precon_synopses`, one row per PLAIN precon and contract (a
Collector's Edition twin resolves to its plain edition through `twin_of`). No FK to `precons`: the ingest replaces it daily.

- **`pnpm db:build:precon-overviews`** writes them, ONCE, on staging. Every input is the app's own: the list a start
  writes (`preparePreconDeck`, whose card rule is `preconDeckCards`), `loadDeckProfileFromHead`, `factsWithSource`,
  `buildSynopsisPrompt` at contract 12, `checkReply`, and one repair through `repairPrompt` and `applyRepair`. The transport
  is the Batch API (`scripts/eval/lib/batch.mts`, pinned to `https://api.anthropic.com` because `.env`'s proxy has no batches
  route), with the request built by the eval harness's `buildParams`. Only an Overview whose every section passed is stored.
- **`input_hash`** is the hash of that exact request (`synopsisRequestHash`), so it moves with any card text, combo, label
  or index row the request reads. A row still matching, written by this run's model, is skipped and stamped current; one
  whose request moved is marked `current = false` BEFORE anything is sent, so it is never carried over while it waits.
  `--limit N` caps what is sent, never what is checked: every precon is still hashed and marked.
- **The cap** is a worst-case stop in dollars: `PRECON_OVERVIEW_MAX_USD` or `--max-usd`, default and CEILING $15
  (`capMicroUsd` clamps), and a batch is sent only while dollars spent plus its worst case (counted input plus the full
  16,000-token output ceiling, at batch rates) fit (`scripts/lib/precon-overview-build.ts`). Spend goes to one
  `model_calls` row per batch, `system`/`precon_overview`, which the Costs page shows.
- **It fails closed on its target**: `PRECON_OVERVIEW_TARGET_BRANCH` must equal the database's `neon.branch_id`, or it exits
  2. Locally name the database with `PRECON_OVERVIEW_DB_URL` (the env import overrides `DATABASE_URL`). `--dry-run` builds,
  hashes and prices every request and calls and writes nothing (input tokens estimated there). `--stub` answers with the
  synopsis stub and refuses anything but a scratch branch (`assertScratchBranch`); a stub row is never current for a live run.
- **A carried-over Overview** is a `deck_synopses` row with `precon_file` set and `model_call_id` NULL (a check constraint
  makes the two exclusive). It holds no allowance unit and no `model_calls` row, so the allowance, credits, `freeRunsFor` and
  the Costs page never count it (`src/lib/synopsis/carried-over.test.ts`, `pnpm probe:precon-overview-ledger`).
  The copy to production and the carry-over itself are Precon Overviews PRs 3 and 4.
