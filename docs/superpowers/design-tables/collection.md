# Design Property Table — Collection (#6)

> Breakpoint: 768px (Tailwind `md:`). "Mobile" = below 768px, "Desktop" = 768px and above.
> All color values are raw hex from the design source; no CSS custom property names are defined in the handoff.
> Art regions use color-identity gradients as placeholders; swap in real art while preserving aspect-ratio frame.

---

## Component: Page Shell (mobile bottom tab bar)

### Bottom Tab Bar Container
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | — (not shown; desktop uses sidebar rail) |
| border-top | 1px solid #3A3229 | — |
| background | #1A160F | — |
| padding | 10px 6px 22px | — |

### Tab Item (inactive)
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | 1 | — |
| display | flex | — |
| flex-direction | column | — |
| align-items | center | — |
| gap | 5px | — |
| font-size | 10px | — |
| color | #8E8269 | — |

### Tab Item Diamond (inactive)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 8px | — |
| height | 8px | — |
| background | #4A4033 | — |
| transform | rotate(45deg) | — |
| display | block | — |

### Tab Item (active — Collection)
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | #C9A24B | — |
| font-weight | 600 | — |

### Tab Item Diamond (active)
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | #C9A24B | — |

---

## Component: Desktop Sidebar Rail

### Rail Container
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| flex-direction | — | column |
| width | — | 236px |
| flex | — | none |
| background | — | #1A160F |
| border-right | — | 1px solid #3A3229 |

### Logomark Area
| Property | Mobile | Desktop |
|----------|--------|---------|
| padding | — | 22px 20px 20px |
| border-bottom | — | 1px solid #2A241D |
| display | — | flex |
| align-items | — | flex-end |
| gap | — | 7px |

### Wordmark "THE"
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 10px |
| letter-spacing | — | 0.42em |
| color | — | #C9A24B |
| padding-bottom | — | 5px |

### Crown Diamonds Container
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| flex-direction | — | column |
| align-items | — | center |
| gap | — | 5px |

### Crown Diamond Row
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| gap | — | 4px |

### Crown Diamond (small, left/right)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 6px |
| height | — | 6px |
| background | — | #C9A24B |
| transform | — | rotate(45deg) |
| display | — | block |

### Crown Diamond (large, center)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 8px |
| height | — | 8px |
| background | — | #C9A24B |
| transform | — | rotate(45deg) |
| display | — | block |

### "99" Numeral
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'Cinzel', serif |
| font-weight | — | 800 |
| font-size | — | 30px |
| line-height | — | 0.8 |
| color | — | #EDE6D8 |

### Nav Section Label ("Play")
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 10px |
| letter-spacing | — | 0.18em |
| text-transform | — | uppercase |
| color | — | #8E8269 |
| padding | — | 6px 12px 8px |

### Nav Item Container
| Property | Mobile | Desktop |
|----------|--------|---------|
| padding | — | 16px 12px |
| display | — | flex |
| flex-direction | — | column |
| gap | — | 4px |

### Nav Item (inactive)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| align-items | — | center |
| gap | — | 11px |
| padding | — | 10px 12px |
| border-radius | — | 8px |
| color | — | #A89B84 |
| font-size | — | 14px |
| font-weight | — | 500 |

### Nav Item Diamond (inactive)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 6px |
| height | — | 6px |
| background | — | #3A3229 |
| transform | — | rotate(45deg) |
| display | — | block |

### Nav Item (active — Collection)
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | — | #2A241D |
| color | — | #EDE6D8 |
| font-weight | — | 600 |

### Nav Item Diamond (active)
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | — | #C9A24B |

### Account Trigger Container
| Property | Mobile | Desktop |
|----------|--------|---------|
| margin-top | — | auto |
| padding | — | 14px 12px |

### Account Trigger Pill
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| align-items | — | center |
| gap | — | 12px |
| background | — | #221D16 |
| border | — | 1px solid #3A3229 |
| padding | — | 2px 12px 2px 2px |
| border-radius | — | 14px |

### Avatar Badge
| Property | Mobile (header) | Desktop (sidebar) |
|----------|--------|---------|
| width | 34px | 38px |
| height | 34px | 38px |
| flex | none | none |
| border-radius | 10px | 12px |
| background | #221D16 | #14110E |
| border | 1px solid #C9A24B | 1px solid #C9A24B |
| display | flex | flex |
| align-items | center | center |
| justify-content | center | center |
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 11px | 13px |
| color | #C9A24B | #C9A24B |

### Account Name
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | — | 13px |
| color | — | #EDE6D8 |
| font-weight | — | 600 |
| line-height | — | 1.25 |

### Account Role
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 10px |
| color | — | #8E8269 |

### Account Overflow Menu Trigger ("⋯")
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | — | #8E8269 |
| font-size | — | 15px |
| line-height | — | 1 |
| margin-left | — | auto |

---

## Component: Collection Page Header

### Page Background
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | #14110E | #14110E |

### Header Section (mobile)
| Property | Mobile | Desktop |
|----------|--------|---------|
| padding | 20px 18px 12px | 28px 34px 0 |
| border-bottom | 1px solid #2A241D | — |
| display | flex | flex |
| align-items | center / space-between | flex-end / space-between |
| justify-content | space-between | space-between |
| gap | — | 20px |
| margin-bottom | 14px | — |

### Page Title "Collection"
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'Cinzel', serif | 'Cinzel', serif |
| font-weight | 700 | 700 |
| font-size | 22px | 30px |
| margin | 0 | 0 |
| color | #EDE6D8 | #EDE6D8 |

### Subtitle / Stats Line
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 11px | 12px |
| color | #8E8269 | #8E8269 |
| margin-top | 2px | 4px |

### Copy (subtitle)
| Context | Copy |
|---------|------|
| Mobile | `2,933 cards · 1,418 unique` |
| Desktop | `2,933 cards · 1,418 unique · last updated Jul 12` |

### Replace Collection Button
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Sans' | 'IBM Plex Sans' |
| font-weight | 600 | 600 |
| font-size | — | 13px |
| color | — | #EDE6D8 |
| background | — | transparent |
| border | — | 1px solid #3A3229 |
| border-radius | — | 8px |
| padding | — | 9px 16px |
| cursor | — | pointer |

#### Hover State — Replace Collection Button
| Property | Desktop hover |
|----------|---------------|
| border-color | #C9A24B |
| color | #D8B25E |

### Copy (button label)
| Context | Copy |
|---------|------|
| Desktop | `↻ Replace collection` |

---

## Component: Filter Bar

### Filter Bar Container
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | — | sticky |
| top | — | 0 |
| background | — | #14110E |
| padding | — | 18px 34px 14px |
| border-bottom | 1px solid #2A241D | 1px solid #2A241D |
| z-index | — | 2 |

### Filter Row (inner flex)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 8px | 12px |
| overflow | hidden (horizontal scroll) | — |

### Search Input
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | — | 1 |
| display | flex | flex |
| align-items | center | center |
| gap | 8px | 10px |
| background | #181410 | #181410 |
| border | 1px solid #3A3229 | 1px solid #3A3229 |
| border-radius | 8px | 8px |
| padding | 9px 12px | 10px 14px |

### Search Icon
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | #8E8269 | #8E8269 |
| font-size | 14px | 15px |

### Search Placeholder Text
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 14px | 14px |
| color | #8E8269 | #8E8269 |

### Copy (placeholders)
| Context | Copy |
|---------|------|
| Mobile placeholder | `Search your cards…` |
| Desktop placeholder | `Search by card name…` |

### Color Filter (ONE pip control, both widths)

> **Superseded by the filter chassis.** This table described a desktop-only pip row beside a
> separate mobile `Color ▾` panel — two drawings and two ARIA roles for one filter. `ColourPips`
> now draws it at both widths: 22px pips on the wide form, 44px on the compact one, Scryfall's
> own symbols as images (never masked or tinted), a 2px `--accent` ring as the entire lit
> treatment, and no opacity separating lit from unlit. A hue the other filters leave no cards in
> stays listed and takes the system's `.42` disabled dimming with `aria-disabled`. The `COLOR`
> caption went with the row that carried it: it existed to explain five abstract squares, and
> the symbols explain themselves. The geometry below is the wide form's.

| Property | Desktop |
|----------|---------|
| display | flex |
| align-items | center |
| gap | 6px |
| background | #181410 |
| border | 1px solid #3A3229 |
| border-radius | 8px |
| padding | 7px 10px |

### Color Filter Label "COLOR"
| Property | Desktop |
|----------|---------|
| font-family | 'IBM Plex Mono', monospace |
| font-size | 10px |
| color | #8E8269 |
| letter-spacing | 0.1em |
| margin-right | 2px |

### WUBRG Color Pip (in filter widget)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 15px |
| height | — | 15px |
| border-radius | — | 999px |
| box-shadow (inactive) | — | inset 0 0 0 1px rgba(0,0,0,0.3) |
| opacity (inactive) | — | 0.4 |
| box-shadow (selected) | — | 0 0 0 2px #C9A24B |
| opacity (selected) | — | 1 (no opacity) |

### WUBRG Pip Colors
| Color | Hex |
|-------|-----|
| W (White) | #E8E4D6 |
| U (Blue) | #4A7FB5 |
| B (Black) | #5B5566 |
| R (Red) | #C05A48 |
| G (Green) | #6B9E63 |

### Filter Button (Type, Set, Sort dropdowns — mobile)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Sans' | 'IBM Plex Sans' |
| font-size | 12.5px | 13px |
| font-weight | 500 | 500 |
| color | #EDE6D8 | #EDE6D8 |
| background | #2A241D | #2A241D |
| border | 1px solid #3A3229 | 1px solid #3A3229 |
| border-radius | 999px | 8px |
| padding | 6px 12px | 9px 14px |
| white-space | nowrap | — |

### Copy (filter button labels)
| Context | Copy |
|---------|------|
| Mobile | `Color`, `Type ▾`, `Set ▾`, `A–Z ▾` |
| Desktop | Color pip widget (no text button), `Type ▾`, `Set ▾`, `Sort: Name ▾` |

### View Toggle Container
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| gap | 2px | 2px |
| background | #181410 | #181410 |
| border | 1px solid #3A3229 | 1px solid #3A3229 |
| border-radius | 8px | 8px |
| padding | 2px | 2px |
| margin-left | — | 2px |

### View Toggle Segment (active)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 28px | 30px |
| height | 24px | 28px |
| border-radius | 6px | 6px |
| background | #C9A24B | #C9A24B |
| color | #14110E | #14110E |
| display | flex | flex |
| align-items | center | center |
| justify-content | center | center |
| font-size | 12px | 13px |

