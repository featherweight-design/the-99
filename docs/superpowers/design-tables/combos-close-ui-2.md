# Design Property Table — Combos one piece away, UI-2

Source: `design/design_handoff_the99_combos_close/` (README call 4 + R1b, STATES S9–S13, READINESS ruled 2/4 and For engineering 4, errata E1–E5) and the extracted `How-It-Works` and `The-List` boards (`hiw.css` = `list.css`). Mobile = 390 boards (sheet), Desktop = 1300 boards (modal). Copy is listed as STRUCTURE; every string is a `/copy-review` placeholder. "—" = the design does not set it for that width; "same" = identical to Mobile.

## List row (entry point)

### Pressed row (`.or.press`)

| Property | Mobile | Desktop |
|---|---|---|
| Trigger | press anywhere on the row except the deck-name link | same (the one-line `.md2` row) |
| Outline | `2px solid var(--accent)` | same |
| Outline offset | `1px` | same |
| Row radius (unchanged under press) | `9px` | same |
| Row background (unchanged) | `var(--surface-rail)` | same |
| Result | the combo detail pushed inside the same sheet (S10) | the combo detail inside the modal (S10) |
| Deck-name link press (S6) | goes to `/decks/{id}`, does NOT open the combo (44px hit) | same |

## Combo detail container

### Sheet / modal shell

| Property | Mobile | Desktop |
|---|---|---|
| Container | the list's bottom sheet `.bs` (pushed in place; no new sheet) | the list's modal `.md` (pushed in place) |
| Position | `absolute; left:0; right:0; bottom:0` | `absolute; left:50%; top:70px; transform:translateX(-50%)` |
| Width | full phone width (390) | `760px` (the list modal is `900px` via `.md2`; the detail draws at 760) |
| z-index | `31` (scrim `30`) | `31` (scrim `30`) |
| Background | `var(--surface)` | same |
| Border | `border-top: 1px solid var(--border-strong)` | `1px solid var(--border-strong)` all sides |
| Radius | `18px 18px 0 0` | `14px` |
| Shadow | `0 -14px 40px rgba(0,0,0,.6)` | `0 24px 60px rgba(0,0,0,.6)` |
| Layout | `flex; column` | same |
| Height | sizes to content; `top:44px` when a plate's card details is stacked over it (S12 frame) | sizes to content |
| Scrim | `absolute; inset:0; background: rgba(8,6,5,.62)` | same |
| Depth | two: list or combo, then a card | same |

### Grabber (`.gr`)

| Property | Mobile | Desktop |
|---|---|---|
| Rendered | yes, above the back bar | no |
| Size | `40px × 4px` | — |
| Radius | `9px` | — |
| Background | `var(--border-strong)` | — |
| Margin | `8px auto 2px` | — |

## Back bar (`.bk2`)

### Bar

