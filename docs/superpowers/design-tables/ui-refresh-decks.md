# Design Property Table — UI Refresh, Decks

Source: `design/design_handoff_the99_refresh/`
- `The 99 - Refresh · Home and Decks.dc.html` (the deliverable; all measured values below come from it)
- `STATES-deck-statuses.md` (status → token mapping, card composition, filter rules)
- `README.md`, `READINESS.md` (decisions and gaps)
- `refresh · copy strings.ts` (copy keys — structure only)
- `tokens.r6.json` (R6 theme tokens)

Scope: **Decks index only.** Header, sort trigger, desktop filter column, phone filter sheet,
deck tile grid, status pills, progress bar, detail row, overflow menu, and the zero-deck /
filtered-empty states. The rail, the phone tab bar and the Home page are covered by other tables.

Breakpoint: **640px (`sm:`)**. "Mobile" = the 390px phone frames; "Desktop" = the 1180px frames.

---

## Palette note — read before using any hex below

The mockup is drawn in a **bespoke gold-accent palette that is not the R6 Amonkhet token set**.
Implementation must bind to the CSS variables, not the drawn hex. Correspondences:

| Drawn hex | Role in the drawing | Token to bind | R6 Amonkhet value | Match? |
|---|---|---|---|---|
| `#14110E` | frame background | `var(--bg)` | `#14110E` | exact |
| `#1B1712` | tile / card surface | `var(--surface-inset)` | `#1B1712` | exact |
| `#1E1A15` | menu surface, selected filter row | `var(--surface)` | `#1E1A15` | exact |
| `#100D0A` | search field well, page ground | `var(--surface-sunken)` | `#18140F` | **no** — drawn darker than any token |
| `#171310` | desktop filter column bg, locked step card bg | `var(--surface-rail)` | `#1A1611` | **no** |
| `#241F18` | active nav pill, filter chip bg, open `…` bg | `var(--elevated)` | `#29241F` | **no** |
| `#2A241D` | tile border, progress track | `var(--border)` | `#2B241B` | near |
| `#211C16` | internal dividers | `var(--border)` | `#2B241B` | **no** — second, darker divider |
| `#2E2822` | view-toggle border | — | — | **unmapped** |
| `#3A3229` | hairline button/field border | `var(--border-strong)` | `#3A3229` | exact |
| `#4A4033` | Building pill border, dimmed locked items | `var(--border-dashed)` | `#494037` | near |
| `#EDE6D8` | bone fill, primary text | `var(--fg)` | `#EDE6D8` | exact |
| `#C6B79A` | body text, Building status | `var(--fg-body)` | `#C0B8A6` | near |
| `#A89B84` | secondary text, Draft pill label | `var(--fg-muted)` | `#A59C89` | near |
| `#8E8269` | mono meta text, Draft keyline | `var(--fg-faint)` | `#8B8270` | near |
| `#C9A24B` | accent / To buy | `var(--accent)` | `#CF8745` | **no** |
| `#6FA368` | Complete | `var(--success)` | `#6FA368` | exact |
| `#E0913C` | Unresolved | `var(--warning)` | `#DEAA29` (Amonkhet) | **no** — matches the other five themes' warning |
| `#C6533F` | Over, Delete | `var(--danger)` | `#C6533F` | exact |
| `#E8E4D6` | White pip | `var(--w)` | `#F4E9C4` | **no** |
| `#4A7FB5` | Blue pip | `var(--u)` | `#3A6AA5` | **no** |
| `#5B5566` | Black pip | `var(--b)` | `#98748F` | **no** |
| `#C05A48` / `#C05A3E` | Red pip | `var(--r)` | `#C05A3E` | near |
| `#6B9E63` | Green pip | `var(--g)` | `#4B7A46` | **no** |

Every property table below records the **token** as the value to implement and the drawn hex in
parentheses where they differ.

---

## Status → token map (the one rule, six instances)

Per `STATES-deck-statuses.md`, **corrected 2026-09-14 to the shipped component**. Pill fill is the
status colour mixed into `--bg` — 18%, with Draft at 16% and Building at 14% — and the border is
`1px var(--border-strong)` for every status, solid except Building's dash. The label is a **per
value** token: the status colour for four of them, and `--fg-muted` on Draft.

The `80` alpha (50%) border this paragraph used to specify was retired by the art-wash readability
amendment and **ratified 2026-09-08**, because a 50% fade of the status colour was the worst-reading
edge in that report. Building's dash survives that retirement: a line style is not an alpha fade,
and it is the one status signal that survives greyscale and colour blindness.

| Status | Token | Pill fill | Pill border | Pill label | Bar fill | List keyline |
|---|---|---|---|---|---|---|
| Draft | `var(--fg-faint)` | `--fg-faint` @ 16% (drawn `rgba(142,130,105,0.16)`) | `var(--border-strong)` hairline (drawn `#3A3229`) | `var(--fg-muted)` (drawn `#A89B84`) | — (empty track) | `var(--fg-faint)` |
| Building | `var(--fg-body)` | `--fg-body` @ 14% | `var(--border-strong)`, **dashed** | `var(--fg-body)` | `var(--fg-body)`, proportional | `var(--fg-body)` |
| Over | `var(--danger)` | `--danger` @ 18% | `var(--border-strong)`, solid | `var(--danger)` | `var(--danger)`, 100% | `var(--danger)` |
| Unresolved | `var(--warning)` | `--warning` @ 18% | `var(--border-strong)`, solid | `var(--warning)` | `var(--warning)`, 100% | `var(--warning)` |
| To buy | `var(--accent)` | `--accent` @ 18% | `var(--border-strong)`, solid | `var(--accent)` | `var(--accent)`, 100% | `var(--accent)` |
| Complete | `var(--success)` | `--success` @ 18% | `var(--border-strong)`, solid | `var(--success)` | `var(--success)`, 100% | `var(--success)` |

**Corrected 2026-09-14.** Four of those border cells read `--danger` / `--warning` / `--accent` /
`--success` @ 50%, and Building's read `var(--border-dashed)`; both were retired by the art-wash
readability amendment, ratified 2026-09-08. Every status takes `var(--border-strong)` now, and
Building's dash is a `border-style` rather than a second border token.

The drawn `rgba(…)` values are dropped with them rather than re-derived: the fill is
`color-mix(in srgb, var(--token) N%, var(--bg))`, which resolves per theme, so a single rgba triple
was only ever true of one of the six.

Two exceptions survive, and they are fills and labels rather than borders: **Draft** at 16% with a
`--fg-muted` label, and **Building** at 14%. Both are statuses whose own token is a text colour.

---

## Component: DecksPage — content column

### Root content column (right of the rail)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| flex-direction | column | column |
| flex | — | auto |
| min-width | — | 0 |
| background | var(--bg) (`#14110E`) | var(--bg) (`#14110E`) |
| font-family | var(--font-sans) (`IBM Plex Sans`) | var(--font-sans) (`IBM Plex Sans`) |
| color | var(--fg) (`#EDE6D8`) | var(--fg) (`#EDE6D8`) |

### Grid / list region wrapper

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| flex-direction | column | row |
| flex | auto | auto |
| min-height | 0 | 0 |

