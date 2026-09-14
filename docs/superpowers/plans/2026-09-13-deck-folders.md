# Plan — Deck folders

**Handoff:** `design/design_handoff_the99_deck_folders/` (R1) · **Verdict:** 🟢 Green,
`docs/superpowers/readiness-deck-folders.md` · **Brief:**
`docs/superpowers/design-briefs/2026-09-12-a-shelf-to-put-decks-on.md`

Written against `origin/main` at `19294166`.

The data layer is merged (PR #525) and probed (`pnpm probe:folders`). This plan is the route: a
shelf line above the chassis, a sheet below 1000px, the acts that fill and empty the shelves, and
five kinds of nothing.

---

## The one thing that leaves this plan before the build starts

**The chassis needs one sentence, today, regardless of when folders build:** *a folder is a nav
level, so the chassis gains no slot, no panel, no chip, no clear scope and no density pass.* The
round's only chassis-adjacent change is the second argument at `decks-view.tsx:340`. If the
chassis's `/decks` slice is still open, that sentence goes to it now — not this diff.

---

## Global constraints

1. **The shelf is a third field on `ViewState`, never a fifth on `DeckFilters`** (README decision 7).
   `ViewState` is `{ filters, sort }` at `decks-view.tsx:63`; it becomes `{ filters, sort, shelf }`
   where `shelf` is `string | null | "none"` — a folder id, All decks, or Unfiled. This is what makes
   `EMPTY_FILTERS`, `activeFilterCount` (`filter.ts:66`), the `Filters` badge and `Clear all filters`
   *unable* to touch the shelf by construction rather than by care. **No shelf key is added to
   `DeckFilters`, `filtersToParams` or `filtersFromParams`** — the shelf gets its own pair of
   helpers beside them.
2. **`?folder=` joins `OWNED_PARAMS`** (`decks-view.tsx:61`) and is written by the existing `apply()`
   with `replaceState` (`:117-129`). Absent for All decks, `none` for Unfiled, the id otherwise. An
   unknown id falls back to All decks, the way `readList` (`filter.ts:120`) already makes a
   hand-edited value harmless. **Not a route:** `page.tsx` would refetch an identical list and throw
   the filter state away.
3. **One count map feeds the segment and the result line.** README decision 8 says the two "agree by
   construction"; they do not, because the segment reads a server figure while the denominator comes
   off the loaded list (errata E4). `shelfCounts()` computes both in one pass and the denominator is
   read out of that same map, so the pair cannot drift — and an optimistic adjustment after a move
   moves both figures at once.
4. **The shelf narrows before `filterDecks`, in the same client-side pass**, and the panels'
   per-option counts are computed within the shelf — so a status reading 0 means 0 *on this shelf*,
   which is the same reasoning `decks-view.tsx:186-203` already applies to the other active filters.
5. **The shelf line switches at `CHASSIS_WIDE_MIN_PX`** (`filter-chassis.tsx:167`), never at a
   Tailwind stop. `deck-filter-sheet.tsx` already fixed that trap with `max-[999px]:flex`.
6. **The line's counts are never filter-dependent.** Named shelves from `listFolders.deckCount`,
   All decks and Unfiled from the loaded list.
7. **No motion, anywhere in this round.** Selection changes instantly, and the sheet mounts with no
   transition — matching `deck-filter-sheet.tsx:181-194`, which has none to reuse (errata E12). No
   reduced-motion state, because there is nothing to reduce.
8. **Copy is `folderCopy`**, ported verbatim from `design/design_handoff_the99_deck_folders/`'s copy
   file into `src/lib/copy/folders.ts`. `refreshCopy.decks.menu.*`, `refreshCopy.filters.*`,
   `refreshCopy.zero.*` and `deckChassisCopy.result` are **reused, never restated**.

### Three corrections the readiness audit made, carried here

- **Rename has no blur commit.** README decision 21 names blur-commit as the shipped guard; the
  shipped panel form deliberately has none (`rename-form.tsx:21-23` — blur lands before Save's click
  and double-submits). Folder rename follows `RenameForm`'s real contract: autofocus, Escape
  cancels, `Cancel`/`Save`, `maxLength`, `readOnly` while pending. STATES R2 already describes this.
- **The deck menu is three rows only when `built > 0`** (`deck-card-overflow.tsx:136`). `Move` is
  inserted between `Rename` and `Delete` whether or not `Update from a list` is present.
- **The compact shelf sheet gets its own live region.** STATES §8 says none is added; the chassis's
  result line sits outside an `aria-modal`, which is why `deck-filter-sheet.tsx:142-155` already
  carries one. The shelf sheet mirrors it, and the chassis goes `silentResult` while it is open.

---

## PR boundaries — three, named before implementation starts

Sized under the ~20 file / ~800 line gate. Each is independently mergeable and leaves the route
working.

| PR | What lands | Why this cut |
|---|---|---|
| **1 — the shelf, server to state** | `renameFolder`, four server actions, `listFolders` on the page, `folderCopy`, the `shelf` field, `?folder=`, shelf-first narrowing, the result-line denominator | Everything with a test that is not a rendered pixel. The route behaves correctly with the URL typed by hand before any control exists to type it |
| **2 — the level, making one, and filing into it** | The shelf line (wide), the 44px trigger and sheet (compact), S2 and S3, **create**, and **move** in the deck menu | The drawing, plus every affordance it names. Create ships here because the line and the sheet both draw `New folder`; move ships here because S2's body sends the reader to the deck's own `…` menu, and a state that names a control which does not exist is not a mergeable state. **PR 2 draws no `…` on a shelf segment** — that control opens rename and delete, which are PR 3 |
| **3 — renaming and unmaking** | The shelf's own `…`, rename, delete | The two acts on a folder that already holds decks, and the only two that need a confirmation between them. Splits from PR 2 so a review of the level is not also a review of a destructive dialog |

---

## PR 1 — the shelf, server to state

### Task 1.1 — `renameFolder`

`src/lib/decks/folders.ts`. Beside `createFolder` (`:83`): same `validateFolderName`, same unique
index, same `user_id` in the where clause. Returns the updated row or `null` when the folder is not
the player's.

### Task 1.2 — extend the probe

`scripts/probe-folders.ts`: rename works, a rename to an existing name is refused by the index, a
rename of another player's folder returns null, and a rename to the same name is a no-op rather than
a self-collision. **The unique index is the thing under test** — a unit test cannot reach it.

### Task 1.3 — four server actions

`src/app/decks/folder-actions.ts`, in the shape `src/app/decks/actions.ts` already uses:
`createFolderAction`, `renameFolderAction`, `moveDeckAction`, `deleteFolderAction`. Each takes the
session's user id from `requireUserId()` — never the caller's — and revalidates `/decks`.

**Every argument is validated at runtime, not by its type.** A server action's parameters arrive
over the wire, so a TypeScript signature proves nothing: an id that is not a uuid reaches the
`::uuid` cast inside `moveDeck` and becomes a 500 rather than a refusal, and a non-string name
throws inside `validateFolderName`. Each action guards with `isUuid` (`src/lib/uuid.ts`, the pattern
`actions.ts` already uses) and a `typeof … === "string"` check before it calls a query, and answers
a bad argument the way it answers a folder that is not the player's — `false`, or the result type's
refusal.

**Two shapes, and every action has one of them.** A write that produces a value returns
`{ ok: true; folder: { id, name } } | { ok: false; reason: "duplicate" | "invalid" | "refused" }` —
`createFolderAction` and `renameFolderAction`. A write that produces nothing returns a `boolean` —
`moveDeckAction` and `deleteFolderAction`, where `false` already carries the meaning the queries gave
it ("not yours, or gone", and "already done").

The three refusals stay distinct because the UI answers them differently: **duplicate** is said in
words and keeps the typed value, **invalid** is unreachable through the field and defensive against
any other caller, and **refused** is a folder that is not this player's or is already gone, which
needs no sentence at all. `createFolderAction` returns the folder because CR4 selects the new shelf
and the client cannot derive an id from the name it submitted.

**The field strips control characters on input** (errata E16). `validateFolderName` refuses C0, DEL
and C1, and `maxLength` does not stop a paste, so without this the round would need a third refusal
sentence for characters the reader cannot see. Stripping keeps decision 22's "exactly two reachable
refusals" true, through the same pure validator the server throws on.

**Failure shapes are already decided by the queries and must not be re-invented:**
`deleteFolder` returning false is **done**, not an error (README 25). `moveDeck` returning false
means "not yours, or gone" (STATES M6). A duplicate name is the unique index's `23505`, translated
to the copy file's one refusal string.

### Task 1.4 — `listFolders` on the page

`src/app/decks/page.tsx`: add `listFolders(userId)` to the existing `Promise.all` (`:33-43`). Required
— a deck row cannot name a folder holding no decks, which is exactly the S2 state.

### Task 1.5 — `folderCopy`

`src/lib/copy/folders.ts`, ported verbatim. No new string for the result line.

### Task 1.6 — the `shelf` field, the URL, and the narrowing

`decks-view.tsx` and `src/lib/decks/folder-view.ts` (new, pure, unit-tested):

- `shelfFromParams(params, folders)` → `string | null | "none"`, falling back to All decks on an
  unknown id **and on `none` when the player has no folders** — decision 13 draws no `Unfiled`
  segment in that state, so a bookmarked `?folder=none` would otherwise select a shelf that no
  control can show as selected (errata E11).
- `shelfToParam(shelf)` → the value or absence.
- `narrowToShelf(decks, shelf)` → the list before `filterDecks`.
- `shelfCounts(decks, folders)` → the figures the line prints, so the line and the result line
  cannot disagree.

`OWNED_PARAMS` gains `folder`. `apply()` writes it. Per-option counts are computed over the narrowed
list.

### Task 1.7 — the result-line denominator, in both places it is printed

`decks-view.tsx:340`: `deckChassisCopy.result(shown.length, shelfTotal(counts, state.shelf))`. One
argument, and it reads out of the **same map the segment prints from** (constraint 3) rather than
off `narrowed.length` — those are equal today and would drift the moment either side is adjusted
optimistically after a move.

**`DeckFilterSheet` takes the same figure.** It prints `shown of total` in its own header
(`deck-filter-sheet.tsx:206`) and announces it in its own live region (`:156`), and it was being
handed `decks.length` — so on a selected shelf the modal would state one denominator while the
chassis behind it stated another.

**Tests:** `folder-view.test.ts` over all four helpers, including the unknown-id fallback and
`none`; `folders.test.ts` extended if the rename validation warrants it; the probe from 1.2.

---

## PR 2 — the level, making one, and filing into it

### Task 2.1 — `ShelfLine` (wide)

`src/components/decks/shelf-line.tsx`. One 34px line above the chassis on `--bg`. Segments in
`listFolders` order — `All decks`, folders by name, `Unfiled` last — with `New folder` at the
trailing edge. **`Unfiled` is omitted when no folder exists** (README decision 13, STATES W1, errata
E3): a bucket equal to the whole list is a distinction without a difference. Selected segment: `--fg` on `--elevated` under a `--border-strong` ring, **no accent**
(README 3). The selected segment carries a 22px `…` **in PR 3** — it opens rename and delete, which land there;
PR 2 draws the segment without it. No unselected segment ever carries one, and neither `All decks`
nor `Unfiled` does at any point (STATES W3/W4, errata E7).

Wraps to a second line; past two it scrolls **vertically** inside that band rather than growing a
third (W5, corrected by errata E17). Not horizontally, which is what W5 says and what the build
proved impossible on a wrapped row: the overflow is on the cross axis, so `overflow-x` hides every
shelf past the second row instead of scrolling to it.

**Accessibility:** plain buttons carrying `aria-current="true"`, each accessible name carrying its
count via `folderCopy.shelves.aria`.

### Task 2.2 — the compact trigger and sheet

Below `CHASSIS_WIDE_MIN_PX`: a 44px trigger printing the shelf name at 15px semibold plus its count
and `▾`. The 44px `…` beside it arrives with PR 3 and is **present only on a selected named
folder** — absent rather than disabled on both `All decks` and `Unfiled` (STATES C1 and C2, corrected by
errata E7 — C2 covers `Unfiled` and E7 extends the same rule to `All decks`: the `…` opens rename
and delete, which neither of those has). The sheet is
`aria-modal` with the app's shared focus trap, 48px rows, a **round** single-select mark
(`filter-panel.tsx:519` — a square tick promises two), counts trailing, `New folder…` last, current
shelf pinned first with the pin computed once on open (C4, corrected by errata E8: the pinned shelf
is **removed from the remainder** rather than printed twice, and `Unfiled` is omitted entirely when
no folder exists).

**Its own live region**, mirroring `deck-filter-sheet.tsx:142-155`, and `silentResult` on the chassis
while it is open. **A shelf-scoped `announce` string, not the result sentence** —
`ResultLine` returns early on identical text, and `announceId` only re-fires an `announce` that is
already non-empty (`ui/result-line.tsx`), so switching between two shelves that hold four decks each
would announce once and then fall silent on exactly the change that matters. The announcement names
the shelf, and its id is the identity.

### Task 2.3 — S2 and S3

`src/components/decks/shelf-empty.tsx`. S2: heading, `<name> · 0 decks`, the body naming where filing
happens, and `All decks` as the way out. S3: heading, `12 decks across 3 folders`, `All decks`, **no
body copy**. Neither offers `Clear filters` — no filter caused them (N2/N3).

Precedence is a ladder, and the chassis and shelf line stay mounted through all of it: `decks.length
=== 0` → `DecksZero` **and no shelf line** (W6/N1); named shelf with 0 → S2; Unfiled with 0 → S3;
filters emptied a populated shelf → the shipped filtered empty, unchanged (N4).

**Tests:** the ladder as a table-driven render test, both widths; the pinned sheet order; the
`aria-current` and accessible names; and that no segment carries a `…` yet at either width.

### Task 2.4 — create

From the line's trailing control and the sheet's last row; PR 3 adds the third entry, `New folder…`
inside move mode. Empty **disables** `Create` with no message; duplicate is stated in words. Length
is unreachable — `maxLength = FOLDER_NAME_MAX`. On success the action returns the new folder's id,
the client selects that shelf, and the reader lands on S2 (CR4).

### Task 2.5 — move, in the menu the deck already has

`deck-card-overflow.tsx` gains a third mode. `Move · <shelf>` sits between `Rename` and `Delete`
(and after `Update from a list` where that row renders). Move mode: a `Move to` eyebrow, `Unfiled`,
folders by name, the current destination carrying a filled round mark, `New folder…` last.

**Filing and unfiling are one control** — `moveDeck` takes `null` for exactly that. After a move the
panel returns to its menu with the row now reading the new shelf (README 17): no toast, and on a
named shelf the tile also leaves the grid. A `false` return reverts the row (M6).

---

## PR 3 — renaming and unmaking

### Task 3.0 — the shelf's own `…`

The selected named folder's 22px `…` at the wide form and its 44px sibling at the compact one, both
opening a two-row menu: `Rename` · `Delete`. Never on an unselected segment, never on `All decks`,
never on `Unfiled` (STATES R1, errata E7).

### Task 3.1 — rename

The selected shelf's `…` only. `RenameForm`'s real contract, per the correction above.

### Task 3.2 — delete

`Delete "<name>"?` over **`Its 4 decks return to Unfiled. No deck is deleted.`**, or
`Nothing is filed here.` when empty. Confirm either way — there is no undo. The confirming button
takes `--danger` (README 24). Afterwards the segment goes and selection falls back to All decks;
`false` is treated as done (D4).

**Tests:** each refusal that is reachable, the post-move label, the post-create selection, the
post-delete fallback, and the delete copy in both forms.

---

## Acceptance — `feature-acceptance`, per PR and at close

**Route × viewport inventory.** One route, two viewports: `/decks` at 390×844 and 1300×900. Both in
every PR that draws anything.

**Probe.** `scripts/probe-folders-ui.mjs`, extending the browser-probe pattern: sign in through
Clerk's dev instance, create two folders, file a deck, confirm the segment count and the result
line's denominator agree, land on S2, delete a folder and confirm the deck survived and the
selection fell back. Deletes its own fixture in a `finally`, pointed at `local-dev`, **never
production**.

The three checks that can only be answered in a browser: that the shelf line switches at 1000 and
not at a Tailwind stop, that the compact sheet's announcement is heard while the modal is open, and
that the wide line wraps to two lines and then scrolls rather than growing a third.

---

## Out of scope, and it stays out

Nesting (no parent column exists), folders anywhere but `/decks`, Home's grouping, drag and drop
(README 18 — the tile is an absolute-inset `<Link>`), and multi-select (README 19, slice B). The
folder does **not** appear on the tile face (README 20, upheld by the audit's §3).
