# Design Property Table — Synergy Discovery and the Last 31

Sources: `The 99 - Synergy Discovery.dc.html` (CANVAS), `README.md`, `DENSITY-synergy-panel.md`,
`STATES-fill-controls.md`, `synergy-discovery · copy strings.ts`.
Canvas hex values are translated to their CSS token equivalents using the token legend in the contract section.
Breakpoint: `sm:` = 640px.

---

## Component: SynergyPanel — Container

### Panel outer wrapper (surface A, commander route)

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| background | `var(--surface)` (`#100D0A`) | same |
| border | `1px solid var(--border)` (`#2A241D`) | same |
| border-radius | 16px | 16px |
| padding | 16px 14px | 26px 28px |

### Panel heading ("EDHREC Synergy")

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| font-family | `var(--font-serif)` ('Cinzel', serif) | same |
| font-weight | 600 | 600 |
| font-size | 20px | 20px |
| color | `var(--fg)` (`#EDE6D8`) | same |

### Sub-caption (below heading)

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| font-family | `var(--font-mono)` ('IBM Plex Mono') | same |
| font-size | 11.5px (canvas: `font-size:11.5px`) | 12px (canvas: `font-size:12px`) |
| color | `var(--fg-faint)` (`#8E8269`) | same |
| margin-top | 2px | 2px |
| content (mobile) | `synergyCopy.panel.subcaptionMobile(n)` — `"{n} cards, ranked by synergy"` | — |
| content (desktop) | — | `synergyCopy.panel.subcaption(n)` — `"{n} cards EDHREC associates with this commander, ranked by synergy"` |

> **Note:** README specifies the caption as a replacement for the shipped sub-caption. The canvas shows
> mobile at 11.5px vs. desktop at 12px — these differ, recorded both.

---

## Component: SynergyPanel — Ownership headline bar (inside panel card)

### Container (the inner card with headline bar)

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| background | `var(--surface-raised)` (`#1A160F`) | same |
| border | `1px solid var(--border)` (`#2A241D`) | same |
| border-radius | 10px (canvas: `border-radius:10px`) | 12px (canvas: `border-radius:12px`) |
| padding | 13px 14px | 18px 20px |
| margin-top | — | 16px |

⚠️ **CANVAS/README DIVERGENCE:** canvas draws `border-radius:10px` on mobile and `12px` on desktop; README does not specify per-width values.

### Headline row (count + "of top N" + progress bar + owned pct)

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| display | flex | flex |
| align-items | center (canvas: `justify-content:space-between` for the label row) | center |
| gap | — | 14px |
| margin-bottom | 9px | — |

**Count figure ("62")**

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| font-family | `var(--font-mono)` | same |
| font-weight | — | 600 |
| font-size | — (label-style: `12px`) | 30px |
| color | `var(--fg)` | `var(--fg)` |

> Mobile shows `62 / 258 owned` in `var(--fg)` at 12px mono. Desktop shows `62` in 30px mono bold + `of top 258` at 14px `var(--fg-faint)`.

**"of top N" label (desktop)**

| Property | Desktop |
|----------|---------|
| font-family | `var(--font-mono)` |
| font-size | 14px |
| color | `var(--fg-faint)` (`#8E8269`) |

**Progress bar**

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| height | 6px | 10px |
| border-radius | 999px | 999px |
| background (track) | `var(--border)` (`#2A241D`) | same |
| background (fill) | `var(--accent)` (`#C9A24B`) | same |
| overflow | hidden | hidden |
| margin-bottom | 12px | — |
| flex | — | 1 |

**Owned percentage label**

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| font-family | `var(--font-mono)` | same |
| font-size | 12px | 12px |
| color | `var(--success)` (`#6FA368`) | same |

---

## Component: FacetStrip

### Strip container

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| display | flex | flex |
| gap | 6px | 6px |
| overflow | hidden (canvas shows scroll; README: horizontal scroller at 390px) | visible (wraps) |
| flex-wrap | nowrap (pills are `flex:none`) | wrap |
| margin-bottom | 10px | — |
| margin (block) | 18px 0 10px (desktop canvas) | 18px 0 10px |

### Facet pill — unselected

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| display | inline-flex | inline-flex |
| align-items | center | center |
| gap | 5px (canvas mobile) | 6px (canvas desktop) |
| height | 32px | 30px |
| padding | 0 11px | 0 11px |
| border-radius | 999px | 999px |
| background | `var(--surface-raised)` (`#221D16`) | same |
| border | `1px solid var(--border)` (`#2A241D`) | same |
| font-family | `var(--font-mono)` | same |
| font-size | 11.5px | 11.5px |
| color (label) | `var(--fg-body)` (`#C6B79A`) | same |
| flex | none (mobile, prevents wrapping) | — |