Desktop: the filter column is the first child (fixed 262px), the grid is the second (flex auto).
Mobile: there is no persistent filter column — filtering lives in the sheet.

---

## Component: DecksHeader

### Header bar

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 10 | 12 |
| padding-top | 16 | 16 |
| padding-right | 16 | 22 |
| padding-bottom | 0 | 16 |
| padding-left | 16 | 22 |
| border-bottom-width | — | 1 |
| border-bottom-style | — | solid |
| border-bottom-color | — | `#211C16` (divider) |

### Title

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | var(--font-display) (`Cinzel`) | var(--font-display) (`Cinzel`) |
| font-weight | 700 | 700 |
| font-size | 22 | 20 |
| color | var(--fg) (`#EDE6D8`) | var(--fg) (`#EDE6D8`) |
| copy key | `decks.title` | `decks.title` |

### Result count

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | var(--font-mono) (`IBM Plex Mono`) | var(--font-mono) (`IBM Plex Mono`) |
| font-size | 10.5 | 11 |
| color | var(--fg-faint) (`#8E8269`) | var(--fg-faint) (`#8E8269`) |
| copy key | `decks.shown(shown, total)` | `decks.shown(shown, total)` |
| conditional | hidden in the zero-deck state | hidden in the zero-deck state |

Contract (`STATES-deck-statuses.md` §Filtering, `copy strings` note): this figure **must always
equal the number of cards rendered**. If they disagree the count is the bug.

### Spacer

| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | auto | auto |

### View toggle (grid / list) — desktop only

| Property | Mobile | Desktop |
|----------|--------|---------|
| conditional | not rendered | rendered |
| display | — | flex |
| border-width | — | 1 |
| border-style | — | solid |
| border-color | — | `#2E2822` (unmapped) |
| border-radius | — | 8 |
| overflow | — | hidden |

#### Segment — active (grid)

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 32 |
| height | — | 32 |
| display | — | flex |
| align-items | — | center |
| justify-content | — | center |
| background | — | `#241F18` (~`var(--elevated)`) |
| color | — | var(--fg) (`#EDE6D8`) |

#### Segment — inactive (list)

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 32 |
| height | — | 32 |
| display | — | flex |
| align-items | — | center |
| justify-content | — | center |
| border-left-width | — | 1 |
| border-left-style | — | solid |
| border-left-color | — | `#2E2822` |
| background | — | — |
| color | — | var(--fg-muted) (`#A89B84`) |

#### SVG — grid icon

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 15 |
| height | — | 15 |
| viewBox | — | `0 0 20 20` |
| fill | — | none |
| stroke | — | currentColor |
| stroke-width | — | 1.6 |
| stroke-linecap | — | round |
| stroke-linejoin | — | — |
| shapes | — | `<rect x=3 y=3 w=6 h=6 rx=1>`, `<rect x=11 y=3 w=6 h=6 rx=1>`, `<rect x=3 y=11 w=6 h=6 rx=1>`, `<rect x=11 y=11 w=6 h=6 rx=1>` |

#### SVG — list icon

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 15 |
| height | — | 15 |
| viewBox | — | `0 0 20 20` |
| fill | — | none |
| stroke | — | currentColor |
| stroke-width | — | 1.6 |
| stroke-linecap | — | round |
| path d | — | `M4 5.5h12M4 10h12M4 14.5h12` |

### Sort trigger — desktop only

| Property | Mobile | Desktop |
|----------|--------|---------|
| conditional | **not drawn on phone** (see Ambiguities) | rendered |
| display | — | flex |
| align-items | — | center |
| height | — | 32 |
| padding-left | — | 13 |
| padding-right | — | 13 |
| padding-top | — | 0 |
| padding-bottom | — | 0 |
| border-width | — | 1 |
| border-style | — | solid |
| border-color | — | var(--border-strong) (`#3A3229`) |
| border-radius | — | 8 |
| font-size | — | 12.5 |
| font-family | — | var(--font-sans) |
| color | — | var(--fg-body) (`#C6B79A`) |
| background | — | — |
| copy key | — | `decks.sort(by)` — single argument, the sort name |

### Import button

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | second in a full-width pair under the header row | in the header row, immediately left of New deck |
| display | flex | flex |
| align-items | center | center |
| justify-content | center | — |
| flex | auto | none |
| height | 44 | 32 |
| padding-left | 0 | 13 |
| padding-right | 0 | 13 |
| border-width | 1 | 1 |
| border-style | solid | solid |
| border-color | var(--border-strong) (`#3A3229`) | var(--border-strong) (`#3A3229`) |
| border-radius | 10 | 8 |
| font-size | 14 | 12.5 |
| font-weight | 400 | 400 |
| color | var(--fg) (`#EDE6D8`) | var(--fg) (`#EDE6D8`) |
| background | — | — |
| copy key | `decks.importLong` | `decks.importShort` |

### New deck button (the one filled button on the screen)

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | first in the full-width pair under the header row | last in the header row |
| display | flex | flex |
| align-items | center | center |
| justify-content | center | — |
| flex | auto | none |
| height | 44 | 32 |
| padding-left | 0 | 14 |
| padding-right | 0 | 14 |
| border-radius | 10 | 8 |
| border-width | 0 | 0 |
| background | var(--fg) (`#EDE6D8`) | var(--fg) (`#EDE6D8`) |
| color | var(--bg) (`#14110E`) | var(--bg) (`#14110E`) |
| font-size | 14 | 12.5 |
| font-weight | 600 | 600 |
| copy key | `decks.newDeck` | `decks.newDeck` |

### Phone action row (wrapper for New deck + Import)

| Property | Mobile | Desktop |
|----------|--------|---------|
| conditional | rendered | not rendered |
| display | flex | — |
| gap | 8 | — |
| padding-top | 12 | — |
| padding-right | 16 | — |
| padding-bottom | 0 | — |
| padding-left | 16 | — |
| order | New deck first, Import second | — |

### Phone search icon button

| Property | Mobile | Desktop |
|----------|--------|---------|
| conditional | rendered (search lives in the sheet; this opens it) | not rendered — search sits at the top of the filter column |
| width | 36 | — |
| height | 36 | — |
| display | flex | — |
| align-items | center | — |
| justify-content | center | — |
| border-width | 1 | — |
| border-style | solid | — |
| border-color | var(--border-strong) (`#3A3229`) | — |
| border-radius | 10 | — |
| color | var(--fg-body) (`#C6B79A`) | — |

#### SVG — search icon (phone header)

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 16 | — |
| height | 16 | — |
| viewBox | `0 0 20 20` | — |
| fill | none | — |
| stroke | currentColor | — |
| stroke-width | 1.6 | — |
| stroke-linecap | round | — |
| circle | `cx=9 cy=9 r=5.4` | — |
| path d | `m13.2 13.2 3.3 3.3` | — |

### Phone filter trigger — active state (n filters on)

| Property | Mobile | Desktop |
|----------|--------|---------|
| conditional | rendered when the phone layout is in use | not rendered |
| height | 36 | — |
| display | flex | — |
| align-items | center | — |
| gap | 7 | — |
| padding-left | 12 | — |
| padding-right | 12 | — |
| border-width | 1 | — |
| border-style | solid | — |
| border-color | var(--accent) (`#C9A24B`) | — |
| border-radius | 10 | — |
| font-size | 13 | — |
| color | var(--fg) (`#EDE6D8`) | — |

