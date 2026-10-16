# Commander index (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

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