⚠️ **CANVAS/README DIVERGENCE:** Canvas draws mobile pills at `height:32px` and desktop at `height:30px`. README specifies `height 30px (32px phone)` — this matches the canvas. Recorded for clarity.

### Facet pill — selected

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| border | `1px solid var(--accent)` (`#C9A24B`) | same |
| color (label) | `var(--fg)` (`#EDE6D8`) | same |
| background | `var(--surface-raised)` (`#221D16`) | same |
| ARIA | `role="radio"`, `aria-checked="true"` | same |

### Facet count (inside pill)

| Property | Unselected | Selected |
|----------|-----------|---------|
| font-size | 10.5px (desktop) / 10px (mobile) | same |
| color | `var(--fg-locked)` (`#6A6152`) | `var(--accent)` (`#C9A24B`) |

### `All` pill — special dashed treatment (unselected only)

| Property | Value |
|----------|-------|
| background | transparent |
| border | `1px dashed var(--border-strong)` (`#3A3229`) |
| color (label) | `var(--fg-body)` (`#C6B79A`) |
| font-family | `var(--font-mono)` |
| font-size | 11.5px |

> When `All` is selected it takes the standard selected pill treatment (solid `--accent` border, `--fg` label).

### Facet strip ARIA

| Property | Value |
|----------|-------|
| role | `radiogroup` |
| aria-label | `synergyCopy.facet.groupAria` — "Filter the synergy list by card type" |
| Each pill role | `radio` |
| Each pill aria-label | `synergyCopy.facet.itemAria(facet, n)` — `"{facet}, {n} cards"` |

### Facet-empty state

| Property | Value |
|----------|-------|
| content | `synergyCopy.facet.empty(facet)` — `"No {facet} cards for this commander"` |
| font-family | `var(--font-mono)` |
| font-size | (README: "one mono line") — not specified; use body mono default |
| Renders | One text line; no list, no disclosure |

---

## Component: Figure Legend

### Legend line (above column headers; once per panel)

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| font-family | `var(--font-mono)` | same |
| font-size | 9.5px (canvas mobile) | 10px (canvas desktop) |
| color | `var(--fg-locked)` (`#6A6152`) | same |
| margin-bottom | 10px | 12px |
| content (mobile) | `synergyCopy.panel.legendMobile` — `"+pts = synergy vs. all decks · % = decks running it"` | — |
| content (desktop) | — | `synergyCopy.panel.legend` |
| `+pts` color | `var(--accent)` (`#C9A24B`) | same |

⚠️ **CANVAS/README DIVERGENCE:** Canvas draws the legend at `9.5px` on mobile and `10px` on desktop. README specifies `mono 10px` without per-width differentiation.

---

## Component: Column Header Row

### Header row (desktop only; absent on mobile)

| Property | Desktop |
|----------|---------|
| display | flex |
| gap | 10px |
| padding | 0 6px 6px 12px |
| font-family | `var(--font-mono)` |
| font-size | 9.5px |
| letter-spacing | 0.14em |
| text-transform | uppercase |
| color (default) | `var(--fg-locked)` (`#6A6152`) |
| Conditional | Desktop only — absent on mobile |

### Column header slots (desktop)

| Slot | Width | color |
|------|-------|-------|
| dot spacer | 7px | — |
| card | flex:auto | `var(--fg-locked)` |
| type | 150px fixed | `var(--fg-locked)` |
| synergy | 64px fixed, text-align:right | `var(--accent)` (`#C9A24B`) |
| decks | 46px fixed, text-align:right | `var(--fg-locked)` |
| toggle spacer | 34px | — |

---

## Component: SynergyRow — Desktop (six-slot, 44px)

### Row container

| Property | Value |
|----------|-------|
| display | flex |
| align-items | center |
| gap | 10px |
| min-height | 44px |
| background | `var(--surface)` (`#1E1A15`) |
| border | `1px solid var(--border)` (`#2A241D`) |
| border-radius | 8px |
| padding | 0 6px 0 12px |
| white-space (name) | nowrap |
| overflow (row) | visible |

### Row container — list gap

| Property | Value |
|----------|-------|
| gap between rows | 6px |
| flex-direction | column |

### Slot 1 — Ownership dot

| Property | Owned | Unowned |
|----------|-------|---------|
| width | 7px | 7px |
| height | 7px | 7px |
| border-radius | 999px | 999px |
| background | `var(--success)` (`#6FA368`) | transparent |
| border | — | `1px solid var(--fg-locked)` (`#6A6152`) |
| flex | none | none |
| aria-hidden | true | true |

