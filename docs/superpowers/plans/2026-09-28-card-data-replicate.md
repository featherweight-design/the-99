# Plan: build card data once, replicate to production

> **Status: awaiting Hugh's approval (through d9).** No code before it lands.
>
> **Revised the same day for Hugh's cadence ruling** (d9, 2026-09-28):
> - The catalog and prices refresh DAILY.
> - A **release index** runs about 14 days after each new set.
> - Order is kept: the catalog comes first, then prices, then combos.
>
> Also revised for review round 1's eight findings: catalog inputs, the stamp, job conditions,
> build refusals, exact replacement, the score clear, and the catalog lock.
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
production along.

**The Monday crons were late, not missing.** All four `*_ENABLED` variables are `true` and every
workflow is `active`. GitHub simply ran them hours after the cron time:

| Workflow | Cron | Actual start (UTC) |
|---|---|---|
| Catalog refresh | 09:00 | 17:27 on 09-28, 15:44 on 09-21, 15:45 on 09-14 |
| Price refresh | 09:00 | 17:27 on 09-28 |
| Combo refresh | 13:00 | 18:21 on 09-21 |

GitHub documents schedule delays under load, and these are 6 to 8.5 hours.

The consequence matters more than the delay. **Spacing crons apart does not order the jobs.**
Combos at 13:00 exist to follow the 09:00 catalog. If the catalog slips more than the combo does,
combos resolve against the previous week's `cards`. §4 therefore orders every job by an explicit
dependency, not by the clock.

## 2. Each job, costed by what it spends upstream

| Job | Upstream spend per run, per environment | Tables | Decision |
|---|---|---|---|
| **Commander index** (`db:build:index` + `db:build:staples`) | ~3,000 EDHREC requests at 250ms, plus ~1,750 for the pair sweep: **~4,750 rate-limited requests, ~30 minutes** | `commander_support`, `_cards`, `commander_pair_support`, `_cards`, the four role columns, `format_staples`, `identity_composition`; clears `commander_scores` | **REPLICATE.** The whole reason for this plan, and it now runs more often (the monthly run plus a release index, §4). |
| **Combo refresh** (`db:seed:combos`) | 54 Spellbook `/estimate-bracket` requests (sequential, ~1 min, near their 80/min limit) **plus a 656MB bulk download**, streamed and classified | `card_bracket_flags`, `spellbook_variants`, `spellbook_variant_cards`; appends `deck_data_changes` | **REPLICATE.** Halves the load on a volunteer API and the 656MB pull, and closes the 163-vs-572 flag gap. |
| **Commander prose** (`db:build:prose`) | ~3,300 Anthropic calls, only for commanders whose input hash moved | `commander_support.prose*` | **Already copied** (`db:copy:prose`). The direction reverses: generate on staging, copy to production (§4). |
| **Card labels** (`db:build:labels`) | Anthropic batch, ~$41 once and ~$6 a week | `card_labels` | **Already copied** (`db:copy:labels`) and already staging-only. Only the production wiring is missing (§4). |
| **Catalog refresh** (`db:seed:sets`, `db:seed`, `db:seed:printings`) | Two Scryfall bulk files, ~24MB + ~77MB gzipped, ~1 minute | `sets`, `cards`, `printings`, `skipped_printings`; appends `deck_data_changes` | **KEEP PER ENVIRONMENT, now DAILY.** One cheap download, and it is the base the copies are checked against: they must be able to prove the two catalogs agree, which a copied catalog cannot. |
| **Price refresh** (`db:seed:prices`) | One ManaPool request, ~51MB | `printing_prices` | **KEEP PER ENVIRONMENT, now DAILY**, right after that day's catalog. Keyed on `printings.scryfall_id`, which already differs by 81 rows between the two sides, so each side pricing its own printings is the more correct shape, not only the cheaper one. |

What replication saves: every index run, monthly or release, stops spending ~4,750 EDHREC
requests twice. Every weekly combo run stops downloading 656MB and sweeping Spellbook twice. The
two daily jobs that stay per environment cost one or two requests each.

## 3. The shape of a copy

There is one harness, `scripts/lib/catalog-copy.ts`, and every copy script uses it. It follows
`db:copy:labels` and `pull:staging`, and makes several things the older copies lack the default:
`db:copy:prose` has no same-database guard and writes row by row outside a transaction, and
neither it nor `db:copy:labels` is one transaction.

