# The 99 — No-collection entry · R1 handoff package

A way into the app for a player with no collection file: precons they own, a deck they play, or cards by hand, beside
the upload on first run and on the empty Collection. Phone and desktop.

Source of truth: `docs/superpowers/design-briefs/2026-10-15-no-collection-entry.md` (branch `brief/no-collection-entry`).

## Start here

| Read | For |
|---|---|
| **`The 99 - No-Collection Entry (R1).dc.html`** | **The seven calls, the locks and the gaps, in one board.** |
| `R1 - FirstRun-Desktop.dc.html` / `R1 - FirstRun-Phone.dc.html` | Step 1 with the group; focus; the lock's note; both switches off. |
| `R1 - PreconPick-Desktop.dc.html` / `R1 - PreconPick-Phone.dc.html` | The pick: open, picked, a twin, adding, a box already added. |
| `R1 - PreconResult.dc.html` | Done on Home, refused, part-failed, both widths. |
| `R2 - Import-Desktop.dc.html` / `R2 - Import-Phone.dc.html` | R2: the import checkbox, ticked and unticked, done, refused. Replaces the `R1 - Import-*` boards. |
| `R1 - Empty-Desktop.dc.html` / `R1 - Empty-Phone.dc.html` | The empty Collection, Home with a deck and no cards, the rankers' empties. |
| `R1 - LaterUpload.dc.html` | The first CSV over a collection built in the app. |
| `R1 - About-Entry.dc.html` | The new About entry and two edits. |
| `README.md` | Each open question answered, with reasons; the gap report. |
| `STATES-no-collection-entry.md` | The matrix. |
| `READINESS.md` | R1's verdict and what engineering needs. |
| `no-collection-entry · copy strings.ts` | Every new string, for `/copy-review`. |
| `about · start without a collection.ts` | The About entry and edits as code. |
| `brand/` | The locked brand sheet. |

The same canvas is live as a Design artifact in account 2. Open the `.dc.html` files with `support.js` beside them.

## The answer in one line

Upload stays the one fill; one quiet group under it, No file? Start another way, holds Precons I own, Import a deck and
Add cards by hand; Collection opens at zero cards while the rest waits for a card; every write is an add.
