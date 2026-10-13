# Design Property Table — Collection Filter Panel

Enumerated from the handoff at `design/design_handoff_the99_collection_filter/`:

- `README.md` — decisions log, component notes (token references), engineering notes, gap report.
- `READINESS.md` — 🟡 Yellow verdict, R1, 2026-07-27.
- `The 99 - Collection · Filter Panel.dc.html` — the canvas; all pixel values below are read
  from its inline styles.
- `collection-filter · copy strings.ts` — final copy, keyed for `src/lib/copy/collection.ts`.
- `brand/README.md` — locked brand sheet (Palette A · Table Candlelight), type scale, radii.

Scope: **only** the `Set ▾` control in the collection filter bar. The bar, the chip row, the
result list, the card modal and the replace flow are all reused unchanged. `Type ▾` and `Sort ▾`
are drawn but are explicitly follow-up work.

## Two things to get right before writing any code

**1. The breakpoint is 768px (`md:`), not 640px.** The design states this three times and never
says 640:

- README states delivered: "Mobile (<768px) and desktop (≥768px) frames exist for states 1–6".
- Decision 1: "anchored popover on desktop, **bottom sheet under 768px**".
- Engineering notes: "Renders popover ≥768px and sheet below via one
  `matchMedia('(min-width: 768px)')` hook".
- Canvas: the sheet card is titled "Sheet — under 768px"; the anatomy card is titled
  "Popover — desktop".

Tailwind's `sm:` is 640px. The correct prefix here is `md:` — and for the mount decision itself,
a JS media-query hook, not a CSS prefix (see below).

**2. Exactly one of popover/sheet is mounted at a time.** From the engineering notes, verbatim:

> Renders popover ≥768px and sheet below via one `matchMedia('(min-width: 768px)')` hook;
> **do not** render both and hide one — the sheet is `aria-modal` and a hidden duplicate listbox
> breaks the accessibility tree.

So the usual "render both, `hidden md:flex` / `md:hidden`" parity pattern is forbidden for this
component. `aria-modal="true"` on a mounted-but-CSS-hidden sheet removes the rest of the page
from the accessibility tree, and two `ul[role=listbox][aria-multiselectable]` nodes with the same
`id`/`aria-controls` target make `aria-activedescendant` ambiguous. One mount, chosen at runtime.

---

## Token mapping

The handoff states: theme-aware values come from `src/app/globals.css` `var(--*)`; "the hexes
above are Palette A values for theme-independent reference only. **No new token is introduced.**"
Named tokens are those in `brand/README.md`.

| Hex | Named token | Notes / usage in this component |
|---|---|---|
| `#14110E` | `base` | Checkbox interior fill; check-glyph and pip/`Done` text on brass |
| `#1E1A15` | `surface` | Not used by the panel itself (the shipped result rows use it) |
| `#2A241D` | `elevated` | Trigger fill, chip fill, footer top border, close-button fill, clear-`✕` circle |
| `#3A3229` | `line` | Panel border, search-field border, sheet top border, drag handle, empty-state diamonds, secondary-button border, disabled checkbox border |
| `#EDE6D8` | `primary` | Trigger label, option name, sheet title, empty-state heading, chip label |
| `#C6B79A` | `secondary` | Count on a **selected** row; the query echoed inside empty-state body |
| `#A89B84` | `muted` | Empty-state body, disabled option name, close-`✕` glyph, clear-`✕` glyph |
| `#8E8269` | `faint` | Group label, count on unselected rows, footer left text, leading `⌕`, chip `✕` |
| `#C9A24B` | `accent` | Focus ring, active border, checked box, check glyph bg, `Clear` (active), `Done` fill, count pip, `Clear all` |
| `#D8B25E` | `accent-hover` | Brand-level hover on accent — **not exercised anywhere in this canvas** |
| `#1A160F` | **no named token** | The panel body background (popover and sheet). Sits *between* `base #14110E` and `surface #1E1A15`; it is neither. Also the background of every documentation card on the canvas. |
| `#181410` | **no named token** | Search-field interior fill (shared with the shipped collection search field per `text-field.tsx`) |
| `#221D16` | **no named token** | Option-row hover fill; sheet close-button fill; keycap chip bg; Sort-menu hover fill |
| `#332C23` | **no named token** | Trigger hover fill |
| `#4A4033` | **no named token** | Trigger hover border; unchecked checkbox border; **inert** `Clear` text |
| `#6E6353` | **no named token** | Disabled trigger text; search placeholder; footer left text in the sheet frames; canvas annotation text |
| `rgba(8,6,4,0.72)` | **no named token** | Sheet backdrop scrim — stated as "the same scrim the shipped card modal uses" |
| `rgba(0,0,0,0.6)` | **no named token** | Popover shadow colour |
| `rgba(0,0,0,0.5)` | **no named token** | Sheet shadow colour |
| `#0A0806` | **no named token** | Device-frame chrome on the canvas only — **not** a product colour |
| `#E8E4D6` `#4A7FB5` `#5B5566` `#C05A48` `#6B9E63` | WUBRG identity tags | Shipped result rows only; the panel uses none of them |

Fonts: `'Cinzel', serif` · `'IBM Plex Sans', sans-serif` · `'IBM Plex Mono', monospace`.

---

## Trigger

Lives in the filter bar between `Type ▾` and `Sort ▾`. External geometry is identical to the
shipped `<select>` it replaces — same size, same position, same single tab stop.

### Rest

| Property | Mobile | Desktop |
|---|---|---|
| Element | `<button>` | `<button>` |
| Label | no trigger: below 1000px the set row lives in the filter sheet and reads `Any set` | `Set 0 ▾` (the counting trigger draws its figure at none, too) |
| Font | Plex Sans 13px / 500 | Plex Sans 13px / 500 |
| Color | `#EDE6D8` | `#EDE6D8` |
| Background | `#2A241D` | `#2A241D` |
| Border | `1px solid #3A3229` | `1px solid #3A3229` |
| Radius | `8px` | `8px` |
| Padding | `8px 13px` (in-frame bar) | `9px 14px` |
| White-space | `nowrap` | `nowrap` |
| Cursor | — | `pointer` |
| `aria-haspopup` | `dialog` | `dialog` |
| `aria-expanded` | `false` | `false` |
| Accessible name | `Filter by set, collapsed` | `Filter by set, collapsed` |

