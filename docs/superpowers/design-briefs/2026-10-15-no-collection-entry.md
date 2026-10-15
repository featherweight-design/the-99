# A way in without a collection

Design brief, 2026-10-15. Queue item "a way in without a collection". Hugh's words: "a means of entry for a player
without a collection, or one who cannot upload theirs." His examples: someone with a Moxfield decklist, and someone
who has only ever bought precons. This brief records:

- what the app does today for an account with no collection rows;
- the earlier version of this entry, and why Hugh removed it;
- three paths engineering proposes;
- what Design owns.

All paths are on `main`. Line numbers were read on 2026-10-15 and move. Data is read-only: staging and production
were queried with SELECT only.

## The problem

The app is built around one first move: upload a collection CSV. Everything else is unlocked by that file. Two kinds
of player have no such file:

- **A player whose cards live elsewhere.** They keep a Moxfield or Archidekt list, or a paper pile they have never
  catalogued. They can paste a decklist in seconds, but a whole-collection export is something they don't have.
- **A player who has only bought precons.** Their collection is a few boxes. The catalog already knows every card in
  those boxes, so asking them to type or scan them is asking them to tell the app something it already holds.

Today both meet a checklist whose step 1 is the upload, and a navigation that calls four of its five places locked.

**Measured, 2026-10-15:**

- Production has 6 accounts. One holds neither a collection nor a deck: it signed in and never got past step 1. The
  other 5 hold both.
- Staging holds 2 accounts, both with full collections (3,393 and 3,505 rows). There is no empty account to measure
  against, so every no-collection behavior below was read from the code, not observed.

## The earlier version, and why it went

