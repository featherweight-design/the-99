# Gap report — UI refresh, Decks index

**Design table:** `docs/superpowers/design-tables/ui-refresh-decks.md`
**Plan:** `docs/superpowers/plans/2026-09-07-ui-refresh-home-decks.md` (Tasks 9–13)
**Branch:** `feat/refresh-decks`
**Date:** 2026-09-07
**Verdict:** 0 gaps remain. Confirmation pass clean.

The design-review skill ran in its three passes: enumerate (the committed
property table), verify (against the implementation), confirm (against the
gap list below). This document records what the verify pass found, what was
fixed, and what was deliberately left as drawn.

---

## Fixed

### Visual

1. **Filter footer summary at both extremes** — `deck-filter-column.tsx`.
   Ticking all six statuses said `6 statuses on`, which claims a narrowing the
   grid has not made. Both zero ticked and all six ticked now read
   `all statuses on`; the count appears only in between.

2. **Filter column `Clear` was conditional** — `deck-filter-column.tsx`. It
   appeared the moment a filter went on, which moves the footer under the
   reader's cursor mid-click. Now drawn at every state, with the table's
   geometry: 32px tall, 8px radius, 1px `var(--border-strong)`, transparent
   ground, 13px padding, 12.5px `var(--fg)`.

3. **Filter sheet `Clear` was conditional** — `deck-filter-sheet.tsx`. Same
   fix, same reason.

4. **Chip row could stack on the zero state** — `decks-view.tsx`. Arriving at
   `/decks?status=Draft` with no decks at all drew a row of removable filter
   chips above a zero state that offers no filters. Now gated on `!zero`
   alongside the filter controls.

5. **Sort menu separator colour** — `deck-sort-menu.tsx`. `var(--border)`
   where the table draws `var(--elevated)`.

6–12. **Overflow panel geometry** — `deck-card-overflow.tsx`. The panel was a
   `min-w-[180px]` box with a generic `shadow-lg` and inline `style` colours,
   holding inset rows. The table draws the same menu `DeckSortMenu` draws:
   186px wide, 10px radius, 1px `var(--border-strong)`, `var(--surface)`,
   `0 22px 50px rgba(0,0,0,0.6)`, corners clipped; rows 38px and flush,
   divided by a `var(--elevated)` hairline with the first row's suppressed,
   hovering to `var(--elevated)`. The inline colours also had a live
   consequence beyond fidelity — an inline background outranks the `hover:`
   utility beside it, so the rows never highlighted.

### Correctness, found by the verify pass rather than by the table

13. **SSR crash risk** — `decks-view.tsx` seeded its filter state from
    `new URLSearchParams(window.location.search)` inside a `useState` lazy
    initializer, which runs during the server render, where `window` does not
    exist. Now `useSearchParams()`, the pattern `commanders-view.tsx` and
    `discovery-view.tsx` already use; every later read stays in a callback,
    where `window` is safe.

### State reachability

14. **The in-use-elsewhere clause was unreachable.** The table gives
    `DeckTile` a cross-cutting state — `inUseElsewhere > 0` renders
    `decks.detailInUseElsewhere(n)` in the detail slot in `var(--accent)` —
    and nothing in the stack could produce the number. `DeckListItem` had no
    such field.

    The naive shape is one `loadAvailability(userId, { excludeDeckId })` per
    tile, which is a round trip per deck on a list page. It is not needed:
    a single unscoped `loadAvailability` already returns, for every card, the
    `claims` naming every deck that holds it. `src/lib/decks/in-use-elsewhere.ts`
    derives the whole grid's counts from one pass over that map, and
    `listDecksWithStats` runs it in parallel with the list query, tolerating
    failure (`.catch(() => null)` → zeros) because a missing clause is not
    worth a 500 on the deck list. It is opt-in — `{ includeInUseElsewhere }`,
    passed only by `/decks` — because the builder page calls the same reader
    for deck *names* and has no use for a whole-collection aggregation.

    The vocabulary is `receiptCountsByCommander`'s, deliberately: a card is
    "in use" only when a **finished** deck has sleeved it **and** the supply is
    spent. A card an unfinished brew merely lists is still in the box, and a
    card you own three of and lent out one of is not a conflict.

### Found by the browser pass

15. **The phone filter sheet sat under the tab bar.** The sheet's overlay was
    `z-40`; the phone tab bar is also `z-40` and paints later, so the bar
    covered the sheet's footer and `Clear` could not be clicked at all. Every
    other modal surface in the repo is `z-50` — the sheet was the outlier.
    Fixed in `deck-filter-sheet.tsx`, with a unit test on the class, because
    only a laid-out page can show the stacking and jsdom never will.

    This is what `scripts/probe-refresh-decks.mjs` is for. It signs in with
    Playwright, reads one tile's computed grid areas at 1300 and 390, and runs
    the filter round trip — tick, reload, clear — at both. Both legs now report
    `?status=Draft` → 1 tile → a reload that paints filtered on the first
    frame → an empty URL after Clear. Grid areas read
    `"pips label count" / "bar bar bar" / "detail . played"` on desktop and
    `"pips detail count" / "bar bar bar"` on the phone, which is the table.

---

## Deliberately not fixed

- **Phone action row at the zero state** — the table draws the `New deck` /
  `Import` pair above the grid on a phone, and the zero state carries its own.
  README decision 6 and table ambiguity #4 both leave the populated-state row
  to the desktop column. Left as drawn.

- **`Update from a list` is conditional on `built > 0`** — the table lists it
  unconditionally. #277 state 3 rules that a deck with nothing in it has
  nothing to diff, so the entry is absent rather than disabled. Left as
  shipped; the design-review item is the table being silent, not the code
  being wrong.

- **Sheet chip fill is a flat 15%** — the table draws a range. Ambiguity #8
  says the drawn hex values are illustrative; 15% sits inside the range.

- **A Draft older than its creation day has no detail figure** — the copy file
  gives Draft only the literal `created today`. Plan line 1756 rules that an
  older Draft falls back to no figure rather than being told a date it does
  not have. (This is now also the slot the in-use-elsewhere clause can fill.)

- **`src/app/decks/loading.tsx` was not re-passed** — table line 1442 records
  the route's loading state as an open readiness item, not a specified one.

---

## One question for Design

The table says the in-use-elsewhere clause renders **"in place of the ordinary
detail figure"**. Read literally, a deck with `4 over` or `3 lines unresolved`
would have that figure replaced by `3 in use elsewhere`.

We shipped the narrower reading: the clause fills the detail slot **only where
the status has nothing to say in it** — Building, and a Draft older than its
creation day. The reasoning is that the status figure is a fact about the deck
the reader opened the tile for, and the clause is a fact about the collection;
hiding a warning behind an inventory note seemed the wrong trade to make
silently.

Not a blocker. If Design intends the literal reading, it is a one-line change
in `detailFor`.
