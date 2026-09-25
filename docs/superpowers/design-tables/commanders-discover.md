# Design Property Table — Commanders / Discover Two Lanes

Source of truth: `design/design_handoff_the99_commanders_discover/` — `README.md`,
`STATES-filter-rack.md`, `CHROME-five-item-nav.md`, `READINESS.md`,
`commanders-discover · copy strings.ts`, `The 99 - Commanders and Discover.dc.html`.

Two destinations, not a toggle. `/commanders` = commanders you own and have not built
(148 rows in the canvas). `/discover` = commanders you do not own (3,301 rows).

**Column meaning.** *Mobile* = the 390px phone frames (E1–E6). *Desktop* = the 1180px
frames (A–D, I). The design's own rack breakpoint is **1024px**, driven by
`matchMedia('(min-width: 1024px)')` — it is **not** the repo's 640px `sm:`. Every row
below whose Mobile and Desktop values differ is a **1024px** difference unless the row
says otherwise.

> **Implementation erratum, 2026-09-14.** Every `1024px` in this table is the
> DESIGN's breakpoint and is left as drawn. The shipped rack switches at
> `CHASSIS_WIDE_MIN_PX = 1000` (`src/components/ui/filter-chassis.tsx`), so
> between 1000 and 1023 the inline rack is already mounted and there is no sheet
> to open — a divergence that predates this table and is documented at the
> constant and at `filter-rack.tsx`. Read every "below 1024px" row here as
> "below the chassis breakpoint". Noted once rather than edited into eleven rows,
> because the rows are a record of what Design specified.

`—` means the property is explicitly absent at that breakpoint. Properties the handoff
does not set are omitted rather than guessed.

---

## Component: Page header (desktop)

### Header container

| Property | Mobile | Desktop |
|---|---|---|
| display | — (see Phone title block) | flex |
| flex-direction | — | column |
| gap | — | 12px |
| padding | — | 16px 22px |
| border-bottom | — | 1px solid #211C16 |

### Title

| Property | Mobile | Desktop |
|---|---|---|
| font-family | Cinzel | Cinzel |
| font-size | 22px (phone title block) | 20px |
| font-weight | 700 | 700 |
| color | #EDE6D8 | #EDE6D8 |
| copy key | `commandersCopy.title` / `discoverCopy.title` | same |

### Subtitle

| Property | Mobile | Desktop |
|---|---|---|
| font-family | IBM Plex Mono | IBM Plex Mono |
| font-size | 10.5px | 11px |
| color | #8E8269 | #8E8269 |
| margin-top | 4px | — |
| copy key | `commandersCopy.subtitle` / `discoverCopy.subtitle` | same |

### Header CTA

| Property | Mobile | Desktop |
|---|---|---|
| rendering | — (neither lane has a header CTA) | — |

---

## Component: Filter rack (desktop container)

### Rack container

| Property | Mobile | Desktop |
|---|---|---|
| display | — (replaced by the persistent row + sheet) | flex |
| flex-direction | — | column |
| gap | — | 11px |
| padding | — | 14px 22px 12px |
| background | — | var(--surface-sunken) #171310 |
| border-bottom | — | 1px solid var(--border) #211C16 |
| position | — | static (never sticky) |

### Control row

| Property | Mobile | Desktop |
|---|---|---|
| display | — | flex |
| align-items | — | center |
| gap | — | 10px |
| flex-wrap | — | nowrap |
| order (owned) | — | search · pips+match · Build from · Order |
| order (discover) | — | Scope · search · pips+match · Order |

### Chip row

| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | center | center |
| gap | 7px | 7px |
| min-height (reserved) | 30px | 22px |
| flex-wrap | nowrap | nowrap |
| overflow | hidden (collapses to `+N`) | hidden (collapses to `+N`) |
| padding | 11px 16px 0 | — |

### Result line

| Property | Mobile | Desktop |
|---|---|---|
| font-family | IBM Plex Mono | IBM Plex Mono |
| font-size | 11px | 11.5px |
| color | #C6B79A | #C6B79A |
| font-variant-numeric | tabular-nums | tabular-nums |
| padding | 11px 16px 0 | — |
| aria-live | polite (the only live region on the lane) | polite |
| debounce | 300ms | 300ms |
| copy key | `*.result.rest(n)` / `*.result.filtered(shown,total)` | same |

### Result-line aside (Exactly mode)

| Property | Mobile | Desktop |
|---|---|---|
| rendering | appended to the same sentence, never a second line | same |
| color | #8E8269 | #8E8269 |
| copy key | `filterCopy.match.excludedAside(n)` | same |

---

## Component: Search field

### Field

| Property | Mobile | Desktop |
|---|---|---|
| width | 100% (flex:1 in the persistent row) | 300px |
| height | 44px | 34px |
| background | #100D0A | #100D0A |
| border | 1px solid #3A3229 | 1px solid #3A3229 |
| border-color (with a query) | #C9A24B | #C9A24B |
| border-radius | 10px | 8px |
| display | flex | flex |
| align-items | center | center |
| gap | 9px | 8px |
| padding | 0 12px | 0 10px |
| font-size | 16px (ships at 16 to clear the iOS zoom floor; canvas draws 13.5px) | 13px |
| color | #EDE6D8 | #EDE6D8 |
| placeholder color | #6E6654 | #6E6654 |
| copy key | `filterCopy.search.placeholder` | `filterCopy.search.placeholderWide` |
| in sheet | — (search stays on the persistent row, behind the backdrop) | — |

### Leading search icon (SVG)

| Property | Mobile | Desktop |
|---|---|---|
| width | 16 | 14 |
| height | 16 | 14 |
| viewBox | 0 0 20 20 | 0 0 20 20 |
| fill | none | none |
| stroke | currentColor | currentColor |
| stroke-width | 1.6 | 1.6 |
| stroke-linecap | round | round |
| circle | cx 9, cy 9, r 5.4 | cx 9, cy 9, r 5.4 |
| path d | `m13.2 13.2 3.3 3.3` | `m13.2 13.2 3.3 3.3` |
| color | #8E8269 | #8E8269 |

### Trailing clear disc

| Property | Mobile | Desktop |
|---|---|---|
| width | 22px | 18px |
| height | 22px | 18px |
| border-radius | 999px | 999px |
| background | #2A241D | #2A241D |
| display | flex | flex |
| align-items | center | center |
| justify-content | center | center |
| color | #C6B79A | #C6B79A |
| glyph | ✕ | ✕ |
| conditional rendering | only when the field is non-empty | only when non-empty |
| aria-label copy key | `filterCopy.search.clear` | `filterCopy.search.clear` |