### View Toggle Segment (inactive)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 28px | 30px |
| height | 24px | 28px |
| border-radius | 6px | 6px |
| color | #8E8269 | #8E8269 |
| display | flex | flex |
| align-items | center | center |
| justify-content | center | center |
| font-size | 12px | 13px |

### Copy (toggle icons)
| Context | Copy |
|---------|------|
| Rows icon | `≣` |
| Grid icon | `▦` |

---

## Component: Filter Chip Row

### Chip Row Container
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 6px (mobile wraps) | 8px |
| margin-top | 10px | 12px |
| flex-wrap | wrap | — |

### "FILTERS:" Label (desktop only)
| Property | Desktop |
|----------|---------|
| font-family | 'IBM Plex Mono', monospace |
| font-size | 11px |
| color | #8E8269 |

### Filter Chip
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | inline-flex | inline-flex |
| align-items | center | center |
| gap | 6px | 7px |
| font-size | 12px | 12.5px |
| color | #EDE6D8 | #EDE6D8 |
| background | #2A241D | #2A241D |
| border | 1px solid #3A3229 | 1px solid #3A3229 |
| border-radius | 999px | 999px |
| padding | 5px 9px | 5px 8px 5px 11px |

### Filter Chip WUBRG Dot (color chips only)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 9px | 9px |
| height | 9px | 9px |
| border-radius | 999px | 999px |

### Filter Chip Dismiss "✕"
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | #8E8269 | #8E8269 |
| cursor | pointer | pointer |

### "Clear all" Link
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 12px | 12px |
| color | #C9A24B | #C9A24B |
| margin-left | — | 2px |

### Result Count Label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 11px | 11px |
| color | #8E8269 (default) | #8E8269 (default) |
| color (0 results) | — | #E0913C |
| margin-left | — | auto |

### Copy (result count variants)
| Context | Copy |
|---------|------|
| Mobile default | `1,418 results` (`1 result` at one) |
| Desktop with filters | `Showing 3 of 1,418` |
| Desktop zero results | `Showing 0 of 1,418` |
| Desktop no filters | `No filters on` / `Showing 1,418 unique · 2,933 total` |

**The filtered denominator is the DISTINCT count, not the quantity total.** It read
`Showing 3 of 2,933` until the chassis migration: 3 distinct cards over 2,933 copies, two
different units, and a denominator no filtering can arrive at the numerator from. Both halves
are now distinct counts. The rest state still names both figures because it labels them.

The rest state's leading half is the chassis's own `No filters on`, not this route's former
`No filters active` — one frame, one sentence.

---

## Component: Collection Row (State 1a — Dense Rows)

> **Superseded in two places by the set-collections §1b addendum and its 2026-09-13
> correction** (`docs/superpowers/specs/2026-09-10-set-collections-design.md`). The pip
> column moved out of the leading slot and became a trailing 76/90px cost track — so the
> shipped template is `38px 1fr 76px auto` / `52px 1fr 90px 150px 92px 18px` — and what it
> draws is the card's own **mana cost**, through the shared `CostPips`, rather than a mana
> value beside colour identity. Everything else in this component is current.

### Row Container
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | grid | grid |
| grid-template-columns | ~~38px 40px 1fr auto~~ → **38px 1fr 76px auto** | ~~52px 54px 1fr 150px 92px 18px~~ → **52px 1fr 90px 150px 92px 18px** |
| align-items | center | center |
| gap | 10px | 16px |
| padding | 10px 12px | 12px 18px |
| border-radius | 8px | 8px |
| background | #1E1A15 | #1E1A15 |
| border | 1px solid #2A241D | 1px solid #2A241D |
| cursor | — | pointer |

#### Hover State — Collection Row
| Property | Desktop hover |
|----------|---------------|
| border-color | #3A3229 |
| background | #221D16 |

### Row: Quantity Column
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 13px | 14px |
| font-weight | 500 | 500 |
| color | #C9A24B | #C9A24B |

### ~~Row: Color Pip Container~~ · ~~Row: Color Pip~~ — RETIRED

**Neither component exists on this row any more.** They drew the card's colour
IDENTITY in the leading slot; the §1b addendum moved that slot to the trailing
cost track, and its 2026-09-13 correction replaced what it draws with the card's
own **mana cost**, through the shared `CostPips` — because identity folds in
every symbol a card's abilities cost, and `Abzan Monument` (cost `{2}`, ability
`{1}{W}{B}{G}`) read as a four-colour two-drop.

The cost track's properties are `CostPips`' own — `COST_PIP_SIZE` 12px, the
five-slot cap, and the shingle arithmetic in `src/components/ui/cost-pips.tsx`,
which every card row in the app shares. They are deliberately not restated here:
a second copy is what drifts, and this component now draws whatever that one
draws. A land has no cost and the cell is simply empty; the grid template fixes
its width, so nothing ragged-edges.

Colour identity is still a filter and still the grid tile's art wash. It is not
on this row.

### Row: Name Column Container
| Property | Mobile | Desktop |
|----------|--------|---------|
| min-width | 0 | 0 |

### Row: Card Name
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 14px | 15px |
| font-weight | 600 | 600 |
| color | #EDE6D8 | #EDE6D8 |
| white-space | nowrap | nowrap |
| overflow | hidden | hidden |
| text-overflow | ellipsis | ellipsis |

### Row: Type Line (mobile only — combined with name column)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 11.5px | — |
| color | #8E8269 | — |
| white-space | nowrap | — |
| overflow | hidden | — |
| text-overflow | ellipsis | — |

### Row: Type Line (desktop — separate column)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | — | 12.5px |
| color | — | #A89B84 |
| white-space | — | nowrap |
| overflow | — | hidden |
| text-overflow | — | ellipsis |

### Row: Set/Rarity Column Container (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| align-items | — | center |
| gap | — | 8px |

### Row: Rarity Dot
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 7px |
| height | — | 7px |
| border-radius | — | 999px |
| display | — | block |

### Rarity Dot Colors
| Rarity | Color |
|--------|-------|
| common | #A89B84 |
| uncommon | #B7C4CE |
| rare | #C9A24B |
| mythic | #E0913C |

### Row: Set Code (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 11px |
| color | — | #8E8269 |

### Row: Set Code (mobile — right-aligned auto column)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | — |
| font-size | 10.5px | — |
| color | #8E8269 | — |
| letter-spacing | 0.04em | — |

### Row: Chevron (desktop only, last column)
| Property | Desktop |
|----------|---------|
| color | #6A6152 |
| font-size | 14px |

### Rows Scroll Container
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | 1 | flex: 1 |
| overflow | hidden | — |
| padding | 2px 12px 12px | 12px 34px 34px |
| display | flex | flex |
| flex-direction | column | column |
| gap | 6px | 7px |

---

## Component: Grid Tile (State 1b — Card Art Gallery)

### Grid Container
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | grid | grid |
| grid-template-columns | 1fr 1fr (2-up) | `repeat(auto-fill, minmax(178px, 1fr))` — **six at the 1300px reference width** |
| gap | 12px | 20px (v2: 16 + 4, browse loosening) |
| padding | 4px 14px 14px | 20px 34px 34px |

> **Superseded 2026-09-15 — card captions (R1), ruling 3 and readiness erratum 5.** The desktop
> track was `repeat(5, 1fr)`. It is a TILE FLOOR now, and the column count falls out of the width:
> the ruling names a 178px tile, chosen because the phone's 2-up tile is 175px and one caption then
> serves both widths. A fixed `grid-cols-6` was rejected — `md:` begins at 768px, where this
> container has 638px of track and six columns is a 90px tile. The phone keeps an explicit 2-up,
> because at 390px one 178px floor plus a gap already exceeds the track.

### Grid Tile Container
| Property | Mobile | Desktop |
|----------|--------|---------|
| border-radius | 9px | 10px |
| overflow | hidden | hidden |
| background | #1E1A15 | #1E1A15 |
| border | 1px solid #2A241D | 1px solid #2A241D |
| cursor | — | pointer |

#### Hover State — Grid Tile
| Property | Desktop hover |
|----------|---------------|
| border-color | #C9A24B |

### Grid Tile: Art Region
| Property | Mobile | Desktop |
|----------|--------|---------|
| aspect-ratio | 63/88 | 63/88 |
| position | relative | relative |
| box-shadow | `inset 0 0 0 1px rgba(0,0,0,0.25)` | `inset 0 0 0 1px rgba(0,0,0,0.25)` |
| border-bottom-left-radius / -right | 9px | 10px |

> **The art box rounds its own BOTTOM corners** (`TILE_ART_CLIP`, 2026-09-21). The tile's shell
> rounds the top two, because they are the tile's corners; the bottom two sit against the caption
> and were square. Scryfall's `normal` images are JPEGs with no alpha, so the area outside the
> card's rounded corner is a painted matte — white on 5 of 12 printings sampled — and a square
> bottom corner drew that matte as a pale notch above the caption. The rule for any box drawing a
> full card image: **radius ≥ 3.1% of its rendered width** — the card's own corner arc, which
> measures 14–16px across printings at Scryfall's 488px width, so 3.1% is the conservative end.
> Measured on the build, this box is 176px at 1300 and 173px at 390, so 5.5px is the figure to beat.

> **The bottom wash is gone — card captions (R1), call D.** It was
> `inset 0 -40px 40px -30px rgba(0,0,0,0.6)` at the phone and `-50px/-34px` above `md:`, and it
> existed to hold marks off light art. Nothing is drawn over the art now, so it holds nothing off
> anything. The 1px inner edge stays, and its job is different: it keeps a pale card frame from
> bleeding into the tile plate.
| background | color-identity gradient (see Art Gradients) | color-identity gradient |

### Art Placeholder Gradients (per identity)
| Identity | Gradient |
|----------|----------|
| W (colorless/artifact) | `linear-gradient(150deg, #efe9d8, #cbbf9c 58%, #9d8f6b)` |
| U | `linear-gradient(150deg, #6a9bcb, #305c88 58%, #1c3a57)` |
| B | `linear-gradient(150deg, #5a5464, #2c2833 58%, #17151d)` |
| R | `linear-gradient(150deg, #cf7157, #8c3627 58%, #571f16)` |
| G | `linear-gradient(150deg, #84b277, #406f3b 58%, #264823)` |
| C (colorless) | `linear-gradient(150deg, #b3a488, #726755 58%, #453e31)` |
| Multi (2-color) | `linear-gradient(125deg, color1-mid, color1-light 40%, color2-light 60%, color2-mid)` |

