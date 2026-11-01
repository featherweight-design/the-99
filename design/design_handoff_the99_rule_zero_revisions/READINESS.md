# Readiness: Rule 0 revisions

**Verdict: ORANGE (engineering audit, lane c4, 2026-11-01; Design's own call was Green).** Hugh approved every board on 2026-11-01 (R1). Each call was checked against `origin/main` @80c4498. Nothing needs a new switch: everything rides the shipped Rule 0 switch. Lane a6 builds the engineering half (the seat push and in-app notice delivery, the morning expiry and the host Close action); the UI below waits on it where noted. The DRAFT strings go through `/copy-review` before they ship. Engineering's own audit may move any item.

Sizes: S under 150 lines, M 150 to 500, L over 500, tests included.

## For engineering, by ruling

1. **The read's key (S).** `src/components/rule-zero/read-card.tsx:69` draws `CountsKey` (`:332`). Replace it with `MarkKey` (`src/components/decks/mark-key.tsx`): entries are the five `FindingMark`s in `FINDING_ORDER` with `deckAnalysisCopy.findings.labels`, `regionAria={ruleZeroCopy.read.keyLabel}`, two columns. MarkKey gains an opt-in that keeps its columns from `md` (for example `columns={2}` beside `phoneColumns`, which becomes a wrapping line from `md`); every other caller is unchanged. Retire `CountsKey`. No new string.
2. **`seated` left of the chip (S).** `src/components/rule-zero/change-deck.tsx:158–159`: render the tag before `DeckRowChip`, in a fixed 38px right-aligned slot on every row, empty unless seated, so every chip's right edge lines up. An unready row has no chip; its slot holds `seated` at the right edge when seated.
3. **Change deck as a modal (M).** Same file. From `md` the list opens in `ModalChrome` (`decks/receipt-modal.tsx`) `width={480}` `fit`, title `swap.sheetTitle`, `lead` `swap.sheetSub`, close `swap.close`. It opens on the press with `SheetLoading` (compact, heading DRAFT *Finding your decks*); a failed load shows `swap.loadFailed` (role alert) and a *Try again* ghost button inside it. A pick closes it and swaps through `useSwap` as shipped. `useAnchoredPanel`, `ANCHORED_PANEL_CLASS`, `PANEL_WIDTH` and the outside-click handler leave this file. Below `md` the shipped `Sheet` and the link's busy and failed states are unchanged.
4. **Home: the table leads (S to M).** `src/components/home/dashboard.tsx:132` builds `tableCards` and hands it to the Friends section (`:301–323`). Render it first in the dashboard body instead, before the precon receipt (`app/page.tsx` wraps the receipt outside `Dashboard`, so the cards go in `page.tsx` ahead of `PreconPickReceipt`, or the receipt moves inside), the welcome, signature and arrivals strips and the lead. The Friends section stops drawing it. First run: `first-run.tsx:161` already draws `tables` first; keep it above the checklist. From `xl` the card lays out as one row (kicker, pod and faces in a 230px block; the sentence; *Open the table* at its own width) in the main column. Several tables: one card each, soonest closing first. When the in-app notice arrives on Home, refresh Home's tables (the card arriving is the notice). No new string.
5. **Close and the end (M, waits on lane a6's Close action).**
   - *Close the table*: a full-width text button in `--danger`, under *Log this game* at the table's foot (phone) and closing the read's column (desktop), for the setter only (`set_by`). Not on Home's card or the pod row.
   - Confirm: the shipped `Sheet` (fit) on the phone, `ModalChrome` 480 from `md`. DRAFT: *Close {pod}'s table?*, *Everyone seated loses the table now, and it can't be opened again. Games already logged stay on each deck's Games tab.*, *Close the table* (danger), *Keep it open*. A refused close: the shared toast, DRAFT *We couldn't close the table. Try again.*
   - After: the host's page draws `TableClosed` at once; other seats on their next check (the shipped 20 second poll, focus or refresh); no toast.
   - `TableClosed` (`table-closed.tsx`) learns how the table ended. DRAFT: `expired.bodyClosedByYou(pod, time)` *You closed {pod}'s table at {time}.* and `expired.bodyClosedBy(closer, pod, time)` *{closer} closed {pod}'s table at {time}.*, each followed by *Games logged from it stay on each deck's Games tab.* A morning end keeps the shipped `expired.body`.
   - **Log this game after a host closes** (approved): a host-closed table keeps *Log this game* on `TableClosed` for its seated players until the morning time it would have reached, linking to the pre-filled log as shipped. Needs the seats' snapshot kept to that time for those players only; nobody sees the table itself. After the morning end the button goes.
6. **The notice and the push (M, waits on lane a6's delivery).**
   - In the app: the shared toast (`ToastFrame`) with `TableGlyph` (18px) on the Mark plate tint, DRAFT *{host} seated you at {pod}'s table.*, action *Open* (to `/friends/table/<id>`), a bare ✕ and **no clock**. One per table, stacked. Not drawn on Home (the card is the notice) or on the table itself. Cleared for good by ✕, *Open* or opening the table any other way.
   - Push: title = the notice's words; body *You're seated with {deck}.* or, with no deck yet, *Pick your deck at the table.* (DRAFT). No image, no actions. The landing opens the table.
   - Never both: with a page in front, the service worker hands the push to the page (toast, no system notification); opened from the system notification, the notice is marked seen so no toast follows.
   - **Quiet hours** (approved): the seat push skips the 21:00–09:00 hold and adds no Settings tick. It is not one of the feed's six kinds.
   - A seat changed or removed sends nothing.

## Errata

- Lane a6 already shipped the new `expired.body` (`src/lib/copy/rule-zero.ts`, main @80c4498).
- This PR updates the handoff's own copies in `design/design_handoff_the99_rule_zero/`: README lines 9 and 150, `rule-zero · copy strings.ts` line 131, `R1 - Log-Phone.dc.html` and `R2 - Log-Desktop.dc.html` (L4, H3), and the calls board (`The 99 - Rule Zero (R1).dc.html`).

## No About entry

Hugh decides at launch (brief, Not in scope).

## Engineering audit (lane c4, 2026-11-01, rebased on current main)

Every brief item is drawn at 390 and 1300 in its listed states. Verdict is ORANGE for the notice PR only; the key, picker, Home and morning-expiry work can start today.

**Orange (send back to Design):**
1. **The seat notice's feed row and Settings tick.** Lane a6's ruling is that a stored kind ships with its drawn feed row: registering it forces a Settings checkbox (`news-section.tsx:369`) and a row in the exhaustive switch (`feed-item.tsx:73`). This handoff draws neither and calls the notice "not one of the feed's six kinds". Draw the What's new row and the Settings row, or Hugh confirms in writing a non-feed transport (and where a toast-only notice stores "seen").
2. **A long pod or host name in the notice.** No frame shows the toast or the lock-screen title at the push caps (title 40, body 120) with a long name. "Colin seated you at Thursday night's table" is already 42 characters.
3. **Undrawn but described:** Home at 1300 with no open table (README says no gap), and first-run Home with the card above the checklist.
4. **Close confirm busy state and the failed-close toast** are not drawn (shared components; a note may be enough).

**Engineering needs READINESS understates:**
- The Close PR is not S/M frontend work: `rule_zero_tables` has no `closed_at` or `closed_by`, so "You closed ... at 11:52 pm" and keeping Log this game after a host close need a migration and a seat-retention rule.
- `MarkKey` has no `md` opt-in (`phoneColumns` 2 or 3 only), as the README names. The service worker's page handoff is new work.

**Build split, in order:** (1) read key, S, normal; (2) picker with desktop modal, M, normal; (3) Home leads, S to M, normal; (4) Close backend, migration and API, risky; (5) Close and Log UI, M, normal, needs 4; (6) seat notice, migration and push (`push_outbox_kind_check`, overnight-hold skip for the seat push), one PR, backend can start now, toast and feed row wait on Orange 1.
