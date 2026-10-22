# Design Property Table — Combos one piece away, UI-1

Source: `design/design_handoff_the99_combos_close/` (README, STATES, READINESS incl. Engineering audit errata E1–E5), boards `Deck-Page.dc.html`, `The-List.dc.html`, `Main.dc.html` (board CSS extracted to `dp.css` / `list.css`). Mobile = 390 board, Desktop = 1300 board. Copy is placeholder for `/copy-review` and is listed as STRUCTURE (slots and interpolations), not text to match. Switch is `NEAR_COMBOS_ENABLED` (E2), not `COMBOS_CLOSE_ENABLED`. Base font family on the boards: `'IBM Plex Sans'` unless a row says `'IBM Plex Mono'` or `Cinzel`.

## Component: Deck page status-line segment

### Host — quiet status strip (`.sl`, deck has nothing to do)
| Property | Mobile | Desktop |
|---|---|---|
| Rendered when | to-do card absent (quiet deck); strip already ships | same |
| Position | below the actions row (`.acts`), above Recommended mix | below the hero, full page width, above Recommended mix |
| background | `var(--surface-rail)` | same |
| border-bottom | 1px solid `var(--border)` | same |
| padding | 10px 16px | 12px 30px |
| font | 11px / line-height 1.7, `'IBM Plex Mono'` | 11px, line-height 1.7, `'IBM Plex Mono'` |
| color (strip text) | `var(--fg-faint)` | same |
| Content order | version text, separator, segment | same ("the segment follows the version") |
| Version text slot | `v{N} · committed {date}` (shipped) | same |

### Host — to-do card foot (`.t2 .ft`, deck has something to do)
| Property | Mobile | Desktop |
|---|---|---|
| Rendered when | to-do card present; segment sits in its foot after the version | same (only drawn at 390; desktop rules exist in CSS) |
| border-top | 1px solid `var(--border)` | same |
| padding | 9px 14px | 9px 16px |
| font | 11px / 1.7 `'IBM Plex Mono'` | same |
| color | `var(--fg-faint)` | same |
| background | `color-mix(in srgb, var(--bg) 40%, var(--surface-rail))` | same |
| Content order | version (`v{N}` only, no committed date), separator, segment | same |
| Card shell (`.t2`) margin | 14px 14px 14px | 18px 26px 18px |
| Card shell radius / bg / border | 12px / `var(--surface-rail)` / 1px solid `var(--border-strong)`, overflow hidden | same |

### Separator (`.sep`)
| Property | Mobile | Desktop |
|---|---|---|
| Glyph | `·` | same |
| color | `var(--fg-locked)` | same |
| margin | 0 5px | same |
| Rendered when | only when the segment renders (absent in None) | same |

### Segment (`.ds.cbs`)
| Property | Mobile | Desktop |
|---|---|---|
| display | inline-flex | same |
| align-items | center | same |
| gap | 6px | same |
| white-space | nowrap | same |
| color | `var(--fg-body)` | same |
| border-bottom | 1px dotted `var(--fg-faint)` | same |
| font | inherits 11px `'IBM Plex Mono'` | same |
| text-decoration | — (dotted bottom border, no underline) | same |
| Copy slot | `{N} combos one piece away` (N ≥ 2); `1 combo one piece away` (N = 1) | same |
| Interactive | yes, press opens list sheet (390) / modal (1300) | same |
| Hit area | — not set on the segment itself (strip has a shipped `.sl .tap` helper: inline-block, padding 12px 0, margin -12px 0) | same |
| Hover / focus / press | — not drawn | — not drawn |
| About locator | `[data-combos-close]` (READINESS, For engineering 5 / G8) | same |

