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
3. **The shelf narrows before `filterDecks`, in the same client-side pass**, and the panels'
   per-option counts are computed within the shelf — so a status reading 0 means 0 *on this shelf*,
   which is the same reasoning `decks-view.tsx:186-203` already applies to the other active filters.
4. **The shelf line switches at `CHASSIS_WIDE_MIN_PX`** (`filter-chassis.tsx:167`), never at a
   Tailwind stop. `deck-filter-sheet.tsx` already fixed that trap with `max-[999px]:flex`.
5. **The line's counts are never filter-dependent.** Named shelves from `listFolders.deckCount`,
   All decks and Unfiled from the loaded list.
6. **No motion on the shelf line.** Selection changes instantly; the compact sheet reuses the
   existing entry animation. No reduced-motion state, because there is nothing to reduce.
7. **Copy is `folderCopy`**, ported verbatim from `design/design_handoff_the99_deck_folders/`'s copy
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
| **2 — the level** | The shelf line (wide), the 44px trigger and sheet (compact), S2 and S3 | The drawing. One component pair, two empty states, no new queries |
| **3 — the acts** | Move mode in the deck menu, create, rename, delete | Every act, each inside a panel the app already ships. Splits from PR 2 because a review of the line should not also be a review of four dialogs |

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
  unknown id.
- `shelfToParam(shelf)` → the value or absence.
- `narrowToShelf(decks, shelf)` → the list before `filterDecks`.
- `shelfCounts(decks, folders)` → the figures the line prints, so the line and the result line
  cannot disagree.

`OWNED_PARAMS` gains `folder`. `apply()` writes it. Per-option counts are computed over the narrowed
list.

### Task 1.7 — the result-line denominator

`decks-view.tsx:340`: `deckChassisCopy.result(shown.length, narrowed.length)`. One argument.

**Tests:** `folder-view.test.ts` over all four helpers, including the unknown-id fallback and
`none`; `folders.test.ts` extended if the rename validation warrants it; the probe from 1.2.

---

## PR 2 — the level

### Task 2.1 — `ShelfLine` (wide)

`src/components/decks/shelf-line.tsx`. One 34px line above the chassis on `--bg`. Segments in
`listFolders` order — `All decks`, folders by name, `Unfiled` last — with `New folder` at the
trailing edge. Selected segment: `--fg` on `--elevated` under a `--border-strong` ring, **no accent**
(README 3). The selected segment carries a 22px `…`; no other segment does, and `Unfiled` never does
(STATES W3/W4).

Wraps to a second line; past two it scrolls horizontally rather than growing a third (W5).

**Accessibility:** plain buttons carrying `aria-current="true"`, each accessible name carrying its
count via `folderCopy.shelves.aria`.

### Task 2.2 — the compact trigger and sheet

Below `CHASSIS_WIDE_MIN_PX`: a 44px trigger printing the shelf name at 15px semibold plus its count
and `▾`, with a 44px `…` beside it — absent, not disabled, on Unfiled (C2). The sheet is
`aria-modal` with the app's shared focus trap, 48px rows, a **round** single-select mark
(`filter-panel.tsx:519` — a square tick promises two), counts trailing, `New folder…` last, current
shelf pinned first with the pin computed once on open (C4).

**Its own live region**, mirroring `deck-filter-sheet.tsx:142-155`, and `silentResult` on the chassis
while it is open.

### Task 2.3 — S2 and S3

`src/components/decks/shelf-empty.tsx`. S2: heading, `<name> · 0 decks`, the body naming where filing
happens, and `All decks` as the way out. S3: heading, `12 decks across 3 folders`, `All decks`, **no
body copy**. Neither offers `Clear filters` — no filter caused them (N2/N3).

Precedence is a ladder, and the chassis and shelf line stay mounted through all of it: `decks.length
=== 0` → `DecksZero` **and no shelf line** (W6/N1); named shelf with 0 → S2; Unfiled with 0 → S3;
filters emptied a populated shelf → the shipped filtered empty, unchanged (N4).

**Tests:** the ladder as a table-driven render test, both widths; the pinned sheet order; the
`aria-current` and accessible names; `Unfiled` carrying no `…` at either width.

---

## PR 3 — the acts

### Task 3.1 — move, in the menu the deck already has

`deck-card-overflow.tsx` gains a third mode. `Move · <shelf>` sits between `Rename` and `Delete`
(and after `Update from a list` where that row renders). Move mode: a `Move to` eyebrow, `Unfiled`,
folders by name, the current destination carrying a filled round mark, `New folder…` last.

**Filing and unfiling are one control** — `moveDeck` takes `null` for exactly that. After a move the
panel returns to its menu with the row now reading the new shelf (README 17): no toast, and on a
named shelf the tile also leaves the grid. A `false` return reverts the row (M6).

### Task 3.2 — create

From the line's trailing control, the sheet's last row, or `New folder…` inside move mode. Empty
**disables** `Create` with no message; duplicate is stated in words. Length is unreachable —
`maxLength = FOLDER_NAME_MAX`. On success the new shelf is **selected**, which lands the reader on
S2 (CR4).

### Task 3.3 — rename

The selected shelf's `…` only. `RenameForm`'s real contract, per the correction above.

### Task 3.4 — delete

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
