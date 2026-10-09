# Collection foundation and in-app editing, sub-projects 1 and 2

Design brief, 2026-10-06, for the collection home epic
(`docs/superpowers/plans/2026-10-06-collection-home-roadmap.md`). Engineering and Design.
Extended 2026-10-09 to cover sub-project 2 as well: Hugh ruled on 2026-10-08 (roadmap ruling 12)
that **one Design handoff covers sub-projects 1 and 2**. Sub-projects 3 (deck-specific
printings) and 4 ("I got it" on Shopping) each get their own round later and are out of scope
here.

Sub-project 1's only new UI is the upload choice screen (Replace vs Add) and its preview; the
rest of it is data model: row-level edits, a history ledger, and revert. Sub-project 2 is the
player-facing UI on top of that: the Add cards sheet, editing from a card's details, removing
from a Collection row, the warning before a deck reads short, and the history view with
revert. The surfaces Design draws for both are listed in "The surfaces" below. The data model
sections are a sketch for context; the schema and write path are designed separately and may
refine them without changing what a player sees.

## The rulings this project covers

From the roadmap's owner rulings:

- Every upload asks "Replace my collection" (warns that in-app edits since the last upload will
  be overwritten) or "Add these cards" (merge, quantities added). Both show a preview before
  confirming. The one exception is the first upload into an empty collection, which asks nothing,
  since both choices write the same thing (Hugh, 2026-10-09; see §A).
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
  (`src/lib/collection/import.ts:189`), and every collection write must keep doing so, a
  one-card edit included. `persistScores` (`src/lib/recs/store.ts`) states the invariant: a
  writer that changes a collection without dropping `commanderScores` leaves every cached score
  served as current. Its race guard reads `max(csv_uploads.confirmed_at)`, which a hand edit never
  moves, so the generation has to move on every collection write as well. The write-path plan
  (`docs/superpowers/plans/2026-10-09-collection-write-path.md`, in #1300) settles both; nothing here is
  visible to a player beyond the next Commanders visit recomputing.
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

## The surfaces

Seven surfaces, all behind `COLLECTION_EDIT_ENABLED`. Each one ships at phone and desktop width
in the same PR. Copy in this brief describes intent only; the strings themselves go through
`/copy-review`.

### A. The upload choice: Replace or Add (sub-project 1)

**Where:** the existing upload path, `/collection/replace` (reached from the `Replace` control
in `CollectionPlaceHead`, `src/components/collection/collection-place-head.tsx:215`), and the
first-import entry, `UploadEntry`.

**What it does:** after a file is chosen or pasted, and before anything is written, the player
picks one of two:

- **Replace my collection.** The collection becomes exactly the file. The screen warns that any
  in-app changes since the last upload will be overwritten. It says how many when history still
  reaches back to that upload. History keeps 90 days, so when the last upload is older than that
  the count can be short, and the warning then says only that changes may be overwritten, with no
  number. Design draws both forms.
- **Add these cards.** The file's quantities are added to what is already there. Nothing is
  removed. A printing the player hand-picked as the card's art stays picked (ruling 2).

**Preview, then confirm.** Both choices show a preview before the write. The existing
`ReviewScreen` (`src/components/collection/review-screen.tsx`) and the arrivals receipt
(`ArrivalsSummary`) are the model: they already show matched and unmatched rows and what
changed for each deck. Each mode's preview needs to show something different:

- **Replace:** what goes up, what goes down, and what disappears entirely, plus any committed
  deck that will read short afterwards (the warning in E, applied to a whole upload).
- **Add:** what gets added and the totals after. Add never lowers anything, so it never warns
  about decks.

**States to draw:** the choice itself; each preview; a Replace that will overwrite hand edits;
a Replace that leaves decks short; an Add where every row is already owned (quantities still
rise, so this is not "nothing to do"); unmatched rows in either mode; the pending write; a
failed write (nothing changed).

**The first import asks nothing** (Hugh, 2026-10-09, an exception to ruling 2). With an empty
collection, Replace and Add write the same thing, so the question has no answer that changes
anything, and the first upload keeps today's flow with no question.

### B. Add cards (sub-project 2)

**Where:** a new "Add cards" control on Collection, beside the existing `Replace` control in
the place head. It opens a sheet: full height on phone, a side sheet or dialog on desktop
(Design's call).

**A player with no collection starts here too** (Hugh, 2026-10-09). Adding cards by hand is a
way in, not only a way to top up, so the two places a player with no collection lands offer
Add cards beside the upload, as equals:

- **`/collection`'s empty state** (`src/app/collection/(list)/page.tsx:97-115`). Today it offers
  one action, "Upload your CSV". The place head's `Replace` control does not render for an empty
  collection at either width (the desktop button at `collection-place-head.tsx:213`, the phone
link at `:252`), so the control beside it is not there either, and
  the empty state is where Add cards has to appear.
- **Home's first-run step one** (`src/components/home/first-run-step-one.tsx:75`), which embeds
  the upload's file and paste buttons. It offers Add cards beside them.

Both open the same sheet as below. Saving the first cards takes the player out of the empty
state, as a first upload does. The first upload still skips the Replace/Add question (Hugh,
2026-10-09), so a player with no collection meets that question only once they hold cards.

**What it does:** the player enters several cards in a row, without leaving the sheet between
them. Each card records the same four things an upload row does (ruling 3):

- **Card:** found by name search over the catalog, not only over what the player owns.
- **Printing:** preset to the card's default printing, changeable through the existing printing
  picker (`PrintingRegion`, `src/components/cards/printing-region.tsx`) rather than a second
  picker.
- **Foil or not.**
- **Quantity:** preset to 1.

After a card is added to the list, focus goes back to the name search for the next one. The list
shows what has been entered so far, and any line can be changed or dropped before saving.
**One save writes one history entry** covering every card in the list, so a session of adding
reads as one event in history and reverts as one.

**States to draw:** both empty-collection entries offering Add cards beside the upload, at both
widths; empty sheet; the search typing, with results, and with none; a list of
several cards; the same card in several printings or finishes (a normal state: each is its own
holding, and they stay separate lines); the exact same card, printing and finish entered twice
(the sheet combines or flags these, and only these, rather than writing two lines that read as a
mistake); a card already owned (show what the player holds now beside what
they are adding); closing with unsaved cards (ask before discarding); saving; saved, with a way to
see the entry in history; a failed save (nothing written).

### C. Editing from a card's details (sub-project 2)

**Where:** the card modal (desktop) and the card phone sheet. Today the owned line,
`data-testid="owned-line"` (`src/components/cards/card-modal.tsx:278-287`), displays `×N` and,
when the card is not free, the availability marker beside it. Nothing on it is editable. The
edit must not displace or duplicate that marker, which stays visible in every state below.

**What it does:** the player changes how many copies they own of each printing and finish they
hold, adds a printing they do not yet hold, or moves copies from one printing to another (for
example, they own the wrong printing on record). A move is one change that lowers one printing
and raises another, and it is one history entry.

**The design problem to solve here: owning a printing is not the same as showing its art.**
The printing picker in the card modal today sets which printing's art the card shows
(`onPick` calls `setCardArtPreference`, `card-modal.tsx:1364-1374`). Editing what is owned
adds a second, different meaning to the same list of printings. A player must never change their
owned copies when they meant to change the art, or the other way round. Whether the two live in
one list with separate controls, or in two places, is Design's call; the brief only requires that
the two are unmistakable.

**States to draw:** owned and not owned; one printing and several; foil and nonfoil of the same
printing; raising a quantity (saves directly); lowering one that leaves a committed deck short
(goes through E); lowering to zero (the printing leaves the collection, and the card leaves it if
that was the last copy); saving; a failed save.

### D. Removing from a Collection row (sub-project 2)

**Where:** each card on `/collection`, in both the rows view (`RowsView`) and the grid view.
A Collection card aggregates every printing and finish the player holds of that card.

**What it does:** removes the card from the collection, meaning every copy of every printing. To
remove some copies, or one printing, the player uses C. If no committed deck relies on the card,
it is removed straight away. If one does, E comes first.

**States to draw:** the control at both widths and in both views; the pending removal; the row
gone; a failed removal (row stays). The row must not jump or reflow under the reader's finger
while the removal is pending.

### E. The warning before a deck reads short (sub-projects 1 and 2)

**Where:** shared by every change that lowers a quantity: C, D, a Replace upload (A), and a
revert (F). One component, one meaning.

**What it does:** before the change is saved, it names each committed deck that will read short
of the card afterwards, and by how many. The player confirms or cancels. Nothing about a deck
changes on its own (ruling 5): after the save, that deck simply shows the short and buy marks it
already knows how to show.

It only appears when at least one committed deck is affected. A change that leaves every deck
whole saves without it.

**Latency is new here.** Finding the affected decks is a read the server makes against the
proposed quantity, inside the save itself, not before it. The save checks the decks and either
writes or comes back with the warning. A confirm re-checks against the collection as it is at
that moment, so if another tab changed the answer in between, the warning comes back redrawn
rather than the save going through on a stale one. Design draws that redrawn warning too. Every lowering pays it, so a pending state is needed between
the press and either the warning or the save. Design should draw that pending state, not assume
it is instant.

**States to draw:** one deck; several decks; a long list (decide how many are named before the
rest are counted); the pending check; the confirm; a confirm that comes back with a changed
warning; the cancel (nothing changed).

### F. History and revert (sub-projects 1 and 2)

**Where:** a new place in Collection. Whether it is a fourth tab beside Cards, Sets and Proxies
(`collection-place-head.tsx:72-74`), or reached another way, is Design's call.

**What it does:** lists every change to the collection, newest first, for the last 90 days
(ruling 6; older entries age out, and the view should say so rather than ending without
explanation). Each entry shows:

- **When.**
- **What kind:** a Replace upload, an Add upload, cards added in the app, an edit from a card's
  details, a removal, or a revert. A later round adds "I got it" from Shopping; leave room for
  one more kind.
- **What changed:** a summary (how many cards went up, how many went down), expandable to every
  card and its change.
- **Revert,** on every entry not already reverted.

**Revert is a new change applied now, never time travel.** It reverses that entry's own change
against the collection as it is today. Reverting a Replace puts back every card that upload
moved, as it was the moment before. A revert is itself an entry and can be reverted. An entry
that has been reverted stays in the list, marked as reverted and linked to the revert, with no
revert control of its own. The two age out separately: once one is past 90 days, the other still
reads as reverted (or as a revert), and the link to the aged-out entry is no longer drawn.

**When a revert cannot fully undo.** Because a revert works against today's collection, it can
do less than the entry did. For example: an entry added 3 copies, 2 were removed since, so the
revert can only take away 1 (a quantity never goes below zero). The revert's confirmation shows
what it will do now, not what the entry did then, and says so when the two differ. A revert that
lowers a quantity goes through E like any other lowering.

**States to draw:** empty history; a list with every entry kind; an expanded entry, short and
very long (a Replace can touch hundreds of cards); a reverted entry and its revert; the revert
confirmation where today matches the entry and where it does not; a revert that warns about
decks (E); the pending revert; a revert that fails because a card left the catalog since (it
names the card, and nothing is written); the 90-day edge.

### G. Switch off

With `COLLECTION_EDIT_ENABLED` off, none of A to F render, and upload behaves exactly as it does
on `main` today. Nothing for Design to draw; listed so the handoff's state list is complete.

### What every surface shares

- **Mobile and desktop parity** in the same PR, per the design pipeline.
- **One history entry per player action.** A sheet save, a card-details save, a removal, an
  upload and a revert each read as one line in F.
- **The collection is the only thing that changes.** No surface here edits a deck, an art
  preference (except where C keeps them explicitly separate), or a Shopping list.
- **No paid model calls** anywhere in this round.

## About and switch notes

- **Switch:** `COLLECTION_EDIT_ENABLED`, read the same way every other flag in this codebase is
  (`env.COLLECTION_EDIT_ENABLED === "true"`, server-side; see `src/lib/decks/analysis-flag.ts:24`
  for the pattern to follow). Off, `applyCollectionDelta` is never called and the upload choice
  screen does not render — upload behaves exactly as it does on `main` today
  (`onlyIfEmpty` first-import skip, otherwise the existing `/collection/replace` flow).
- **About entries:** none ship in sub-projects 1 or 2. Per the launch-wide batching rule
  (`AGENTS.md`, "About entries batch at launch"), the epic's entries ship together, with one
  `ABOUT_VERSION` bump, at the end of whichever sub-project ships last. That changes WHEN, not
  whether. This handoff still draws the entries for what 1 and 2 add (upload choice, Add cards,
  editing, removing, history and revert) on the per-entry template artboard in
  `design/design_handoff_the99_about/`, so they are not written from memory at the end. The roadmap's Order
  section names the batched entry task.