### Segment glyph — lemniscate (`svg.lem`)
| Property | Mobile | Desktop |
|---|---|---|
| width × height | 13 × 13 | same |
| viewBox | 0 0 16 16 | same |
| path | figure-eight `M5.2 4.9 A 3.1 3.1 0 1 0 5.2 11.1 C 8.3 11.1 7.7 4.9 10.8 4.9 A 3.1 3.1 0 1 1 10.8 11.1 C 7.7 11.1 8.3 4.9 5.2 4.9 Z` | same |
| fill / stroke | none / currentColor | same |
| stroke-width | 1.8 | same |
| stroke-linecap | round | same |
| display | inline-block, flex none | same |
| color | `var(--fact)` | same |
| filter | `drop-shadow(0 0 3px color-mix(in oklab, var(--fact) 45%, transparent))` | same |
| aria-hidden | true | same |
| Order | before the count text | same |

### Segment chevron (`.cbs .go`)
| Property | Mobile | Desktop |
|---|---|---|
| Glyph | `›` | same |
| color | `var(--fg-faint)` | same |
| margin-left | 2px (plus the 6px flex gap) | same |
| Position | after the count text, inside the dotted underline | same |

## Component: List sheet (390) / modal (1300)

### Scrim
| Property | Mobile | Desktop |
|---|---|---|
| position | absolute, inset 0 | same |
| background | `rgba(8,6,5,.62)` | same |
| z-index | 30 | same |

### Container
| Property | Mobile (`.bs` bottom sheet) | Desktop (`.md.md2` modal) |
|---|---|---|
| position | absolute; left 0, right 0, bottom 0 | absolute; left 50%, top 70px, translateX(-50%) |
| z-index | 31 | 31 |
| width | full screen width | 900px (`.md2` overrides `.md` 600px) |
| background | `var(--surface)` | `var(--surface)` |
| border | top only: 1px solid `var(--border-strong)` | 1px solid `var(--border-strong)` |
| border-radius | 18px 18px 0 0 | 14px |
| box-shadow | `0 -14px 40px rgba(0,0,0,.6)` | `0 24px 60px rgba(0,0,0,.6)` |
| display / direction | flex, column | flex, column |
| height | sizes to its rows ("The sheet sizes to its rows"); no max-height or scroll drawn | sizes to its rows |
| Chrome | the pass sheet's chrome (shared with Show these) | same |

### Grabber (`.gr`)
| Property | Mobile | Desktop |
|---|---|---|
| Rendered | yes | — (absent) |
| size | 40 × 4px | — |
| border-radius | 9px | — |
| background | `var(--border-strong)` | — |
| margin | 8px auto 2px | — |

### Header (`.hd2`)
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | same |
| align-items | flex-start | same |
| gap | 10px | same |
| padding | 10px 8px 10px 18px | same |
| border-bottom | 1px solid `var(--border)` | same |
| Title block (`.tt`) | flex 1, min-width 0 | same |

### Header eyebrow (`.ey`)
| Property | Mobile | Desktop |
|---|---|---|
| Copy slot | static eyebrow string ("one piece away" slot), no interpolation | same |
| font | 9.5px `'IBM Plex Mono'` | same |
| letter-spacing | .14em | same |
| text-transform | uppercase | same |
| color | `var(--accent)` | same |

### Header title (`h3`)
| Property | Mobile | Desktop |
|---|---|---|
| Copy slot | `{N} combos` (N ≥ 2) / `1 combo` (N = 1) | same |
| font | 700 17px Cinzel, serif | same |
| margin | 4px 0 0 | same |
| color | `var(--fg)` | same |

### Header lead (`p`)
| Property | Mobile | Desktop |
|---|---|---|
| Copy slot | plural: "Each needs one more card in {deck name}…"; singular (N = 1): "It needs one more card in {deck name}…"; interpolates the deck's name | same |
| font-size | 12.5px | same |
| line-height | 1.5 | same |
| margin | 4px 0 0 | same |
| color | `var(--fg-body)` | same |

