# Design Property Table — Analysis tab: the header (PR D)

Package: `.worktrees/analysis-tab-reading/design/design_handoff_the99_analysis_tab/` (not present in the main checkout; read from the worktree).
Sources, precedence: READINESS-r1-audit.md (findings 2/3/4, "Finding 3, eng's call", §5, §9 row D) > HANDOFF.md §1 > analysis-fixtures.js (`deck()` :55-75, `mark()` :36-40, `bandChip()` :197-204, states :255-348) > `Analysis Tab 1300.dc.html` :34-66, `Analysis Tab 390.dc.html` :40-69 > canvas `The 99 - Analysis Tab.dc.html` :452.
`—` = explicitly absent. Omitted = unspecified.

## Component: Header band (order and spacing)

### Band container
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Element order (one order, both widths) | deck name → pips + commander · colour → chips row (status pill, bracket chip) → progress bar | same |
| Status pill location (change from shipped) | moved off the FRONT of the meta row into the chips row | moved off the commander line into the chips row |
| Header root | `<header>` bg `var(--surface)`, overflow hidden | `<header>` position relative, min-height 288px, border-bottom 1px `var(--border)` |
| Art wash box | relative, height 288px, overflow hidden; wash layer bg `color-mix(in srgb, var(--bg) 86%, black)` | absolute left/right/top 0, height 288px, overflow hidden, bg `var(--bg)` |
| Art | cover, `center top`, opacity 0.8, inset 0 | left portrait: width 560px, opacity 0.92, cover, `center top`, mask `linear-gradient(90deg,#000 0 58%,transparent 100%)` |
| Scrim | 180deg: bg 0% at 0%, 0% at 41%, 73% at 60%, 73% at 100% | 90deg: bg 0% at 0px, 0% at 325px, 78% at 560px, `var(--bg)` at 584px |
| Text column | absolute left 18px, right 18px, bottom 12px, padding-right 40px; flex column, align-items flex-start, gap 6px | band row: flex, align-items flex-end, min-height 288px, padding `0 24px 18px 592px`, gap 18px; column flex `1 1 280px`, min-width 0, flex column (no gap) |
| Card-details control | 26×26 absolute right 16px bottom 14px, radius 7, 1px `--border-strong`, bg `--bg`, glyph 14px | absolute left 16px bottom 5px, 44px tall wrapper; pill 26px tall, padding 0 9px, radius 7, gap 6, `⛶` 14px + "Card details" mono 11 |
| Actions (Update from a list / Export) | below the progress section: flex wrap, centered, padding `4px 16px 14px`, gap 8; each min-height 44, padding 6px 9px, mono 11 | right of the column: flex wrap, justify flex-end, gap 9; each 32px tall, padding 0 14px, radius 8, 600 12.5px |

### Row 1: Deck name
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Wrapper | block, width 100%, text-align left; h1 inline + `&nbsp;` + pencil | flex, align-items center |
| Name typography | `var(--display)`, 700, 20px, line-height 1.25, `--fg` | `var(--display)`, 700, 21px, line-height 1.2, `--fg` |
| Name text-shadow | `0 1px 4px rgba(0,0,0,0.85)` | — |
| Pencil ✎ | inline-flex, width 14px, 14px, line-height 1, `--fg-muted`, same text-shadow | flex none, margin-left 6px, width 14px, 14px, line-height 1, `--fg-muted` |
| Gap to row 2 | 6px (column gap) | margin-top 3px on row 2 |

### Row 2: Pips + commander · colour
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Row layout | flex, width 100%, min-width 0, flex-wrap nowrap, align center, gap 8px | flex, flex-wrap wrap, align center, gap 10px, margin-top 3px, min-width 0 |
| Pips group | flex, align center, gap 3px, flex none | same |
| Pip | 10×10, radius 2, bg `var(--{c})`, box-shadow `inset 0 0 0 1px rgba(0,0,0,0.4)` | same |
| Text | mono (IBM Plex Mono) 10px, `--fg-body`, text-shadow `0 1px 4px rgba(0,0,0,0.85)`; flex gap 4, align baseline, min-width 0, overflow hidden | mono 11px, `--fg-body`, single span |
| Truncation | commander ellipsis (flex `0 1 auto`, nowrap); `&nbsp;· {colour}` flex none, never truncated | — |
| Form | `{commander} · {colorLabel}` (e.g. `Yuriko, the Tiger's Shadow · Dimir`) | same |
| Status pill in this row | — (moved) | — (moved) |

### Row 3: Chips row
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Layout | flex, flex-wrap wrap, align-items center, gap 8px | flex, flex-wrap wrap, align-items center, gap 8px |
| Offset above | 6px (column gap) | margin-top 8px |
| Children, in order | status pill, then bracket chip | status pill, then bracket chip |
| Chip present | only when a reading exists (`hasBand`) | same |
| Location | on the art wash, inside the 288px box | on the art wash, in the text column |
| Wrap behaviour | chip wraps below the pill when the row is short (flex-wrap) | same |

### Row 3a: Status pill (beside the chip)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Display | flex, flex none, align center | flex, align center |
| Height | 22px | natural (padding 3px + 11px text; no height set) |
| Padding | 0 7px | 3px 8px |
| Radius | 6px | 6px |
| Border | 1px `var(--border-strong)` | 1px `var(--border-strong)` |
| Background | `color-mix(in srgb, var(status) 18%, var(--bg))` | same |
| Ink | `var(status)` (`--success` Complete, `--accent` To buy) | same |
| Type | mono 10px, nowrap | mono 11px, nowrap |
| Text-shadow | none | — (none set) |