1. **One way, staging to production.** Two variables, never defaulted:
   `CATALOG_COPY_SOURCE_URL` and `CATALOG_COPY_TARGET_URL`. A third,
   `CATALOG_COPY_TARGET_BRANCH`, is the Neon branch id the target MUST report.
2. **Identity by `neon.branch_id`, never the URL.** Both sides report it. The run refuses when
   either is empty, when they are equal, or when the target's does not equal
   `CATALOG_COPY_TARGET_BRANCH`. That last check is the `PULL_TARGET_BRANCH` rule: "not the
   source" is not "safe to write to", and a mistyped URL naming some other database stops here.
3. **The catalogs must agree on the builders' INPUTS, not only their ids.**
   - **Why ids are not enough.** Oracle ids survive a Scryfall text change, and the role pass and
     the combo flags are derived from the text (`seed-index.ts:684-692`, `spellbook/seed.ts:280-283`).
     Two catalogs with the same ids can still disagree about a card.
   - **What is compared.** The **catalog input fingerprint**: an md5 over every card's
     `oracle_id`, `name`, `oracle_text`, `type_line`, `mana_cost`, `cmc`, `keywords`, `layout`,
     `color_identity` and `commander_legal`, sorted by `oracle_id`. That covers every `cards`
     column a builder reads. The builders' own reads decide the list, and PR 1 pins it with a
     test that fails when a builder starts reading a column the fingerprint omits.
   - **When it is checked.** At copy time the fingerprint must be equal on the source snapshot,
     on the target (checked twice, see item 8), and on the source AS BUILT, recorded in the build
     ledger (item 7).
   - **What a mismatch means.** Refresh the stale catalog. Never copy around it.
   - **Keys that are not oracle ids.** Spellbook's `variant_id` is upstream's own text id.
     `identity_composition` and `format_staples` carry a `condition` text built from the index,
     and they are replaced whole, so no target-side key has to match them.
   - **Printing ids.** Nothing in this plan copies a table keyed on them.
4. **A consistent source.** Every source read runs in one `repeatable read, read only`
   transaction, so a staging job committing mid-copy cannot hand production a mixture of two
   builds. This is the `pull:staging` rule.
5. **Each table family is replaced EXACTLY, in one target transaction.**
   - Target rows the source lacks are deleted. The published family is then identical to the
     source, which is what makes item 6's verification mean anything.
   - The one deliberate exception is a set of columns, never rows: prose is left to
     `db:copy:prose` (§3b).
   - A failed or refused copy rolls back and leaves production's previous tables standing.
6. **Verified before commit.** Inside the target transaction, after the writes and before the
   commit, the harness computes each table's row count and an md5 over its ordered key and
   copied columns. It compares them with the same figures from the source snapshot. On any
   mismatch it rolls back and exits non-zero, so a copy that reports success has already been
   compared.
7. **Only a build that SUCCEEDED is copied, and only as it was built.**
   - **The source's own tables cannot prove this.** A build that passed the pair and staples
     floors can still have refused its role pass, or degraded more than 5% of commanders or
     pairs (`seed-index.ts:663-666`, `:732-739`, `:876-889`).
   - **So each builder records its outcome** in a small ledger table on the database it built,
     `catalog_builds`. Its migration is **0074**, assigned by d9 on 2026-09-28. Each row holds:
     - `kind`: `index` or `combos`;
     - `started_at` and `finished_at`;
     - `ok`, set only by the builder's own success path, with every refusal it already applies
       written out as `false` together with its report;
     - `catalog_fingerprint`, taken at build START.
   - **A copy refuses** unless the source's newest row of its kind is `ok`, finished, and newer
     than any failed attempt, and its `catalog_fingerprint` equals both catalogs' current one.
     A catalog that moved during the build therefore refuses too.
   - **Floors as a second check.** The builders' floors (`variantsKept` 53,000, the flag floors,
     `LEGAL_PAIR_FLOOR` 1,500, a non-empty `format_staples`) are re-checked on the snapshot as a
     second line.