### Slot 2 — Card name

| Property | Value |
|----------|-------|
| flex | auto |
| min-width | 0 |
| font-size | 13.5px |
| color | `var(--fg)` (`#EDE6D8`) |
| white-space | nowrap |
| overflow | hidden |
| text-overflow | ellipsis |
| Element | `CardDetailTrigger` — tapping the name opens card detail |

### Slot 3 — Type line (desktop only)

| Property | Value |
|----------|-------|
| width | 150px |
| flex | none |
| font-family | `var(--font-mono)` |
| font-size | 10px |
| color | `var(--fg-locked)` (`#6A6152`) |
| white-space | nowrap |
| overflow | hidden |
| text-overflow | ellipsis |
| Content (type facets) | Full type line, e.g. "Creature — Bird Wizard" |
| Content (`All` facet) | Card type bucket only, e.g. "Creature" (canvas confirms: "The type column drops to the card type alone in the All facet") |

### Slot 4 — Synergy figure

| Property | Value |
|----------|-------|
| width | 64px |
| flex | none |
| text-align | right |
| font-family | `var(--font-mono)` |
| font-size | 11.5px |
| font-variant-numeric | tabular-nums |

| Case | color | Content |
|------|-------|---------|
| Positive | `var(--accent)` (`#C9A24B`) | `+{n} pts` (singular: `+1 pt`) |
| Negative | `var(--fg-locked)` (`#6A6152`) | `−{n} pts` (U+2212 minus, not hyphen) |
| Absent | `var(--fg-locked)` (`#6A6152`) | `—` (em dash); `aria-hidden="true"` |

> Negative synergy is **never** `var(--danger)`. The absent em dash is `—` (not `-` or `–`).

### Slot 5 — Inclusion figure

| Property | Value |
|----------|-------|
| width | 46px |
| flex | none |
| text-align | right |
| font-family | `var(--font-mono)` |
| font-size | 11px |
| color | `var(--fg-faint)` (`#8E8269`) |
| font-variant-numeric | tabular-nums |

| Case | Content |
|------|---------|
| Present | `{n}%` |
| Absent | `—` (em dash); `aria-hidden="true"` |

> Inclusion figure is absent **independently** — a null synergy never suppresses a real inclusion and vice versa.

### Slot 6 — Select toggle (rest state, desktop)

| Property | Value |
|----------|-------|
| width | 34px |
| height | 34px |
| flex | none |
| border-radius | 7px |
| border | `1px solid var(--border-strong)` (`#3A3229`) |
| background | transparent |
| color | `var(--fg-faint)` (`#8E8269`) |
| font-family | `var(--font-mono)` |
| font-size | 15px |
| display | flex |
| align-items | center |
| justify-content | center |
| Glyph | `+` (ASCII plus) |
| aria-pressed | `false` |
| aria-label | `synergyCopy.select.addAria(name)` — "Add {name} to the deck" |

### Slot 6 — Select toggle (selected state, desktop)

| Property | Value |
|----------|-------|
| border | `1px solid var(--accent)` (`#C9A24B`) |
| background | `color-mix(in srgb, var(--accent) 10%, transparent)` (`rgba(201,162,75,0.10)`) |
| color | `var(--accent)` (`#C9A24B`) |
| font-size | 13px (canvas: glyph is ✓ at 13px) |
| Glyph | `✓` (U+2713 check mark) |
| aria-pressed | `true` |
| aria-label | `synergyCopy.select.removeAria(name)` — "Remove {name} from the deck" |

### Row — selected state treatment

| Property | Value |
|----------|-------|
| background | `var(--elevated-hover)` (`#211C15`) |
| border | `1px solid var(--accent-shadow)` (`#6E5B33`) |
| transition | none ("No transition" — README) |

### Row — focus state

| Property | Value |
|----------|-------|
| outline | `2px solid var(--accent)` (`#C9A24B`) |
| outline-offset | 2px |
| Source | Global `:focus-visible`, not overridden |

### Row accessible name

Full accessible name is composed by `synergyCopy.figure.rowAria(name, owned, synergy, inclusion)`:
`"{name}. {owned}. Synergy {synergy}. In {inclusion} of decks."`

Ownership string: `synergyCopy.figure.ariaOwned` ("Owned") or `synergyCopy.figure.ariaUnowned` ("Not in your collection").
Synergy: `synergyCopy.figure.ariaSynergyPlus(pts)`, `.ariaSynergyMinus(pts)`, or `.ariaSynergyNone` ("no EDHREC figure").
Inclusion: percentage string or `synergyCopy.figure.ariaInclusionNone` ("an unknown share").