---

## Component: Colour pip wrapper

### Wrapper

| Property | Mobile | Desktop |
|---|---|---|
| display | flex (sheet section) | flex |
| align-items | center | center |
| gap | 10px (sheet: pips only) | 10px |
| height | — (44px pips set the height) | 34px |
| padding | — | 0 4px 0 10px |
| background | — | #14110E |
| border | — | 1px solid #2A241D |
| border-color (any pip lit) | — | #C9A24B |
| border-radius | — | 9px |
| padding-right (before match) | — | 6px |

### Colour pip

| Property | Mobile | Desktop |
|---|---|---|
| width | 44px | 22px |
| height | 44px | 22px |
| border-radius | 11px | 6px |
| gap (between pips) | 8px | 5px |
| border (lit) | 2px solid #EDE6D8 | 1.5px solid #EDE6D8 |
| border (unlit) | 1px solid #3A3229 | 1px solid #3A3229 |
| opacity (unlit) | 0.4 (sheet) | .34 |
| opacity (lit) | 1 | 1 |
| fill | the hue's own swatch, full opacity when lit | same |
| aria-pressed | true when lit | true when lit |
| copy key (label) | `filterCopy.colour.names[w\|u\|b\|r\|g]` | same |
| legend copy key | `filterCopy.colour.legend` | `filterCopy.colour.legend` |

### Divider (before the match modifier)

| Property | Mobile | Desktop |
|---|---|---|
| width | — | 1px |
| height | — | 20px |
| background | — | #2A241D |

---

## Component: Colour match (Any / Exactly)

> **The group carries no padding of its own.** The table below specifies the segments'
> own `0 8px` and the 2px between them, and nothing else — the box's 10px either side
> belongs to the pip wrapper that contains both halves. The build had added a `pr-[6px]`
> to the modifier's group on top of that, which put 16px to the right of `Exactly`
> against 10px to the left of the first pip; measured in Chromium at 1300px it read 11
> and 17. Removed 2026-09-13 on Hugh's report, restoring what this component always
> specified. `scripts/probe-chassis-colour.mjs` measures the two gaps on both lanes.

### Segment

| Property | Mobile | Desktop |
|---|---|---|
| height | 44px (sheet pill) | 22px |
| border-radius | 999px (sheet pill) | 6px |
| padding | 0 16px | 0 8px |
| font-family | IBM Plex Sans | IBM Plex Mono |
| font-size | 13.5px | 10.5px |
| gap (between the two) | 8px | 2px |
| copy key (labels) | `filterCopy.match.any` / `.exactly` | `.anyShort` / `.exactlyShort` |
| legend copy key | `filterCopy.match.legend` | `filterCopy.match.legend` |

### Selected segment

| Property | Mobile | Desktop |
|---|---|---|
| background | rgba(201,162,75,.16) | #C9A24B |
| border | 1px solid #C9A24B | — |
| color | #EDE6D8 | #14110E |
| font-weight | 600 | 600 |

### Unselected segment

| Property | Mobile | Desktop |
|---|---|---|
| background | — | — |
| border | 1px solid #3A3229 | — |
| color | #C6B79A | #A89B84 |

### Greyed state (no pip lit)

| Property | Mobile | Desktop |
|---|---|---|
| color (both labels) | #6E6654 | #6E6654 |
| background (wrapper) | #171310 | #171310 |
| border (selected segment) | 1px solid #3A3229 — retained, so the value stays readable | 1px solid #3A3229 |
| hover fill | — (suppressed) | — (suppressed) |
| aria-disabled | true | true |
| focusable | yes (still in the tab order) | yes |
| explainer line | `filterCopy.match.disabledHint`, sheet only | — |

### Explainer line (sheet only)

| Property | Mobile | Desktop |
|---|---|---|
| font-family | IBM Plex Mono | — |
| font-size | 10.5px | — |
| color | #8E8269 | — |
| margin-top | 8px | — |
| line-height | 1.5 | — |

---

## Component: Build from (availability — owned lane only)

> **Errata, 2026-09-14 (ratified divergence).** The legend was `Score against`.
> Free mode now decides which commanders the lane LISTS as well as which cards
> every score is read against, so a name that spoke only of scoring was leaving
> its second job unsaid: a commander sitting in another deck's 99 read as free.
> `commandersCopy.availability.legend` is now `Build from`. The property rows
> below are unaffected — they reference copy by key — and the anti-collision rule
> against `Owned only` stands: still never shortened to `Availability`. One row
> is added to the group, `sleevedAside`, drawn on the rack's result line rather
> than on the control.

### Group

| Property | Mobile | Desktop |
|---|---|---|
| display | flex (sheet section) | flex |
| align-items | center | center |
| gap | — | 8px |
| conditional rendering | owned lane only; absent (not greyed) on discover | same |

### Legend

| Property | Mobile | Desktop |
|---|---|---|
| font-family | IBM Plex Mono | IBM Plex Mono |
| font-size | 10px | 10px |
| letter-spacing | .14em | .14em |
| text-transform | uppercase | uppercase |
| color | #8E8269 | #8E8269 |
| margin-bottom | 9px (sheet legend) | — |
| copy key | `commandersCopy.availability.legend` | same |

### Control

| Property | Mobile | Desktop |
|---|---|---|
| height | 44px per pill | 32px |
| border | 1px solid #3A3229 | 1px solid #3A3229 |
| border-color (off default) | #C9A24B | #C9A24B |
| border-radius | 999px (pills) | 8px |
| overflow | — | hidden |
| display | flex | flex |
| gap | 8px | 0 |

### Segment

| Property | Mobile | Desktop |
|---|---|---|
| padding | 0 16px | 0 11px |
| font-size | 13.5px | 12.5px |
| border-left | — | 1px solid #2E2822 (unselected) |
| background (selected) | rgba(201,162,75,.16) | #241F18 |
| color (selected) | #EDE6D8 | #EDE6D8 |
| color (unselected) | #C6B79A | #A89B84 |
| copy keys | `commandersCopy.availability.all` / `.free` | `.all` / `.freeShort` |

### Hint (sheet only)

| Property | Mobile | Desktop |
|---|---|---|
| font-family | IBM Plex Mono | — |
| font-size | 10.5px | — |
| color | #8E8269 | — |
| margin-top | 8px | — |
| line-height | 1.5 | — |
| copy key | `commandersCopy.availability.hint` | — |

---

## Component: Scope trigger (discover lane only)

### Trigger pill

