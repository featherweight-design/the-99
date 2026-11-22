# Readiness Review — Alternate printings from search, R3 (printings button and panel, search by set)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-22 (against origin/main 83ed39883, which carries R2: #3168 `printing-strip.tsx`, #3171 its wiring in `card-modal*`)
**Related ticket(s):** #3002 (R1 #3054/#3058, R2 #3168/#3171; R3 handoff PR #3173, option A approved by Hugh 2026-11-22)
**Plan PR target:** TBD (docs/superpowers/plans/)

## Summary

R3 is buildable as drawn on today's tree. It adds no token, no switch and no read: the panel searches `card.printings` (unowned) and the strip's `orderStrip(...)` list (owned), which already reach `CardModal` from search with `setName`, `setCode`, `collectorNumber`, `imageUri`, `quantity`. Phone (A1-A5) and desktop (D1-D2) are drawn. No Design round-trip is needed. Eight eng-side clarifications go in the plan PR as decisions; one visual ambiguity (owned labels) is a non-blocking question for Design. Option B (PhoneB) was not chosen and is not built. Copy is DRAFT and goes to copy-review.

## What R3 reverses or replaces from R2

Replaced (phone only):
- The phone teaser strip: `strip && !full ? <div className="md:hidden mt-[14px]">{strip(false)}</div> : null` in `card-modal-sheet.tsx` (~l.319) is removed, and so is the `strip(false)` call site in `card-modal.tsx` (the strip's `paddles={false}` use).
- `PRINTING_STRIP_TEASER_HEIGHT = 98` (`card-modal-parts.tsx` l.41), its import and its use in `card-modal.tsx` l.432 (`doorHeight + (narrow && hasStrip ? 98 : 0)`). The teaser is 280 on every card again, door strip aside.
- READINESS-R2 Item 5 (teaser +98, `fitsDoor` drop rule) and the R2 phone-swipe probe. R2 README call 1's "strip in the phone teaser".
- The phone's plain `teaser-set` line on 2+ printing search cards becomes the printings button (`card-modal-sheet.tsx` ~l.307). At one printing it stays plain.
- R2 phone tests (`card-modal-strip.test.tsx` phone cases, sheet-height cases) move or go.

Kept: `printing-strip.tsx` (order, thumbs, roving tabindex, paddles, announce) on desktop (`hidden md:block`, `strip(true)`), `printingStripCopy`, `previewId` selection, the full sheet and its Set field, "viewing never changes the pick", nothing stored.

Extended: the strip gains a leading Search tile (desktop only); `StripPrinting`/`stripKey` are reused by the panel.

## Per-dimension findings

### 🗺️ Scope clarity
- ✅ Six calls, option B named as not chosen, unchanged surfaces stated (Full sheet / Set field).
- 🟡 No non-goals or open-questions list. Not drawn on purpose: wishlist, deck picks, Collection and deck details (all `hasStrip` false there).

### 🎭 State coverage
- ✅ Phone: button at 22 printings, one printing, panel open, searching, tapped. Desktop: tile, panel searching with a selection.
- 🟡 Not drawn: no-match empty (string only), owned card with all printings owned (no "Other printings" head), no-art thumb, a 100+ printing grid, the panel on a short phone, the panel on a short desktop window, the button in the full snap, the panel at the min snap. No loading state needed.
- ✅ Phone and desktop panels are drawn (A3-A5, D2), same component. Parity holds.

### 🔌 Data contract
- ✅ Every named state is reachable: `setName` (nullable, fallback `setCode`), `setCode`, `collectorNumber` for matching; `mine`/`pick`/`quantity` from `orderStrip`. No new read, route or API: the filter is client-side over the payload already in the modal.
- 🟡 Thumb selection needs `scryfallId`; a printing without one (nullable on owned rows) cannot set `previewId`. Same limit as R2's strip.
- ✅ Query text is local, never reaches a model prompt (`playerText` not involved).

### 🧱 Codebase fit
- ✅ Tokens used (`--bg`, `--border-strong`, `--accent`, `--accent-text`, `--surface-sunken`, `--fg-*`) exist. `SearchField` (`ui/text-field.tsx`), `SearchGlyph` (`card-search.tsx`), `printing-strip` exports exist as named.
- 🟡 Strings live in `src/lib/copy/` (extend `printingStripCopy`); copy-review first. Count words go through `count()`.
- 🟡 `scratch-gen-r3/` hard-codes `../../lib` imports and static state; reference only. The PR also still carries `scratch-gen/` and `scratch-gen-r2/`; same recommendation as R2: drop them in a follow-up, never import.
- ✅ No feature switch (R1/R2 shipped with none).

### ♿ Cross-cutting
- ✅ `aria-haspopup="dialog"` button and aria text, `role="dialog"` panel, `Close printings`, `aria-pressed` thumbs are drawn.
- 🟡 Focus is not specified. The panel is a dialog inside the modal dialog.
- 🟡 Result count is only visual; no live announcement of `{k} of {n}`.
- ✅ Perf: no payload growth. 100+ images render in the grid; use the strip's `ArtLayer`.

### ⏰ Drift from reality
- ✅ Drawn on main 83ed398 (current). `card-modal*`, `useSheetSnap`, `previewId`, `hasStrip`, `stripKey` resolve as named.
- 🟡 `useSheetSnap`'s `cramped` rule: with a 400 shelf the card band falls under `MIN_TEASER_CARD_WIDTH` (120) when the dialog is under about 653px tall (an SE-class phone), and the sheet would flip to full under the open panel.

### 📝 Decision log
- ✅ Calls 1-6 numbered, A approved, strings marked DRAFT.

## Gaps requiring a Design round-trip

None blocking. One non-blocking question for Design: owned thumbs drop the collector number (`SLD ×2`), so two owned printings of one set read identically. Eng builds as drawn and carries the full number in the aria label; Design may add the number to the owned label later.

## Eng-side clarifications (Yellow)

- Item 1: The panel's open height rides `useSheetSnap` as an input (like `doorHeight`), is excluded from `cramped`, and is capped so the card keeps 120 wide (shelf = min(400, dialogHeight - 85 - 120/0.7159)); below 280 the button opens no panel and stays a plain line. Follows the A3 drawn 400.
- Item 2: Close order in `runEscapeLadder`: panel first (Escape, ✕, a pull down, paging), then the sheet. Pull down closes the panel, not the sheet. Focus moves to the search field on open and returns to the button or tile on close; the modal's existing trap stays.
- Item 3: The button shows when `hasStrip` and the sheet is not full (as R2's strip did); the full sheet keeps its Set field. Owned and unowned both use `{n} printings ▾`, n = the strip total.
- Item 4: Panel list = `stripPrintings` (same order and flags). No query: owned cards get `In your collection · k` then `Other printings · m` (head dropped when m is 0); unowned one ungrouped grid. Query: group by `setName ?? setCode` in list order, with `{k} of {n} printings`.
- Item 5: Empty result draws the mono head `No printings match “{q}”` where the grid would be (the A4 head pattern), and the count is announced through the modal's live region.
- Item 6: Desktop popover anchors under the strip over the details column, max height the column's own, scrolls inside; the Search tile joins the strip's roving tabindex (first stop stays the shown thumb) and scrolls with the row.
- Item 7: Selection reuses `previewId` and `printingStripCopy.announceShowing`; the panel stays open; nothing stored. No-art and two-faced thumbs use the strip's `identityGradient` fallback.
- Item 8: A probe (fwd:ui-probe) at phone width proves a swipe between a 22-printing and a 1-printing card never changes the shelf height, and that the panel opens and closes.

## Decisions inherited

- Option A only: no strip on the phone teaser, shelf 280 always (R3 call 1); desktop keeps the strip plus the Search tile.
- Selecting is the R2 preview: nothing stored, the pick never changes, forgotten on close or paging.
- Full sheet and Set field unchanged from R2. Search row, wishlist, deck picks, Collection and deck details, Mana Pool link unchanged.
- Strings DRAFT, copy-review before build; no new switch; no new read.
