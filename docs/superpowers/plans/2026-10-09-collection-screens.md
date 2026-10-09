# Collection screens (collection home epic, sub-projects 1 + 2: the UI)

2026-10-09 · lane: collection screens · status: **approved by Hugh, 2026-10-09, with four amendments folded in** (budget, PR order, model split, no row Edit fallback).

## Sources

- Handoff: `design/design_handoff_the99_collection_edit/` (R1 on main) plus its R2 revisions on PR
  #1317 (`design/collection-edit-r2`): the required printing step, the R2 C Edit copies canvas
  (supersedes R1 C+D), and the About addendum in `design/design_handoff_the99_about/addendum-collection-edit/`.
  The R2 re-audit in `READINESS-audit.md` is YELLOW: nothing needs a new Hugh ruling to start, and
  its two eng findings (1, 2) are PR 1 below. PRs 2, 3, 7 and 8 read the handoff from main and
  do not start until #1317 merges.
- Brief: `docs/superpowers/design-briefs/2026-10-06-collection-foundation.md`.
- Server, merged: #1309 (`applyCollectionChange`, the ledger), #1311 (uploads through the
  ledger), #1313 (history and revert). Write-path plan: `2026-10-09-collection-write-path.md`.

## Settled, and not re-derived here

Everything in the write-path plan's settled list holds: one ledger entry per action with a
client-minted UUID as its key; every lowering can answer `wouldShort` and is resent with the
same id and `confirmShort`, which the server re-checks; edits send `expected` and can answer
`stale`; a zero after-state deletes the row; the first import into an empty collection skips the
Replace/Add question. Hugh's 2026-10-09 rulings on the handoff hold too: the History tab on the
phone strip, the 480px side sheet, the required printing step, editing copies in the Add cards
sheet, removal in that sheet, and edit access from /collection only. And README Open 6 (Hugh,
2026-10-09): there is **no** desktop row `Edit` fallback; Edit copies is reached only through the
card's details.

## Switch

Every PR ships behind `COLLECTION_EDIT_ENABLED` (`src/lib/collection/edit-flag.ts`). Off means
§G: every surface renders exactly as main does today, with no reserved slot for an absent control.
Each UI PR carries a test that renders its surface with the switch off and asserts the shipped tree.

## PR boundaries

Eight PRs, in order, none stacked, each under about 20 files and 800 lines. Each takes its own
worktree under `.worktrees/`, the pre-open subagent pass, and the normal pr-review cycle. Each UI
PR runs `feature-acceptance` (contact sheet of its rows, `check:shared`), and the line runs it
again at close.

**Who builds what** (Hugh, 2026-10-09, as revised overnight): this lane builds PR 1 (the server
and write path) on Opus, then continues into PRs 2 to 8 in the same session on Sonnet. At PR 1's
merge, a "For the screens session" note is added to `boards/lane-collection-build.md`, so a fresh
session can pick the line up if this one's context grows large.

### PR 1 · Server pieces the screens need (no UI)

1. **`EditRow` can carry the printing and condition** (re-audit finding 2). `EditRow` gains
   optional `scryfallId` and `condition`. `planEdit` uses them only for a row that does not exist
   yet. An existing row keeps its stored columns, since the key already pins the printing. Without
   this, a printing fix or an `Add another printing` saved in edit mode creates a row with a null
   `scryfall_id`, and `browse.ts` then shows the set's representative art: a printing fix would
   silently show the wrong art. `planEdit` already throws on a key named twice, so the sheet
   folds two lines onto one holding before it sends (B5). Unit tests cover a new row taking the
   supplied columns, an existing row ignoring them, and the null default.