Note: the spec table in the README gives the canonical padding as `9×14`; the mobile device
frames draw the bar buttons at `8px 13px`. Treat `9px 14px` as the component spec and `8×13` as
the phone-frame rendering of the shipped bar.

### Hover

| Property | Mobile | Desktop |
|---|---|---|
| Background | — (no hover on touch) | `#332C23` |
| Border | — | `1px solid #4A4033` |
| Text / radius / padding | — | unchanged from rest |

### Focus-visible

| Property | Mobile | Desktop |
|---|---|---|
| Outline | `2px solid #C9A24B` | `2px solid #C9A24B` |
| Outline-offset | `2px` (**outside** the control) | `2px` (**outside** the control) |
| Background / border | unchanged from rest | unchanged from rest |

The outside ring is deliberately distinct from the keyboard-active option's inside ring
(`outline-offset: -2px`). "The two are never confused."

### Open

| Property | Mobile | Desktop |
|---|---|---|
| Label | `Set ▴` (caret flips) | `Set ▴` (caret flips) |
| Background | `#3A3229` | `#3A3229` |
| Border | `1px solid #C9A24B` | `1px solid #C9A24B` |
| `aria-expanded` | `true` | `true` |
| Surrounding bar | dimmed to `opacity 0.32` behind the sheet | undimmed — the list stays visible |

### Active (has a selection, panel closed)

| Property | Mobile | Desktop |
|---|---|---|
| Background | `#2A241D` (unchanged) | `#2A241D` (unchanged) |
| Border | `1px solid #C9A24B` | `1px solid #C9A24B` |
| Caret | `▾` | `▾` |

"The border turns brass whenever the filter is active, matching the active treatment already used
by the colour pips."

### One selected

| Property | Mobile | Desktop |
|---|---|---|
| Label | the sheet's set row reads the set's name | `Set 1 ▾` |
| Copy key | the sheet row's `collectionChassisCopy.chip.sets(n, name)`, unchanged | `triggerCount(n)`: `Set 0`, `Set 1`, `Sets 2` (2026-09-26, Hugh's staging walk: the name grew the trigger and moved the row) |
| Border | `1px solid #C9A24B` | `1px solid #C9A24B` |
| Width | the sheet row is full width, so nothing moves | held at the widest one-digit label (`Sets 9`) by a hidden sizer, so a pick moves nothing beside it |
| Overflow | the sheet row truncates the name, as before | none: a count cannot run long, so nothing truncates |
| Accessible name | `Filter by set, Bloomburrow, collapsed` | `Filter by set, Bloomburrow, collapsed` |

The README fixed truncation at `230px` (and the phone frame drew `170px`) while the label named
the set. It counts now (2026-09-26), so there is no name to truncate and no cap.

### Many selected (≥2)

| Property | Mobile | Desktop |
|---|---|---|
| Label | the sheet's set row reads `N sets` | `Sets N ▾`, no pip |
| Layout | `display: inline-flex` · `align-items: center` · `gap: 8px` | same |
| Border | `1px solid #C9A24B` | `1px solid #C9A24B` |
| Names in label | never — they live in the chip row | never |
| Accessible name | `Filter by set, 3 selected, collapsed` | `Filter by set, 3 selected, collapsed` |

### Count pip

Retired for the Set trigger on 2026-09-26: its label counts (`Sets N`), so a pip beside it would
print the figure twice. The pip below is still what `FilterPanel` draws for a trigger without
`triggerCount`.

| Property | Mobile | Desktop |
|---|---|---|
| Shown at | never, for Set; ≥2 selections on a trigger that names its pick | same |
| Font | Plex Mono 11px / 600 | Plex Mono 11px / 600 |
| Color | `#14110E` | `#14110E` |
| Background | `#C9A24B` | `#C9A24B` |
| Radius | `999px` | `999px` |
| Padding | `1px 7px` | `1px 7px` |

### Disabled

| Property | Mobile | Desktop |
|---|---|---|
| Condition | empty collection only | empty collection only |
| Color | `#6E6353` | `#6E6353` |
| Background | `#221D16` | `#221D16` |
| Border | `1px solid #2A241D` | `1px solid #2A241D` |
| Cursor | — | `not-allowed` |
| Attribute | `disabled` | `disabled` |

"Drawn for completeness only" — an empty collection is the App Shell's empty state and the whole
filter bar is disabled there.

---

## Popover (desktop mount, ≥768px)

### Container

| Property | Mobile | Desktop |
|---|---|---|
| Rendered | — (sheet instead) | mounted |
| Width | — | `340px` |
| Background | — | `#1A160F` |
| Border | — | `1px solid #3A3229` |
| Radius | — | `12px` |
| Shadow | — | `0 24px 60px rgba(0,0,0,0.6)` |
| Overflow | — | `hidden` |
| Anchor | — | trigger's **left** edge, `6px` below |
| Position on canvas | — | `top: 64px` (relative to the bar frame) |
| Modality | — | **not** modal; no backdrop, no focus trap |
| Role | — | `div[role=dialog][aria-label="Filter by set"]` (no `aria-modal`) |
| Dismiss | — | outside click · `Esc` · scroll of the underlying page · `Tab` out |
| Sizing | — | shrinks to content; no reserved empty space below a short result list |

### Option list

| Property | Mobile | Desktop |
|---|---|---|
| `max-height` | — | `384px` (≈9.5 rows — the half row is the scroll cue) |
| Overflow | — | `overflow-y: auto` |
| Bottom fade | — | `height: 22px`, `linear-gradient(to bottom, rgba(26,22,15,0), #1A160F)`, `margin-top: -22px` |
| Virtualisation | — | none — 254 options need no virtualisation |
| Role | — | `ul#set-list[role=listbox][aria-multiselectable=true]` |
| Open scroll position | — | scrolled to the top |
| "All sets" pseudo-option | — | **absent by decision** — clearing is the footer's job |

---

## Sheet (mobile mount, <768px)

### Container

| Property | Mobile | Desktop |
|---|---|---|
| Rendered | mounted | — (popover instead) |
| Width | full viewport width | — |
| Background | `#1A160F` | — |
| Radius | `16px 16px 0 0` | — |
| Border | `1px solid #3A3229` top only | — |
| Shadow | `0 -20px 50px rgba(0,0,0,0.5)` | — |
| `max-height` | `78vh` | — |
| Bottom padding | clears the tab bar (footer draws `12px 16px 20px`) | — |
| Role | `div[role=dialog][aria-modal="true"][aria-label="Filter by set"]` | — |
| Focus | trapped; cycles search → rows → Clear → Done | — |
| Dismiss | handle drag · backdrop tap · `✕` · `Esc` · `Done` | — |

