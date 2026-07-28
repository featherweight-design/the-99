# Plan — Printing-accurate collections, real set names, and automated catalog ingest

**Date:** 2026-07-27
**Branch:** `feat/printings-and-sets`
**Closes:** #84 (wrong printing art), #86 (raw set codes, no set search)
**Related:** #17 (duplicate of #86 — close first), #91 (builder zoom), #94 (component sweep)
**Review:** revised after adversarial plan review; 13 findings folded in, all verified
independently against Scryfall's live API and the codebase. Corrections are marked ⚠︎.

---

## 1. Problem

The catalog is seeded from Scryfall's **`oracle_cards`** bulk, which contains exactly one
arbitrary printing per `oracle_id`. Two consequences ship today:

1. **#84** — the app shows whatever printing Scryfall picked, not the one you own. The
   reported symptom was an Arcane Signet rendering as a Marvel crossover printing.
2. **#86** — the set filter shows raw codes (`ECL`) because no set metadata exists anywhere.

`src/lib/collection/match.ts:10-14` already documents the root cause: the catalog is
oracle-level, so printing-level Scryfall IDs from user CSVs "only hit when the collection
happens to contain that exact printing."

### What we already have and discard

`src/lib/manabox/parse.ts:25,103` parses a **`Scryfall ID`** column — a printing-level
identifier. `src/app/collection/actions.ts:25` then drops it: `PendingItem` is
`{oracleId, setCode, foil, condition, quantity}`. It never reaches the database.

For ManaBox imports this is not an inference problem. We are handed the exact answer and
throw it away.

---

## 2. Evidence — `data/the-vault.csv` (2,934 rows)

CSV-derived:

| Measure | Value |
|---|---|
| Rows | 2,934 |
| Missing Scryfall ID / collector number / set name | 0 / 0 / 0 |
| Distinct Scryfall IDs | 2,897 |
| Distinct set codes | 254 |
| Cards with >1 distinct printing in the same set | 70 |
| Rows collapsed by the current primary key | 103 |

⚠︎ **Verified against Scryfall's `/cards/collection` API** (all 2,897 IDs resolved, 0 errors)
— three CSV-only claims in the first draft were wrong:

