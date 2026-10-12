# The 99 — /collection: sort by price (design handoff, R1)

`design/design_handoff_the99_collection_price/` · 2026-10-11 · **approved by Hugh 2026-10-11** · see `READINESS.md` · addendum to `design_handoff_the99_collection/` and `design_handoff_the99_collection_surfaces/`

Canvas: `The 99 - Collection Price Sort (R1).dc.html`. Frames are drawn at 900 and 390. Ids (L1, G1, N1, S1, C1–C6) match `STATES-collection-price.md`. The design table is in `design-tables/collection-price.md`, and placeholder copy is in `collection-price · copy strings.ts`.

**Summary:** the price comes with the Price sort and leaves with it. It leads a line each card already has, so no row or tile gets taller.

## Ruled (Hugh, 2026-10-11) — taken as given
- Price is the value of **one copy**: the printing the player owns, and the foil price when that copy is foil.
- Cards with no price sort **last in both directions**.
- The figure is Mana Pool's, from the same source as card detail's tag (`PriceTag`, `priceOf`, `priceState`).

## The five calls

### 1. Only while sorted by price
The reason for drawing the price is to explain the order, so it draws only when the order is by price. On the other five sorts the rows and tiles are exactly what ships (N1, N2). The price leaves on the same render as the sort change, with no fade and no held slot. An always-on price would put a shop's figure on every view of a page that is about the player's shelf, and card detail already carries the price one tap away.

### 2. It leads a line the card already has
- **Rows:** the figure starts the type line. At 900 that is the 150px type column. At 390 it is the line under the name. It sits at the same x on every row, so the figures read as a column. The type text gives way and truncates, and the figure never does.
- **Tiles:** the figure starts the `SET · rarity` sub-line. At 900 the line reads `price · SET · rarity`. On the 3-up phone tile the rarity drops while the price shows, so it reads `price · SET`. This is decided by the sort key, never by measurement (the same rule as `MAX_TILE_MARKS`).
- **Heights:** no column or line is added. The figure's line-height matches the line it joins (16/18 on rows, 11/12 on tiles). The row and the 70/65 caption are unchanged, so the grid's measured first screen holds.
- **Ink:** plain mono figure in `--accent`, tabular-nums, with no chip box. This is the printing picker tile's treatment in card detail (`$2.41`, mono 9 `--accent`). A bordered chip is ~17px tall and would grow the tile sub-line.

### 3. No price
This follows card detail's gap 1 ruling, unchanged:
- **`no stock`** in `--fg-muted` when Mana Pool answered no. That covers never stocked and sold out, which are kept apart only in the spoken name (C5).
- **Nothing** when no answer reached us: no dash, no `$0.00`, no held slot (C6).
- Both sort last in both directions, together, A–Z.

### 4. Copies in different printings
The card sorts and shows on its **most valuable copy**, in both directions, so reversing the sort reverses the list exactly. Sorting on max in one direction and min in the other would move a card between directions. The suffix **`max`** in `--fg-muted` says a cheaper copy exists (C3). When the top copy is also foil, `max` takes the visible suffix and the finish is spoken only. One suffix fits the 390 tile and two do not (C4). Two finishes of one printing count as different printings. Card detail's printing region keeps the breakdown.

### 5. The sort control
Price is the sixth row of the existing single-select panel: **Highest first** (default) and **Lowest first**. The shipped mechanics are unchanged: only the selected row shows a hint, and selecting it again reverses it. Under 480px the trigger drops `Sort:`, as ruled in collection surfaces R2 §B2. `Sort: Price · Highest first` has the same character count as the shipped longest trigger, `Sort: Rarity · Mythic first`. Confirm the rendered width against R2's 518px one-row budget.

## About entry
None. I agree with the brief: this is a sort option on a known surface, and the price itself is already explained by card detail.

## Engineering notes
- `SortKey` gains `"price"`. `SORT_KEYS` appends it. `DEFAULT_SORT_DIRECTION.price = "desc"`. `DIRECTION_LABELS.price = { asc: "Lowest first", desc: "Highest first" }`.
- Sort key per card: the max over the owned copies of `priceOf(fact, state)` for that copy's printing and finish. Unpriced copies are ignored. If no copy is priced, the key is null. Null keys go after all priced cards in both directions, tiebreak name A–Z (the shipped `browse.ts:947` rule).
- `BrowseListCard` gains `price?: { cents: number; finish: "foil" | "etched" | null; printings: number } | { none: "soldOut" | "neverStocked" } | null`, populated **only when sort=price**. The figure ships in the list payload and is never fetched late. Rows render as data arrives, with no shimmer.
- Spoken: when sort=price, the row and tile names gain the price clause last (strings in the copy file). `nameSpoken` on tiles, the `rowAria` tail on rows.
- F1: if the price read fails, Price stays selectable, every key is null, the order falls back to A–Z, and one line under Showing says so.

## Open for review
1. **Contrast.** `--accent` on `--surface` in Kaldheim measures ~4.4:1 for the 11.5px row figure. That is just under 4.5, and it matches the shipped `×N` quantity ink on the same surface. Should the figure take `--accent`, or `--fg` for contrast? This needs a check across all six themes.
2. **`ManaPool` vs `Mana Pool`.** The shipped spoken strings use `ManaPool`. The brief writes `Mana Pool`. Left for /copy-review.