### Header close (`.x`)
| Property | Mobile | Desktop |
|---|---|---|
| Glyph | `✕` | same |
| size | 44 × 44px | same |
| flex | none | same |
| display / align / justify | flex / center / center | same |
| color | `var(--fg-muted)` | same |
| font-size | 15px | same |
| Behavior | closes the sheet/modal | same |

### List body (`.oa`)
| Property | Mobile | Desktop |
|---|---|---|
| display / direction | flex, column | same |
| gap | 6px | same |
| padding | 10px 12px 12px | same |
| Group order | "You own it" then "To buy" | same |
| Order within You own it | spare rows first, then in-another-deck rows | same |
| Order within To buy | cheapest first | same |
| Group rendered when | it has ≥ 1 row (One state shows only "To buy") | same |

### Group heading (`h5`)
| Property | Mobile | Desktop |
|---|---|---|
| Copy slot | group label ("You own it" / "To buy") + count `{n}` in `em` | same |
| font | 600 13px `'IBM Plex Sans'` | same |
| color | `var(--fg)` | same |
| display | flex, gap 8px, align-items baseline | same |
| margin | 8px 0 2px 2px; first child margin-top 0 | same |
| Count (`em`) font | normal 10.5px `'IBM Plex Mono'` | same |
| Count color | `var(--fg-faint)` | same |

### Row (`.or`)
| Property | Mobile (two-line) | Desktop (`.md2 .or`, one line) |
|---|---|---|
| display | flex | flex |
| align-items | flex-start | center |
| gap | 10px | 12px |
| padding | 10px 4px 10px 11px | 0 6px 0 14px |
| min-height | — | 44px |
| border-radius | 9px | 9px |
| background | `var(--surface-rail)` | same |
| position | relative | same |
| Border | — | — |
| Press target | whole row opens the combo detail (UI-2), except the deck link | same |
| Pressed state (`.or.press`) | outline 2px solid `var(--accent)`, outline-offset 1px | same |
| Hover / focus | — not drawn beyond press outline | — |
| Columns (desktop) | — | glyph col 38px · name (flex none) · with (flex 1, min 200px, ellipsis) · where (190px) · what it does (190px, right) · › |

### Row glyph column (`.gl`)
| Property | Mobile | Desktop |
|---|---|---|
| flex | none | none |
| flex-direction | column | row |
| gap | 5px | 5px |
| padding | 2px 0 0 (top 2px) | 0 |
| width | — (auto) | 38px |
| Content | lemniscate always; plus turn-again mark when the combo produces infinite turns | same |

### Row lemniscate (`svg.lem`)
| Property | Mobile | Desktop |
|---|---|---|
| width × height | 16 × 16 | same |
| viewBox / path | 0 0 16 16, same figure-eight path as the segment | same |
| stroke-width | 1.8, round caps, fill none, currentColor | same |
| display | block, flex none | same |
| color | `var(--fact)` | same |
| filter | `drop-shadow(0 0 3px color-mix(in oklab, var(--fact) 45%, transparent))` | same |

### Row turn-again mark (`svg.lem`, second glyph)
| Property | Mobile | Desktop |
|---|---|---|
| Rendered when | combo produces infinite turns (loop mark, as shipped) | same |
| width × height | 16 × 16, viewBox 0 0 16 16 | same |
| paths | arc `M10.98 3.74 A 5.2 5.2 0 1 1 6.65 2.98` (stroke 2, round cap, fill none) + arrowhead `M9.0 2.4 L7.1 4.6 L6.2 1.3 Z` (fill currentColor) | same |
| color / filter | `var(--fact)` with the same drop-shadow (class `lem`) | same |
| Placement | stacked under lemniscate | beside lemniscate |

### Row text column (`.tx`)
| Property | Mobile | Desktop |
|---|---|---|
| flex | 1, min-width 0 | same |
| flex-direction | column | row |
| align-items | — | baseline |
| gap | 3px | 12px |

