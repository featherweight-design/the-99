# The 99 — No-collection entry (design handoff, R2 + R3 addendum)

`design_handoff_the99_no_collection_entry/` · 2026-10-15 · account 2 · **R2, approved by Hugh 2026-10-15.** R2 changes path (a) only: an import checkbox replaces R1's offer after the import, drawn on the shipped pages. **R3 addendum, 2026-10-15, awaiting Hugh's review:** the way into Precons I own for a player who already has cards (below).

A stateful first-run addendum: a way into the app for a player with no collection file, or one who can't upload
theirs. Phone and desktop. It changes `design/design_handoff_the99_first_run_onboarding/` (step 1 and the locked
nav) and is aligned with `design_handoff_the99_precons/` (R2 list, R4 tiles), `design_handoff_the99_deck_import/`
and `design_handoff_the99_collection_sync/`.

Source of truth: `docs/superpowers/design-briefs/2026-10-15-no-collection-entry.md` (branch
`brief/no-collection-entry`). Hugh's message of 2026-10-15 loosens his 2026-09-28 ruling 1: upload stays the primary,
first path, and the alternatives sit beside it.

## About the design files

`The 99 - No-Collection Entry (R1).dc.html` is the calls board. The `R1 - *` boards draw every state at 1300 and 390.
They are HTML canvases (open them with `support.js` beside them), not code to ship. The same canvas is live as a
Design artifact in account 2.

**Fidelity:** high for step 1's card and its group, the precon pick rows and foot, the import's checkbox and arrival
strip (R2, drawn on the shipped pages in the Kamigawa theme), the empty states and the lock's words. Scaffolding for the rail and tab glyphs, the dashboard,
the deck page's list and the precon names and counts (G5). Drawn in the dark Kaldheim palette of earlier account-2
rounds; tokens below are the app's.

## The answer in one line

Upload stays the one fill on step 1; under it, one quiet group, **No file? Start another way**, holds Precons I own,
Import a deck and Add cards by hand, and the empty Collection repeats it; Collection opens at zero cards while
Commanders, Discover and Decks wait for a card; every write is an add, one History entry per box or deck.

## R3 addendum: Precons I own, once the player has cards

R2 drew the pick for a player with zero cards and left no way back to it afterwards. S17, G7 and the precons About
edit all assumed one. Boards: `R3 - AddPrecons-Desktop.dc.html` / `-Phone` and `R3 - About-Entry.dc.html`, all
drawn on the shipped pages in Kamigawa.

