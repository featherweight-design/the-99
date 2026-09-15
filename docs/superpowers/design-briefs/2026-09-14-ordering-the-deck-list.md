# Design Brief — Ordering the deck list

**Workshop:** 2026-09-14, Hugh + agent. No ticket. This brief is the source of truth the Claude
Design handoff prompt points at.

**Verified against `origin/main` at `6d5aa90c` on 2026-09-14.** Every `file:line` below was read on
that commit, not recalled.

A deck's own list is the one long list in this app a reader cannot order. `/collection`, `/decks`,
`/commanders` and `/discover` each ship a sort control; the deck page's `Your deck` tab has none.
Under `All` it groups by type or role and sorts alphabetically inside each group
(`src/lib/decks/grouping.ts:210`, `:227`). Under `Shopping` it sorts by price, dearest first, as of
PR #629 (`src/components/decks/decklist.tsx:355-367`) — fixed, with nothing on screen to change it.
Hugh asked for three orders on both — name, price, mana value, each reversible.

Most of that is settled by grammar this app already ships. **One thing is not, and it is the only
reason this brief exists: where the control goes.** The toolbar it would join already carries six
controls at 390px and already wraps.

---

## §1 The surface, as it stands

`GroupToggle` (`src/components/decks/group-toggle.tsx`) is the deck list's toolbar — one
`flex-wrap` row, `gap-[7px]` at phone and `gap-[10px]` above `md:` (`:104`), inside a container
padded `16px/9px` at phone and `26px/14px/10px` on desktop (`:99`).

What that row holds today, in order. The spacer is layout rather than a control; the count that
matters for placement is the interactive one, and it differs by filter:

| Control | Line | Present when |
|---|---|---|
| `All N` filter pill | `:113` | always |
| `Shopping N` filter pill | `:127` | always |
| flexible spacer | `:139` | always |
| the draft's note (`n of these differ from vN`, `deck-versioning.ts:104-105`) | `:149` | a draft exists; `hidden md:inline` |
| `Keep all N` + `Clear all auto · N` | `:156` | the deck has auto cards |
| `By type` | `:174` | always |
| `By role` | `:187` | always |
| list/card view toggle | `:199` | **`All` only** — absent under `Shopping` |

Under `Shopping` the price strip renders below that row, inside the same container
(`group-toggle.tsx:211`): provenance on the left, total and `n of m priced` on the right, with
`Buy these at Mana Pool ↗` beneath.

**Interactive controls, by filter.** Under `All`: two filter pills, two grouping pills, the view
toggle, and the two bulk auto controls when the deck has auto cards — five or seven. Under
`Shopping`: the same without the view toggle — four or six. The comment at `:100` records why the
row wraps at all: at 390px it already carries two filter pills, two bulk auto controls and two
grouping pills, and without `flex-wrap` the last of them is pushed off the edge.

## §2 What is decided, and not open

Seven rulings from the 2026-09-14 workshop. Design owns the placement question in §4, not these.

1. **Three keys: Name, Price, Mana value.** "Mana value" is this app's term — `Cheapest to cast`
   on the Consider panel is the only mana-value ordering shipped today
   (`src/components/decks/consider-panel.tsx:119`) and it means mana value, not money, which is
   exactly the ambiguity the word "cost" introduces here.
2. **Direction is re-pick, not a toggle.** `/collection` ruled this and wrote the reasoning down:
   picking a different key adopts that key's natural direction, picking the chosen key reverses it,
   and a separate asc/desc affordance "would sit in the filter row doing nothing four times out of
   five" (`src/lib/collection/sort-options.ts:69-73`). The deck list follows it. No new affordance.
3. **Each key names its own two directions.** Again `/collection`'s rule
   (`sort-options.ts:37-44`): "A–Z" says more than "ascending" for a name and nothing at all for a
   rarity. Only the chosen row carries a direction hint, because an unchosen row has no direction
   yet (`sort-options.ts:59-66`, the hint at `:63`).
4. **Price is offered under `Shopping` only.** Every deck card carries a price fact server-side —
   `loadPrices` is called with every `detail.cards` oracle id and `withPrice` attaches it to all of
   them (`src/app/decks/[id]/page.tsx:186`, `:201-204`) — so a price order under `All` would be
   real. But `All` rows draw no figure, so the reader would be handed an order nothing on the page
   confirms. Name and Mana value are offered in both filters.
5. **Sorting happens inside the grouping, which stays.** `By type` / `By role` continue to decide
   the sections; the sort decides the rows within each. This is where the Shopping list's price
   order already lives (`decklist.tsx:366`), and `All` groups the same way (`:232`).