### Backdrop

| Property | Mobile | Desktop |
|---|---|---|
| Fill | `rgba(8,6,4,0.72)` | — |
| Extent | everything above the sheet | — |
| Bar behind | rendered at `opacity 0.32` | — |
| Interaction | tap dismisses | — |

Stated as "the same scrim the shipped card modal uses". Desktop deliberately has **no** backdrop:
"a dimmed backdrop hides exactly that" (the list shortening behind you).

### Drag handle

| Property | Mobile | Desktop |
|---|---|---|
| Size | `36px × 4px` | — |
| Background | `#3A3229` | — |
| Radius | `999px` | — |
| Container | `display:flex; justify-content:center; padding: 9px 0 4px` | — |
| Behaviour | drag dismisses the sheet | — |

### Title row

| Property | Mobile | Desktop |
|---|---|---|
| Layout | `display:flex; align-items:center; justify-content:space-between` | — |
| Padding | `4px 16px 10px` | — |
| Title text | `Sets` (`sheetTitle`) | — |
| Title font | Cinzel 18px / 600 | — |
| Title color | `#EDE6D8` | — |

### Title pip (selection count in the sheet header)

| Property | Mobile | Desktop |
|---|---|---|
| Shown when | ≥1 selected (drawn at 3) | — |
| Font | Plex Mono 12px / 600 | — |
| Color | `#14110E` on `#C9A24B` | — |
| Radius | `999px` | — |
| Padding | `1px 8px` | — |
| Alignment | `vertical-align: middle` | — |

Note this is `12px / 1px 8px`, distinct from the **trigger** pip's `11px / 1px 7px`.

### Close button

| Property | Mobile | Desktop |
|---|---|---|
| Size | `30px × 30px` | — |
| Radius | `999px` | — |
| Background | `#221D16` | — |
| Border | `1px solid #3A3229` | — |
| Glyph | `✕`, `#A89B84`, `13px` | — |
| Layout | centred (`display:flex; align-items:center; justify-content:center`) | — |
| Hover / focus | — (not drawn) | — |

---

## Panel search field

Reuses `SearchField` from `text-field.tsx`. `searchable` is a prop — `Type ▾` renders the panel
with the field omitted entirely.

### Container (rest)

| Property | Mobile | Desktop |
|---|---|---|
| Layout | `display:flex; align-items:center; gap: 9px` | `display:flex; align-items:center; gap: 9px` |
| Background | `#181410` | `#181410` |
| Border | `1px solid #3A3229` | `1px solid #3A3229` |
| Radius | `8px` | `8px` |
| Padding | `12px` | `9px 12px` |
| Outer spacing | `margin: 0 16px 8px` (`0 16px 10px` in the anatomy card) | `margin: 10px` |
| Placeholder | `Search sets` | `Search sets` |
| Placeholder color | `var(--fg-faint)` (was `#6E6353`; one token for every search field, 2026-10-13) | same |
| Font size | `14px` | `13px` |
| Role | `input[role=combobox][aria-controls=set-list][aria-expanded=true][aria-activedescendant]` | same |
| Accessible name | `Search your sets` | `Search your sets` |
| Matching | case-insensitive substring on set **name and code**; prefix ranks above substring | same |
| Highlighting | **none** — matched characters are not highlighted | none |
| Debounce | `300ms`, **for the live-region announcement only**; filtering is synchronous | same |

### Leading icon

| Property | Mobile | Desktop |
|---|---|---|
| Glyph | `⌕` | `⌕` |
| Color | `#8E8269` | `#8E8269` |
| Size | `14px` | `13px` |
| Asset | text glyph in the reference; no SVG specified | same |

### Focused

| Property | Mobile | Desktop |
|---|---|---|
| Border | `1px solid #C9A24B` | `1px solid #C9A24B` |
| Outline | not drawn on the phone frames | `2px solid rgba(201,162,75,0.25)` (state 2); `2px solid #C9A24B` + `outline-offset: 2px` (keyboard walk step 2) |
| Caret | — | `1px × 15px`, `#C9A24B`, `margin-left: -4px` (drawn as a static caret) |
| Focus lifetime | DOM focus **never leaves this input** while the panel is open | same |

The two focused renderings differ: the pointer-opened popover draws a 25%-alpha halo, the
keyboard walk draws the full `2px #C9A24B` at `+2px`. The keyboard-walk value matches the
documented DOM-focus ring and should be treated as canonical.

### Filled (query present)

| Property | Mobile | Desktop |
|---|---|---|
| Border | `1px solid #C9A24B` | `1px solid #C9A24B` |
| Text color | `#EDE6D8` | `#EDE6D8` |
| Text size | `14px` | `13px` |
| Text layout | `flex: 1` | `flex: 1` |
| Trailing clear | rendered | rendered |

### Trailing clear button

| Property | Mobile | Desktop |
|---|---|---|
| Shown | once a query exists | once a query exists |
| Size | `20px × 20px` | `18px × 18px` |
| Radius | `999px` | `999px` |
| Background | `#2A241D` | `#2A241D` |
| Glyph | `✕`, `#A89B84`, `11px` | `✕`, `#A89B84`, `10px` |
| Layout | centred | centred |
| Hover / focus | — (not drawn) | — (not drawn) |

---

## Group label

| Property | Mobile | Desktop |
|---|---|---|
| Font | Plex Mono 10px | Plex Mono 10px |
| Letter-spacing | `0.16em` | `0.16em` |
| Transform | `uppercase` (copy is authored sentence case) | `uppercase` |
| Color | `#8E8269` | `#8E8269` |
| Padding | `4px 16px 4px` | `2px 14px 6px` (`6px 14px 6px` in the anatomy card) |
| Second group's padding | `8px 16px 4px` + `border-top: 1px solid #2A241D` | `8px 14px 6px` + `border-top: 1px solid #2A241D` |
| Strings | `Newest first` · `Selected · N` · `1 match` / `N matches` | same |
| Grouping recomputed | **no** — computed once, on open | **no** |
| Under a query | grouping dropped entirely; single `N matches` label | same |

---

## Option row

### Default (unselected, enabled)