### Row name (`.n`)
| Property | Mobile | Desktop |
|---|---|---|
| Copy slot | `{missing card name}` | same |
| font-size | 14px | 13.5px |
| font-weight | 600 | 600 |
| color | `var(--fg)` | same |
| overflow | nowrap, hidden, ellipsis | same |
| flex | — | none |

### Row "with" line (`.w`)
| Property | Mobile | Desktop |
|---|---|---|
| Copy slot | `with {piece already in the deck}`; piece in `<b>`; optional `commander` tag | same |
| font-size | 12.5px | 12.5px |
| line-height | 1.4 | 1.4 |
| color | `var(--fg-body)` | same |
| Piece (`b`) | weight 500, `var(--fg)` | same |
| Layout | — | flex 1, min-width 200px, nowrap, overflow hidden, ellipsis |

### Commander tag (`.cz`)
| Property | Mobile | Desktop |
|---|---|---|
| Rendered when | the held piece is the commander (S8) | same |
| Copy slot | static `commander` | same |
| font | 10px `'IBM Plex Mono'` | same |
| color | `var(--fg-faint)` | same |
| margin-left | 4px | same |

### Row status line (`.s`: where-line + what it does)
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | center | center |
| gap | 8px | 8px |
| flex-wrap | wrap | nowrap |
| font | 10.5px `'IBM Plex Mono'` | same |
| color | `var(--fg-body)` | same |
| margin-top | 2px | 0 |
| flex | — | none |

### Where-line wrapper (`.wh`)
| Property | Mobile | Desktop |
|---|---|---|
| display | inline-flex | inline-flex |
| align-items | center | center |
| gap | 7px | 7px |
| width | — (auto) | 190px |

### Where-line dot (`.od`)
| Property | Mobile | Desktop |
|---|---|---|
| size | 8 × 8px | same |
| border-radius | 50% | same |
| Owned (spare / in another deck) | background `var(--success)` | same |
| To buy (`.od.no`) | background transparent; border 1.5px dashed `var(--fg-locked)` | same |
| display / flex | inline-block / none | same |

### Where-line variant — spare (S5)
| Property | Mobile | Desktop |
|---|---|---|
| Rendered when | a free copy exists (G3; spare wins over another deck) | same |
| Content | green dot + copy slot "spare in your collection" (static) | same |

### Where-line variant — in another deck (S6)
| Property | Mobile | Desktop |
|---|---|---|
| Rendered when | every copy held by other decks | same |
| Content | green dot + `in {deck name}` with deck name as link | same |
| Which deck | the first committed holding deck (G4/E4) | same |

### Deck link (`.dlk`)
| Property | Mobile | Desktop |
|---|---|---|
| Target | `/decks/{id}` | same |
| color | `var(--fg-body)` | same |
| text-decoration | underline, color `var(--border-strong)`, underline-offset 2px | same |
| Hit area | 44px tall: padding 12px 0, margin -12px 0 | same |
| Pressed state (`.dlk.hit`) | outline 2px solid `var(--accent)`, outline-offset 2px, radius 3px, padding 0, margin 0 | same |
| Behavior | opens that deck; does not open the combo (rest of row does) | same |
| Styled as | card details' "In your decks" link | same |

### Where-line variant — to buy (S7) / price tag (`.btag`)
| Property | Mobile | Desktop |
|---|---|---|
| Rendered when | no copy owned | same |
| Content | hollow dashed ring + shipped BuyTag with price | same |
| Copy slot | `{formatted price}` (e.g. `$1.49`, `$1,150`) | same |
| font | 10px `'IBM Plex Mono'` | same |
| color | `var(--warning)` | same |
| border | 1px solid `var(--accent-shadow)` | same |
| border-radius | 4px | same |
| padding | 0 5px | same |
| line-height | 15px | same |

