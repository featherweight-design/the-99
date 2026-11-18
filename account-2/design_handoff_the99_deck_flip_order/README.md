# Flip between decks + custom deck order — R1

Issues: #2989 (flip prev/next from the deck page) and #2990 (custom order for /decks). Drawn together because flipping follows the list's order.
Status: **R1, awaiting Hugh's review.** No handoff PR until approved.

Boards (`boards/`, 2x): D1, D2 (deck page desktop), P1 (deck page phone), O1 (sort menu desktop), O2 (Arrange desktop), O3 (phone sort sheet + Arrange).
Desktop boards are drawn over shipped kaldheim captures (`public/about/pages/kaldheim/desktop/d-deck-top`, `d-decks2`). The phone header band in P1 is redrawn (no shipped capture shows the band top); the panel below it and the top/tab bars are shipped captures. `scratch-gen/` holds the HTML and `node render.js boards.html out/`.

## Part 1 · Flip between decks (#2989)

1. **Cluster:** `‹  N of M  ›` at the top right of the deck header band. Desktop: two 32px ghost squares (same chassis as the header ⋯) on a translucent ground. Phone: one pill on the band scrim, two 44×44 hit boxes.
2. **Caption** names the order and the list: `<Sort label> · <list>`, list = `All decks`, the folder name, or `N filters on` / `Search: <q>` when filtered. Desktop: under the cluster. Phone: under the header actions row.
3. **Tooltip / aria-label** on each button: `Previous deck · <name>` / `Next deck · <name>`, with the key (← / →) on desktop.
4. **Keys:** ← / → anywhere on the deck page, except when focus is in input/textarea/select/contenteditable, `[role=tablist|listbox|menu|radiogroup|slider]`, a carousel, or any open dialog/sheet; modifier keys pass through.
5. **Ends wrap** (5 of 5 → 1 of 5). No disabled arrows anywhere.
6. **Hidden** when the list has one deck, and on friend decks / precon pages (own decks only in R1).
7. **Order source:** /decks writes its visible id order + caption to sessionStorage on navigation to a deck (triage option b). A deck opened without one (Home, a link, a push) falls back to All decks in the saved sort, no filters (**G1**).
8. **On flip:** `router.push` to the neighbour, keep `?tab=` and the sub-view, scroll to top, prefetch both neighbours. No slide animation.
9. **No swipe** in R1 (carousel, tab strip and card rows already take horizontal gestures) (**G2**).

## Part 2 · Custom order (#2990)

1. **Sort menu** gets a fourth option `Custom`, then a hairline, then `Arrange decks…` with the count. Same rows on the phone ⇅ sheet (48px rows, bare ✕).
2. Picking `Custom` the first time (no saved positions) opens Arrange seeded with the order on screen. `Arrange decks…` always opens Arrange and sets the sort to Custom.
3. **Arrange mode** (same route, a mode, not a page): the grid becomes one column of rows: art (tile crop), name (display face), commander line (desktop) / colour only (phone), position number (desktop only), ⠿ handle on the right. Rows are not links in this mode. Heading block: `<list> · N` eyebrow, `Arrange decks`, help line `Drag ⠿ to move a deck. Filters and search are set aside until you’re done.`
4. **One move control: the handle** (44×52). Pointer/touch drag on the handle (touch-action: none on the handle only, so the page still scrolls). Keyboard: Space lifts, ↑/↓ move, Space drops, Esc cancels the lift; a live region reads `<name>, k of N`. Lifted row: raised surface, accent border, focus ring on the handle; dashed slot at the drop point; edge autoscroll.
5. **Done** saves the whole order in one write (`reorderDecks(ids[])`); **Cancel** discards. Desktop: buttons right of the heading. Phone: pinned bar above the tab bar, halves, 44px. Leaving with unsaved changes asks once with the shipped DeleteConfirm pane (`Keep arranging` / `Discard`).
6. **Folders:** one saved order across all decks. In a folder, Arrange orders that folder's decks only (eyebrow shows the folder); their positions are rewritten among themselves. Folder order itself unchanged (by name) (**G4**).
7. **New decks** go to the top of a custom order (**G3**). Null positions sort as newest.
8. Tiles stay links; no drag on the live grid (deck_folders §18 holds).
9. Server-side `decks.sort_position`; the sort choice itself stays per browser as today, but the order is the same everywhere. List cache retires on reorder.

## Open calls (recommendation first)

- **G1** Deck opened directly: fall back to All decks in saved sort (rec) / show no cluster.
- **G2** Swipe on phone: none in R1 (rec) / edge swipe on the header band only.
- **G3** New decks in Custom: top (rec) / bottom.
- **G4** Folder order: unchanged, by name (rec) / Arrange folders too.
- **G5** Ends: wrap (rec) / stop with the arrow hidden at the end.
- Copy DRAFT: `N of M`, caption, `Arrange decks…`, help line, `Keep arranging` / `Discard`.

## Gaps for build

- sessionStorage handoff from /decks (ids + caption) and the fallback order read for G1.
- `decks.sort_position` migration, `reorderDecks` action, `custom` in `DeckSort`, list-stamp trigger.
- Global key handler guard list (item 4 of Part 1).