| Property | Mobile | Desktop |
|---|---|---|
| Layout | `display: flex` · `align-items: center` | `display: flex` · `align-items: center` |
| Gap | `gap: 12px` | `gap: 11px` |
| Padding | `12px 16px` | `9px 14px` |
| Min-height | `48px` (min, not fixed — rows grow) | `40px` |
| Background | — (transparent) | — (transparent) |
| Role | `li[role=option][aria-selected=false]` | same |
| Tap target | the whole row | the whole row |
| Two-line rows | `align-items: flex-start`; checkbox `margin-top: 1px`; count `margin-top: 2px` | n/a (single line) |

### Checkbox — unchecked

| Property | Mobile | Desktop |
|---|---|---|
| Size | `18px × 18px` | `16px × 16px` |
| `flex` | `none` | `none` |
| Radius | `4px` | `4px` |
| Background | `#14110E` | `#14110E` |
| Border | `1px solid #4A4033` | `1px solid #4A4033` |
| Semantics | presentational — `aria-selected` on the option is the truth | same |

### Checkbox — checked

| Property | Mobile | Desktop |
|---|---|---|
| Background | `#C9A24B` | `#C9A24B` |
| Border | `1px solid #C9A24B` | `1px solid #C9A24B` |
| Glyph | `✓`, `#14110E`, `12px`, `line-height: 1` | `✓`, `#14110E`, `11px`, `line-height: 1` |
| Layout | centred | centred |

### Name

| Property | Mobile | Desktop |
|---|---|---|
| Font | Plex Sans 14.5px | Plex Sans 13.5px |
| Color | `#EDE6D8` | `#EDE6D8` |
| Flex | `flex: 1; min-width: 0` | `flex: 1; min-width: 0` |
| Overflow | **wraps to two lines**; `line-height: 1.35` | `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` |
| `title` attribute | — | full name (for the pointer) |
| Accessible name | always the **full** name | always the **full** name |
| Fallback when name missing | uppercased set code, count still shown; **never** a lowercase raw code | same |

Longest real name is 43 characters (`Commander Legends: Battle for Baldur's Gate`).

### Count

| Property | Mobile | Desktop |
|---|---|---|
| Font | Plex Mono 12px | Plex Mono 11.5px |
| Color (unselected) | `#8E8269` | `#8E8269` |
| Color (selected) | `#C6B79A` | `#C6B79A` |
| Figures | `font-variant-numeric: tabular-nums` | `font-variant-numeric: tabular-nums` |
| Alignment | right, fixed column so it is never pushed off | right, fixed column |
| Formatting | thousands separators (`1,142`) | thousands separators |
| Semantics | owned cards in that set **surviving the other active filters** | same |

### Hover

| Property | Mobile | Desktop |
|---|---|---|
| Background | — (no hover on touch) | `#221D16` |
| Ring | never — "pointer hover is a fill and never a ring" | never |

### Selected

| Property | Mobile | Desktop |
|---|---|---|
| Row background | — (**no** row fill, by decision) | — (**no** row fill) |
| Checkbox | brass fill + `✓` (see above) | brass fill + `✓` |
| Count color | `#C6B79A` | `#C6B79A` |
| `aria-selected` | `true` | `true` |
| Position | pinned into `Selected · N` on open only | same |

"A brass band per selection would outweigh the surface's primary action."

### Keyboard-active (`aria-activedescendant`)

| Property | Mobile | Desktop |
|---|---|---|
| Outline | `2px solid #C9A24B` | `2px solid #C9A24B` |
| Outline-offset | `-2px` (**inside** the row) | `-2px` (**inside** the row) |
| Radius | `6px` | `6px` |
| Hover fill | **none** — never combined | **none** |
| DOM focus | stays in the search input | stays in the search input |
| Scroll | active row scrolled into view; no wrap at the ends | same |

### Disabled (0 under the other active filters)

| Property | Mobile | Desktop |
|---|---|---|
| Opacity | `0.42` | `0.42` |
| Name color | `#A89B84` | `#A89B84` |
| Checkbox border | `1px solid #3A3229` | `1px solid #3A3229` |
| Checkbox background | `#14110E` | `#14110E` |
| Count | `0`, `#8E8269` | `0`, `#8E8269` |
| Attribute | `aria-disabled="true"` | `aria-disabled="true"` |
| Pointer events | none | none |
| Keyboard | `␣`/`↵` do not toggle it | do not toggle |
| Removal | **never removed from the list** | never removed |
| Accessible name | `{setName}, no cards match your other filters` | same |
| Contrast | fails AA **by design**, per the WCAG inactive-control exemption | same |

---

## Panel footer

Omitted **entirely** in the no-results state.

### Container

| Property | Mobile | Desktop |
|---|---|---|
| Border-top | `1px solid #2A241D` | `1px solid #2A241D` |
| Padding | `12px 16px 20px` (bottom clears the tab bar) | `9px 14px` |
| Layout | `display:flex; align-items:center; justify-content:space-between; gap:12px` | `display:flex; justify-content:space-between; align-items:center` |
| Slots | left = `Clear` (or status text), right = `Done` | left = status text, right = `Clear` |

### Left status text

| Property | Mobile | Desktop |
|---|---|---|
| Font | Plex Mono 11px | Plex Mono 11px |
| Color | `#6E6353` (as drawn in the sheet frames) | `#8E8269` (README spec and popover frames) |
| String, nothing selected | `254 sets owned` (`footerTotal`) | `254 sets owned` |
| String, N selected | `3 of 254 selected` (`footerSelected`) | `3 of 254 selected` |
| Present when N selected | **replaced by the `Clear` button** in the sheet | present |

The mobile left slot swaps between status text (nothing selected) and the `Clear` button
(something selected); the desktop left slot always carries the status text.

### `Clear` — active (≥1 selected)

| Property | Mobile | Desktop |
|---|---|---|
| Font | Plex Sans 13.5px / 500 | Plex Sans 12.5px / 500 |
| Color | `#C9A24B` | `#C9A24B` |
| Position | left slot | right slot |
| Background / border | — | — |

### `Clear` — inert (nothing selected)

| Property | Mobile | Desktop |
|---|---|---|
| Rendered | not drawn (the status text occupies the slot) | rendered, inert |
| Color | — | `#4A4033` |
| Font | — | Plex Sans 12.5px / 500 |
| Interactive | — | no |

### `Done` (mobile only)

