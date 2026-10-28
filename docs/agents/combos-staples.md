# Combos staples (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

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

## Near combos (`NEAR_COMBOS_ENABLED`)

Plan `docs/superpowers/plans/2026-10-22-near-combos-backend.md`. Backend only until Design prompt 17's surface; the
switch is unset in production and listed in `ALL_FEATURES_EXCLUDED`.

- **One rule for "one piece away".** `addableMissingPiece` (`src/lib/synopsis/combo-facts.ts`) decides it for the
  Overview's near combos and for `loadNearCombos` alike: every row of the stored variant present, a counted outcome
  (`isInfiniteOrGameEnding`), never a loop that draws the game, and exactly one missing piece the deck could add (not
  command-zone-only, Commander-legal, inside the commanders' identity). Templates are out: the query never reads them.
- **Where the piece is** comes from `loadAvailability` read from the deck's own vantage (`excludeDeckId`): `spare`
  when `free > 0`, `elsewhere` when every owned copy is claimed (the claiming decks named), else `buy` at
  `cheapestNow`'s cents, or null when nothing is stocked.
- **Ranking is per bucket.** Spare, elsewhere, priced buy, unpriced buy; inside each, one combo per outcome leads
  (`pickTop`), cheapest first, then `byRank`. Applying the one-per-outcome lead across the whole list lifted a buy
  above a spare on 8 of local-dev's 20 decks, which is why it is per bucket.
- **Sizes, staging 2026-10-22.** Across 41 decks: two-piece near combos median 21 per deck (p90 47), three-piece
  median 9 (p90 66, max 182). Hence the cap (20) and `total`.
- Steps (`steps`, Spellbook's `description`) and mana (`mana_needed`, `mana_value_needed`) were stored for every
  variant by #820; this line changed no ingest.
- **A card's combos** (`loadCardCombos`, PR 2). Every template-free, counted combo naming the card, its other pieces
  each `inDeck` (a command-zone-only piece only as the deck's commander), `spare`, `elsewhere` or `notOwned`. A card
  can be in thousands (Ashnod's Altar 5,768 on local-dev), so the query shortlists 200 in SQL by pieces the reader
  owns none of, then size, then popularity, and the ranking runs on those: fewest unowned first, one per outcome
  leading inside each count (across counts it lifted a combo needing a purchase above one held). The press took
  ~330ms for Ashnod's Altar on local-dev.
- **`maxPieces`** on both reads bounds the combo size; the combos-close handoff's surfaces ask for 2 (its G2). The
  `elsewhere` decks carry `committed` and list committed decks first, for G4's "the first committed".

## From AGENTS.md (moved 2026-10-28)

The rule-form bullets `AGENTS.md` carried for this area until 2026-10-28, verbatim. Where they and the text above differ in wording, both are current.

- `pnpm db:seed:combos` ingests Commander Spellbook into `spellbook_variants`, `spellbook_variant_cards` and `card_bracket_flags`. The sweep runs BEFORE the bulk file. The publish is two transactions (flags, then bulk) and REFUSES a partial ingest under any collapse floor, leaving the previous tables standing and exiting non-zero. It also stores the tutor mark (`isTutor`), dark after a deploy until this job runs: dispatch it. `card_bracket_flags` carries per-flag sources; an ABSENT id means no flag applies and nothing more.
- **Near combos** (`NEAR_COMBOS_ENABLED`; unset in production; About entry `combos-one-away`). `loadNearCombos` (`src/lib/combos/near-combos.ts`) lists the combos a deck is ONE piece away from, by `addableMissingPiece` (`synopsis/combo-facts.ts`), the same rule the Overview's near combos use, and places the missing piece: a `spare` (an unclaimed copy), `elsewhere` (every copy claimed, naming the decks) or `buy` (`cheapestNow`). Ranked bucket by bucket, one per outcome leading inside each, capped with a `total`. Steps and mana were already stored by #820. `loadCardCombos` (same module) lists the combos a card is in with each other piece `inDeck`, `spare`, `elsewhere` (the holding decks, committed first) or `notOwned`, shortlisted in SQL (200) and ranked fewest unowned first. Both take `maxPieces` (the combos-close UI asks for 2, its G2). The deck page reads `loadNearCombos` (uncached, uncapped so the count and the list agree) for the status line's `∞ N combos one piece away` segment and its list sheet (`combos-close-sheet.tsx`, plan UI-1); card details' combo block reads `loadCardCombos` through `loadCardDetail` (the deck's commanders ride `?commanders=`, at most 2) and never `loadCardComboPartners` while the switch is on (plan UI-3). Proof: `pnpm probe:near-combos`; inventory `combos-close.json`.
- `pnpm build:combo-features` regenerates `produces-kinds.generated.ts`. Developer-run; the diff IS the review. CARD COUNT IS NEVER THE TEST: what a variant PRODUCES decides whether the bracket system counts it (`probe:bracket`).
- The `Combo refresh` workflow builds Spellbook's index ONCE on staging, Mondays only, and copies it to production (`db:copy:combos`). It chains on the scheduled `Catalog refresh` (needs `COMBO_REFRESH_ENABLED='true'`); a dispatch takes `mode` `build+copy` or `copy-only`; one `combo-refresh` concurrency group.
- `pnpm db:build:staples` derives `format_staples` and `identity_composition` from the commander index, as a STEP in `Commander index`'s staging `build` job, copied by `db:copy:index`. It prints its whole derivation. A derivation reproducing a ratified figure must reproduce its NULL POLICY too: `coalesce(deck_count, 1)`, and a FILTER on the inclusion sum, never a `where`. Neither table is cleared by an empty derivation.
