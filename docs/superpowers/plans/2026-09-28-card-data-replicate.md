# Plan: build card data once, replicate to production

> **Status: awaiting Hugh's approval (through d9).** No code before it lands.
>
> Hugh, 2026-09-28: "Hitting EDHREC twice for the same data is wasteful and redundant… Anything
> we can do to replicate data across staging/production should be done. We don't need to force it
> where it doesn't make sense, but if there are obvious opportunities, we should take them." Not a
> shared database: two databases, one builder, a verified one-way copy.

**Goal:** every catalog-derived table that costs real upstream work is BUILT on staging and COPIED
to production, so production can never again drift behind staging by a job someone dispatched
against one side only.

## 1. Where production stands (measured read-only, 2026-09-28)

| Table / fact | Production | Staging |
|---|---|---|
| `cards` (oracle-id fingerprint, md5 of the sorted ids) | 35,572 · `ad26016c…` | 35,572 · `ad26016c…` (identical) |
| `printings` | 103,228 | 103,309 (+78 `normal`, +3 `adventure`) |
| last `catalog_refreshes` stamp | 2026-09-21 18:25 | 2026-09-25 15:53 |
| commander index, `max(computed_at)` | 2026-09-17 | 2026-09-25 |
| `commander_support` / `_cards` | 3,380 / 889,801 | 3,382 / 892,874 |
| `commander_pair_support` | **0** | 1,717 |
| `format_staples` | **0** | 776 |
| `identity_composition` | **0** | 19 |
| `card_bracket_flags` | **163** | 572 |
| `spellbook_variants` | 107,095 | 107,282 |
| `printing_prices` (rows, newest `as_of`) | 97,747 · 09-21 | 97,864 · 09-22 |
| `commander_support.prose` set | 3,379 | 3,379 |
| `card_labels` | 0 | 0 (the labelling run has not published yet) |
| decks holding a partner pair | **0** | 1 |

Every gap is the same shape: a job was dispatched with `target=staging` (commander index on 09-20,
09-21 and 09-25, combos on 09-23, prices on 09-22, catalog on 09-22), and nothing brought
production along. **No scheduled run of any data workflow appears on 2026-09-28** (the Monday
catalog, price and combo crons). That is recorded here, not chased: it is a separate question for
the repository variables or GitHub's scheduler, and this plan does not depend on it.

## 2. Each job, costed by what it spends upstream

| Job | Upstream spend per environment | Tables | Decision |
|---|---|---|---|
| **Commander index** (`db:build:index` + `db:build:staples`) | ~3,000 EDHREC requests at 250ms, plus ~1,750 for the pair sweep: **~4,750 rate-limited requests, ~30 minutes** | `commander_support`, `_cards`, `commander_pair_support`, `_cards`, the four role columns, `format_staples`, `identity_composition`; clears `commander_scores` | **REPLICATE.** The whole reason for this plan. |
| **Combo refresh** (`db:seed:combos`) | 54 Spellbook `/estimate-bracket` requests (sequential, ~1 min, near their 80/min limit) **plus a 656MB bulk download**, streamed and classified | `card_bracket_flags`, `spellbook_variants`, `spellbook_variant_cards`; appends `deck_data_changes` | **REPLICATE.** Halves the load on a volunteer API and the 656MB pull, and closes the 163-vs-572 flag gap. |
| **Commander prose** (`db:build:prose`) | ~3,300 Anthropic calls (only for commanders whose input hash moved) | `commander_support.prose*` | **Already copied** (`db:copy:prose`). Direction reverses: generate on staging, copy to production (see §4). |
| **Card labels** (`db:build:labels`) | Anthropic batch, ~$41 once and ~$6 a week | `card_labels` | **Already copied** (`db:copy:labels`) and already staging-only. Only the production wiring is missing (§4). |
| **Catalog refresh** (`db:seed:sets`, `db:seed`, `db:seed:printings`) | Two Scryfall bulk files, ~24MB + ~77MB gzipped, ~1 minute | `sets`, `cards`, `printings`, `skipped_printings`; appends `deck_data_changes` | **KEEP PER ENVIRONMENT.** One cheap download, and it is the id base everything else is checked against: the copies must be able to prove the two catalogs agree, which a copied catalog cannot. |
| **Price refresh** (`db:seed:prices`) | One ManaPool request, ~51MB | `printing_prices` | **KEEP PER ENVIRONMENT.** One request a week; and it is keyed on `printings.scryfall_id`, which already differs by 81 rows between the two sides. Each side pricing its own printings is the more correct shape, not only the cheaper one. |

What replication saves per week and month, on today's numbers: every monthly index run stops
spending ~4,750 EDHREC requests twice; every weekly combo run stops downloading 656MB and
sweeping Spellbook twice. The two bulk-file jobs that stay per environment cost one request each.

## 3. The shape of a copy