8. **Serialised against the catalog ingest.** The catalog ingest takes a session advisory lock,
   `catalog-ingest`, for its run on each database. A copy's target transaction takes the same key
   (`pg_advisory_xact_lock`), then re-reads the target's catalog input fingerprint INSIDE that
   transaction before writing. A catalog refresh can therefore neither land between the check and
   the publish nor commit mid-copy.
9. **The stamp is written on the target connection, in the same transaction.**
   - `stampCatalogRefresh` is bound to the module-scope `src/db` and therefore to `DATABASE_URL`.
     PR 1 gives it a form that takes an executor, `stampCatalogRefreshIn(tx)`, and the harness
     writes the stamp inside the publish transaction, so a copy that commits has stamped the
     branch it verified.
   - The harness imports nothing that reads `DATABASE_URL`. That matters because
     `scripts/lib/env.mjs` loads `.env` over the shell.
   - The builders' publish bodies are split to take a transaction for the same reason (§3a, §3b).
10. **`--dry-run`** prints the counts and every fingerprint on both sides, plus the ledger row
    it would copy, and writes nothing.

### 3a. `db:copy:combos` (PR 1)

**What it does.** It reads `card_bracket_flags`, `spellbook_variants` and
`spellbook_variant_cards` from the staging snapshot, then runs the builder's own publish logic
against production **with logging on**. This is deliberately not a raw table copy.
- `deck_data_changes` is production's own log. Its `seq` is what `deck_profiles.seen_seq`
  compares against, and its entries are the DIFF between production's previous flags and combos
  and the new ones.
- A raw copy would either skip that log or bring staging's `seq` numbers, which mean nothing on
  production.
- Running the publish logic writes the entries production's readers expect, from production's
  own previous state, in the same transaction as the write.

**The split it needs.** Today `publishFlags` and `publishVariants` (`src/lib/spellbook/seed.ts:443`
and `:469`) each open and commit their OWN transaction. Called as they stand, the copy could not
be one transaction or verify before commit. A failure in the second would also leave production
with new flags over old variants. So PR 1 splits each into a body that takes a transaction:
`publishFlagsIn(tx, …)` and `publishVariantsIn(tx, …)`.
- **The builder** keeps its two transactions and calls each body in its own, exactly as now.
- **The copy** calls both bodies inside ONE production transaction, verifies (§3, item 6),
  stamps, and commits.

### 3b. `db:copy:index` (PR 2)

**What it copies:**
- `commander_support` and its `_cards`;
- `commander_pair_support` and its `_cards`, role columns included;
- `format_staples` and `identity_composition`.

**How, in ONE target transaction, replaced exactly (§3, item 5):**
1. Take `SCORE_INDEX_LOCK` exclusively and delete production's `commander_scores`. This is the
   builder's clear, split into a body that takes the copy's transaction (today
   `clearPersistedScores` opens its own, `seed-index.ts:320-331`). Old scores therefore can never
   be served against the new index, and a copy that fails to clear them rolls back whole.
2. Upsert every support and pair row from the source.
3. Delete the target rows the source lacks.
4. Delete and refill each family's `_cards`.
5. Replace `format_staples` and `identity_composition`.
6. Verify, stamp, commit.

**Why exact replacement matters beyond verification.** `readIndexGeneration` keys on
`max(computed_at)`. A target-only row with a newer stamp could otherwise pin that maximum and
stop a copy from retiring cached pages. With the family mirrored exactly, the maximum is the
source's.

**Prose columns.** The three `prose*` columns are left untouched on rows both sides hold. They are
installed by `db:copy:prose`, whose input-hash check refuses a sentence describing themes the
target no longer records. A commander the copy deletes takes its sentence with it, which is right:
the index no longer lists it.

**Pairs.** The builder's pair list includes every pair a deck holds in THAT database. Before
writing, the copy lists production's own built pairs that the source lacks and prints them as a
gap. It does not fail on them. Today there are none, since production holds no pair decks. If
there ever are, the fix is a one-off `target=production` index dispatch, which costs a few
requests, not 4,750.

## 4. Cadence and workflow wiring (PR 3)

**The ordering rule.** One daily root, and every other job hangs off it by dependency, never by
cron spacing (§1).

