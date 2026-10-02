# Collection on the phone, and where Proxies belongs

Design brief, 2026-10-02. A rework of existing surfaces (`/collection` on the phone, and
`/collection/proxies`); no new feature.

## The findings

From Hugh's walk on 2026-10-02 (intake items H11 and H18):

1. **The phone head is spent badly.** The search field is small, and the controls above the cards
   take too much height before the first card shows.
2. **The controls are gone once you scroll.** Search, filters and sort sit at the top of the page
   and scroll away with it. To change a filter halfway down a 3,000-card collection, you scroll
   back to the top. Sets does not have this problem: its phone head is sticky and collapses to a
   shorter form past a scroll threshold (`use-head-collapse.ts`, R3 finding 6).
3. **Two cards across is too few.** The phone grid is an explicit 2-up (`grid-view.tsx`, from the
   card-captions readiness, erratum 5). Hugh wants three across, as ManaBox draws it: a collection
   is browsed by art, and half as many cards again per row is the point.
4. **Proxies feels detached from Collection.** It is reached from a link in the collection's filter
   bar (`filter-bar.tsx`), and once you are there nothing ties it back. It has no way back to
   Collection (H19, a bug fixed separately), and it does not read as part of the same place.

## The ask

- **A compact sticky head for `/collection` on the phone**, always present: search plus the filter
  and sort entry points, in less height than today. Use Sets' sticky head as the reference for
  behavior, not necessarily for layout. Say whether it collapses on scroll as Sets does, or is
  simply compact from the start.
- **A 3-column phone grid.** At 390px the track is 362px, so a tile is about 115px wide with two 8px
  gaps, against 175px today (two tiles and a 12px gap). Say what a tile still carries at that width: the caption (name,
  count, marks), the ownership dot, the art crop or the whole card. The desktop track (a 178px tile
  floor, auto-fill) is out of scope unless the phone change forces it.
- **Proxies as part of Collection.** A tab or segment beside Sets in the collection's own head, a
  shared header, or another shape that makes it read as one place. Say which, and say how the
  phone and desktop each reach it.

## Open for Design

1. **The sticky head's contents and heights**, open and (if it collapses) collapsed, at 390 and at
   the `md` boundary. Where the active filter chips go: in the head, or in the filter sheet only.
2. **The search field.** Its height and width on the phone, and whether it takes the full width of
   the head.
3. **The tile at 3-up.** What is dropped or shrunk, at what type size, and whether the marks (Game
   Changer, tutor, and the rest) still fit. The marker key above the grid must still read at 3-up,
   and H7 (the key's padding and equal-width columns) is open on it now.
4. **The collection–Sets–Proxies relationship.** Sets already sits under `/collection/sets`, so a
   shared shape for all three is on the table if it is better than placing Proxies alone.
5. **Rows view.** The phone also offers a rows view (`rows-view.tsx`). Say whether the sticky head
   is the same in both views. It should be.

Out of scope: the copy, the filter sheet's contents (H8, the Type chips collapsing at a zero count,
is a bug fixed separately), the card details sheet, and the replace flow.

## Engineering already in flight on `/collection` (stay compatible)

Two changes to this route are being built now, and the design has to work with both:

- **The first window (performance lane, 2b, PR 4).** The collection list ships its first window of
  cards with the page and fetches the rest after, so a large collection paints quickly. Whatever the
  head does, it must not depend on the whole list being in the document at first paint. A count in
  the head, for example, reads the total from the server, not from the cards drawn.
- **The view drawn on the server (d8, the list-then-grid flash).** On desktop the page now draws the
  reader's chosen view (grid or rows) on the server, from a cookie that mirrors the stored choice,
  and the cookieless first visit draws both and lets CSS pick by width. So the view's container
  is server markup, and a head that changes height on scroll is a client behavior layered over
  it. It must not move the first paint, and it must not reintroduce the flash: no layout that
  waits for a client measurement before the cards show.

Both touch `src/components/collection/browser.tsx`, which is where the head is assembled, so the
build of this design follows them.

## Where it lives

- `src/components/collection/browser.tsx`: assembles the head, the view and the filters.
- `src/components/collection/filter-bar.tsx`: search, filter and sort, plus the Sets and Proxies links.
- `src/components/collection/grid-view.tsx`: the 2-up phone grid and the desktop tile floor.
- `src/components/collection/rows-view.tsx`: the rows view.
- `src/components/sets/use-head-collapse.ts` and `set-grid-view.tsx`: Sets' sticky, collapsing head.
- `src/app/collection/proxies/page.tsx`: Proxies.
- Handoffs: `design/design_handoff_the99_collection`, `design_handoff_the99_collection_filter`,
  `design_handoff_the99_proxies`, `design_handoff_the99_set_collections`.
- Intake: H11 and H18 (this brief); H7, H8 and H19 (bugs fixed separately).