| Measure | First draft | **Actual** |
|---|---|---|
| Rows excluded by `SKIP_LAYOUTS` | 110 (heuristic) | **113** — 109 `token`, 4 `emblem` |
| Non-English printings | 0 (per ManaBox's `Language` column) | **4** — `ja`, the Neo alt-art lands |
| Rows with no top-level `image_uris` | not considered | **60** — 47 `transform`, 12 `modal_dfc`, 1 `reversible_card` |
| Rows with no top-level `oracle_id` | not considered | **1** — `reversible_card` |
| Importable rows | 2,824 | **2,821** |

ManaBox's own `Language` column reports `en` for all 2,934 rows and is simply wrong for four
of them. **Do not trust CSV metadata where Scryfall is authoritative.**

Same-set multi-printing examples: `Plains` (ECL) 269/274 · `Lander` (TEOE) 5/6/7/8 ·
`Food` (TTLA) 19/20/21 · `Sonic Shrieker` (TDM) 226/318.

**Conclusion:** the 103 collapsed rows are real data loss happening now, concentrated in basic
lands and tokens — exactly where art variation is the point. This settles Option A/B in favour
of **B: distinct printings are distinct holdings.**

⚠︎ Of those 103, **102** separate under the new key. `Safewright Cavalry` (ECL 191) is two
rows with an identical Scryfall ID differing only by `condition` (`mint` / `near_mint`);
condition is not in the key and will still collapse. That is correct behaviour, not a defect.

---

## 3. Target architecture

### 3.1 `sets` table

Sourced from `api.scryfall.com/sets`.

```ts
export const sets = pgTable("sets", {
  code: text("code").primaryKey(),          // lowercase, e.g. "ecl"
  name: text("name").notNull(),             // "Lorwyn Eclipsed"
  setType: text("set_type").notNull(),      // expansion | commander | token | promo | …
  releasedAt: date("released_at"),          // nullable — undated/unreleased sets exist
  cardCount: integer("card_count").notNull().default(0),
  digital: boolean("digital").notNull().default(false),
  iconSvgUri: text("icon_svg_uri"),
});
```

Not derived from `default_cards` (which carries `set`/`set_name`) because `/sets` adds
**release dates and set types**, letting the filter sort chronologically. 254 sets sorted
alphabetically is unusable.

⚠︎ **`/sets` is not paginated.** Verified live: `has_more: false`, `next_page: null`, **1,047
sets in one response**. The first draft specced pagination handling and a pagination unit test
for behaviour that never occurs. Fetch once; assert `has_more === false` and fail loudly if
Scryfall ever changes that.

### 3.2 `printings` table

Sourced from the **`default_cards`** bulk — 620.8MB verified live (the `oracle_cards` file we
use today is 201.4MB).

```ts
export const printings = pgTable("printings", {
  scryfallId: uuid("scryfall_id").primaryKey(),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  setCode: text("set_code").notNull(),                   // lowercase
  collectorNumber: text("collector_number").notNull(),   // TEXT — "31", "12a", "★"
  imageUri: text("image_uri"),
  imageUriSmall: text("image_uri_small"),
  finishes: text("finishes").array().notNull(),          // nonfoil | foil | etched
  isVariant: boolean("is_variant").notNull().default(false),
  isRepresentative: boolean("is_representative").notNull().default(false),
}, (t) => [
  index("printings_oracle_set_idx").on(t.oracleId, t.setCode),
  index("printings_oracle_idx").on(t.oracleId),
]);
```

- **`collector_number` is TEXT.** Scryfall uses `12a`, `★`, `123b`. Never an integer.
- **Image URLs are stored, not constructed** — Scryfall's docs forbid building them.
- **`is_representative`** is computed in a post-load pass (§4.2) so tier-2 resolution is a
  plain `where is_representative` rather than a `DISTINCT ON` with a natural-sort `ORDER BY`
  on every read.
- **FK kept**, orphans filtered at ingest by pre-loading the ~34.7k known `oracle_id`s into a
  Set (~1.2MB). Integrity without lock-stepping the two ingests.

#### 3.2.0 `skipped_printings` — the token/emblem ledger (§9.1)

The FK above means tokens and emblems can never live in `printings`: they have no row in
`cards`. But upload needs to answer "is this ID a token, or genuinely unknown?" without a
network call, so the same ingest pass writes every `SKIP_LAYOUTS` entry to a second, minimal
table.

```ts
export const skippedPrintings = pgTable("skipped_printings", {
  scryfallId: uuid("scryfall_id").primaryKey(),
  layout: text("layout").notNull(),   // token | double_faced_token | emblem | art_series
  name: text("name").notNull(),
});
```

No FK, no images, no oracle id. One extra `if` in the streaming loop, and it keeps
`printings` clean rather than nullable-ing `oracle_id` to make room for cards that are not
cards.

#### ⚠︎ 3.2.1 Double-faced cards — must mirror the existing face fallback

**This was the single worst error in the first draft.** `transform`, `modal_dfc` and
`reversible_card` layouts have **no top-level `image_uris`** — verified live against Delver of
Secrets (`layout: transform`, `image_uris` absent, both `card_faces` carry images).
`transform.ts:19-20` already handles this for `cards`; the first draft's `printings` spec did
not, which would have written NULL images for **60 rows of this collection** and shipped the
bug it was meant to fix.

The printings transform must reuse the same fallback:
`raw.image_uris?.normal ?? faces?.find(f => f.image_uris?.normal)?.image_uris.normal ?? null`.

#### ⚠︎ 3.2.2 Do not filter on `lang`

The first draft specced `lang === 'en'`. Scryfall's own bulk description: *"every card object
on Scryfall **in English or the printed language if the card is only available in one
language**."* The file is already language-deduped, so an `en` filter only removes cards that
have **no** English printing — including the 4 Japanese alt-art lands in this collection.
**Drop the filter entirely.**

#### ⚠︎ 3.2.3 Skip `reversible_card`, and count it separately

`reversible_card` has no top-level `oracle_id` (verified: Adrix and Nev). ~81 exist; 1 is
owned here. §7's "assert required fields and fail loudly" would have crashed the ingest on all
81. Skip them alongside `SKIP_LAYOUTS`, and report the count separately from FK orphans so a
skip spike is diagnosable.

#### ⚠︎ 3.2.4 `is_variant` needs an allowlist

`frame_effects` and `promo_types` are **absent, not `[]`**, when empty (verified: Delver has no
`frame_effects` key) — a naive `.length > 0` throws. And `frame_effects: ["legendary"]` appears
on ordinary legendary cards, so a truthiness test would mark most legends as variants and
corrupt every representative pick.

Use an explicit allowlist: `showcase`, `extendedart`, `borderless`, `etched` in
`frame_effects`/`promo_types`, or `border_color === 'borderless'`.

### ⚠︎ 3.3 Set-code case — normalise on **both** sides

Scryfall emits lowercase `set` codes; `printings.set_code` will be lowercase. But
`collection_items.set_code` is stored **raw from ManaBox in uppercase** — `parse.ts:101` only
`.trim()`s. Tier-2 joins on `(oracle_id, set_code)` and would have matched **zero rows**.

The first draft's defence — "`browse.ts:107,115` already compares case-insensitively" — was
wrong: that is the *filter* comparison, not the join.

**Fix:** lowercase `setCode` at parse time, and backfill existing rows in the Phase 4
migration. Normalising on write keeps `printings_oracle_set_idx` a plain b-tree; a `lower()`
join instead would require an expression index to stay usable.

### 3.4 `collection_items` — the Option B key change

```
current: (user_id, oracle_id, set_code, foil)
new:     (user_id, oracle_id, set_code, collector_number, finish)
       + scryfall_id uuid NULL
```

Not keyed on `scryfall_id` alone: the parser deliberately supports **Moxfield, Archidekt,
Deckbox and bare `Name,Qty`** exports (`parse.ts:20-25`) and only ManaBox supplies a Scryfall
ID. `collector_number` is `NOT NULL DEFAULT ''`, so a bare `Name,Qty` import behaves exactly as
it does today. `oracle_id` stays in the key because every recommendation and deck join uses it.

⚠︎ **`foil boolean` becomes `finish text` — decided 2026-07-27, in scope.** See §9.3 for the
sizing. Values are `'nonfoil' | 'foil' | 'etched'`, matching Scryfall's `finishes` vocabulary
exactly so the two never need translating.

- **Migration.** Same migration as the key change, so there is no second rewrite:
  `ALTER TABLE collection_items ADD COLUMN finish text NOT NULL DEFAULT 'nonfoil'`, backfill
  `finish = CASE WHEN foil THEN 'foil' ELSE 'nonfoil' END`, drop `foil`, then recreate the PK.
  Order matters — the old PK references `foil`, so it must be dropped before the column is.
- **Parser.** `parse.ts:28`'s `NON_FOIL_VALUES` set becomes a map to the three-value union.
  ManaBox emits `normal` / `foil` / `etched`; unknown values fall back to `'nonfoil'`, which is
  today's behaviour for unrecognised strings and keeps the non-ManaBox exports working.
- **Constraint.** A `CHECK (finish IN ('nonfoil','foil','etched'))` — the column is a closed
  vocabulary and a text column without one drifts.
- Six source files touch `foil` (~16 non-test references): `schema.ts`, `parse.ts`, `paste.ts`,
  `actions.ts`, `browse.ts`, plus fixtures and four test files.

### ⚠︎ 3.5 Image resolution is a COALESCE, not a first-tier-wins cascade

```sql
coalesce(exact.image_uri, representative.image_uri, cards.image_uri)
```

1. `printings` joined on `collection_items.scryfall_id` — exact
2. representative printing for `(oracle_id, lower(set_code))`
3. `cards.image_uri` — today's behaviour
4. identity gradient — already implemented

The first draft described an ordered cascade keyed on *match success*. With a DFC whose
printing row exists but whose `image_uri` is NULL, "tier 1 matched" would short-circuit to a
blank image. Selecting on **non-null value**, not on match, is what makes every tier a genuine
fallback.

### 3.6 Bonus — matching improves for free

`match.ts` builds `byScryfallId` from the oracle catalog, where it "only hits when the
collection happens to contain that exact printing." Pointed at `printings`, it covers every
printing in existence and becomes the reliable primary path, with name matching as fallback.

### 3.7 Storage

Production is **57MB total, 34,745 cards in 49MB** (measured on the `production` Neon branch).
Printing rows carry no oracle text or keyword arrays, so estimate **+40–60MB**, landing around
110MB. A non-issue at any tier.

---

## 4. Phases

### Phase 1 — `sets` table + ingest

- Migration `0006`: create `sets`.
- `src/lib/scryfall/seed-sets.ts` — single fetch, assert `has_more === false`, lowercase codes,
  upsert on `code`.
- `scripts/seed-sets.ts` + `pnpm db:seed:sets`.
- ⚠︎ Send **both** `User-Agent` and `Accept: application/json`. Scryfall now 400s without
  them; existing `seed.ts` sends only `User-Agent` and survives on Node's default `Accept: */*`.
  Be explicit in new code.
- Tests: code normalisation, missing `released_at`, `has_more` assertion.

### Phase 2 — `printings` table + ingest

- Migration `0007`: create `printings`.
- `src/lib/scryfall/seed-printings.ts`, reusing the `stream-chain`/`stream-json` pattern from
  `seed.ts` so 620MB is never materialised.
- Skips: `SKIP_LAYOUTS`, `reversible_card` (§3.2.3), `digital: true` (MTGO/Arena printings
  would pollute the representative pick), orphan `oracle_id`s. **No `lang` filter** (§3.2.2).
- Face-aware image extraction (§3.2.1). Allowlist-based `is_variant` (§3.2.4).
- Batch upsert 500 rows, `onConflictDoUpdate` on `scryfallId` — idempotent, mirroring `seed.ts`.
- ⚠︎ **Representative pass must be idempotent and transactional.** A partial ingest leaves
  stale `is_representative = true` rows, and a re-run adding a better printing will not clear
  the old winner. Reset the flag across affected groups, then set it, in **one transaction**.
  Ordering: non-variant first, then natural-sorted collector number
  (`nullif(regexp_replace(collector_number,'\D','','g'),'')::int NULLS LAST, collector_number`).
- Returns `{upserted, skippedOrphan, skippedLayout, skippedReversible, representatives}`.
- **Record measured runtime and row count in this doc after the first real run.**

### Phase 3 — GitHub Actions catalog refresh

`.github/workflows/catalog-refresh.yml`, following the `concert-crawl` pattern but matching
**this repo's** `ci.yml` versions (`actions/checkout@v4`, `pnpm/action-setup@v4`,
`actions/setup-node@v4` with `node-version-file: .nvmrc` — Node 24, pnpm 10.33.2).

