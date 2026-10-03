# Collection surfaces — states (R1)

Phone states are drawn at 390 and 360 in §1. Every Must-not applies at both widths, and in rows as
well as in the grid.

## Head

### H1 · At rest, scroll 0
The tab strip (48) sits above a pinned head (102): search + view well, then `Filters` · `Sort` ·
`1,804 results`. Below them come the key, then the grid or rows.
- **Must not** pin the tab strip. It is place navigation, and it scrolls away.
- **Must not** draw a chip shelf with no filter on.
- **Must not** wait on any client measurement before the cards paint.

### H2 · Scrolled (the drawn answer to "collapsed")
The head stays at 102, pinned at the top of the viewport. The strip, the shelf and the key are above the
viewport.
- **Must not** change height, animate, or interpolate with the scroll offset. There is no second form.
- **Must not** import `use-head-collapse`, or add a spacer, threshold or `ResizeObserver`.

### H3 · Filters on, at rest
The `Filters` border goes `--accent`, and its badge counts dimensions, never values or the search. The
38px shelf below the head holds one line of chips in dimension order, scrolling sideways, with
`Clear all` at the trailing edge. The result count updates.
- **Must not** wrap the shelf to a second line.
- **Must not** put chips inside the pinned head.

### H4 · Filters on, scrolled
The badge and the count carry the state; the shelf is above.
- **Must not** hide or disable `Filters` or `Sort` at any scroll offset. This was finding 2.

### H5 · Search focused
The field takes an `--accent` edge with a 3px accent-tinted ring and a ✕ to clear. The view well
hides under `:focus-within`, so the field fills row 1. The count updates live. The query chip
`"tutor" ×` sits on the shelf.
- A query change made below the head's rest offset scrolls back to that offset.
- **Must not** move or resize the head on focus. Only row 1's contents change.
- **Must not** lose the result count while typing.

### H6 · Rows view
Identical to H1–H5 above the list.
- **Must not** add the availability entries to the rows key.

### H7 · 600–999 (and the md boundary)
One row of 60px: search, `Filters`, `Sort`, count, view well.
- **Must not** ship before the sheet portals out of the sticky box.

### H8 · Filter sheet open
The sheet is a portal over everything, and the head underneath does not change.
- **Must not** render inside the sticky box.

## Tile (3-up, below md)

### T1 · Drawn
Art at 63:88, then the caption at a fixed 70px: meta (chip glyph · facts · combo), name + `×N`, then
`SET · rarity`.
- **Must not** shrink any mark below its shipped size.
- **Must not** draw the chip's word.

### T2 · Over-committed
A 21px chip box, a `--danger` edge and a danger tile border.

### T3 · More than three glyphs
The first two facts, then `+N` in 9px mono `--fg-faint`, decided by count.
- **Must not** measure the line's width to decide this.

### T4 · Pending (first window)
A flat `--surface-sunken` plate with the inner edge. The caption shows the name, `×N`, sub and chip
glyph, with an empty meta remainder.
- **Must not** use the identity gradient.
- **Must not** shimmer.
- **Must not** change the caption's height when the facts land.

### T5 · No art
The shipped identity gradient, unchanged.

### T6 · Fetching detail (`pendingOracleId`)
The shipped opacity of 0.55, unchanged.

## Tabs

### P1 · On /collection, /collection/sets and /collection/proxies
`Cards · Sets · Proxies`. The current tab is `--fg` 600 with a 2px `--accent` underline and
`aria-current="page"`.
- **Must not** carry a query.
- **Must not** appear on `/collection/sets/[code]` or `/collection/replace`.

### P2 · Empty collection
`Cards · Proxies`.
- **Must not** render Sets as disabled. It is absent.