### Grid Tile: Quantity Badge

> **Retired 2026-09-15 — card captions (R1), call D.** The badge is gone from the art. It was the
> loudest thing on the illustration — accent fill, `--bg` ink — for the most ordinary fact a tile
> carries, and a count is now a mono figure on the caption's meta line beside the availability chip.
> The accent plate, the absolute position and the 6px radius all go with it; nothing on this tile is
> drawn over the art any more.

### Grid Tile: Caption Area
| Property | Mobile | Desktop |
|----------|--------|---------|
| min-height | **70px** | **65px** |
| layout | three lines: a mono meta line, the name, then the `SET · rarity` sub-line | same |
| padding | `8px 9px` | `6px 10px` |
| line gap | 3px | 3px |

> **Three lines since 2026-09-23**, when the set line moved under the name: `8 + 17 + 3 + 20 + 3 +
> 11 + 8 = 70` at the phone, `6 + 18 + 3 + 17 + 3 + 12 + 6 = 65` on desktop. That is
> `CARD_TILE_CAPTION_SUB_H`, a floor of its own, so the fixed height still binds. The deck tile passes
> no sub-line and keeps the two-line figures below.
>
> The two paddings differ so both widths land on a whole figure with the same two
> lines: `8 + 17 + 3 + 20 + 8 = 56` at the phone, `6 + 18 + 3 + 17 + 6 = 50` on
> desktop (erratum 12 — the meta line grew with the slot box's padding). Both lines carry an explicit height for the same reason — sized to
> their own text they land at 49px on some tiles and 50px on others, and a floor
> that content always exceeds is not a fixed height.

> **Rebuilt 2026-09-15 — card captions (R1), call A.** The caption was a name over a set line at
> `7px 9px 9px` / `13px 15px 15px`. It is two lines at a fixed height now, because the marks that
> used to sit on the art have to land somewhere and one line is ~72px short of holding them beside
> a readable name. The height is fixed at both widths so tile height never depends on the data.
> Rendered by `src/components/ui/card-tile-caption.tsx`, which `/decks/[id]` shares.

### Grid Tile: Meta Line
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 9px | 9.5px |
| line box | 17px | 18px |
| gap | 6px | 6px |
| order | the one slot (availability chip), then the bracket marks, then the combo mark. The set line left this line on 2026-09-23 (see `Set/Rarity Caption`) | same |
| `×N` | **absent at one copy**, matching the deck tile | same |

### Grid Tile: Slot Box
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 8.5px | 9px |
| padding | **3px 5px** | **3px 5px** |
| border-radius | 4px | 4px |
| edge | `outline` at `outlineOffset: -1px` | same |

> **The edge is an outline and never a border**, and that is layout rather than taste: a border adds
> 2px to the box, and this box is shared with the collapsed buy tag and the proxy mark on
> `/decks/[id]`, neither of which pays it. One slot, three occupants, one box — the invariant the
> outline exists to keep true.

> **v2 density delta (Surfaces v2 §Collection).** The mock states "grid tiles:
> padding 12→16, gap 14→18". Neither "before" matches shipped code, so the **+4
> delta is authoritative and the mock's absolute targets are not**. Mobile stays
> at v1 throughout: the loosening is browse comfort, which desktop dominates,
> and a 375px two-column grid loses more than it gains. Rows view keeps v1
> density per the same mock line.

### Grid Tile: Card Name
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 12px | 13px |
| font-weight | 600 | 600 |
| color | #EDE6D8 | #EDE6D8 |
| white-space | nowrap | nowrap |
| overflow | hidden | hidden |
| text-overflow | ellipsis | ellipsis |

### Grid Tile: Set/Rarity Caption

> **Back under the name, 2026-09-23 (Hugh).** Once a card carried the chip, bracket marks and
> the combo mark, the meta line had no room left for the set line: a tutor's `TLE ·` was cut at
> the tile's edge and its rarity never showed. It is now `CardTileCaption`'s `nameSub` line,
> directly under the name and left-aligned with it: mono 9px / 9.5px, `leading-none`, an
> 11px / 12px box, `--fg-faint`, truncated. It shows both the set code and the rarity at BOTH
> widths, because on its own line the phone has room for the rarity. The note below records the
> previous move.

> **Retired 2026-09-15 — card captions (R1), call A.** It was its own row under the name at mono
> 9.5/10px with a 2/3px `margin-top`. The set line is now an occupant of the **Meta Line** above,
> right-aligned, at that line's own 9/9.5px and with no margin of its own — see `Grid Tile: Meta
> Line`. Two sections describing one caption at two sizes is how a property table stops being a
> single source of truth, so this one keeps only its copy, below.

### Copy (caption format)
| Context | Copy |
|---------|------|
| Mobile | `{{ card.set }} · {{ card.rarity }}` |
| Desktop | `{{ card.set }} · {{ card.rarity }}` |

---

## Component: Card Detail Modal

### Backdrop
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute inset:0 | absolute inset:0 |
| background | — | rgba(8,6,4,0.72) |
| (blurred collection behind) | — | filter: blur(2px); opacity: 0.4 |

### Mobile: Full-Screen Sheet Container
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | 1 | — |
| overflow | hidden | — |
| display | flex | — |
| flex-direction | column | — |
| background | #181410 | — |

### Mobile: Art Header
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | relative | — |
| padding | 44px 20px 20px | — |
| background | color-identity gradient | — |
| box-shadow | inset 0 -60px 60px -40px rgba(0,0,0,0.55) | — |

### Mobile: Art Close Button
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | — |
| top | 22px | — |
| right | 18px | — |
| width | 32px | — |
| height | 32px | — |
| border-radius | 999px | — |
| background | rgba(10,8,6,0.55) | — |
| color | #EDE6D8 | — |
| display | flex | — |
| align-items | center | — |
| justify-content | center | — |
| font-size | 16px | — |

### Mobile: Art Image
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 180px | — |
| aspect-ratio | 63/88 | — |
| margin | 6px auto 0 | — |
| border-radius | 10px | — |
| box-shadow | 0 20px 40px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.3) | — |

### Mobile: Content Area
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | 1 | — |
| overflow | hidden | — |
| padding | 20px | — |

### Mobile: Name + Type Header
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | — |
| align-items | flex-start | — |
| justify-content | space-between | — |
| gap | 12px | — |

### Desktop: Modal Container
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | — | absolute |
| top | — | 50% |
| left | — | 50% |
| transform | — | translate(-50%, -50%) |
| width | — | 820px |
| background | — | #1A160F |
| border | — | 1px solid #3A3229 |
| border-radius | — | 16px |
| box-shadow | — | 0 40px 100px rgba(0,0,0,0.7) |
| display | — | flex |
| overflow | — | hidden |

### Desktop: Art Column
| Property | Desktop |
|----------|---------|
| width | 320px |
| flex | none |
| padding | 28px |
| background | #14110E |
| display | flex |
| align-items | center |
| justify-content | center |

### Desktop: Art Image
| Property | Desktop |
|----------|---------|
| width | 100% |
| aspect-ratio | 63/88 |
| border-radius | 12px |
| box-shadow | 0 24px 50px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(0,0,0,0.3) |

### Desktop: Content Column
| Property | Desktop |
|----------|---------|
| flex | 1 |
| padding | 30px 32px |
| position | relative |

### Desktop: Close Button
| Property | Desktop |
|----------|---------|
| position | absolute |
| top | 22px |
| right | 24px |
| width | 34px |
| height | 34px |
| border-radius | 999px |
| background | #221D16 |
| border | 1px solid #3A3229 |
| color | #A89B84 |
| display | flex |
| align-items | center |
| justify-content | center |
| font-size | 15px |
| cursor | pointer |

### Card Name
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'Cinzel', serif | 'Cinzel', serif |
| font-weight | 700 | 700 |
| font-size | 22px | 29px |
| margin | 0 | 0 |
| color | #EDE6D8 | #EDE6D8 |
| line-height | 1.15 | 1.1 |

### Card Type Line (below name)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 13px | 14px |
| color | #A89B84 | #A89B84 |
| margin-top | 4px | 6px |

### Mana Cost Pip Container
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| gap | 4px | 5px |
| flex | none | none |
| padding-top | 4px | — |

### Header row — the cost may take its own line

**Added 2026-09-16.** The name and the cost share a row, and the row **wraps**:
a cost too wide to sit beside the name drops below it rather than squeezing the
name into two lines. `Find // Finality` was drawn on two lines because its
five-pip split cost took 173px of a 388px column, leaving 203px for a name that
wants 241px.

**There is no threshold.** Flex wraps on an item's hypothetical width, and the
name block sizes to its content (`flex-initial`), so the rule falls out of the
two widths: a name that fits beside its cost keeps the line, and one that does
not sends the cost below. `Smothering Tithe` at 285px plus a 57px two-pip cost
still shares the row; `Sol Ring` at 137px always did. A `flex-1` on the name
block would give it a zero basis and defeat this — the row would shrink the name
instead, which is the defect — so `probe:mana-symbols` reads the cost's own top
against the title's rather than the class list.

**Both widths.** The name block is in this row on a phone as well: the art
header takes it only when the header collapses, which wants the printing picker
expanded, and that is not the state a modal opens in. Measured at 390px,
`Repudiate // Replicate`'s cost sits on its own line with the name whole above
it — the same rule, at the width where the column is tightest.

| Property | Mobile | Desktop |
|----------|--------|---------|
| flex-wrap | wrap | wrap |
| Name block | sizes to content, `min-w-0`, never `flex-1` — and moves to the art header only in the collapsed state | sizes to content, `min-w-0`, never `flex-1` |
| Wrapped cost | its own line, left-aligned under the name block | its own line, left-aligned under the name block |

### Mana Pip (printed symbol)

**Supersedes the two lettered-disc rows below**, ratified 2026-09-14: at this size the pip
draws Scryfall's printed symbol — the art the color filter's own pips already use, extended
from its five hues to every symbol a cost can contain. A twobrid's split ground, a Phyrexian's
phi, snow and colourless each say something the disc could only approximate, and one lettered
disc among printed symbols would be two treatments inside one cost. The symbols are finished
illustrations, drawn as art and never masked or tinted.

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 22px | 26px |
| height | 22px | 26px |
| border-radius | 999px | 999px |
| background | `center / contain no-repeat url(/mana/<slug>.svg)` | same |
| display | flex | flex |
| align-items | center | center |
| justify-content | center | center |

### Mana Cost Half Separator

**Added 2026-09-15.** A `split`, `adventure` or `prepare` card prints two real
castable costs on one piece of card stock (`Repudiate // Replicate` is
`{G/U}{G/U} // {1}{G}{U}`), and this surface draws both. The mark between them
is the same `//` the printed name carries, so the two separators on the card
agree. It is punctuation between two costs, not a third cost, which is why it
takes the muted ink and no ground.

A cost in a row keeps the front half alone: the 72px track caps at five pips and
cannot hold two costs and a separator, and that reader is one tap from this
modal.

**Two surfaces draw both halves, and the difference between them is the
question each asks** (amended 2026-09-15, `CostPips` gains `allFaces`):

| Surface | Draws | Gate |
|---|---|---|
| The card modal, and `/collection/proxies` | Every printed cost, `//` between | Does the card print ANY cost |
| Every run in a column | The front half alone | `hasFrontFaceCost` |

The proxy sheet is the second one because it stands in for the card you play
with: a proxy of `Repudiate // Replicate` carrying one of its two costs is a
card you cannot cast the other half of. Its gate differs for the same reason —
a card whose front is a land and whose back is a spell has no front cost and a
real back one, and on a printed sheet that is the cost the reader needs, where
a row deliberately draws nothing for it.

**A castable back face counts as a second cost.** Scryfall keeps a two-sided
card's costs in `card_faces` rather than at the top level, and the ingest joins
them into the same `a // b` string a split card already carries — so a modal DFC
(Birgi, God of Storytelling // Harnfel, Horn of Bounty) draws both halves here
and its front half in a row. A `transform` back is free, so nothing is joined
for it and only one cost is ever drawn. The costs appear after a catalog
refresh, not at deploy.

| Property | Mobile | Desktop |
|----------|--------|---------|
| content | `//` | `//` |
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 12px | 13px |
| color | --fg-muted | --fg-muted |
| padding-inline | 1px | 1px |
| background | none | none |
| Spoken as | `second cost` before the second half — never "or", which a hybrid symbol already says | same |

### Mana Pip (generic {n}) — RETIRED, fallback only
Drawn only for a symbol with no committed art: Scryfall's symbol list grows with the card pool
and `public/mana/` moves only when someone runs `pnpm fetch:mana`, so a symbol printed since the
last run takes this rather than a 26px hole.

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 22px | 26px |
| height | 22px | 26px |
| border-radius | 999px | 999px |
| background | #4A4033 | #4A4033 |
| color | #EDE6D8 | #EDE6D8 |
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 12px | 13px |
| display | flex | flex |
| align-items | center | center |
| justify-content | center | center |

### Mana Pip (WUBRG colored) — RETIRED, fallback only
Same fallback rule as the row above.

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 22px | 26px |
| height | 22px | 26px |
| border-radius | 999px | 999px |
| background | WUBRG hex (e.g. #4A7FB5 for U) | WUBRG hex |
| color | #14110E | #14110E |
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 12px | 13px |
| font-weight | 600 | 600 |
| display | flex | flex |
| align-items | center | center |
| justify-content | center | center |

### Oracle Text Block
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | #14110E | #14110E |
| border | 1px solid #2A241D | 1px solid #2A241D |
| border-radius | 10px | 10px |
| padding | 14px 16px | 18px 20px |
| margin-top | 16px | 22px |
| font-size | 13.5px | 15px |
| line-height | 1.6 | 1.65 |
| color | #C6B79A | #C6B79A |

### Oracle Text: Keyword / bold
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | #EDE6D8 | #EDE6D8 |
| font-weight | 600 | 600 |

### Oracle Text: Reminder Text (italic)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-style | italic | italic |

### Mobile: Meta 2×2 Grid
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | grid | — |
| grid-template-columns | 1fr 1fr | — |
| gap | 1px | — |
| background | #2A241D | — |
| border | 1px solid #2A241D | — |
| border-radius | 10px | — |
| overflow | hidden | — |
| margin-top | 16px | — |

### Mobile: Meta Cell
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | #1E1A15 | — |
| padding | 11px 14px | — |

### Desktop: Meta Fields (flex row)
| Property | Desktop |
|----------|---------|
| display | flex |
| gap | 26px |
| margin-top | 24px |
| flex-wrap | wrap |

### Meta Label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 9.5px | 10px |
| letter-spacing | 0.12em | 0.14em |
| color | #8E8269 | #8E8269 |
| text-transform | uppercase | uppercase |

### Meta Value (Set, Identity name)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 13px | 14px |
| color | #EDE6D8 | #EDE6D8 |
| margin-top | 3px | 5px |

### Meta Value (Rarity)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 13px | 14px |
| color | #C9A24B | #C9A24B |
| margin-top | 3px | 5px |

### Meta Value (You Own — quantity)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 13px | 14px |
| color | #C9A24B | #C9A24B |
| margin-top | 3px | 5px |

### Copy (meta labels)
| Field | Copy |
|-------|------|
| Set label | `Set` |
| Rarity label | `Rarity` |
| Identity label | `Identity` |
| You own label | `You own` |

### Copy (meta value examples)
| Field | Mobile | Desktop |
|-------|--------|---------|
| Set value | `Return to Ravnica` | `Return to Ravnica · RTR` |
| You own value | `×1` | `×1 copy` |

### Identity Pip (in meta)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 12px | 13px |
| height | 12px | 13px |
| border-radius | 999px | 999px |

### Desktop: Prev/Next Navigation
| Property | Desktop |
|----------|---------|
| display | flex |
| align-items | center |
| gap | 10px |
| margin-top | 28px |
| border-top | 1px solid #2A241D |
| padding-top | 20px |

### Prev Button "‹ Prev"
| Property | Desktop |
|----------|---------|
| color | #8E8269 |
| font-size | 15px |
| cursor | pointer |

### Position Counter
| Property | Desktop |
|----------|---------|
| font-family | 'IBM Plex Mono', monospace |
| font-size | 11px |
| color | #8E8269 |
| margin-left | auto |

### Next Button "Next ›"
| Property | Desktop |
|----------|---------|
| color | #C9A24B |
| font-size | 15px |
| cursor | pointer |
| margin-left | auto |

### Copy (navigation)
| Context | Copy |
|---------|------|
| Previous | `‹ Prev` |
| Next | `Next ›` |
| Position counter | `6 of 1,418` (example) |
| URL pattern | `?card=<oracleId>` (stable key — the design mock shows a name slug, but the implementation deep-links by oracle id to avoid slug collisions/renames) |

---

## Component: Printing Picker (#105)

Rendered only when `card.printings.length > 1`. At one printing the modal is byte-for-byte
what it is today (handoff decision 6), so every row below is conditional on that count.

### Set Field — 2+ printings, collapsed (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| element | — | `button[aria-expanded][aria-controls]` wrapping the shipped MetaField markup |
| background | — | #2A241D (--elevated) |
| border | — | 1px solid #4A4033 (--border-dashed) |
| border-radius | — | 8px |
| padding | — | 8px 12px |
| margin | — | -8px -12px (so the meta row's 26px gap rhythm is unchanged) |
| label line | — | mono 10px, 0.14em, uppercase, #8E8269 — `Set` |
| value line | — | 14px #EDE6D8 — `printingCaption(card)` |
| hint line (no pick) | — | mono 11px #C9A24B — `N printings you own ▾` |
| hint line (expanded) | — | same, chevron `▴` |
| hint line (picked) | — | 7px #C9A24B diamond + `Your pick` (mono 10px, 0.14em, uppercase, #C9A24B) + `· of N ▾` (mono 11px #8E8269) |

### Set Row — 2+ printings (mobile)
Promoted out of the 2×2 MetaCell grid into a full-width row. Rarity and Identity stay in the
grid above it, so the disclosure and its region are last in the column.

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 100% | — |
| display | flex | — |
| align-items | center | — |
| gap | 12px | — |
| min-height | 62px | — |
| padding | 11px 14px | — |
| background | #2A241D (--elevated) | — |
| border | 1px solid #4A4033 (--border-dashed) | — |
| border-radius | 10px collapsed; 10px 10px 0 0 expanded | — |
| thumbnail | 40×56, border-radius 5px, inset 0 0 0 1px rgba(0,0,0,0.35) | — |
| label line | mono 9.5px, 0.12em, uppercase, #8E8269 | — |
| value line | 13px #EDE6D8 | — |
| hint line | as desktop | — |

### Region Container
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | continuation of the Set row | block inside `.flex-1.overflow-auto` |
| margin-top | -1px | 24px |
| padding | 14px | 22px 0 0 |
| border | 1px dashed #4A4033, border-top none | none; border-top 1px solid #2A241D (--border) |
| border-radius | 0 0 10px 10px | 0 |
| role | radiogroup, aria-label `Printings you own` | same |

### Region Intro
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 13.5px | 13.5px |
| color | #A89B84 (--fg-muted) | #A89B84 |
| reset link | right-aligned, 13px #C9A24B, only once a pick exists | same |

### Tile Grid
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | grid | grid |
| grid-template-columns | repeat(3, 1fr) | repeat(3, 1fr) |
| gap | 12px (~101px tiles) | 16px (~135px tiles) |
| margin-top | 16px | 16px |

### Tile — art region
| Property | Mobile | Desktop |
|----------|--------|---------|
| aspect-ratio | 63/88 | 63/88 |
| border-radius | 10px | 10px |
| box-shadow | inset 0 0 0 1px rgba(0,0,0,0.35) | same |
| background | Scryfall image, else color-identity gradient | same |
| outline-offset | 3px | 3px |
| outline — your pick | 2px solid #C9A24B | same |
| outline — shown now | 1px dashed #8E8269 | same |
| outline — dormant | 2px dashed #C9A24B | same |
| outline — rest | none | none |
| focus | global `:focus-visible` — 2px #C9A24B at 2px offset, not overridden | same |
| filter — dormant | grayscale(0.55) | same |
| opacity — dormant | 0.55 (on the tile wrapper) | same |

### Tile — badge
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute, top 8px right 8px | same |
| size — your pick | 21×21, border-radius 5px | same |
| size — shown now / dormant | 19×19, border-radius 5px | same |
| your pick | background #C9A24B, `✓` in #14110E (≈9.4:1) | same |
| shown now | background rgba(10,8,6,0.72), 1px dashed #8E8269, `◇` in #C6B79A | same |
| dormant | background rgba(10,8,6,0.78), 1px solid #C9A24B, `✓` in #C9A24B | same |
| font-size | 11px | 11px |

### Tile — caption
| Property | Mobile | Desktop |
|----------|--------|---------|
| set name | 12px #EDE6D8, wraps to 2 lines, no truncation | 13px |
| set name weight — your pick | 600 | 600 |
| meta line | mono 10.5px #8E8269 | mono 11px |
| meta line — your pick | #C6B79A (--fg-body) | same |
| meta content | `#<collector> · ×N`; the field and its separator are omitted entirely when the collector number is `''` | same |
| badge line | mono 9.5px, 0.14em, uppercase | same |
| badge line — your pick / dormant | #C9A24B, preceded by a 7px brass diamond | same |
| badge line — shown now | #A89B84, no diamond | same |

### Foil Sheen (decorative)
| Property | Mobile | Desktop |
|----------|--------|---------|
| condition | printing has any foil or etched copies | same |
| background | linear-gradient(115deg, rgba(255,255,255,0.20) 4%, transparent 24%, rgba(201,162,75,0.20) 44%, rgba(255,255,255,0.16) 56%, transparent 80%) | same |
| clipping | inside the 10px radius, pointer-events none | same |

### Dormant Note
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | #211C15 (--elevated-hover) | same |
| border | 1px solid #3A3229 (--border-strong) | same |
| border-radius | 9px | 9px |
| padding | 12px 14px | 12px 14px |
| leading mark | 7px #8E8269 diamond | same |
| body | 12.5px #C6B79A | same |
| forget link | 12.5px #C9A24B | same |

### Overflow Affordances (past 12 entries)
| Property | Mobile | Desktop |
|----------|--------|---------|
| search field | `SearchField` from text-field.tsx, unmodified | same |
| search font-size | 16px (iOS zoom floor) | 13.5px |
| search matches | set name, set code, collector number — never card name | same |
| finish chips | chip-row.tsx geometry: --elevated fill, 1px #3A3229, radius 999px, 12px | 12.5px |
| finish chips — active | background #C9A24B, color #14110E; single-select, no dismiss ✕ | same |
| finish chip labels | `All N` / `Foil N` / `Non-foil N`; etched counts as foil | same |
| set group header | mono 9.5px, 0.16em, uppercase, #8E8269 — `Bloomburrow · BLB · 4` | mono 10px |
| set group order | release date descending, ties A→Z, undated last | same |

### Mobile: Art Header — compact variant
Applies only while the region is expanded **and** the card is past the overflow threshold.
Below the threshold the shipped 180px header is untouched.

| Property | Mobile | Desktop |
|----------|--------|---------|
| padding | 44px 20px 14px | — |
| display | flex | — |
| align-items | flex-end | — |
| gap | 14px | — |
| art width | 72px, aspect-ratio 63/88, border-radius 10px | — |
| name | display 22px/1.15 bold #EDE6D8, beside the art | — |
| type line | 13px #A89B84 | — |
| text-shadow | 0 2px 8px rgba(0,0,0,0.5) | — |
| a11y | visual only (`aria-hidden`); the dialog's accessible name stays on the h3 in the content column | — |

### Accessibility
| Property | Value |
|----------|-------|
| trigger | `button[aria-expanded][aria-controls=<region id>]` |
| region | `div[role=radiogroup][aria-label="Printings you own"]` |
| tile | `button[role=radio][aria-checked]` |
| dormant tile | `aria-disabled`, `tabindex=-1`, not in the arrow-key sequence |
| checked state | nothing is checked until a pick exists (decision 10) |
| roving tabindex | parks on the pick, else on the shown-now entry |
| arrow keys | move **and** select; Home/End jump the ends; no wrap |
| Tab | leaves the group |
| Escape | with a printing search typed, the first press clears it (DECK INPUT UX, `escapeDismisses`); then a press collapses the region and returns focus to the Set field; the next closes the dialog |
| focus trap | the existing dialog trap already covers the region — no new trap |
| live region | exactly one `aria-live="polite"` in the modal; the region never renders its own |
| minimum tile | ≥ 100×140 |

### Copy Inventory — Printing Picker
All strings live in `printingPickerCopy.printing` (`src/lib/copy/collection.ts`). No string
literals in the components.

---

## Component: No Results State

### No Results Container
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | 1 | flex: 1 |
| display | flex | flex |
| flex-direction | column | column |
| align-items | center | center |
| justify-content | center | center |
| text-align | center | center |
| padding | 36px | 48px |

### Crab Mark (v2 — replaces the "?" card fan)
| Property | Mobile | Desktop |
|----------|--------|---------|
| component | `<Crab size={72}>` | `<Crab size={96}>` |
| width × height | 72 × 49.5px | 96 × 66px |
| stroke | var(--brass) #C9A24B | var(--brass) #C9A24B |
| fill | var(--surface) #1E1A15 | var(--surface) #1E1A15 |
| animation | `anim-bob`, 4.5s | `anim-bob`, 4.5s |
| reduced motion | `animation: none` (globals.css) | `animation: none` (globals.css) |
| aria | `aria-hidden` | `aria-hidden` |

> The v1 `"?"` card fan (`FanCard` / `QuestionFan`) is **deleted**, not dormant.
> Its Card Fan Mark Container / Back / Middle / Front / "?" Glyph rows are
> retired with it.

### No Results Container: Vignette (v2)
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `radial-gradient(440px 260px at 50% 78%, rgba(201,162,75,0.07), transparent 70%)` | same |

### No Results Heading
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'Cinzel', serif | 'Cinzel', serif |
| font-weight | 700 | 700 |
| font-size | 21px | 26px |
| margin | 18px 0 0 | 18px 0 0 |
| color | #EDE6D8 | #EDE6D8 |

### No Results Body Copy
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 13.5px | 15px |
| color | #C6B79A | #C6B79A |
| line-height | 1.55 | 1.6 |
| margin | 10px 0 0 | 12px 0 0 |
| max-width | — | 360px (v2) |

### Copy (no results)
| Element | Copy |
|---------|------|
| Heading (query + color) | `Nothing matches "counterspell" in Red.` |
| Heading (query only) | `Nothing matches "counterspell".` |
| Heading (color only) | `Nothing matches in Red.` |
| Heading (fallback) | `Nothing matches those filters.` |
| Body | `Which, honestly, checks out. Drop the color filter or try another name.` |
| Primary CTA | `Clear filters` |
| Secondary CTA (desktop) | `Keep only search` |

> **v2 copy, verbatim from Surfaces v2 §Collection.** One caption at both
> breakpoints — the v1 mobile/desktop split and the `totalCount` sentence ("you
> own 2,933 cards, just not this one") are gone. `totalCount` is **retained as a
> prop** so re-adding it is not a signature change. "Keep only search" is
> **retained**: it is the only way to escape a color filter without also losing
> the query, and the mock is a single frame that does not assert its removal.
> Collection carries four filter dimensions (search, colors, types, setCodes)
> and the mock's heading names two; type- or set-only zero states land on the
> fallback heading by design. All three are flagged for Design to ratify.

### No Results CTA Container (desktop)
| Property | Desktop |
|----------|---------|
| display | flex |
| gap | 12px |
| margin-top | 26px |

### "Clear filters" Button (primary)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Sans' | 'IBM Plex Sans' |
| font-weight | 600 | 600 |
| font-size | 13px | 14px |
| color | #14110E | #14110E |
| background | #C9A24B | #C9A24B |
| border | none | none |
| border-radius | 8px | 8px |
| padding | 11px 20px | 12px 22px |
| cursor | pointer | pointer |
| margin-top | 22px | — |

### "Keep only search" Button (secondary, desktop only)
| Property | Desktop |
|----------|---------|
| font-family | 'IBM Plex Sans' |
| font-weight | 600 |
| font-size | 14px |
| color | #EDE6D8 |
| background | transparent |
| border | 1px solid #3A3229 |
| border-radius | 8px |
| padding | 12px 22px |
| cursor | pointer |

#### Hover State — "Keep only search"
| Property | Desktop hover |
|----------|---------------|
| border-color | #C9A24B |

---

## Component: Replace Flow — Step 1 (Upload)

### Page Header (mobile)
Drawn by `replace-flow.tsx` for the UPLOAD step only; the review draws its own header (Step 2). Not drawn when the flow is embedded in first run's step-1 card.

| Property | Mobile | Desktop |
|----------|--------|---------|
| renders | upload step, not embedded | — (hidden below `md`; the desktop header is the breadcrumb and title below) |
| padding | 20px 18px 14px | — |
| display | flex | — |
| align-items | center | — |
| gap | 12px | — |
| border-bottom | 1px solid var(--border) | — |

### Back Chevron "‹"
| Property | Mobile | Desktop |
|----------|--------|---------|
| element | link to `/collection`, `aria-label="Back to Collection"` | — |
| color | var(--accent) | — |
| font-size | 20px | — |

### Page Title (`replaceCopy.pageTitle(n)`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| copy | `Add your collection` at 0 cards; `Replace collection` otherwise | same |
| element | h1 | h1 |
| font-family | display (Cinzel) | display (Cinzel) |
| font-weight | 600 | 700 |
| font-size | 19px | 30px |
| margin-top | — | 8px (below the breadcrumb) |
| color | var(--fg) | var(--fg) |

### Desktop Breadcrumb Link "‹ Collection"
| Property | Desktop |
|----------|---------|
| font-family | 'IBM Plex Mono', monospace |
| font-size | 11px |
| color | #8E8269 |
| letter-spacing | 0.06em |

### Desktop Content Area
| Property | Desktop |
|----------|---------|
| padding | 44px 48px |
| max-width | 760px |

### Replace Note
A plain note, not a warning (calm-replace §2). Drawn by `upload-entry.tsx` above the drop zone. It replaces the retired warning banner, its ⚠ icon and its amber left rule.

| Property | Mobile | Desktop |
|----------|--------|---------|
| renders | only when `currentCardCount > 0` | only when `currentCardCount > 0` |
| element | p | p |
| background | var(--surface-sunken) | var(--surface-sunken) |
| border | 1px solid var(--border) (all sides, no left rule) | 1px solid var(--border) (all sides, no left rule) |
| border-radius | 10px | 10px |
| padding | 14px 18px | 14px 18px |
| margin-top | 0 | 20px |
| font-size | 14px | 14px |
| line-height | 1.6 | 1.6 |
| color | var(--fg-body) | var(--fg-body) |
| text-wrap | pretty | pretty |
| icon | — (none) | — (none) |
| count span | var(--fg), weight 600 | var(--fg), weight 600 |

#### Copy (replace note)
| Part | Copy |
|------|------|
| Before the count (`note.before`) | `A new list replaces your current ` |
| Count span (`note.count(n)`) | `2,933 cards` (`1 card` at one) |
| After the count (`note.after`) | `; nothing is merged. You’ll see every match before anything changes.` |

Drawn as one sentence, with the count span between the two parts.

### Upload Drop Zone
| Property | Mobile | Desktop |
|----------|--------|---------|
| border | 1.5px dashed #4A4033 | 1.5px dashed #4A4033 |
| border-radius | 12px | 12px |
| background | #181410 | #181410 |
| padding | 30px 18px | 40px |
| text-align | center | — |
| display | — | flex |
| align-items | — | center |
| gap | — | 28px |
| margin-top | 16px | 18px |

#### Hover State — Upload Drop Zone
| Property | Desktop hover |
|----------|---------------|
| border-color | #C9A24B |
| background | #1C1712 |

### Upload Icon Circle
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 48px | 58px |
| height | 48px | 58px |
| flex | — | none |
| border-radius | 999px | 999px |
| border | 1px solid #C9A24B | 1px solid #C9A24B |
| color | #C9A24B | #C9A24B |
| font-size | 20px | 26px |
| display | flex | flex |
| align-items | center | center |
| justify-content | center | center |
| margin | 0 auto 14px | — |

### Upload Title
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 15px | 17px |
| color | #EDE6D8 | #EDE6D8 |
| font-weight | 600 | 600 |

### Upload Subtitle (formats)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 10px | 11px |
| color | #8E8269 | #8E8269 |
| margin-top | 6px | 6px |
| letter-spacing | 0.06em | 0.06em |

### Copy (upload area)
| Element | Copy |
|---------|------|
| Mobile title | `Drop your new CSV` |
| Desktop title | `Drop your new collection CSV here` |
| Formats | `Moxfield · Archidekt · Deckbox · ManaBox · CSV` (mobile) / `· plain CSV` (desktop) |

### "Browse files" Button
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Sans' | 'IBM Plex Sans' |
| font-weight | 600 | 600 |
| font-size | 13px | 14px |
| color | #14110E | #14110E |
| background | #C9A24B | #C9A24B |
| border | none | none |
| border-radius | 8px | 8px |
| padding | 11px 20px | 11px 22px |
| cursor | pointer | pointer |
| margin-top | 16px | — |
| white-space | — | nowrap |

#### Hover State — Browse Files Button
| Property | Desktop hover |
|----------|---------------|
| background | #D8B25E |

### Helper Text (column requirements)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 12px | 13px |
| color | #8E8269 | #8E8269 |
| line-height | 1.55 | 1.5 |
| margin-top | 14px | — |

### "Paste a list instead" Link
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | #C9A24B | #C9A24B |
| font-size | 12px | 13px |
| white-space | — | nowrap |

### Copy (helper + link)
| Element | Copy |
|---------|------|
| Helper (mobile) | `Only a Name and Quantity column are required. Paste a list instead` |
| Helper (desktop) | `We only need a Name and Quantity column: most exports already include them.` |
| Link | `Paste a list instead →` |

---

## Component: Replace Flow — Step 2 (Review, 2a — Single Scroll)

### Page Header (mobile)
No chevron: Cancel in the confirm bar is the phone's exit (calm-replace §3.20). Not drawn when the review is embedded in first run's step-1 card (calm-replace §3.1).

| Property | Mobile | Desktop |
|----------|--------|---------|
| renders | not embedded | — (hidden below `md`) |
| padding | 18px 18px 14px | — |
| display | flex | — |
| flex | none | — |
| align-items | baseline | — |
| gap | 12px | — |
| border-bottom | 1px solid var(--border) | — |
| back chevron | — (removed) | — |

### Mobile Page Title "Review import"
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'Cinzel', serif | — |
| font-weight | 600 | — |
| font-size | 18px | — |
| color | #EDE6D8 | — |

### Filename Label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 10px | 11px |
| color | #8E8269 | #8E8269 |
| margin-left | auto (mobile) | — |

### Desktop Step Indicator
| Property | Desktop |
|----------|---------|
| font-family | 'IBM Plex Mono', monospace |
| font-size | 11px |
| color | #8E8269 |
| letter-spacing | 0.06em |

### Copy (step indicator)
| Context | Copy |
|---------|------|
| Desktop step | `STEP 2 OF 3 · the-vault.csv · 2,933 rows` |

### Desktop Page Title "Review before you replace"
| Property | Desktop |
|----------|---------|
| font-family | 'Cinzel', serif |
| font-weight | 700 |
| font-size | 29px |
| margin | 12px 0 0 |
| color | #EDE6D8 |

### Desktop Content Area
| Property | Desktop |
|----------|---------|
| padding | 36px 56px 20px |
| max-width | 940px |
| margin | 0 auto |

### Review Summary Banner: Matched Card
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | #1E1A15 | #1E1A15 |
| border | 1px solid #2A241D | 1px solid #2A241D |
| border-left | — | 3px solid #6FA368 |
| border-radius | 12px | 12px |
| padding | 16px | 20px 22px |
| display | flex | flex |
| align-items | center | center |
| gap | 10px | 16px |
| flex | — | 1.4 |

### Matched Count: Success Icon
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 30px | 44px |
| height | 30px | 44px |
| border-radius | 999px | 999px |
| background | rgba(111,163,104,0.15) | rgba(111,163,104,0.15) |
| color | #6FA368 | #6FA368 |
| display | flex | flex |
| align-items | center | center |
| justify-content | center | center |
| font-size | 15px | 20px |

### Matched Count: Number
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 22px | 30px |
| font-weight | 600 | 600 |
| color | #EDE6D8 | #EDE6D8 |
| line-height | 1 | 1 |

### Matched Count: Label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 11.5px | 13px |
| color | #8E8269 | #A89B84 |
| margin-top | 2px | 4px |

### Copy (summary labels)
| Element | Copy |
|---------|------|
| Matched label (mobile) | `cards matched & ready` |
| Matched label (desktop) | `cards matched to the Oracle database: ready to import` |

### Issue Summary Mini Stats (mobile)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | — |
| gap | 8px | — |
| margin-top | 14px | — |

### Mini Stat Cell
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | 1 | — |
| background | #181410 | — |
| border | 1px solid #2A241D | — |
| border-radius | 8px | — |
| padding | 9px 11px | — |

### Mini Stat Number
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | — |
| font-size | 15px | — |

### Mini Stat Number Colors
| Stat | Color |
|------|-------|
| Unmatched count | #E0913C |
| Parse errors count | #C6533F |
| Rows read | #EDE6D8 |

### Mini Stat Label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 10.5px | — |
| color | #8E8269 | — |
| margin-top | 1px | — |

### Desktop Summary: Issue Tally Panel
| Property | Desktop |
|----------|---------|
| flex | 1 |
| background | #1E1A15 |
| border | 1px solid #2A241D |
| border-radius | 12px |
| padding | 16px 18px |
| display | flex |
| flex-direction | column |
| justify-content | center |
| gap | 10px |

### Desktop Tally Row (unmatched)
| Property | Desktop |
|----------|---------|
| display | flex |
| align-items | center |
| gap | 10px |

### Tally Dot
| Property | Desktop |
|----------|---------|
| width | 9px |
| height | 9px |
| border-radius | 999px |
| flex | none |

### Tally Count
| Property | Desktop |
|----------|---------|
| font-family | 'IBM Plex Mono', monospace |
| font-size | 16px |

### Tally Count Colors
| Type | Color |
|------|-------|
| Unmatched | #E0913C |
| Parse errors | #C6533F |

### Tally Label
| Property | Desktop |
|----------|---------|
| font-size | 13px |
| color | #A89B84 |

### Skipped Rows Footnote
| Property | Desktop |
|----------|---------|
| font-size | 11.5px |
| color | #8E8269 |
| border-top | 1px solid #2A241D |
| padding-top | 9px |

### Copy (issue tallies)
| Element | Copy |
|---------|------|
| Unmatched | `21 names not in the card catalog` |
| Parse errors | `8 unreadable lines` |
| Skipped footnote | `29 rows will be skipped` |

### Issue Section Headers
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 10px | 10px |
| letter-spacing | 0.14em | 0.14em |
| text-transform | uppercase | uppercase |
| margin-bottom | 8px | 10px |

### Issue Section Header Colors
| Type | Color |
|------|-------|
| Unmatched header | #E0913C |
| Parse error header | #C6533F |

### Copy (issue section headers)
| Type | Copy |
|------|------|
| Unmatched | `Not in the catalog: 21 skipped` (mobile) / `Names not in the card catalog: 21` (desktop) |
| Parse errors | `Unreadable lines: 8` (desktop) |

### Desktop Issues Layout
| Property | Desktop |
|----------|---------|
| display | grid |
| grid-template-columns | 1fr 1fr |
| gap | 22px |
| margin-top | 24px |

### Issue Row — Unmatched Name
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center / space-between |
| gap | 10px | 12px |
| background | #1E1A15 | #1E1A15 |
| border | 1px solid #2A241D | 1px solid #2A241D |
| border-left | 3px solid #E0913C | 3px solid #E0913C |
| border-radius | 8px | 8px |
| padding | 9px 12px | 11px 14px |

### Issue Row — Name Text
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 13px | 14px |
| color | #EDE6D8 | #EDE6D8 |
| white-space | nowrap | — |
| overflow | hidden | — |
| text-overflow | ellipsis | — |

### Issue Row — Meta Line
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 10px | 10.5px |
| color | #8E8269 | #8E8269 |
| margin-top | — | 2px |

### Issue Row — Quantity (right)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 11px | 12px |
| color | #8E8269 | #8E8269 |

### Issue Row — Parse Error
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center / flex-start | flex-start |
| gap | 10px | 12px |
| background | #1E1A15 | #1E1A15 |
| border | 1px solid #2A241D | 1px solid #2A241D |
| border-left | 3px solid #C6533F | 3px solid #C6533F |
| border-radius | 8px | 8px |
| padding | 9px 12px | 11px 14px |

### Issue Row — Line Number Label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 10px | 11px |
| color | #C6533F | #C6533F |
| flex | none | none |
| padding-top | — | 1px |

### Issue Row — Error Description
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 13px | 13px |
| color | #C6B79A | #C6B79A |
| line-height | — | 1.45 |

### "Show all N" Link
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 12px | 12.5px |
| color | #C9A24B | #C9A24B |
| padding | — | 4px 2px |

### Copy (issue links)
| Element | Copy |
|---------|------|
| Mobile | `View all 29 issues →` |
| Desktop unmatched | `Show all 21 unmatched →` |
| Desktop errors | `Show all 8 errors →` |

### Sticky Confirm Bar
Sticky on `/collection/replace` at both widths; embedded in first run it is the card's foot, in flow (calm-replace §3.8, §3.25).

| Property | Mobile | Desktop |
|----------|--------|---------|
| position (`/collection/replace`) | sticky, bottom var(--tabbar-h) | sticky, bottom 0 |
| position (embedded) | in flow | in flow |
| z-index | 10 | 10 |
| border-top | 1px solid var(--border-strong) | 1px solid var(--border-strong) |
| background | var(--surface-rail) | var(--surface-rail) |
| padding (`/collection/replace`) | 12px 18px 14px | 16px 56px |
| padding (embedded) | 12px 14px 14px | 16px 56px |
| margin-top (embedded) | 14px | 0 |
| display | block | flex |
| align-items | — | center |
| gap | — | 20px |

### Sticky Confirm Bar: Summary Sentence
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 11.5px | 13.5px |
| color | var(--fg-faint) | var(--fg-body) |
| text-align | center | left |
| margin-bottom | 10px | 0 |

### Copy (sticky confirm bar)
| Element | Copy |
|---------|------|
| Mobile summary (replace) | `Skips 29 rows · replaces your 2,933 cards with 2,904` |
| Desktop summary (replace) | `Importing 2,904 cards and skipping 29. This replaces your current 2,933 cards.` |
| Mobile summary (first import) | `Imports 2,904 cards · skips 29 rows` |
| Desktop summary (first import) | `Importing 2,904 cards and skipping 29.` |
| CTA (replace) | `Continue to replace →` |
| CTA (first import) | `Continue to import →` |
| CTA (first import, pending) | `Importing…` |
| Cancel (`replaceCopy.review.cancel`, both widths) | `Cancel` |

### Button Row
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex (row) | flex (row) |
| gap | 10px | 12px |
| margin-left | — | auto |
| flex | — | none |
| order | Cancel, then Continue | Cancel, then Continue |

### Cancel Button
Rendered at BOTH widths. On the phone it is the review's exit, a hairline left of Continue (calm-replace §3.11, §3.28; audit correction 6). It returns to the upload entry on `/collection/replace`, and to step 1's two buttons when embedded. Disabled while a first import is being written.

| Property | Mobile | Desktop |
|----------|--------|---------|
| component | GhostButton | GhostButton |
| font-family | 'IBM Plex Sans' | 'IBM Plex Sans' |
| font-weight | 600 | 600 |
| font-size | 14px | 14px |
| color | var(--fg) | var(--fg) |
| background | transparent | transparent |
| border | 1px solid var(--border-strong) | 1px solid var(--border-strong) |
| border-radius | 10px | 8px |
| height | 46px | auto |
| padding | 0 18px | 12px 20px |
| flex | none | none |
| cursor | pointer | pointer |
| disabled | opacity 0.6 | opacity 0.6 |

#### Hover State — Cancel Button
| Property | Desktop hover |
|----------|---------------|
| border-color | var(--accent) |
| color | var(--accent-hover) |

### Continue Button
| Property | Mobile | Desktop |
|----------|--------|---------|
| component | PrimaryButton | PrimaryButton |
| font-family | 'IBM Plex Sans' | 'IBM Plex Sans' |
| font-weight | 600 | 600 |
| font-size | 15px | 14px |
| color | var(--bg) | var(--bg) |
| background | var(--fg) | var(--fg) |
| border | none | none |
| border-radius | 10px | 8px |
| height | 46px | auto |
| padding | 0 | 12px 24px |
| flex | 1 | none |
| white-space | — | nowrap |
| cursor | pointer | pointer |
| disabled (first import pending) | opacity 0.6, cursor wait | opacity 0.6, cursor wait |

#### Hover State — Continue Button
| Property | Desktop hover |
|----------|---------------|
| background | var(--fg-body) |

---

## Component: Replace Flow — Step 3 (Replace Confirm)

Drawn by `confirm-modal.tsx`; the design source is calm-replace §1. Continue on the review and this dialog's button are two deliberate presses, so there is no typed token and no icon, and nothing on the resting or pending dialog is `--danger` or `--warning`. It opens only on a replace (the collection already has cards). A first import skips it; the one road to it with nothing to replace is a FAILED first import, which opens the import variant below.

### Scrim
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | fixed, inset 0 | fixed, inset 0 |
| z-index | 50 | 50 |
| background | color-mix(in oklab, var(--bg) 70%, transparent) | color-mix(in oklab, var(--bg) 74%, transparent) |
| alignment | flex, items end (sheet at the foot) | flex, items center |
| press | closes when idle; ignored while pending | same |

### Container
| Property | Mobile (bottom sheet) | Desktop (modal) |
|----------|--------|---------|
| role | dialog, `aria-modal`, labelled by the title | same |
| width | 100% | 520px |
| background | var(--surface-rail) | var(--surface-rail) |
| border | border-top 1px solid var(--border-strong) only | 1px solid var(--border-strong) |
| border-radius | 22px 22px 0 0 | 16px |
| padding | 12px 22px 30px | 30px 34px |
| box-shadow | 0 -20px 50px rgba(0,0,0,.5) | 0 40px 100px rgba(0,0,0,.7) |
| icon | — (none) | — (none) |
| Escape | closes when idle; refused while pending | same |
| focus | trapped; initial focus on Keep current | same |

### Sheet Handle (mobile)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 40px | — |
| height | 4px | — |
| border-radius | 999px | — |
| background | var(--border-strong) | — |
| margin | 0 auto 18px | — |
| role | decorative (`aria-hidden`), no drag | — |

### Title
| Property | Mobile | Desktop |
|----------|--------|---------|
| element | h2 | h2 |
| font-family | display (Cinzel) | display (Cinzel) |
| font-weight | 700 | 700 |
| font-size | 20px | 25px |
| line-height | 1.15 | 1.15 |
| margin | 0 | 0 |
| color | var(--fg) | var(--fg) |

### NOW → AFTER Figure Pair
NOW is the current collection count; AFTER is the matched count (calm-replace §1.5 to §1.9).

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | grid, `minmax(0,1fr) auto minmax(0,1fr)`, items center | same |
| margin-top | 16px | 18px |
| gap | 12px | 14px |
| padding | 12px 14px | 14px 16px |
| border-radius | 10px | 10px |
| background | var(--surface-sunken) | var(--surface-sunken) |
| border | 1px solid var(--border) | 1px solid var(--border) |

#### Figure Label (`Now` / `After`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 10px | 10px |
| letter-spacing | 0.12em | 0.12em |
| text-transform | uppercase | uppercase |
| color | var(--fg-faint) | var(--fg-faint) |

#### Figure Number
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 19px | 21px |
| font-weight | 600 | 600 |
| margin-top | 3px | 4px |
| color | var(--fg) | var(--fg) |

#### Figure Caption
| Property | Mobile | Desktop |
|----------|--------|---------|
| copy | short caption | full caption |
| font-size | 11.5px | 12px |
| margin-top | 2px | 2px |
| color | var(--fg-muted) | var(--fg-muted) |

#### Arrow "→"
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 14px | 15px |
| color | var(--fg-faint) | var(--fg-faint) |
| role | decorative (`aria-hidden`) | same |

### Body
| Property | Mobile | Desktop |
|----------|--------|---------|
| copy | `bodyShort` | `body` |
| font-size | 13.5px | 15px |
| line-height | 1.6 | 1.65 |
| margin-top | 16px | 18px |
| color | var(--fg-body) | var(--fg-body) |
| text-wrap | pretty | pretty |

### Error Line
The one red on the dialog (calm-replace §1.11; audit correction 7).

| Property | Mobile | Desktop |
|----------|--------|---------|
| renders | only on a failed confirm | only on a failed confirm |
| role | alert | alert |
| font-size | 13px | 13px |
| margin-top | 10px | 10px |
| color | var(--danger) | var(--danger) |

### Button Row
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex, column-reverse (Replace on top, Keep current below) | flex, row (Keep current, then Replace) |
| gap | 10px | 12px |
| margin-top | 20px | 24px |

### Keep Current Button
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Sans' | 'IBM Plex Sans' |
| font-weight | 600 | 600 |
| font-size | 14px | 14px |
| color | var(--fg) | var(--fg) |
| background | transparent | transparent |
| border | 1px solid var(--border-strong) (hairline) | 1px solid var(--border-strong) (hairline) |
| border-radius | 10px | 8px |
| height | 44px | 46px |
| padding | 0 22px | 0 22px |
| width | 100% | content (flex none) |
| focus | initial focus on open | initial focus on open |
| pending | disabled, opacity 0.6 | disabled, opacity 0.6 |

### Replace With N Cards Button
N is the matched count: what the player gets.

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Sans' | 'IBM Plex Sans' |
| font-weight | 600 | 600 |
| font-size | 15px | 14px |
| color | var(--bg) | var(--bg) |
| background | var(--fg) (bone fill) | var(--fg) (bone fill) |
| border | none | none |
| border-radius | 10px | 8px |
| height | 48px | 46px |
| width | 100% | flex: 1 |
| pending | pending label; disabled, opacity 0.6, cursor wait | same |

### Import Variant
Reached only by a failed first import (the collection read 0 cards when the preview was built), which opens the dialog with its error line. Same geometry as above, and the pair draws NOW from 0. Title and buttons come from `replaceCopy.importConfirm`.

### Copy (replace confirm)
| Element | Copy |
|---------|------|
| Title | `Replace your collection?` |
| Figure labels (drawn uppercase) | `Now` / `After` |
| NOW caption, desktop (n = 2,933) | `cards in your collection` (`card in your collection` at one) |
| NOW caption, mobile | `cards` (`card` at one) |
| AFTER caption, desktop (n = 2,904) | `cards from the-vault.csv` (`card from the-vault.csv` at one) |
| AFTER caption, mobile | `from the-vault.csv` |
| Body, desktop (`body`) | `Your deck lists stay as they are; recommendations and availability update from the new collection. To go back, replace it again with your previous list.` |
| Body, mobile (`bodyShort`) | `Deck lists stay as they are. To go back, replace it again with your previous list.` |
| Keep | `Keep current` |
| Replace (n = 2,904) | `Replace with 2,904 cards` (`Replace with 1 card` at one) |
| Replace, pending | `Replacing…` |
| Import variant title | `Import this collection?` |
| Import variant keep | `Go back` |
| Import variant confirm (n = 2,904) | `Import 2,904 cards` |
| Import variant pending | `Importing…` |
| Error line | the failed confirm's message; `That didn’t go through. Try again.` when it carries none |

---

## State Coverage — Collection (#6)

| State | Triggering condition | Component rendered | Key props required |
|-------|----------------------|--------------------|--------------------|
| **Browse — Rows (1a)** | Default view on mobile; view toggle = rows on desktop | Filter bar + Collection row list | `cards[]`, view=rows, filter bar visible, result count |
| **Browse — Grid (1b)** | Default view on desktop ≥768px; view toggle = grid | Filter bar + Grid tile list (5-up desktop, 2-up mobile) | `cards[]`, view=grid, result count |
| **Card Detail** | User taps/clicks any card row or grid tile | Card detail modal (full-screen sheet mobile, centered overlay desktop) | `card` object with name/type/manaCost/oracleText/set/rarity/identity/qty, `?card=` URL param, position `n of total` |
| **Card Detail — Prev/Next** | User clicks `‹ Prev` or `Next ›` in desktop modal | Same modal, different card, position counter updated | `currentIndex`, `totalFiltered`, same card data shape |
| **No Results** | Search + filter combination returns 0 cards | No results empty state (crab mark + heading + caption + CTAs) | `resultCount = 0`, active filter chips still shown, count label turns #E0913C |
| **Replace · Step 1** | User clicks `↻ Replace collection` button | Replace upload page (`/collection/replace`) | `currentCardCount` (page title; the replace note renders only when it is > 0) |
| **Replace · Step 2 (Review)** | CSV uploaded successfully; server returns preview | Review page with summary banner, unmatched rows, parse error rows, sticky confirm bar | `matched`, `unmatched[]` (name + set + line), `errors[]` (line + reason), `currentCount`, filename |
| **Replace · Step 3 (Confirm)** | User clicks `Continue to replace →` from step 2 (the collection has cards) | Replace confirm (sheet on the phone, 520px modal on desktop) over the dimmed review: title, NOW → AFTER pair, body, Keep current + Replace with N cards; focus on Keep current (calm-replace §1) | `matchedCardCount` (N, the AFTER figure), `currentCollectionCount` (NOW), filename |
| **Replace · Step 3 (Pending)** | Replace pressed, write in flight | Primary reads `Replacing…`; both buttons disabled; Escape and scrim refused | `pending` |
| **Replace · Step 3 (Error)** | The confirm write fails | 13px `--danger` line under the body; buttons re-enabled | `error` |
| **First import** | Continue pressed with 0 cards in the collection | No confirm; Continue commits directly (`Importing…`). A failed write opens the import variant of step 3 with its error line | `currentCollectionCount === 0` |
| **Filter Active (chips shown)** | Any filter applied (color, type, set, or search has value) | Filter chip row visible below filter bar | `activeFilters[]`, `resultCount`, `totalCount` |
| **Filter Empty (no filters)** | No active filters | Chassis row 2 shows "No filters on" / total count | — |

---

## Copy Inventory (all strings)

### Page Title
- `Collection`
- `Replace collection` (step 1 title with a collection; desktop button)
- `Add your collection` (step 1 title at 0 cards)
- `Review import` (step 2 mobile header)
- `Review before you replace` (step 2 desktop)
- `Replace your collection?` (step 3 confirm title)
- `Import this collection?` (step 3 import variant title)

### Subtitle / Stats
- `2,933 cards · 1,418 unique`
- `2,933 cards · 1,418 unique · last updated Jul 12`
- `N cards · N unique · last updated [date]`

### Buttons
- `↻ Replace collection`
- `Browse files`
- `Paste a list instead →`
- `Clear all filters`
- `Keep only search`
- `Continue to replace →`
- `Cancel`
- `Continue to import →` (first import)
- `Replace with 1,212 cards` (step 3; N is the matched count)
- `Replacing…` (step 3, pending)
- `Keep current` (step 3, both widths)
- `Import 1,212 cards` / `Go back` / `Importing…` (step 3 import variant)

### Filter bar / chips
- `Search your cards…` (mobile placeholder)
- `Search by card name…` (desktop placeholder)
- `Type ▾`, `Set ▾`, `A–Z ▾` (compact filter buttons — `Color` is retired; the pips are drawn inline at both widths)
- `Type ▾`, `Set ▾`, `Sort: Name ▾` (desktop filter buttons)
- `FILTERS:` (chip row desktop label — retired with the chip row; the chassis draws row 2 itself)
- `Clear all`
- `No filters on`
- `Showing N of 1,418` (distinct over distinct — see the result-copy note above)
- `Showing 0 of 1,418` (turns amber)
- `1,418 results` (mobile)
- `Showing 1,418 unique · 2,933 total` (desktop, no filters)

### Card Detail
- `‹ Prev`
- `Next ›`
- `6 of 1,418` (example position counter)

### No Results (v2)
- `Nothing matches "[query]" in [Color].` — falls back to `Nothing matches "[query]".`, `Nothing matches in [Color].`, `Nothing matches those filters.`
- `Which, honestly, checks out. Drop the color filter or try another name.` (both breakpoints)
- `Clear filters` / `Keep only search` (desktop only)

### Replace — Step 1 Note
Drawn only when the collection has cards; the count span sits between the two parts.
- `A new list replaces your current ` + `2,933 cards` + `; nothing is merged. You’ll see every match before anything changes.`

### Replace — Step 2 Copy
- `STEP 2 OF 3 · the-vault.csv · 2,933 rows`
- `[N] cards matched to the Oracle database: ready to import`
- `[N] names not in the card catalog`
- `[N] unreadable lines`
- `[N] rows will be skipped`
- `Names not in the card catalog: [N]` (section header)
- `Unreadable lines: [N]` (section header)
- Issue CTA strip (v2, Surfaces v2 §Collection): heading `That CSV put up a fight.`, body `[N] rows were skipped: quantity columns, mostly. Nothing fatal. Want to see the carnage?` (singular `1 row was` derived), CTA `View [N] issues`
- `View all 29 issues →` (v1, replaced by the strip above)
- `Show all 21 unmatched →` / `Show all 8 errors →` (desktop)
- Sticky bar (mobile): `Skips 29 rows · replaces your 2,933 cards with 2,904`
- Sticky bar (desktop): `Importing 2,904 cards and skipping 29. This replaces your current 2,933 cards.`
- Sticky bar, first import (mobile): `Imports 2,904 cards · skips 29 rows`
- Sticky bar, first import (desktop): `Importing 2,904 cards and skipping 29.`
- `Cancel` (both widths; the phone's exit)
- `Continue to replace →` / `Continue to import →` / `Importing…` (first import, pending)

### Issue CTA Strip (v2)
| Property | Mobile | Desktop |
|----------|--------|---------|
| layout | column | row, items centered |
| margin-top | 16px | 20px |
| gap | 12px | 16px |
| border-radius | 12px | 12px |
| padding | 14px 16px | 16px 20px |
| background | var(--surface) | var(--surface) |
| border | 1px solid var(--border) | 1px solid var(--border) |
| crab | `<Crab size={56}>`, self-start | `<Crab size={56}>`, self-center |
| heading | Cinzel 700, 15px | Cinzel 700, 17px |
| body | 13px / 1.55, var(--fg-body) | 13.5px / 1.55, var(--fg-body) |
| CTA | `GhostButton`, full width | `GhostButton`, auto width |

> **Step 3 stays straight: no crown here.** Surfaces v2 left the confirm alone. Its later redraw
> (first-run redesign D9) removed the typed token and every red and amber, and is recorded in
> "Component: Replace Flow — Step 3 (Replace Confirm)" above.

### Replace — Step 3 Copy
- Title: `Replace your collection?`
- Figure labels: `Now` / `After` (drawn uppercase)
- NOW caption: `cards in your collection` (desktop) / `cards` (mobile)
- AFTER caption: `cards from the-vault.csv` (desktop) / `from the-vault.csv` (mobile)
- Desktop body: `Your deck lists stay as they are; recommendations and availability update from the new collection. To go back, replace it again with your previous list.`
- Mobile body: `Deck lists stay as they are. To go back, replace it again with your previous list.`
- Buttons: `Keep current` / `Replace with 1,212 cards`; pending `Replacing…`
- Import variant (only after a failed first import): `Import this collection?`, `Go back`, `Import 1,212 cards`; pending `Importing…`

---

## Conditional Rendering

| Element | Condition |
|---------|-----------|
| Filter chips + "FILTERS:" label (in chip row) | Only shown when ≥1 active filter |
| Result count label (in chip row) | Always shown — no-filters variant per §Copy (result count variants) / "Filter Empty" state |
| "Clear all" link | Only shown when ≥1 active filter |
| Result count turns #E0913C | When `resultCount === 0` |
| View toggle (≣/▦) | Always visible in filter bar; rows segment highlighted on mobile default, grid on desktop default |
| Card detail modal | Only when a card is selected; URL has `?card=` param |
| Prev/Next navigation | Only in desktop modal; always shown but can be disabled at boundaries |
| No results empty state | When `resultCount === 0` |
| Sticky confirm bar (step 2) | Always visible; sticky at the foot on `/collection/replace` (phone: above the tab bar at var(--tabbar-h)); in flow as the card's foot when embedded |
| Replace note (step 1) | Only when `currentCardCount > 0` |
| Back chevron `‹` (step 1 phone header) | Upload step only, not embedded; the review header has none |
| Review phone header (step 2) | Not when embedded in first run's step-1 card |
| Replace confirm (step 3) | Only on a replace; a first import skips it unless its write failed |
| Step 3 buttons disabled (opacity 0.6) | While the confirm is pending |
| Step 3 error line | Only after a failed confirm |
| Quantity badge on grid tile | Always shown; value from `card.qty` |
| Rarity dot in row | Desktop rows only (not mobile) |
| Type line as sub-line | Mobile rows only (under name in same column) |
| Type line as own column | Desktop rows only (4th of 6 columns) |
| Set+rarity caption (grid) | Set code and rarity, under the name, at both widths |
| Printing picker (Set field disclosure) | Only when `card.printings.length > 1` |
| Region search + finish chips + set group headers | Only when the entry count exceeds 12 |
| Mobile compact art header (72px) | Only when the region is expanded AND past the overflow threshold |
| Mobile Set row promoted out of the 2×2 grid | Only when `card.printings.length > 1`; Rarity/Identity stay in the grid above it |
| Dormant tile + dormant note | Only when a stored pick names a printing the collection no longer contains |
| `Use the default again` | Only when a pick exists |
| Tile finish suffix (`foil` / `N foil`) | Only when the printing has foil or etched copies — plain nonfoil renders no finish string |
| Tile collector-number field | Omitted with its separator when the collector number is `''` (bare Name,Qty import) |

---

*End of Design Property Table — Collection (#6)*