#### Filter trigger badge

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | var(--font-mono) | — |
| font-size | 10 | — |
| color | var(--bg) (`#14110E`) | — |
| background | var(--accent) (`#C9A24B`) | — |
| border-radius | 4 | — |
| padding-top | 1 | — |
| padding-bottom | 1 | — |
| padding-left | 5 | — |
| padding-right | 5 | — |
| copy key | `filters.triggerBadge(n)` — counts **active filters**, not matching decks | — |
| conditional | present only when active filter count > 0 | — |

Inactive-state styling of the trigger (0 filters on) is **not drawn**. See Ambiguities.

### Phone active-filter chip row

| Property | Mobile | Desktop |
|----------|--------|---------|
| conditional | rendered when ≥1 filter is active | not rendered |
| display | flex | — |
| gap | 7 | — |
| flex-wrap | wrap | — |
| padding-top | 12 | — |
| padding-right | 16 | — |
| padding-bottom | 0 | — |
| padding-left | 16 | — |

#### Chip

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | — |
| align-items | center | — |
| gap | 7 | — |
| height | 28 | — |
| padding-left | 10 | — |
| padding-right | 10 | — |
| border-radius | 999 | — |
| border-width | 0 | — |
| background | `#241F18` (~`var(--elevated)`) | — |
| font-family | var(--font-mono) | — |
| font-size | 11 | — |
| color | var(--fg-body) (`#C6B79A`) | — |
| aria | `filters.chipRemoveAria(label)` | — |

#### Chip remove glyph

| Property | Mobile | Desktop |
|----------|--------|---------|
| character | `×` | — |
| color | var(--fg-faint) (`#8E8269`) | — |

#### Chip-row Clear

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | — |
| align-items | center | — |
| height | 28 | — |
| padding-left | 10 | — |
| padding-right | 10 | — |
| border-width | 0 | — |
| background | — | — |
| font-family | var(--font-mono) | — |
| font-size | 11 | — |
| color | var(--fg-muted) (`#A89B84`) | — |
| copy key | `filters.clear` | — |

---

## Component: FilterColumn (desktop only)

Not rendered below 640px. The equivalent surface is `FilterSheet`.

### Column root

| Property | Mobile | Desktop |
|----------|--------|---------|
| conditional | not rendered | rendered |
| width | — | 262 |
| flex | — | none |
| border-right-width | — | 1 |
| border-right-style | — | solid |
| border-right-color | — | `#211C16` (divider) |
| background | — | `#171310` (~`var(--surface-rail)`) |
| display | — | flex |
| flex-direction | — | column |

### Search block wrapper

| Property | Mobile | Desktop |
|----------|--------|---------|
| padding-top | — | 14 |
| padding-right | — | 16 |
| padding-bottom | — | 12 |
| padding-left | — | 16 |
| border-bottom-width | — | 1 |
| border-bottom-style | — | solid |
| border-bottom-color | — | `#211C16` |

### Search field

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| align-items | — | center |
| gap | — | 9 |
| height | — | 34 |
| padding-left | — | 11 |
| padding-right | — | 11 |
| background | — | `#100D0A` (sunken well) |
| border-width | — | 1 |
| border-style | — | solid |
| border-color | — | var(--border-strong) (`#3A3229`) |
| border-radius | — | 8 |
| color | — | var(--fg-faint) (`#8E8269`) |
| placeholder font-size | — | 12.5 |
| copy key | — | `filters.searchPlaceholder` |

#### SVG — search icon (desktop column)

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 14 |
| height | — | 14 |
| viewBox | — | `0 0 20 20` |
| fill | — | none |
| stroke | — | currentColor |
| stroke-width | — | 1.6 |
| stroke-linecap | — | round |
| circle | — | `cx=9 cy=9 r=5.4` |
| path d | — | `m13.2 13.2 3.3 3.3` |

### Scroll body

| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | — | auto |
| min-height | — | 0 |

### Group heading — Status (first group)

| Property | Mobile | Desktop |
|----------|--------|---------|
| padding-top | — | 13 |
| padding-right | — | 16 |
| padding-bottom | — | 7 |
| padding-left | — | 16 |
| font-family | — | var(--font-mono) |
| font-size | — | 10 |
| letter-spacing | — | 0.14em |
| text-transform | — | uppercase |
| color | — | var(--fg-faint) (`#8E8269`) |
| border-top | — | — |
| margin-top | — | — |
| copy key | — | `filters.statusHeading` |

### Group heading — Colour identity

| Property | Mobile | Desktop |
|----------|--------|---------|
| padding-top | — | 14 |
| padding-right | — | 16 |
| padding-bottom | — | 7 |
| padding-left | — | 16 |
| font-family | — | var(--font-mono) |
| font-size | — | 10 |
| letter-spacing | — | 0.14em |
| text-transform | — | uppercase |
| color | — | var(--fg-faint) (`#8E8269`) |
| border-top-width | — | 1 |
| border-top-style | — | solid |
| border-top-color | — | `#211C16` |
| margin-top | — | 12 |
| copy key | — | `filters.colourHeading` |

### Group heading — Last played

| Property | Mobile | Desktop |
|----------|--------|---------|
| padding-top | — | 14 |
| padding-right | — | 16 |
| padding-bottom | — | 7 |
| padding-left | — | 16 |
| font-family | — | var(--font-mono) |
| font-size | — | 10 |
| letter-spacing | — | 0.14em |
| text-transform | — | uppercase |
| color | — | var(--fg-faint) (`#8E8269`) |
| border-top-width | — | 1 |
| border-top-style | — | solid |
| border-top-color | — | `#211C16` |
| margin-top | — | 14 |
| copy key | — | `filters.lastPlayedHeading` |

### Status filter row — ON (all six drawn in this state)

All six statuses render as rows **whether or not any deck holds that value**
(`STATES-deck-statuses.md` §Filtering). **No per-row counts.**

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| align-items | — | center |
| gap | — | 10 |
| height | — | 32 |
| padding-left | — | 16 |
| padding-right | — | 16 |
| padding-top | — | 0 |
| padding-bottom | — | 0 |
| font-size | — | 13 |
| font-family | — | var(--font-sans) |
| color | — | var(--fg) (`#EDE6D8`) |
| background | — | var(--surface) (`#1E1A15`) |
| border-left-width | — | 3 |
| border-left-style | — | solid |
| border-left-color | — | the status token (below) |
| copy key | — | `status.draft` … `status.complete` |

#### Per-status border-left-color

| Status | Mobile | Desktop |
|---|---|---|
| Draft | — | var(--fg-faint) (`#8E8269`) |
| Building | — | var(--fg-body) (`#C6B79A`) |
| Over | — | var(--danger) (`#C6533F`) |
| Unresolved | — | var(--warning) (`#E0913C`) |
| To buy | — | var(--accent) (`#C9A24B`) |
| Complete | — | var(--success) (`#6FA368`) |

### Status filter row — OFF

Not drawn for status rows. Inferred from the Last-played rows (same geometry, unselected):
`background: —`, `color: var(--fg-body)`, `border-left: —`. **Flagged as underspecified.**

