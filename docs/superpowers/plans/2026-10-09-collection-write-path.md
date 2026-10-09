# Collection foundation — schema and write path (plan)

For Hugh's approval, 2026-10-09. Sub-project 1 of the collection home epic
(`docs/superpowers/plans/2026-10-06-collection-home-roadmap.md`, brief
`docs/superpowers/design-briefs/2026-10-06-collection-foundation.md`). **Plan only.** No
migration and no code until this is approved.

This covers the database and the server write path that sub-projects 2 and 4 write through.
The UI waits for the 1+2 Design handoff (roadmap ruling 12). Everything below is backend and
may proceed before that handoff exists, per the design pipeline rule.

## Measured first (staging, read-only, 2026-10-09)

- **One collection, 3,393 rows, 4,492 copies.** Every row carries a `scryfall_id`; 3,392 carry a
  `condition`. A Replace's ledger entry therefore holds about 3,400 row changes at worst, which
  is roughly 0.5MB of jsonb. That is small enough to keep in one row (see Decision 2).
- **Four confirmed uploads, ever** (the first on 2026-07-21). Ledger volume is tiny. Retention
  can be lazy and needs no scheduled job (Decision 6).

## Three corrections to the brief's sketch

Each was found by reading the code the sketch leaned on. The brief's scores bullet is corrected
in #1299, the 1+2 Design brief.

1. **Scores must be cleared on every collection write, and the generation must move.** The
   brief left "narrower invalidation, or let scores go stale" open. `persistScores`
   (`src/lib/recs/store.ts:165-185`) rules both out: its race guard keys on
   `max(csv_uploads.confirmed_at)`, which a hand edit never moves, and it says plainly that a
   writer changing the collection without dropping `commander_scores` leaves every cached score
   served as current. See Decision 4.
2. **The "deck will read short" warning reads committed claims, not buy rows.** The roadmap
   names `loadDeckBuyRows` for it. Those rows are draft-shaped (`src/lib/collection/arrivals.ts:24-26`):
   they include a deck's draft adds. Ruling 5 is about committed decks, which the claim model
   marks as `mature` (`arrivals-write.ts:122-125`). See Decision 5.