2. **Server actions for the sheet**, in a new `src/app/collection/edit-actions.ts`, shaped like
   `history-actions.ts` (`signedInEditor`, refuse when the switch is off, `isUuid` on every id):
   - `addToCollection(actionId, items)`: `kind: "add"`. It never lowers, so it never warns (B7
     Must-not: "Run a deck check").
   - **The client never supplies a `scryfallId`.** `collection_items.scryfall_id` has no foreign
     key, so a forged id would persist art from another card. Both write actions resolve each
     line's printing from `printings` by `(oracle_id, set_code, collector_number)` and take its
     `scryfall_id` from there. An add line must name a catalog printing whose `finishes` include
     its finish, or the action refuses it. An edit row that names no catalog printing keeps a
     null id: a holding imported from a bare `Name,Qty` export has none to name, and an existing
     row keeps its own columns anyway. The client may send `condition`, capped and validated, only
     to carry a holding's condition across a printing fix.
   - `editCollection(actionId, rows, confirmShort?)`: `kind: "edit"`, rows with `expected`.
     It answers `applied | stale(current) | wouldShort(decks) | missingCard(names)`. Removal is an
     edit with every line at zero, and `Undo` reuses `revertCollectionEntry`.
   - `searchCatalogCards(query)`: the sheet's catalog search over every game card, not only owned
     ones (B2 Must-not). Only the name and flavor-name match and `isGameCardWhere` are extracted
     from `src/app/decks/[id]/search-action.ts` into `src/lib`. That query also applies
     `commanderLegal`, an identity filter and an owned filter, and none of those three applies
     here: a player owns banned cards too.
   - `loadPrintingChoices(oracleId)`: the required printing step needs every catalog printing with
     its finishes, plus `you own ×N` per printing and finish. `getCardDetail` doesn't do this: it
     returns only the owned printings for a card the player owns, and only the catalog ones for a
     card they don't.
   Every write calls `invalidateCollectionReaders` on `applied` and `alreadyApplied`, exactly as
   revert does. Action tests, shaped like `history-actions.test.ts`, cover the switch and input
   guards, every refusal and success branch, invalidating again on a retry, and scheduling the
   warm.
3. **One score warm for every write.** The upload confirm already warms the new collection's
   scores in `after()` (`src/app/collection/actions.ts`). That body becomes one helper,
   `warmCommanderScores(userId)`, called after the upload, add, edit and revert actions. Revert
   does not warm today. See "/commanders after an edit" below.
4. **History labels from the ledger's kinds** (re-audit finding 1). The handoff's `history.kinds`
   keys on `manual_add`, `manual_edit`, `remove` and `shopping_mark_bought`, while the ledger
   stores `upload_replace | upload_add | add | edit | revert`. PR 1 adds one pure function,
   `historyKindOf(entry)`, keyed on the ledger's values:

   | Ledger | Condition | Tag |
   |---|---|---|
   | `upload_replace` | | Replaced from a file |
   | `upload_add` | | Added from a file |
   | `add` | | Added by hand |
   | `edit` | `removesOnly` | Removed |
   | `edit` | otherwise | Edited copies (was "Edited in details", wrong since R2 moved editing into the sheet) |
   | `revert` | | Reverted |
   | any | `source` starts `shopping:` | reserved for `From Shopping` (sub-project 4); drawn ghosted, never emitted |

   The strings are placeholders. Each goes through `/copy-review`, not to Hugh. **The figure is a
   copies delta**, as the handoff draws it (`+12 · −3`), not the row count the entry stores
   (`raised`/`lowered`). `listHistory` gains `copiesUp` and `copiesDown`, summed from the rows'
   before and after quantities in the same query that already computes `removesOnly`. That keeps
   the list from needing a detail read.
5. **The brief catches up with R2** (re-audit finding 3): §B (the printing is required, with no
   preset), §C (editing in the sheet, no Move) and §D (removal in the sheet, rows unchanged),
   citing Hugh's 2026-10-09 rulings. It is doc-only within this PR.

About 15 files. Probe: `probe:collection-write` grows an edit-with-new-printing case, run on
local-dev or a scratch branch only.

### PR 2 · §B Add cards (add mode) and the place head entry

