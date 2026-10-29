# Design table: ledger numbers (#477)

Source: `design/design_handoff_the99_small_items_2/Ledger.dc.html` (CSS lines 248-267, 521-524, 535-557) and README section 5. Mobile = 390, Desktop = 1300 (`.dkm`). Family `'IBM Plex Sans'` etc. are literal in source (no family var). Copy wording is not a property.

## Ledger container (`.t2 .fo` > `.sld`)

| Property | Mobile | Desktop |
|---|---|---|
| fo border-top | 1px solid var(--border) | 1px solid var(--border) |
| fo padding | 4px 14px 12px | 4px 16px 12px |
| fo background | color-mix(in srgb, var(--bg) 40%, var(--surface-rail)) | same |
| sld margin-top | 8px (`.t2 .fo .sld`; base 10px) | 8px |
| sld layout | flex column, gap 6px | flex column, gap 6px |

## Header (`.lh`)

| Property | Mobile | Desktop |
|---|---|---|
| layout | flex, align-items center, gap 9px | same |
| font | 12px 'IBM Plex Sans' | same |
| color | var(--fg-body) | var(--fg-body) |
| structure | disc + title (live auto-added count) | disc + title + meta `.mm` |
| disc (`.disc`) | 16x16, radius 50%, border 1.2px solid var(--accent), color var(--accent), font italic 600 10px/14px 'IBM Plex Serif' serif, text-align center, flex none | same |
| meta `.mm` | — | margin-left auto; font 10.5px 'IBM Plex Mono'; color var(--fg-locked); counts every line shown (passes incl. undone/kept), plus to-buy |

## Ledger line, base (`.ll`) — all states

| Property | Mobile | Desktop |
|---|---|---|
| border-radius | 7px | 7px |
| padding | 9px 10px | 0 11px |
| background | var(--surface) | var(--surface) |
| border | 1px solid var(--border) | 1px solid var(--border) |
| font-family | 'IBM Plex Sans' | 'IBM Plex Sans' |
| layout | block (label row, sentence, button row stacked) | flex row, align-items center, gap 11px, min-height 34px; `.lt` display contents (label/rv join the row) |

## Label row + label (`.lt`, `.lb`)

| Property | Mobile | Desktop |
|---|---|---|
| lt layout | flex, align-items baseline, gap 8px | display contents |
| lb font | 9.5px 'IBM Plex Mono' | same |
| lb letter-spacing | .1em | .1em |
| lb text-transform | uppercase | uppercase |
| lb color | var(--fg-faint) | var(--fg-faint) |
| lb width | — | 66px, flex none |

## Revert note (seed only; mobile `.rv`, desktop `.rvn`)

| Property | Mobile | Desktop |
|---|---|---|
| element | `span.rv` inside `.lt` | `em.rvn` inside `.ud` (the undo column) |
| font | 10px 'IBM Plex Mono'; font-style n/a | 10px 'IBM Plex Mono'; font-style normal |
| color | var(--fg-locked) | var(--fg-locked) |
| margin-left / margin | auto (pushed right of label) | `.rv` margin 0, order 9; `.rvn` text-align right, white-space nowrap |
| text-transform / letter-spacing | none / 0 | none / 0 |
| conditional | seed only | seed only, replaces Undo button |

## Sentence (`.se`)

| Property | Mobile | Desktop |
|---|---|---|
| margin | 5px 0 0 (margin-top 5px) | 0 |
| font-size | 12px | 12.5px |
| line-height | 1.5 | 1.5 |
| color | var(--fg-body) | var(--fg-body) |
| flex | — | 1 |
| lead figures (`b`) | font-weight 600; color var(--fg) | same |
| structure, normal | b "{placed} placed, {here} still here" + (colon clause: seed/top-off sentence) and/or (`.tl` after `·`: now yours / removed since) | same |
| structure, equal | b "all {n} still here" form of the lead (`{n} placed, all {n} still here`) | same |
| clause `.tl` | color var(--fg-locked) | color var(--fg-locked) |

## Show control (`.bt span.sw`, inside `.bt` row)

| Property | Mobile | Desktop |
|---|---|---|
| bt row | flex, gap 10px, margin-top 8px, align-items center | flex, margin 0, gap 10px, align-items center |
| sw display/align | inline-flex, align-items center | same |
| sw height | auto; min-height 44px | auto; min-height 0 |
| sw padding | 0 | 0 |
| sw border | 0 (no button border) | 0 |
| sw font | 11px 'IBM Plex Mono' | same |
| sw color | var(--fg-faint) (`.nw`: var(--accent)) | same |
| sw `u` | text-decoration none; border-bottom 1px dashed var(--border-strong) (`.nw`: var(--accent-shadow)) | same |
| conditional | rendered only when live > 0 | same |

## Undo button (`.ud span`)

| Property | Mobile | Desktop |
|---|---|---|
| ud container | margin-left auto; display flex | margin-left auto; width 126px; flex none; display flex; justify-content flex-end |
| button display | inline-flex, align-items center | same |
| height | 36px | 26px |
| padding | 0 12px | 0 12px |
| border | 1px solid var(--border-strong) | same |
| border-radius | 7px | 7px |
| font | 11px 'IBM Plex Mono' | same |
| color | var(--fg-body) | var(--fg-body) |
| pending (`.pend`) | color var(--fg-faint); border-color var(--border) | same |
| conditional | rendered only when live > 0; seed shows revert note instead on desktop (and `.rv` in the label row on mobile, no Undo) | same |

## Newest line variant (`.ll.nw`)

| Property | Mobile | Desktop |
|---|---|---|
| background | var(--elevated-hover) | var(--elevated-hover) |
| border-color | var(--accent-shadow) | var(--accent-shadow) |
| lb color | var(--accent) | var(--accent) |

## Fully undone line (`.ll.gone`, copy part `· undone` in `.tl`)

| Property | Mobile | Desktop |
|---|---|---|
| background | transparent | transparent |
| border | 1px dashed var(--border-strong) | 1px dashed var(--border-strong) |
| border-radius / padding / layout | as base | as base |
| lb color | var(--fg-locked) | var(--fg-locked) |
| se color | var(--fg-faint) | var(--fg-faint) |
| se b color | var(--fg-muted) (weight 600) | var(--fg-muted) (weight 600) |
| tl color | var(--fg-locked) | var(--fg-locked) |
| structure | label, "{placed} placed, none still here", `· undone` | same |
| Show / Undo / revert note | — | — |
| lifetime | stays until the pass leaves the deck's record (new version, Clear all auto) | same |

## Fully kept line (`.ll.gone`, copy part `· all {n} now yours`)

| Property | Mobile | Desktop |
|---|---|---|
| all visual properties | identical to Fully undone line | identical |
| structure | label, "{placed} placed, none still here", `· all {n} now yours` | same |
| Show / Undo | — | — |