```yaml
on:
  schedule:      [{ cron: '0 9 1 * *' }]
  release:       { types: [published] }
  workflow_dispatch:
    inputs:
      target: { type: choice, options: [staging, production], default: staging }
      job:    { type: choice, options: [all, sets, printings, oracle], default: all }

concurrency: { group: catalog-refresh, cancel-in-progress: false }
permissions: { contents: read }
```

- `timeout-minutes: 60` (runner ceiling 6h).
- Kill switch `if: vars.CATALOG_REFRESH_ENABLED == 'true'`, bypassed by `workflow_dispatch`.
- **GitHub Environments** `staging` / `production` each hold `CATALOG_DATABASE_URL`, selected
  by the dispatch input — reusing the `MIGRATE_DATABASE_URL` precedent of a separate,
  explicitly-scoped connection string.
- Run summary to `$GITHUB_STEP_SUMMARY` so runs are auditable without log-diving.

All three triggers coexist — monthly schedule, release-published, manual dispatch.

**Decided 2026-07-27 — the existing oracle refresh migrates here too.** `vercel.json` runs
`/api/cron/scryfall-refresh` weekly at `maxDuration = 300`. Its comment describes the oracle
file as "~150MB"; it is **201.4MB today**. It has outgrown its own documentation and shares the
timeout failure mode we are avoiding for printings. This phase therefore deletes the cron route,
its `CRON_SECRET` handling and the `vercel.json` crons block, and folds oracle refresh into the
`job: oracle` path of the workflow above — a net deletion that removes a latent timeout.

