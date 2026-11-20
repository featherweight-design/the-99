# Flip between decks + custom deck order

Issues #2989 (flip between decks on the deck page) and #2990 (custom order for /decks). Approved by Hugh 2026-11-18 after three rounds: placement **A2, the strip under the art**, and arranging **allowed inside folders**, centred on desktop.

Boards: `Main` (the calls), `Flip` (A2 at both widths), `Order` (sort menu, Arrange, Arrange in a folder). Frames are renders of the shipped components (NavRail, MobileHeader, TabBar, SpineMobile, SpineDesktop, DecksView, DeckCard, OrderMenu) with the proposal patched in; `scratch-gen/` holds the render script and the scratch-only diff. Round history lives on design-assets `account-2/design_handoff_the99_deck_flip_order/` (R1, r2, r3). Rejected placements (A1 above the art, A3 in the count row, A4 floating pill) and R1/R2's band cluster are recorded there, not here.

## 1 · The deck strip (#2989)

One markup at both widths, no desktop-only crumb or hover card.

- Left: `‹ All decks`, or `‹ <folder name>` when the deck was opened from a folder. Goes back to that list, keeping its sort.
- Right: `2 of 5`, then two ghost squares `‹` `›` on the header's ghost chassis: 44px on phone, 36px on desktop. Plain tooltip / aria-label `Previous deck · <name>` and `Next deck · <name> (→)`; the key hint only on desktop.
- **Placement (A2):**
  - Phone: the first row inside `data-spine-under-band`, above the progress bar (+44px). It reads as part of the deck's header, about a third of the way down.
  - Desktop: a full-width row under the band, before the to-do card (+48px).
  - Never over the commander art.
- Desktop keys: `←` / `→` anywhere on the page. Ignored in inputs, textareas, contenteditable, `[role=tablist|listbox|menu|radiogroup|slider]`, carousels, open dialogs/sheets/menus, and with any modifier held.
- Ends wrap (5 of 5 `›` goes to 1 of 5).
- Hidden: a one-deck list, friend decks, precon pages.
- Navigating keeps `?tab=` and the sub-view, scrolls to top, prefetches both neighbours. No swipe.
- Order source: on navigation from /decks, write `{ids, caption}` for the list as shown (sort, folder, filters, search) to sessionStorage. Opened directly (link, reload in a new tab), fall back to All decks in the saved sort with no filters, and the left link reads `‹ All decks`.

## 2 · Custom order (#2990)

- `DeckSort` gains `custom`, label `Custom`, listed after `Newest`. The shipped OrderMenu gets a hairline and an `Arrange decks…` row with the deck count. Phone uses the same ⇅ dropdown (not a sheet). A ✓ marks the current sort.
- Picking Custom with no saved order opens Arrange seeded from the order on screen. `Arrange decks…` always opens Arrange and sets the sort to Custom when done.
- **Arrange mode** (same route, a mode): one column of rows, art crop, name in the display face, commander line on desktop / colour pips on phone, the ⠿ handle on the right (44×52 target). Rows are not links. Filters and search step aside while arranging and come back after.
- Desktop: heading, Cancel / Done and rows share one centred 720px column.
- The handle is the only move control: pointer/touch drag (`touch-action: none` on the handle), keyboard Space lifts, ↑↓ move, Space drops, Esc cancels the lift. Live region `<name>, k of N`. Edge autoscroll.
- Done saves with one server action `reorderDecks(ids[])`. Cancel discards. Leaving with unsaved changes asks `Keep arranging` / `Discard`.
- **Inside a folder:** the menu row reads `Arrange <folder>…` with the folder's count, and Arrange lists only those decks, with the note "Moves these decks among themselves. Your other decks keep their places in All decks." There is one saved order: the folder's decks swap among their own slots, every other deck keeps its place.
- New decks go to the top of the custom order. Folders stay in name order.
- Data: `decks.sort_position`; the /decks and Home list cache retires on reorder.

## Copy (DRAFT)
`‹ All decks` · `‹ <folder>` · `2 of 5` · `Previous deck · <name>` · `Next deck · <name> (→)` · `Custom` · `Arrange decks…` · `Arrange <folder>…` · `Arrange decks` / `Arrange <folder>` (heading) · `Cancel` · `Done` · `Moves these decks among themselves. Your other decks keep their places in All decks.` · `Keep arranging` · `Discard`.