### Colour identity swatch row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| gap | — | 6 |
| padding-left | — | 16 |
| padding-right | — | 16 |
| padding-top | — | 0 |
| padding-bottom | — | 0 |
| flex-wrap | — | — |

#### Swatch — OFF (all five drawn off)

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 28 |
| height | — | 28 |
| border-radius | — | 7 |
| border-width | — | 1 |
| border-style | — | solid |
| border-color | — | var(--border-strong) (`#3A3229`) |
| background W | — | var(--w) (`#E8E4D6`) |
| background U | — | var(--u) (`#4A7FB5`) |
| background B | — | var(--b) (`#5B5566`) |
| background R | — | var(--r) (`#C05A48`) |
| background G | — | var(--g) (`#6B9E63`) |

Swatch ON not drawn on desktop; the sheet's ON state is `border-color: var(--fg)`.

### Last played filter row — OFF (both drawn off)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| align-items | — | center |
| gap | — | 10 |
| height | — | 32 |
| padding-left | — | 16 |
| padding-right | — | 16 |
| font-size | — | 13 |
| color | — | var(--fg-body) (`#C6B79A`) |
| background | — | — |
| border-left | — | — |
| copy keys | — | `filters.lastPlayedThisMonth`, `filters.lastPlayedNever` |

### Column footer

| Property | Mobile | Desktop |
|----------|--------|---------|
| padding-top | — | 12 |
| padding-right | — | 16 |
| padding-bottom | — | 12 |
| padding-left | — | 16 |
| border-top-width | — | 1 |
| border-top-style | — | solid |
| border-top-color | — | `#211C16` |
| display | — | flex |
| align-items | — | center |
| gap | — | 10 |

#### Footer summary label

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | var(--font-mono) |
| font-size | — | 11 |
| color | — | var(--fg-faint) (`#8E8269`) |
| copy key | — | `filters.allOn` when every status is on; `filters.someOn(n)` otherwise |

#### Footer Clear button

| Property | Mobile | Desktop |
|----------|--------|---------|
| margin-left | — | auto |
| display | — | flex |
| align-items | — | center |
| height | — | 32 |
| padding-left | — | 13 |
| padding-right | — | 13 |
| border-width | — | 1 |
| border-style | — | solid |
| border-color | — | var(--border-strong) (`#3A3229`) |
| border-radius | — | 8 |
| font-size | — | 12.5 |
| color | — | var(--fg) (`#EDE6D8`) |
| copy key | — | `filters.clear` |

**There is no Apply.** Ticking a filter re-filters immediately; Clear is the only commitment
control (README §5, READINESS "Live filtering — Closed").

---

## Component: FilterSheet (mobile only)

### Scrim

| Property | Mobile | Desktop |
|----------|--------|---------|
| conditional | rendered while the sheet is open | not rendered |
| position | absolute | — |
| inset | 0 | — |
| background | `rgba(16,13,10,0.74)` | — |

### Sheet panel

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | relative (bottom-anchored; parent `justify-content: flex-end`) | — |
| background | var(--surface-inset) (`#1B1712`) | — |
| border-top-width | 1 | — |
| border-top-style | solid | — |
| border-top-color | var(--border-strong) (`#3A3229`) | — |
| border-radius | 22 22 0 0 | — |
| padding-top | 12 | — |
| padding-right | 16 | — |
| padding-bottom | 16 | — |
| padding-left | 16 | — |
| display | flex | — |
| flex-direction | column | — |
| gap | 14 | — |

### Grabber

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 38 | — |
| height | 4 | — |
| border-radius | 2 | — |
| background | var(--border-strong) (`#3A3229`) | — |
| align-self | center | — |

### Sheet title row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | — |
| align-items | baseline | — |
| gap | 10 | — |

#### Sheet title

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | var(--font-display) (`Cinzel`) | — |
| font-weight | 600 | — |
| font-size | 18 | — |
| color | var(--fg) (`#EDE6D8`) | — |
| copy key | `filters.sheetTitle` | — |

#### Sheet match count

| Property | Mobile | Desktop |
|----------|--------|---------|
| margin-left | auto | — |
| font-family | var(--font-mono) | — |
| font-size | 11 | — |
| color | var(--fg-faint) (`#8E8269`) | — |
| copy key | `filters.sheetMatch(shown, total)` | — |

### Sheet search field

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | — |
| align-items | center | — |
| gap | 9 | — |
| height | 44 | — |
| padding-left | 12 | — |
| padding-right | 12 | — |
| background | `#100D0A` | — |
| border-width | 1 | — |
| border-style | solid | — |
| border-color | var(--border-strong) (`#3A3229`) | — |
| border-radius | 10 | — |
| color | var(--fg-faint) (`#8E8269`) | — |
| placeholder font-size | 13.5 | — |
| copy key | `filters.searchPlaceholder` | — |

#### SVG — search icon (sheet)

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 16 | — |
| height | 16 | — |
| viewBox | `0 0 20 20` | — |
| fill | none | — |
| stroke | currentColor | — |
| stroke-width | 1.6 | — |
| stroke-linecap | round | — |
| circle | `cx=9 cy=9 r=5.4` | — |
| path d | `m13.2 13.2 3.3 3.3` | — |

### Sheet group heading (Status / Colour identity / Last played)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | var(--font-mono) | — |
| font-size | 10 | — |
| letter-spacing | 0.14em | — |
| text-transform | uppercase | — |
| color | var(--fg-faint) (`#8E8269`) | — |
| margin-bottom | 9 | — |
| copy keys | `filters.statusHeading`, `filters.colourHeading`, `filters.lastPlayedHeading` | — |

### Sheet chip container

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | — |
| gap | 8 | — |
| flex-wrap | wrap (Status, Last played) | — |

### Status chip — OFF

| Property | Mobile | Desktop |
|----------|--------|---------|
| height | 36 | — |
| display | flex | — |
| align-items | center | — |
| padding-left | 12 | — |
| padding-right | 12 | — |
| border-radius | 999 | — |
| border-width | 1 | — |
| border-style | solid | — |
| border-color | var(--border-strong) (`#3A3229`) | — |
| background | — | — |
| font-size | 13 | — |
| color | var(--fg-body) (`#C6B79A`) | — |

### Status chip — ON

| Property | Mobile | Desktop |
|----------|--------|---------|
| height | 36 | — |
| display | flex | — |
| align-items | center | — |
| padding-left | 12 | — |
| padding-right | 12 | — |
| border-radius | 999 | — |
| border-width | 1 | — |
| border-style | solid | — |
| border-color | the status token — Building `var(--fg-body)` (`#C6B79A`), To buy `var(--accent)` (`#C9A24B`) | — |
| background | the status token at 14–16% — Building `rgba(198,183,154,0.14)`, To buy `rgba(201,162,75,0.16)` | — |
| font-size | 13 | — |
| color | var(--fg) (`#EDE6D8`) | — |

### Colour swatch (sheet)

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 44 | — |
| height | 44 | — |
| border-radius | 11 | — |
| border-width | 1 | — |
| border-style | solid | — |
| border-color OFF | var(--border-strong) (`#3A3229`) | — |
| border-color ON | var(--fg) (`#EDE6D8`) | — |
| background | var(--w)/(--u)/(--b)/(--r)/(--g) as above | — |
| container gap | 8 | — |
| container flex-wrap | — (no wrap; five 44px swatches fit 390px) | — |