All visual marks (dot, synergy figure, inclusion figure) are `aria-hidden="true"`.

---

## Component: SynergyRow — Mobile / Phone (52px, meta-line)

### Row container (phone)

| Property | Value |
|----------|-------|
| display | flex |
| align-items | center |
| gap | 9px |
| min-height | 52px |
| background | `var(--surface)` (`#1E1A15`) |
| border | `1px solid var(--border)` (`#2A241D`) |
| border-radius | 8px |
| padding | 0 6px 0 12px |

### Phone slot 1 — Ownership dot (identical to desktop)

Same 7px dot/ring as desktop.

### Phone slot 2 — Name + meta line column

| Property | Value |
|----------|-------|
| flex | auto |
| min-width | 0 |
| display | flex |
| flex-direction | column |
| gap | 2px |

**Name line**

| Property | Value |
|----------|-------|
| font-size | 13.5px |
| color | `var(--fg)` (`#EDE6D8`) |
| white-space | nowrap |
| overflow | hidden |
| text-overflow | ellipsis |

**Meta line (figures)**

| Property | Value |
|----------|-------|
| font-family | `var(--font-mono)` |
| font-size | 10px |
| color | `var(--fg-faint)` (`#8E8269`) |
| font-variant-numeric | tabular-nums |
| Format | `{+N pts} · edhrec {N}%` |
| Synergy part color | `var(--accent)` (`#C9A24B`) |
| Inclusion part color | `var(--fg-faint)` (`#8E8269`) |
| Absent synergy | `—` em dash in `var(--fg-locked)` |
| Absent inclusion | `—` em dash in `var(--fg-locked)` |

> Type line is **absent** on mobile (dropped to card detail). This is a deliberate layout decision, not a disabled state.

### Phone slot 3 — Select toggle (rest, phone)

| Property | Value |
|----------|-------|
| width | 44px |
| height | 44px |
| flex | none |
| border-radius | 7px |
| border | `1px solid var(--border-strong)` (`#3A3229`) |
| background | transparent |
| color | `var(--fg-faint)` (`#8E8269`) |
| font-family | `var(--font-mono)` |
| font-size | 17px |
| Glyph | `+` |
| aria-pressed | `false` |

### Phone toggle — selected state

| Property | Value |
|----------|-------|
| border | `1px solid var(--accent)` (`#C9A24B`) |
| background | `rgba(201,162,75,0.10)` |
| color | `var(--accent)` |
| font-size | 15px |
| Glyph | `✓` |
| aria-pressed | `true` |

---

## Component: DisclosureControl

### Disclosure button (collapsed — "Show all N {facet}")

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| display | flex | flex |
| align-items | center | center |
| justify-content | center | center |
| gap | 8px | 8px |
| min-height | 44px | 44px |
| width | 100% | 100% |
| border | `1px dashed var(--border-strong)` (`#3A3229`) | same |
| border-radius | 8px | 8px |
| font-family | `var(--font-mono)` | same |
| font-size | 12px | 12px |
| color | `var(--accent)` (`#C9A24B`) | same |
| background | transparent | transparent |
| content | `synergyCopy.disclosure.showAll(n, facet)` — "Show all {n} {facet}" | same |
| aria-expanded | `false` | `false` |
| aria-controls | id of expanded container | same |
| aria-label | `synergyCopy.disclosure.showAllAria(n, facet)` — "Show all {n} {facet} cards" | same |

> README: "Not a chip — the list it opens is a column. Full-width 44px row at both widths."

> Mobile canvas shows: `Show all 66 creatures` without `→` arrow. Desktop canvas shows: `Show all 66 creatures →` with arrow.

⚠️ **CANVAS/README DIVERGENCE:** Desktop canvas includes `→` trailing glyph after the label text; mobile canvas does not. README does not specify the glyph. Both recorded.

### Disclosure button (expanded — "Show fewer")

| Property | Value |
|----------|-------|
| content | `synergyCopy.disclosure.showFewer` — "Show fewer" |
| aria-expanded | `true` |
| aria-label | `synergyCopy.disclosure.showFewerAria(facet)` — "Show fewer {facet} cards" |
| Focus | Stays on the disclosure after expand/collapse — no focus steal |

### Expanded scroll container

| Property | Value |
|----------|-------|
| max-height | 480px |
| overflow-y | auto |
| No expanded item cap | All rows in the facet are rendered (no second `+N more` truncation) |
| Collapse | Discards scroll position; not restored |
| Facet change | Collapses to resting cap, preserves selection, discards scroll |