⚠︎ **This phase is not invisible.** If it deletes the Vercel cron, `CATALOG_REFRESH_ENABLED`
must be set to `'true'` **before merge** or oracle refresh silently stops. No UI change, but a
real operational one — the first draft's "visible change: none" oversold it. Add to the PR
checklist.

### Phase 4 — persist printing identity through upload

Migration `0008`: add `scryfall_id` (nullable) and `collector_number` (`NOT NULL DEFAULT ''`),
add `finish` and retire `foil` (§3.4), lowercase existing `set_code` values (§3.3), then drop
and recreate the primary key — in that order, since the old PK holds a reference to `foil`.

- `parse.ts` — parse `Collector number` (candidates: `collector number`, `collector no`,
  `number`, `cn`); lowercase `setCode`; map the `Foil` column to the `finish` union (§3.4).
  Header matching must still pick `Set code` over `Set name` (`findHeaderIndex` tries candidates
  in order, so `set code` wins — keep a test).
- `actions.ts` — carry `scryfallId` + `collectorNumber` through `PendingItem`, the aggregation
  key, and the insert.
- **Token/emblem reporting (§9.1).** Split the unmatched count in two: rows whose Scryfall ID
  hits `skipped_printings` (§3.2.0) are *skipped by design*; everything else stays *unmatched*.
  The review screen reports them on separate lines. Depends on the Phase 2 ingest, so it cannot
  move earlier than this phase.