- `AddCardsSheet mode="add"` + `AddLine`. Desktop is the 480px right side sheet, no scrim, page
  `inert`, `role=dialog aria-modal`. The phone sheet is full height, with the upload as its first
  line (Hugh's History-tab ruling moves it there). The required printing step (B4a/B4m) uses
  `PrintingRegion role="choose" source="catalog"`, with `layout="row"` on the phone, and withholds
  the pick and shown-now badges and writes no art preference. Exact duplicates are merged when the
  printing is chosen (B5, one pulse, honoring reduced motion). Close with unsaved (B6), saving (B7),
  saved with a History link (B8), and failed keeping the list (B9).
- `CollectionPlaceHead` gains `+ Add` and the History tab on the phone strip, at the same y (B0).
  The History tab, and B8's History link, draw only once PR 6 ships the route; until then the
  strip carries `+ Add` alone and B8 shows no link.
- `docs/superpowers/inventories/collection-edit.json` is created here, with a `shares` block naming
  `AddCardsSheet`.
- Adding never lowers a count, so this PR needs no §E and ships ahead of it (Hugh, 2026-10-09).

### PR 3 · Empty-state doors, and Home step one

- /collection with no collection shows two equal door tiles (B0b). Home's step one gains
  `Add cards by hand` in the ghost chrome beside Paste (B0c). It is split from PR 2 on size, and
  because it touches Home, whose cached payload this PR must not move.

### PR 4 · §E the short-deck warning, and the upload flow's confirm states

- `ShortDeckWarning` with `dialog`, `sheet` and `embedded` variants. Three decks are named and the
  rest counted behind `and N more`, which expands inline capped at 320px. Decks are ordered by most
  short, then by seniority. Cancel takes focus, the confirm is an elevated secondary, and nothing is
  red. `Checking decks…` shows from the first frame, frozen at .6 with no reflow. A confirm that
  came back changed redraws the same dialog with a polite notice and marks decks that weren't
  there before as `new` (E1 to E7).
- `replace-flow.tsx` replaces today's interim "Confirm failed" for `wouldShort` and `missingCard`
  with §E and a named-card failure.
- `ShortDeckWarning` joins the `shares` block in `collection-edit.json`.

### PR 5 · §A the upload choice and the Replace and Add previews

- `UploadChoice` (`STEP 2 OF 4`, nothing preselected, an after-figure on each card, Add's ⓘ at
  ≥80% already owned). `ReviewScreen` gains `mode` and the four-figure row. The order follows risk:
  figures, overwritten edits, §E embedded, the card lists (8 then `Show all`), then the shipped
  issue sections. The Replace warning comes in its count and no-count forms. Pending (A4) and
  failed (A5) states. The first import stays `STEP 2 OF 3` and asks nothing (A6).
- The `edited` tag on Replace rows needs `collection_items` joined to manual entries since the last
  upload (READINESS item 5): one read beside `editsSinceUpload`. If it pushes the PR past the size
  bar, it goes to PR 6 as its own commit, and the plan is amended to say so.
- `Replace collection` becomes `Upload a file` under the switch (copy-review call; the slot and
  icon are unchanged).

### PR 6 · §F History

- `/collection/history` joins the `(list)` group. `placeFromPathname` gains `"history"`, and
  `visibleTabs` hides it on an empty collection with no entries (the Sets rule).
  `COLLECTION_ROUTES` gains the route, and `check:collection-routes` enforces that.
- `HistoryEntry` uses PR 1's tags in a fixed 150px mono column. Short entries expand in place; long
  ones are paged, never rendered whole (F3). The aged-out link is absent, and a foot always names
  the date history reaches back to. The empty state is dated from the ship date (F0, never
  hard-coded). That date's source is the time the `collection_history` migration was applied, per
  database, read from Drizzle's migration ledger. It's persistent, the same for every account, and
  exists before any entry does. The foot reads the later of that date and the 90-day edge. One
  caveat: the date is when the ledger could first record a change, not when the switch went on.
  Turning the switch on in the same deploy that migrates keeps the two the same.
- `RevertConfirm` (matches, and differs with Then/Now columns, a reason per row and
  `Revert what's left`) runs §E through `ShortDeckWarning`, with a named catalog failure that writes
  nothing (F4 to F7). The full-revert dry run measured ~2.1s, so its pending state is drawn.

### PR 7 · §C/§D Edit copies and removal

- `CardDetailProvider` gains `collectionEdit`, passed only by /collection. The receipt's label line
  carries `Edit copies`, or `Add to collection` when the card isn't owned. Never in the teaser, and
  never from decks, Shopping, search or History.
- Handoff: the modal closes and `AddCardsSheet mode="edit"` opens, scoped to the card, one line per
  holding. Save or Cancel reopens the modal on the same card, re-read. A wrong printing is fixed by
  re-picking the line's printing (one entry, carrying the new `scryfallId` via PR 1).
  `Add another printing` leaves held printings out. The diff (`+1 · −1`, `1 printing changed`)
  shows beside Save only.
- `Remove from collection` in the footer stages every line at zero, and Save reads
  `Remove N copies` (not the accent primary). §E comes first if needed, then a toast with Undo,
  which is a revert through §E (D2, D3). Rows and tiles are unchanged (D1).

### PR 8 · About entries and the close-out (batched at the end of the launch)

- The five addendum entries U1 to U5 (`collection-add`, `upload-choice`, `edit-copies`,
  `remove-card`, `collection-history`) with the addendum's specimens, each `switch:
  'COLLECTION_EDIT_ENABLED'` (and `AboutSwitch` gains that member). One `ABOUT_VERSION` bump, from
  11 to the next free number at merge (the addendum drew 12).
- `visible.ts` supports a negated key (`'!COLLECTION_EDIT_ENABLED'`). The shipped `import` caption
  in `src/lib/copy/about.ts` carries both lines, the existing "replaces, doesn't add" line (straight
  apostrophe, as shipped) and the new one, and each key removes whichever line doesn't apply. That's
  needed because `captionLineSwitches` only ever removes a line.
- U5's 90-day key line reads `HISTORY_RETENTION_DAYS`, not a literal.
- Then the full close-out: every inventory row walked at both widths in a real browser,
  `design-review` against the whole handoff, and the full contact sheet.

That's eight PRs rather than seven: PR 3 was split out of PR 2 on size. If PR 2 lands well under
the bar, they merge back into one, and the plan says so.

## Route × viewport inventory

Every cell is ticked against the running app at close-out. Rows reached by a press carry their
steps in `collection-edit.json`, because a URL sweep can't see them.

| Surface | 390 | 1300 | PR | Shares with |
|---|---|---|---|---|
| `/collection` head: `+ Add`, History tab, strip at y 109 | ☐ | ☐ | 2 | — |
| `/collection` empty: two doors | ☐ | ☐ | 3 | — |
| `/` Home step one: `Add cards by hand` (empty account) | ☐ | ☐ | 3 | — |
| `/collection/replace`: choice, Replace and Add previews, all-owned, pending, failed | ☐ | ☐ | 5 | — |
| `/collection/replace`: first import asks nothing | ☐ | ☐ | 5 | — |
| §E on upload confirm (one, several, long, changed) | ☐ | ☐ | 4 | `ShortDeckWarning` |
| `/collection/history`: list, expanded short and long, empty, foot | ☐ | ☐ | 6 | — |
| History revert confirm: matches, differs, §E, catalog failure | ☐ | ☐ | 6 | `ShortDeckWarning` |
| Add cards sheet (add): empty, results, required printing, duplicate, saving, saved, failed | ☐ | ☐ | 2 | `AddCardsSheet` |
| Card modal from `/collection`: `Edit copies` / `Add to collection` | ☐ | ☐ | 7 | — |
| Card modal from `/decks/[id]`: receipt read-only (negative row) | ☐ | ☐ | 7 | — |
| Edit copies sheet: at rest, printing fix, add another printing, remove, §E, toast Undo | ☐ | ☐ | 7 | `AddCardsSheet`, `ShortDeckWarning` |
| `/about`: five entries, `import` caption both ways | ☐ | ☐ | 8 | — |
| Switch off: `/collection` (no `+ Add`, no History tab, one door), `/collection/replace`, card modal | ☐ | ☐ | every | — |
| Switch off: `/collection/history` is not found | ☐ | ☐ | 6 | — |
| Switch off: `/` Home step one has no `Add cards by hand` | ☐ | ☐ | 3 | — |

`check:shared` holds `ShortDeckWarning` across the upload confirm, the revert confirm and the edit
sheet, and `AddCardsSheet` across both modes. Its rows name the file that imports each.

## /commanders right after an edit

Every collection write clears the player's `commander_scores`, and the next `/commanders` read
recomputes them: ~2.2s measured warm on staging, and 14.1s cold. `/commanders` has no
`loading.tsx`, so a navigation waits on that recompute with the current page held under the
pending indicator.

**What this line does:** PR 1's `warmCommanderScores` runs in `after()` from every write, as the
upload confirm already does. Its generation fingerprints mean a warm that a later write overtakes
is dropped rather than stored, so a burst of edits costs extra compute but never stores a stale
ranking. A player who edits and then goes to `/commanders` more than a couple of seconds later
finds the scores already persisted. One who goes there immediately meets the read path's own
recompute, which is today's behavior after an upload. This is compute only, with no model spend.

**What PR 1 measures before any UI ships:** on a fresh scratch branch of staging
(deleted afterward, with Hugh's OK), `/commanders` TTFB after a one-card edit at 0s, 3s and 10s,
warm and cold, with and without the warm. If an immediate visit still reads several seconds on a cold
compute, that goes to Hugh as a finding with numbers. A loading boundary on `/commanders` is a
Design call, not something this line adds on its own.

## Out of scope

- `From Shopping` (sub-project 4): its tag is reserved and drawn ghosted only.
- Re-tuning the 80% overlap threshold for Add's note: revisit after real uploads.
- The stale G annotations in the handoff (re-audit finding 6): a Design re-sync item.

## Budget and reporting

About 18% of the week for the line (Hugh, 2026-10-09). Spend is reported to the orchestrator (the-99-f0) at each PR's merge.
Stop and ask at 1.5x. No paid model spend is planned anywhere in this line.