---

## Component: SelectionPromiseLine

### Promise line (desktop — under "Build this deck" button)

| Property | Value |
|----------|-------|
| font-family | `var(--font-mono)` |
| font-size | 10.5px |
| color | `var(--fg-body)` (`#C6B79A`) |
| text-align | center |
| line-height | 1.5 |
| margin-top | 12px |

**Zero selection (locked strings — unchanged)**

- `recommendationsCopy.build.stickyPromise` — "We’ll build the whole 99, as far as your collection reaches"
  Was "We'll fill 68 of the 99 — roles and lands. The rest is yours." until the fill stopped
  stopping at the role floors and the mana base. It reaches the whole body now, so the old
  sentence under-promised by 31 cards and its "The rest is yours" named a remainder that no
  longer exists — and an unconditional "all 99" would be a promise the fill cannot keep when
  the collection runs out, which is what the condition carries.
- Color: `var(--fg-locked)` (`#6A6152`)

**Non-zero selection, all owned**

- `synergyCopy.select.promise(filled, picked, total)` — "We'll fill {filled}, plus your {picked}: {total} of the 99."
- `{total}` rendered in `var(--fg)` (`#EDE6D8`)

**Non-zero selection with unowned cards**

- Same promise string + `synergyCopy.select.promiseUnowned(n)` — "{n} you don't own yet."
- Unowned clause color: `var(--warning)` (`#E0913C`)

**Selection fills 99 (clamp case)**

- `synergyCopy.select.promiseFull(picked)` — "Your {picked} fill the 99 on their own. We'll leave the rest to you."

### Promise line (mobile — in sticky bar)

| Property | Value |
|----------|-------|
| font-size | 12px |
| color | `var(--fg-body)` (`#C6B79A`) |
| Location | Sticky bar at bottom of phone viewport |

Sticky bar layout (phone):

| Property | Value |
|----------|-------|
| border-top | `1px solid var(--border-strong)` (`#3A3229`) |
| background | `var(--surface-raised)` (`#1A160F`) |
| padding | 12px 16px 24px |
| display | flex |
| align-items | center |
| gap | 12px |

Promise text column (flex:1, flex-direction:column):
- "READY TO BUILD" label: `var(--font-mono)`, 10px, `var(--fg-faint)`
- Promise line: 12px, `var(--fg-body)` / `var(--fg-body)` with inline `var(--warning)` for unowned clause
- Clear selection link below

"Build this deck →" button (in sticky bar):
- background: `var(--accent)` (`#C9A24B`)
- color: `#14110E`
- font-weight: 600
- font-size: 14px
- border-radius: 8px
- padding: 12px 18px
- flex: none

### `Clear selection · N` control

| Property | Value |
|----------|-------|
| font-family | `var(--font-mono)` |
| font-size | 11px |
| color | `var(--accent)` (`#C9A24B`) |
| text-align | center |
| margin-top | 8px |
| content | `synergyCopy.select.clear(n)` — "Clear selection · {n}" |
| aria-label | `synergyCopy.select.clearAria(n)` — "Clear all {n} selected cards" |
| Renders | Only when selection is non-empty |

---

## Component: LastSlotStrip (Surface B — /decks/[id])

### Strip container

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| background | `var(--surface-raised)` (`#1A160F`) | same |
| border | `1px solid var(--border-strong)` (`#3A3229`) | same |
| border-radius | 10px | 10px |
| padding | 13px 14px | 14px 16px |
| margin-bottom | — | 16px |
| Conditional | Unmounts when open slots = 0 (states 4 and 9) | same |

### Strip heading

| Property | Value |
|----------|-------|
| font-family | `var(--font-mono)` |
| font-size | 10.5px |
| letter-spacing | 0.14em |
| text-transform | uppercase |
| color | `var(--accent)` (`#C9A24B`) |
| margin-bottom | 4px |
| content | `synergyCopy.lastSlots.heading(n)` — "The last {n}" |

### Strip sub-caption

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| font-family | `var(--font-mono)` | same |
| font-size | 10.5px | 10.5px |
| color | `var(--fg-faint)` (`#8E8269`) | same |
| margin-bottom | 11px | 11px |
| content (mobile) | `synergyCopy.lastSlots.captionMobile(n)` — "{n} slots open · ranked by synergy" | — |
| content (desktop) | — | `synergyCopy.lastSlots.caption(n)` — "{n} slots open · ranked by synergy for this commander" |