- **The way in is one row in the Add cards sheet** (S18), `Own precon boxes? Pick them ›`, in the sheet's empty
  state at both widths. On the phone it sits under the shipped `Have a file? Upload it instead` row, in the same 52px
  shape, with the upload first. On desktop it is the only row, because the upload is already in the head. It shows
  only while the list is empty, as the upload row does, and it is absent with `PRECONS_ENABLED` off. Pressing it
  closes the sheet and opens `/decks/precons?pick=own&from=collection`.
  - **Why the sheet:** adding cards is what Add cards is for. The head would need a third button, and the phone's
    strip has room for one trailing control (`+ Add`, as the shipped comment says). The Precons page's shipped `I own
    this precon` sits in the start dialog and starts a deck, which is a different job.
  - **Alternatives weighed:** a Collection head action (rejected: no room on the phone, and it would be a third
    control); an entry on the Precons page head (workable, but it reaches only players who are browsing precons, and
    it would leave About's "from your Collection" untrue).
- **The pick, with cards** (E2): the zero-card pick unchanged, plus the shipped list's `you own 61 of 88` on every row
  while the collection holds any card. This settles G7. Its back link reads `‹ Collection`.
- **S17, a box already added:** a `--success` mark `✓ added Jun 30` after the meta, from the box's precon History
  entry. It stays pickable, because a player can own two of a box. Ticked, the plain note under the row reads `You
  added this box on Jun 30. Adding it again adds a second copy of each card.` A box owned by card overlap gets no
  mark: its figure already says how much of it the player holds.
- **Done returns where the pick was opened** (S19): from Collection, back to Collection with the S5 receipt strip
  under the tabs, with the same words, History and `✕` alone. Refusals and part-failure are S6 and S7, unchanged.
- **Locked, held:** each box is one `addPreconForUser` call, so one History entry that Revert takes back. Upload is
  still the first row on the phone and the head's first button on desktop.
- **About:** the precons edit now reads `Own a few boxes and don’t want decks from them yet? Press Add cards in your
  Collection, then Pick them, and they’re added without starting anything.`

## The open questions, called (brief §Open)

1. **Step 1's shape, given ruling 1: the alternatives are on step 1, below the upload.** They are ways to give us
   your cards, which is what ruling 1 protects, not a way round it, and none is a deck in place of a collection.
   - The card keeps its fan, title, body, `Upload a CSV` (fill) and `Paste a list` (hairline), as shipped.
   - Under them: a 1px `--border` rule, mono kicker `NO FILE? START ANOTHER WAY` (9.5, .14em, `--fg-faint`), and three
     text presses, each a 44px button with no fill and no border.
   - Desktop: three columns, label 13/600 `--fg` with a faint `›`, one sub-line 12 `--fg-muted`. Phone: three
     hairline-separated 44px rows, label and `›` only.
   - **`Add cards by hand` moves out of the button row into the group.** The buttons then say "your file" and the group
     says "no file". It still opens the shipped `AddCardsSheet`.
   - Hover and focus: `--surface-sunken` under the press, the 2px `--accent` ring for keyboard. Tab order is the
     upload's two buttons, then the group, then the locked steps. The lock's `Go to step 1` still lands on
     `Upload a CSV`.
   - Hugh confirms: ruling 1 is his (G1).
2. **Which path leads: Precons I own, then Import a deck, then Add cards by hand.** Precons are the most cards for the
   least typing, because the catalog already knows every card in a box.
   - **(c) is not a button.** Starting empty is what happens when the player leaves step 1 with nothing.
   - A "Start empty" press would write nothing and only move the lock, which reads as a skip button. Instead,
     Collection is open at zero cards (call 6) and its empty state holds the same group.
3. **Owning an imported deck's cards: one checkbox on the import (R2, Hugh 2026-10-15).**
   - **Where:** `/decks/import`, under Deck name and above the import button, at both widths. It is the precon start's
     own opt-in (`StartPreconDialog`'s `I own this precon…` checkbox), in the same place and the same anatomy: an 18px
     box in `--accent`, a 13px label, a 44px row.
   - **Label:** `I own these cards. Add them to my collection.` Unticked by default, from first run and from `/decks`.
   - **Shown** whenever collection editing is on, at any collection size (G4). Like a precon box it adds every copy
     the list names, so a card already owned gains a copy.
   - **Ticked:** the action adds the cards first, then makes the deck, as `startPreconOwned` does, so a refusal leaves
     neither. One History entry (kind `Deck add`, titled by the deck), at the printings the import kept; Revert takes it
     back. Nothing is reserved: an import is not a precon start.
   - **Arrival:** the shipped clean strip takes the precon start's three-line form (`ArrivalBand` `lines`): head `All 100
     lines came over clean.`, body `All 100 cards added to your collection.` + `History`, meta `Imported from your list a
     moment ago`.
   - **Dismiss:** the arrival strip's dismiss is the ✕ alone at both widths, `aria-label="Dismiss"`, a 32px press on desktop and 44px on the phone (Hugh's
     R2 audit). This drops the word `Dismiss` the shipped `ArrivalBand` draws beside it on desktop, for every arrival
     strip, the precon receipt (S5) included.
   - **Refused:** the shared toast on the import page with the precon add's `addFailed` / `addUnsure`; the list and the
     box stay. (S11)
   - **Unticked:** the import is exactly as shipped (S12). No offer follows it; a player who owns part of the list uses
     Shopping's shipped buy tag, card by card.
   - **Withdrawn from R1:** the strip's `Already own these?` line, `Not now`, and the Shopping head line.
4. **The precon pick: a pick mode of the shipped list, `/decks/precons?pick=own`, in rows.**
   - **Rows, not tiles:** it is a pick from 197, and tiles are tall.
   - **Kept:** the shipped search, colour pips, year groups (Newest) and the twin rule, one row per twin pair.
   - **Row (52px desktop, 56px phone, the whole row is the label):** checkbox 20/22px, then pips, name, mono
     `SET · Mon YYYY`, then mono `100 cards`. The ownership figure is dropped in this mode, since every box reads
     0 owned at first run.
   - **Twin:** ticked, it shows one radio pair under the row, `Regular` (picked) / `Collector's Edition · every card
     foil`. A Collector's Edition adds its own printings, never both.
   - **Foot (sticky):** at zero it reads `Tick the boxes you own.` with the add held (`aria-disabled`, .4, never
     removed); pressing it then moves focus to the search. With boxes ticked, the lead line reads
     `3 boxes · 300 cards and 31 tokens` and the button `Add 3 boxes · 300 cards`. Cards are copies, the precon
     arrival's unit.
   - **Header:** `‹ Home` (or `‹ Collection`, by entry), then `Precons I own` and one sentence: no deck is started.
   - **Reached from** step 1's group and the empty Collection's group. The route renders behind a locked Decks slot,
     as every locked route already does.
5. **The later-CSV seam: Collection Sync's handoff answers it, so it is not redrawn.**
   - A collection built by (a), (b) or (c) meets its first CSV at Sync's choice: nothing preselected, Replace and Add
     as shipped, and Sync third and disabled with its shipped never-uploaded reason (`unavailableNoUpload`).
   - **One addition, on Replace's warning, when the dry run finds any:** `212 cards you added from 3 precons and by
     hand aren't in this file and would leave. Revert can bring them back.` It takes the place of the "since your
     last upload" count, which has no upload to be since.
   - Later files can use Sync. See `design/design_handoff_the99_collection_sync/`.