6. **Switching to `All` with Price chosen falls back, and remembers.** `All` draws that view in its
   own default order — `Name · A–Z` — and returning to `Shopping` restores `Price`. The two
   alternatives were rejected: keeping `Price` selected under `All` leaves the trigger naming an
   order the list is not in, and discarding it makes the filter pills silently reset a choice the
   reader made about a different list. The state is one sort per filter, which is also what makes
   rule 4 cost the reader nothing. Design owns how the trigger reads under `All` while a remembered
   `Price` is parked behind it, not whether it is remembered.
7. **The existing Shopping price order becomes the `Price · Dearest` default**, not a second
   mechanism. It shipped 2026-09-14 (PR #629) with its own rules: rank on the figure the row draws,
   rows with no live figure last and equal to each other, name then id as the tiebreak
   (`src/lib/decks/price.ts:168-190`).

## §3 The control this should be

`/collection`'s `Sort ▾` is `FilterPanel` in `selectionMode="single"`
(`src/components/collection/filter-bar.tsx:242-267`) — a popover above the breakpoint, a sheet
below, `desktopRowMinPx={44}`, `widthPx={260}`, no counts, no search, no footer. Its copy block is
`collectionFilterCopy.sort` (`src/lib/copy/collection.ts:328-360`): `Sort` as the trigger,
`Sort: {order}` once chosen, `Sort by` as the sheet title, `Current` as the chosen group.

The deck list should use that component and that shape rather than a fourth menu implementation.
There are already three near-identical ones — `deck-sort-menu.tsx`, `commanders/coverage-sort.tsx`,
`commanders/rack/select.tsx` — plus a native `<select>` on the Consider toolbar
(`consider-toolbar.tsx:23`). Nothing here asks for a fifth.

## §4 Open for Design to call

**4.1 Where the trigger sits, at both widths.** This is the whole question. The row is described in
§1; at 390px with a filled deck it already wraps at seven controls under `All` and six under
`Shopping`, and one more has to land somewhere that does not push `By role` onto a line of its own. Candidate hosts, none of them ruled:

- the trailing edge of the pill row, after `By role`, where the view toggle sits under `All`;
- the row's leading edge, before `All N`;
- beside the price strip under `Shopping` — but the strip is absent under `All`, so the control
  would move between filters, which is worse than either fixed position;
- its own line below the pill row.

**4.2 The phone form.** `FilterPanel`'s compact form is a labelled trigger. The filter chassis
ships a 44px icon-only trigger at phone via `iconOnly={!wide}` on two routes
(`commanders/rack/filter-rack.tsx`). Which one this surface takes is Design's, and it decides
whether the row gains ~90px or ~44px at the width where it is already tight.

**4.3 Whether the trigger states the current order.** `/collection`'s reads `Sort: Name · A–Z`.
At 390px on this row that is a long trigger. `Sort` alone plus the order stated inside the panel is
the alternative, at the cost of the order being invisible until opened.

**4.4 What happens to the view toggle.** It is `All`-only today (`group-toggle.tsx:199`), so under
`All` the row would carry both it and the sort trigger. If they cannot both sit at the trailing
edge at 390px, Design says which yields.

**4.5 The chassis question, stated so it is not mistaken for settled.** The filter-chassis handoff's
decision 11 puts sort "in the chassis, in a separated trailing slot past a hairline, on every route
and at both widths" (`design/design_handoff_the99_filter_chassis/README.md:140`). The deck detail
list has no chassis — it is not one of the four filtered routes — so that ruling does not reach this
surface. Design should decide whether the deck list's sort should nevertheless read as the same
control in a different frame, or as a member of this toolbar's own pill vocabulary.

## §5 Copy this needs

One new copy block, shaped like `collectionFilterCopy.sort`, with three keys' direction pairs. The
wording is Design's to set; the workshop's straw man, for the shape only:

| Key | Ascending reads | Descending reads |
|---|---|---|
| Name | `A–Z` | `Z–A` |
| Price | `Cheapest` | `Dearest` |
| Mana value | `Curve up` | `Curve down` |

`Curve up` / `Curve down` are **shortened proposals, not shipped strings.** The app's nearest
vocabulary is `deckVersioningCopy.changed`, which ships the full sentences `the curve goes up` and
`the curve comes down` (`src/lib/copy/deck-versioning.ts:440-441`) — too long for a sort row, which
is why the straw man shortens them. Whether the short forms read, or whether a sort row wants
different words entirely, is Design's call.

## §6 Not in scope

- No change to what a row draws. If price is ever to be sortable under `All`, the `All` row needs a
  figure first, and that is its own brief.
- No flat, ungrouped list. `By type` / `By role` stay the only grouping answers.
- No sort persistence decision here beyond noting the precedent: `/decks` remembers its sort in
  `localStorage` under `the99:decks:sort` (`src/lib/decks/sort.ts:24`), `/collection` mirrors sort
  to the URL and does not persist it, and the deck page's view toggle persists under
  `the99:deck-view` (`group-toggle.tsx:16`). Eng will follow whichever the placement implies.