### Last played chip

Identical geometry and both-state styling to the Status chip. Both drawn OFF.

### Sheet footer

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | — |
| align-items | center | — |
| gap | 10 | — |

#### Dismiss button ("Show N decks")

| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | auto | — |
| display | flex | — |
| align-items | center | — |
| justify-content | center | — |
| height | 44 | — |
| border-radius | 10 | — |
| border-width | 0 | — |
| background | var(--fg) (`#EDE6D8`) | — |
| color | var(--bg) (`#14110E`) | — |
| font-size | 14 | — |
| font-weight | 600 | — |
| copy key | `filters.sheetDismiss(n)` | — |
| behaviour | dismiss only — filtering already happened; swiping the sheet away loses nothing | — |

#### Sheet Clear

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | — |
| align-items | center | — |
| height | 44 | — |
| padding-left | 14 | — |
| padding-right | 14 | — |
| border-width | 0 | — |
| background | — | — |
| font-size | 14 | — |
| color | var(--fg-muted) (`#A89B84`) | — |
| copy key | `filters.clear` | — |

---

## Component: DeckGrid

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | grid |
| flex-direction | column | — |
| grid-template-columns | — | `repeat(3, 1fr)` |
| gap | 12 | 14 |
| align-content | — | start |
| flex | auto | auto |
| min-height | 0 | 0 |
| min-width | — | 0 |
| padding-top | 14 | 18 |
| padding-right | 16 | 22 |
| padding-bottom | 0 | 18 |
| padding-left | 16 | 22 |
| child flex | none (each card) | — |

---

## Component: DeckTile

### Tile root

| Property | Mobile | Desktop |
|----------|--------|---------|
| border-radius | 14 | 14 |
| overflow | hidden | hidden |
| background | var(--surface-inset) (`#1B1712`) | var(--surface-inset) (`#1B1712`) |
| border-width | 1 | 1 |
| border-style | solid | solid |
| border-color | `#2A241D` (~`var(--border)`) | `#2A241D` (~`var(--border)`) |
| position | — | relative (only when the overflow menu is open) |
| flex | none | — |
| target | the whole tile opens the builder — **no CTA button** | the whole tile opens the builder — **no CTA button** |
| aria-label | `decks.cardAria(name, status, count, detail)` | `decks.cardAria(name, status, count, detail)` |

### Art header

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | relative | relative |
| height | 124 | 118 |
| background | commander art, cropped to the illustration (drawn as a gradient stand-in) | commander art, cropped to the illustration |
| conditional | **always present** — `decks.commander_oracle_id` is NOT NULL, so every tile has art, Draft included | same |

### Art scrim

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | absolute |
| inset | 0 | 0 |
| background | `linear-gradient(180deg, rgba(20,17,14,0.1), rgba(27,23,18,0.96))` — i.e. `var(--bg)` @10% → `var(--surface-inset)` @96% | same |

### Status pill

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | absolute |
| top | 10 | 10 |
| left | 11 | 11 |
| display | flex | flex |
| align-items | center | center |
| height | 24 | 22 |
| padding-left | 9 | 8 |
| padding-right | 9 | 8 |
| border-radius | 6 | 6 |
| border-width | 1 | 1 |
| border-style | solid | solid |
| border-color | per status (see Status → token map) | per status |
| background | per status (18% fill; Draft 16%, Building 14%) | per status |
| color | per status | per status |
| font-family | var(--font-mono) | var(--font-mono) |
| font-size | 11 | 10.5 |
| copy key | `status.<value>` | `status.<value>` |

### Overflow (`…`) trigger — closed

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | absolute |
| top | 8 | 10 |
| right | 8 | 10 |
| width | 44 | 26 |
| height | 44 | 26 |
| display | flex | flex |
| align-items | center | center |
| justify-content | center | center |
| border-radius | — | 7 |
| border-width | 0 | 0 |
| background | — (no plate) | `rgba(20,17,14,0.7)` — `var(--bg)` @70% |
| font-family | var(--font-mono) | var(--font-mono) |
| font-size | 13 | 11 |
| color | var(--fg) (`#EDE6D8`) | var(--fg-body) (`#C6B79A`) |
| glyph | `…` (`&hellip;`) | `…` (`&hellip;`) |
| aria-label | `decks.menu.trigger(deckName)` | `decks.menu.trigger(deckName)` |

### Overflow (`…`) trigger — open

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | not drawn | `#241F18` (~`var(--elevated)`) |
| border-width | not drawn | 1 |
| border-style | not drawn | solid |
| border-color | not drawn | var(--border-strong) (`#3A3229`) |
| color | not drawn | var(--fg) (`#EDE6D8`) |
| border-radius | not drawn | 7 |
| width / height | not drawn | 26 / 26 |

### Deck name (over the scrim, bottom of the art header)

| Property | Mobile | Desktop |
|----------|--------|---------|
| wrapper position | absolute; left 0, right 0, bottom 0 | absolute; left 0, right 0, bottom 0 |
| wrapper padding-top | 0 | 0 |
| wrapper padding-right | 13 | 13 |
| wrapper padding-bottom | 10 | 10 |
| wrapper padding-left | 13 | 13 |
| font-family | var(--font-display) (`Cinzel`) | var(--font-display) (`Cinzel`) |
| font-weight | 600 | 600 |
| font-size | 17 | 15 |
| color | var(--fg) (`#EDE6D8`) | var(--fg) (`#EDE6D8`) |
| white-space | nowrap | nowrap |
| overflow | hidden | hidden |
| text-overflow | ellipsis | ellipsis |
| line clamp | one line | one line |

### Tile body

| Property | Mobile | Desktop |
|----------|--------|---------|
| padding-top | 11 | 11 |
| padding-right | 13 | 13 |
| padding-bottom | 13 | 13 |
| padding-left | 13 | 13 |

### Meta row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 8 | 8 |
| contents | pips · **status detail figure** · count (right) | pips · **colour label** · count (right) |

### Colour pip group

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| gap | 3 | 3 |
| conditional | wrapper `<span display:flex>` used when ≥2 colours; a single pip renders bare | same |

#### Pip

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 9 | 9 |
| height | 9 | 9 |
| border-radius | 2 | 2 |
| background | var(--w)/(--u)/(--b)/(--r)/(--g) | var(--w)/(--u)/(--b)/(--r)/(--g) |
| border-width | 1 (`STATES` §5: each pip carries a `--border-strong` hairline so `--b` survives a light ground) | 1 |
| border-color | var(--border-strong) | var(--border-strong) |

Note: the hairline is specified in `STATES-deck-statuses.md` but **not drawn** in the HTML frames.
The spec text wins.

### Colour label — desktop only

| Property | Mobile | Desktop |
|----------|--------|---------|
| conditional | **not rendered** — its slot carries the detail figure instead | rendered |
| font-family | — | var(--font-mono) |
| font-size | — | 10.5 |
| color | — | var(--fg-faint) (`#8E8269`) |
| values drawn | — | `4-colour`, `Mono-red`, `Dimir`, `Grixis`, `Simic`, `5-colour` |

