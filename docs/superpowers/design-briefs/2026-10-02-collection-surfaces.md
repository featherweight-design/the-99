# Collection on the phone, and where Proxies belongs

Design brief, 2026-10-02. A rework of existing surfaces (`/collection` on the phone, and
`/collection/proxies`); no new feature.

## The findings

From Hugh's walk on 2026-10-02 (intake items H11 and H18):

1. **The phone head is spent badly.** The search field is small, and the controls above the cards
   take too much height before the first card shows.
2. **The controls are gone once you scroll.** Search, filters and sort sit at the top of the page
   and scroll away with it. To change a filter halfway down a 3,000-card collection, you scroll
   back to the top. Sets answers this differently: its open head scrolls away, and past a scroll
   threshold a shorter form of it pins to the top (`use-head-collapse.ts`, R3 finding 6;
   `set-grid-view.tsx` is `sticky` only while collapsed). The open head is deliberately not
   pinned: pinned, it covered 288px of an 844px phone (#623).
3. **Two cards across is too few.** The phone grid is an explicit 2-up (`grid-view.tsx`), a layout
   that predates card captions; erratum 5 of that readiness set only the desktop's tile floor. Hugh wants three across, as ManaBox draws it: a collection
   is browsed by art, and half as many cards again per row is the point.
4. **Proxies feels detached from Collection.** It is reached from a link in the collection's filter
   bar (`filter-bar.tsx`), or from the empty-collection state (`collection/page.tsx`, which draws
   its own entry because the filter bar is not mounted there), and once you are there nothing ties it back. It has no way back to
   Collection (H19, a bug fixed separately), and it does not read as part of the same place.

## The ask

- **A compact sticky head for `/collection` on the phone**, always reachable: search plus the
  filter and sort entry points, in less height than today. Sets' collapsing head is one answer to
  the same problem (the controls stay in reach once you scroll) without pinning a tall head. Say
  whether Collection collapses the same way, or is compact enough to pin from the start, and
  give its pinned height against the 844px phone.
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
   shared shape for all three is on the table if it is better than placing Proxies alone. Whatever
   moves Proxies must still give the empty-collection reader a way in.
5. **Rows view.** Rows is the phone's DEFAULT (`browser.tsx`: with no URL view and nothing stored,
   a phone gets rows and a desktop gets the grid), so a phone reader who never touched the toggle
   sees rows, and the 3-up grid reaches only readers who switched. Say whether the 3-up changes
   that default. The sticky head must be the same in both views.

Out of scope: the copy, the filter sheet's contents (H8, the Type chips collapsing at a zero count,
is a bug fixed separately), the card details sheet, and the replace flow.

## Engineering already in flight on `/collection` (stay compatible)

Two changes to this route are being built now, and the design has to work with both:

- **The first window (performance lane, 2b, PR 4).** Every card's ROW ships with the page, so
  search, filters, sorts and counts still run over the whole collection at once. What waits is each
  row's DRAWN fields (art, facts, combo partners) outside the first window, fetched as rows come
  into view (`plans/2026-09-28-list-payload-shrink.md`). So the head can count and filter as it does
  today, but a tile it brings into view may briefly draw without its art: the 3-up tile needs a
  state for that.
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
