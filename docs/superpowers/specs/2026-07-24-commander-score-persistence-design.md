# Commander score persistence — design

**Date:** 2026-07-24
**Issue:** #52 (partial — the latency half)
**Status:** Approved (data model approved in session; remaining sections written for implementation)

## Problem

`/commanders` recomputes every commander score on every request. For the reference
collection that is 196 candidates, and the work is not cached in any form beyond the
raw EDHREC HTTP payloads.

Two distinct costs, often conflated:

1. **DB round-trips.** `getEdhrecData` reads the cache with one `SELECT` per commander
   (`src/lib/edhrec/client.ts:25-26`), called once per candidate from the fanout loop
   (`src/lib/recs/recommend.ts:110`). That is ~196 separate round-trips to a serverless
   Postgres on *every* load, including fully warm ones. This dominates the steady state.
2. **HTTP fanout.** On a cold cache, 196 EDHREC requests at `CONCURRENCY = 5`
   (`recommend.ts:104`) — ~40 sequential batches. This only bites when the shared cache
   is cold.

The `edhrec_cache` table is keyed by `commander_oracle_id` alone (`src/db/schema.ts:45-49`)
with **no `user_id`** — it is global. One user's cold load warms every other user's. So
(2) is a first-run problem; (1) is permanent.

### Why pagination alone cannot fix this

Issue #52 proposed server-side pagination with the EDHREC fanout scoped per page. That
does not work. `fitSynergy` is worth 60 of the 100 available score points
(`src/lib/recs/score.ts:114-119`):

```ts
const fitPool    = Math.round(poolFactor   * 15 * 10) / 10;  //  0–15, from collection
const fitRoles   = Math.round(roleCoverage * 25 * 10) / 10;  //  0–25, from collection
const fitSynergy = edhrecTotal == null ? null
                 : Math.round(overlapRatio * 60 * 10) / 10;  //  0–60, needs EDHREC
```

The sort happens *after* the fanout (`recommend.ts:120`), so page 1 is unknowable until
all 196 are scored. A commander ranked 150th on pool+roles alone can enter the top 10
once synergy lands. Scoping the fanout per page would rank each page against itself
rather than globally — a different, wrong page 1.

Persisting scores removes the constraint: once rows exist, ranking is a SQL `ORDER BY`
and pagination becomes trivially correct.

## Approach

Persist the computed list-row for each (user, commander) pair. Compute lazily on miss,
warm eagerly after upload.

### Data model

```
commander_scores
  user_id          text        ─┐ composite primary key
  oracle_id        uuid        ─┘  FK → cards.oracle_id
  slug             text        not null
  score            real        not null
  fit_pool         real        not null
  fit_roles        real        not null
  fit_synergy      real        null — null iff synergy_state <> 'ok'
  synergy_state    text        not null — 'ok' | 'absent' | 'degraded'
  edhrec_owned     integer     null
  edhrec_total     integer     null
  receipts         text        not null — preformatted preview line
  color_pool_size  integer     not null
  role_counts      jsonb       not null
  computed_at      timestamp   not null default now()

  index commander_scores_rank_idx on (user_id, score desc)
```

The table mirrors `CommanderListItem` (`src/lib/recs/recommend.ts:16-34`) and nothing more.

**Only list fields are persisted.** `/commanders/[slug]` renders one commander, so
recomputing it is a single cache read plus one `scoreCommander` call. The heavy
detail-only fields (`roleCards`, `overlapMissing`, `oracleText`) are exactly what
`toListItem` already strips; persisting them would widen the table to serve a page that
does not need the help.

**`name`, `color_identity`, `type_line`, `image_uri` are not stored.** They live in
`cards` and are joined on read. Duplicating them would create a second staleness path
when the Scryfall refresh cron updates card data.

**`slug` is persisted.** Today slugs are assigned in rank order with `-2`/`-3` dedup for
name collisions (`recommend.ts:70-77`), which makes a commander's URL depend on the
global ranking. Persisting the slug decouples URL from rank — this fixes a latent bug,
not only a performance one.

### `synergy_state`

Derived from the existing `{ data, unreachable }` contract that `getEdhrecData` already
returns (`src/lib/edhrec/client.ts:9-19`). No new fetch logic:

| `getEdhrecData` result                      | `synergy_state` | Meaning                          | Refetched? |
| ------------------------------------------- | --------------- | -------------------------------- | ---------- |
| `data !== null`                             | `ok`            | real synergy data                | no         |
| `data === null`, `unreachable === false`    | `absent`        | 4xx — not indexed on EDHREC      | no         |
| `data === null`, `unreachable === true`     | `degraded`      | 5xx / network / timeout          | **yes**    |

This distinction is load-bearing. `retryRecs` currently works *because* nothing is
cached — its own comment says so (`src/app/commanders/actions.ts:8-10`):

> Failed EDHREC fetches are not negatively cached, so revalidating the path causes a
> fresh server render that re-fetches all data.

