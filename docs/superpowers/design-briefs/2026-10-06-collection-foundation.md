# Collection foundation, sub-project 1

Design brief, 2026-10-06, for the collection home epic
(`docs/superpowers/plans/2026-10-06-collection-home-roadmap.md`). Engineering and Design.

The only new UI in this sub-project is the upload choice screen (Replace vs Add) and its
preview. Everything else here is data model: row-level edits, a history ledger, and revert.
Sub-project 2 builds the player-facing add/edit/remove/history surfaces on top of what this
project establishes.

## The rulings this project covers

From the roadmap's owner rulings:

- Every upload asks "Replace my collection" (warns that in-app edits since the last upload will
  be overwritten) or "Add these cards" (merge, quantities added). Both show a preview before
  confirming.
- A hand-added card records card, printing, foil and quantity — the same shape an upload gives.
- Removing or lowering a card a committed deck relies on warns first, naming the decks that will
  now read short, and saves on confirm. Nothing about a deck changes on its own.
- Full history of every collection change, with revert on any entry. Revert is a corrective
  change applied now (it reverses that entry's delta), not time travel. Uploads are history
  entries. Reverting a Replace restores the collection to what it was immediately before that
  upload.
- No paid model calls. Behind `COLLECTION_EDIT_ENABLED`.

## What exists today, and what this project changes

Today, `collection_items` has no history and no per-row timestamp
(`src/db/schema.ts:223-239`), and the only write path is `replaceCollection`
(`src/lib/collection/import.ts:136-204`): delete every row for the user, batch-insert the new
set. There is no partial update, no merge, and no record of what changed. This project adds a
row-level write path and a ledger beside it; the existing wholesale replace becomes one kind of
entry in that ledger rather than the only way to write.

## Data model sketch

### Row-level edits

A single write function, call it `applyCollectionDelta(userId, changes, opts)`, replaces direct
callers of insert/update/delete on `collection_items`. `changes` is a list of
`{ oracleId, setCode, collectorNumber, finish, quantityDelta }` — deltas, not absolute
quantities, so an Add merge and a hand-edit are the same shape: a merge is just every row's
delta being positive. A quantity that would go negative clamps at zero rather than deleting the
row outright, unless the caller asks for the row to be removed (matches ruling 4's "removing
directly from a Collection row").

This keeps the same primary key collection_items already has
— `(user_id, oracle_id, set_code, collector_number, finish)` — so no migration to that table's
shape is needed; only the write path around it changes.

### The history ledger

A new table, `collection_history`:

```
collection_history
  id            uuid primary key
  user_id       text not null
  created_at    timestamp not null default now()
  entry_type    text not null  -- 'upload_replace' | 'upload_add' | 'manual_edit' | 'remove'
                                -- | 'revert'
  actor         text not null  -- 'upload:<csv_uploads.id>' | 'user' | 'shopping_mark_bought'
                                -- | 'revert:<collection_history.id>'
  delta         jsonb not null -- the same { oracleId, setCode, collectorNumber, finish,
                                -- quantityDelta }[] shape applyCollectionDelta took
  reverted_at   timestamp      -- set when THIS entry has been reverted; null otherwise
  reverts_id    uuid references collection_history(id)  -- set only on a 'revert' entry
```

Every write through `applyCollectionDelta` writes one `collection_history` row in the same
transaction as the `collection_items` change, with the delta it actually applied (post-clamp,
so a revert replays exactly what happened rather than what was asked for). A Replace writes one
`collection_history` row per upload, not one per card — the delta array holds every row the
replace touched, which is what makes `entry_type = 'upload_replace'` revertible as a single
unit (see Revert semantics).

This is additive: it needs no change to `collection_items`'s shape, no change to the primary
key, and no change to `csv_uploads` beyond what already exists. `confirmUpload`
(`src/app/collection/actions.ts:140-228`) keeps writing `csv_uploads` exactly as it does today;
it additionally writes one `collection_history` row inside `replaceCollection`'s transaction.

**Retention** (Hugh, 2026-10-06): entries age out after 90 days, not kept forever. A year is an
easy switch later if the app grows past the friend group — worth a column or a constant rather
than a hardcoded literal, so whoever implements the aging job can move the number without a
migration.

### Claims, seniority, availability, caches, and the stamp triggers

None of these read `collection_items` any differently after this change — they read current
quantities, which `applyCollectionDelta` still ends up writing to the same table and columns.
Specifically:

- **Claims and seniority** (`src/lib/decks/availability-query.ts`) read `collection_items`
  and `deck_cards`/`deck_version_cards` fresh on every call; nothing here changes what those
  reads see once a write commits.
- **Availability** (`loadDeckBuyRows`, same file) is what the removal warning (ruling 5) calls
  *before* a write commits, against the proposed new quantities, to find which decks would read
  short. This is a new call site — a dry-run read, not a write — rather than a change to the
  reader itself.
- **Caches.** `collection_items` already carries the `user_data_touch` constraint trigger
  (`drizzle/0073_user_data_stamps.sql:66-68`), which bumps `user_data_stamps` at commit. A
  row-level insert/update/delete through `applyCollectionDelta` fires that trigger exactly as
  the old delete-and-reinsert did, so Home and `/decks`'s cached payloads invalidate correctly
  with no change needed there. `confirmUpload`'s explicit `COLLECTION_ROUTES` revalidation
  (`src/app/collection/actions.ts:195-203`) stays as the backstop for routes outside that cache.
- **`commander_scores`.** `replaceCollection` clears it wholesale on every write today
  (`src/lib/collection/import.ts:189`), because every score derives from the whole collection.
  A single-card edit through `applyCollectionDelta` should NOT clear every score — that was
  sized for "the collection might have changed completely," which a one-card quantity bump is
  not. Scoring behind a narrower invalidation (or simply leaving scores to go stale until the
  next natural recompute) is a decision for whoever implements this; either answer is
  compatible with the ledger above, so it is noted here rather than decided.
- **`card_art_preferences` on an Add merge** (Hugh, 2026-10-06): untouched. An Add upload never
  overrides a player's hand-picked printing — `card_art_preferences`
  (`src/db/schema.ts:241-252`) is not written by `applyCollectionDelta` for an Add-shaped
  change, same as it is not written by `replaceCollection` today. If the merge brings in a
  printing the player already holds a different preference for, the existing preference keeps
  showing; the player re-picks explicitly if they want the newly-added printing shown instead.

### Migration from today's wholesale replace

No destructive migration is needed. `collection_history` is a new, empty table; existing
`collection_items` rows carry no history and need none backfilled — "no entries before this
shipped" is a true and acceptable state for the ledger. `replaceCollection` itself is kept as
the implementation detail `applyCollectionDelta` calls for a Replace-shaped write (full delete,
batch insert, one history row), rather than rewritten from scratch; its advisory lock and
upload-confirm lock (`src/lib/collection/import.ts:131-144`) are preserved exactly, since they
are what `probe:arrivals` proves and what closed a real double-submit race.

## Revert semantics

Revert is **always** a new write, never a rollback of the original transaction. Reverting entry
`E` computes the inverse of `E.delta` (negate every `quantityDelta`) and applies it through
`applyCollectionDelta`, which writes a fresh `collection_history` row with
`entry_type = 'revert'`, `reverts_id = E.id`. `E.reverted_at` is stamped at the same time, which
is what the UI (sub-project 2) uses to show an entry as already reverted and hide its revert
control.

**Reverting a Replace** is the case the ruling calls out by name: because `upload_replace`'s
delta is the full before/after diff (not just what the upload added), reverting it restores
every row the replace touched to its pre-replace quantity in one step — which is exactly
"restore the collection as it was before that upload," without needing a second, separate
snapshot of the whole collection.

**A revert can itself be reverted** (revert `E`'s revert restores `E`'s state), which falls out
of the model for free: a revert is just another `collection_history` row with its own delta, so
nothing prevents reverting it the same way.

## Edge cases

- **Concurrent edits.** Two writes to the same user's collection in close succession (two
  browser tabs, or a Shopping "I got it" firing while a hand-edit is in flight) are serialized by
  the same per-user advisory lock `replaceCollection` already takes
  (`src/lib/collection/import.ts:141-150`); `applyCollectionDelta` takes the same lock for a
  single-row write. Because deltas compose by addition rather than by overwriting an absolute
  value, two concurrent edits to the same row commit as two history entries and the final
  quantity is correct regardless of commit order — there is no "last write wins" hazard the way
  there would be if each write stored an absolute quantity.
- **A Replace after hand edits.** The warning on ruling 2 ("in-app edits will be overwritten")
  is literal: a Replace after hand edits writes a history entry whose delta is computed against
  whatever the collection holds at that moment, hand edits included, so reverting that Replace
  still restores exactly what existed the instant before it ran — hand edits and all. Nothing
  about hand edits needs special handling in the Replace path; they are just more rows in the
  before-state.
- **Reverting an entry whose card has since changed.** A catalog refresh can change which
  printing a `scryfallId` points at, but `collection_items`' key is `(oracleId, setCode,
  collectorNumber, finish)`, not `scryfallId` — a revert replays by that same key regardless of
  what the catalog did to printing metadata in between, so this is not actually a hazard for the
  collection row itself. The one real case: a card or printing **removed** from the catalog
  entirely (vanishingly rare, but the ingest's FK is enforced) would make a revert's insert fail
  the foreign key on `cards.oracleId`. The write should catch that and surface a named failure
  ("this card was removed from the catalog since") rather than a raw constraint error.
- **Reverting into a short deck.** A revert that lowers a quantity is a removal exactly like a
  hand-edit removal, and goes through the same warn-first path (ruling 5) before it commits — a
  revert is not exempt from the check just because it is "undoing" something.

## About and switch notes

- **Switch:** `COLLECTION_EDIT_ENABLED`, read the same way every other flag in this codebase is
  (`env.COLLECTION_EDIT_ENABLED === "true"`, server-side; see `src/lib/decks/analysis-flag.ts:24`
  for the pattern to follow). Off, `applyCollectionDelta` is never called and the upload choice
  screen does not render — upload behaves exactly as it does on `main` today
  (`onlyIfEmpty` first-import skip, otherwise the existing `/collection/replace` flow).
- **About entry:** none written in this sub-project. Per the launch-wide batching rule
  (`AGENTS.md`, "About entries batch at launch"), the entry for the whole collection home epic is
  written once, at the end of sub-project 4 (or whichever sub-project ships last), covering
  add/edit/remove/history/revert, deck-specific printings, and "I got it" together.