### Fill controls layout

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| display | flex | flex |
| flex-direction | column | row |
| gap | 8px | 10px |
| align-items | — | center |
| flex-wrap | — | wrap |

---

## Component: FillControlA — Owned fill

### Rest state

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| display | flex | inline-flex |
| align-items | center | center |
| justify-content | center | — |
| min-height | 44px | — |
| border | `1px solid var(--accent)` (`#C9A24B`) | same |
| border-radius | 8px | 8px |
| background | transparent | transparent |
| color | `var(--accent)` (`#C9A24B`) | same |
| font-size | 14px (mobile canvas) | 13px (desktop canvas) |
| font-weight | 600 | 600 |
| padding | — (flex fill, full-width) | 10px 16px |
| width | 100% (full-width on phone) | auto |
| content | `synergyCopy.lastSlots.fillOwned(n)` — "Fill {n} from my collection" | same |
| aria-label | `synergyCopy.lastSlots.fillOwnedAria(n)` | same |

⚠️ **CANVAS/README DIVERGENCE:** Canvas draws desktop label at 13px, mobile at 14px. README specifies `label 13px 600 --accent` without mobile variant. Both recorded.

### In-flight state (state 3)

| Property | Value |
|----------|-------|
| border | `1px solid var(--accent-shadow)` (`#6E5B33`) |
| color | `var(--fg-faint)` (`#8E8269`) |
| font-weight | 600 |
| content | `fill.fillingRows` (shipped) — "Sleeving {n} cards…" |
| disabled | true |
| Other controls during A flight | B disabled (opacity: 0.5 on canvas), C disabled |

### Absent state

| Property | Condition |
|----------|-----------|
| Renders | Never — control is absent (not disabled) |
| When | State 4 (reached 99), state 5 (settled short), state 6 (0 owned candidates), state 9 (deck at 99) |

### Refusal state (state 10)

| Property | Value |
|----------|-------|
| control | Present and enabled (unchanged) |
| error below | `synergyCopy.lastSlots.topUpFailed` — "We couldn’t add those. The deck is unchanged."<br>Was `fillFailed` / "We couldn’t fill those." Two refusal strings for two controls collapsed into one when the commit settled one way; `fillFailed` was deleted with it (`src/lib/copy/top-off.ts:468`, and `top-off.md:1154` records the deletion). This row kept quoting the deleted string until the 2026-09-19 word-drift check reached it. |
| error color | `var(--danger)` (`#C6533F`) |
| error font | `var(--font-mono)`, 11px |
| Other control | Stays enabled |

---

## Component: FillControlB — Buying top-up

### Rest state

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| display | flex | inline-flex |
| align-items | center | center |
| justify-content | center | — |
| gap | 8px | 8px |
| min-height | 44px | — |
| border | `1px solid var(--border-strong)` (`#3A3229`) | same |
| border-radius | 8px | 8px |
| background | transparent | transparent |
| color (label) | `var(--fg)` (`#EDE6D8`) | same |
| font-size | 14px (mobile canvas) | 13px (desktop canvas) |
| padding | — (full-width) | 10px 16px |
| width | 100% | auto |
| content | `synergyCopy.lastSlots.topUp` — "Top up with cards to buy" | same |
| aria-label | `synergyCopy.lastSlots.topUpAria(n)` | same |

**Count badge on face**

| Property | Value |
|----------|-------|
| font-family | `var(--font-mono)` |
| font-size | 11px |
| color | `var(--warning)` (`#E0913C`) |
| content | The open slot count — `{n}` |

### In-flight state (state 8)

| Property | Value |
|----------|-------|
| content | `fill.fillingRows` (shipped) — "Sleeving {n} cards…" |
| disabled | true |
| A and C during B flight | disabled |

### Absent state

| Condition |
|-----------|
| State 9 (deck at 99 — strip unmounts) |
| State 12 (0 unowned candidates — EDHREC list fully owned) |

### Refusal state (state 10)

| Property | Value |
|----------|-------|
| control | Present and enabled |
| error | `synergyCopy.lastSlots.topUpFailed` — "We couldn't add those. The deck is unchanged." |

---

## Component: ShortfallLine (§7.6)

### Container (shown when A settles below 99)

| Property | Value |
|----------|-------|
| display | flex |
| align-items | flex-start |
| gap | 10px (desktop) / 9px (mobile) |
| background | `var(--surface-sunken)` (`#181410`) |
| border | `1px solid var(--border)` (`#2A241D`) |
| border-left | `3px solid var(--accent)` (`#C9A24B`) |
| border-radius | 9px |
| padding | 11px 13px (state-5 canvas) |
| margin-bottom | 12px |