### What it does (`.pr`)
| Property | Mobile | Desktop |
|---|---|---|
| Copy slot | `{combo result}` (Spellbook produces, e.g. "Infinite damage") | same |
| font | 9px `'IBM Plex Mono'` | same |
| letter-spacing | .1em | same |
| text-transform | uppercase | same |
| color | `var(--fg-faint)` | same |
| width | — | 190px |
| text-align | — | right |
| white-space | — | nowrap |

### Row chevron (`.cv`)
| Property | Mobile | Desktop |
|---|---|---|
| Glyph | `›` | same |
| flex | none | same |
| align-self | center | same |
| width | 28px | same |
| text-align | center | same |
| color | `var(--fg-faint)` | same |
| font-size | 15px | same |

### Foot line (`.qf`)
| Property | Mobile | Desktop |
|---|---|---|
| Copy slot | static source/scope line (Commander Spellbook; two-card; legal in this deck's colors) | same |
| Position | last child of the list body, after the rows | same |
| font | 10.5px / 1.5 `'IBM Plex Mono'` | same |
| color | `var(--fg-faint)` | same |
| padding | 4px 4px 0 | same |

### Done foot (`.sf`)
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| gap | 8px | 8px |
| padding | 12px 14px 26px | 12px 16px 14px |
| border-top | 1px solid `var(--border)` | same |
| Spacer (`.sp`) | — absent | flex 1, background none (pushes Done right) |
| Buttons | one: Done (primary) | one: Done (primary) |

### Done button (`.sf .p`)
| Property | Mobile | Desktop |
|---|---|---|
| Copy slot | static "Done" | same |
| flex | 1 (full width) | none |
| height | 44px | 38px |
| padding | — | 0 18px |
| display / align / justify | flex / center / center | same |
| border-radius | 9px | same |
| font | 600 13.5px `'IBM Plex Sans'` | same |
| background | `var(--fg)` | same |
| color | `var(--bg)` | same |
| Behavior | closes the sheet/modal | same |

### Empty sheet
| Property | Mobile | Desktop |
|---|---|---|
| Rendered | — never (R1b: no empty sheet; `.emp` CSS exists on the board but is not used) | — never |

## State Coverage

| State | Triggering condition | What renders |
|---|---|---|
| S1 Segment · Many, quiet | ≥ 2 two-card combos one piece away, legal in colors; no to-do | strip: version `·` lemniscate + `{N} combos one piece away ›` |
| S1 Segment · Many, with to-do | as above, deck has a to-do | segment in the to-do card's foot after `v{N}` |
| S2 Segment · One | exactly 1 | `1 combo one piece away ›` (same styling) |
| S3 Segment · None | 0 | no segment, no separator; strip is the version alone |
| Segment pressed | press on segment | list sheet (390) / modal (1300) opens over scrim |
| S4 List · Many | sheet open, N ≥ 2 | head eyebrow + `{N} combos` + plural lead; groups You own it / To buy with counts; foot line; Done |
| List · One | N = 1 | `1 combo`, singular lead, only the non-empty group, one row; sheet sizes to its row |
| S5 Row · Spare | a free copy (availability free ≥ 1) | green dot + "spare in your collection" |
| S6 Row · In another deck | every copy held by other decks | green dot + `in {deck}` link to `/decks/{id}`, 44px hit |
| Deck link pressed | press on the deck name | navigates to that deck; row's combo detail does not open |
| S7 Row · To buy | no copy | dashed hollow ring + price BuyTag; group sorted cheapest first |
| S8 Row · Commander piece | held piece is the commander | `commander` tag after the piece name |
| Row · Infinite turns | combo produces infinite turns | lemniscate + turn-again mark in glyph column |
| Row pressed | press on row (not link) | accent outline; opens the combo detail (UI-2, out of scope) |
| S9 Last one added | the last missing piece added (from combo detail) | sheet closes; segment goes (no empty sheet) |
| Close / Done | ✕ or Done pressed | sheet/modal closes |
