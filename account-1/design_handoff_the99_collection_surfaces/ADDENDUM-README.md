# Collection surfaces — addendum, R2: the desktop strip, and row 2 at a long sort

Canvas: `The 99 - Collection Surfaces Addendum (R2).dc.html`. Open it in a browser with `support.js`
beside it. It is a design reference, not production code, at high fidelity: the coordinates,
breakpoints and width rules are final. Row widths are the audit's estimates; the canvas draws the R1
failure frames at those widths and notes where the rendered widths differ. No new tokens, assets or
copy.

This addendum answers audit B1 and B2
(`READINESS-audit.md`, PR #1169). It **supersedes** R1 in three places:

- §4 at desktop;
- §2's row-2 budget;
- §5's 768 frame and its 600 breakpoint.

Everything else in R1 stands, as do both rulings (P1, P2) and E1–E16. One clarification: E9's
values move to new widths (below).

Read at `main`: `src/app/collection/page.tsx`, `src/app/collection/sets/page.tsx`,
`src/components/decks/proxy-list-view.tsx`, `src/lib/collection/sort-options.ts`,
`src/lib/copy/{collection,deck-sort,set-collections,proxies}.ts`, `src/components/shell/nav.tsx`.

## Q1 · The strip at desktop: one title block, mounted on all three routes

- **The block.** A `CollectionPlaceHead` server component renders /collection's shipped title block
  and then the strip. The title block is `p-[28px_34px_0]`, the title at 30px, the stats line and
  Replace. The strip comes 14px under it, 40px tall, with its first tab at x = 34.
- **Where it mounts.** /collection, /collection/sets and /collection/proxies all render it first,
  including /collection's empty branch.
- **Same coordinates on every route.** The strip's top is y = 109 on all three and its first tab is
  at x = 34, so nothing moves when a reader presses a tab.
- **Fixed height.** The height comes from content alone: 28 + 45 + 4 + 18 + 14. Nothing is measured.
- **The stats line is identical everywhere.** It reads `{n} cards · {n} unique · last updated …`.
  Sets and Proxies already read `getCollectionStats`, and each adds the cached
  `getCollectionLastUpdated` read.
- **An empty collection keeps the line.** It reads `0 cards · 0 unique` rather than dropping it,
  because a missing line would move the strip by 22px.
- **Replace on an empty collection.** It is hidden. It is right-aligned and shorter than the text
  column, so hiding it moves nothing.
- **Headings.** Each route has exactly one h1, the route's own name: "Collection", "Your sets" and
  "What you're printing". On Sets and Proxies, the shared "Collection" title renders as a styled
  `<p>`, and the section name stays the h1 at the shipped 28px, directly under the strip. **E11
  holds as ratified.**
- **The columns are anchored left, not centred.** Sets and Proxies keep `max-w-[900px]`, but
  `mx-auto` becomes `mx-0` at `md`, with `md:px-[34px]` kept. The title, the first tab, the section
  h1 and the column content then share x = 34.
- **The breadcrumbs go,** as R1 drew: "Collection / Sets" and "Collection / Proxies".
  `/collection/sets/[code]` is unchanged.
- **The phone is unchanged** from R1 §4.

Rejected:

- **The strip above the title.** It would put place navigation over Replace and over /collection's
  title-and-stats block.
- **Centring /collection.** It breaks the wide row and the grid.
- **Keeping the columns centred.** Each section heading would land about 135px right of the tab
  that opened it, which is the audit's jump, made smaller.

## Q2 · Row 2 at 390 and 360 with a filter on and the longest sort

**Below 480px, row 2 visually hides the `Sort: ` prefix and the count's noun.** Both stay in the
accessible names: the trigger reads "Sort: Color · Colorless first" and the live region says
"212 results".

- **The prefix goes first.** The decklist's Sort trigger already ships bare
  (`deckSortCopy.triggerOne = order`), so there is precedent and no new copy.
- **The noun goes second.** R1 already hid it below 375. R2 moves that line to 480, so 390 and 360
  behave the same.
- **Not truncation.** Cutting from the end cuts the direction ("Colorless fi…"), which is the half
  that changes what the list shows.
- **Not the badge or the hairline.** Both are shared chassis parts, and once the shelf scrolls away
  the badge is the only filter state left.
- **Budget, using the audit's widths.** Filters with its badge is 93, the hairline 17, the trigger
  without its prefix 178, the gap 8, and the bare count 20. That makes **316**: 42px spare at 390
  and 12px at 360. A five-digit count is about 323, which still fits at 360.
- **A safety net.** The label keeps `min-width: 0` and an ellipsis for font fallback. No shipped
  order reaches it.
- **One width rule.** `max-[479px]` applies both hides, independent of the sort key, the filter
  state or any measurement.

## Q3 · Where the one-row head starts: 900px

**The worst case.** With the shipped trigger, the longest order, a filter badge and a four-digit
count, the controls take `8 + 93 + 17 + 210 + 8 + 86 + 8 + 88 = 518`. At 900 that leaves search:

- **288px** beside the 62px pointer rail;
- **262px** beside the 88px touch rail (desktop-nav-labels R1).

That is never less than the phone gives search at 390.

| Width | Head | Note |
|---|---|---|
| < 480 | 102, two rows | Row 2 hides the prefix and the noun (Q2). |
| 480 – 899 | 102, two rows | Full trigger and noun. The 768 frame is redrawn here: search is 578, and row 2 is about 401 of 674. R1's 600 breakpoint is withdrawn. |
| 900 – 999 | 60, one row | `min-[900px]`. |
| ≥ 1000 | Wide chassis | Unchanged. |

**E9 follows:** `scroll-padding-top` is 102 below 900 and 60 from 900 to 999.

## For /copy-review (no new strings)

- **Split `triggerOne` (`Sort: {order}`) into its prefix and `sortOrderLabel`,** so the prefix can
  be visually hidden. This joins E13's split of the count's noun.

## For the audit

- **Gap 1:** "Collection" on Sets and Proxies is a `<p>`, not a heading. If /a11y wants it to be the
  h1 and the section names to be h2s, E11 would need re-ruling. R2 keeps E11.
- **Gap 2:** the widths are the audit's estimates. The head PR's probe should assert three things:
  row 2's `scrollWidth ≤ clientWidth` at 360 with `?sort=color&dir=desc` and a filter on, the strip's
  `getBoundingClientRect().top` equal across all three routes at 1300, and its `left` equal across
  all three.