6. **The nav lock at zero cards: Collection opens, the other three stay locked.**
   - **Collection** opens with the edit switch on, because its empty state is where a player who starts empty starts
     (G2). Edit switch off: the shipped four-slot lock.
   - **Commanders, Discover and Decks** stay locked until a card lands, whatever the deck count (Locked 4, G3).
   - **The well and the tab bracket** span the three slots. The words name three:
     `Commanders, Discover and Decks open once your cards are in.`
   - **The note:** on first run, as shipped with three names and `Go to step 1`. Outside first run there is no step 1,
     so its button reads `Add your cards` (to `/collection`). With a deck, the note adds
     `Your decks are on Home until then.`
   - **The unlock** is unchanged (first-run D7): everything unmounts the moment a card lands, with no transition. That
     includes a part-failed precon add and the first `I got it`.
7. **The empty states of `/commanders` and `/discover`.**
   - **Title, both routes:** `Nothing to rank yet`.
   - **Body:** `/commanders` reads `We rank commanders from the cards you own. Add some and every one you can build
     shows up here.` `/discover` reads `Discover finds commanders your cards are close to building. Add some and they
     show up here.`
   - **One button,** `Add your cards`, to `/collection`. It moves to copy keys. Edit switch off: `Upload collection` to
     `/collection`, as today.

## Surfaces

- **Home, outside first run, with decks and no cards** (S12, path (a) imported unticked).
  - The dashboard's header carries `Add your cards` as its one fill, in place of `Update collection` and `New deck`,
    which need cards.
  - The kicker reads `0 cards · 1 deck`. First run's page line appears on desktop.
  - The resume row reaches the deck. Ready to build is absent at zero cards, not empty.