| Property | Mobile | Desktop |
|---|---|---|
| Rendered | always (all sheet states, including no-results) | — |
| Font | Plex Sans 13.5px / 600 | — |
| Color | `#14110E` | — |
| Background | `#C9A24B` | — |
| Radius | `8px` | — |
| Padding | `10px 22px` | — |
| Behaviour | **dismiss only** — commits nothing | — |

"It is brass because it is the sheet's way out, not because it commits anything."

---

## Empty state

Replaces the option list when the query matches no owned set. The footer is dropped on desktop;
the sheet keeps its `Done` bar.

### Container

| Property | Mobile | Desktop |
|---|---|---|
| Padding | `26px 22px 22px` | `20px 20px 22px` |
| Text-align | `center` | `center` |
| Footer | `Done` bar retained (`254 sets owned` + `Done`) | **dropped entirely** |
| Collection list behind | untouched — the panel's query filters nothing | untouched |

### Diamonds (card-fan mark stand-in)

| Property | Mobile | Desktop |
|---|---|---|
| Count | 3 | 3 |
| Sizes | `7px` · `9px` · `7px` | `6px` · `8px` · `6px` |
| Background | `#3A3229` | `#3A3229` |
| Transform | `rotate(45deg)` | `rotate(45deg)` |
| Gap | `7px` | `6px` |
| Layout | `display:flex; justify-content:center` | same |
| Margin-bottom | `14px` | `12px` |
| Asset | CSS boxes in the reference; **rebuild as SVG** | same |

### Heading

| Property | Mobile | Desktop |
|---|---|---|
| Text | `Nothing in the pile by that name` | same |
| Font | Cinzel 17px / 600 | Cinzel 15.5px / 600 |
| Color | `#EDE6D8` | `#EDE6D8` |
| Margin-bottom | `7px` | `6px` |

The one flavour beat this control is allowed.

### Body

| Property | Mobile | Desktop |
|---|---|---|
| Text | `No owned set matches “{query}”. Only sets you own are listed here.` | same |
| Font | Plex Sans 13.5px | Plex Sans 12.5px |
| Color | `#A89B84` | `#A89B84` |
| Line-height | `1.6` | `1.6` |
| Query treatment | `#C6B79A`, weight `600`, inside curly quotes `“ ”` | same |

### `Clear search` button

| Property | Mobile | Desktop |
|---|---|---|
| Display | `inline-block` | `inline-block` |
| Font | Plex Sans 13.5px / 500 | Plex Sans 12.5px / 500 |
| Color | `#EDE6D8` | `#EDE6D8` |
| Background | `transparent` | — (unset; transparent) |
| Border | `1px solid #3A3229` | `1px solid #3A3229` |
| Radius | `8px` | `8px` |
| Padding | `10px 18px` | `8px 16px` |
| Margin-top | `16px` | `14px` |
| Hover / focus | — (not drawn) | — (not drawn) |

Matches the brand's secondary-button recipe (transparent fill, `1px #3A3229`, `#EDE6D8` text).

---

## Chip row (reused, `chip-row.tsx` unchanged)

| Property | Mobile | Desktop |
|---|---|---|
| Component change | **none** — it gains chips because it is handed more active filters | none |
| One chip per | selected set | selected set |
| Order | after the colour and type chips, in selection order | same |
| Font | Plex Sans 12.5px / 500 | Plex Sans 12.5px / 500 |
| Color | `#EDE6D8` | `#EDE6D8` |
| Background | `#2A241D` | `#2A241D` |
| Border | `1px solid #3A3229` | `1px solid #3A3229` |
| Radius | `999px` | `999px` |
| Padding | `6px 12px` | `6px 12px` |
| Trailing `✕` | `#8E8269` | `#8E8269` |
| Row layout | `display:flex; gap: 8px; align-items:center; overflow:hidden` | `display:flex; gap: 8px; align-items:center; flex-wrap: wrap` |
| `Clear all` | Plex Sans 12.5px / 500, `#C9A24B`, `padding: 6px 4px` | same |
| Tab order | trigger → chip dismiss buttons | trigger → chip dismiss buttons |
| Live region | shared with the panel — one region for the whole filter bar | same |

---

## Siblings — follow-up, not this ticket

Both are drawn so the panel can be built general enough to serve all three controls. Neither
ships in this change; two native `<select>`s remain in the row for one release, which the
handoff calls "acceptable and expected". **`Color ▾` never converts** — the five WUBRG pips are
already custom and already right.

### `Type ▾` — same panel, `searchable={false}` *(follow-up, not this ticket)*

| Property | Mobile | Desktop |
|---|---|---|
| Component | the same `FilterPanel` | the same `FilterPanel` |
| Width | — (sheet, per the shared rules) | `300px` |
| Background / border / radius / shadow | — | `#1A160F` · `1px solid #3A3229` · `12px` · `0 24px 60px rgba(0,0,0,0.6)` |
| Search field | absent | absent |
| Group labels | absent | absent |
| Options | ~14 card types | ~14 card types |
| Selection | multi-select | multi-select |
| Counts | yes — same treatment as the Set panel | yes |
| Row geometry | — | `gap: 11px`, `padding: 9px 14px`, `min-height: 40px` |
| Footer | — | `border-top: 1px solid #2A241D`, `padding: 9px 14px`, `justify-content: flex-end`, `Clear` only (no left status text) |

### `Sort ▾` — a menu, not a listbox *(follow-up, not this ticket)*

| Property | Mobile | Desktop |
|---|---|---|
| Component | **not** this panel | **not** this panel |
| Width | — | `220px` |
| Shell | — | same as the popover: `#1A160F`, `1px solid #3A3229`, radius `12px`, `0 24px 60px rgba(0,0,0,0.6)` |
| Container padding | — | `5px 0` |
| Role | — | `role="menu"` |
| Row min-height | — | `38px` |
| Row padding / gap | — | `9px 14px` · `gap: 10px` |
| Leading mark | — | `✓` in `#C9A24B`, `12px`, in a `13px` fixed column; blank column when unselected |
| Label | — | Plex Sans 13.5px, `#EDE6D8`, `flex: 1` |
| Hover | — | `#221D16` |
| Counts | — | none |
| Search | — | none |
| Checkboxes | — | none |
| Options | — | `Name A→Z` · `Name Z→A` · `Newest set first` · `Mana value ↑` · `Quantity owned ↓` |
| Selection | — | single, mutually exclusive |
| On select | — | **closes** the menu |

---

## Transitions, transforms, animation