3. **Deltas compose, so a double submit double-applies.** The brief presents additive deltas
   as removing the last-write-wins hazard, and they do. They also make a retried "add 1" add two.
   Upload already solved this with a stamp-first lock (`replaceCollection`'s `confirmUploadId`).
   Every other write needs the same thing. See Decision 3.

## Decisions

### 1. One write function, one lock

`applyCollectionChange(userId, change, opts)` in `src/lib/collection/write.ts` is the only code
that writes `collection_items` once the switch is on. It runs in one transaction and, in this
order:

1. Takes the per-user advisory lock `replaceCollection` already takes
   (`pg_advisory_xact_lock(hashtextextended(userId, 0))`), so every collection write for a
   player, upload or edit, is serialized against every other.
2. Inserts the ledger entry first, keyed on the caller's idempotency id (Decision 3). A conflict
   means this exact action already committed, and the transaction is abandoned with
   `alreadyApplied`.
3. Reads the affected rows' current state under the lock.
4. Checks each row's `expected` quantity, when the caller sent one (Decision 3), and refuses
   with `stale` and the current values on a mismatch.
5. Computes the rows' after-state, clamping at zero. A row whose after-state is zero is DELETED
   from `collection_items`, never stored as `quantity = 0`: readers infer ownership from a row
   existing (for example `src/app/decks/import-actions.ts:106-113` and
   `src/lib/home/summary.ts:15-22`), so a zero row would still count as owned. The ledger records
   that row's after-state as `null`.
6. When anything is lowered and the caller has not confirmed, runs the deck check
   (Decision 5) and refuses with `wouldShort` and the decks named.
7. Writes `collection_items`, finishes the ledger entry with the before and after it actually
   applied, clears `commander_scores` for the user, and prunes the user's entries older than the
   retention window (Decision 6).

`change` is one of four kinds, matching the entry kinds:

- `replace`: the full new collection (an upload in Replace mode).
- `add`: rows whose quantities are added (an upload in Add mode, or the Add cards sheet).
- `edit`: per-row quantity changes, each with an optional `expected` (card details, row removal,
  and later "I got it").
- `revert`: a ledger entry id.

`replaceCollection` keeps its signature, its `confirmUploadId` stamp and its `onlyIfEmpty`
check, all of them load-bearing for `probe:arrivals`. With the switch on, its body moves inside
`applyCollectionChange`'s `replace` kind. With the switch off, it runs exactly as it does today
and writes no ledger entry. That matches the brief: switch off, behavior is main's.

### 2. The ledger: one table, before and after per row

One migration adds `collection_history`:

```
collection_history
  id             uuid primary key            -- the caller's idempotency id (Decision 3)
  seq            bigserial not null unique   -- monotonic; the score generation (Decision 4)
  user_id        text not null
  created_at     timestamp not null default now()
  kind           text not null  check in ('upload_replace','upload_add','add','edit','revert')
  source         text           -- 'csv_uploads:<id>' | 'shopping:<deck id>' | null
  rows           jsonb          -- [{ key, name, before, after }]; null once pruned (Decision 6)
  pruned_at      timestamp      -- set when retention clears `rows`; the entry itself stays
  raised         int not null   -- rows whose quantity went up, for the list view
  lowered        int not null   -- rows whose quantity went down
  reverts_id     uuid unique references collection_history(id)
  reverted_by    uuid references collection_history(id)
  index (user_id, created_at desc)
```

Each element of `rows` is
`{ oracleId, setCode, collectorNumber, finish, name, before, after }`, where `name` is the card's
printed name at write time (so an entry still names its card after the catalog drops it, see
Decision 9), and `before` and `after` are
`{ quantity, scryfallId, condition }` or `null` when the row did not exist. Before and after,
not a bare delta, for two reasons. First, `collection_items` carries two columns outside its key
(`scryfall_id`, `condition`), and a revert that recreates a removed row has to put those back.
Second, the history view shows "3 → 1", which a delta alone cannot.

jsonb rather than a child table: an entry is always read and written whole, the largest one
measured is about 0.5MB, and retention then deletes one row per entry. A child table would buy
per-row queries that nothing here makes.

`removed` from the brief's sketch is folded into `edit`: a removal is an edit to zero, and the
history view can label an entry whose every row ends at zero as a removal. `manual_edit` becomes
`edit`, and `add` is the in-app sheet, kept apart from `upload_add` because the two read
differently in history.

No change to `collection_items`, `csv_uploads` or `card_art_preferences`. No backfill: "no
history before this shipped" is a true state.

**The stamp trigger.** `collection_history` is read by the history view only, never by Home or
`/decks`, so it takes no `user_data_touch` trigger. `pnpm check:list-cache` computes this from
the pages' imports and will fail the build if that ever changes. The `collection_items` writes
fire its existing trigger exactly as the replace does today.

### 3. Idempotency and stale views

- **Every action carries an id the client makes once**, a UUID minted when the sheet opens, the
  edit starts or the revert is pressed, and reused on retry. It becomes the ledger entry's
  primary key. A second submit of the same action finds its own committed entry and returns
  `alreadyApplied` with that entry, the same shape as an upload's `alreadyConfirmed`. Uploads
  use a fresh id per confirm and keep their existing `confirmed_at` stamp as well, so an Add
  upload confirmed twice adds once.
- **An edit says what it saw.** Card details and row removal send `expected` (the quantity on
  screen) for every row they lower or set. A mismatch refuses with `stale` and the current
  quantities, and the UI redraws from them. Without this, a tab showing ×3 that "sets 2" would
  take one copy off whatever the collection now holds. The Add sheet sends no `expected`, since
  adding is right whatever the count is.
- **A revert says what it previewed.** The confirmation shows what the revert will do against
  today's collection (brief §F). The client sends the after-quantities it showed, and the server
  recomputes under the lock. A difference refuses with `stale`, and the confirmation redraws.
- **One revert per entry.** `reverts_id` is unique, and the revert sets the target's
  `reverted_by` with a conditional update, `where reverted_by is null returning id`. No row
  returned means another revert won, and the transaction is abandoned. This is the upload
  stamp's pattern again.

### 4. Scores: clear on every write, and a generation that moves

- Every `applyCollectionChange` deletes the user's `commander_scores` in its own transaction,
  as `replaceCollection` does. Correctness first: a one-card edit costs the next Commanders
  visit a recompute.
- `collectionGeneration` (`src/lib/recs/store.ts:101`, read by `ranked-list.ts:106` and
  `confirmUpload`'s score warm) becomes a token holding BOTH sources: the user's
  `max(collection_history.seq)` and `max(csv_uploads.confirmed_at)`, compared whole. Either
  one moving moves the token. One source alone is not enough in two transitions:
  - **The switch turned off after a player has history.** Legacy uploads then move only
    `confirmed_at`, so a token of `seq` alone would stand still.
  - **A previous deployment still in flight.** It compares only the timestamp, and could put
    back scores a new-path edit just cleared.

  `persistScores` compares with `!==` (`store.ts:249`), so any change reads as moved. `seq` is
  a bigserial, and retention prunes payloads without deleting entries (Decision 6), so neither
  half moves backwards.
- **`SCORE_WRITER_CURRENT` moves from 7 to 8** (`src/db/schema.ts:809`). Rejecting writes from
  the previous deployment is that constant's existing purpose, and this release changes what
  makes a score current.
- **To measure before the UI PR:** the recompute cost after a one-card edit, on a `pull:staging`
  scratch branch with `measure:load`'s `/commanders` row. If it is noticeable, the follow-up is a
  narrower invalidation designed against that number. It is not designed here.

### 5. The deck check, inside the write

The check runs inside the write's transaction, under the lock: read the committed claims for the
lowered cards, apply the change, read them again, and compare. Any committed deck whose claim on
a lowered card goes from covered to short is named, with by how many. With no confirmation, the
transaction rolls back and returns `wouldShort` with those decks. The client shows the warning
(brief §E), and on confirm resends the same action, with the same id, plus `confirmShort`.

Inside the write rather than as a separate dry-run read: a separate read leaves a window between
check and save in which another collection write can change the answer, and it costs one more
round trip on every lowering. Inside, under the per-user lock, no other COLLECTION write can
move the answer.

**One window stays open, and Hugh accepted it as an edge case (2026-10-09, see Rulings).** A deck commit
does not take the per-user lock. `commitDeckVersion` locks only the deck and its draft rows
(`src/app/decks/actions.ts:1689-1702`). So a commit landing between the second claim read and
this transaction's commit can make a deck newly reliant on a card the lowering takes, with no
warning shown. The cost is the state ruling 5 already describes: the deck shows its short and
buy marks. Nothing is lost or corrupted. Closing it means every path that changes committed
claims takes the per-user lock first, before its own row locks, which is the same order this
write uses and so cannot deadlock. The commit is one such path; the claim model also reads card
assignments, deck locks, proxies and pull releases, and every writer of those would need the
same rule, inventoried by import rather than by reading. That is a change across the claim
model's write paths, for a race between one player's own two tabs, and it is not done.

This needs the claim read to take a transaction handle. Today `loadAvailability` and
`loadDeckBuyRows` call the module's `db` directly. The change is a parameter defaulting to
`db`, so no existing caller moves. A Replace upload uses the same check, and its preview shows
the decks before the confirm (brief §A).

Adds never run it, since nothing goes down.

### 6. Retention: a read filter and a lazy prune

`HISTORY_RETENTION_DAYS = 90`, one constant in `write.ts` (ruling 6: a year later is a one-line
change). The history view reads only entries newer than that, so what a player sees is exact
whether or not anything has been pruned. Each write also prunes that user's entries older than
the window, inside its own transaction: it sets `rows` to null and stamps `pruned_at`. At four
uploads in three months, a scheduled job would be machinery for nothing.

**Pruned, not deleted**, for three reasons:
- **Idempotency outlives the window.** The entry id is the only record that an action applied
  (Decision 3), so deleting it would let a very late retry of that id apply its addition again.
- **Revert links stay valid.** A revert and its target age out independently, and neither row
  ever disappears from under the other's reference.
- **`seq`'s maximum never moves backwards** (Decision 4).

What stays behind is a few dozen bytes per entry, and the player-visible rule, entries age out
after 90 days, holds exactly. The brief's §F draws a link to an aged-out entry as absent.

### 7. Add mode

`add` upserts by the primary key, `quantity = collection_items.quantity + excluded.quantity`.
On a row that already exists, `scryfall_id` and `condition` follow the aggregation contract
`aggregatePendingItems` already applies inside one upload (`src/lib/collection/pending.ts:30-48`):
equal values stay, and values that disagree fall to null, because two different printings named
under one key cannot both be right. The stored row is treated as one more member of the group. `card_art_preferences` is never written (ruling 2).
`replace`'s aggregation rule, one item per primary key, applies to `add`'s input too, through the
same `aggregatePendingItems`.

### 8. After the write

Every successful write calls the same invalidation `confirmUpload` runs
(`src/app/collection/actions.ts:199-205`: `revalidateUserLists` and every `COLLECTION_ROUTES`
entry). That call moves into one exported function in `src/lib/collection/invalidate.ts`,
because four new actions would otherwise each copy it. Uploads keep writing their arrivals
receipt in both modes, with one change for Add. `writeArrivalsReceipt` treats `pendingItems` as
the whole collection after the write (`src/lib/collection/arrivals-write.ts:94-112`). That
is true of a Replace and false of an Add: adding one copy to a card owned three times would
compare 1 against 3 and record no arrival. The receipt therefore takes the owned counts after the
write, read from the ledger entry's after-states, and the Replace path passes the same thing it
passes today.

### 9. Failure surfaced by name

A revert or an Add that names an oracle id the catalog no longer holds fails the
`cards.oracle_id` foreign key. The write catches that error code and returns `missingCard` with
the card's name taken from the `name` the ledger row stored when it was written (Decision 2).
The foreign-key error carries only the id, and by then the catalog has no name to look up. An
Add from an upload names the card from the upload's own matched row. The brief's §F state draws
this failure.

## What stays exactly as it is

The claim model, seniority and availability reads (beyond the optional transaction parameter),
`deck_cards` and `deck_version_cards`, `card_art_preferences`, `csv_uploads`, the upload preview,
the arrivals receipt, and every reader of `collection_items`. Sub-project 3's deck-table
migration does not touch any of it.

## PR boundaries

Each PR is under the ~20-file / ~800-line bar, none stacked, all behind
`COLLECTION_EDIT_ENABLED` (added to `src/lib/env` in PR 1, read as `=== "true"`, on the
`analysis-flag.ts` pattern).

1. **Ledger and write path.** The migration, `write.ts` (`applyCollectionChange`, the four kinds,
   idempotency, `expected`, the deck check, retention, score clearing), the transaction parameter
   on the claim reads, the generation change in `store.ts`, and the shared invalidation. No
   caller yet besides tests. Tests are mostly rule tests over pure helpers (the before/after
   computation, the clamp, the revert inverse, the generation), plus `.toSQL()` checks on the
   raw SQL per the Drizzle rule in `AGENTS.md`.
2. **Uploads through the ledger.** `replaceCollection` and a new Add upload write through
   `applyCollectionChange` when the switch is on: the Replace/Add server actions, both previews'
   data (the Replace preview's deck check), and the "edits since the last upload" count for the
   Replace warning. Server side only. The choice screen waits for the handoff.
3. **Revert and history read.** The revert action, the history list read (90-day filter, paged
   newest first), and the single-entry read. Server side only.

Then the UI PRs from the 1+2 handoff. They are planned from the handoff, not here.

**Probes.** A new `probe:collection-write` on `local-dev` or a scratch branch, never anywhere
else, since it writes. It proves the four concurrency claims against a real database: a
double-submitted add applies once; two tabs editing the same row with `expected` produce one
`stale`; two concurrent reverts of one entry produce one revert; and a lowering that shorts a
committed deck returns `wouldShort` and writes nothing. It follows the fixture discipline in
`docs/probes.md`: every run mints its own `user_id`, and a `finally` deletes every row that id
created (collection, decks, ledger, scores), so a failed or repeated run leaves nothing for the
next one to trip on. `probe:arrivals` must still pass unchanged, with the switch off and with it
on.

**About.** None in these PRs. The epic's entries are batched at the end of the launch (roadmap
ruling 9). The 1+2 handoff draws them.

## Risks

- **Score recompute after small edits.** Decision 4 chooses correctness and measures the cost
  afterwards. A slow `/commanders` after a one-card edit is the expected symptom if the cost is
  real.
- **The transaction parameter on the claim reads** touches the one module every availability
  surface depends on. It is a defaulted parameter, and `probe:arrivals` and the existing
  availability tests cover the unchanged callers.
- **Lock contention.** Every edit now takes the per-user lock an upload takes, so an edit waits
  while a 3,400-row Replace commits. At this app's scale that is a short wait, and correct.

## Rulings

- **The commit window in Decision 5 is accepted** (Hugh, 2026-10-09). A deck commit landing
  between the deck check and the collection write's commit can skip the warning; the deck then
  shows its short and buy marks, as ruling 5 describes. It is treated as an edge case, and no
  writer of committed claims takes the per-user lock.

No questions remain open. The one number left, the recompute cost in Decision 4, is measured
before any UI ships on it.