#### 4.4a `pnpm db:seed:collection` — CLI collection import

The key change invalidates every existing `collection_items` row, so the collection must be
re-imported after this phase. Doing that through `/collection/replace` requires a browser and a
Clerk session; a CLI path is both faster and reusable for seeding a fresh Neon branch.

```
scripts/seed-collection.ts        →  pnpm db:seed:collection
  --file <path>     required, a ManaBox-shaped CSV (default data/the-vault.csv)
  --user <clerkId>  required, the Clerk user id the rows belong to
  --dry-run         parse, match and report; write nothing
```

- **Reuses the real code path**, it does not reimplement it: `parseCollectionCsv` (`parse.ts`)
  → `matchRows` (`match.ts`) → the same aggregation and the same delete-then-insert transaction
  that `actions.ts` runs. A second implementation would drift from the server action and stop
  being a test of it.
- **Prints the same three counts the review screen shows** — imported, skipped-by-design,
  unmatched — so a CLI run and a UI run are comparable. On `data/the-vault.csv` post-Phase-4
  that should read 2,821 imported / 113 skipped / 0 unmatched.
- **`--dry-run` is the default in CI.** A test asserts the three counts against the checked-in
  fixture, which makes this script a regression test for the whole import pipeline rather than
  a one-off utility.
- **Guardrail:** refuses to run without `--user`, and prints the target database host plus the
  existing row count for that user before deleting anything. Wiping the wrong branch's
  collection is the only destructive thing here.
- Not wired into GitHub Actions — this is a local/manual utility. Catalog ingest is automated
  (Phase 3); a user's collection is not.

⚠︎ **There is no "upsert" to update.** `actions.ts:121-127` is `delete`-then-plain-`insert`
inside a transaction — no `onConflictDo*` anywhere. The first draft referred to "the confirm
upsert's conflict target," which does not exist. Consequence: the aggregation key **must
exactly equal the new PK** (`oracleId|setCode|collectorNumber|finish`) or the insert raises
`23505` instead of merging. This is now the single most important invariant in the phase, and
needs a direct test.

⚠︎ **Specify the `scryfallId` collapse rule.** `actions.ts:56` nulls `condition` when rows in a
group disagree. The same question applies to `scryfallId`: two rows sharing
`oracleId|setCode|collectorNumber|finish` but carrying different IDs must collapse to NULL, by
the same rule and for the same reason.