- **What it was.** The UI refresh handoff (#417, 2026-09-07, decision 6) put import on first run and on the zero-deck
  state, "because a player arriving with a decklist and no CSV would otherwise be stuck". #420 and #437 built it as a
  foot under the first-run checklist: `Already have a deck elsewhere?` and an `Import a deck` button to
  `/decks/import`. The copy comment beside it read "arriving with a decklist and no CSV must not be a dead end."
- **The removal.** Hugh walked production's first run on an empty account and ruled
  (`2026-09-28-first-run-onboarding.md` §3):
  > 1. **Step 1 is the collection only.** Remove "Already have a deck elsewhere?" and the "Import a deck" button from
  > the first-run checklist. The collection always comes first.

  Ruling 2 moved import to step 2 ("Pick a commander" or "Import a deck"), which opens only once a collection is read.
  #1103 shipped both on 2026-09-28. No reason beyond "The collection always comes first" is written down.
- **What remains.**
  - `/decks/import` still exists and has no collection gate. A player who types the URL can import a deck today.
  - `refresh.ts:249`: step 2 reads `Pick a commander or import a deck`, drawn locked as `Opens once your cards are in`.
  - `refresh.ts:226`: `importDeck` (`Import a deck`) is still used by the `/decks` zero state (`decks-zero.tsx:83`).
  - Two comments are stale: `first-run.tsx:1-4` still describes "an import escape hatch", and `page.tsx:103-106` says
    the checklist links to `/decks/import`. Engineering fixes both with this work.
- **What this brief does NOT reopen.** Ruling 1 put the collection first *in the checklist's order*. Every path below
  ends in a collection or builds one; none treats a deck as a substitute for one. Whether ruling 1 also forbids
  showing a non-upload path *on step 1* is the first question for Design (§Open, 1), and it is Hugh's to confirm.

## What exists today, for an account with no collection rows

**Nothing is blocked on the server.** The proxy redirects for the About sheet only (`src/proxy.ts:129-139`). Every
route renders when its URL is typed. What makes the app look blocked is the shell and the empty states.

| Surface | What a no-collection account sees | Where |
|---|---|---|
| Home | Zero cards AND zero decks: the first-run checklist. Step 1 is the embedded upload flow, plus `Paste a list` and `Add cards by hand` (the latter only with `COLLECTION_EDIT_ENABLED`). Steps 2 and 3 are locked. With any deck, the normal dashboard instead. | `page.tsx:152-154`, `:202`; `first-run-step-one.tsx:82-95`; `first-run.tsx:135-136` |
| Navigation | Locked whenever the collection is empty, **whatever the deck count**: Collection, Commanders, Discover and Decks become buttons opening a note, and its `Go to step 1` goes to `/collection/replace`. | `shell.tsx:42`; `nav.tsx:45-49`, `:84-100`, `:246-262` |
| `/collection` | `Your collection is empty` (a hard-coded title). With the edit switch, two doors: Upload, and Add cards (`AddCardsSheet`). Without it, `Upload your CSV`. | `(list)/page.tsx:103-131`; `collection-empty-doors.tsx:51-82` |
| `/commanders`, `/discover` | `No collection yet` / `Upload your cards and we'll rank every commander you can build.` / `Upload collection` (inline literals, linking to `/collection`). | `commanders/page.tsx:40-60`; `discover/page.tsx:41-60` |
| `/collection/sets` | The sets index's first-run copy: upload, or search a set to browse it at 0%. | `set-index-view.tsx:256`, `:292-299` |
| `/decks` | With no decks, `DecksZero`: buttons to `/commanders` and `/decks/import`. | `decks-view.tsx:940`; `decks-zero.tsx:83` |
| `/decks/new` | The commander picker lists owned commanders only, so it reads `No owned commanders found. Add cards to your collection first.` The precon and help doors still show. | `new/page.tsx:77-80`; `create-picker.tsx:549-555` |
| `/decks/import` | Works. The commander must be legal, not owned (`import-actions.ts:~226-262`). | |
| `/decks/precons` | Works, behind `PRECONS_ENABLED` alone. Owned counts read 0. | `precons/page.tsx:34` |

**Deck import with no collection** (`src/app/decks/import-actions.ts`):

- It succeeds. The arrival strip reports the lines that came over and its printing clauses (`:303-322`). With zero
  rows, every printing counts as not owned, and the deck's To buy and Shopping views list all 99 cards.
- **No action owns an imported deck's cards.** The only per-card route is `I got it` on the Shopping view
  (`markBought`, `mark-bought-actions.ts:56-103`), one card at a time.

**A precon to the collection** (#1705, #1706, #1713):

- **The live path is the Start dialog's `I own this precon` option** (`start-precon.tsx`; copy `precons.ts:147-149`).
  It runs `startPreconOwned` (`precon-actions.ts:42-62` → `src/lib/precons/start-owned.ts:50-96`). In one
  transaction it:
  - adds the box's cards at the box's own printings, foils as foils, as ONE History entry (`precon:<file>`) that Revert
    takes back;
  - marks the box's tokens owned;
  - starts the deck as v1;
  - reserves the box's copies to that deck.
- It is an add through `applyCollectionChange`, never a replace, so it cannot overwrite anything.
- It needs `PRECONS_ENABLED` and `COLLECTION_EDIT_ENABLED` (`canOwn`, `[fileName]/page.tsx:42`).
- **Adding a box WITHOUT starting a deck has an action and no caller.** `addPreconForUser` (`src/lib/precons/add.ts:118`)
  is #1705's add-only action. #1713 folded the add into Start, and nothing calls it now. Path (b) below gives it its
  caller. It writes the same one-entry add with the tokens marked, and takes an idempotency id.
- **The catalog side:** 197 precons (181 that are not a Collector's Edition twin), across 49 sets, from 2011-06-17 to
  2026-10-02, about 100 copies each. 6,406 distinct cards in all.

**Add cards and I got it from zero rows:**

- Both work. Add cards is `addToCollection` → `applyCollectionChange {kind:"add"}` (`edit-actions.ts:122-138`), behind
  `COLLECTION_EDIT_ENABLED`.
- I got it writes `expected + quantity` from `expected = 0`, behind `SHOPPING_MARK_BOUGHT_ENABLED`, which needs the
  edit switch (`registry.ts:55`).

**The data-loss seam.** Once any of these paths has written rows, the collection is no longer empty:

- A later CSV upload no longer gets the first-import skip (`replace-flow.tsx:80`, `:105`). It meets the Replace / Add
  choice with neither picked (`upload-choice.tsx:2`, `replace-flow.tsx:96`).
- **Replace removes every row the file lacks**: `Your collection becomes exactly this file. Anything not in it leaves.`
  (`collection-edit.ts:41`). That includes a precon box, a hand-added card and an I got it copy.
- The choice does warn, with a count of in-app changes (`choiceOverwriteNoUpload`, `collection-edit.ts:51`). The count
  covers `add`, `edit` and `revert` entries (`history.ts:29`), so precon adds are included.
- Revert can take the replace back. Nothing is lost silently today. It is the path these entries make *common*.

## The paths

Each ends with cards in the collection, so the nav unlocks and Commanders, Discover and Home's dashboard have
something to rank. Engineering proposes all three. Design calls which appear where, and which leads.

**(a) Import a deck, then optionally own its cards.** For the Moxfield player.

- They paste a decklist or an export (the shipped `/decks/import`), and the deck arrives as it does today.
- Then one offer: **own these cards**. It is an add of the deck's lines to the collection, at the printings the
  import kept, as one History entry Revert takes back. That is the precon add's shape with a deck as its source.
- Declined, they keep a deck whose every card is To buy. That is honest for a list they have not bought, but it
  leaves the nav locked (`shell.tsx:42` keys on cards, not decks).
- Engineering needs one new action (the deck-to-collection add). Everything before it ships.

**(b) "I own these precons", picked to build a starting collection.** For the precon player.

- They pick one or more boxes from the shipped precon list (`/decks/precons`). They press one add, and every box
  lands, each as its own History entry with its tokens marked.
- It reuses `addPreconForUser` as is, with no deck started, so no copies are reserved.
- A player who wants a deck from a box still has Start's `I own this precon`, unchanged.
- Engineering needs a multi-pick and a caller. The write ships.

**(c) Start empty, and add as you go.**

- The player leaves step 1 with nothing. They then build through Add cards (shipped, `AddCardsSheet`), I got it
  (shipped), or (a) and (b) later.
- The app must then read sensibly at zero cards outside first run. Today it does not: the nav stays locked, and
  Commanders and Discover say `No collection yet`.
- Engineering needs the empty states below, and a decision on the lock.

## The surfaces

Design draws each at 390 and 1300.

1. **First run (Home's checklist).** Step 1 today is the upload, Paste a list, and Add cards by hand. The question is
   whether (a), (b) and (c) appear here at all (see §Open, 1), and if so as peers of the upload or beneath it.
2. **Home with no collection, outside first run.** An account with decks and no cards gets the dashboard today, with
   a locked nav. Path (a) declined produces exactly that account.
3. **Collection's empty state** (`/collection`). Today it has two doors, Upload and Add cards. Candidates to join them:
   (b) `I own precons` and (a) `Import a deck`.
4. **Locked navigation** (`nav.tsx` note, #1121). Today its one exit is `Go to step 1`. If (c) is real, Design says
   whether the lock stays keyed on an empty collection, or lifts once the player has chosen to start empty.
5. **The precon multi-pick.** Either a mode of `/decks/precons`, or its own sheet reached from 1 and 3. It must say
   how much it will add (boxes and copies) before the press, and what landed after.
6. **After import (path a).** Where the own-these offer sits: on the arrival strip, on the deck's Shopping view, or
   both.

## Locked

1. **No data loss.** Every new write is an add through `applyCollectionChange`, one History entry per box or deck,
   and Revert takes it back. No new path replaces. The later-CSV seam above must be addressed in the drawing (§Open,
   5). The current warning and Revert are the floor, not the target.
2. **Upload stays the primary path.** Wherever the alternatives appear, the CSV upload is the first and largest
   action. The alternatives are for the player who cannot take it.
3. **The precon path reuses the shipped precon add** (`addPreconForUser`, #1705). It does not get a second write.
4. **Ruling 1's order stands.** The collection comes before decks. Every path ends in owned cards. A deck imported
   and not owned (path a, declined) does not unlock the nav by itself.
5. **The switches.** The paths ride `COLLECTION_EDIT_ENABLED` (all three write the collection) and `PRECONS_ENABLED`
   (path b). With either off, its path is absent rather than drawn disabled.

## Open for Design to call

1. **Step 1's shape, given ruling 1.** Does first run's step 1 offer the alternatives beside the upload, or only the
   upload with a quieter way to the others? Hugh removed the last import door from this exact spot. Design proposes,
   and Hugh confirms (engineering's lean: the alternatives belong to step 1 as *ways to give us your cards*, which is
   what ruling 1 protects, not as a way round it).
2. **Which path leads** among the three, and whether (c) is a visible choice or simply what happens when the player
   leaves.
3. **The own-these offer after an import:** its words, where it sits, and whether it defaults to every line or lets
   the player untick some.
4. **The precon pick:** list or grid, grouped by set or by year, and how a Collector's Edition twin reads (today a
   twin adds its own box, never its plain edition's).
5. **The later-CSV seam.** When a collection built by (a), (b) or (c) meets its first CSV, does the choice default to
   Add, name the precon boxes it would remove, or stay as it is?
6. **The nav lock** for a player who chose to start empty (surface 4).
7. **The empty states** of `/commanders` and `/discover` (`No collection yet`) once more than upload can fill a
   collection. They are inline literals today, and they move to copy keys with this work.

Copy wording goes to `/copy-review`. Design owns placement, hierarchy and states.

## Every state

| # | State | Trigger | Shown |
|---|---|---|---|
| S1 | First run, nothing chosen | 0 cards, 0 decks | Checklist, step 1 with upload primary and the alternatives per Open 1 |
| S2 | Precon pick, open | (b) entered | Boxes, owned 0, nothing picked, the add disabled |
| S3 | Precon pick, some picked | ≥1 box ticked | `Add N boxes · M cards` |
| S4 | Precon add pending | press | The pick busy, nothing else moves |
| S5 | Precon add done | all boxes written | Receipt naming the boxes and copies, the nav unlocked, Home's dashboard |
| S6 | Precon add refused | `notFound` / `failed` | The pick standing, a refusal saying nothing was added |
| S7 | Precon add, part-failed | the action writes boxes one entry each: one fails after others land | Which boxes landed and which did not, none retried silently |
| S8 | Import done, own offer | deck imported, 0 cards | The arrival strip plus the offer |
| S9 | Own these, pending | press | Busy, the deck unchanged |
| S10 | Own these, done | lines written | Receipt (`N cards added to your collection`), To buy empties, the nav unlocks |
| S11 | Own these, refused | failure | The deck standing, nothing added |
| S12 | Import, offer declined | dismiss | A deck with every card To buy, the nav still locked (Locked 4) |
| S13 | Started empty | (c) | Home and the nav per Open 6, every list's empty state per Open 7 |
| S14 | First CSV over a built collection | upload with ≥1 row present | The Replace / Add choice, per Open 5 |
| S15 | Precons switch off | `PRECONS_ENABLED` off | Path (b) absent everywhere |
| S16 | Edit switch off | `COLLECTION_EDIT_ENABLED` off | Paths (a)'s offer, (b) and (c) absent: upload alone, as before #1304 |
| S17 | A box already owned | the pick includes a box whose cards are present | The add still adds (copies stack); Design says whether the pick marks it |

## About

- **The decision: a new entry, `start-without-a-collection`, and a bump.** The rule is that a feature a reader
  discovers gets an entry. A player who has only precons learning they can be read in is exactly that.
- The entry follows `COLLECTION_EDIT_ENABLED` through `AboutSwitch`, the switch every path rides. A switched entry is
  announced when its switch flips, so the bump is the one at launch.
- `ABOUT_VERSION` is 14 today (`about.ts:75`).
- Two existing entries take ordinary edits rather than new ones:
  - `precons` (`about.ts:1103-1121`) adds that a box can be owned without starting a deck;
  - `deck-import` (`about.ts:1043-1064`) adds the own-these offer.
- Design draws the new entry on the per-entry artboard (`design/design_handoff_the99_about/`, §8). The entry is
  batched to this line's last PR, per the multi-round rule in `AGENTS.md`.
