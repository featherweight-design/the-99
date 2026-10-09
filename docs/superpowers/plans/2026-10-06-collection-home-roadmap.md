# Collection home — epic roadmap

Owner ruling, Hugh, 2026-10-06. The app becomes where a player keeps their collection: full
in-app management, not just a CSV importer. Uploading a CSV stays available alongside it.

## The rulings

1. **Full in-app collection management.** Upload stays; it is one way in among several.
2. **Every upload asks a question first**: "Replace my collection" (a warning that any in-app
   edits since the last upload will be overwritten) or "Add these cards" (merge, quantities
   added to what is already there). Both show a preview before the player confirms. **Add mode
   and art** (Hugh, 2026-10-06): an Add upload never overrides a hand-picked printing. A player's
   manual art choice stands; the player re-picks if they want the newly-added printing shown
   instead.
3. **A hand-added card records the same shape an upload gives**: card, printing, foil, quantity.
4. **Entry points**, four of them:
   - "Add cards" on Collection — a sheet for entering several cards in a row.
   - Editing owned quantity and printing from any card's details.
   - "I got it" on a deck's Shopping list — asks printing, foil and quantity at mark time,
     preset to the price already shown there.
   - Removing directly from a Collection row.
5. **Removing or lowering a card a committed deck relies on** warns first, naming the decks that
   will now read short, and saves on confirm. Nothing about a deck changes on its own; the usual
   short and buy marks just start showing on it.
6. **Full history, with revert on any entry.** Revert is a corrective change applied now — it
   reverses that entry's delta — never time travel. An upload is a history entry too. Reverting a
   Replace restores the collection to what it was immediately before that upload. **Retention**
   (Hugh, 2026-10-06): entries age out after 90 days. A year is an easy switch later if the app
   grows past the friend group.
7. **Deck-specific printings.** A deck remembers which printing it means for a card, flowing into
   art, prices, import, export and Shopping. Today a deck stores oracle ids only — no printing
   anywhere in the deck tables (confirmed below).