⚠︎ **`csv_uploads.preview_payload` — doc drift and in-flight previews.** `schema.ts:95-96`
hard-codes "compact aggregated `(oracleId,setCode,foil)` totals" (now `(oracleId,setCode,collectorNumber,finish)`) and must be updated. A preview
created *before* the migration and confirmed *after* has no `collectorNumber`; the
`{userId, ...v}` spread would pass `undefined`, which is **not** the same as omitting the key
and will not take the column default. Coerce with `collectorNumber: v.collectorNumber ?? ''`.

⚠︎ **8 files touch `collection_items`, not 7.** The first draft's list missed
`src/app/decks/[id]/search-action.ts:17`, which uses raw SQL (`select 1 from collection_items`)
and so escaped a `collectionItems` symbol grep.

Verified read-path audit — nothing double-counts under a finer key:

| File | Usage | Effect |
|---|---|---|
| `lib/home/summary.ts:17-18` | `sum(quantity)`, `count(distinct oracle_id)` | safe |
| `lib/recs/recommend.ts:106-117` | `selectDistinctOn(oracleId)` | safe |
| `app/decks/actions.ts:15-25` | `selectDistinctOn(oracleId)` | safe |
| `lib/decks/read.ts:121-125,187-189` | `EXISTS` | safe |
| `app/decks/[id]/search-action.ts:17` | raw `EXISTS` | safe |
| `app/collection/actions.ts` | delete + insert | **key must match PK exactly** |
| `lib/collection/browse.ts:76-101` | aggregation | ⚠︎ **silently changes** |

⚠︎ **`browse.ts` does change under Phase 4 alone.** `aggregateCollection` keeps only the
*first* row's `imageUri` (line 90). A finer key makes "first" arbitrary, so image choice
becomes non-deterministic between Phase 4 and Phase 5. **Land Phases 4 and 5 in the same PR**
so that window never ships.

### Phase 5 — flip image resolution (closes #84)

- `browse.ts` resolves per §3.5.
- ⚠︎ `BrowseCard` needs a **per-printing list**, not a single resolved URI — a card owned in
  four printings has four images, and the first draft's singular field could not represent
  that. Carries set code and collector number per printing for the modal caption.
- Variant grouping keys on printing rather than set.
- Tests for all four resolution tiers, explicitly including a DFC whose printing row exists
  with a NULL top-level image.

### Phase 6 — set names + set search UI (visible half of #86)

- Filter reads `sets`; shows `name` with code as secondary text; sorted `released_at DESC`.
- Search field inside the dropdown using the `SearchField` primitive from #85.

**⚠️ Design gate — blocked.** `docs/superpowers/design-tables/collection.md:389` specs the
`Set ▾` *button* (font, padding, radius, colours) but the table has **no dropdown or popover
spec at all** — grepping `dropdown`/`popover` returns only that one heading. A searchable panel
is an undesigned surface, not a styling decision, so per `AGENTS.md` it needs a handoff. The
same gap blocks `Type ▾` and `Sort ▾`, so one handoff covers all three.

Phases 1–5 are unaffected.

---

## 5. Sequencing

| PR | Phases | Visible change | Gated |
|---|---|---|---|
| 1 | 1 + 2 + 3 | none in UI; **operational** (§Phase 3) | no |
| 2 | **4 + 5 together** | correct printing art | no |
| 3 | 6 | real set names + search | **design handoff** |

⚠︎ Phases 4 and 5 are deliberately not separable — see the `browse.ts` note above.

## 6. Rollout

`local-dev` → `staging` → `production`. These are **three separate Neon branches** of project
`misty-rain-01681654`, so each is seeded and inspected independently.

Per branch: migrate, `seed-sets`, `seed-printings`, verify counts, spot-check the 70 known
multi-printing cards, then promote.

## 7. Risks

| Risk | Mitigation |
|---|---|
| 620MB ingest stalls or exceeds a runner | Actions gives 6h vs the cron's 300s; streaming parse bounds memory; `timeout-minutes: 60` fails loudly |
| PK migration corrupts holdings | Single known user; re-upload accepted; tested on `local-dev` first; PR 1 does not touch the key |
| Aggregation key ≠ PK → `23505` on confirm | Direct test; key derived from the PK definition in one place |
| Representative pick lands on an ugly variant | Allowlist-based `is_variant` demoted in ordering; tier-1 covers 100% of the real collection |
| Stale `is_representative` after partial ingest | Reset-then-set in one transaction |
| Set-code case mismatch kills tier-2 | Lowercase on write + Phase 4 backfill |
| Scryfall schema drift | Assert required fields per layout and fail loudly rather than writing nulls |
| Oracle refresh silently stops | `CATALOG_REFRESH_ENABLED` on the pre-merge checklist |