### `i` disc icon

| Property | Value |
|----------|-------|
| width | 18px (mobile) / 20px (desktop) |
| height | 18px / 20px |
| border-radius | 999px |
| border | `1px solid var(--accent-shadow)` (`#6E5B33`) |
| color | `var(--accent)` (`#C9A24B`) |
| font-family | `var(--font-mono)` |
| font-size | 10px (mobile) / 11px (desktop) |
| flex | none |

### Shortfall text

| Property | Value |
|----------|-------|
| font-size | 12.5px |
| color | `var(--fg-body)` (`#C6B79A`) |
| line-height | 1.6 |
| content | `synergyCopy.lastSlots.short(total, n)` — "{total} of 99. Your collection ran out {n} short — you own what you own, EDHREC knows what it knows, and that is everything we have."<br>**⚠ Drift, pre-dating the 2026-09-13 punctuation sweep:** the shipped string reads "…ran out {n} short: there was nothing left in it that EDHREC ranks for this commander." The tail diverged in WORDING, not punctuation, so the sweep left it rather than half-correcting a quotation that was already stale. Needs a Design ruling on which wording stands. |
| border-color | `var(--accent)` — **not** `var(--warning)` (running out of cards is not an outage) |

---

## Component: ConsiderSynergyShelf (Surface B — /decks/[id] Consider panel)

### ShelfSection heading and meta

| Property | Value |
|----------|-------|
| Heading font-family | `var(--font-mono)` |
| Heading font-size | 11px (canvas: `font-size:11px`) |
| Heading letter-spacing | 0.14em |
| Heading text-transform | uppercase |
| Heading color | `var(--accent)` (`#C9A24B`) |
| Meta font-family | `var(--font-mono)` |
| Meta font-size | 11px |
| Meta color | `var(--fg-faint)` (`#8E8269`) |
| Heading content | `synergyCopy.shelf.label(commander)` — "Synergy · {commander}" |
| Meta content | `synergyCopy.shelf.meta(n)` — "ranked by synergy · {n} to consider" |
| Cap | `SHELF_CAP` 12 applies |
| Sort | By synergy descending — ordered above the unowned append, below coverage shelves |

### Tile grid

| Property | Value |
|----------|-------|
| display | grid |
| grid-template-columns | `repeat(6, 1fr)` (desktop canvas: 6-column grid) |
| gap | 14px |

> Mobile: shipped 2-column grid (README: "Desktop only; shipped grid, 2 cols" for phone — existing grid, not overridden).

### SuggestionTile lift line (synergy shelf modification)

| Property | Value |
|----------|-------|
| font-family | `var(--font-mono)` |
| font-size | 9.5px |
| color | `var(--accent-shadow)` (`#6E5B33`) |
| content (present) | `+{n} pts vs. all decks` (shipped `addPanelCopy.tile.lift` string) |
| content (absent) | `synergyCopy.shelf.noSynergy` — "no synergy figure" |
| Ownership gate | **Removed** — lift line prints regardless of `suggestion.owned`. This closes design table §8-6. |
| Conditional rendering | Always rendered when synergy figure is present; drops to "no synergy figure" sentence when null |

---

## Component: ClearAllAuto (Control C — shipped, unchanged)

| Property | Value |
|----------|-------|
| Location | Decklist toolbar, right-aligned, beside All/Shopping filter |
| Border-top above toolbar | `1px solid var(--border)` (`#2A241D`) |
| font-family | `var(--font-mono)` |
| font-size | 12px |
| Style | Neutral ghost: `1px solid var(--border-strong)`, transparent background |
| color | `var(--fg)` (`#EDE6D8`) |
| border-radius | 8px |
| padding | 8px 13px |
| content | `auto.clearAll` (shipped) — "Clear all auto · {n}" |
| Absent | At 0 auto cards (`keptNote` stays); state 7 |
| During A or B flight | Disabled |
| Affected by A/B | Only its count changes; nothing else |

---

## Component: MutationError (refusal display)

| Property | Value |
|----------|-------|
| font-family | `var(--font-mono)` |
| font-size | 11px |
| color | `var(--danger)` (`#C6533F`) |
| Position | Below the control that was clicked (as `AutoTag` stacks its own) |
| Other control | Stays enabled — one refusal is not evidence the other will fail |

---

## State Coverage

### Fill Controls States (from STATES-fill-controls.md)

