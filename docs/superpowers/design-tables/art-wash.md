# Design Property Table — Art Wash Readability (full surface)

Source: `design/design_handoff_the99_art_wash/`
- `The 99 - Art Wash Readability v2.dc.html` — **authoritative canvas** (all values below unless marked)
- `README.md` — prose/decisions log
- `The 99 - Art Wash Readability.dc.html` — R1, superseded (diff only)

> **Errata (2026-09-12): the `left-portrait` ambient layer is no longer drawn.** Every `ambient`
> value in this table — `.20` on the 148 band, `.14` on the 72, `.28`/`.22` as the lift raised them —
> describes a full-bleed copy of the crop that was removed in PR #517 and ratified the same day. It
> read as a double image past the portrait's own width. The **sharp** values, the masks and every
> scrim in this table are untouched and still authoritative. With no crop, that full-bleed layer
> still draws the identity gradient (decision §G). See the errata in
> `design/design_handoff_the99_art_wash/README.md` and its `READINESS.md`.

## Source precedence

The v2 canvas wins on every conflict; the README's decisions log and token reference are
transcribed only where the canvas is silent, and any disagreement is recorded inline as
`canvas: X / README: Y`. The canvas is drawn at a single desktop width — the page shell is
`max-width:1300px; padding:44px 40px 90px` and every surface sits in an `auto-fit`
`minmax()` grid. **No mobile frame, no phone width, and no breakpoint marker exists anywhere
in the file** (READINESS confirms: "the canvas frames are 900 / 1140 / 1300px; the file
contains no phone frame and no breakpoint markers"). Every "Mobile" cell below therefore
reads `not drawn` unless the value is a fixed px/aspect constant that cannot vary by width,
in which case it is repeated in both columns; the only genuinely responsive facts drawn are
the `minmax()` column floors, recorded per surface.

Conflicts found between README prose and the v2 canvas:

1. **Deck card colour pips are below the divider, not in the wash.** README decision 4 lists
   "colour pips" among the things "in the wash". The canvas draws the deck card's pips in the
   footer, below the `1px #2A241D` divider, on flat ground.
2. **Deck card has no fit score.** README decision 4 lists "fit score" as in-the-wash content;
   the canvas draws no fit score on the deck card at all (only on the commander row and the
   Home ready-to-build card).
3. **Deck card footer carries a colour-identity name string** (`5-color` / `Colorless` /
   `Gruul` / `Azorius`) that appears in neither README list (neither "in the wash" nor "below
   the divider").
4. **The commander row carries a fourth, surface-specific vertical scrim layer** —
   `linear-gradient(180deg,rgba(14,12,9,0.62) 0%,rgba(14,12,9,0.16) 42%,rgba(14,12,9,0.74) 100%)`
   — which is not the README's L3 (`.90 0% / .30 40% / .52 74% / .86 100%`) and is not
   mentioned in decision 2, decision 7 or the token table. README insists the L1/L2/L3 stack
   is a constant and that "divergent per-surface scrims are exactly how this drifts back to
   the reported bug"; the canvas nevertheless draws three different vertical scrims across
   the three drawn wash types (cover: 4 stops; commander row: 3 stops at different alphas;
   resume row: none).
5. **The resume row's ground and scrim colour is `#181410`, not `#1A160F`.** README's
   constants line says "ground `#1A160F`" for all four surfaces and decision 8 quotes the
   scrim in `rgba(14,12,9,…)`. The canvas resume row uses card background `#181410` and a
   scrim in `rgba(24,20,16,…)` terminating at `#181410`. The stop *positions* (0/58/99/138px)
   match README.
6. **`text-shadow` alpha.** README decision 3 fixes it at `0 1px 3px rgba(0,0,0,.6)` for all
   ink over art. Canvas: deck card and ready-to-build use `0 1px 3px rgba(0,0,0,0.65)`; the
   commander row uses `0 1px 4px rgba(0,0,0,0.85)`; the resume parity row uses
   `0 1px 4px rgba(0,0,0,0.9)`; the resume recommended row uses none (which README does state).
7. **Chip-on-art border is status-keyed on the deck card.** README's constants line says
   chip-on-art is `#14110E` + `1px #3A3229`. The canvas deck card status chip is `#14110E` +
   `1px #33402F` with `#8FC08A` text (a green, status-derived pair). The overflow button and
   both fit chips do use `#3A3229`.
8. **"Home · ready to build inherits the deck card exactly."** README surfaces table and the
   canvas's own caption say so, but the canvas draws different values: title `17px` vs `20px`,
   subtitle `11.5px` vs `12px`, label inset `left:14px;top:13px` vs `left:16px;top:15px`, no
   overflow button, no status chip, and it adds bottom-left colour pips and a bottom-right fit
   chip that the deck card does not have. Only the band (`2.2/1`), focal, opacity and scrim are
   literally inherited.
9. **Focal is not `center top` on the sharp layer.** README decision 6 and the token table
   present `center top` as a constant for all four surfaces. The canvas applies `center top`
   only to the `cover` layers and to the two *ambient* layers; both `left-portrait` **sharp**
   layers use `background-position: left center` with `background-size: auto 100%`.
10. **Commander-row labels "at band baseline".** README's token table says so; the canvas
    bottom-aligns only the name/pips/subtitle block (`align-self:flex-end;padding-bottom:16px`).
    The rank numeral is vertically centred and the fit chip is **top**-aligned
    (`align-self:flex-start;margin-top:16px`).
11. **Commander band height is a hard `height:148px`** in the canvas, not a floor. README says
    "band `148px`" without qualifying; READINESS eng-clarification 3 converts it to a
    `min-height`, but that is an eng decision, not a drawn value.
12. **Discovery row (/discover) is not drawn.** See the final section.

R1 → R2 diff (for context only; R1 must not be built from): R1 deck card art
`opacity:0.55` with `background-position:center`; R1 commander row `min-height:78px` with
`background-position:center 28%` and `opacity:0.5`; R1 had a third `edge-signature` strategy.
All superseded.

---

## Component: Deck card (Decks index tile)

### Grid container (surface context)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | not drawn | `grid` |
| grid-template-columns | not drawn | `repeat(auto-fit,minmax(300px,1fr))` |
| gap | not drawn | `20px` |

### Card root
| Property | Mobile | Desktop |
|----------|--------|---------|
| border-radius | `14px` | `14px` |
| background | `#1A160F` | `#1A160F` |
| border | `1px solid #2A241D` | `1px solid #2A241D` |
| overflow | `hidden` | `hidden` |
| min-width | `0` | `0` |

### Art band (wash container) — ABOVE the divider
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | `relative` | `relative` |
| aspect-ratio | `2.2/1` | `2.2/1` |
| background (L1 base plate) | `#0E0C09` | `#0E0C09` |
| overflow | `hidden` | `hidden` |

### L2 — art layer (`cover` strategy)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | `absolute` | `absolute` |
| inset | `0` (top/right/bottom/left all `0`) | `0` |
| background-size | `cover` | `cover` |
| background-repeat | `no-repeat` | `no-repeat` |
| background-position | `center top` | `center top` |
| opacity | `0.58` | `0.58` |
| background-image | `url("https://api.scryfall.com/cards/named?exact=<name>&format=image&version=art_crop")` (spec convenience; README decision 1 says production keys off the Scryfall `id`) | same |
| Stated derivation (README dec. 6) | labels are top-anchored, so at `top` the 27–44% focal band lands at 43–71% of the band — below the title and in the thinnest part of the vertical scrim; the sampling window is 62.3% of crop height so the bottom fifth ("rubble") is never sampled; the crop's top edge is the one boundary that cannot clip a head | same |

### L3 — vertical gradient scrim
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | `absolute` | `absolute` |
| inset | `0` | `0` |
| background | `linear-gradient(180deg,rgba(14,12,9,0.90) 0%,rgba(14,12,9,0.30) 40%,rgba(14,12,9,0.52) 74%,rgba(14,12,9,0.86) 100%)` | same |
| Stop 4 note | new in R2 — "the status chip no longer needs its own plate to survive a bright foreground" | same |

### Label block (TOP of the band)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | `absolute` | `absolute` |
| left | `16px` | `16px` |
| top | `15px` | `15px` |
| right | `16px` | `16px` |
| bottom | — | — |
| display | `flex` | `flex` |
| align-items | `flex-start` | `flex-start` |
| justify-content | `space-between` | `space-between` |
| gap | `12px` | `12px` |

### Deck name (title)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'Cinzel', serif` (display serif) | same |
| font-weight | `700` | `700` |
| font-size | `20px` | `20px` |
| color | `#F4EFE3` | `#F4EFE3` |
| line-height | `1.15` | `1.15` |
| text-shadow | canvas: `0 1px 3px rgba(0,0,0,0.65)` / README dec. 3: `0 1px 3px rgba(0,0,0,.6)` | same |
| white-space | `nowrap` | `nowrap` |
| overflow | `hidden` | `hidden` |
| text-overflow | `ellipsis` | `ellipsis` |
| parent min-width | `0` | `0` |

### Deck subtitle (commander name)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | inherited `'IBM Plex Sans'` (sans) | same |
| font-size | `12px` | `12px` |
| color | `#C6B79A` | `#C6B79A` |
| margin-top | `4px` | `4px` |
| text-shadow | `0 1px 3px rgba(0,0,0,0.65)` | same |
| white-space / overflow / text-overflow | `nowrap` / `hidden` / `ellipsis` | same |

### Overflow button (`···`) — TOP-RIGHT of the band
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | `30px` | `30px` |
| height | `26px` | `26px` |
| flex | `none` | `none` |
| border-radius | `6px` | `6px` |
| background | `#14110E` | `#14110E` |
| border | `1px solid #3A3229` | same |
| display / align-items / justify-content | `flex` / `center` / `center` | same |
| color | `#C6B79A` | `#C6B79A` |
| font-size | `15px` | `15px` |
| letter-spacing | `1px` | `1px` |
| content | `···` (three middle dots as text — not an SVG) | same |

### Status chip — BOTTOM-LEFT of the band
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | `absolute` | `absolute` |
| left | `16px` | `16px` |
| bottom | `13px` | `13px` |
| font-family | `'IBM Plex Mono', monospace` | same |
| font-size | `11px` | `11px` |
| letter-spacing | `0.06em` | `0.06em` |
| color | `#8FC08A` | `#8FC08A` |
| background | `#14110E` (opaque — README dec. 3: never translucent) | same |
| border | canvas: `1px solid #33402F` / README constants: `1px #3A3229` | same |
| border-radius | `6px` | `6px` |
| padding | `5px 9px` | `5px 9px` |
| drawn value | `Complete` on all four sample cards | same |

### Divider (flat-ground split)
| Property | Mobile | Desktop |
|----------|--------|---------|
| border-top | `1px solid #2A241D` (declared on the footer element) | same |

### Footer — BELOW the divider, flat ground
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `#1A160F` (inherited from card root) | same |
| padding | `14px 16px 16px` | same |
| display | `flex` | `flex` |
| flex-direction | `column` | `column` |
| gap | `11px` | `11px` |

### Footer row 1 (pips · identity name · count)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `flex` |
| align-items | `center` | `center` |
| justify-content | `space-between` | `space-between` |
| gap | `12px` | `12px` |

### Colour identity pips (deck card) — BELOW the divider
| Property | Mobile | Desktop |
|----------|--------|---------|
| container display | `flex` | `flex` |
| container gap | `5px` | `5px` |
| width | `13px` | `13px` |
| height | `13px` | `13px` |
| border-radius | `3px` | `3px` |
| background | per pip: `#E8E4D6` (W) · `#4A7FB5` (U) · `#5B5566` (B) · `#C05A48` (R) · `#6B9E63` (G) | same |
| ring / hairline | — (no `box-shadow` on the deck card's pips) | — |
| conditional | zero pips rendered for a colourless deck (`pips:[]`) | same |
| placement | canvas: below the divider / README dec. 4: "in the wash" | same |

### Colour identity name
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Mono', monospace` | same |
| font-size | `12.5px` | `12.5px` |
| color | `#A89B84` | `#A89B84` |
| drawn values | `5-color` · `Colorless` · `Gruul` · `Azorius` | same |

### Card count
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Mono', monospace` | same |
| font-size | `14px` | `14px` |
| color | `#EDE6D8` | `#EDE6D8` |
| drawn value | `99 / 99` | same |

### Completion bar
| Property | Mobile | Desktop |
|----------|--------|---------|
| height | `3px` | `3px` |
| border-radius | `999px` | `999px` |
| background | `#6B9E63` | `#6B9E63` |
| track | — (no separate track element drawn; the bar is full width) | — |

### Footer row 3 (ownership · last played)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `flex` |
| align-items | `center` | `center` |
| justify-content | `space-between` | `space-between` |
| gap | `12px` | `12px` |
| font-family | `'IBM Plex Mono', monospace` | same |
| font-size | `12px` | `12px` |
| color | `#A89B84` | `#A89B84` |
| drawn values | left `12 unowned · $13.20` / `all owned`; right `never played` / `2 days ago` / `7 weeks ago` | same |

### Spec annotation chips above the deck-card set (canvas chrome, not product UI)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family / font-size | `'IBM Plex Mono', monospace` / `11.5px` | same |
| color / background / border | `#C6B79A` / `#221D14` / `1px solid #2A241D` | same |
| border-radius / padding | `999px` / `6px 13px` | same |
| labels | `band aspect 2.2/1`, `cover · center top`, `art opacity .58`, `labels top · chip bottom-left` | same |

## State Coverage — Deck card
| State | Triggering condition | What renders | Key props required |
|---|---|---|---|
| Art present | `art_crop` URL resolves | L1 `#0E0C09` + L2 art `.58` `cover center top` + L3 4-stop scrim + top labels + overflow + bottom-left status chip; footer below divider | `imageUri` (art_crop), deck name, commander name, status, colorIdentity, counts, ownership, last played |
| No art | `art_crop` missing | README: falls back to the colour-identity gradient at the **same opacity, same scrim, no layout shift**; band never collapses. **Not drawn in the canvas.** | `colorIdentity` |
| Colourless deck | `pips: []` | pip group renders empty; identity name reads `Colorless` | `colorIdentity` |
| Reduced transparency | `prefers-reduced-transparency` (README only, not drawn) | L2 → `opacity .3`; L3 stops → `.95 / .6 / .85` | — |
| Forced colors | README lumps it with the above; READINESS splits it. Not drawn. | — | — |

---

## Component: Home · Ready to build (hero card)

README says this "inherits the deck card exactly"; the canvas draws it differently (conflict 8).
Values below are the canvas's.

### Section container
| Property | Mobile | Desktop |
|----------|--------|---------|
| outer grid-template-columns | not drawn | `repeat(auto-fit,minmax(340px,1fr))` (Home's two treatments side by side) |
| outer gap | not drawn | `26px` |
| outer align-items | not drawn | `start` |
| column display / flex-direction / gap | not drawn | `flex` / `column` / `14px` |
| card grid-template-columns | not drawn | `repeat(auto-fit,minmax(230px,1fr))` |
| card grid gap | not drawn | `14px` |

### Section heading
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'Cinzel', serif` | same |
| font-weight | `700` | `700` |
| font-size | `19px` | `19px` |
| color | `#EDE6D8` | `#EDE6D8` |
| text | `Ready to build` | same |

### Card root
| Property | Mobile | Desktop |
|----------|--------|---------|
| border-radius | `14px` | `14px` |
| background | `#1A160F` | `#1A160F` |
| border | `1px solid #2A241D` | same |
| overflow | `hidden` | `hidden` |
| min-width | `0` | `0` |

### Art band + L1/L2/L3
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | `relative` | `relative` |
| aspect-ratio | `2.2/1` | `2.2/1` |
| L1 background | `#0E0C09` | `#0E0C09` |
| L2 position / inset | `absolute` / `0` | same |
| L2 background-size | `cover` | `cover` |
| L2 background-repeat | `no-repeat` | `no-repeat` |
| L2 background-position | `center top` | `center top` |
| L2 opacity | `0.58` | `0.58` |
| L3 background | `linear-gradient(180deg,rgba(14,12,9,0.90) 0%,rgba(14,12,9,0.30) 40%,rgba(14,12,9,0.52) 74%,rgba(14,12,9,0.86) 100%)` | same |

### Label block (TOP of the band)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | `absolute` | `absolute` |
| left | `14px` (deck card: `16px`) | `14px` |
| top | `13px` (deck card: `15px`) | `13px` |
| right | `14px` (deck card: `16px`) | `14px` |
| min-width | `0` | `0` |
| display | — (plain block; no flex row — there is no overflow button here) | — |

### Commander name (title)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'Cinzel', serif` | same |
| font-weight | `700` | `700` |
| font-size | `17px` (deck card: `20px`) | `17px` |
| color | `#F4EFE3` | `#F4EFE3` |
| line-height | `1.15` | `1.15` |
| text-shadow | `0 1px 3px rgba(0,0,0,0.65)` | same |
| white-space / overflow / text-overflow | `nowrap` / `hidden` / `ellipsis` | same |

### Subtitle (type line)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | `11.5px` (deck card: `12px`) | `11.5px` |
| color | `#C6B79A` | `#C6B79A` |
| margin-top | `3px` (deck card: `4px`) | `3px` |
| text-shadow | `0 1px 3px rgba(0,0,0,0.65)` | same |
| white-space / overflow / text-overflow | `nowrap` / `hidden` / `ellipsis` | same |
| drawn values | `Legendary Creature — Eldrazi`, `Legendary Creature — Human Soldier` | same |

### Colour identity pips — BOTTOM-LEFT of the band (in the wash)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | `absolute` | `absolute` |
| left | `14px` | `14px` |
| bottom | `12px` | `12px` |
| display | `flex` | `flex` |
| gap | `4px` | `4px` |
| width / height | `12px` / `12px` | same |
| border-radius | `3px` | `3px` |
| ring / hairline | `box-shadow: 0 0 0 1px rgba(14,12,9,0.85)` | same |
| conditional | empty for a colourless commander (`pips:[]`) | same |

### Fit chip — BOTTOM-RIGHT of the band (boxed, in the wash)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | `absolute` | `absolute` |
| right | `14px` | `14px` |
| bottom | `12px` | `12px` |
| display / align-items / gap | `flex` / `baseline` / `5px` | same |
| background | `#14110E` (opaque) | same |
| border | `1px solid #3A3229` | same |
| border-radius | `7px` | `7px` |
| padding | `5px 9px` | `5px 9px` |
| numeral font-family | `'Cinzel', serif` | same |
| numeral font-weight | `800` | `800` |
| numeral font-size | `16px` | `16px` |
| numeral color | `#EDE6D8` | `#EDE6D8` |
| numeral line-height | `1` | `1` |
| unit font-family | `'IBM Plex Mono', monospace` | same |
| unit font-size | `9.5px` | `9.5px` |
| unit letter-spacing | `0.1em` | `0.1em` |
| unit color | `#8E8269` | `#8E8269` |
| unit text | `FIT` (commander row uses `/100 FIT`) | same |
| drawn values | `78`, `74` | same |

### Divider + footer — BELOW the divider, flat ground
| Property | Mobile | Desktop |
|----------|--------|---------|
| border-top | `1px solid #2A241D` | same |
| padding | `12px 14px 13px` | same |
| display / align-items / justify-content / gap | `flex` / `center` / `space-between` / `10px` | same |

### Pool label (footer left)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Mono', monospace` | same |
| font-size | `11.5px` | `11.5px` |
| color | `#A89B84` | `#A89B84` |
| drawn values | `1,240 fit`, `980 fit` | same |

### Build button (footer right)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Sans'` | same |
| font-weight | `600` | `600` |
| font-size | `12px` | `12px` |
| color | `#14110E` | `#14110E` |
| background | `#C9A24B` | `#C9A24B` |
| border-radius | `6px` | `6px` |
| padding | `6px 12px` | `6px 12px` |
| hover / focus | not drawn | not drawn |

## State Coverage — Home · Ready to build
| State | Triggering condition | What renders | Key props required |
|---|---|---|---|
| Art present | `art_crop` resolves | identical layer stack to the deck card; band furniture is pips + fit chip, not status chip + overflow | `imageUri`, commander name, type line, fit, pool size, colorIdentity |
| No art | `art_crop` missing | README: colour-identity gradient at same opacity/scrim, no layout shift. Not drawn. | `colorIdentity` |
| Colourless | `pips: []` | no pips render at bottom-left; fit chip unaffected | `colorIdentity` |

---

## Component: Commander recommendation row (/commanders)

### Row list container
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | not drawn | `flex` |
| flex-direction | not drawn | `column` |
| gap | not drawn | `12px` |

### Row root
| Property | Mobile | Desktop |
|----------|--------|---------|
| border-radius | `12px` | `12px` |
| border | `1px solid #2A241D` | same |
| background | `#1A160F` | `#1A160F` |
| overflow | `hidden` | `hidden` |

### Art band (wash container)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | `relative` | `relative` |
| height | not drawn at mobile — canvas draws a single fixed `height:148px`; README: band `148px`, was `78px` | `148px` (fixed `height`, not `min-height`) |
| background (L1) | `#0E0C09` | `#0E0C09` |
| overflow | `hidden` | `hidden` |

### Ambient layer (full-bleed `cover` copy)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position / inset | `absolute` / `0` | same |
| background-size | `cover` | `cover` |
| background-position | `center top` | `center top` |
| background-repeat | `no-repeat` | `no-repeat` |
| opacity | `0.2` | `0.2` |
| purpose (README dec. 7) | carries the colour behind the portrait; preserves the "large wash" feel | same |

### Sharp portrait layer (`left-portrait`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | `absolute` | `absolute` |
| left | `0` | `0` |
| top | `0` | `0` |
| bottom | `0` | `0` |
| width | `203px` — **derived: band height `148px × 1.37`** (art_crop's native 1.37:1) | `203px` |
| background-size | `auto 100%` (sized by height) | same |
| background-position | canvas: `left center` / README presents `center top` as a constant for all four surfaces | same |
| background-repeat | `no-repeat` | `no-repeat` |
| opacity | `0.8` | `0.8` |
| mask-image | `linear-gradient(90deg,#000 0 58%,transparent 100%)` (a fraction of the **art**, not the row) | same |
| -webkit-mask-image | `linear-gradient(90deg,#000 0 58%,transparent 100%)` | same |
| derived fade edge | opaque to `0.58 × 203px = 117.7px`, fully transparent by `203px` | same |

### Horizontal scrim (px stops keyed to portrait width)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position / inset | `absolute` / `0` | same |
| background | `linear-gradient(90deg,rgba(14,12,9,0.30) 0px,rgba(14,12,9,0.26) 118px,rgba(26,22,15,0.78) 203px,#1A160F 264px)` | same |
| stop derivation | `118px` ≈ the mask's 58% edge; `203px` = portrait width = band × 1.37; `264px` = flat ground reached (READINESS 5c reads this as the horizontal equivalent of the divider) | same |

### Vertical scrim (surface-specific — see conflict 4)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position / inset | `absolute` / `0` | same |
| background | `linear-gradient(180deg,rgba(14,12,9,0.62) 0%,rgba(14,12,9,0.16) 42%,rgba(14,12,9,0.74) 100%)` | same |
| README equivalent | not specified; README's L3 is the 4-stop `.90/.30/.52/.86` gradient | same |

### Content row (over the art)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | `relative` | `relative` |
| height | `100%` | `100%` |
| display | `flex` | `flex` |
| align-items | `center` | `center` |
| gap | `16px` | `16px` |
| padding | `0 22px` (top/bottom `0`) | same |

### Rank numeral
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'Cinzel', serif` — a large display numeral | same |
| font-weight | `800` | `800` |
| font-size | `26px` | `26px` |
| color | `#EDE6D8` | `#EDE6D8` |
| flex | `none` | `none` |
| min-width | `26px` | `26px` |
| text-shadow | `0 1px 4px rgba(0,0,0,0.85)` | same |
| vertical placement | vertically centred (inherits parent `align-items:center`; no `align-self`) | same |
| drawn values | `1`, `2`, `3` (bare numeral, no `#`) | same |

### Name + pips + subtitle block
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | `1` | `1` |
| min-width | `0` | `0` |
| align-self | `flex-end` (drops to the band's baseline) | same |
| padding-bottom | `16px` | `16px` |
| name row display / align-items / gap / flex-wrap | `flex` / `center` / `10px` / `wrap` | same |

### Commander name
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'Cinzel', serif` — display serif, not sans | same |
| font-weight | `700` | `700` |
| font-size | `23px` | `23px` |
| color | `#F4EFE3` | `#F4EFE3` |
| text-shadow | `0 1px 4px rgba(0,0,0,0.85)` | same |
| truncation | — (no `nowrap`/ellipsis; the name row wraps via `flex-wrap:wrap`) | — |

### Colour identity pips (commander row) — in the wash, inline after the name
| Property | Mobile | Desktop |
|----------|--------|---------|
| container display | `flex` | `flex` |
| container gap | `4px` | `4px` |
| width / height | `12px` / `12px` | same |
| border-radius | `3px` | `3px` |
| ring / hairline | `box-shadow: 0 0 0 1px rgba(14,12,9,0.85)` | same |

### Subtitle (type line)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | `12.5px` | `12.5px` |
| color | `#C6B79A` | `#C6B79A` |
| margin-top | `4px` | `4px` |
| text-shadow | `0 1px 4px rgba(0,0,0,0.85)` | same |
| drawn values | `Legendary Creature — Human Soldier` etc. | same |

### Fit chip (boxed) — TOP-RIGHT of the band
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | `none` | `none` |
| align-self | canvas: `flex-start` (top-aligned) / README token table: "labels at band baseline" | same |
| margin-top | `16px` | `16px` |
| display / align-items / gap | `flex` / `baseline` / `7px` | same |
| background | `#14110E` (opaque) | same |
| border | `1px solid #3A3229` | same |
| border-radius | `9px` | `9px` |
| padding | `8px 13px` | `8px 13px` |
| numeral font-family / weight / size | `'Cinzel', serif` / `800` / `26px` | same |
| numeral color | `#EDE6D8` | `#EDE6D8` |
| numeral line-height | `1` | `1` |
| unit font-family / size | `'IBM Plex Mono', monospace` / `10.5px` | same |
| unit letter-spacing | `0.1em` | `0.1em` |
| unit color | `#8E8269` | `#8E8269` |
| unit text | `/100 FIT` | same |
| drawn values | `73`, `72`, `71` | same |

### Divider + data zone — BELOW the divider, flat ground
| Property | Mobile | Desktop |
|----------|--------|---------|
| border-top | `1px solid #2A241D` | same |
| padding | `14px 22px 16px` | same |
| display / flex-direction / gap | `flex` / `column` / `12px` | same |
| background | `#1A160F` (from row root) | same |

### Stat pills
| Property | Mobile | Desktop |
|----------|--------|---------|
| container display / gap / flex-wrap | `flex` / `8px` / `wrap` | same |
| font-family | `'IBM Plex Mono', monospace` | same |
| font-size | `11.5px` | `11.5px` |
| color | `#C6B79A` | `#C6B79A` |
| background | `#221D14` | `#221D14` |
| border | `1px solid #2A241D` | same |
| border-radius | `999px` | `999px` |
| padding | `6px 12px` | `6px 12px` |
| drawn values | `RAMP 166/10`, `DRAW 149/10`, `REMOVAL 152/8`, `WIPES 17/3` | same |

### Synergy row
| Property | Mobile | Desktop |
|----------|--------|---------|
| display / align-items / gap / flex-wrap | `flex` / `center` / `14px` / `wrap` | same |
| label font-family / size | `'IBM Plex Mono', monospace` / `10.5px` | same |
| label letter-spacing | `0.14em` | `0.14em` |
| label color | `#8E8269` | `#8E8269` |
| label flex | `none` | `none` |
| label text | `SYNERGY` | same |
| track flex | `1` | `1` |
| track min-width | `110px` | `110px` |
| track height | `4px` | `4px` |
| track border-radius | `999px` | `999px` |
| track background | `#2A241D` | `#2A241D` |
| track overflow / display | `hidden` / `block` | same |
| fill display / height | `block` / `100%` | same |
| fill background | `#4A7FB5` | `#4A7FB5` |
| fill width | data-driven (`58%`, `53%`, `52%` drawn) | same |
| ownership text font-family / size / color / flex | `'IBM Plex Mono', monospace` / `12.5px` / `#A89B84` / `none` | same |
| ownership drawn value | `own 140 of top 252` | same |

### Receipts line
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Mono', monospace` | same |
| font-size | `12px` | `12px` |
| color | `#8E8269` | `#8E8269` |
| line-height | `1.5` | `1.5` |
| drawn value | `receipts: Celebrate the Mountain-king · Bofur, Reliable Guardian · Key to the Side-Door +137` | same |

### Mobile stack for the commander row
| Property | Mobile | Desktop |
|----------|--------|---------|
| total row height | **not drawn** — the canvas contains no phone frame, and no "two bands" layout appears anywhere in v2 | `148px` band + data zone below the divider |
| portrait / data stacking | **not drawn** — one horizontal arrangement is drawn, at one width | rank · name block · fit chip in a single flex row over the art |
| portrait extent at mobile | **not drawn**; README dec. 8 makes the geometry width-independent by construction, so `203px` follows from a `148px` band at any row width | `203px` |

## State Coverage — Commander row
| State | Triggering condition | What renders | Key props required |
|---|---|---|---|
| Art present | `art_crop` resolves | ambient `.20` + sharp `.80` masked at 58% + horizontal px scrim + vertical scrim + rank / name / pips / subtitle / fit chip | `imageUri`, rank, name, type line, colorIdentity, fit, stats, synergy %, ownership, receipts |
| No art | `art_crop` missing | README: colour-identity gradient, same opacity/scrim, no layout shift; band never collapses. Not drawn. | `colorIdentity` |
| Reduced transparency | README only, not drawn | L2 → `.3`; L3 stops → `.95 / .6 / .85` | — |

---

## Component: Home · Resume / "Pick up where you left off"

The canvas draws **two variants**: "Reference parity — title on art" (red marker) and
"Recommended — art gets its own column" (green marker). **The recommended variant is the
spec**; the parity variant exists so the difference is checkable. Both are transcribed.

### Section heading + caption
| Property | Mobile | Desktop |
|----------|--------|---------|
| heading font-family / weight / size / color | `'Cinzel', serif` / `700` / `19px` / `#EDE6D8` | same |
| heading text | `Pick up where you left off` | same |
| caption font-size / color / line-height / margin-top | `13px` / `#A89B84` / `1.6` / `5px` | same |

### Variant markers (canvas chrome)
| Property | Mobile | Desktop |
|----------|--------|---------|
| marker row display / align-items / gap | `flex` / `center` / `9px` | same |
| dot width / height / border-radius | `7px` / `7px` / `999px` | same |
| dot background | parity `#C05A48`; recommended `#6B9E63` | same |
| label font-family / size | `'IBM Plex Mono', monospace` / `10.5px` | same |
| label letter-spacing / text-transform | `0.14em` / `uppercase` | same |
| label color | parity `#C05A48`; recommended `#6B9E63` | same |
| group display / flex-direction / gap | `flex` / `column` / `9px` | same |
| recommended group margin-top | `6px` | `6px` |

### Row root — RECOMMENDED variant
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | `relative` | `relative` |
| height | `72px` (fixed) | `72px` |
| border-radius | `11px` | `11px` |
| border | `1px solid #2A241D` | same |
| background | canvas: `#181410` / README constants: ground `#1A160F` | same |
| overflow | `hidden` | `hidden` |
| divider | — (no divider drawn; the row **is** the band and there is no footer below it) | — |

### Ambient layer — recommended
| Property | Mobile | Desktop |
|----------|--------|---------|
| position / inset | `absolute` / `0` | same |
| background-size | `cover` | `cover` |
| background-position | `center top` | `center top` |
| background-repeat | `no-repeat` | `no-repeat` |
| opacity | `0.14` | `0.14` |

### Sharp portrait layer — recommended
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | `absolute` | `absolute` |
| left / top / bottom | `0` / `0` / `0` | same |
| width | `99px` — **derived: band height `72px × 1.37`** | `99px` |
| background-size | `auto 100%` | same |
| background-position | canvas: `left center` / README: `center top` presented as constant | same |
| background-repeat | `no-repeat` | `no-repeat` |
| opacity | `0.85` | `0.85` |
| mask-image | `linear-gradient(90deg,#000 0 62%,transparent 100%)` | same |
| -webkit-mask-image | `linear-gradient(90deg,#000 0 62%,transparent 100%)` | same |
| derived fade edge | opaque to `0.62 × 99px ≈ 61.4px`, fully transparent by `99px` | same |

### Horizontal scrim — recommended
| Property | Mobile | Desktop |
|----------|--------|---------|
| position / inset | `absolute` / `0` | same |
| background | `linear-gradient(90deg,rgba(24,20,16,0.22) 0px,rgba(24,20,16,0.18) 58px,rgba(24,20,16,0.80) 99px,#181410 138px)` | same |
| stop derivation | `58px` ≈ the mask's 62% edge; `99px` = portrait width = band × 1.37; `138px` = flat ground reached — the `116px` type inset sits inside the final ramp, before flat ground at `138px` | same |
| vertical scrim | — (none drawn on this row) | — |

### Content row — recommended
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | `relative` | `relative` |
| height | `100%` | `100%` |
| display / align-items / gap | `flex` / `center` / `14px` | same |
| padding | `0 18px 0 116px` — **left inset `116px` is the type inset, keyed to the `99px` portrait** | same |

### Deck name — recommended
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'Cinzel', serif` | same |
| font-weight | `700` | `700` |
| font-size | `16px` | `16px` |
| color | `#F4EFE3` | `#F4EFE3` |
| line-height | `1.2` | `1.2` |
| text-shadow | **— (none; the absence is the design's stated "tell")** | — |
| white-space / overflow / text-overflow | `nowrap` / `hidden` / `ellipsis` | same |
| drawn values | `HD Yuriko`, `HD Avatar Aang`, `HD Soldiers` (deck names, not commander names) | same |

### Pips + subtitle row — recommended
| Property | Mobile | Desktop |
|----------|--------|---------|
| display / align-items / gap / min-width | `flex` / `center` / `8px` / `0` | same |
| margin-top | `4px` | `4px` |
| pip container display / gap / flex | `flex` / `3px` / `none` | same |
| pip width / height | `11px` / `11px` | same |
| pip border-radius | `3px` | `3px` |
| pip ring | `box-shadow: 0 0 0 1px rgba(14,12,9,0.9)` | same |
| subtitle font-size | `12px` | `12px` |
| subtitle color | `#C6B79A` | `#C6B79A` |
| subtitle text-shadow | — (none) | — |
| subtitle white-space / overflow / text-overflow | `nowrap` / `hidden` / `ellipsis` | same |
| subtitle drawn values | `Yuriko, the Tiger's Shadow`, `Avatar Aang // Aang, Master of Elements`, `Myrel, Shield of Argive` | same |

### Right meta block — recommended
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | `none` | `none` |
| text-align | `right` | `right` |
| tag font-family / size | `'IBM Plex Mono', monospace` / `10px` | same |
| tag letter-spacing | `0.16em` | `0.16em` |
| tag color | `#8E8269` | `#8E8269` |
| tag drawn value | `COMMANDER` | same |
| timestamp font-family / size | `'IBM Plex Mono', monospace` / `11.5px` | same |
| timestamp color | `#A89B84` | `#A89B84` |
| timestamp margin-top | `4px` | `4px` |
| timestamp drawn values | `17 hours ago`, `21 hours ago`, `23 hours ago` | same |

### PARITY variant (drawn for comparison only — do not build)
| Property | Mobile | Desktop |
|----------|--------|---------|
| row height / radius / border / background | `72px` / `11px` / `1px solid #2A241D` / `#181410` | same |
| art layer position / left / top / bottom | `absolute` / `0` / `0` / `0` | same |
| art layer width | `46%` (a percentage of **width** — the failure mode README dec. 8 names) | `46%` |
| art background-size / position / repeat | `cover` / `left 30%` / `no-repeat` | same |
| art opacity | `0.62` | `0.62` |
| scrim | `linear-gradient(90deg,rgba(24,20,16,0.30) 0%,rgba(24,20,16,0.62) 18%,rgba(24,20,16,0.94) 32%,#181410 44%)` (stops in **%**) | same |
| ambient layer | — (none) | — |
| mask-image | — (none) | — |
| content padding | `0 18px` (no type inset — type sits over the art) | same |
| name text-shadow | `0 1px 4px rgba(0,0,0,0.9)` | same |
| subtitle text-shadow | `0 1px 4px rgba(0,0,0,0.9)` | same |
| all other type / meta values | identical to the recommended variant | same |

## State Coverage — Home · Resume
| State | Triggering condition | What renders | Key props required |
|---|---|---|---|
| Art present | `art_crop` resolves | ambient `.14` + sharp `.85` masked at 62% + px horizontal scrim + type starting at `116px`, no text-shadow anywhere | `imageUri`, deck name, commander name (subtitle), colorIdentity, tag, relative timestamp |
| No art | `art_crop` missing | README: colour-identity gradient at same opacity/scrim, no layout shift. Not drawn. | `colorIdentity` |
| Long subtitle | subtitle exceeds available width | `nowrap` + ellipsis; README open item 1 notes the `116px` inset costs ~27px of subtitle vs the parity variant (READINESS closes it as moot — the shipped row prints the deck name) | — |
| Divider / flat ground | n/a | no divider exists on this row; flat ground is reached horizontally at the scrim's `138px` stop | — |

---

## Discovery row — not drawn in the canvas

The v2 canvas draws exactly four surfaces (`Surface 1 · Deck card`, `Surface 2 · Commander
row`, `Surface 3 · Home · two treatments` = ready-to-build + resume) plus a per-surface token
panel. The string `discover` appears **zero** times in the file; the token panel lists exactly
four surfaces (Deck card, Commander row, Home · ready to build, Home · resume); and the README
states the boundary explicitly — "Four surfaces, two strategies, one component" and "nothing
else on Decks, Commanders or Home is redesigned." **No values for a /discover row exist in
this handoff.** Any discovery-row treatment must be derived from the shared `<ArtWash>`
contract (`strategy` + `band` only) or returned to Design; it is not specified here.

---

## Cross-surface constants (README token reference, transcribed)

| Property | Value |
|---|---|
| L1 base plate | `#0E0C09` |
| Focal | `center top` — canvas applies this to `cover` layers and to both ambient layers only; both sharp layers use `left center` |
| Divider | `1px #2A241D` |
| Ground | `#1A160F` (canvas resume row: `#181410`) |
| Chip on art | `#14110E` + `1px #3A3229` (canvas deck-card status chip border: `#33402F`) |
| Title ink | `#F4EFE3` at 100% opacity |
| Subtitle ink | `#C6B79A` at 100% opacity |
| Text shadow over art | README `0 1px 3px rgba(0,0,0,.6)`; canvas `.65` / `.85` / `.9` / none per surface |
| Contrast floor | 7:1 titles, 4.5:1 meta, measured against the art's brightest pixel, which the scrim caps at L*34 |
| Art source | `image_uris.art_crop` (626×457, 1.37:1), front face on a modal DFC, never the full card |
| Portrait multiplier | `× 1.37` applied to band height |
| Reduced transparency | L2 → `opacity .3`; L3 stops → `.95 / .6 / .85` |
| `backdrop-filter` | explicitly rejected (compositing layer per card; does not fix hotspot luminance) |
| Retired in R2 | the `edge-signature` strategy from R1 |
| Varying props | `height`, `strategy`, `band` only — focal and the L1/L2/L3 stack are not per-call-site |