### Count with denominator

| Property | Mobile | Desktop |
|----------|--------|---------|
| margin-left | auto | auto |
| font-family | var(--font-mono) | var(--font-mono) |
| font-size | 12.5 | 12 |
| font-variant-numeric | tabular-nums | tabular-nums |
| color (Draft) | var(--fg-muted) (`#A89B84`) | var(--fg-muted) (`#A89B84`) |
| color (all other statuses) | var(--fg) (`#EDE6D8`) | var(--fg) (`#EDE6D8`) |
| text-align | right | right |
| format | `<matched> / 99` — always with denominator, never a percentage | same |

### Progress bar — track

| Property | Mobile | Desktop |
|----------|--------|---------|
| height | 3 | 3 |
| border-radius | 2 | 2 |
| background | `#2A241D` (~`var(--border)`) | `#2A241D` (~`var(--border)`) |
| margin-top | 10 | 9 |
| margin-right | 0 | 0 |
| margin-bottom | 0 | 0 |
| margin-left | 0 | 0 |
| position | relative (omit when there is no fill) | relative (omit when there is no fill) |

### Progress bar — fill

| Property | Mobile | Desktop |
|----------|--------|---------|
| conditional | omitted entirely for **Draft** (empty track) | omitted entirely for **Draft** |
| position | absolute | absolute |
| left | 0 | 0 |
| top | 0 | 0 |
| bottom | 0 | 0 |
| width | 100% for Over / Unresolved / To buy / Complete; proportional (`matched/99`, drawn 88% for 87/99) for Building | same |
| background | the status token | the status token |
| border-radius | 2 | 2 |

### Detail row — desktop only

| Property | Mobile | Desktop |
|----------|--------|---------|
| conditional | **not rendered as its own row** — the detail figure moves into the meta row and last-played is dropped | rendered |
| display | — | flex |
| align-items | — | center |
| gap | — | 8 |
| margin-top | — | 9 |

#### Detail figure (the one figure that explains the status)

| Property | Mobile | Desktop |
|----------|--------|---------|
| location | meta row, between pips and count | detail row, left |
| font-family | var(--font-mono) | var(--font-mono) |
| font-size | 11 | 10.5 |
| color (To buy) | var(--fg-faint) (`#8E8269`) | var(--fg-faint) (`#8E8269`) |
| color (Complete) | var(--fg-faint) | var(--fg-faint) |
| color (Draft) | var(--fg-faint) | var(--fg-faint) |
| color (Unresolved) | var(--warning) (`#E0913C`) | var(--warning) (`#E0913C`) |
| color (Over) | var(--danger) (`#C6533F`) | var(--danger) (`#C6533F`) |
| color (in-use-elsewhere clause) | var(--accent) (`#C9A24B`) | var(--accent) (`#C9A24B`) |
| copy keys | `decks.detailToBuy(n, cost)` · `decks.detailComplete` · `decks.detailUnresolved(n)` · `decks.detailOver(n)` · `decks.detailDraft` · `decks.detailInUseElsewhere(n)` | same |

#### Last played — desktop only

| Property | Mobile | Desktop |
|----------|--------|---------|
| conditional | **not rendered on phone tiles**; on desktop, omitted for the Draft tile (its detail row carries `created today` alone) | rendered |
| margin-left | — | auto |
| font-family | — | var(--font-mono) |
| font-size | — | 10.5 |
| color | — | var(--fg-faint) (`#8E8269`) |
| text-align | — | right |
| copy key | — | pre-formatted relative date; `decks.lastPlayedNever` when the deck has never been played |

---

## Component: DeckTileOverflowMenu (desktop drawn; phone trigger drawn, menu not)

### Menu panel

| Property | Mobile | Desktop |
|----------|--------|---------|
| conditional | menu surface **not drawn** for phone | rendered when the `…` is open |
| position | — | absolute |
| top | — | 40 |
| right | — | 10 |
| width | — | 186 |
| background | — | var(--surface) (`#1E1A15`) |
| border-width | — | 1 |
| border-style | — | solid |
| border-color | — | var(--border-strong) (`#3A3229`) |
| border-radius | — | 10 |
| box-shadow | — | `0 22px 50px rgba(0,0,0,0.6)` |
| overflow | — | hidden |

### Menu item

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| align-items | — | center |
| height | — | 38 |
| padding-left | — | 13 |
| padding-right | — | 13 |
| font-size | — | 13 |
| font-family | — | var(--font-sans) |
| color | — | var(--fg) (`#EDE6D8`) |
| border-top-width | — | 1 (items 2 and 3 only) |
| border-top-style | — | solid |
| border-top-color | — | `#241F18` |

### Menu item — Delete (last, danger)

| Property | Mobile | Desktop |
|----------|--------|---------|
| color | — | var(--danger) (`#C6533F`) |
| order | — | third and last |
| border-top-color | — | `#241F18` |

Items, in this order and no others: `decks.menu.updateFromList`, `decks.menu.rename`,
`decks.menu.delete`. Trigger accessible name: `decks.menu.trigger(deckName)`.

---

## Component: DecksZeroState (no decks yet)

Distinct from the filtered empty. Triggered when the player has **zero decks**, regardless of
filters.

### Header at zero

| Property | Mobile | Desktop |
|----------|--------|---------|
| contents | Title + spacer + account avatar. **New deck and Import are not drawn in the phone zero header** (see Ambiguities) | Title + spacer + Import + New deck |
| result count | not rendered | not rendered |
| sort trigger | not rendered | not rendered |
| view toggle | not rendered | not rendered |
| filter trigger / column | not rendered | not rendered |
| padding | 16 / 16 / 0 / 16 | 16 / 22 / 16 / 22 |
| border-bottom | — | 1px solid `#211C16` |
| title font-size | 22 | 20 |
| title font-weight | 700 | 700 |
| title font-family | var(--font-display) | var(--font-display) |

### Zero-state body

| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | auto | auto |
| min-height | 0 | 0 |
| display | flex | flex |
| flex-direction | column | column |
| align-items | center | center |
| justify-content | center | center |
| text-align | center | center |
| padding-top | 24 | 26 |
| padding-right | 22 | 40 |
| padding-bottom | 24 | 26 |
| padding-left | 22 | 40 |
| gap | 15 | 16 |

### Card-fan mark — container

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 118 | 130 |
| height | 100 | 110 |
| position | relative | relative |

### Card-fan mark — back card (left, rotated)

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | absolute |
| left | 12 | 14 |
| top | 16 | 18 |
| width | 56 | 62 |
| height | 76 | 84 |
| border-radius | 6 | 7 |
| border-width | 1 | 1 |
| border-color | var(--border-strong) (`#3A3229`) | var(--border-strong) (`#3A3229`) |
| background | var(--surface-inset) (`#1B1712`) | var(--surface-inset) (`#1B1712`) |
| transform | `rotate(-14deg)` | `rotate(-16deg)` |

### Card-fan mark — middle card

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | absolute |
| left | 28 | 32 |
| top | 11 | 13 |
| width | 56 | 62 |
| height | 76 | 84 |
| border-radius | 6 | 7 |
| border-width | 1 | 1 |
| border-color | var(--border-strong) (`#3A3229`) | var(--border-strong) (`#3A3229`) |
| background | `#211C16` (~`var(--surface-raised)`) | `#211C16` |
| transform | — | — |