| When | Staging | Production |
|---|---|---|
| Daily, `Catalog refresh` (cron 09:00 UTC) | `refresh` job: sets, cards, printings | the same, in the same matrix |
| same run, after `refresh` succeeds | `prices` job (`needs: refresh`): `db:seed:prices` | the same |
| `Combo refresh`, chained with `workflow_run` on a successful `Catalog refresh`, gated to Mondays | `build`: `db:seed:combos`, which writes its `catalog_builds` row | `copy`: `db:copy:combos` |
| `Commander index`, chained the same way, gated to "monthly due" OR "release due" (below) | `build`: `db:build:index`, then `db:build:staples`, which writes its `catalog_builds` row. Then `prose`: `db:build:prose` | `copy`: `db:copy:index`, then `db:copy:prose` |
| `Card labels` (unchanged daily cron) | `label` | new `copy`: `db:copy:labels` |

**Catalog and prices.** `Price refresh`'s cron goes away; its workflow keeps `workflow_dispatch`
for a one-off. The price step becomes a second matrix job in `Catalog refresh`, with `needs:
refresh`, so a day's prices always follow that day's catalog on both sides. Both jobs stay per
environment.

**Why `workflow_run`, and why that is now safe.** It fires once per catalog run, not per matrix
leg, and it can only see the run's aggregate conclusion. That is exactly the condition needed
here: combos and the index are built on staging and copied to production, so both catalogs must
be fresh. The copy's input-fingerprint check (§3, item 3) refuses any day on which they are not.
This is the same constraint that pinned `Commander prose` to production, now turned to use.

**The index gate is a small job, `due`, reading staging's database:**
- **Monthly due:** the date is the 3rd or later, and no `ok` index build exists this month.
- **Release due:** some set with `set_type` in `('expansion', 'commander')` has `released_at +
  14 days <= today`, and no `ok` index build STARTED on or after that date. Those two types are
  where new commanders live. `draft_innovation` (e.g. `mbc`, Mystery Booster Commander, reprints)
  is left out, and the list is one constant for Hugh to widen.
- **Where the dates come from.** The catalog's `sets` table, never a hardcoded date or set.
  Reality Fracture (`fra`/`frc`, released 2026-10-02) comes due on 2026-10-16, where it would
  otherwise wait for 2026-11-03. Star Trek (`trk`/`trc`, 2026-11-13) comes due on 2026-11-27.
- **They share one run.** Whichever rule fires first satisfies the other if it falls later in the
  same window: the ledger records the run, and both rules ask "has an `ok` build started since
  X". A release index on the 16th does not stop the monthly run on Nov 3; a monthly run landing
  after a set's due date covers it.

**Concurrency.** Each replicated workflow runs its jobs in sequence under ONE workflow-level
group, so two runs' copies can never overlap. `Commander index` already has one
(`commander-index`). `Combo refresh` gains `combo-refresh`; its only group today is per target,
at job level. The catalog ingest is serialised against copies in the DATABASE (§3, item 8), not
by a shared GitHub group. A GitHub group allows one pending run and cancels the rest, which would
drop a daily catalog run to protect a weekly one.

**Job conditions, written out, because a skipped `needs` skips its dependant by default:**
- **`prose`**: `needs: build`, and runs only on `needs.build.result == 'success'`.
- **`copy`** (index): `needs: [build, prose]`. Its condition:

  ```
  if: ${{ !cancelled() && (needs.build.result == 'success' || (inputs.mode == 'copy-only' && needs.build.result == 'skipped')) }}
  ```

  `!cancelled()` lets a failed or skipped `prose` pass through. The copy of the index never
  depends on the prose run. `db:copy:prose` then installs whatever sentences exist.
- **`copy`** (combos): the same condition, over `needs: build` alone.
- **Dispatch mode.** A dispatch on a replicated workflow takes `mode`: `build+copy` (the default)
  or `copy-only`. `copy-only` skips `build` (and `prose`) with `if: inputs.mode != 'copy-only'`,
  and the conditions above let `copy` run over the skip. The build ledger (§3, item 7) is what
  keeps a `copy-only` honest: it copies the last `ok` build, or refuses.

**The secret Hugh sets, named exactly:** **`CATALOG_COPY_SOURCE_URL`**, in the
**`catalog-production`** environment.
- **Value:** a connection string for the **staging** branch (`br-polished-pond-a6e63y0b`).
- **Recommended role:** a read-only one, so that reading only is a property of the credential and
  not only of the code.