| Property | Mobile | Desktop |
|---|---|---|
| Global rule | "Nothing animates except the sheet's translate-in" | "Nothing animates" |
| Sheet entry | translate-in (direction implied bottom-up; **no duration or easing given**) | — |
| Reduced motion | the translate-in sits behind `prefers-reduced-motion` | n/a |
| Popover entry | — | none — appears without transition |
| Backdrop fade | not specified | n/a |
| Row hover | no transition specified — instant fill | no transition specified |
| Checkbox check | no transition specified | no transition specified |
| Caret `▾`↔`▴` | no transition — glyph swap, not a rotation | no transition |
| List re-order | **explicitly none** — grouping is not recomputed while open | explicitly none |
| Transforms in use | empty-state diamonds `rotate(45deg)` | empty-state diamonds `rotate(45deg)` |
| Bottom fade | n/a (sheet has no scroll fade drawn) | `linear-gradient(to bottom, rgba(26,22,15,0), #1A160F)` over `22px`, a static gradient not an animation |

---

## Conditional rendering summary

| Element | Rendered when | Not rendered when |
|---|---|---|
| Popover | `matchMedia('(min-width: 768px)').matches` **and** panel open | below 768px, or closed |
| Sheet + backdrop | media query does **not** match **and** panel open | ≥768px, or closed |
| Both simultaneously | **never** — forbidden by the engineering notes | — |
| Search field | `searchable` is true (Set) | `searchable` is false (Type) |
| Trailing clear `✕` | query is non-empty | query is empty |
| Group `Selected · N` | ≥1 selected **and** query empty | nothing selected, or a query is active |
| Group `Newest first` | query empty | a query is active |
| Group `N matches` | a query is active with ≥1 match | query empty, or no matches |
| Option list | ≥1 match | no matches (empty state replaces it) |
| Empty state | query is non-empty **and** matches nothing | otherwise |
| Footer | **not** the no-results state | no-results state (desktop drops it entirely) |
| Footer left status text | desktop always; mobile only when nothing is selected | mobile with ≥1 selected (`Clear` takes the slot) |
| Footer `Clear` (brass) | ≥1 selected | nothing selected (desktop shows it inert `#4A4033`; mobile omits) |
| Footer `Done` | mobile, all sheet states | desktop |
| Trigger name in label | never, for Set: it counts (`Set 0`, `Set 1`, `Sets N`) | always |
| Trigger count pip | never, for Set: the label carries the figure | always |
| Trigger brass border | ≥1 selected, or the panel is open | nothing selected and closed |
| Sheet title pip | ≥1 selected | nothing selected |
| Set chip in the chip row | one per selected set | nothing selected |
| Disabled option row | that set's filtered count is `0` | count ≥1 |
| "All sets" pseudo-option | **never** | always |

---

## State Coverage

| State | Triggering condition | Component rendered | Key props required |
|---|---|---|---|
| Trigger · rest | filter bar mounted, nothing selected, closed | `FilterPanel` trigger `<button>` | `label="Set"`, `selected=[]`, `open=false` |
| Trigger · hover | pointer over the trigger (desktop) | trigger `<button>:hover` | CSS only |
| Trigger · focus-visible | keyboard focus reaches the trigger | trigger `<button>:focus-visible` | CSS only |
| Trigger · open | `↵`/`␣`/`↓`/click on the trigger | trigger + popover **or** sheet | `open=true`, `aria-expanded=true`, `isDesktop` from `matchMedia` |
| Trigger · active | ≥1 selected, panel closed | trigger `<button>` with brass border | `selected.length >= 1` |
| Trigger · one selected | `selected.length === 1` | trigger reading `Set 1`; the name is in the chip row | `selected.length` |
| Trigger · many selected | `selected.length >= 2` | trigger reading `Sets N`, no count pip | `selected.length` |
| Trigger · disabled | empty collection | trigger `<button disabled>` | `disabled` |
| 1 · Closed | panel dismissed, no set filter | filter bar only | `open=false`, `selected=[]` |
| 2 · Open, empty search | panel opened, no query, nothing selected | popover (desktop) / sheet (mobile) + `Newest first` group + 254 options | `options[]`, `selected=[]`, `query=""`, `onToggle`, `onClear` |
| 3 · Open, with query | query matches ≥1 owned set | panel + `N matches` group + filtered list, no group split | `query`, filtered `options`, `announceMatches(n, query)` |
| 4 · No results | query matches 0 owned sets | panel + empty state; footer dropped (desktop) | `query`, `onClearSearch`, `emptyTitle`, `emptyBody(query)` |
| 5 · One selected | one set toggled on, panel dismissed | filter bar + 1 chip + `Set 1 ▾` | `selected=['blb']`, chip row given the new filter |
| 6 · Many selected | 3 sets toggled on **with `Type 1` (Instant) also active** | panel reopened with pinned `Selected · 3` group, filter-aware counts, ≥1 zero-count disabled row | `selected[]`, `options[].count` computed under the other filters, `options[].disabled` |
| 7 · Keyboard focus walk | keyboard-only operation, 4 ordered frames | trigger focus ring → panel with input focused → active row + toggle → trigger refocused | `aria-activedescendant`, focus-return ref on the trigger |
| Row · default | option is enabled and unselected | `li[role=option][aria-selected=false]` | `option.label`, `option.count` |
| Row · hover | pointer over the row (desktop) | `li` with `#221D16` fill | CSS only |
| Row · selected | `selected.includes(option.id)` | `li[aria-selected=true]`, brass box, `#C6B79A` count | `selected` |
| Row · keyboard-active | `aria-activedescendant === option.id` | `li` with inset brass ring | `activeId` |
| Row · disabled | `option.count === 0` under the other filters | `li[aria-disabled=true]`, `opacity .42`, no pointer events | `option.disabled`, `optionAriaUnavailable(label)` |

---

## Announcements

All of these write to the **filter bar's existing live region** — not a new one — so two filters
changed in quick succession read in order instead of on top of each other.

