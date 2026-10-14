# The 99 — Collection edit (design handoff, R1)

`design/design_handoff_the99_collection_edit/` · 2026-10-09 · collection home epic, sub-projects 1 + 2

**Status: approved to ship (Hugh, 2026-10-09).** A+E, B, R2 C+D, F+G and the About addendum were each reviewed. R1 C+D is superseded and kept only for the record. Fidelity is high. Geometry, tokens and component reuse are final. Card names, deck names and figures are illustrative.

Source of truth: `docs/superpowers/design-briefs/2026-10-06-collection-foundation.md`, read **on branch `docs/collection-empty-add` (PR #1304, not yet merged)**. That's main's file plus the Hugh 2026-10-09 rulings: the first import asks nothing, and an empty collection offers Add cards beside the upload. Read alongside: `collection/{collection-place-head,review-screen}.tsx`, `cards/{card-detail-provider,card-modal,printing-region}.tsx`, `app/collection/(list)/page.tsx`, `home/first-run-step-one.tsx`, `lib/copy/{about,collection,refresh}.ts`, and the `card_detail`, `deck_import`, `collection_surfaces` and `about` handoffs.

**About these files.** The canvases are design references built in HTML. Open them with `support.js` beside them, then rebuild in the app's stack. Every value is an existing token. The canvases pin the Kaldheim values that `collection_surfaces` uses. **No new tokens and no new dependencies.**

| File | Holds |
|---|---|
| `… (R1) · A Upload and E Warning.dc.html` | §A: the choice, both warning forms, the Replace and Add previews, all-owned, unmatched, pending, failed, first import. §E: one, several and long; pending check; confirm; came back changed; cancel. |
| `… (R1) · B Add cards.dc.html` | §B0: the place head, the phone strip, /collection's empty state and Home step one, at both widths. §B1–B9: the sheet's states. |
| `… (R1) · C Card details and D Rows.dc.html` | **Superseded by R2.** Kept for the record. |
| `… (R2) · C Edit copies.dc.html` | §C: the entry points (desktop modal, phone full sheet, teaser unchanged), the Edit copies sheet at 1300 and 390, fixing a printing, adding another printing, and the save bar's states. §D: rows as shipped, removing from the sheet, the toast. |
| `… (R1) · F History and G Switch off.dc.html` | §F: list with every kind, expanded short and long, reverted and its revert, aged-out link, pending, empty, 90-day edge, revert confirm (matches and differs), decks, catalog failure. §G: switch off. |
| `STATES-collection-edit.md` | Every state, with its Must-nots. |
| `READINESS.md` | Self-assessed readiness and gaps. |
| `collection-edit · copy strings.ts` | Proposed `src/lib/copy/collection-edit.ts`. Intent only; strings go through `/copy-review`. |
| `brand/` | The locked brand sheet and its README, copied in so the package is self-contained. `support.js` is the canvas runtime, not production code. |

The About entries ship in their own folder, `design_handoff_the99_about/addendum-collection-edit/` (canvas, README, five `AboutEntry` objects). That folder is part of this handoff: commit it in the same PR.

---

## The three Design calls (§B, §C, §F)

### §B · Desktop Add cards → a 480px right side sheet
A session of adding is ten to forty cards, and the grid behind is how a player checks what's already there. The side sheet leaves 760px of the list visible at 1300. It has no scrim, but the page is `inert` while it's open (`role=dialog aria-modal`). On the phone it's full height.

**The printing is a required step, with no default** (Hugh, 2026-10-09). Picking a result opens that line's printing picker with nothing selected. The card search and Save are disabled until a tile is chosen, and Escape or ✕ cancels the add. Choosing completes the line at nonfoil, ×1, and returns focus to the search. A card with a single printing skips the step. Tiles show `you own ×N` for printings already held, but nothing is preselected. Rationale: a guessed printing saved in a hurry would be corrected later in History, so it's cheaper to ask at entry.

**Exact duplicates are combined, not flagged.** The match is checked when the printing is chosen. Same card, printing and finish adds to the existing line. That line moves to the top, pulses once, and the live region says `Already on the list · now ×2`. A different printing or finish always gets its own line.

### §C · Owning vs showing → two different surfaces (R2)
- **Art** stays the shipped `PrintingRegion` in the card modal, which is unchanged apart from one link.
- **Copies** are edited in the **Add cards sheet, scoped to one card** (`AddCardsSheet mode="edit"`): one line per holding (printing × finish), each with a printing chip, Foil and a stepper.
- **Entry:** an `Edit copies` link, right-aligned on the label line of the shipped "In your collection" receipt, in the modal's existing accent-underline link style. It's the same at both widths and **never in the teaser**. A card you don't own gets `Add to collection`. **It draws only when the modal was opened from /collection** (a `collectionEdit` prop on `CardDetailProvider`). From decks, Shopping, search and History the receipt stays read-only.
- **Handoff:** the modal closes and the sheet opens over the collection. Save or Cancel reopens the modal on the same card, re-read. There's never a modal plus a sheet.
- **No Move.** A wrong printing is fixed by re-picking the line's printing (the copies go with it). A partial fix is a lower plus `Add another printing`. **Add another printing** is a new line in §B's required printing step, with held printings left out.
- **The diff is beside Save only** (`+1 · −1`, `1 printing changed`). The owned line in the modal never shows a staged figure.
- One Save is one entry. Raising saves directly. Any lowering goes through §E.

### §F · Where History lives → a fourth tab, `/collection/history`
It joins the `(list)` group, so the strip persists. `placeFromPathname` gains `"history"`, and `visibleTabs` hides it on an empty collection with no entries (the Sets rule). Every entry kind has a fixed-width mono tag, and the 150px column fits a future `From Shopping` (drawn ghosted).

## Other decisions

1. **The upload choice is its own step** (`STEP 2 OF 4`), with neither option preselected. Each card shows its after-figure. Add carries an ⓘ note when 80% or more of the file's matched cards are already owned, which covers the "every row already owned" state. The first import stays `STEP 2 OF 3` as shipped.
2. **The Replace preview reads in order of risk:** four figures (unchanged, up or new, down, leaving), then overwritten edits, then §E embedded, then the card lists (8 then `Show all`), then the shipped issue sections. Rows from in-app edits carry an `edited` tag, which makes the warning's count findable. The confirm bar names the short decks, so no second dialog follows.
3. **The Replace warning has two forms.** The count form needs history to reach the last upload. The no-count form says why there's no number.
4. **§E is one component, and its rows are always decks.** The figure is `◆ short N` for one card, or `N cards short` for an upload or revert (that row expands to its cards). **Three decks are named and the rest are counted** behind `and N more`, which expands inline (capped at 320px with a scroll). Decks are ordered by most short, then by seniority. The confirm is an elevated secondary, Cancel takes focus, and nothing is red. The verb is the source's: Remove / Save / Revert `anyway`.
5. **§E latency.** The pressed control reads `Checking decks…` from the first frame, and everything is frozen at .6 with no reflow. A confirm that comes back changed redraws the same dialog with a polite notice. Decks that weren't there before get `new`. If the re-check is clean the save goes through, and if the other tab already did the work it says so.
6. **(R2) Rows are unchanged.** Removing a card is `Remove from collection` in the Edit copies sheet's footer, left of Save, at both widths. It stages every line at zero, Save becomes `Remove N copies`, and §E runs first if a deck relies on the card (drawn in place in R2 §D2). Afterwards a toast offers Undo, which is a revert.
7. **Revert confirms list what happens now.** When today differs, the confirm shows `Then / Now` columns, a reason per row, a banner, and the verb `Revert what's left`. A catalog failure names the card(s) and writes nothing. The entry keeps Revert, because a re-ingest could restore the card.
8. **An empty history** is dated from the ship date. The foot always names the date history reaches back to.
9. **Empty collection:** the single primary becomes two equal door tiles. **Home step one** gains `Add cards by hand` in the ghost chrome beside Paste.

## Open — for Hugh

1. **Phone upload is now two taps.** At 360, four tabs and `↻ Replace` (92px) don't fit, but `+ Add` (70px) does. The upload moves inside the Add sheet's first line, and also stays in the empty state and History. *Alternative:* keep History off the phone strip (reached from the Cards tab), which keeps `↻ Replace` and puts `+ Add` in the pinned head's row 2. Design prefers the tab.
2. **`Replace collection` renamed to `Upload a file`** while the switch is on, because the route no longer only replaces. That's a copy-review call, and the slot and icon are unchanged.
3. **The `import` About entry's "replaces, doesn't add" line** needs a negated switch to hide. See the About addendum.
4. **Add cards is the app's first side sheet.** Every other overlay is a centred modal or a bottom sheet. Hugh confirmed it's acceptable, pending confirmation of the reasoning in §B. If it's declined, B1–B9 work unchanged as a 560px centred modal, but the collection behind is covered.
5. **The phone printing picker is one sideways-scrolling row** (B4m), not the desktop grid. That's a `layout="row"` option on `PrintingRegion`'s choose role.
6. **§D changed (R2):** the brief puts removal on the Collection row. R2 keeps rows as shipped and puts removal in the Edit copies sheet, two presses from the row. If a row control is required, the fallback is a desktop-only hover `Edit` in the chevron cell (described in R2 §D, not drawn).

**Icons.** Every upload mark is the shipped `ReplaceIcon` SVG from `collection-place-head.tsx`: 14px beside 13px text, 16px on a line, 18px in a 34px tile, 20px in the empty-history circle. Never the ↻ glyph.

## Notes for engineering
- **Components:**
  - New: `UploadChoice`, `ShortDeckWarning` (dialog, sheet and `embedded` variants), `AddCardsSheet` (`mode="add" | "edit"`) + `AddLine`, `HistoryEntry`, `RevertConfirm`.
  - Changed:
    - `PrintingRegion` gains `role="art" | "choose"` and `source="owned" | "catalog"`. Choose withholds the pick and shown-now badges and writes no preference.
    - `ReviewScreen` gains a `mode` and the four-figure row.
    - `CollectionPlaceHead` gains Add cards and the History tab.
    - `OwnedLine` is unchanged. `Edit copies` is its sibling. `RowsView` and `GridView` are unchanged.
- **Every write** goes through `applyCollectionDelta`, with one entry per action: sheet save (add or edit, including printing changes and removal), upload, revert.
- **Undo** (the C save notice, the D toast) is a revert and goes through §E.
- **Prefers-reduced-motion:** the duplicate pulse is the only new animation.
- **Sequencing:** A and E first (sub-project 1), then F, then B with C/D (the same sheet).