### Row 4: Progress bar
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Location | BELOW the art wash, own section: border-top 1px `--border`, padding `14px 16px 12px`, flex column centered, gap 8 | inside the text column, margin-top 9px |
| Row | flex, width 100%, align center, gap 10px | flex, align center, gap 10px |
| Track | flex 1, min-width 0, height 6px, radius 999, bg `--elevated`, `inset 0 0 0 1px rgba(0,0,0,0.4)`, overflow hidden | same, plus max-width 170px |
| Fill | 100% × 100%, bg `var(status)` | same |
| Count | flex none, baseline, gap 4; `99` mono 600 14px `--fg`; `/ 99` mono 14px `--fg-faint` | `99` mono 600 15px `--fg`; `/ 99` mono 13px `--fg-faint` |

## Component: BracketChip (header, and the /decks tile via the same component)

### Chip box
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Element (frame) | `span`, inline-flex | same |
| Height | 22px | 24px |
| Radius | 6px | 6px |
| Align / flex | align-items center, flex none, white-space nowrap | same |
| Gap (mark↔mark, mark↔name) | 5px | 5px |
| Padding | 0 8px 0 2px (left 2, right 8, top/bottom 0) | same |
| Plate background | `color-mix(in srgb, var(--bracket-{low}) 12%, var(--bg))` | same |
| Border | 1px solid `color-mix(in oklab, var(--bracket-{low}) 55%, transparent)` | same |
| Ink (text) | `var(--bracket-{low})` | same |
| Text-shadow | none (explicit, overrides the wash's shadow) | none |
| Hit area | 44px (audit §5, as #877 built it; not drawn in frames) | 44px |

### Mark(s)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Size | 22×22 | 22×22 |
| Form | chip form: `assets/bracket-{n}-{slug}-chip.svg` (40×40 viewBox, `#000` → currentColor), display block, flex none | same |
| Numeral in the art | the file's own `<text>` Cinzel 700 17 (of 40), currentColor | same |
| Ink | `var(--bracket-{n})` per mark (currentColor) | same |
| Count | one (single) / two (range: low then high) | same |
| Second (high) mark opacity | 0.65 | 0.65 |
| First mark opacity | unset (1) | unset (1) |
| Separator between marks | — (no slash) | — |

### Name label
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Family | 'IBM Plex Mono', monospace | same |
| Size | 10px | 11px |
| Single form | bracket name: Exhibition / Core / Upgraded / Optimized / cEDH | same |
| Range form | `{low} or {high}` unrounded, e.g. `Optimized or cEDH`; no slash, no `Split` | same |
| Ink | `var(--bracket-{low})` (whole label in the LOW rank's ink) | same |
| White-space | nowrap | nowrap |

### Behaviour
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Before a first reading | absent (no chip; pill alone in the row) | same |
| Press | opens the Analysis tab (tab has no URL; client state) | same |
| Stale (list edited, not re-analyzed) | HOLDS the last bracket (Hugh 2026-09-23; reverses #877 hide-on-edit) | same |
| Failed re-read over a held reading | the held bracket | same |
| /decks tile | draws the same `BracketChip` (audit finding 3 / eng's call); tile not drawn in frames; `probe:bracket-chip` re-run at 390 / 700 / 1300, tile's chip cell wraps at 700, bar keeps 40px floor | same |

## State coverage
| State | Mobile (390) | Desktop (1300) |
|---|---|---|
| No reading (2a never analyzed, 2b loading, 2c failed) | chip absent; pill alone | same |
| Single (2g `Upgraded` tovolar; 2h lean `Optimized` kinnan) | one 22px mark + name, e.g. `Upgraded` | same |
| Range, asking (2e yuriko) | marks 4 then 5 (5 at 0.65), `Optimized or cEDH`, plate/border/ink in bracket-4 | same |
| Range, answered (2f) | the answer as a single chip: `bandChip(4)` → one mark, `Optimized` | same |
| Stale (2i), failed-held (2d), yurikoStale | held chip unchanged (2i: `Upgraded`; yurikoStale: answered `Optimized`) | same |
| Draft status pill | `To buy`, `--accent` | same |
| Clean status pill | `Complete`, `--success` | same |

## Conflicts noted
| # | Conflict | Resolution |
|---|---|---|
| 1 | Canvas order table (:452) puts the phone chip "on the art wash, its own line above the title"; HANDOFF §1 + 390 frame put it in the chips row under the commander line | HANDOFF wins (audit finding 4) |
| 2 | Shipped #877 chip: `rounded-full`, no plate, sans 11 medium, 20px mark, 22px tall desktop, range label `Split` with a slash | Handoff chip replaces it inside `BracketChip` for both mounts; `splitChip` and `Split` retire (finding 3) |
| 3 | #877 hides the chip when the list changes; handoff draws the held bracket in 2d/2i | Chip holds (finding 2, settled 2026-09-23) |
| 4 | Fixture `chip()` (:189-196, the bracket BOX, radius 999, `Split`, 26/36 marks) is a different component from the header `bandChip()` | Header uses `bandChip` only; the box's `Split` also retires per audit |
| 5 | STATES 2f says header shows "the answer"; fixture draws it as a single-bracket chip (declared rank) | Consistent: answered range = single chip of the declared bracket |
| 6 | HANDOFF names name weight/letter-spacing/transform nowhere; fixture sets none | Unspecified (inherit); no uppercase |
| 7 | Desktop pill has no fixed height (~natural) vs chip 24px; phone pill 22 = chip 22 | Not a conflict in design; row is align-items center |
| 8 | Package exists only in the worktree, not the main checkout named in the brief | Read from worktree |