| Property | Mobile | Desktop |
|---|---|---|
| height | — (sheet section instead) | 34px |
| padding | — | 0 12px |
| display | — | flex |
| align-items | — | center |
| gap | — | 7px |
| border-radius | — | 8px |
| border (Best fit) | — | 1px solid #3A3229 |
| border (Something new) | — | 1px solid #C9A24B |
| font-size | — | 12.5px |
| color | — | #EDE6D8 |
| conditional rendering | discover only; leads the rack | discover only; leads the rack |
| greyed | never — it always has a value | never |
| copy keys | `discoverCopy.scope.bestFit` / `.somethingNew` | same |

### Leading diamond

| Property | Mobile | Desktop |
|---|---|---|
| width | 8px (sheet option) | 7px |
| height | 8px | 7px |
| transform | rotate(45deg) | rotate(45deg) |
| background | #C9A24B when picked | #C9A24B |
| border | 1px solid #4A4033 when not picked | — |

### Caret

| Property | Mobile | Desktop |
|---|---|---|
| glyph | — | ▾ |
| color | — | #8E8269 |

### Sheet option row

| Property | Mobile | Desktop |
|---|---|---|
| min-height | 48px | — |
| padding | 9px 12px | — |
| border-radius | 10px | — |
| display | flex | — |
| align-items | center | — |
| gap | 11px | — |
| title font-size | 14px | — |
| title font-weight | 600 | — |
| gloss font-family | IBM Plex Mono | — |
| gloss font-size | 10.5px | — |
| gloss color | #A89B84 | — |
| gloss copy keys | `discoverCopy.scope.bestFitGloss` / `.somethingNewGloss` | — (glosses render in the sheet only) |
| legend copy key | `discoverCopy.scope.legend` | `discoverCopy.scope.legend` |

---

## Component: Order control

### Trigger pill (desktop)

| Property | Mobile | Desktop |
|---|---|---|
| height | 44px (icon button) | 32px |
| width | 44px (icon button) | auto |
| padding | 0 | 0 13px |
| gap | — | 7px |
| border-radius | 10px | 8px |
| border | 1px solid #3A3229 | 1px solid #3A3229 |
| border-color (off default) | #C9A24B | #C9A24B |
| font-size | — | 12.5px |
| color | #C6B79A | #C6B79A |
| color (off default) | #EDE6D8 | #EDE6D8 |
| caret | — | ▾ #8E8269 |
| copy key | — (icon only) | `filterCopy.order.trigger(label)` |
| legend copy key | `filterCopy.order.legend` (sheet) | `filterCopy.order.legend` |

### Order icon (phone, SVG)

| Property | Mobile | Desktop |
|---|---|---|
| width | 17 | — |
| height | 17 | — |
| stroke-width | 1.6 | — |
| path d | `M5 5h10M6.5 10h7M8.5 15h3` | — |
| color | #C6B79A | — |

### Order menu (desktop, I2)

| Property | Mobile | Desktop |
|---|---|---|
| width | — (sheet pills instead) | 280px |
| background | — | #1B1712 |
| border | — | 1px solid #3A3229 |
| border-radius | — | 10px |
| padding | — | 6px |
| box-shadow | — | 0 16px 40px rgba(0,0,0,.5) |
| behaviour | — | single-select, closes on pick |

### Order menu row

| Property | Mobile | Desktop |
|---|---|---|
| padding | — | 9px 11px |
| border-radius | — | 7px |
| display | — | flex |
| align-items | — | center |
| gap | — | 9px |
| background (selected) | — | #241F18 |
| marker (selected) | — | filled 7px brass diamond #C9A24B |
| label font-size | — | 13.5px |
| gloss font-family | — | IBM Plex Mono |
| gloss font-size | — | 10px |
| gloss color | — | #8E8269 |

### Sheet order pills

| Property | Mobile | Desktop |
|---|---|---|
| count (owned) | 3 — `commandersCopy.order.fit` / `.name` / `.added` | 3 |
| count (discover) | 3 — `discoverCopy.order.popularity` / `.name` / `.colour` | 3 |
| height | 44px | — |
| border-radius | 999px | — |
| padding | 0 16px | — |
| font-size | 13.5px | — |

---

## Component: Chip

### Chip

| Property | Mobile | Desktop |
|---|---|---|
| height | 30px | 22px |
| background | #241F18 | #241F18 |
| border | 1px solid #2A241D | 1px solid #2A241D |
| border-radius | 999px | 999px |
| font-family | IBM Plex Mono | IBM Plex Mono |
| font-size | 11px | 10.5px |
| color | #C6B79A | #C6B79A |
| padding | 0 11px | 0 9px |
| gap | 7px | 7px |
| display | flex | flex |
| align-items | center | center |
| conditional rendering | one per control that is off its default, in control order; never wraps, never scrolls | same |

### Chip dismiss glyph

| Property | Mobile | Desktop |
|---|---|---|
| glyph | ✕ | ✕ |
| color | #8E8269 | #8E8269 |

### Colour chip pip squares

| Property | Mobile | Desktop |
|---|---|---|
| width | 8px | 7px |
| height | 8px | 7px |
| border-radius | 2px | 2px |
| gap | 3px | 3px |
| position | leading, before the label | leading |
| label copy key | `filterCopy.colour.names[...]` joined, or `filterCopy.colour.collapsed(n)` past one pip on phone | joined names |

### Search chip

| Property | Mobile | Desktop |
|---|---|---|
| copy key | `filterCopy.chips.query(q)` | `filterCopy.chips.query(q)` |

### Overflow chip

| Property | Mobile | Desktop |
|---|---|---|
| background | #171310 | #171310 |
| border | 1px dashed #4A4033 | 1px dashed #4A4033 |
| font-family | IBM Plex Mono | IBM Plex Mono |
| dismiss glyph | — (no ✕) | — |
| action | opens the sheet | opens the sheet |
| copy key | `filterCopy.chips.overflow(n)` | same |

### Clear

| Property | Mobile | Desktop |
|---|---|---|
| font-family | IBM Plex Mono | IBM Plex Mono |
| font-size | 11px | 11px |
| color | #C9A24B | #C9A24B |
| color (nothing active) | #6E6654 | #6E6654 |
| border | — | — |
| padding | 0 6px | 0 4px |
| margin-left | auto (pinned right) | — |
| disabled | inert but present when nothing is active | inert but present |
| copy keys | `filterCopy.chips.clear` | `filterCopy.chips.clear`; empty-line text `filterCopy.chips.none` |

---

## Component: Phone persistent row

### Row