One harness, `scripts/lib/catalog-copy.ts`, used by every copy script. It follows the precedent
of `db:copy:labels` and `pull:staging`, and makes three things the older copies lack the default
(`db:copy:prose` has no same-database guard and writes row by row outside a transaction; neither it
nor `db:copy:labels` is one transaction).

1. **One way, staging to production.** Two variables, never defaulted:
   `CATALOG_COPY_SOURCE_URL` and `CATALOG_COPY_TARGET_URL`, plus `CATALOG_COPY_TARGET_BRANCH`,
   the Neon branch id the target MUST report.
2. **Identity by `neon.branch_id`, never the URL.** Both sides report it; the run refuses when
   either is empty, when they are equal, or when the target's does not equal
   `CATALOG_COPY_TARGET_BRANCH`. That last check is the `PULL_TARGET_BRANCH` rule: "not the
   source" is not "safe to write to", and a mistyped URL naming some other database stops here.
3. **The catalogs must agree first.** Every copied table is keyed on `cards.oracle_id` (the only
   other key, Spellbook's `variant_id`, is text from upstream). The harness compares the md5
   fingerprint of the sorted oracle ids on both sides and **refuses** when they differ. The fix
   is then to refresh the stale catalog, never to copy around it. Nothing in this plan copies a
   table keyed on printing ids.
4. **A consistent source.** All source reads happen in one `repeatable read, read only`
   transaction, so a staging job committing mid-copy cannot hand production a mixture of two
   builds (the `pull:staging` rule).
5. **Fails closed, and one transaction per publish.** Each table family is published in ONE
   target transaction. A failed or refused copy leaves production's previous tables standing.
6. **Verified before commit.** Inside the target transaction, after the writes and before the
   commit, the harness computes each table's row count and an md5 over its ordered key and value
   columns, and compares them with the same figures from the source snapshot. On any mismatch
   it rolls back and exits non-zero. A copy that reports success has already been compared.
7. **Floors on the source.** A copy refuses a source that is empty or under the floors the
   builders use: the combo floors (`variantsKept` 53,000 and the flag floors), `LEGAL_PAIR_FLOOR`
   1,500, and a non-empty `format_staples`. Refusing is better than faithfully replicating a
   collapsed build.
8. **Stamps `catalog_refreshes`** on the target through `stampCatalogRefresh`, so readers'
   cached lists retire. The index copy also retires the index generation, because it carries
   staging's `computed_at` values across, which is the generation readers key on.
9. **`--dry-run`** prints the counts and fingerprints on both sides and writes nothing.

`src/db` is a module-scope singleton on `DATABASE_URL`, and `scripts/lib/env.mjs` loads `.env`
with `override: true`. So the harness never relies on `DATABASE_URL`, and never imports a writer
that does, without first checking the target branch on that same connection.

### 3a. `db:copy:combos` (PR 1)

Reads `card_bracket_flags`, `spellbook_variants` and `spellbook_variant_cards` from the staging
snapshot. It then calls the builder's own `publishFlags` and `publishVariants` against
production **with logging on**. This is not a raw table copy, and that is deliberate.
`deck_data_changes` is production's own log: its `seq` is what `deck_profiles.seen_seq` compares
against, and the entries are the DIFF between production's previous flags and combos and the new
ones. A raw copy would either skip the log or bring staging's `seq` numbers, which mean nothing in
production. Calling the publish functions gives production the entries its own readers expect,
from its own previous state, inside the same transaction as the write.

### 3b. `db:copy:index` (PR 2)

- **Copies:** `commander_support` (every column except the three `prose*` columns), its `_cards`,
  `commander_pair_support` and its `_cards` (role columns included), `format_staples` and
  `identity_composition`.
- **Semantics, in one target transaction:**
  - Support and pair rows are upserted, exactly as the builder does. A commander production has
    and staging lacks is left alone.
  - Each copied commander's and pair's `_cards` are deleted and refilled.
  - `format_staples` and `identity_composition` are replaced whole, as `build-staples` replaces
    them.
- **Prose excluded:** the prose columns are left to `db:copy:prose` and its input-hash check,
  which refuses a sentence describing themes the target no longer records.
- **Scores cleared:** afterwards, production's `commander_scores` are cleared through the
  builder's own `clearPersistedScores` (exported from `seed-index.ts` for this), under `SCORE_INDEX_LOCK`. A rebuilt index invalidates
  every synergy figure scored against the old one, whichever way the index arrived.
- **Pairs come from decks, and the copy checks for that.** The builder's pair list includes every
  pair a deck holds in THAT database. Before writing, the copy lists production's own built pairs
  that the staging snapshot lacks, and prints them as a gap. It does not fail on them. Today that
  list is empty (production holds no pair decks). If it is ever not empty, the fix is a one-off
  `target=production` index dispatch, which costs a few requests, not 4,750.

## 4. Workflow wiring (PR 3)

The per-environment matrix goes away on the two replicated jobs. It becomes two jobs in sequence,
under the workflow's existing concurrency group:

- **`Commander index`**
  - `build` (environment `catalog-staging`): runs `db:build:index`, then `db:build:staples`.
  - `copy` (environment `catalog-production`, `needs: build`, and only when `build` succeeded):
    runs `db:copy:index`, then `db:copy:prose`.
  - A failed staging build copies nothing, and production keeps its previous index. That is the
    point of the ordering. The old `continue-on-error` on the scheduled staging leg goes with it:
    it existed so a staging failure could not starve production, and production no longer builds.
- **`Combo refresh`**
  - `build` (staging): runs `db:seed:combos`.
  - `copy` (production, `needs: build`): runs `db:copy:combos`.
- **`Commander prose`**
  - The chain moves to STAGING, because staging is now where the index is built.
  - Production receives the sentences through the `db:copy:prose` step above, so an Anthropic
    call is paid once.
  - A dispatch keeps its `target` input for the rare direct run.
- **`Card labels`**
  - Gains a `copy` job (production, `needs: label`) that runs `db:copy:labels`.
  - It replaces the step that currently writes "production is not updated".
- **Unchanged:** `Catalog refresh` and `Price refresh` keep their per-environment matrix.
- **Dispatches:** a dispatch on a replicated workflow takes one choice, `build+copy` (the default)
  or `copy-only`. `copy-only` is the catch-up tool, and needs no EDHREC or Spellbook traffic.

**The secret Hugh sets, named exactly:** **`CATALOG_COPY_SOURCE_URL`**, in the
**`catalog-production`** environment.
- **Value:** a connection string for the **staging** branch (`br-polished-pond-a6e63y0b`).
- **Recommended role:** a read-only one. The copy only reads the source, and a read-only role
  makes that a property of the credential, not just of the code.
- **Target:** the copy job's `CATALOG_COPY_TARGET_URL` is the environment's existing
  `CATALOG_DATABASE_URL`, so nothing else needs to be added.
- **Target branch id:** `CATALOG_COPY_TARGET_BRANCH` is the production branch id,
  `br-noisy-violet-a6vw4ess`, written into the workflow, not held as a secret. It is a guard, not
  a credential.
- **One secret, four copies:** `db:copy:prose` and `db:copy:labels` move onto the harness in the
  same PR. They read the same pair of variables, so this one secret serves all four copies.

## 5. Today's catch-up

Production's gaps are filled by the copy, never by a second EDHREC run. It runs after PR 3
merges and the secret is set, in this order:

1. **Confirm the catalogs agree.** `db:copy:index --dry-run` prints the oracle fingerprints. They
   agree today, but a production catalog refresh is due anyway (its printings are 81 behind), and
   dispatching `Catalog refresh` with `target=production` costs one bulk file.
2. **`Commander index` with `copy-only`.** This fills 1,717 pairs, 776 staples, 19 compositions,
   the role columns, and staging's 09-25 support rows, then clears production's scores and copies
   prose.
3. **`Combo refresh` with `copy-only`.** This takes flags from 163 to 572 and brings the variant
   set current. Production's notice log records the diff.
4. **Check it took.** Read-only counts on production, which should match staging's table above.
   Then `GET /api/health`.

Prices stay per environment. Production's are six days old, and they refresh on the next Monday
run or on one `target=production` dispatch. That costs one ManaPool request and replicates
nothing.

## 6. PR boundaries

| PR | Contents | Proof |
|---|---|---|
| **1** | `scripts/lib/catalog-copy.ts` (§3); `db:copy:combos` (§3a); the correction in `src/lib/cache/index-generation.ts:6`, whose comment says an index rebuild does not stamp `catalog_refreshes` when `build-commander-index.ts:78` does. | `pnpm probe:catalog-copy` runs against TWO scratch Neon branches cut from staging, never production or local-dev. It covers each refusal: same branch, wrong named target, catalogs that disagree, source under a floor. It proves a verified copy and a rollback on a forced mismatch, and that the target's notice log records the diff. Each refusal and the verification are mutation-checked. |
| **2** | `db:copy:index` (§3b). | The same probe gains an index section: a copy lands identical fingerprints, clears the target's scores, leaves prose alone, and reports a pair only the target holds. |
| **3** | The workflow rewiring (§4); `db:copy:prose` and `db:copy:labels` moved onto the harness; AGENTS.md entries for every changed job and each new copy. | Workflow YAML is exercised by a `copy-only` dispatch against production, which is also §5's catch-up. The scripts are exercised by the probe. |

**No migration** is needed: every table exists on both sides already. **No About entry** either:
nothing a reader sees changes. Production simply stops being behind.

Each PR is well under the split threshold. PR 1 sets the harness down before anything uses it
against production, and no PR in this plan writes to production itself: production is written
only by the workflow, after PR 3 and the secret.

## 7. Out of scope

- A shared database, or production reading staging at request time.
- Copying the catalog or prices (§2).
- `edhrec_cache`. It is a per-environment fetch cache, and after this plan production makes no
  EDHREC requests to cache.
- Why today's Monday crons did not run. It is noted in §1 and belongs to whoever owns the
  repository variables.