8. **Card scanning on phone, the free approach**: detect and crop the card, perspective-correct
   it, perceptual-hash the ART box, nearest-neighbor against a static index keyed by
   `illustration_id` (built once from Scryfall's bulk images), then the player picks the printing
   from the printing picker that already exists. No paid model or API call per scan.
9. **Each sub-project ships behind its own `*_ENABLED` switch.** About entries are written once,
   at the end of the whole launch — the batching rule already in `AGENTS.md`. No paid model calls
   anywhere in this epic. Building waits for Hugh's go, after his testing week.
10. **Scanning's pass bar is the card and its artwork, not the printing** (Hugh, 2026-10-08).
    5a passes when at least 95% of test photos find the right CARD and the right ARTWORK (the
    illustration). Choosing among printings that share that artwork is the player's job, in the
    printing picker that already exists. This replaces the 2026-10-06 bar of "the exact
    printing", which asked the hash to tell apart printings that share an illustration by design.
11. **"I got it" is decoupled from deck printings** (Hugh, 2026-10-08). Sub-project 4 does not
    wait for 3. Its printing defaults to the printing behind the Shopping price the row already
    shows, and it ships right after 2. When 3 lands, a deck's chosen printing becomes the better
    default; that is an improvement to 4, not a prerequisite for it.
12. **One Design handoff covers sub-projects 1 and 2** (Hugh, 2026-10-08): the Replace / Add
    choice screen, its preview, and all of the in-app editing (the Add cards sheet, the
    card-details edit, remove-with-warning, history and revert). Sub-projects 3 and 4 each get
    their own Design round later.

## Order

1, then 2, then 4, with 3 running in parallel. 5a can start any time, since it is read-only.
5b to 5d wait for 2 to ship and for 5a to pass its bar.

- **About, batched:** the epic's About entries and its one `ABOUT_VERSION` bump are a named task
  in the PR that closes whichever sub-project ships last (sub-project 4 on the current order, or
  5b to 5d if scanning ships later), drawn by each sub-project's Design handoff along the way.
  The line's close-out does not pass without them.
- **Sequencing against Deck stats:** Deck stats' money PR (S2) lands before sub-project 3's
  `deck_cards` migration, so the money card's price join is written against the deck tables as
  they are today and is not caught mid-flight by the schema change.

## Sub-projects

### 1. Collection foundation

Row-level edits to `collection_items`, a history ledger, the two upload modes with their
preview, and revert. The prerequisite for everything else: 2, 3 and 4 all write through whatever
this project establishes as the one path for changing a quantity.

- **Depends on:** nothing. Ships first.
- **Design:** yes, in the one handoff shared with 2 (ruling 12). Sub-project 1's own new UI is
  the upload choice screen (Replace vs Add) and its preview; the rest is data model and
  plumbing. See the brief, doc 2.
- **Switch:** `COLLECTION_EDIT_ENABLED` (name fixed for all of 2, 3, 4 — one switch for the
  write path, since a history entry from project 2 is meaningless without project 1's ledger).
- **Risks:** the write path is the one piece every other sub-project depends on, so a schema
  choice made wrong here (e.g. a ledger that cannot represent "Add" merges cleanly) is expensive
  to redo later. `replaceCollection`'s per-user advisory lock and its `csv_uploads` confirm-lock
  both need a row-level write path to not re-introduce the race they were built to close
  (`src/lib/collection/import.ts:131-144`, `probe:arrivals`).

### 2. Edit your collection in the app

The UI for project 1: the "Add cards" sheet, the card-details edit (quantity, printing, foil),
remove-with-warning, and a history view with revert.

- **Depends on:** 1.
- **Design:** yes — almost entirely new UI, drawn in the same handoff as 1 (ruling 12). Runs in
  parallel with 3.
- **Switch:** `COLLECTION_EDIT_ENABLED` (shared with 1; see above).
- **Risks:** the removal warning (ruling 5) needs the same claim read `loadDeckBuyRows` already
  does for Shopping, run against the proposed new quantity before it is saved — this is a
  read-before-write the UI has to wait on, which is new latency on a path that was previously a
  client-side-only edit nowhere in the app. The history view's revert needs its own concurrency
  story (see doc 2, edge cases) or a revert can silently clobber a newer edit.

### 3. Deck-specific printings

Decks remember a chosen printing per card. Flows into art, price lookups, import, export and
Shopping.

- **Depends on:** nothing from 1 or 2 directly, but touches the same `deck_cards` /
  `deck_version_cards` surface that claims and seniority read, so it should not land concurrently
  with any other schema change to those tables. Runs in parallel with 2. Its migration lands
  after Deck stats' money PR (S2); see Order.
- **Design:** yes, its own round, after the 1+2 handoff (ruling 12). A printing picker already
  exists (`src/components/cards/printing-region.tsx`) and is the model to reuse for picking a deck's printing; whether and how it is exposed from the
  decklist row is a design question.
- **Switch:** `DECK_PRINTINGS_ENABLED`.
- **Risks:** this is a migration on `deck_cards` and `deck_version_cards`, both of which are read
  by the claim model, seniority ordering, and import/export — a wide blast radius for what reads
  as a small addition. A deck's chosen printing needs a sane default (the collection's own
  preferred printing, `src/db/schema.ts:241-252`) for every row written before this ships.

### 4. "I got it" on Shopping

Marking a Shopping row bought asks printing, foil and quantity, preset to the price already
shown, and writes through project 1's path.

- **Depends on:** 2 only (the write path and its UI conventions). Not on 3 (ruling 11): the
  printing defaults to the one behind the Shopping price the row shows. Ships right after 2.
  Once 3 lands, the deck's chosen printing replaces that default where one is set.
- **Design:** yes, its own round after the 1+2 handoff (ruling 12), and small — one new control on an existing row
  (`src/components/decks/decklist.tsx`'s Shopping branch) plus a small confirm step.
- **Switch:** `SHOPPING_MARK_BOUGHT_ENABLED`.
- **Risks:** low on its own; mostly inherits whatever 2 and 3 settled.

### 5. Scanning

Phone card scanning, split into four pieces so the expensive and uncertain part (5a) is answered
before any UI is built on top of it.

- **5a. Measurement spike.** No UI, no switch. Build the static `illustration_id` index from a
  Scryfall bulk image set and measure hash separation (false-match and false-miss rate) over a
  sample of real printings, including near-duplicate art across different sets/treatments. This
  is read-only research and can run anytime, independent of everything else in this epic.
  **Go/no-go bar** (Hugh, 2026-10-08, ruling 10): proceed to 5b only if at least 95% of test
  photos find the right card AND the right artwork (illustration) — wrong at most 1 in 20. The
  printing is not part of the bar: the player picks it from the existing picker. Measure the
  card and the artwork separately, so a miss says which one failed.
- **5b. Single-card scan, then pick.** Detect, crop, perspective-correct, hash, nearest-neighbor
  lookup, then hand off to the existing printing picker for the player to confirm or correct.
  Depends on 2 (the picker needs to be reachable from a scan result, and the write goes through
  project 1's path) and on 5a passing its bar.
- **5c. Optional exact printing via OCR**, reading the set code and collector number off the
  card to skip the pick-from-candidates step when the hash alone is ambiguous. Optional,
  depends on 5b shipping first.
- **5d. Batch or live scanning** — multiple cards in one session. Depends on 5b.
- **Switch:** `CARD_SCAN_ENABLED` for 5b onward; 5a ships no code behind a switch since it draws
  no UI.
- **Risks:** 5a is the whole bet. Illustration art repeats across printings that share art
  (reprints, some promos) by design, which is a feature (fewer index entries to search) and a
  trap (two different printings can legitimately hash identical if they share the same
  illustration — the picker is what resolves that ambiguity, not the hash, which is why ruling
  10 sets the bar at the artwork). Camera-side
  perspective correction on a phone with no backend model is the other open risk; 5a's sample
  should include some rotated/skewed captures, not just clean flat scans.

## What exists today

Verified against `origin/main` by reading the files named.

- **`collection_items` storage.** One row per `(user_id, oracle_id, set_code, collector_number,
  finish)`, `quantity` as an int, no history and no timestamp column at all
  (`src/db/schema.ts:223-239`). A replace is a full delete-and-reinsert for that user, never a
  per-row update.
- **`replaceCollection`** (`src/lib/collection/import.ts:136-204`) is the one write path today.
  It takes a per-user Postgres advisory lock, optionally stamps `csv_uploads.confirmed_at` as a
  one-shot lock on the upload row (`confirmUploadId`), optionally refuses outright when the
  collection is non-empty (`onlyIfEmpty`, used for a first import), deletes every
  `collection_items` row for that user, clears `commander_scores` (every score derives from the
  collection), and batch-inserts the new rows. There is no partial-update path and no "add to
  existing" mode in the schema or the code.
- **The confirm/upload path.** `confirmUpload` (`src/app/collection/actions.ts:140-228`) reads
  the state before the replace (`ownedByOracle`, `loadDeckBuyRows`), calls `replaceCollection`,
  invalidates every cached route that reads the collection (`COLLECTION_ROUTES`, checked by
  `pnpm check:collection-routes`), then writes the arrivals receipt, then warms scores in
  `after()`. `ConfirmOutcome` already models one branch beyond a plain success —
  `needsConfirm` — which is the shape a "Replace vs Add" choice screen would extend rather than
  invent from scratch.
- **The arrivals receipt** (`src/lib/collection/arrivals-write.ts`,
  `src/lib/collection/arrivals.ts`) diffs owned counts and deck buy state across the replace and
  is stored on the upload row. It already knows how to read "before" and "after" collection
  state and turn it into a per-deck, per-card summary — the shape a history entry's own diff
  would want to reuse or extend, rather than a new diff engine.
- **The printing picker.** `PrintingRegion`
  (`src/components/cards/printing-region.tsx:67`) renders inside the card modal, lists every
  printing the player owns or could own, search/filter past `OVERFLOW_THRESHOLD` (12) entries,
  and already has the finish chips (foil/nonfoil) and a dormant (owned-zero) state. This is the
  component scan results (5b) and the deck-printing picker (3) should both resolve to, rather
  than either building a second one.
- **Card-details owned line.** The card modal's `data-testid="owned-line"` span
  (`src/components/cards/card-modal.tsx:278-280`) reads `×{a.owned}` off the live availability
  read — there is no inline edit control on it today; it is display-only.
- **Shopping rows.** `src/components/decks/decklist.tsx`'s Shopping branch
  (`commanderShoppingRows`, `isShoppingCard`, around line 218-487) draws what a deck still needs
  to buy, priced through the claim model. There is no "mark as bought" control anywhere on this
  surface today; adding one is new, not a toggle on something that exists.
- **Deck-specific printings — confirmed absent.** `decks.commanderOracleId` /
  `partnerOracleId` and `deckCards.oracleId` (`src/db/schema.ts:285-444`) are all oracle ids;
  `deckVersionCards` (same file, following rows) is the same shape. No printing column exists
  anywhere in the deck tables today, so sub-project 3 is a genuine schema addition, not a column
  already there and unused.
- **`illustration_id` — confirmed not stored.** `printings` (`src/db/schema.ts:90-120`) carries
  `scryfallId`, `oracleId`, `setCode`, `collectorNumber`, `imageUri`, `imageUriSmall`,
  `artCropUri`, `backImageUri`, and more, but no `illustration_id` column. Scryfall's bulk data
  carries it; it is simply not ingested yet. Sub-project 5a needs either a new column added to
  `printings` by the catalog ingest, or a side table built directly from a bulk image fetch —
  that choice is 5a's to make once the measurement is in.

## Open questions for Hugh

None open. All three answered 2026-10-06 and folded into the rulings above (history retention
into ruling 6, add-mode art preference into ruling 2, 5a's go/no-go bar into sub-project 5).
The 2026-10-08 re-review added rulings 10 to 12 and the Order section.