- **The copy job's target:** `CATALOG_COPY_TARGET_URL` is the environment's existing
  `CATALOG_DATABASE_URL`.
- **The target branch id:** `CATALOG_COPY_TARGET_BRANCH` is production's branch id,
  `br-noisy-violet-a6vw4ess`, written into the workflow. It is a guard, not a credential.
- **One secret for all four copies.** `db:copy:prose` and `db:copy:labels` move onto the harness
  in the same PR and read the same variables.

## 5. Today's catch-up

Production's index and combo gaps are filled by the copy, never by a second EDHREC or Spellbook
run. It runs after PR 3 merges and the secret is set:

1. **Confirm the catalogs agree.** Today's catalog run (d9 dispatched both at 17:34 UTC, beside
   the late 17:27 scheduled one) should bring production's 81 missing printings in. Run
   `db:copy:index --dry-run`: it prints both input fingerprints, which must match.
2. **Give the ledger its first rows.** The ledger is new, so staging holds no `ok` build rows yet,
   and a `copy-only` would refuse (§3, item 7). The honest fix is one staging `build+copy` of each
   workflow. That spends one EDHREC index run and one Spellbook run on staging, which staging is
   due anyway (its index is from 09-25, and combos are dispatched for staging today). It spends
   nothing upstream on production.
3. **Production is filled by those runs' `copy` jobs:**
   - 1,717 pairs;
   - 776 staples;
   - 19 compositions;
   - the role columns, current support rows and prose;
   - flags from 163 to 572, with production's notice log recording the diff.
4. **Check it took.** Read-only counts on production, which should match staging's; then
   `GET /api/health`.

## 6. PR boundaries

**PR 1:**
- **Contents:**
  - migration **0074** (`drizzle/0074_*`, `drizzle/meta/0074_snapshot.json`, `drizzle/meta/_journal.json`) for `catalog_builds`, and the ledger writes in both builders;
  - `scripts/lib/catalog-copy.ts` (§3), including the input-fingerprint pin test and the
    `catalog-ingest` lock in the catalog ingest;
  - `stampCatalogRefreshIn(tx)`;
  - the `publishFlagsIn`/`publishVariantsIn` split;
  - `db:copy:combos` (§3a);
  - the stale comment in `src/lib/cache/index-generation.ts:6`, which says an index rebuild does
    not stamp `catalog_refreshes` when `build-commander-index.ts:78` does.
- **Proof:** `pnpm probe:catalog-copy` against TWO scratch Neon branches cut from staging, never
  production or local-dev.
  - Every refusal: same branch, wrong named target, input fingerprints that differ (ids equal,
    one card's text changed), a missing or failed ledger row, a catalog that moved since the
    build, a source under a floor.
  - A verified copy, and a rollback on a forced mismatch.
  - The target's notice log recording the diff.
  - A catalog ingest holding the lock while the copy waits.
  - Each of these mutation-checked.

**PR 2:**
- **Contents:** `db:copy:index` (§3b), with the score clear split into its body.
- **Proof:** the same probe gains an index section:
  - identical fingerprints after an exact replacement, including the deletion of a target-only
    commander;
  - the target's scores cleared in the same transaction, and old scores surviving a forced
    rollback;
  - prose untouched;
  - a pair only the target holds, reported.

**PR 3:**
- **Contents:**
  - the §4 wiring: daily catalog with prices chained, the `workflow_run` chains, the `due` gate
    and the explicit job conditions;
  - `db:copy:prose` and `db:copy:labels` moved onto the harness;
  - AGENTS.md entries for every changed job and each new copy.
- **Proof:**
  - `due` is a pure function over the sets and the ledger, unit tested on the Reality Fracture
    and Star Trek dates;
  - the YAML is exercised by §5's runs.

**No About entry.** Nothing a reader sees changes; production simply stops being behind. Each PR
is under the split threshold. Production is written only by the workflow, after PR 3 and the
secret.

## 7. Out of scope

- A shared database, or production reading staging at request time.
- Copying the catalog or prices (§2).
- `edhrec_cache`, a per-environment fetch cache. After this plan, production makes no EDHREC
  requests to cache.
- Making GitHub's schedule punctual. §1 records the delay, and the dependency chain makes it
  harmless.
