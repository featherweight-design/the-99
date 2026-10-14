# States: Stacked sheets on the phone (R1)

Below `md` only. Frames are on `The 99 - Stacked Sheets.dc.html`.

## Pairs

| # | Under → top | Top sheet geometry | Way back (visible) | Accessible name | Back lands on · focus | Frame |
|---|---|---|---|---|---|---|
| s1 | Analysis receipt → card | 0, card 320 | `← {finding}` | `Back to {finding}` | receipt · the tile | 1a |
| s2 | What would have to go → card | 0, card 320 | `← What would have to go` | `Back to what would have to go` | sheet · the candidate | 1b |
| s3 | Reasoning / Synopsis → card | 0, card 320 | `← {title}` / `← Synopsis` | `Back to {title}` | sheet · the card name | (1a) |
| s4 | Shopping stand-ins → stand-in | 0, card 320, Take in the teaser | `← Cheaper stand-ins` | `Back to cheaper stand-ins` | sheet · the stand-in's name | 1c |
| s5 | Pull it list → card | 0, card 320 | `← Which deck to pull from` | `Back to which deck to pull from` | list · the card name; pick kept | 1d |
| s6 | Card → stand-ins (list sheet) | 52, as shipped; the card doesn't move | `← {card}` in the sheet head | `Back to {card}` | card · the door | 1e |
| s7 | Card → stand-ins → stand-in | 0 over 52 over 0 | `← Cheaper stand-ins`, then `← {card}` | as s4, s6 | as s4, then s6 | 1c + 1e |
| s8 | After Take | stand-in closes, sheet shows the taken row | `← {card}` | as s6 | card · door reads `swapped out · {card} is in` | as shipped |

## The top card's own states (stacked)

| # | State | Sheet top | Paging | Escape | Pill | Frame |
|---|---|---|---|---|---|---|
| c1 | Teaser | 532 | Band, as shipped | → the sheet underneath | → the sheet underneath | 1a |
| c2 | Full | 64 | Withheld | → teaser | → the sheet underneath (skips teaser) | 1f |
| c3 | Dragging horizontally | 532 | Follows the finger | — | Fixed; a press under the drag cancels | 1g |
| c4 | Dragging vertically | follows | No | — | Fixed | (carousel H4) |
| c5 | First / last | 532 | One side, rubber-band | as c1 | as c1 | 1b |
| c6 | List of one | 532 | None | as c1 | Max 354 | 1d |
| c7 | Cramped (short screen) | full only | Withheld | → the sheet underneath | as c1 | as shipped |
| c8 | Take pending / refused | 532 | Withheld while pending | Does nothing while pending | Disabled while pending | as shipped |

## Back control

| # | State | Drawn | Frame |
|---|---|---|---|
| b1 | Rest | 32 tall, radius 16, `color-mix(--bg 55%)`, `←` `--fg-muted`, label 13/500 `--fg` | 2a |
| b2 | Pressed | +16% `--fg` wash, scale .97 | 2b |
| b3 | Focus-visible | 2px `--accent` ring, offset 2 | 2c |
| b4 | Hit target | 44 tall (y 16–60) × pill width | 2d |
| b5 | No counter | max width 354 | 2e |
| b6 | Long label | ellipsis at 266; the full label stays in the accessible name | 2f |
| b7 | Disabled (Take pending) | 40% opacity, `aria-disabled` | — |

## Input

| Input | Result |
|---|---|
| Pill | Pops one layer, from any sheet state |
| Escape / hardware Back | full → teaser → pop |
| Scrim tap (s6 list sheet only) | Pops the list sheet |
| Drag ≤ 16px from either edge | The system's |
| Horizontal drag on the band (teaser) | Pages the top card's own list |

## Motion

| Event | Allowed | Reduced |
|---|---|---|
| Open card from a sheet | Rises 812 → 0, 240ms `cubic-bezier(.2,.7,.2,1)`; the sheet underneath fades to 0 | Swap |
| Pop | Drops in 200ms; the sheet underneath fades to 1 | Swap |
| List sheet over a card | Rises to 52 as shipped; the card doesn't move | Swap |
| Teaser ↔ full | 240ms snap (unchanged) | Swap; the drag tracks |
| Paging | 240ms glide (unchanged) | Swap; the drag tracks |

## Depth

Allowed: `page · sheet · card`, `page · card · sheet`, `page · card · sheet · card` (the only three-deep path).
Not allowed: anything inside a stacked card opening another layer.