| Trigger | Politeness / timing | String | Copy key |
|---|---|---|---|
| Trigger focused, nothing selected | on focus | `Filter by set, collapsed, button` | `triggerAriaCollapsed` |
| Trigger focused, N selected | on focus | `Filter by set, 3 selected, collapsed` | `triggerAriaWithSelection(n)` |
| Trigger focused, exactly one selected | on focus | `Filter by set, Bloomburrow, collapsed` | (from the canvas, keyboard-walk step 4) |
| Panel opened | — | `Filter by set` as the dialog's `aria-label` | `panelAriaLabel` |
| Option read | on `aria-activedescendant` move | `Bloomburrow, 142 cards, selected, 2 of 254` | `optionAria(name, count, selected)` + list position from `role=option` |
| Option read, zero-count | on move | `Adventures in the Forgotten Realms, no cards match your other filters` | `optionAriaUnavailable(name)` |
| Query changed | polite, **debounced 300ms** | `2 sets match bloom` | `announceMatches(n, query)` |
| Query changed, no matches | polite, debounced 300ms | `No sets match eldraen` | `announceMatches(0, query)` |
| Option toggled on | polite | `Bloomburrow added. 3 sets, 328 of 2,933 cards shown.` | `announceAdded(name, sets, shown, total)` |
| Option toggled off | polite | `Bloomburrow removed. 2 sets, 186 of 2,933 cards shown.` | `announceRemoved(name, sets, shown, total)` |
| Last option toggled off | polite | `Bloomburrow removed. No set filter, 186 cards shown.` | `announceRemoved(...)` with `sets === 0` |
| `Clear` pressed | polite | `Set filter cleared. 186 cards shown.` | `announceCleared(shown)` |

Numbers are passed in as **raw counts**; the copy module formats and pluralises them. It
previously took pre-formatted strings, which put two separator conventions in one sentence
on a non-`en-US` browser — `1.234 of 2,933` — because only some of the figures were pinned.
One formatter now owns every figure in the module, and `1 card` is singular.

**The figure in a clear is what the other filters leave, not the collection.** Clearing Set
does not clear Type, so `announceCleared` and the `sets === 0` branch of `announceRemoved`
both report the surviving count — a clear that reported the whole collection announced a
list the reader was not looking at.

Contrast, as measured in the handoff: option name `#EDE6D8` on `#1A160F` ≈ 12.9:1; count
`#8E8269` ≈ 4.6:1 at 11.5px (AA, and supplementary — the name alone carries the meaning);
disabled rows at `opacity .42` fail AA by design and are marked `aria-disabled`.

## Keyboard model

Role tree:

```
button[aria-haspopup=dialog][aria-expanded]
  div[role=dialog][aria-label="Filter by set"]        (aria-modal only on mobile)
    input[role=combobox][aria-controls=set-list][aria-expanded][aria-activedescendant]
    ul#set-list[role=listbox][aria-multiselectable=true]
      li[role=option][aria-selected] / [aria-disabled]
```

| Key | Context | Behaviour |
|---|---|---|
| `Tab` | filter bar | Reaches the trigger — **one** stop, between `Type` and `Sort`, exactly where the `<select>` sat |
| `↵` / `␣` / `↓` | trigger focused | Opens the panel and moves focus into the search field. `↓` additionally marks the first option active |
| — | panel just opened via `↵`/`␣` | **No option is active** — the caret is in the field, so a first keystroke types rather than selects |
| `↑` `↓` | panel open | Move the active option and scroll it into view. DOM focus stays in the input; the active row is named by `aria-activedescendant`. **No wrap at the ends** |
| `␣` / `↵` | an option is active | Toggles it. Panel **stays open**, query is **kept**, list does **not** re-sort. Disabled (0-count) rows do not toggle |
| `Esc` | panel open | With a search typed, clears it and keeps the panel open (DECK INPUT UX, `escapeDismisses`); otherwise closes and returns focus to the trigger. Selections are already applied — **Esc is dismiss, never undo** (a `<select>`'s Esc did revert; this does not) |
| `Tab` | panel open, desktop | Moves to `Clear`, then out — closing the popover |
| `Tab` | panel open, mobile | Focus is **trapped** (`aria-modal`) and cycles search → rows → `Clear` → `Done` |
| `Tab` | after `Esc`, trigger focused | Continues into the chip row's dismiss buttons — a new chip is reachable without leaving the keyboard |
| Typing | panel open | Filters synchronously; never interrupted, because DOM focus never left the input |
| Outside click / page scroll | desktop | Closes the popover |
| Backdrop tap / handle drag / `✕` / `Done` | mobile | Closes the sheet |

Two deliberately distinct brass rings:

| Ring | Value | Meaning |
|---|---|---|
| DOM focus | `2px #C9A24B`, `outline-offset: +2px` (outside the element) | real focus — trigger, search field, buttons |
| Keyboard-active option | `2px #C9A24B`, `outline-offset: -2px` (inside the row), radius `6px` | `aria-activedescendant` position |
| Pointer hover | fill `#221D16`, **never a ring** | mouse position |

---

## Open questions

### 1. Per-set counts DO respect the other active filters. Whether the collection's free-text search box is one of those filters is genuinely open.

The decided half is not ambiguous. Decision 5, verbatim:

> A count that ignores the rest of the bar promises results the list won't show. So the figure is
> "cards you own from this set **that would survive your other filters**" — with Instant picked in `Type 1`
> active, Bloomburrow reads `12`, not `142` (state 6).

State 6 on the canvas is the proof: with Instant picked in `Type 1`, `Bloomburrow` reads `12`,
`Modern Horizons 3` reads `7`, `Wilds of Eldraine` reads `9`, `Duskmourn` reads `8`, and
`Adventures in the Forgotten Realms` reads `0` and is dimmed to `opacity .42` — where the same
Bloomburrow row reads `142` in states 2 and 3 with no other filter active. Implementations must
recompute counts per set under the current filter set; a static per-set owned total is wrong.

The genuinely open sub-question is gap 4, verbatim:

> **Set counts under a name search.** If the player has typed in the *collection* search box, do
> the panel's per-set counts respect that too? Decision 5 says "other active filters"; a free-text
> query is arguably one. Drawn as *filters only, not text search* — cheap to compute, and the
> count stays stable while typing. Worth a second opinion.

`READINESS.md` escalates this: "getting it wrong is a correctness bug in a visible number, not a
layout issue." The drawn behaviour (filters only) is the default to build unless Design rules
otherwise; it needs an explicit answer before this ships.

Related, and also unresolved in this project: decisions **3** (trigger label), **5**
(filter-aware counts) and **9** (Type/Sort conversion) are "reasoned, not reconciled" — the spec
at `docs/superpowers/specs/2026-07-27-collection-filter-panel-design.md` and the existing table at
`docs/superpowers/design-tables/collection.md:389-406` were not in the design project. Diff those
three before building. Likewise the data contract: the collection query must return
`{code, name, releasedAt, count}` per owned set with `count` computed under the other active
filters. "Everything visual depends on that payload; the fallback (uppercased code, count still
shown) is drawn but is a degradation, not a plan."

