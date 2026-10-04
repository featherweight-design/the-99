# Design Property Table: Card carousel, phone card-first sheet (R2)

Source: `design/design_handoff_the99_card_carousel/`: `PhoneHero.dc.html` (frames H1-H6), `README.md`
"R2: phone, card first" (Hugh LGTM 2026-10-03), `STATES-card-carousel.md` §R2 and §Motion, and
`card-carousel · copy strings.ts`. Built in carousel PR 3 (3a the gesture module, 3b the sheet).

Enumerated from the design files first, then verified row by row against `card-modal.tsx`, its tests
and a browser walk at 390x844 and 360x640 (Chromium with real CDP touch, and WebKit). Measured values
are from `getBoundingClientRect` at 390x844 unless marked.

Copy wording is `/copy-review`'s, not this table's. The three R2 keys (`cardSheetCopy.expand`,
`grabberAria(expanded)`) are verified as structure only.

## Wash (whole dialog)

| Property | Design | Built | |
|---|---|---|---|
| Art layer | card art, `blur(28px)`, `scale(1.25)`, opacity .55 | `mobile-art-wash`, the same three | ✅ |
| Shade | `linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.45) 100%)` | same | ✅ |
| Ground | `--surface-sunken` | dialog's shipped `--surface-sunken` | ✅ |

## Card band

| Property | Design | Built | |
|---|---|---|---|
| Box | top 0, full width, height 532 (the teaser's top) | `calc(100% - teaserHeight)`; measured to 564 at 844 tall | ✅ |
| Drag | `translateX(dragX)`, 1:1 | inline `transform` from the hook | ✅ |
| Opacity | 1 teaser, .35 full | same, `.band-dim` 240ms | ✅ |
| Card | 320x447 at x 35, y 64, radius 14 | measured 35, 64, 320x447; `rounded-[14px]` | ✅ |
| Card shadow | `0 24px 50px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(0,0,0,0.3)` | same | ✅ |
| Card sizing | `min(320px, (100dvh - 85px - 280px) x 0.7159)` | `min(320px, calc((100cqh - 85px) * 0.7159))` against the band; 197 wide at 360x640 | ✅ |
| Peeks | 236x330 at x -213 and 367, y 122, radius 11, opacity .5 | measured -213 / 367, y 123, 236x330 (122.7 rounds up), `rounded-[11px]`, .5 | ✅ |
| Peek shadow | `0 16px 36px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.3)` | same | ✅ |
| Peek name | `Previous card: {name}` / `Next card: {name}` | `cardCarouselCopy.neighborAria(direction, name)` | ✅ |

## Counter and ✕

| Property | Design | Built | |
|---|---|---|---|
| Counter | top 22, left 18, height 32, padding 0 12, radius 16, `color-mix(in oklab, var(--bg) 55%, transparent)`, mono 11px `--fg-body`, only when total > 1 | measured 18, 22, h 32; same styles; `total > 1` | ✅ |
| ✕ | top 22, right 18, 32x32, round, same plate, 16px `--fg` | shipped ✕, unchanged | ✅ |

## Sheet

| Property | Design | Built | |
|---|---|---|---|
| Box | left 0, right 0, bottom 0, top 532 teaser / 64 full | `--sheet-top`; measured 564 / 64 at 844 tall | ✅ |
| Ground | `--surface-rail` | same | ✅ |
| Edge | border-top 1px `--border-strong`, radius 18 18 0 0 | same | ✅ |
| Shadow | `0 -14px 34px rgba(0,0,0,0.45)` | same | ✅ |
| Home inset | padding-bottom 34 teaser, 0 full | `max-md:pb-[34px]` in the teaser; `All details` bottom measured 810 at 844 | ✅ |
| Grabber row | height 22, bar 36x4, radius 2, `--border-strong` | a native button, 22 tall, the same bar | ✅ |
| Content padding | 0 20 | `max-md:pt-0 p-[20px]` | ✅ |

## Sheet head (both states)

| Property | Design | Built | |
|---|---|---|---|
| Name | `--font-display`, weight 400, 24px, line-height 1.15, `--fg` | `font-normal text-[24px] leading-[1.15]` below `md` | ✅ |
| Type line | 13px, margin-top 4, `--fg-muted` | shipped, unchanged | ✅ |
| Row | flex, start-aligned, space-between, gap 12 | shipped row (wraps the cost under a long name, as shipped) | ✅ |
| Cost | pips at the row's end | shipped `ManaCost` | ✅ |
| Second line | flex, centred, gap 12, margin-top 12, wraps | same | ✅ |
| Price plate | the shipped plate (`$1.55 from $0.26`) | the shipped phone plate, moved | ✅ see note 1 |
| Owned | mono 12px: count `--accent`, `·` `--fg-faint`, availability in `--avail` | `OwnedLine`: the same, availability through `AvailabilityMarker` | ✅ see note 2 |

## Teaser body

| Property | Design | Built | |
|---|---|---|---|
| Oracle | margin-top 12, 13.5px / 1.6, `--fg-body`, max-height 64, mask `linear-gradient(180deg,#000 55%,transparent)` | same | ✅ |
| All details | margin auto -20 0, border-top 1px `--border`, min-height 44, centred, gap 8, 13.5px `--fg-body`, `▴` `--fg-faint` aria-hidden | same; `cardSheetCopy.expand` | ✅ |

## States

| # | State | Built | |
|---|---|---|---|
| h1 | Teaser on open and after every page | the modal remounts per card with `sheetFull` false | ✅ |
| h2 | Dragging follows the finger | `--sheet-drag-top`; 334 measured mid-drag | ✅ |
| h3 | Full at 64, paging withheld | band drag and arrow keys refuse in full | ✅ |
| h4 | Full with the picker open | the shipped set row and region, in the full sheet | ✅ |
| h5 | First / last: one side, rubber-band | missing side draws nothing; 0.3x, max 40 | ✅ |
| h6 | List of one: no counter, no peeks, sheet still expands | contact-sheet row `phone-one` | ✅ |
| h7 | Zoom | retired on the phone (README R2 "Zoom") | ✅ |
| Escape | full, then teaser, then close | `onEscape` rung after the zoom | ✅ |
| Motion | 240ms on `cubic-bezier(.2,.7,.2,1)`; reduced: swaps, drags still track | `.sheet-snap`, `.band-dim`, `.anim-phone-card-enter`; reduced measured `none` with the drag still tracking | ✅ |

## Notes

1. The specimen redraws the plate (padding 3, radius 6, a translucent dark ground). README R2 says the
   SHIPPED plate moves into the teaser, so the shipped one (padding 2, radius 7, `--bg`) is what is built.
2. `--avail` is declared by no theme. Plan PR 3's engineering call resolves it to the availability
   marker's own state map, so the figure is drawn by the marker component itself.
3. Not drawn by R2, kept rather than cut: the stand-ins door's strip at the sheet's head, and a
   stacked stand-in's Take footer at its foot. The teaser grows by each one's MEASURED height (a door
   renderer can draw nothing for a locked card), so the card band gives the room back. Where that
   would leave the card under 120px wide (a stacked stand-in with its footer on a 360x640 phone, about
   28px), the teaser is not offered: the sheet opens full and stays full, with no grip, and Escape
   closes. Stacked sheets (96 / 140) are PR 4's spec check.

VERDICT: 0 visual gaps, 0 state gaps.
