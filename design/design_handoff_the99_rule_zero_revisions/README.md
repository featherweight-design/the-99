# The 99 · Rule 0 revisions (account 2, 2026-10-31)

Canvas: https://claude.ai/artifact/KStZsiuUarNmPT4yXBnRjN
Status: **Approved by Hugh, 2026-11-01** ("This LGTM, please open a PR"), at R1. The three recommendations put to him with R1 are taken as approved with it (see Closed with the approval).

Revisions to Rule 0 after Hugh's first real game with a friend (brief `docs/superpowers/design-briefs/2026-10-31-rule-zero-revisions.md`). Extends `design/design_handoff_the99_rule_zero/`; its decisions not named here are not reopened. Every changed state is drawn at 390 and desktop over the shipped boards, redrawn in the Low Sun theme the captures use, with the shipped shell (tab bar and rail end on Friends, ? beside search). Strings marked DRAFT go through `/copy-review`.

To view a board, open `Main.dc.html` or the board's own page with `support.js` and `art/` beside it. `scratch-gen/` holds the generator: `lib.py` plus one module per board, each lifting frames from main's `design/` (`DESIGN` env var); `python3 build.py out m:Main k:Key p:Picker h:Home n:Notice c:Table e:Errata`, then `node render.js <abs out> Main …` sets each board's preview size and reports broken images, overflow and clipped frames. `canvas.py out <root>` swaps `art/` for the canvas's `/_blob/` urls (`blobs.json`).

Sources read: main @150e10d, rechecked at @80c4498 (brief, `design_handoff_the99_rule_zero`, `design_handoff_the99_menu_home`, `design_handoff_the99_push`, `about_visual` captures; `src/components/rule-zero/*`, `decks/mark-key.tsx`, `decks/receipt-modal.tsx` (ModalChrome), `home/dashboard.tsx`, `app/page.tsx`, `lib/copy/rule-zero.ts`).

| Board | Ruling |
|---|---|
| `Main.dc.html` | Every call and the questions for Hugh |
| `Key.dc.html` | 1 · The read's key as the shared MarkKey grid |
| `Picker.dc.html` | 2 + 3 · `seated` left of the chip; Change deck as a modal on desktop |
| `Home.dc.html` | 4 · Tonight's table leads Home (H1–H11) |
| `Table.dc.html` | 5 · Landing, the host's Close, confirm, closed by host / guests / the morning (T1, C1–C5) |
| `Notice.dc.html` | 6 · The in-app notice and the push |
| `Errata.dc.html` | 24 hours → the morning after, in the shipped handoff |

## 1 · The read's key

- Shared `MarkKey`, **two columns** (three would wrap *Two-card infinites* inside its entry at the card's ~330px), all five finding marks, `regionAria` = `read.keyLabel`. `CountsKey` retires.
- Always all five: every seat draws all five counts (zeros dim), so nothing the key glosses is missing from the screen.
- Desktop: the read sits in a 392px column, so it keeps the grid there too. MarkKey gains an opt-in that keeps its columns from `md` (for example `columns={2}`); other keys unchanged.

## 2 + 3 · Your deck tonight

- A fixed 38px slot left of the chip on every row holds `seated` (empty otherwise), so every chip ends on one edge. Unready rows (no chip, 45%) unchanged.
- From `md`: `ModalChrome` width 480, `fit`, title `swap.sheetTitle`, lead `swap.sheetSub` (the panel's "nearest first" head goes), bare ✕. Scrim over rail and page. Opens at once with `SheetLoading` (compact, *Finding your decks* DRAFT); a failed load says `swap.loadFailed` inside with *Try again*. A pick closes it and swaps (toast + Undo, as shipped); a refused swap is `swap.failed` in the shared toast. Below `md` the shipped Sheet is unchanged. `useAnchoredPanel` leaves Change deck.

## 4 · Home

- Seated at an open table (setter too), the shipped `HomeTableCard` comes first in Home's body: under the page head, above the precon receipt, welcome / signature / arrivals strips and the lead. On first run, above the checklist. It leaves Friends.
- Desktop (from `xl`): one row across the top of the main column (kicker, pod, faces | sentence | Open the table).
- States: seated by Colin, set by you, seated without a deck, no table (no gap), two tables (stacked, soonest closing first).
- The notice on Home is the card arriving (H9, H10): Home refreshes its tables, no toast. A Home left open when the table closes keeps the card until focus or the next load; pressed, it lands on the closed table (H11).
- Closing time reads `open until 6:00 am tomorrow`.

## 5 · Close and the end

- **Close the table**: a text button in `--danger` at the table's foot, under Log this game (desktop: closing the read's column), setter only. Not on Home's card, not on the pod row. A guest never sees it (T1, D1).
- Confirm, since a closed table cannot be reopened: the shipped Sheet (fit) on the phone, `ModalChrome` 480 from `md`. *Close {pod}'s table?* / *Everyone seated loses the table now, and it can't be opened again. Games already logged stay on each deck's Games tab.* / *Close the table* (danger) / *Keep it open* (DRAFT). A failed close: shared toast *We couldn't close the table. Try again.* (DRAFT).
- After: the host's page becomes the closed table at once; guests' pages on their next check (no toast); pod row and Home card gone on next load.
- Closed copy differs (DRAFT): *You closed {pod}'s table at {time}.* / *{closer} closed {pod}'s table at {time}.* against the errata's *{pod}'s table closed the morning after {setter} set it.*, each with the logged-games sentence.
- **For Hugh (recommended):** a host-closed table keeps *Log this game* for its seated players until the morning time it would have reached, pre-filled as shipped. After the morning end it goes.

## 6 · The notice and the push

- In the app: the shared toast with the table glyph on the Mark plate tint, *{host} seated you at {pod}'s table.* (DRAFT), *Open*, bare ✕, no clock; one per table, stacked. Not on Home (the card is the notice) or on the table itself.
- Push: the same words as the title, *You're seated with {deck}.* (or *Pick your deck at the table.*) under it; no image, no actions; lands on `/friends/table/<id>`.
- Never both: with the app in front the service worker hands the push to the page (toast, no system notification); opened from the system notification, the notice is marked seen.
- **For Hugh (recommended):** the seat push skips the 21:00–09:00 hold and adds no Settings tick.
- A seat changed or removed sends no notice (brief state 12).

## Errata

The brief's four places (README line 150, copy strings line 131, `R1 - Log-Phone` and `R2 - Log-Desktop` line 573) plus README line 9 and the R1 calls board, from 24 hours to the morning after. Applied to `design/design_handoff_the99_rule_zero/` in the handoff PR.

## Closed with the approval

R1 recommended yes on all three; Hugh approved R1 as drawn.

1. A host-closed table keeps *Log this game* for its seated players until the morning time it would have reached.
2. The seat push skips the 21:00–09:00 hold and adds no Settings tick.
3. MarkKey gains an opt-in that keeps its columns from `md`; the read passes it.

## Errata status

Lane a6 already shipped the new `expired.body` in `src/lib/copy/rule-zero.ts` (main @80c4498). This PR brings the handoff's own copies in line.
