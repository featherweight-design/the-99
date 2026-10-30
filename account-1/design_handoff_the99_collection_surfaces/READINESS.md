# Collection surfaces — readiness (R1)

| Part | Readiness | Note |
|---|---|---|
| Head (pinned, phone) | **Ready after PR 4 + d8** | CSS-only; needs the sheet portal and the chassis split (gap 2). |
| Head (768–999) | **Blocked on the portal** | Without it, the rail paints over the open sheet (the `filter-bar.tsx` comment). |
| 3-up grid | **Ready** | Severable. Needs a glyph-only `AvailabilityMarker` form and `CollectionMarkKey({ withAvailability })`. |
| Pending tile | **Ready with PR 4** | Depends on which fields PR 4 defers; see gap 5. |
| Tabs | **Ready** | Severable. Removes two pills, two breadcrumbs and one empty-state button. |

## Gap report

1. **The phone default is unchanged (rows).** It needs a Product ruling if art-first should be the
   default. That is one line in `browser.tsx` plus the cookieless CSS rule.
2. **The chassis's decision 2 yields on /collection's compact form.** Row 2 leaves the pinned box and
   renders only while chips exist. The reasoning: the shelf sits in the scroll, above the list, and
   any filter change resets the list (decision 6), so its appearing never moves a list the reader is
   in the middle of. It still departs from a shared frame. The other routes keep the rule. I want a
   ruling on whether this becomes a chassis-wide compact form or stays route-scoped.
3. **The Cards tab is bare `/collection`.** A reader who filters, visits Proxies, then taps Cards
   loses their filters (Browser Back keeps them). Remembering the last query per session is possible
   and would not cross a route boundary. It is not drawn.
4. **The shipped figures are measured from the 390 screens; R1's are derived.** Today the first tile
   sits at 339px. R1 puts it at 320: mobile header 70 + tabs 48 + head 102 + key 90 + padding 10. The
   keyboard is drawn at a nominal size.
5. **The pending tile assumes availability ships with the row.** The filter needs it, so it should,
   but `list-payload-shrink.md` was not read this round. If the chip glyph is a drawn field, it joins
   the facts in arriving late. The fixed meta line absorbs that either way.
6. **On the phone the `h1` becomes `sr-only` and the stats line drops.** The copies total
   (`2,933 cards`) is the one figure lost on the phone. Replace becomes an icon (`↻`, aria-labelled).
7. **The tab labels are new copy** (`Cards`, `Sets`), although copy is out of scope. The strings are
   in `collection-surfaces · copy strings.ts`, offered for the copy pass.

## What a green looks like

- At 390 and 360, the head's computed height is 102 at scroll 0 and at scroll 4,000, and no
  `Animation` or `ResizeObserver` is attached to it.
- The first contentful paint has the head and the first tile row, with JS disabled.
- With the sheet open at 800px, `elementFromPoint` over the sheet returns the sheet, not the rail.
- Typing a query at scrollY 3,000 lands result 1 directly under the head.
- The grid has three tracks below md, and a tile with `facts.length + combo > 3` renders exactly two
  facts and `+N`.
- On the empty collection, the strip renders `Cards · Proxies` and there is no `Proxies` GhostButton.