- **The empty Collection** (S13).
  - The two equal doors become one Upload tile (540 wide on desktop, the shipped 64px row on the phone).
  - The group sits under it with `Add cards` (the empty state's own word) as its third row.
  - The body's second clause becomes `Bring a file over, or start another way.`
- **After a precon add** (S5): Home's dashboard, which is what cards and no decks already render, under a receipt
  strip in the deck arrival strip's anatomy.
  - Strip: `--surface-rail`, `✓` in `--success`, dismiss ✕.
  - Text: `3 precons added to your collection: Abzan Armor, Sultai Arisen and Temur Roar. 300 cards and 31 tokens.
    History`.
  - Four or more boxes read `A, B and 4 others`. At 390 it is one line: `3 precons added · 300 cards · History`.
- **Refusals** (S6, S11) are the shared `ToastFrame`, centre placement, `role="alert"`, with `Try again`. They never
  draw an inline error.
  - Wording is the shipped precon add's: `We couldn't add those. Your collection is unchanged.`
  - When the write threw with no answer: `Couldn't confirm the cards were added. Try again and they won't be added
    twice.` Retries are idempotent by id.
- **Part-failed** (S7) stays on the pick.
  - Landed boxes untick and carry `--success` `✓ added just now`. The failed box stays ticked.
  - The toast names both: `Added Abzan Armor and Sultai Arisen. We couldn't add Temur Roar.`
  - Cancel becomes Done (to Home with the strip). Nothing is retried silently.
- **S17, a box already added:** mono `added Oct 13` (the shipped `addedOn` date) on the row, still pickable. Ticked, it
  shows `You added this box on Oct 13. Adding it again adds a second copy of each card.` Only a precon History entry
  marks a box. Owning its cards some other way marks nothing.

## Locks held

| Lock | How R1 holds it |
|---|---|
| No data loss | Every write is an add through `applyCollectionChange`: one entry per box (`addPreconForUser`), one per deck (new deck-to-collection add). Revert takes each back. The later-CSV seam names what Replace would remove. |
| Upload stays primary | The only fill on step 1 and on the empty Collection; the group is text presses below it. |
| Precon add reused | `addPreconForUser` per box, as is; no deck, nothing reserved. |
| Ruling 1's order | Every path ends in owned cards; an unowned deck unlocks nothing. |
| Switches | Edit off: no group, no import checkbox, Collection locked, upload alone (S16). Precons off: the Precons row absent everywhere (S15), the other two keep their columns. |

## About

A new entry, `start-without-a-collection`, plus two ordinary edits (`precons`, `deck-import`) and one bump, 14 → 15,
at launch, batched to the line's last PR. Drawn on `R1 - About-Entry.dc.html` (R3 rewords the precons edit: `R3 - About-Entry.dc.html`); code in
`about · start without a collection.ts`. Chapter 01 after `import`, route `/collection`, `opens the empty
Collection`, plate, specimen = the step-1 group (from its own copy keys), switch `COLLECTION_EDIT_ENABLED`, the
precon key line on `PRECONS_ENABLED`.

## Gaps for Hugh

- **G1 · Ruling 1.** The alternatives are drawn on step 1, below the upload. The other reading, upload alone with a
  quieter link, would be a single `No file?` text press opening a sheet with the three. It is not drawn.
- **G2 · Collection unlocks at zero cards.** This changes the shipped lock, and the brief did not ask for it. It is
  what makes (c) real without a button. If Hugh keeps Collection locked, (c) needs a press after all.
- **G3 · Decks stays locked with an unowned deck** (Locked 4). The deck is reached from Home's resume row and the
  note says so. Opening Decks once a deck exists is the alternative.
- **G4 · Who sees the import's checkbox.** R2 shows it at any collection size, adding every copy as a precon box
  does. Showing it only to an empty collection, or adding only the copies not owned, are the alternatives.
- **G5 · Placeholder data.** Precon names, years, card and token counts are illustrative. Staging has no empty account,
  so no state here was observed.
- **G6 · Part-failure.** The pick writes boxes one entry each, so S7 is real; drawn as a toast plus row marks. A
  single transaction for the batch would remove S7 at the cost of one bad box refusing all.
- **G7 · The pick drops the ownership figure.** Settled in R3: the pick shows `you own N of M` whenever the
  collection is not empty, and drops it only at zero cards.
- **G8 · Home's kicker after a precon add** reads `300 cards · read just now`, the shipped verb. A collection built
  in the app was not "read". Copy-review's call.

## Files

| File | What it is |
|---|---|
| `The 99 - No-Collection Entry (R2).dc.html` | The calls, locks and gaps in one board (R2; R1 kept beside it) |
| `R2 - FirstRun-Desktop.dc.html` / `-Phone` | R2: Import a deck's sub line reads `Paste a list you play.` |
| `R1 - FirstRun-Desktop.dc.html` / `-Phone` | S1, S15, S16, focus, the lock's note |
| `R1 - PreconPick-Desktop.dc.html` / `-Phone` | S2, S3 (twin), S4, S17 |
| `R1 - PreconResult.dc.html` | S5, S6, S7 at both widths (its strip already draws the ✕ alone) |
| `R2 - Import-Desktop.dc.html` / `-Phone` | S8, S10, S11, S12 (R2: the checkbox; replaces `R1 - Import-*`) |
| `R1 - Empty-Desktop.dc.html` / `-Phone` | S12 Home, S13 Collection, the lock outside first run, Open 7 |
| `R1 - LaterUpload.dc.html` | S14 at both widths |
| `R2 - About-Entry.dc.html` | The new entry, its phone reduction, the two edits (R2 wording for path (a)) |
| `R3 - AddPrecons-Desktop.dc.html` / `-Phone` | R3: the sheet row (S18), the pick with cards and added marks (E2, S17), done on Collection (S19) |
| `R3 - About-Entry.dc.html` | R3: the precons edit reworded to name Add cards (replaces `R2 - About-Entry`) |
| `STATES-no-collection-entry.md` | The matrix |
| `READINESS.md` | The verdict and what blocks a green |
| `no-collection-entry · copy strings.ts` | Every new or changed string, for `/copy-review` |
| `about · start without a collection.ts` | The About entry and edits as code |
| `design-tables/no-collection-entry.md` | The property table |
| `brand/` | The locked brand sheet |

Source it was aligned with, on `main`:
- `src/components/home/first-run.tsx` and `first-run-step-one.tsx`;
- `collection/upload-entry.tsx` and `collection-empty-doors.tsx`;
- `shell/nav.tsx`;
- `collection/edit-toast.tsx` (`ToastFrame`);
- `src/app/page.tsx`, `commanders/page.tsx` and `discover/page.tsx`;
- the copy files `refresh.ts`, `collection-edit.ts`, `precons.ts`, `deck-import.ts` and `about.ts`.