Persisting naively would break that: a row written during an EDHREC outage would be
served forever, and Retry would re-read the same degraded row. Separating `absent`
(a permanent, correct fact) from `degraded` (a transient failure) preserves the
guarantee while still caching the 99% case.

### Read path — `/commanders`

```
loadCommanderScores(userId)
  → SELECT … FROM commander_scores
      JOIN cards USING (oracle_id)
     WHERE user_id = $1
     ORDER BY score DESC          -- served by commander_scores_rank_idx
```

- **Rows present and none `degraded`** → render directly. One query, no EDHREC calls.
- **No rows** → compute inline via `recommendCommanders`, persist, render.
- **Some rows `degraded`** → recompute only those commanders, update in place, re-sort.
  Rank order for `ok`/`absent` rows is unaffected by the repair.

### Write path — invalidation and warming

Invalidation hooks into the existing `confirmUpload` transaction
(`src/app/collection/actions.ts:118-123`), which is already a full-replace:

```ts
await db.transaction(async (tx) => {
  await tx.delete(collectionItems).where(eq(collectionItems.userId, userId));
  await tx.delete(commanderScores).where(eq(commanderScores.userId, userId));  // added
  …
});
```

Because uploads are full-replace with no merge, invalidation is a wipe — there is no
partial reconciliation to get wrong.

Warming runs after the response via `after()` from `next/server`, which is available in
this Next version and does not make the route dynamic:

```ts
after(async () => { await computeAndPersistScores(userId); });
```

`after` is bounded by the route's `maxDuration`, so the upload route needs a raised
`maxDuration` to accommodate a cold fanout. If the warm is cut short, the lazy path
still produces correct results on the next visit — the warm is an optimization, never a
correctness requirement.

**No partial state is observable.** Initial population writes all rows in a single
transaction, so `/commanders` never sees a half-populated table mid-warm. Later
degraded-row repair updates existing rows, which is safe because rank order is already
established.

### Bulk EDHREC cache read

Prerequisite, and independently valuable. Replace the per-commander `SELECT` with one
bulk read before the scoring loop:

```ts
const cached = await db.select().from(edhrecCache)
  .where(inArray(edhrecCache.commanderOracleId, candidateIds));
```

`getEdhrecData` keeps its current single-commander signature for the detail page and the
deck-suggestion path; the fanout gains a variant that accepts pre-fetched cache rows.
This turns ~196 round-trips into 1 on every cold compute, and is what makes the inline
lazy path tolerable.

## Error handling

- **EDHREC unreachable during compute** — row written as `degraded`, refetched next read.
  Existing degraded banner behaviour is unchanged; `degraded` is surfaced when any row
  has `synergy_state = 'degraded'`.
- **`after()` warm fails or is cut short** — no rows, or a rolled-back transaction. Next
  visit computes inline. No user-visible error.
- **`oracle_id` FK** — a plain reference to `cards.oracleId` with no cascade, matching the
  convention used by `collection_items`, `deck_cards`, and `edhrec_cache`. The Scryfall
  refresh upserts rather than deletes, so orphaned score rows are not an expected state;
  adding a cascade here would diverge from every other card FK for no benefit.
- **Concurrent warm and inline compute** — both write the same (user, oracle) rows via
  `onConflictDoUpdate`; last write wins with identical data. Both derive from the same
  collection snapshot, so there is no divergence.
- **`retryRecs`** — deletes the user's `degraded` rows, then revalidates. The next render
  recomputes exactly those.

## Testing

Unit tests (Vitest, no live DB — following the existing `finalizeRecommendations`
pattern of exporting pure functions for testing):

- `synergy_state` derivation from every `{ data, unreachable }` combination.
- Slug stability: the same collection produces the same slugs regardless of the order in
  which candidates are scored.
- Degraded-row partition: only `ok`/`absent` rows are treated as durable; `degraded` rows
  are selected for recompute.
- Rank preservation: repairing degraded rows does not reorder `ok` rows whose scores are
  unchanged.
- Existing `recommend.test.ts` / `score.test.ts` must pass unchanged — scoring semantics
  are not being altered, only where the result is stored.

Integration verification (manual, against the dev DB with `data/the-vault.csv`):

- Cold load populates 196 rows; warm load issues one query and zero EDHREC calls.
- Upload wipes rows; the `after()` warm repopulates them.
- Rank order identical before and after persistence for the same collection.

## Out of scope

Tracked separately, from the same audit:

- CSV preview loads the entire ~30k-row `cards` catalog uncached on every preview
  (`src/app/collection/actions.ts:42-44`).
- `/decks/[id]` recomputes its 99-card suggestion on every view (`src/app/decks/actions.ts:56-138`).
- No retry/backoff toward EDHREC; 10s timeout, no rate limiting (`src/lib/edhrec/client.ts:35`).
- `csv_uploads` missing a `(user_id, confirmed_at)` index.

The DOM-weight half of #52 (196 rows in one payload) is also separate: `/commanders`
should reuse the client-side windowing already shipped for `/collection`
(`src/components/collection/browser.tsx:23`, `PAGE_SIZE` + "Show more"), which needs no
new design work.
