# Design Property Table — Deck notices: the tile (PR 5)

Scope: the deck tile's footer (HANDOFF §1a) and the notice tag as the tile draws it (HANDOFF §1, §1a).
Sources, all under `design/design_handoff_the99_deck_notices/`:

- **H§1** `HANDOFF.md` §1 "The notice" · **H§1a** §1a "The tile footer (r2)" · **H§8** §8
- **ST** `STATES-deck-notices.md` "Tile" and "Transitions"
- **CP** `deck-notices · copy strings.ts` (`tag.*`)
- **DT** `Deck Tile.dc.html` (inline styles and `renderVals`) · **CV** `The 99 - Deck Notices.dc.html` §1c
- **RA** `READINESS-audit.md`: rulings H5, H6 and findings F5, F6, F7, F14, F17 (F11 cited where it names the tile's read legality state). RA corrections override the handoff; the row value is the corrected one and the handoff/canvas value is in Notes.

Mobile = below 768px (`md`). Desktop = `md` and up. "mono" = IBM Plex Mono (the app's `--font-plex-mono`); the canvas writes the family literally. `—` = explicitly absent. Where a column is blank the source gives no value for that width.

Note on the canvas: DT draws every tile at the phone chip size (22px, mono 10) including the 1300 cells. H§1 and RA F6 give the `md` values; those win on Desktop.

## 1 · Tile box (context for the footer)

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 1 | Tile `article` | display / flex-direction | flex / column | flex / column | DT `box` | |
| 2 | Tile | overflow | hidden | hidden | DT | |
| 3 | Tile | border-radius | 14px | 14px | DT | |
| 4 | Tile | background | `var(--surface-inset)` | `var(--surface-inset)` | DT | The ground F17's contrast figures are measured on |
| 5 | Tile | border | 1px solid `var(--border)` | 1px solid `var(--border)` | DT | |
| 6 | Art band | height / flex | 248px / none | 248px / none | DT, H§1a | Unchanged by this PR |
| 7 | Tile total height | height | 248 + 92 = 340px | 248 + 94 = 342px | H§1a; **RA F6** | Handoff: 248 + 92 at every width. F6: the chips row is 24 from `md`, so the footer is 94 there |
| 8 | Tiles in a grid row | end level | yes | yes | H§1a; **RA F5** | Every tile on /decks the same height; in the <330 wrap band tiles still end level through `sm:h-full` (F5) |

## 2 · Footer container `[data-tile-footer]`

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 9 | Footer | display | flex | flex | DT | Replaces the `chip bar count` grid and its four grid-area maps (H§1a) |
| 10 | Footer | flex-direction | column | column | DT | |
| 11 | Footer | gap (row gap) | 9px | 9px | DT, H§1a | |
| 12 | Footer | height | 92px | 94px | H§1a; **RA F6** | Handoff/canvas: 92 at both widths (24 + 50 + 18). F6: 24px chips row from `md` makes it 94. **Built:** the content box (`clientHeight`); the tile's existing 1px rule above the footer is outside the handoff's arithmetic, so the border box is 93/95 |
| 13 | Footer | flex | 1 (takes a grid row's slack) | 1 | DT; **built** | Canvas: none. Built `flex-1` so tiles in a row end level (row 8), below the rows rather than between them |
| 14 | Footer | padding | 11px 13px 13px | 11px 13px 13px | DT, H§1a | top 11, sides 13, bottom 13 |
| 15 | Footer | border-top | 1px solid `var(--border)` | 1px solid `var(--border)` | DT | |
| 16 | Footer | rows | exactly three, fixed: chips, bar, detail | same | H§1a | Detail row always drawn |

## 3 · Row 1: chips row `[data-chip-row]`

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 17 | Chips row | display | flex | flex | DT | |
| 18 | Chips row | flex-wrap | nowrap (container ≥ 330px) | nowrap (container ≥ 330px) | H§1a, DT; **RA F5** | Handoff: "Never wraps." F5: below the tile's 330px container floor keep today's wrap (`flex-wrap: wrap`) |
| 19 | Chips row | align-items | center | center | DT | |
| 20 | Chips row | gap | 8px | 8px | DT, H§1a | |
| 21 | Chips row | height | 22px | 24px | **RA F6**; H§1a, DT | Handoff/canvas: 22 at both widths. F6: fixed at the chip's height at each width. Below 330 (wrap band, F5) the fixed height cannot hold; height follows the wrap |
| 22 | Chips row | flex | none | none | DT, H§1a | |
| 23 | Chips row | min-width | — | — | DT; **built** | Canvas: 0. Not needed: the row is a block child of a column; `probe:notices-tile` asserts no overflow by `scrollWidth` |
| 24 | Chips row | overflow | — | — | DT; **built** | Canvas: hidden. Not clipped: an overflow would be hidden rather than seen, and the probe measures it instead |
| 25 | Chips row | order of children | status pill · `BracketChip` · notice | same | H§1a, H§1 | Notice immediately after the chip; with no chip, in the chip's slot after the pill |
| 26 | Chips row | container query | `@container` on the tile, yield point by measurement | same | H§1a; **RA F6** | Handoff: `@container` at 366. F6: ~376 whole-row width; find the yield by measurement in `probe:bracket-chip`, not by a constant |

### 3a · Status pill (shipped `StatusPillBadge`, drawn in the row)

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 27 | Pill | display / align-items | flex / center | flex / center | DT `pill` | |
| 28 | Pill | height | 22px | 24px | DT; **RA F6** | Canvas 22 at both; row is fixed at 24 from `md` (F6). Pill is the shipped component |
| 29 | Pill | flex | none | none | DT | |
| 30 | Pill | border-radius | 6px | 6px | DT | |
| 31 | Pill | padding | 0 8px | 0 8px | DT | |
| 32 | Pill | font | mono 10.5px | mono 10.5px | DT | |
| 33 | Pill | letter-spacing | 0.06em | 0.06em | DT, H§1a | |
| 34 | Pill | color | `var(--fg-muted)` building (<99) · `var(--success)` complete | same | DT | Canvas's two statuses only; others are the shipped status styles |
| 35 | Pill | background | `color-mix(in srgb, var(<tok>) 18%, var(--bg))` | same | DT | |
| 36 | Pill | border | 1px solid `var(--border-strong)` | same | DT | |
| 37 | Pill | white-space | nowrap | nowrap | DT | |
| 38 | Pill | widest case | `Unresolved` ~85px | same | **RA F6** | Handoff counts 73 |

### 3b · Bracket chip (shipped `BracketChip`)

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 39 | Chip | display / align-items | inline-flex / center | inline-flex / center | DT `chipStyle` | |
| 40 | Chip | gap | 5px | 5px | DT | |
| 41 | Chip | flex | none | none | DT | |
| 42 | Chip | height | 22px | 24px | **RA F6**; DT | Canvas 22 at both; F6: 24 from `md` |
| 43 | Chip | font | mono 10px | mono 11px | **RA F6**; DT | Canvas 10 at both |
| 44 | Chip | padding (with name) | 0 8px 0 2px | 0 8px 0 2px | DT | |
| 45 | Chip | padding (marks only, yielded) | 0 2px | 0 2px | DT, H§1a | Home addendum form |
| 46 | Chip | border-radius | 6px | 6px | DT | |
| 47 | Chip | background | `color-mix(in srgb, var(--bracket-N) 12%, var(--bg))` | same | DT | |
| 48 | Chip | border | 1px solid `color-mix(in oklab, var(--bracket-N) 55%, transparent)` | same | DT | |
| 49 | Chip | color | `var(--bracket-N)` | same | DT | |
| 50 | Chip | white-space | nowrap | nowrap | DT | |
| 51 | Chip mark(s) | size | 22 × 22px, display block, flex none | 22 × 22px | DT | Canvas only; the shipped chip's own mark sizing applies |
| 52 | Chip, range high mark | opacity | 0.65 | 0.65 | DT | |
| 53 | Chip | `face` prop | `face={false}` in the yield | same | H§1a; RA F9 | `face` does not exist yet (F9) |
| 54 | Chip | widest name | `Exhibition or Core` ~174px | ~185px | **RA F6** | Handoff counts `Optimized or cEDH` at 168 |
| 55 | Chip | dot on the chip | — | — | H§1a | The notice is never on the chip |

### 3c · Notice tag, data face (condensed)

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 56 | Data tag | element role | presentation inside the tile's link (not a button) | same | H§1 "Target" | |
| 57 | Data tag | display / align-items | inline-flex / center | inline-flex / center | DT | |
| 58 | Data tag | gap | 5px | 5px | H§1a, DT | Page tag is 6 |
| 59 | Data tag | flex | none | none | DT | |
| 60 | Data tag | height | 22px | 24px | H§1; **RA F6** | Canvas 22 at both |
| 61 | Data tag | padding | 0 7px | 0 7px | H§1a, DT | Condensed; page tag is `0 9 0 8` / `0 8 0 7` |
| 62 | Data tag | border-radius | 6px | 6px | H§1, DT | |
| 63 | Data tag | background | — (no plate) | — | H§1 | |
| 64 | Data tag | border | 1px solid `color-mix(in oklab, var(--fact) 55%, transparent)` | same | H§1, DT | |
| 65 | Data tag | font | mono 10px | mono 11px | H§1 | Canvas 10 at both |
| 66 | Data tag | color | `var(--fact)` | same | H§1, DT | |
| 67 | Data tag | white-space | nowrap | nowrap | DT | |
| 68 | Data tag | text | `{n}` (count only, e.g. `3`) | same | H§1a, ST | Not `tag.count`; the words go to the link's name |
| 69 | Data dot | size | 6 × 6px | 6 × 6px | H§1, DT | |
| 70 | Data dot | border-radius | 50% | 50% | DT | |
| 71 | Data dot | background | `var(--fact)` | same | H§1, DT | |
| 72 | Data dot | flex | none | none | DT | |
| 73 | Data tag, read | rendering | — (nothing drawn on the tile) | — | H§1 "Read (data)", ST, CV | The quiet read form is page only |

### 3d · Notice tag, legality face

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 74 | Legal tag | element role | presentation inside the tile's link | same | H§1 | |
| 75 | Legal tag | display / align-items | inline-flex / center | inline-flex / center | DT | |
| 76 | Legal tag | gap | 6px | 6px | H§1, DT | |
| 77 | Legal tag | flex | none | none | DT | |
| 78 | Legal tag | height | 22px | 24px | H§1; **RA F6** | Canvas 22 at both |
| 79 | Legal tag | padding | 0 8px 0 7px | 0 9px 0 8px | H§1, DT | Canvas `0 8 0 7` at both |
| 80 | Legal tag | border-radius | 6px | 6px | H§1, DT | |
| 81 | Legal tag | border | 1px solid `color-mix(in oklab, var(--danger) 70%, transparent)` | same | H§1, DT; **RA H5** | H5: red on the border |
| 82 | Legal tag | background | red tint (the `Over` pill's treatment) | same | **RA H5**, F17 | Handoff: no plate. H5: "red on the border and tint only", same as `Over`. Tint value not given in the design files; match the shipped `Over` pill |
| 83 | Legal tag | color (text) | `var(--fg)` | `var(--fg)` | **RA H5**, F17 | Handoff/canvas: `var(--danger)`, which reads 3.85–4.21:1 on `--surface-inset` (F17). Must clear 4.5:1 |
| 84 | Legal tag | font | mono 10px | mono 11px | H§1 | Canvas 10 at both |
| 85 | Legal tag | white-space | nowrap | nowrap | DT | |
| 86 | Legal tag | text | `Not legal` (`tag.notLegal`) | same | CP, H§1a | Not condensed |
| 87 | Legal dot (unread) | size / radius / flex | 6 × 6px / 50% / none | same | H§1, DT | |
| 88 | Legal dot (unread) | background | `var(--danger)` | same | H§1, DT; RA H5 | H5 limits red to border and tint for TEXT contrast; the dot is not text. Canvas and handoff draw it `--danger` |
| 89 | Legal tag, read | dot | — | — | **RA F14**; ST Transitions; RA F11 | Undrawn in the canvas; derived: same tag, same ink, no dot. Needs the `notLegalUnread \| notLegalRead` payload (F11) |
| 90 | Tag count | how many | one tag max; legality wins over data | same | H§1 "Legality face", H§8.4 | Never two tags |
| 91 | Contrast | test pairs | tag ink on `--surface-inset`, each theme, ≥ 4.5:1 | same | **RA F17**, H5 | Add the pairs to the contrast tests with measured figures |

## 4 · Row 2: bar row `[data-bar-row]`

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 92 | Bar row | display / align-items | flex / center | flex / center | DT | |
| 93 | Bar row | gap | 10px | 10px | DT | |
| 94 | Bar row | height | 14px | 14px | DT, H§1a | |
| 95 | Bar row | flex | none | none | DT, H§1a | On its own line at every width |
| 96 | Track | position | relative | relative | DT | |
| 97 | Track | flex / min-width | 1 / 0 | 1 / 0 | DT, H§1a | Same length on every tile in a column |
| 98 | Track | height | 3px | 3px | DT | |
| 99 | Track | border-radius | 999px | 999px | DT | |
| 100 | Track | background | `var(--border)` | same | DT | |
| 101 | Fill | position / inset | absolute; left 0, top 0, bottom 0 | same | DT | |
| 102 | Fill | width | `round(built / 99 × 100)%` | same | DT | |
| 103 | Fill | border-radius | 999px | 999px | DT | |
| 104 | Fill | background | `var(--fg-muted)` below 99 · `var(--success)` at 99 | same | DT | |
| 105 | Count | flex | none | none | DT | |
| 106 | Count | width | 60px | 60px | **RA F7** | Handoff/canvas: fixed 52px. F7: size to `100 / 99` at 12.5px (60px) so `102 / 99` fits |
| 107 | Count | text-align | right | right | DT, H§1a | |
| 108 | Count | font | mono 12px | mono 12px | DT | F7 sizes the slot at 12.5px |
| 109 | Count | font-variant-numeric | tabular-nums | tabular-nums | DT, H§1a | |
| 110 | Count | color | `var(--fg)` | same | DT | |
| 111 | Count | text | `{built} / 99` | same | DT | |

## 5 · Row 3: detail row `[data-detail-row]`

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 112 | Detail row | display / align-items | flex / center | flex / center | DT | |
| 113 | Detail row | gap | 10px | 10px | DT | |
| 114 | Detail row | height | 14px | 14px | DT, H§1a | |
| 115 | Detail row | flex / min-width | none / 0 | none / 0 | DT | |
| 116 | Detail row | rendered | always, empty when neither figure exists | same | H§1a, CV | Replaces the phone/desktop split |
| 117 | Detail figure | position | left | left | H§1a | |
| 118 | Detail figure | min-width / overflow | 0 / hidden | same | DT | |
| 119 | Detail figure | text-overflow / white-space | ellipsis / nowrap | same | DT, H§1a | Truncates |
| 120 | Detail figure | font | mono 10.5px | mono 10.5px | DT | |
| 121 | Detail figure | color | `var(--fg-faint)` | same | DT | |
| 122 | Last played | margin-left | auto | auto | DT | Right-aligned |
| 123 | Last played | flex / white-space | none / nowrap | same | DT | |
| 124 | Last played | font | mono 10.5px | mono 10.5px | DT | |
| 125 | Last played | color | `var(--fg-faint)` | same | DT | |
| 126 | Last played | rendered on phone | yes | yes | H§1a; **RA H6** | Shipped code draws it desktop only; H6 accepts the handoff's both-widths form |

## 6 · Yield and narrow widths

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 127 | Range chip | drops its name (marks + plate kept, padding 0 2) | only when range chip + `Not legal` and the row cannot hold them whole | same | H§1a, DT; **RA F6** | Handoff/canvas: container < 366px. F6: ~376 by arithmetic; set by measurement at 1300, 1000 and 390 |
| 128 | Range chip + data notice | yield | marks only, container 330–358px | marks only, container 330–358px | CV §1c, H§1a; **RA F6, measured** | Handoff: "only range + Not legal reaches it". Measured: a range beside `● 99` needs 354.3px from `md`, so it yields in its own narrower window |
| 129 | Single-name chip + tag | yield | — | — | H§1a | Only a range yields |
| 130 | Tile container < 330px | every range | name kept; the chips row wraps | name kept; the row wraps | H§1a; **RA F5** | Handoff: marks only. F5: "keep today's wrap below the tile's 330px container floor" |
| 131 | Tile container < 330px | chips row | wraps (today's behaviour) | wraps | **RA F5** | Pill + one chip already overflows a 161–183px content box before any tag |
| 132 | Phone cell | width | 358px | | CV §1c | 1300 cells drawn at 340; F6: classes give ~389 |

## 7 · Accessibility

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 133 | Tile link | accessible name, unread data | includes `tag.aria.unread(n)`: `{n} notices since this deck was analyzed.` / `1 notice since…` | same | H§1a, CP | CP strings end `Open notices`; on the tile the press opens the deck, not the sheet. Flag the suffix for the tile |
| 134 | Tile link | accessible name, legality | includes `tag.aria.notLegal(n)`: `{n} cards not legal in this deck.` / `1 card…` | same | CP | Same `Open notices` caveat |
| 135 | Tile link | accessible name, legality read | `tag.aria.notLegal(n)` (no read variant exists for legality) | same | CP; RA F11, F14 | |
| 136 | Tile link | accessible name, no notice / data read | no notice words | same | ST, H§1 | Tag not drawn |
| 137 | Tags on tile | interactive | — (no button, no own hit area) | — | H§1 "Target" | Header's 44px `after:` inset is page only |
| 138 | Dot | text alternative | — (decorative; words in the link name) | — | H§1a | |

## State coverage

| State | Triggering condition | What renders | Key props |
|---|---|---|---|
| No notice | no entries, or analyzed with nothing standing | pill · chip (if analyzed); no tag; bar; detail | footer 92 / 94 (F6) |
| No analysis, no legality | never analyzed, no legality entry | pill alone in chips row | CV `noAnalysis` |
| Data unread | `notice: "unread"` | pill · chip · `● {n}` | `--fact`, padding 0 7, gap 5, mono 10 / 11 |
| Data read | data entries opened | nothing on the tile | ST Transitions: "gone from the tile" |
| Legality unread | any legality entry, unread | pill · chip · `● Not legal` (or pill · `● Not legal` with no chip) | text `--fg`, border `--danger` 70%, red tint (H5) |
| Legality read | legality entry, notices opened | pill · chip · `Not legal`, no dot | derived (F14); `notLegalRead` payload (F11) |
| Legality + data | both kinds standing | legality face only | one tag, the more serious wins (H§1) |
| No bracket chip + legality | no analysis, legality entry | pill · `Not legal` in the chip's slot | H§1, CV `legalNoChip`; 358 form derived (F14) |
| Range chip + data notice | range reading, data unread | chip whole above 358px container; marks only at 330–358; `● {n}` | measured yield (row 128) |
| Range chip + Not legal, row fits | range + legality, container ≥ measured yield point | chip whole + `Not legal` | F6 |
| Range chip + Not legal, row full | range + legality, container < measured yield point (~366–376) | chip marks + plate, no name (padding 0 2) · `Not legal` | `BracketChip face={false}` |
| Below the 330 band floor | tile container < 330px (sm three-up at 640–~1000) | today's wrap, range keeps its name (F5) | H§1a, F5; tiles still end level (`sm:h-full`) |
| `Over` deck count | built > 99 (e.g. `102 / 99`) | count fits a 60px slot | F7 |