| State | Triggering condition | What renders | Key props/data required |
|-------|---------------------|--------------|------------------------|
| 1 | n=31, owned≥31 | A: "Fill 31 from my collection"; B: "Top up · 31"; C: "Clear all auto · 68" | `openSlots=31`, `ownedCandidates≥31` |
| 2 | n=31, owned=12 (shallow pool) | A: "Fill 12 from my collection" (states what it can place, not the gap); B: "Top up · 31"; C: unchanged | `openSlots=31`, `ownedCandidates=12` |
| 3 | A in flight | A: "Sleeving 24 cards…" (disabled, border `--accent-shadow`); B: disabled, stays in place (not hidden); C: disabled | write pending |
| 4 | A settled at 99 | A: **absent**; B: **absent**; strip unmounts; C: "Clear all auto · 92" | `deckCount=99` |
| 5 | A settled short (92/99, pool exhausted) | A: **absent**; shortfall line renders with `provenanceShort` clause; B: "Top up · 7"; C: "Clear all auto · 92" | `deckCount=92`, `poolExhausted=true` |
| 6 | 0 owned candidates from start | A: **absent** (never disabled); B: present; C: unchanged | `ownedCandidates=0` |
| 7 | 0 auto cards (all kept or hand-built at 68) | A: unchanged; B: unchanged; C: **absent**; `keptNote` stays | `autoCount=0` |
| 8 | B in flight | A: disabled; B: "Sleeving 7 cards…" (disabled); C: disabled | write pending |
| 9 | Deck already at 99 | A: **absent** (strip unmounts); B: **absent** (strip unmounts); C: present if auto > 0 | `deckCount=99` |
| 10 | Either write refused | Clicked control: present+enabled, `MutationError` beneath; other control: present+enabled; C: unchanged | server action returned error |
| 11 | EDHREC degraded | A: present — ordering degrades to inclusion then name; B: present; C: unchanged | `synergy` field null/missing on all rows |
| 12 | 0 unowned candidates (EDHREC list fully owned) | A: present; B: **absent**; C: unchanged | `unownedCandidates=0` |

### Edge counts (from DENSITY-synergy-panel.md)

| Rows in facet | Condition | What renders |
|---------------|-----------|--------------|
| 0 | Facet has no post-exclusion cards | `synergyCopy.facet.empty(facet)` — "No {facet} cards for this commander"; no list, no disclosure |
| 1–6 | Facet has 1–6 rows | All rows; no disclosure at either width |
| 7–10 | 7–10 rows | All on desktop; phone shows 6 + "Show all N" disclosure |
| 11+ | More than 10 rows | Capped at 10 (desktop) / 6 (phone) + disclosure; expanded scrolls all rows |
| 258 (All facet) | All facet selected | Capped at 10/6 + disclosure; expanded scrolls all 258 in 480px container |

### Figure null/absent cases

| Figure | Condition | Rendered value | Color | aria |
|--------|-----------|----------------|-------|------|
| Synergy — absent | `synergy` is null in DB row | `—` (em dash) | `var(--fg-locked)` | `aria-hidden="true"` on visual mark; aria name says "no EDHREC figure" |
| Synergy — negative | synergy < 0 | `−{n} pts` (U+2212 minus) | `var(--fg-locked)` — never `--danger` | tabular-nums |
| Synergy — positive singular | synergy = 1 | `+1 pt` (singular) | `var(--accent)` | — |
| Synergy — positive plural | synergy > 1 | `+{n} pts` | `var(--accent)` | — |
| Inclusion — absent | `inclusion` is null | `—` (em dash) | `var(--fg-locked)` | `aria-hidden="true"` on visual mark; aria name says "an unknown share" |
| Inclusion — present | inclusion ≥ 0 | `{n}%` | `var(--fg-faint)` | — |
| Per-row null (one figure only) | One figure null, other present | Em dash for null; normal render for present | As above | Each figure absent independently; one null never suppresses the other |
| Panel-level absent ("No synergy data") | Commander not indexed by EDHREC | Shipped `FitHero` absent note; panel is not drawn | — | No retry button |
| Panel-level degraded ("Synergy data unavailable") | EDHREC unreachable | Shipped `FitHero` degraded note with "Try again" link | `var(--warning)` border-left | retry link |

### Panel-level null states

| State | Trigger | What renders | What is absent |
|-------|---------|--------------|----------------|
| Absent | Commander not in `commander_support` | Shipped "No synergy data" note (FitHero shape) | Entire panel including facet strip |
| Degraded | DB/EDHREC fetch failure | Shipped "Synergy data unavailable" + Try again | Entire panel |
| EDHREC degraded (state 11) | synergy null on rows but inclusion present | Panel renders; ordering falls back to inclusion desc then name; A still present | Synergy-based sort only |
