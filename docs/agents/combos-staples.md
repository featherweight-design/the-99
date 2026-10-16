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