| Property | Mobile | Desktop |
|---|---|---|
| Layout | `flex; align-items:center` | same |
| Gap | `8px` | same |
| Min height | `52px` | same |
| Padding | `0 8px 0 16px` | same |
| Border bottom | `1px solid var(--border)` | same |
| Font | `500 13.5px 'IBM Plex Sans'` | same |
| Color | `var(--fg)` | same |
| Copy structure | `←` + "{N} combos" (N = the list's count) + `✕` | same |
| Press (arrow + label) | returns to the list | same |

### Back arrow (`.ar`)

| Property | Mobile | Desktop |
|---|---|---|
| Glyph | `←` | same |
| Font size | `16px` | same |
| Color | `var(--fg-muted)` | same |

### Close (`.x`)

| Property | Mobile | Desktop |
|---|---|---|
| Glyph | `✕` | same |
| Position | `margin-left:auto` (right end) | same |
| Hit size | `44px × 44px` | same |
| Alignment | `flex; center/center` | same |
| Color | `var(--fg-muted)` | same |
| Press | closes the whole sheet / modal | same |

## Body (`.cbd`)

### Body layout

| Property | Mobile | Desktop |
|---|---|---|
| Direction | `column` (plates above words) | `row` (plates left, words right) |
| Gap | `14px` | `18px` |
| Padding | `14px 16px` | `16px 18px` |

### Plates row (`.pls`)

| Property | Mobile | Desktop |
|---|---|---|
| Layout | `flex` (row) | same |
| Gap | `7px` | same |
| Flex | — | `flex:none; align-self:flex-start` |
| Count | two plates (two-card only, G2/E3) | same |
| Order | held piece(s) first, missing piece last | same |

### Plate (`.pl`)

| Property | Mobile | Desktop |
|---|---|---|
| Width | `96px` | same |
| Layout | `flex; column` | same |
| Gap | `5px` | same |
| Image size | `96px × 134px` | same |
| Image radius | `6px` | same |
| Image border | `1px solid var(--border-strong)` | same |
| Image fit | `object-fit: cover; display:block` | same |
| Press | opens the shipped card details stacked on top (S12) | same |

### Missing plate (`.pl.miss`)

| Property | Mobile | Desktop |
|---|---|---|
| Image outline | `1.5px dashed var(--accent)` | same |
| Outline offset | `2px` | same |
| Rendered on | the missing piece's plate only | same |

### Plate name (`.pn`)

| Property | Mobile | Desktop |
|---|---|---|
| Copy structure | {card name} | same |
| Font size | `11px` | same |
| Line height | `1.3` | same |
| Color | `var(--fg-body)` | same |

### Plate where-line (`.ps`)

| Property | Mobile | Desktop |
|---|---|---|
| Layout | `flex; align-items:center; flex-wrap:wrap` | same |
| Gap | `6px` | same |
| Font | `10px 'IBM Plex Mono'` | same |
| Color | `var(--fg-body)` | same |
| In this deck | filled dot + "in this deck" text in `var(--success)` | same |
| Spare (S11) | filled dot + "spare" (`var(--fg-body)`) | same |
| In another deck (S11, G4) | filled dot + "in {deck name}"; the detail lists every holding deck | same |
| To buy (S10) | hollow dashed dot + price tag | same |

### Owned dot (`.od`)

| Property | Mobile | Desktop |
|---|---|---|
| Size | `8px × 8px` | same |
| Radius | `50%` | same |
| Background | `var(--success)` | same |
| Display | `inline-block; flex:none` | same |

### To-buy dot (`.od.no`)

| Property | Mobile | Desktop |
|---|---|---|
| Background | `transparent` | same |
| Border | `1.5px dashed var(--fg-locked)` | same |

### Price tag (`.btag`, the shipped BuyTag)

| Property | Mobile | Desktop |
|---|---|---|
| Copy structure | ${price} | same |
| Font | `10px 'IBM Plex Mono'` | same |
| Line height | `15px` | same |
| Color | `var(--warning)` | same |
| Border | `1px solid var(--accent-shadow)` | same |
| Radius | `4px` | same |
| Padding | `0 5px` | same |

### Words column (`.bd`)

| Property | Mobile | Desktop |
|---|---|---|
| Layout | `flex; column` | same |
| Gap | `11px` | same |
| Flex | `1; min-width:0` | same |

### Title (`h3`)

| Property | Mobile | Desktop |
|---|---|---|
| Copy structure | [glyph] {piece A} + {piece B} | same |
| Font | `700 16px/1.25 Cinzel, serif` | same |
| Color | `var(--fg)` | same |
| Margin | `0` | same |
| Layout | `flex; align-items:center; flex-wrap:wrap` | same |
| Gap | `8px` | same |
| Separator ` + ` (`.pl2`) | `var(--fg-faint)`, weight `400` | same |

### Title glyph (lemniscate, `.lem`)

| Property | Mobile | Desktop |
|---|---|---|
| Size | `16 × 16` (viewBox `0 0 16 16`) | same |
| Stroke | `currentColor`, width `1.8`, round caps, no fill | same |
| Color | `var(--fact)` | same |
| Glow | `drop-shadow(0 0 3px color-mix(in oklab, var(--fact) 45%, transparent))` | same |
| Display | `block; flex:none` | same |
| A11y | `aria-hidden="true"` | same |
| Infinite turns | keeps its loop (turn-again) mark as today (bracket marks only, G6) | same |

### Chips (`.chp`)

| Property | Mobile | Desktop |
|---|---|---|
| Copy structure | one chip per produced result | same |
| List | `flex; wrap; gap 6px; margin 0; padding 0; list-style none` | same |
| Chip font | `9.5px 'IBM Plex Mono'` | same |
| Letter spacing | `.1em` | same |
| Transform | `uppercase` | same |
| Radius | `5px` | same |
| Border | `1px solid var(--border-strong)` | same |
| Padding | `4px 9px` | same |
| Color | `var(--fg-body)` | same |

### Field (`.fld`: Mana needed, Steps, Needs, in that order)

| Property | Mobile | Desktop |
|---|---|---|
| Layout | `flex; column` | same |
| Gap | `5px` | same |
| Label font | `9px 'IBM Plex Mono'` | same |
| Label letter spacing | `.14em` | same |
| Label transform | `uppercase` | same |
| Label color | `var(--fg-faint)` | same |
| Text (`p`, `li`) size | `12.5px` | same |
| Text line height | `1.5` | same |
| Text color | `var(--fg-muted)` | same |

### Mana needed value (`.mv`)

| Property | Mobile | Desktop |
|---|---|---|
| Font | `12px 'IBM Plex Mono'` | same |
| Color | `var(--fg-body)` | same |
| Copy structure | {mana_needed}; empty → "No mana needed"; missing → "Commander Spellbook doesn't say" (shipped, S13) | same |

### Steps list (`ol`)

| Property | Mobile | Desktop |
|---|---|---|
| Copy structure | one `li` per Spellbook step (Spellbook's own words) | same |
| Margin | `0` | same |
| Padding left | `17px` | same |
| Layout | `flex; column` | same |
| Gap | `5px` | same |

### Needs (`p`)

| Property | Mobile | Desktop |
|---|---|---|
| Copy structure | {notable prerequisites} | same |
| Style | the field text style above | same |

## Foot (`.cft`)

### Foot bar

| Property | Mobile | Desktop |
|---|---|---|
| Layout | `flex; align-items:center` | same |
| Gap | `12px` | same |
| Border top | `1px solid var(--border)` | same |
| Padding | `12px 16px 18px` | same |
| Not rendered (R1b) | no "missing piece" line, no "· to buy" | same |

### Commander Spellbook link (`.sb`, bottom left)

| Property | Mobile | Desktop |
|---|---|---|
| Copy structure | "Commander Spellbook ↗" | same |
| Display | `inline-flex; align-items:center` | same |
| Min height | `44px` | same |
| Font | `10.5px 'IBM Plex Mono'` | same |
| Color | `var(--accent)` | same |
| Decoration | `underline`, color `var(--accent)`, offset `3px` | same |

### Add button (`.addb`, bottom right)

| Property | Mobile | Desktop |
|---|---|---|
| Copy structure | "Add {missing card}" | same |
| Position | `margin-left:auto` | same |
| Display | `inline-flex; center/center` | same |
| Height | `44px` | `36px` (inline override on the 1300 board) |
| Padding | `0 18px` | same |
| Radius | `9px` | same |
| Border | `1px solid var(--border-strong)` | same |
| Color | `var(--fg)` | same |
| Background | none | none |
| Font | `600 13.5px 'IBM Plex Sans'` | same |
| Same label whether spare, in another deck or to buy | yes (the plate carries the where) | same |
| Press | adds the card, returns to the list; the last one closes the sheet and the segment goes (S9) | same (closes the modal) |

## Stacked card details (S12)

### Container (`.cs`)

| Property | Mobile | Desktop |
|---|---|---|
| Component | the shipped card details, stacked via `registerSheet` | same (not drawn at 1300) |
| Position | `absolute; inset:0` (whole phone) | — |
| z-index | `40` | — |
| Background | `var(--surface)` | — |
| Layout | `flex; column` | — |

### Back label (`.cs .bk`)

| Property | Mobile | Desktop |
|---|---|---|
| Copy structure | `←` + "{piece A} + {piece B}" | — |
| Layout | `flex; align-items:center; gap 8px` | — |
| Height | `52px` | — |
| Padding | `0 16px` | — |
| Border bottom | `1px solid var(--border)` | — |
| Font | `500 13.5px 'IBM Plex Sans'` | — |
| Color | `var(--fg)` | — |
| Arrow | `16px`, `var(--fg-muted)` | — |
| Press | closes back to the combo detail | — |

## State Coverage

| State | Trigger | What renders |
|---|---|---|
| Row pressed | a list row (not its deck link) pressed | `.or.press` accent outline, then the combo detail pushed in the same sheet/modal |
| Deck link pressed | "in {deck}" name pressed | navigates to `/decks/{id}`; combo detail does not open |
| S10 To buy | row whose missing piece has no copy | back bar "← N combos" + ✕; plates (missing outlined dashed accent, hollow dot + $price); title with lemniscate; chips; Mana needed; Steps; Needs; foot Spellbook ↗ left, "Add {card}" right |
| S11 Owned: spare | missing piece has a free copy (G3, spare wins) | as S10; missing plate where-line = filled dot + "spare" |
| S11 Owned: in another deck | every copy held by other decks | as S10; where-line = filled dot + "in {deck}"; all holding decks listed (G4) |
| Held piece in this deck | the held piece | filled dot + "in this deck" in `var(--success)` |
| Infinite turns | combo produces infinite turns | loop (turn-again) mark kept beside the lemniscate |
| S13 No mana | `mana_needed` empty | "No mana needed" |
| S13 Unknown mana | `mana_needed` missing | "Commander Spellbook doesn't say" |
| S12 Plate pressed | any plate | shipped card details stacked over the whole phone, back "← A + B"; back returns to the combo |
| Back pressed | "← N combos" | returns to the list |
| Close pressed | ✕ | closes the sheet/modal |
| Add pressed, more remain | "Add {card}" | card added; back to the list |
| S9 Last one added | Add on the list's last combo | sheet/modal closes; the status-line segment goes; no empty sheet |
| Width | 390 vs 1300 | 390: bottom sheet, column body, 44px Add; 1300: centered 760px modal at top 70px, row body, 36px Add |