### 2. The sheet's search input is 14px mobile / 13px desktop, and 14px collides with Safari's iOS 16px zoom floor.

The values are unambiguous in the canvas: the sheet's search field renders text and placeholder
at `font-size: 14px` (leading `⌕` also `14px`); the popover's renders at `13px` (icon `13px`).
The README repeats it: "Mobile `12px` padding / 14px text (iOS zoom floor is 16px — see gap 3)."

Gap 3, verbatim:

> **iOS 16px zoom floor.** The sheet's search field is specced at 14px, which triggers Safari's
> focus zoom. Either bump to 16px (and re-check the sheet's vertical budget) or set
> `maximum-scale=1` on the viewport — a global decision I'm not making inside one control.

Both options have costs. Bumping to 16px grows the field inside a `max-height: 78vh` sheet that
already carries a handle, title row, search field, list and footer — the vertical budget must be
re-checked, not assumed. Setting `maximum-scale=1` disables user pinch-zoom app-wide, which is a
WCAG 1.4.4 concern and a decision that belongs to the App Shell, not this component.
`READINESS.md` lists it as blocking Green. **Do not silently pick one.**

### 3. Icons are text glyphs with no SVG spec.

Every icon in the canvas is a literal character: `⌕` (search), `✕` (clear / close / chip
dismiss), `✓` (checkbox and Sort-menu tick), `▾` / `▴` (trigger caret), `›` (row chevron on the
shipped list). No SVG paths, sizes-as-viewBox, or icon-set reference is given — only a colour and
a `font-size`. `⌕` in particular has poor cross-platform coverage and will fall back
unpredictably. The brand README says the logomark and swatches "should be rebuilt as SVG/
components in the target codebase," but says nothing about the UI glyphs. **Which icon source do
we use, and does the caret become a rotated chevron (in which case the "nothing animates" rule
needs a carve-out) or stay a glyph swap?**

### 4. The footer's left slot: spec and frames disagree.

Three separate disagreements, none of them resolved by the source:

- **Colour.** The README says the footer's left text is `Plex Mono 11 #8E8269`. The desktop
  popover frames render `#8E8269`; every mobile sheet frame renders `#6E6353`. `#6E6353` has no
  named token and is otherwise reserved for disabled/placeholder text.
- **Occupancy.** On mobile the left slot holds `254 sets owned` when nothing is selected (states
  2, 3, 4) but is **replaced** by the `Clear` button in state 6. So the mobile sheet never shows
  `3 of 254 selected` anywhere, even though `footerSelected(n, total)` exists in the copy file and
  the README says "Left Plex Mono 11 `#8E8269` (`254 sets owned` / `3 of 254 selected`)". Is
  `footerSelected` mobile-dead copy, or should the sheet stack status text above the button row?
- **Side.** `Clear` is the **right** slot on desktop and the **left** slot on mobile. Intentional
  (`Done` owns the mobile right), but it means `Clear` moves across the panel at the breakpoint —
  worth confirming rather than inferring.

Additionally, the `Type ▾` follow-up frame drops the left slot entirely
(`justify-content: flex-end`, `Clear` alone), so the footer has a third layout that the Set panel
never uses.

### 5. The sheet animation is specified but not quantified.

"Nothing animates except the sheet's translate-in; that is behind `prefers-reduced-motion`." No
duration, no easing, no distance, no direction stated (bottom-up is the only sensible reading of
a bottom sheet), and no statement about whether the backdrop fades with it or appears instantly.
The reduced-motion fallback is also unstated: does the sheet appear instantly, or cross-fade?

### 6. Popover overflow and flip behaviour is unspecified.

The popover is fixed at `340px`, anchored to the trigger's **left** edge, `6px` below. `Set ▾`
sits fourth in the filter bar, so on a narrow desktop window — or with a long
`Set: Bloomburrow ▾` label pushing the row — a left-anchored 340px panel can run past the right
viewport edge. The handoff specifies **no** flip-to-right-align, no collision shift, and no
`min-width`/viewport clamp. It also does not say what happens when the trigger is close to the
bottom of the viewport: `max-height: 384px` plus the search field and footer is roughly 480px of
panel, with no flip-above behaviour described. It only says the popover closes on scroll of the
underlying page, which sidesteps but does not answer the initial-placement case.

### 7. Undated-set ordering is an explicit assumption.

Gap 5, verbatim: "Promos, Secret Lair drops and Alchemy sets have messy or absent release dates.
Unspecified fallback: undated sets sort last, A→Z. Confirm against the real Scryfall payload."
`READINESS.md` repeats it under Risk notes as "an assumption." The dated ordering itself is
locked (release date desc, ties broken A→Z by name, so `Bloomburrow` sits above
`Bloomburrow Commander` deterministically), and query-time ordering is decided (prefix matches
first, then substring, release order inside each group) — only the undated bucket is open.

### 8. Minor unresolved items

- **Hover and focus states are undrawn** for: the sheet close `✕`, the search field's trailing
  clear `✕`, the empty state's `Clear search`, the footer's `Clear` and `Done`, and the chip
  dismiss `✕`. Only the trigger and the option row have hover/focus specified. The brand's
  `accent-hover #D8B25E` exists but is never applied in this canvas — presumably `Done`'s hover,
  but that is inference.
- **The panel background `#1A160F` has no named token** and is not `base`, `surface` or
  `elevated`. The README insists "No new token is introduced" while the panel's own ground is a
  value the token set does not contain. Either it maps to an existing `var(--*)` already in
  `globals.css` under a different name, or a token is in fact needed.
- **Popover row padding for the group label** is given twice with different values: `6px 14px
  6px` in the panel-anatomy card, `2px 14px 6px` in states 2, 3 and 6. The state frames are the
  more numerous rendering; the anatomy card is the more deliberate one.
- **Trigger padding** is `9px 14px` in the spec and desktop frames but `8px 13px` in every phone
  frame, without the design calling the difference out as a mobile variant.
- **Sheet drag-to-dismiss** is listed as a dismissal method with no threshold, velocity or
  rubber-banding spec — and the "nothing animates" rule leaves it unclear whether the drag is
  tracked live or is just a tap-target on the handle.