### Card-fan mark — front card (accent, "99")

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | absolute |
| left | 44 | 50 |
| top | 16 | 18 |
| width | 56 | 62 |
| height | 76 | 84 |
| border-radius | 6 | 7 |
| border-width | 1 | 1 |
| border-color | var(--accent) (`#C9A24B`) | var(--accent) (`#C9A24B`) |
| background | var(--surface-inset) (`#1B1712`) | var(--surface-inset) (`#1B1712`) |
| transform | `rotate(14deg)` | `rotate(15deg)` |
| display | flex | flex |
| align-items | center | center |
| justify-content | center | center |
| label font-family | var(--font-display) (`Cinzel`) | var(--font-display) (`Cinzel`) |
| label font-weight | 700 | 700 |
| label font-size | 18 | 20 |
| label color | var(--accent) (`#C9A24B`) | var(--accent) (`#C9A24B`) |
| label text | `99` | `99` |

### Zero-state heading

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | var(--font-display) (`Cinzel`) | var(--font-display) (`Cinzel`) |
| font-weight | 700 | 700 |
| font-size | 22 | 25 |
| color | var(--fg) (`#EDE6D8`) | var(--fg) (`#EDE6D8`) |
| copy key | `zero.decksHeading` | `zero.decksHeading` |

### Zero-state body copy

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 13.5 | 14 |
| color | var(--fg-muted) (`#A89B84`) | var(--fg-muted) (`#A89B84`) |
| line-height | 1.65 | 1.65 |
| max-width | — | 430 |
| copy key | `zero.decksBodyShort` | `zero.decksBody` |

### Zero-state button group

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| flex-direction | column | row |
| gap | 9 | 10 |
| width | 100% | — |
| margin-top | 4 | 2 |

### Zero-state primary — Browse commanders

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| justify-content | center | — |
| height | 44 | 32 |
| padding-left | 0 | 14 |
| padding-right | 0 | 14 |
| border-radius | 10 | 8 |
| border-width | 0 | 0 |
| background | var(--fg) (`#EDE6D8`) | var(--fg) (`#EDE6D8`) |
| color | var(--bg) (`#14110E`) | var(--bg) (`#14110E`) |
| font-size | 14 | 12.5 |
| font-weight | 600 | 600 |
| copy key | `zero.browseCommanders` | `zero.browseCommanders` |

Primary status is justified by the buildable count being non-zero (`STATES` §Zero decks).

### Zero-state secondary — Import a deck

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| justify-content | center | — |
| height | 44 | 32 |
| padding-left | 0 | 13 |
| padding-right | 0 | 13 |
| border-width | 1 | 1 |
| border-style | solid | solid |
| border-color | var(--border-strong) (`#3A3229`) | var(--border-strong) (`#3A3229`) |
| border-radius | 10 | 8 |
| background | — | — |
| color | var(--fg) (`#EDE6D8`) | var(--fg) (`#EDE6D8`) |
| font-size | 14 | 12.5 |
| copy key | `zero.importDeck` | `zero.importDeck` |

### Zero-state buildable line

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | var(--font-mono) | var(--font-mono) |
| font-size | 11 | 11 |
| color | var(--fg-faint) (`#8E8269`) | var(--fg-faint) (`#8E8269`) |
| margin-top | — | 2 |
| copy key | `zero.buildableFrom(buildable, cards)` | `zero.buildableFrom(buildable, cards)` |
| conditional | **omit the whole line when `buildable === 0`** | same |

---

## Component: DecksFilteredEmpty (no decks match)

**Not drawn in any frame** — specified only in prose (`STATES-deck-statuses.md` §Zero decks,
`copy strings` §filters) and explicitly called out as distinct from the zero state.

| Property | Mobile | Desktop |
|----------|--------|---------|
| conditional | rendered when total decks > 0 and the filtered result is 0 | same |
| heading copy key | `filters.emptyHeading` | `filters.emptyHeading` |
| action copy key | `filters.emptyAction` (**Clear filters — the only route out**) | `filters.emptyAction` |
| illustration | **none** — "No apology, no illustration, one route out" | none |
| header | keeps its shape (count, sort, Import, New deck all remain) | keeps its shape |
| all other properties | **not specified** | **not specified** |

---

## Interactive states

| State | Mobile | Desktop |
|---|---|---|
| Tile hover | not drawn | **not drawn** |
| Tile focus | not drawn | not drawn |
| Button hover (any) | not drawn | not drawn |
| Button focus ring | not drawn | not drawn |
| Filter row hover | not drawn | not drawn |
| `…` trigger open | not drawn | `background: #241F18`, `border: 1px solid var(--border-strong)`, `color: var(--fg)` |
| Menu item hover | not drawn | not drawn |
| Filter trigger, 0 filters active | not drawn | n/a |
| Status filter row OFF (desktop column) | n/a | not drawn |
| Colour swatch ON (desktop column) | n/a | not drawn |
| Transitions / transforms | none specified anywhere on this surface (the only `transform`s are the static `rotate()` on the card-fan mark) | same |

Minimum touch target on phone is **44px** (READINESS "Mobile — Closed"): the `…` trigger, the
sheet search field, sheet chips, colour swatches, the New deck / Import pair and the sheet
buttons all meet it.

---

## State Coverage — DeckTile

| State | Triggering condition | Component rendered | Key props required |
|---|---|---|---|
| Draft | 0 cards matched | `DeckTile` with `status="draft"` | commander art, name, colour pips, `0 / 99` (in `--fg-muted`), **empty progress track — no fill element**, detail `decks.detailDraft`, **no last-played slot** |
| Building | 1–98 cards matched | `DeckTile` with `status="building"` | art, name, pips, `n / 99`, proportional fill in `var(--fg-body)`, detail figure, last played |
| Over | 100+ cards matched | `DeckTile` with `status="over"` | art, name, pips, `n / 99` (numerator > 99), full-width fill in `var(--danger)`, `decks.detailOver(n)` in `var(--danger)`, last played |
| Unresolved | 99 matched **and** at least one line unresolved | `DeckTile` with `status="unresolved"` | art, name, pips, `99 / 99`, full fill in `var(--warning)`, `decks.detailUnresolved(n)` in `var(--warning)`, last played |
| To buy | 99 matched, all lines resolved, **some card unowned** | `DeckTile` with `status="toBuy"` | art, name, pips, `99 / 99`, full fill in `var(--accent)`, `decks.detailToBuy(n, cost)` in `var(--fg-faint)`, last played |
| Complete | 99 matched, all lines resolved, **all owned** | `DeckTile` with `status="complete"` | art, name, pips, `99 / 99`, full fill in `var(--success)`, `decks.detailComplete`, last played |

Cross-cutting conditions on the tile:

| State | Triggering condition | Component rendered | Key props required |
|---|---|---|---|
| Commander art | **always** — `decks.commander_oracle_id` is NOT NULL | art header at 118 (desktop) / 124 (mobile) | commander art URL; there is no placeholder art block and no *no commander yet* string |
| In-use-elsewhere clause | `inUseElsewhere > 0` on that deck | detail-figure slot, in `var(--accent)` | `decks.detailInUseElsewhere(n)`; drawn on the Building tile in place of the ordinary detail figure |
| Never played | deck has no recorded play | last-played slot (desktop) | `decks.lastPlayedNever`; still `var(--fg-faint)`, no special colour |
| Overflow menu open | `…` activated | `DeckTileOverflowMenu` | deck name for `decks.menu.trigger(deckName)`; tile root gains `position: relative` |
| Mobile compaction | viewport < 640px | `DeckTile` | colour label and last played are **dropped**; the detail figure occupies the colour-label slot |

## State Coverage — Decks page

| State | Triggering condition | Component rendered | Key props required |
|---|---|---|---|
| Populated | total decks > 0, filtered result > 0 | header + filter surface + `DeckGrid` | `decks.shown(shown, total)` must equal the rendered card count |
| Filtered empty | total decks > 0, filtered result = 0 | `DecksFilteredEmpty` | `filters.emptyHeading`, `filters.emptyAction`; header keeps its shape |
| Zero decks | total decks = 0 | `DecksZeroState` | `zero.decksHeading`, `zero.decksBody` / `decksBodyShort`, `zero.browseCommanders`, `zero.importDeck`, `zero.buildableFrom(buildable, cards)` |
| Zero decks, zero buildable | total decks = 0 **and** `buildable === 0` | `DecksZeroState` | buildable line omitted entirely; Browse-commanders primacy is no longer justified by a figure (README/STATES do not restyle it — see Ambiguities) |
| Filters all on | every status ticked, no colour/last-played filter | filter column footer | `filters.allOn` |
| Filters partially on | 1..5 statuses ticked | filter column footer | `filters.someOn(n)` |
| Filter sheet open (phone) | filter trigger tapped | `FilterSheet` + scrim | `filters.sheetMatch(shown, total)`, `filters.sheetDismiss(n)` |
| Active filters (phone) | ≥1 filter on | chip row under the action row + accent badge on the trigger | `filters.triggerBadge(n)` (active-filter count), `filters.chipRemoveAria(label)` per chip |
| Loading | data pending | **not drawn** — READINESS "Loading states not re-checked" | keeps the shipped layout; one pass required before build |

## State Coverage — Filter rows

| State | Triggering condition | Component rendered | Key props required |
|---|---|---|---|
| Status row, always | for all six statuses, whether or not any deck holds that value | six rows, fixed order Draft → Building → Over → Unresolved → To buy → Complete | `status.*`; **no per-row counts** |
| Status row selected | that status is in the active filter set | row with 3px status keyline + `var(--surface)` background + `var(--fg)` label | status token |
| Status row unselected | that status is not in the active filter set | inferred: no keyline, no background, `var(--fg-body)` label — **not drawn** | — |
| Filtering applied | any filter change | grid re-renders immediately; **no Apply control exists** | — |
| Clear | Clear activated | all filters removed | `filters.clear` |

---

## Ambiguities and gaps (flagged for the readiness pass)

1. **The drawn palette is not a token set.** `--accent`, `--warning`, all five colour-identity
   pips, `--fg-body`, `--fg-muted`, `--fg-faint`, and the two divider greys (`#211C16`,
   `#2E2822`) do not correspond to any R6 theme in `tokens.r6.json`. The Theme Matrix file is
   said to render the same screens from real tokens; implementation must bind to variables, and
   the drawn hex above should be treated as illustrative only.
2. **No sort control on phone.** The desktop header carries `Sort · last played`; neither phone
   frame (populated or zero) shows a sort trigger, and `decks.sort(by)` has no drawn mobile home.
3. **The view toggle (grid/list) is undocumented.** It appears in the desktop Decks header with
   its own unmapped border colour `#2E2822`, but it is named in no decision, no readiness item and
   no copy string, and its list view is never drawn for Decks.
4. **Phone zero state drops New deck and Import from the header,** contradicting the frame note
   ("the header keeps New deck and Import at zero — the toolbar does not change shape between
   empty and populated") and README decision 6.
5. **The filtered empty ("No decks match") is not drawn,** despite
   `STATES-deck-statuses.md` claiming "Both are drawn in `The 99 - Refresh · Home and Decks`".
   Only copy keys exist; every geometry property is unspecified.
6. **Unselected states are missing on desktop.** Status filter rows are drawn all-on and colour
   swatches all-off; the desktop off-status row and on-swatch styling must be inferred from the
   phone sheet.
7. **Inactive filter trigger (phone) is not drawn** — only the accent-bordered, badged active
   state.
8. ~~**The pill alpha rule has two exceptions in the drawing.**~~ **CLOSED 2026-09-14.** The
   drawing was right and the prose rule was stale. `STATES-deck-statuses.md` now states all six
   values per status — 18% fill, with Draft at 16% and Building at 14%, each over `--bg` — and one
   opaque `--border-strong` hairline for every status, dashed on Building, ratified 2026-09-08.
   `status-style.ts` is the single writer. The sheet's ON chips are a different control and keep
   their own pair.
9. **Colour pip hairline is specified but not drawn.** `STATES` §5 requires a `--border-strong`
   hairline on each 9px pip; no pip in the HTML has a border.
10. **Progress semantics for Over are asserted, not derived.** The bar is full at 104/99; there is
    no overflow treatment drawn, and the count reads `104 / 99` while the bar reads 100%.
11. **Last played has no format spec.** Drawn values (`2 days ago`, `3 days ago`, `last week`,
    `3 weeks ago`) imply a relative formatter that the copy file does not own — only
    `decks.lastPlayedNever` exists.
12. **Colour-identity labels have no source.** `4-colour`, `Mono-red`, `Dimir`, `Grixis`, `Simic`,
    `5-colour` appear on desktop tiles but are in no copy string.
13. **Zero-buildable zero state.** `zero.buildableFrom` is omitted when buildable is 0, but the
    design does not say whether Browse commanders remains the bone-fill primary once the figure
    that justified its primacy is gone.
14. **Focus, hover and transition are entirely unspecified** for this surface.
15. **Loading states are an open readiness item** (READINESS "Not blocking, but I want eyes on
    it") — they keep their shipped layouts and were never re-rendered against the new display
    faces or the 32px button.
16. **The Explorations file contradicts the deliverable and is not a spec.** It shows an
    `Apply · 5 decks` footer, removable header chips on desktop, a typed token field
    (`status:short c:U`), a table/keyline row layout and a `Filters` (plural) trigger. All four are
    superseded: filtering is live with Clear only, there is no token query, search moved into the
    filter surface, and the desktop layout is the persistent 262px column with a 3-up art-led card
    grid.

---

# Errata — where the shipped build departs from this table

1. **The To buy detail row reads `N to buy`, not `N unowned`, and the status condition is no
   longer "some card unowned".** Both the tile's figure and the `To buy` threshold now come from
   the seniority allocation rather than from ownership, so a card an older finished deck already
   holds is one of the copies counted here while being a card the player owns. `detailToBuy` was
   reworded and `detailUnowned` became `detailToBuyNoPrice`; the geometry, colour and placement
   in the row above are unchanged. `Complete`'s `all owned` is untouched: a Complete deck owns
   its cards and no older deck has taken any of them.