| Property | Mobile | Desktop |
|---|---|---|
| display | flex | — |
| align-items | center | — |
| gap | 8px | — |
| padding | 12px 16px 0 | — |
| children | search (flex:1) · order icon 44px · Filters 44px | — |
| position | static (never sticky) | — |

### Filters button

| Property | Mobile | Desktop |
|---|---|---|
| height | 44px | — |
| border | 1px solid #3A3229 | — |
| border-color (any control active) | #C9A24B | — |
| border-radius | 10px | — |
| padding | 0 13px; 0 11px when a badge shows | — |
| gap | 7px | — |
| font-size | 13.5px | — |
| copy key | `filterCopy.sheet.trigger` | — |

### Badge

| Property | Mobile | Desktop |
|---|---|---|
| font-family | IBM Plex Mono | — |
| font-size | 10.5px | — |
| font-weight | 600 | — |
| color | #14110E | — |
| background | #C9A24B | — |
| border-radius | 999px | — |
| padding | 1px 6px | — |
| counts | controls off default, not values | — |
| excludes | search and order | — |
| ceiling | 4 (owned) / 3 (discover) — no `9+` form | — |
| conditional rendering | absent at zero | — |

---

## Component: Filter sheet (phone only)

### Backdrop

| Property | Mobile | Desktop |
|---|---|---|
| background | rgba(16,13,10,.74) | — |
| dismiss | tap = same action as Esc, handle-drag and the primary | — |

### Sheet container

| Property | Mobile | Desktop |
|---|---|---|
| background | #1B1712 | — |
| border-radius | 22px 22px 0 0 | — |
| border-top | 1px solid #3A3229 | — |
| box-shadow | 0 -20px 50px rgba(0,0,0,.5) | — |
| max-height | 78vh | — |
| padding | 12px 16px 16px | — |
| display | flex | — |
| flex-direction | column | — |
| gap | 14px | — |
| a11y | rack and sheet are never both in the tree | — |

### Handle

| Property | Mobile | Desktop |
|---|---|---|
| width | 38px | — |
| height | 4px | — |
| border-radius | 2px | — |
| background | #3A3229 | — |
| align-self | center | — |

### Header

| Property | Mobile | Desktop |
|---|---|---|
| display | flex | — |
| align-items | center | — |
| justify-content | space-between | — |
| title font-family | Cinzel | — |
| title font-size | 18px | — |
| title font-weight | 600 | — |
| count font-family | IBM Plex Mono | — |
| count font-size | 11px | — |
| count color | #8E8269 | — |
| count updates | live, with the footer | — |
| title copy key | `filterCopy.sheet.title` | — |

### Section legend

| Property | Mobile | Desktop |
|---|---|---|
| font-family | IBM Plex Mono | — |
| font-size | 10px | — |
| letter-spacing | .14em | — |
| text-transform | uppercase | — |
| color | #8E8269 | — |
| margin-bottom | 9px | — |
| section order (owned) | Color identity · Color match · Build from · Order | — |
| section order (discover) | Scope · Color identity · Color match · Order | — |

### Option pill

| Property | Mobile | Desktop |
|---|---|---|
| height | 44px | — |
| border-radius | 999px | — |
| padding | 0 16px | — |
| font-size | 13.5px | — |
| border (selected) | 1px solid #C9A24B | — |
| background (selected) | rgba(201,162,75,.16) | — |
| color (selected) | #EDE6D8 | — |
| border (unselected) | 1px solid #3A3229 | — |
| color (unselected) | #C6B79A | — |
| background (greyed) | #171310 | — |
| color (greyed) | #6E6654 | — |
| behaviour | taps apply immediately; nothing is staged behind an Apply | — |

### Footer primary

| Property | Mobile | Desktop |
|---|---|---|
| height | 48px | — |
| background | #EDE6D8 | — |
| color | #14110E | — |
| font-size | 14px | — |
| font-weight | 600 | — |
| border-radius | 10px | — |
| action | dismiss only — it commits nothing | — |
| copy key | `filterCopy.sheet.dismiss(n)` | — |

### Footer Clear

| Property | Mobile | Desktop |
|---|---|---|
| height | 48px | — |
| font-size | 14px | — |
| color | #C9A24B | — |
| color (inert) | #6E6654 | — |
| copy key | `filterCopy.chips.clearAll` | — |

---

## Component: Commander row — owned lane

### Row container

| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| flex-direction | column (two bands) | row |
| align-items | — | flex-start |
| gap | 9px | 14px |
| padding | 12px 0 | 13px 22px |
| border-bottom | 1px solid #211C16 | 1px solid #211C16 |
| position | relative (art bleed) | relative |
| figure set | unchanged by filtering | unchanged by filtering |

### Art bleed