## 8. Test plan

- **Unit:** collector-number natural sort incl. `12a`/`★`; representative selection across
  variant/promo/base; `is_variant` allowlist rejecting `frame_effects: ["legendary"]` and
  surviving an absent key; four-tier COALESCE resolution **including a DFC with a NULL
  top-level image**; face-fallback image extraction; parser picking up `Collector number`
  while `Set code` still beats `Set name`; set-code lowercasing.
- **Integration:** seed `local-dev` from the real bulk; assert the **2,786** resolvable
  Scryfall IDs in `the-vault.csv` map to a printing row (⚠︎ *not* all 2,897 — tokens and
  emblems are excluded by design, so 2,897 was unreachable by construction); assert the 70
  multi-printing cards resolve to **distinct** images; assert the 60 DFC rows resolve to
  non-null images.
- **Regression:** full `the-vault.csv` upload yields **2,821** matched rows, and **102** of the
  103 previously-collapsed rows persist separately (Safewright Cavalry correctly still merges).
- **Gate:** `pnpm typecheck && pnpm lint && pnpm test` + stub-DB build.

## 9. Adjacent findings — decided 2026-07-27

### 9.1 Tokens and emblems fail to import silently (113 rows, 3.9%) — **in scope, Phase 4**

`transform.ts:11` excludes `token`, `double_faced_token`, `emblem` and `art_series`, so these
cards are **absent from the catalog entirely** — verified against production, where `Food`,
`Soldier`, `Lander`, `Treasure` and `Clue` return no rows while `Plains` and `Sonic Shrieker`
do. All 113 land in "unmatched" with no explanation.

Excluding them from a deck-building catalog is defensible — you do not build a 99 out of
tokens. Reporting them as generic unmatched rows is not; it reads as a broken importer.

**Decision:** keep the exclusion, count them separately. Phase 4 classifies a row as
*skipped-by-design* rather than *unmatched* when its Scryfall ID resolves to a printing whose
layout is in `SKIP_LAYOUTS`, and the review screen reports the two counts on separate lines
("113 token and emblem rows skipped"). Requires the `printings` table to answer "what layout is
this ID?" without a network call — which is why it lands in Phase 4 and not earlier.

### 9.2 `#17` duplicates `#86` — **closed 2026-07-27**

### ⚠︎ 9.3 Etched foil — narrower than the first draft claimed

The first draft assumed etched foils would collapse into regular foils under a boolean. Checked
against Scryfall: **920 of 1,205 etched printings are separate card objects with their own
collector numbers** (`finishes: ["etched"]` exclusively), so `collector_number` in the new key
already separates them. The real exposure is the **285 printings that carry `nonfoil`, `foil`
and `etched` on one object** (STA, MH2 retro frames) — there, foil and foil-etched share a
collector number and would merge.

`the-vault.csv` contains **zero** etched rows today; ManaBox's `Foil` column holds only `normal`
and `foil`.

**Decision 2026-07-27: fix it now**, in Phase 4's migration (§3.4). Half a day inside this work
versus several days retrofitted, because by then the key is in production and needs a second
rewrite plus a re-upload. The trigger for the bug is buying one Strixhaven-style etched foil.

---

## 10. Open questions

1. ~~Migrate the oracle cron to Actions~~ — **yes**, folded into Phase 3.
2. ~~Commission the filter-panel design handoff~~ — **yes**, prompt issued 2026-07-27.
3. ~~Token/emblem reporting~~ — **yes**, folded into Phase 4 (§9.1).
4. ~~Etched foil~~ — **fix now**, folded into Phase 4's migration (§3.4, §9.3).

All four resolved. No open questions block execution; Phase 6 waits on the design handoff
(spec: `docs/superpowers/specs/2026-07-27-collection-filter-panel-design.md`, handed off
2026-07-27).
