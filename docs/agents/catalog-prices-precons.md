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