| Property | Mobile | Desktop |
|---|---|---|
| width | 268px (leading band) | 470px |
| mask-image | linear-gradient(90deg,#000 0,#000 46%,rgba(0,0,0,.5) 74%,transparent) | linear-gradient(90deg,#000 0,#000 42%,rgba(0,0,0,.5) 72%,transparent) |
| darkening overlay | linear-gradient(90deg, rgba(20,17,14,.26) 0px, .5 88px, .86 168px, 1 250px) | linear-gradient(90deg, rgba(20,17,14,.28) 0px, .42 108px, .78 220px, .94 336px, 1 452px) |
| replaces | the printing thumbnail | the printing thumbnail |

### Rank

| Property | Mobile | Desktop |
|---|---|---|
| width | — | 24px |
| font-family | IBM Plex Mono | IBM Plex Mono |
| font-size | 14px | 19px |
| color | #8E8269 | #C6B79A |
| font-variant-numeric | tabular-nums | tabular-nums |
| padding-top | — | 2px |
| gap (to diamond) | — | 6px |

### Rank diamond

| Property | Mobile | Desktop |
|---|---|---|
| width | — | 6px |
| height | — | 6px |
| transform | — | rotate(45deg) |
| background (rank 1) | — | #C9A24B |
| background (other ranks) | — | #3A3229 |

### Name

| Property | Mobile | Desktop |
|---|---|---|
| font-family | Cinzel | Cinzel |
| font-size | 15px | 17px |
| font-weight | 600 | 600 |
| color | #EDE6D8 | #EDE6D8 |

### Identity pips (row)

| Property | Mobile | Desktop |
|---|---|---|
| width | 8px | 9px |
| height | 8px | 9px |
| border-radius | 2px | 2px |
| gap | 4px | 3px |

### Content column

| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| flex-direction | column | column |
| gap | 9px | 9px |
| flex | 1 | 1 |

### Role chip

| Property | Mobile | Desktop |
|---|---|---|
| height | 22px | 22px |
| border-radius | 6px | 6px |
| background | rgba(36,31,24,.86) | rgba(36,31,24,.86) |
| border | 1px solid #2A241D | 1px solid #2A241D |
| padding | 0 9px | 0 9px |
| font-family | IBM Plex Mono | IBM Plex Mono |
| font-size | 10px | 10px |
| letter-spacing | .08em | .08em |
| color (label) | #8E8269 | #8E8269 |
| color (figure) | #EDE6D8 | #EDE6D8 |
| font-weight (figure) | 600 | 600 |
| margin-left (figure) | 5px | 5px |
| letter-spacing (figure) | 0 | 0 |
| count | 4 | 4 |
| gap | 6px | 7px |
| flex-wrap | wrap | wrap |
| copy key | `commandersCopy.row.roleCounter(label, have, target)` | same  **RETIRED 2026-09-13** — the key had no call site; the row it describes is drawn by the component directly. Do not implement against it. |

### Synergy row

| Property | Mobile | Desktop |
|---|---|---|
| display | flex (folded into `own N of top M`) | flex |
| align-items | — | center |
| gap | — | 11px |
| legend font-family | — | IBM Plex Mono |
| legend font-size | — | 10px |
| legend letter-spacing | — | .14em |
| legend color | — | #8E8269 |
| bar width | — | 148px |
| bar height | — | 5px |
| bar border-radius | — | 3px |
| bar track | — | #2A241D |
| bar fill | — | #C9A24B |
| figure font-family | IBM Plex Mono | IBM Plex Mono |
| figure font-size | 10.5px | 11px |
| figure color | #A89B84 | #A89B84 |
| copy key | `commandersCopy.row.ownOfTop(own, top)` | same  **RETIRED 2026-09-13** — the key had no call site; the row it describes is drawn by the component directly. Do not implement against it. |

### Availability line

| Property | Mobile | Desktop |
|---|---|---|
| font-family | IBM Plex Mono | IBM Plex Mono |
| font-size | 10.5px | 11.5px |
| color | #C6B79A | #C6B79A |
| in-use marker | ◆ in #C9A24B | ◆ in #C9A24B |
| copy keys | `commandersCopy.row.freeCards(n)` · `.alreadyInUse(n)` · `.cardsFit(n)` / `.cardsFitShort(n)` · `.freeCardsFit(n)` · `.inUse(n)` | same  **RETIRED 2026-09-13** — the key had no call site; the row it describes is drawn by the component directly. Do not implement against it. |

### Receipts line

| Property | Mobile | Desktop |
|---|---|---|
| font-family | — | IBM Plex Mono |
| font-size | — | 10.5px |
| color | — | #8E8269 (var(--fg-faint)) — never var(--fg-locked) |
| copy key | — | `commandersCopy.row.receipts(names, more)`  **RETIRED 2026-09-13** — the key had no call site; the row it describes is drawn by the component directly. Do not implement against it. |

### Fit block

| Property | Mobile | Desktop |
|---|---|---|
| width | — (right-aligned in band 1) | 206px |
| display | flex | flex |
| flex-direction | column | column |
| gap | 1px | 7px |
| align-items | flex-end | — |

### Fit figure

| Property | Mobile | Desktop |
|---|---|---|
| font-family | IBM Plex Mono | IBM Plex Mono |
| font-size | 20px | 27px |
| font-weight | 600 | 600 |
| color | #EDE6D8 | #EDE6D8 |
| line-height | 1 | 1 |
| font-variant-numeric | tabular-nums | tabular-nums |

### Fit denominator

| Property | Mobile | Desktop |
|---|---|---|
| font-family | IBM Plex Mono | IBM Plex Mono |
| font-size | 9px | 11px |
| letter-spacing | .1em | .08em |
| text-transform | uppercase | uppercase |
| color | #8E8269 | #8E8269 |
| align-items (with figure) | — | baseline |
| gap | — | 6px |
| copy key | `FIT` | `commandersCopy.row.fitDenominator` |

### Delta

| Property | Mobile | Desktop |
|---|---|---|
| font-family | IBM Plex Mono | IBM Plex Mono |
| font-size | 10px | 10.5px |
| color | #A89B84 | #A89B84 |
| copy key | `commandersCopy.row.delta(d, from)` | same  **RETIRED 2026-09-13** — the key had no call site; the row it describes is drawn by the component directly. Do not implement against it. |

### Split bar

| Property | Mobile | Desktop |
|---|---|---|
| height | 5px | 6px |
| border-radius | 3px | 3px |
| background | #2A241D | #2A241D |
| segments | 3 | 3 |
| segment colours | var(--accent-dim) #5E4A22 · var(--accent-mid) #9B7C36 · var(--accent) #C9A24B | same |

### Split legend

| Property | Mobile | Desktop |
|---|---|---|
| font-family | — | IBM Plex Mono |
| font-size | — | 9.5px |
| color | — | #8E8269 |
| swatch width | — | 7px |
| swatch height | — | 7px |
| swatch border-radius | — | 2px |
| gap | — | 11px (inner 4px) |
| copy key | — | `commandersCopy.row.splitLegend`  **RETIRED 2026-09-13** — the key had no call site; the row it describes is drawn by the component directly. Do not implement against it. |

### Row action

| Property | Mobile | Desktop |
|---|---|---|
| height | — | 32px |
| background | — | rgba(20,17,14,.5) |
| border-radius | — | 8px |
| copy key | — | `commandersCopy.row.action` **RETIRED 2026-09-14** — the pill was revealed on hover only, restated the destination the whole row already links to, and had no phone state; the discover lane had already dropped its equivalent. The key is deleted from `lanes.ts`. Do not implement against it. |
| note | the row itself is the action | the row itself is the action |

---

## Component: Commander row — discover lane

Shares art bleed, rank, name, identity pips and role chips with the owned row. Differences only:

### Right column

| Property | Mobile | Desktop |
|---|---|---|
| width | — (folded into band 1) | 246px |
| display | flex | flex |
| flex-direction | column | column |
| gap | 4px | 8px |

### Support count

| Property | Mobile | Desktop |
|---|---|---|
| font-family | IBM Plex Mono | IBM Plex Mono |
| font-size | 20px | 27px |
| font-weight | 600 | 600 |
| color | #EDE6D8 | #EDE6D8 |
| label font-size | 9px | 11px |
| label letter-spacing | .08em | — |
| label color | #8E8269 | #8E8269 |
| label text-transform | uppercase | uppercase |
| copy key | **retired** — `discoverCopy.row.supportOwned` was deleted with the row's count chip. See `discovery-rows.md`. |

### Ratio bar

| Property | Mobile | Desktop |
|---|---|---|
| height | 5px | 6px |
| border-radius | 3px | 3px |
| background | #2A241D | #2A241D |
| fill | #C9A24B, single segment | #C9A24B, single segment |
| segments | 1 — discovery does not blend, so there is no three-part ramp | 1 |

### Popularity line

| Property | Mobile | Desktop |
|---|---|---|
| font-family | IBM Plex Mono | IBM Plex Mono |
| font-size | 11.5px | 11.5px |
| color | `var(--fg-faint)` | `var(--fg-faint)` |
| copy key | `discoverCopy.row.popularity(n)` | same |

The **novelty count went with the composition.** `.novelty` was deleted; the mechanic gap line
replaced it, and it is a sentence rather than a figure — see `discovery-rows.md`.

### Not-owned line — RETIRED

`discoverCopy.row.notOwned` was deleted. Ruling D1: one component serves both lanes, so every
`/discover` row is unowned and every `/commanders` row is owned, and the line distinguished
nothing. The ownership pip's two readings and the accessible name's leading clause went with it.

### Absent on this lane

| Property | Mobile | Desktop |
|---|---|---|
| fit score (0–100) | — | — |
| delta | — | — |
| three-segment split bar + legend | — | — |
| availability receipt line | — | — |
| receipts line | — | — |

### Row action

| Property | Mobile | Desktop |
|---|---|---|
| copy key | — | `discoverCopy.row.action` |

---

## Component: Zero state

### Container

| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| flex-direction | column | column |
| align-items | center | center |
| padding | 40px 22px | 34px 22px 38px |

### Diamond trio

| Property | Mobile | Desktop |
|---|---|---|
| count | 3 | 3 |
| width | 10px | 10px |
| height | 10px | 10px |
| transform | rotate(45deg) | rotate(45deg) |
| border | 1px solid #3A3229 | 1px solid #3A3229 |
| gap | 7px | 7px |

### Heading

| Property | Mobile | Desktop |
|---|---|---|
| font-family | Cinzel | Cinzel |
| font-size | 19px | 19px |
| font-weight | 600 | 600 |
| color | #EDE6D8 | #EDE6D8 |
| copy key | `commandersCopy.empty.heading` / `discoverCopy.empty.heading` | same |

### Body

| Property | Mobile | Desktop |
|---|---|---|
| font-size | 13.5px | 13.5px |
| color | #A89B84 | #A89B84 |
| line-height | 1.6 | 1.6 |
| max-width | 520px | 520px |
| emphasis colour | #C6B79A | #C6B79A |
| emphasis when it names a control | IBM Plex Mono 12.5px | IBM Plex Mono 12.5px |
| copy keys (owned) | `commandersCopy.empty.bodyOneFix(name, control, n)` · `.bodyMode(q, control)` · `.bodyNoSingleFix` | same |
| copy key (discover) | `discoverCopy.empty.body(q, total)` | same |

### Button group

| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| flex-direction | column | row |
| gap | 9px | 9px |
| margin-top | 4px | 4px |

### Primary correction

| Property | Mobile | Desktop |
|---|---|---|
| height | 48px | 32px |
| width | 100% | auto |
| padding | — | 0 14px |
| background | #EDE6D8 | #EDE6D8 |
| color | #14110E | #14110E |
| border-radius | 8px | 8px |
| font-size | 12.5px | 12.5px |
| font-weight | 600 | 600 |
| conditional rendering | only when a single control fixes it | only when a single control fixes it |
| copy keys | `commandersCopy.empty.fixDrop(control)` / `.fixMode` / `discoverCopy.empty.clearSearch` | same |

### Secondary

| Property | Mobile | Desktop |
|---|---|---|
| height | 48px | 32px |
| width | 100% | auto |
| padding | — | 0 13px |
| border | 1px solid #3A3229 | 1px solid #3A3229 |
| color | #EDE6D8 | #EDE6D8 |
| copy keys | `filterCopy.chips.clearAll` (owned) / `discoverCopy.empty.otherLane` (discover) | same |

---

## Component: Five-item nav

### Item set

| Property | Mobile | Desktop |
|---|---|---|
| order | Home · Collection · Commanders · Discover · Decks | same |
| Discover href | /discover | /discover |
| lockable | Commanders and Discover are both lockable | same |
| isActive | unchanged | unchanged |

### Desktop rail

| Property | Mobile | Desktop |
|---|---|---|
| width | — | 62px |
| background | — | #100D0A |
| border-right | — | 1px solid #211C16 |
| padding | — | 14px 0 |
| gap | — | 4px |
| brand diamond | — | 26px |
| slot width/height | — | 38px |
| slot border-radius | — | 10px |
| slot background (active) | — | #241F18 |
| slot color (active) | — | #EDE6D8 |
| slot color (inactive) | — | #8E8269 |
| avatar | — | 30px circle, 1px solid #3A3229 on #1E1A15 |

### Phone tab bar

| Property | Mobile | Desktop |
|---|---|---|
| border-top | 1px solid #211C16 | — |
| background | #100D0A | — |
| padding | 8px 8px 14px | — |
| item flex | 1 | — |
| item height | 52px | — |
| item border-radius | 12px | — |
| item gap | 3px | — |
| color (active) | #EDE6D8 on #1B1712 | — |
| label font-family | IBM Plex Mono | — |
| label font-size | 9px; **8.5px below 360px** | — |
| label letter-spacing | .04em; **0 below 360px** | — |

### Nav icons (all five)

| Property | Mobile | Desktop |
|---|---|---|
| width | 19 (18 at 320px) | 19 |
| height | 19 (18 at 320px) | 19 |
| viewBox | 0 0 20 20 | 0 0 20 20 |
| fill | none | none |
| stroke | currentColor | currentColor |
| stroke-width | 1.5 | 1.5 |
| stroke-linecap | round | round |
| stroke-linejoin | round | round |

### Icon paths

| Icon | Geometry |
|---|---|
| Home | `M3 9.2 10 3.6l7 5.6V16a1 1 0 0 1-1 1h-3.5v-4.2h-5V17H4a1 1 0 0 1-1-1z` |
| Collection | four `<rect>` 5.8×5.8 rx 1.2 at (3.2,3.2) (11,3.2) (3.2,11) (11,11) |
| Commanders | `M3 14.5 4.4 6l3.2 3.6L10 4l2.4 5.6L15.6 6 17 14.5z` + `M3 16.6h14` |
| **Discover** | `<circle cx="10" cy="10" r="6.8">` + `M10 6.4 12.8 10 10 13.6 7.2 10z` |
| Decks | `<rect x="6.6" y="3.2" width="10" height="13" rx="1.6">` + `M4.2 5.4A1.6 1.6 0 0 0 3.4 6.8v8.6a1.6 1.6 0 0 0 1.6 1.6h8.2` |

### Width budget (from CHROME)

| Width | Bar minus padding | Per item | "Commanders" label | Clearance |
|---|---|---|---|---|
| 390px | 374 | 74.8 | 54.0 @ 9px | 10.4 |
| 375px | 359 | 71.8 | 54.0 @ 9px | 8.9 |
| 360px | 344 | 68.8 | 54.0 @ 9px | 7.4 |
| 320px | 304 | 60.8 | 51.0 @ 8.5px | 4.9 |

---

## Component: Printing thumbnail (I3 — contingency only)

### Thumb

| Property | Mobile | Desktop |
|---|---|---|
| width | — | 34px |
| height | — | 48px |
| border-radius | — | 3px |
| border | — | — (none) |
| box-shadow | — | 0 2px 10px rgba(0,0,0,.55) |
| margin-top | — | 2px |
| position | — | between rank and content |
| conditional rendering | only if a printing is named — never at rest on either lane | same |

### Printing line

| Property | Mobile | Desktop |
|---|---|---|
| font-family | — | IBM Plex Mono |
| font-size | — | 10.5px |
| color | — | #A89B84 |
| finish colour | — | #C6B79A |
| position | — | under the name |

---

## Component: Hover and focus states

### Colour pip — hover

| Property | Mobile | Desktop |
|---|---|---|
| opacity (unlit) | — (touch) | raised from .34 |

### Colour match — hover

| Property | Mobile | Desktop |
|---|---|---|
| fill (unselected, live) | — | tint toward #241F18 |
| fill (greyed) | — | — (suppressed) |

### Chip — hover

| Property | Mobile | Desktop |
|---|---|---|
| dismiss glyph colour | — | brightens from #8E8269 |

### Focus — all interactive controls

| Property | Mobile | Desktop |
|---|---|---|
| visible focus ring | required on every control, greyed ones included | required |
| tab order | rack order; the greyed colour-match stays focusable with `aria-disabled="true"` | same |
| sheet | focus is trapped; Esc dismisses and never reverts | — |

---

## Component: URL and state plumbing

| Property | Value |
|---|---|
| params | `q`, `c` (comma-joined), `m=any\|exact`, `a=all\|free` (owned only), `o` |
| defaults | serialised as absences |
| shared counter | one `activeControlCount(params, lane)` feeds badge, chip row and Clear |
| breakpoint switch | `matchMedia('(min-width: 1024px)')` — rack and sheet never both mounted |
| live region | one per screen: the result line |
| debounce | 300ms on the result line |

---

## State Coverage — Filter rack (six states × two lanes)

| State | Triggering condition | What renders | Key requirements |
|---|---|---|---|
| 1 · No filters — owned (canvas B) | No param set on `/commanders` | Empty placeholder-toned search; five pips at opacity .34; colour match **greyed**; Build from at `All my cards` hairline; Order at `Fit` hairline; chip line holds `filterCopy.chips.none`; Clear present and inert; result `commandersCopy.result.rest(148)` | Must **not** print `148 of 148`. Clear is present, not absent. Chip line still reserves 22px. |
| 1 · No filters — discover (canvas B-equivalent) | No param set on `/discover` | Scope leads at `Best fit`, hairline, no chip; no availability control at all; Order at `Popularity`; result `discoverCopy.result.rest(3301)` | Must **not** print `3,301 of 3,301`. Scope is never greyed and never empty. |
| 1 · No filters — phone (E1) | Same, below 1024px | Persistent row: search · order icon · `Filters` with **no badge**, all 44px; result line directly under the row | Badge absent at zero. Canvas E1 draws no chip line even though STATES reserves 30px — treat the reservation as authoritative. |
| 2 · Colour only — owned (D1) | ≥1 pip lit, nothing else off default | Two pips lit at 1.5px #EDE6D8; wrapper border brass; colour match now **live** at `Any` with `Any` filled; one colour chip (pip squares + names + ✕); result `filtered(31, 148)` | Un-lighting the last pip re-greys match and **keeps its value** — the chip goes, the mode does not reset. |
| 2 · Colour only — discover | Same on `/discover` | Identical shape; result `filtered(412, 3301)` | Same greying rule. |
| 2 · Colour only — phone | Same, below 1024px | One chip on the row; badge `1` | Two or more pips collapse to `filterCopy.colour.collapsed(n)` before the row runs out of width. |
| 3 · Colour + search — owned (D2) | Query non-empty AND ≥1 pip lit | Search filled, border brass, clear ✕ present; two chips in control order — `"druid"` then colour — then Clear; result `filtered(4, 148)` | Search must **not** gain a scope of its own; it narrows this lane in place. |
| 3 · Colour + search — discover (canvas C) | Same on `/discover`, four controls off default | Scope pill leads; brass search; two pips lit; `Exactly` brass; brass `Order · name`; four chips + Clear; result `filtered(7, 3301)` | Zero state's offer is spelling help or the other lane, never a different index. |
| 3 · Colour + search — phone (E2) | Same, below 1024px | Badge `2` (colour + availability) with two chips | Search is never counted in the badge — it lives on the persistent row, outside the sheet. |
| 4 · Exact mode — owned (D3) | `m=exact` with a colour lit; drawn as the five-control worst case (query, two pips, `Exactly`, `Free cards only`, `Name A–Z`) | All five controls carry their own brass border; five chips on one line; result `filtered(2,148)` + `filterCopy.match.excludedAside(6)` appended, aside in #8E8269 | The aside is appended to the **same sentence**, not a second line, and renders only when `Exactly` is active **and** the counts differ. |
| 4 · Exact mode — discover | Same on `/discover` | Four controls (no availability), so four chips | Same aside rule. |
| 4 · Exact mode — phone | Same, below 1024px | Fifth chip collapses: two chips + `+3` + Clear; badge `4` (owned) or `3` (discover) | Badge counts controls off default, not values; ceiling is the control count, so no `9+`. |
| 5 · Sheet open — owned (E3) | `Filters` tapped below 1024px on `/commanders` | Sections in rack order: Colour identity (44px pips) · Colour match (two 44px pills) · Build from (two 44px pills + mono explainer) · Order (three 44px pills); footer filled `filterCopy.sheet.dismiss(4)` + `Clear` | Search is **not** in the sheet. Taps apply immediately; header count and footer label both update live; the primary only dismisses. |
| 5 · Sheet open — discover (E4) | Same on `/discover` | Four sections, **Scope first**, carrying both glosses; colour match greyed **with** `filterCopy.match.disabledHint`; footer `Show 3,301 commanders`, `Clear` inert at #6E6654 | The sheet is the only place the scope glosses render. Must **not** stage changes behind an Apply or become a centred dialog at any width. Esc, handle-drag, backdrop tap and the primary are the same action; **Esc never reverts**. |
| 6 · Filtered to zero — owned (D4) | Any filter combination yielding 0 rows on `/commanders` | Rack unchanged; result `filtered(0, 148)`; below it three diamonds, `commandersCopy.empty.heading`, one sentence naming the control, a filled specific correction (`fixDrop`/`fixMode`) and a hairline `Clear all filters` | The correction is the **single control whose removal yields the most rows**; ties break toward the most recently changed control. Where no single control fixes it, render `bodyNoSingleFix` and only `Clear all filters`. |
| 6 · Filtered to zero — discover (D5) | Same on `/discover` | Result `filtered(0, 3301)`; heading `discoverCopy.empty.heading`; body carries the lane boundary via `discoverCopy.empty.body(q, total)`; second button `discoverCopy.empty.otherLane` — same query, other lane; colour match greyed (both labels #6E6654, wrapper 1px #2A241D) | Must **not** hide, disable or collapse the rack. |
| 6 · Filtered to zero — phone (E5) | Same, below 1024px | Five controls active with chip overflow: two chips + `+3` + Clear pinned right; badge `4`; result `0 of 148`; buttons stack full-width at 48px | Rack controls remain the way out of a zero result. |

## State Coverage — Colour match control

| State | Triggering condition | What renders | Key requirements |
|---|---|---|---|
| Live | ≥1 pip lit | Selected segment brass-filled with #14110E 600 label; unselected #A89B84 | Hover tints the unselected segment. |
| Greyed | No pip lit | Both labels #6E6654; wrapper #171310; **selected segment keeps its 1px #3A3229 outline** so the value stays readable | `aria-disabled="true"`, still focusable, still in the tab order; no hover fill. Greying is the only degradation — the control is never removed. |
| Greyed, sheet | No pip lit, sheet open | Same plus `filterCopy.match.disabledHint` explainer line | The desktop rack says this with geometry, not words — the hint is sheet-only. |

## State Coverage — Chip row

| State | Triggering condition | What renders | Key requirements |
|---|---|---|---|
| Empty | Nothing off default | `filterCopy.chips.none` in #6E6654 plus an inert Clear (desktop); reserved height only (phone) | Height is reserved either way so the first chip never pushes the list. |
| Populated | ≥1 control off default | One chip per off-default control, in control order, then Clear | Never wraps, never scrolls. |
| Overflowing | Chips exceed the available width | Leading chips + one dashed `filterCopy.chips.overflow(n)` chip + Clear (pinned right on phone) | The overflow chip opens the sheet and carries no ✕. |

## State Coverage — Filters badge (phone)

| State | Triggering condition | What renders | Key requirements |
|---|---|---|---|
| Absent | 0 controls off default | No badge; `Filters` padding 0 13px; border #3A3229 | — |
| Present | ≥1 control off default (search and order excluded) | Brass badge with the count; `Filters` padding 0 11px; border #C9A24B | Counts controls, not values — two lit pips are one control. Ceiling 4 (owned) / 3 (discover); no `9+`. |

## State Coverage — Lane-level structure

| State | Triggering condition | What renders | Key requirements |
|---|---|---|---|
| Owned lane, any state | Route `/commanders` | Search · pips · colour match · Build from · Order; rows print the play-style sentence, the mechanic gap line, then Fit and the deck count. **No price** — every commander here is owned, and §7.4 row 5 unmounts the slot. | Scope control is **absent**, not greyed — the lane is the scope. The delta, the three-segment ramp, the availability line and the receipts all retired with `RecCard`. |
| Discover lane, any state | Route `/discover` | Scope (leading) · search · pips · colour match · Order; rows print the play-style sentence, the mechanic gap line, then Fit, the deck count and the price | Availability is **absent**, not greyed. The two lanes now draw ONE row component, so the old "discovery does not blend" note is gone with it: both print Fit, and it is the same figure Commander Details prints. |
| Any state, either lane | — | No printing thumbnail at rest at either breakpoint; the art bleed is the card image | I3 applies only if a printing is ever named. |
| Any state, either lane | — | No header CTA; the row is the action | `Clear` and the zero state's correction are the only buttons around the list. |
| Filtered row vs unfiltered row | Any filter active | Identical figure set | Filtering never trims a row to fit. |
| Rack, all twelve cells | — | Present, in place, in one order | Never collapses, never reorders, never sticky, and does not change height when results change. |

---

## Ambiguities and open calls

1. **Reading order.** Canvas D2 puts search leading; frame I1 draws the trailing variant (order/availability lead, search at the trailing edge). The handoff records this as an Amber decision, undecided.
2. **Discover's third order option.** `Colour` (drawn, and the key shipped in `discoverCopy.order.colour`) vs `Recently released` (named in the spec). Undecided.
3. **Breakpoint.** The design's own switch is 1024px via `matchMedia`; the repo's Tailwind `sm:` is 640px. Every Mobile/Desktop split above is a 1024px split.
4. **Phone thumbnail.** README's "Row — phone" prose mentions a 32×45 thumb, contradicting the explicit no-thumbnail-at-rest rule, the STATES invariant and the phone frames, which draw none. The no-thumbnail rule wins.
5. **Phone availability line.** E1 draws `727 free · ◆ 447 in use`; E2 draws `61 free cards fit`. Both copy keys exist; which one the phone row uses at rest is not stated.
6. **Chip line on E1.** STATES says the chip line reserves 30px in every state; E1 draws no chip line. Reservation treated as authoritative.
7. **Readiness is Amber**, coupled to the refresh, with three Red blockers (spec file absent; `filter-bar.tsx` / `facet-strip.tsx` / `discovery-row.tsx` absent; the owned-and-built commander appears on neither lane). Per the handoff, if the component files disagree with the canvas, **the component files win**.
8. **Not covered by the handoff:** real mana symbols, pre-refresh nav, the discover→owned transition, loading/skeleton states, keyboard-walk frames, theme rendering.
