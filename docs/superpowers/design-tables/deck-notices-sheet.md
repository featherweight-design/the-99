# Design Property Table — Deck notices: the Notices sheet and the deck header's tag

Scope: the notice tag in the deck header's chips row (HANDOFF §1, header only; the tile is
`deck-notices-tile.md`) and the Notices sheet (HANDOFF §2–§5, §8). Sources, all under
`design/design_handoff_the99_deck_notices/`:

- **H§n** `HANDOFF.md` §1 (`:14-31`), §2 (`:57-91`), §3 (`:93-101`), §4 (`:103-109`), §5 (`:111-124`), §8 (`:145-150`)
- **R** `READINESS.md` (Design's own) · **ST** `STATES-deck-notices.md`
- **CP** `deck-notices · copy strings.ts` (key and slots only; wording is `/copy-review`'s)
- **NS** `Notices Sheet.dc.html` · **P13** `Deck Page 1300.dc.html` · **P39** `Deck Page 390.dc.html` ·
  **CV** `The 99 - Deck Notices.dc.html` (the canvas that mounts them)
- **RA** `READINESS-audit.md`: Hugh's rulings H1–H6 (`:12-25`) and findings F1–F18 (`:117-136`). RA corrections
  override the handoff and the canvases; the row value is the corrected one, and the handoff/canvas value is in Notes.

Mobile = 390 (below `md`, 768px). Desktop = 1300 (`md` and up). "mono" = IBM Plex Mono (the app's
`--font-plex-mono`); "sans" = IBM Plex Sans (the app's body face); "display" = the canvas's `var(--display)`, which
the app draws with the `font-display` class (RA `:103`). The canvases write mono and sans literally. `—` = explicitly
absent in the design. A blank cell = the source gives no value at that width. `same` = identical to Mobile.

---

## A · Header notice tag `DeckNotice` (spine-desktop / spine-mobile chips row)

### A1 · Chips row (context) — P13 `:48`, P39 `:50`, H§1 `:16-18`

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 1 | Chips row `[data-spine-chips]` | display / wrap | flex / wrap | flex / wrap | P13:48, P39:50 | |
| 2 | Chips row | align-items | center | center | P13:48, P39:50 | |
| 3 | Chips row | gap | 8px | 8px | P13:48, P39:50 | |
| 4 | Chips row | margin-top | 0 (column `gap:6px` above it) | 8px | P13:48, P39:44 | |
| 5 | Chips row | order of children | status pill · bracket chip · notice | same | H§1:16-17 | With no chip the tag takes the chip's slot after the pill |
| 6 | Chips row | line count | 1 line (must not wrap once the tag joins) | | **RA F18** | Row is `flex-wrap` and the art ramp counts one line (`labelAtPx` keyed to 143). Worst case ~355px vs 354px band |
| 7 | Bracket chip (range) | yield at 390 | `BracketChip face={false}`: drops its name, keeps plate and both marks, padding `0 2` | — | **RA F18**, F9, H§1a:49-51 | F18 applies the tile's one yield to the phone header when the row cannot hold the tag whole. `BracketChip` already takes `face` (the Home resume row's marks-only form); the header passes it through `SpineBracketChip` |
| 8 | Tag | count per surface | exactly one | exactly one | H§1:16, H§8:150 | Never also in the bracket box; never two tags (H§1:26) |

### A2 · Tag box (shared by every face) — P13 `:54-60`, P39 `:56-62`, H§1 `:20-28`

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 9 | Tag | display | inline-flex | inline-flex | P13:54, P39:56 | |
| 10 | Tag | align-items | center | center | same | |
| 11 | Tag | flex | none | none | same | |
| 12 | Tag | height | 22px | 24px | H§1:22, P13:54, P39:56 | The chip's heights |
| 13 | Tag | border-radius | 6px | 6px | H§1:22 | |
| 14 | Tag | white-space | nowrap | nowrap | P13:54, P39:56 | |
| 15 | Tag | font-family | mono | mono | H§1:24 | |
| 16 | Tag | font-size | 10px | 11px | H§1:24, P13:54, P39:56 | |
| 17 | Tag | font-weight / letter-spacing / transform / line-height | — (not specified) | — | | Canvases set none |
| 18 | Tag | cursor | | pointer | P13:54,57,60 | 390 canvas sets none |
| 19 | Tag | element | `<button>` | `<button>` | H§1:28 | Opens Notices |
| 20 | Tag | hit area | 44px, by the chip's `after:` inset method | same | H§1:28, CV:54 | Shipped method at `bracket-chip.tsx:80` (RA `:85`) |
| 21 | Tag | aria-label | `tag.aria.unread(n)` / `tag.aria.read(n)` / `tag.aria.notLegal(n)` | same | CP:9-13 | Slot `n` = entry count (data) or card count (legality) |

### A3 · Data face, unread (`● 3 notices`) — P13 `:54`, P39 `:56`, H§1 `:23-25`

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 22 | Data tag | text | `tag.count(n)` | same | CP:7 | Slot `n`; `1 notice` singular inside the key |
| 23 | Data tag | color | `var(--fact)` | `var(--fact)` | H§1:25, P13:54, P39:56 | |
| 24 | Data tag | border | 1px solid `color-mix(in oklab, var(--fact) 55%, transparent)` | same | H§1:23 | |
| 25 | Data tag | background | `var(--bg)` | — (no plate) | H§1:23, P39:56, P13:54 | Phone: sits on the art band, takes `--bg` as the pill does |
| 26 | Data tag | padding | 0 8px 0 7px | 0 9px 0 8px | H§1:24 | |
| 27 | Data tag | gap (dot → text) | 6px | 6px | H§1:24 | |
| 28 | Dot | size | 6×6px | 6×6px | H§1:24 | |
| 29 | Dot | border-radius | 50% | 50% | P13:54 | |
| 30 | Dot | background | `var(--fact)` | same | P13:54, P39:56 | |
| 31 | Dot | flex | none | none | same | |

### A4 · Data face, read (`3 notices`, quiet) — P13 `:57`, P39 `:59`, H§1 `:27`

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 32 | Read tag | text | `tag.count(n)` | same | CP:7 | |
| 33 | Read tag | dot | — | — | H§1:27 | |
| 34 | Read tag | color | `var(--fg-locked)` | same | H§1:27 | Reads 3.23–3.49:1 on `--bg` (RA F17) |
| 35 | Read tag | border | 1px solid `var(--border)` | same | H§1:27, P13:57, P39:59 | |
| 36 | Read tag | background | `var(--bg)` | — (no plate) | P39:59, P13:57 | |
| 37 | Read tag | padding | 0 8px | 0 9px | P13:57, P39:59 | Symmetric (no dot) |
| 38 | Read tag | gap | — | — | P13:57 | |
| 39 | Read tag | still opens Notices | yes | yes | CV:163, CV:254 | Page only; the tile draws nothing |

### A5 · Legality face (`● Not legal`) — P13 `:60`, P39 `:62`, H§1 `:26`, RA H5/F14/F17

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 40 | Legal tag | text | `tag.notLegal` | same | CP:8 | |
| 41 | Legal tag | precedence | wins over data whenever any legality entry stands | same | H§1:26 | Never two tags |
| 42 | Legal tag | color (text) | `var(--fg)` | `var(--fg)` | **RA H5** | Handoff/canvas: `var(--danger)` (H§1:26, P13:60, P39:62). H5: must clear 4.5:1 |
| 43 | Legal tag | border | 1px solid `color-mix(in oklab, var(--danger) 70%, transparent)` | same | H§1:23, P13:60, P39:62; RA H5 | H5 keeps red on the border |
| 44 | Legal tag | background | red tint, the `Over` pill's treatment | same | **RA H5** | Handoff: no plate (desktop), `--bg` (phone, P39:62). Tint value not given in design files; match the shipped `Over` pill |
| 45 | Legal tag | padding | 0 8px 0 7px | 0 9px 0 8px | H§1:24, P13:60, P39:62 | |
| 46 | Legal tag | gap | 6px | 6px | P13:60, P39:62 | |
| 47 | Legal dot (unread) | size / radius / flex | 6×6 / 50% / none | same | P13:60 | |
| 48 | Legal dot | background | `var(--danger)` | same | P13:60, P39:62 | Not text; H5 does not move it |
| 49 | Legal tag, read | dot | — | — | H§3:98, **RA F14** | Undrawn; F14: derive as the tag with no dot, same ink |
| 50 | Legal tag, read | face | stays `Not legal` | same | H§3:98 | |
| 51 | Legal tag | chip-less placement | in the chip's slot after the pill | same | H§1:30-31, CV:56 | A never-analyzed deck can carry only legality |
| 52 | Legal tag | contrast test | tag ink on `--bg`, every theme, ≥ 4.5:1 | same | **RA F17**, H5 | Canvas `--danger` on `--bg` reads 4.19–4.40:1 |

### A6 · Tag hover / focus / press — H§1 `:28`

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 53 | Tag :hover | any property | — (not specified) | — (not specified) | | Only `cursor:pointer` at 1300 |
| 54 | Tag :focus-visible | any property | — (not specified) | — (not specified) | | |
| 55 | Tag press | action | opens Notices (ModalChrome) | same | H§1:28 | Not the Analysis tab; that is the chip's press |
| 56 | Tag press | side effect | marks every data entry read; legality dot off | same | H§3:97-98, ST:39 | Stacked card does not change the read (R eng 3) |

---

## B · Notices sheet `NoticesBody` in `ModalChrome`

### B1 · Scrim and placement — CV `:119, :125, :129`, H§2 `:59-61`

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 57 | Scrim | background | `color-mix(in oklab, var(--bg) 72%, transparent)` | same | CV:125, CV:129 | ModalChrome's own |
| 58 | Sheet | position | sheet from top 52px, bottom 0, full width | centered | H§2:60, CV:125, CV:129 | "as every body" |
| 59 | Sheet | mark | — | — | H§2:59 | No `mark` prop |
| 60 | Sheet | `backLabel` | defaults to the title | same | H§2:60, CV:106 | A card opened from it reads `← Notices` |

### B2 · Sheet box — NS `:30, :133-135`

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 61 | Box | role / aria-label | dialog / `Notices` | same | NS:30 | |
| 62 | Box | width | 390px (full) | 560px | NS:134-135, H§2:59 | |
| 63 | Box | display / direction | flex / column | same | NS:134-135 | |
| 64 | Box | background | `var(--surface-raised)` | same | NS:134-135 | |
| 65 | Box | border | top only, 1px solid `var(--border-strong)` | 1px solid `var(--border-strong)` | NS:134-135 | |
| 66 | Box | border-radius | 14px 14px 0 0 | 14px | NS:134-135 | |
| 67 | Box | box-shadow | — | 0 24px 60px rgba(0,0,0,0.45) | NS:134-135 | |
| 68 | Box | font-family / color | sans / `var(--fg)` | same | NS:134-135 | |
| 69 | Box | overflow | hidden | hidden | NS:134-135 | |

### B3 · Header — NS `:31-35, :136-138`

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 70 | Head | display / align | flex / center | same | NS:137-138 | |
| 71 | Head | height | 43px | 52px | NS:137-138, H§2:60 | |
| 72 | Head | padding | 0 16px | 0 18px | NS:137-138 | |
| 73 | Head | gap | 9px | 10px | NS:137-138 | |
| 74 | Head | border-bottom | 1px solid `var(--border)` | same | NS:137-138 | |
| 75 | Head | flex | none | none | NS:137-138 | |
| 76 | Title `h2` | text | `sheet.title` | same | CP:16 | |
| 77 | Title | font-family | display | display | NS:32 | |
| 78 | Title | font-weight | 700 | 700 | NS:32 | |
| 79 | Title | font-size / line-height | 16px / 1.2 | same | NS:32 | |
| 80 | Title | color | `var(--fg)` | same | NS:32 | |
| 81 | Title | white-space / min-width / margin | nowrap / 0 / 0 | same | NS:32 | |
| 82 | Aside | text (analyzed) | `sheet.since(date)` | same | CP:17, H§2:59 | Slot `date` |
| 83 | Aside | text (never analyzed) | the deck's name | same | H§2:60, NS:117 | |
| 84 | Aside | date format | `formatShortDeckDate` (`21 Sep`) | same | **RA F10** | Handoff: `21 Sept`, "formatDeckDate's form" (H§2:81) |
| 85 | Aside | date source | the last PRESS, not the quiet rebuild | same | **RA F4** | Keep `computed_at` on a `rebuildOf` write, or an `analyzed_at` only a press moves |
| 86 | Aside | font-family / size | mono / 12px | same | NS:33 | |
| 87 | Aside | color | `var(--fg-faint)` | same | NS:33 | |
| 88 | Aside | overflow | hidden, ellipsis, nowrap, min-width 0 | same | NS:33 | |
| 89 | Close `×` | box | 44×44px, flex center, flex none | same | NS:34 | |
| 90 | Close | margin | left auto, right −10px | same | NS:34 | |
| 91 | Close | font / size / color | mono / 14px / `var(--fg-faint)` | same | NS:34 | |
| 92 | Close | aria-label | `sheet.closeAria` | same | CP:18 | |

### B4 · Group section — NS `:39-43, :124-129`, H§2 `:63-71`

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 93 | Groups list | display / direction | flex / column | same | NS:37 | |
| 94 | Group | order | 1 Not legal in Commander · 2 Outside the commander's colors · 3–6 bracket findings · 7 Bracket rules | same | H§2:63-68 | Absent when empty |
| 95 | Group 3–6 | order and labels | `FINDING_ORDER` and `deckAnalysisCopy.findings.labels` | same | **RA F8** | Handoff/canvas: Game changers · Two-card combos · Mass land denial · Extra turns (NS:94-97). Shipped: Game changers · Mass land denial · Extra turns · Two-card infinites |
| 96 | Group | `data-group` | `not-legal` / `outside-colors` / `game-changers` / `combos` / `mass-land-denial` / `extra-turns` / `rules` | same | NS:92-98 | |
| 97 | Group | display / direction / gap | flex / column / 4px | same | NS:127 | |
| 98 | Group | padding | 12px 16px 10px | 14px 18px 12px | NS:127, H§2:70-71 | |
| 99 | Group | border-top | 1px solid `var(--border)` (not on the first group) | same | NS:127 | |
| 100 | Group head row | display / align / gap | flex / center / 8px | same | NS:40 | |
| 101 | Group head row | min-height | 20px | same | NS:40 | |
| 102 | Group glyph | size | 16×16px | same | NS:41, H§2:66 | |
| 103 | Group glyph | ink | `var(--fact)` | same | H§2:67 | Drawn through `FindingMark` in code (RA `:110`) |
| 104 | Group glyph | presence | groups 3–6 only; — on legality and rules | same | H§2:65-68, NS:92-98 | |
| 105 | Group label `h3` | text | `sheet.groups.notLegal` / `sheet.groups.outsideColors` / `findings.labels[kind]` / `sheet.groups.rules` | same | CP:19-24 | |
| 106 | Group label | font-family / weight | mono / 400 | same | NS:128 | |
| 107 | Group label | font-size | 10px | same | NS:128, H§2:70 | |
| 108 | Group label | letter-spacing | 0.16em | same | NS:128 | |
| 109 | Group label | text-transform | uppercase | same | NS:128 | |
| 110 | Group label | color (legality groups) | `var(--danger)` | same | NS:128, H§2:65 | |
| 111 | Group label | color (other groups) | `var(--fg-faint)` | same | NS:128 | |
| 112 | Group label | margin | 0 | 0 | NS:128 | |
| 113 | Rows list `ul` | layout | flex column, no list style, margin/padding 0 | same | NS:44 | |

### B5 · Entry row — NS `:46-58, :121-122`, H§2 `:73-82`

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 114 | Row `li` | display / align | flex / flex-start | same | NS:121 | |
| 115 | Row | gap | 10px | 12px | NS:121 | |
| 116 | Row | padding | 7px 0 | 7px 0 | NS:121, H§2:73 | |
| 117 | Row | min-height | 36px | 36px | NS:121, H§2:73 | NS:139 returns an unused grid `rowStyle` (8px 0, min-height 44); the drawn rows use :121 |
| 118 | Direction | text | `sheet.dir.added` / `.removed` (card kinds), `.moved` (rules) | same | CP:25, H§2:74-75 | |
| 119 | Direction | presence | — on legality rows (display none) | same | NS:122, H§2:75, H§4:109 | |
| 120 | Direction | width / flex | 56px / none | 64px / none | NS:122, H§2:74 | |
| 121 | Direction | font / size / line-height | mono / 10.5px / 20px | same | NS:122 | |
| 122 | Direction | color | `var(--fg-muted)` | same | NS:122 | Never `--success` / `--warning`, never + / − (H§2:75-76, H§8:147) |
| 123 | Body | layout | flex 1, column, gap 2px, min-width 0 | same | NS:48 | |
| 124 | Date | text | `formatShortDeckDate` of the publish day | same | H§2:81, **RA F10** | Canvas `21 Sept` |
| 125 | Date | presence | data and rules entries only; — on legality | same | H§2:82, H§4:109, NS:88 | |
| 126 | Date | font / size / line-height | mono / 10.5px / 20px | same | NS:58 | |
| 127 | Date | color | `var(--fg-faint)` | same | NS:58 | |
| 128 | Date | align / wrap / flex | right / nowrap / none | same | NS:58 | |

### B6 · Entry body variants — NS `:49-56, :86-89`, H§2 `:77-80`, H§4

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 129 | Card names line | font-size / line-height | 13.5px / 20px | same | NS:54 | |
| 130 | Card names line | color (joiner ` + `) | `var(--fg-faint)` | same | NS:54, H§2:78 | |
| 131 | Card name | element | `CardDetailTrigger`, stacks `CardModal` on the sheet | same | H§2:77-78 | |
| 132 | Card name | font-weight / color | 600 / `var(--fg)` | same | NS:54 | |
| 133 | Card name | underline | border-bottom 1px dotted `var(--accent)` | same | NS:54 | |
| 134 | Card name | cursor | pointer | pointer | NS:54 | |
| 135 | Combo tail | text | `sheet.combo(result)` | same | CP:26, H§2:79 | Slot `result` = `produces`, snapshotted at diff time (**RA F16**) |
| 136 | Tail line | layout | flex, center, gap 6px | same | NS:55 | Shared by combo and legality tails |
| 137 | Tail line | font-size / line-height | 12.5px / 1.5 | same | NS:55, H§2:79 | |
| 138 | Tail line | color | `var(--fg-muted)` | same | NS:55 | |
| 139 | Rule name | text | the rule's name | same | H§2:79 | Rules entry lists no cards |
| 140 | Rule name | font-size / line-height / weight | 13.5px / 20px / 600 | same | NS:50 | |
| 141 | Rule name | color | `var(--fg)` | same | NS:50 | |
| 142 | Rule says | font-size / line-height | 13px / 1.5 | same | NS:51 | |
| 143 | Rule says | color / wrap | `var(--fg-body)` / pretty | same | NS:51 | |
| 144 | Legality reason (not legal) | text | `sheet.legal.notLegal` (or `sheet.legal.banned` if `legalities.commander` kept) | same | CP:28-29, H§4:105-106 | RA §5: ship `notLegal` from the boolean |
| 145 | Legality reason (outside) | text | `sheet.legal.outside(colors, commander, identity)` | same | CP:30-31, H§4:107-108 | A pair uses both names |
| 146 | Legality pips | presence | one per offending color, before the words; outside-colors rows only | same | H§4:107, NS:103 | |
| 147 | Legality pip | size / radius | 10×10px / 2px | same | NS:86, H§4:107 | |
| 148 | Legality pip | fill | `var(--w)` · `var(--u)` · `var(--b)` · `var(--r)` · `var(--g)` | same | NS:86 | |
| 149 | Legality pip | box-shadow | inset 0 0 0 1px rgba(0,0,0,0.4) | same | NS:86 | |
| 150 | Legality row | remove action | — | — | H§4:109 | A notice never edits and never blocks an edit |

### B7 · Legality foot line (inside the groups) — NS `:62, :112, :123-126`

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 151 | Legality foot | text | `sheet.legal.foot` | same | CP:32 | |
| 152 | Legality foot | presence | under the LAST legality group, whenever any legality group is drawn | same | NS:123,126; CV:174 | H§2:90-91 lists it under the no-analysis case only; NS and CV draw it in `legalChip` and `all` too |
| 153 | Legality foot | margin | 2px 0 0 | same | NS:62 | |
| 154 | Legality foot | font / size / line-height | mono / 10.5px / 1.5 | same | NS:62 | |
| 155 | Legality foot | color | `var(--fg-faint)` | same | NS:62 | |

### B8 · Foot — NS `:67-78, :140-144`, H§2 `:84-91`, RA H2/F2/F3

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 156 | Foot | display / wrap / align | flex / wrap / center | same | NS:141 | |
| 157 | Foot | gap | 12px | 16px | NS:141 | |
| 158 | Foot | padding | 14px 16px 22px | 14px 18px 16px | NS:141 | |
| 159 | Foot | border-top | 1px solid `var(--border)` | same | NS:141, H§2:84 | |
| 160 | Foot | background | `var(--surface-rail)` | same | NS:141, H§2:84 | |
| 161 | Foot sentence (holds) | text | `sheet.foot.holds` | same | CP:35 | |
| 162 | Foot sentence (holds) | flex | 1 1 220px, min-width 0 | same | NS:69 | |
| 163 | Foot sentence (dirty) | text | `sheet.foot.dirty` | same | CP:36-37 | |
| 164 | Foot sentence (dirty) | flex | 1 1 260px, min-width 0 | same | NS:75 | |
| 165 | Foot sentence | font-size / line-height | 13px / 1.55 | same | NS:69,75 | |
| 166 | Foot sentence | color / wrap / margin | `var(--fg-muted)` / pretty / 0 | same | NS:69,75 | |
| 167 | Re-analyze button | text | `banner.reanalyze` (reused) | same | CP:2 | |
| 168 | Re-analyze | style | outlined | outlined | H§2:86 | |
| 169 | Re-analyze | display | flex, center, justify center | inline-flex, center | NS:143-144 | |
| 170 | Re-analyze | width | 100% | auto, flex none | NS:143-144 | |
| 171 | Re-analyze | min-height | 44px | 36px | NS:143-144, H§2:86 | |
| 172 | Re-analyze | padding | — (full width) | 0 16px | NS:143-144 | |
| 173 | Re-analyze | border / radius | 1px solid `var(--border-strong)` / 8px | same | NS:143-144 | |
| 174 | Re-analyze | color / background | `var(--fg)` / none | same | NS:143-144 | |
| 175 | Re-analyze | font-weight / size | 500 / 14px | 500 / 13px | NS:143-144 | |
| 176 | Re-analyze | press effect | recomputes when the data changed since the analysis, even on an unedited list; bracket only, advances the mark | same | **RA H1**, F1, H4, R eng 4 | Unedited deck with no data change returns the stored reading |
| 177 | Re-analyze | credit note beside it | — when the list is unchanged and the overview current | same | H§2:86-87 | |
| 178 | Foot note slot | presence | drawn when the press would spend a credit, when credits are used up, or when a legality entry stands | same | **RA F3** | Undrawn in NS. H4: a notice-driven re-analysis updates the bracket only; the saved overview stands, marked possibly out of date |
| 179 | Foot note slot | placement | centered under the button | sentence · note · button, right-aligned | **RA F3** | CREDITS' banner placement |
| 180 | Foot note slot (legality) | text | `check.note`, WITHOUT `check.seeWhich` | same | **RA F3**, CP:42 | *See which →* would open the sheet it sits in |
| 181 | Analysis tab link (dirty) | text | `sheet.foot.toTab` + `→` | same | CP:38, NS:76 | |
| 182 | Analysis tab link | display / align / gap | inline-flex / center / 8px | same | NS:76 | |
| 183 | Analysis tab link | min-height | 44px | 44px | NS:76 | |
| 184 | Analysis tab link | font / size | mono / 11px | same | NS:76 | |
| 185 | Analysis tab link | color | `var(--accent)` | same | NS:76 | |
| 186 | Analysis tab link | underline | border-bottom 1px dotted `var(--accent)` on the words only; arrow bare | same | NS:76 | |
| 187 | Analysis tab link | flex | none | none | NS:76 | |
| 188 | Analysis tab link | press | closes the sheet onto the Analysis tab (the banner) | same | H§2:88-89 | No second Re-analyze while the banner is up (H§8:148) |

### B9 · Hover and focus (sheet)

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 189 | Links (`a`) :hover | color | `var(--accent-hover)` | same | NS:27 | Canvas global rule; applies to the Analysis tab link if drawn as `a` |
| 190 | Card name :hover | any property | — (not specified) | — | | Inherits `CardDetailTrigger` |
| 191 | Re-analyze :hover / :focus-visible | any property | — (not specified) | — | | |
| 192 | Close :hover / :focus-visible | any property | — (not specified) | — | | |
| 193 | Sheet | focus / Escape | ModalChrome's own | same | H§2:59 | Nothing new specified |

### B10 · Foot busy and failed (undrawn; RA F2)

| # | Element | Property | Mobile | Desktop | Source | Notes |
|---|---|---|---|---|---|---|
| 194 | Re-analyze, busy | form | busy in place on its own button (the banner's pattern) | same | **RA F2** | The Analysis tab's dirty banner must NOT appear for a foot press on a fresh reading |
| 195 | Foot, failed | sentence | becomes a failure line with *Try again* | same | **RA F2** | Failure line to `/copy-review`; no key in CP yet |
| 196 | Sheet, failed | stays open | yes | yes | **RA F2** | |

---

## C · State coverage

### C1 · Sheet

| State | Trigger | What renders | Key props |
|---|---|---|---|
| Groups: any subset of seven | entries of that kind exist | only non-empty groups, in B4 order; first group no border-top | NS `groups`; H§2:63 |
| Groups: none | no entries (all cleared) | — sheet not reachable: the tag is gone | ST:9-10 |
| Never analyzed, legality only (`legalNoChip`) | no analysis + ≥1 legality entry | aside = deck name; legality groups + legality foot line; **no foot** | NS:117; H§2:90; ST:35 |
| Analyzed, legality + data (`legalChip`, `all`) | analysis + legality + data entries | since-aside; legality groups first with legality foot line; data groups; Re-analyze foot + note slot with `check.note` (F3) | NS:116,118; RA F3 |
| Data only, not dirty (`data`) | analysis, clean list, data entries | since-aside; data groups; foot `holds` + Re-analyze; no credit note when overview current | NS:114; ST:33 |
| Data, dirty (`dirty`) | analysis, `dirty` set, data entries | foot `dirty` + *Analysis tab →*, no button | NS:115; ST:34; CV:211 |
| Unread | entries newer than `notices_read_seq` | same body; opening sets read seq to the latest entry | H§3:97; H§7:139-141 |
| Read | reopened after reading | same body, unchanged (the sheet draws no read/unread distinction) | H§3; ST:39 |
| Foot: none | never analyzed | no foot element | H§2:90 |
| Foot: Re-analyze | analyzed, not dirty | sentence + outlined button (36 / full-width 44) | NS:67-72 |
| Foot: to Analysis tab | analyzed, dirty | sentence + mono link | NS:73-78 |
| Foot: note slot | press would spend / credits out / legality stands | note per CREDITS placement | RA F3 |
| Busy | foot Re-analyze pressed | button busy in place; no dirty banner | RA F2 |
| Failed | press errors | failure line + *Try again*; sheet stays open | RA F2 |
| After Re-analyze | press succeeds | data entries cleared; legality stays | H§3:97-98; ST:40 |
| Card stacked | card name pressed | `CardModal` over the sheet, `← Notices`; read unaffected | H§2:78; R eng 3 |

### C2 · Header tag

| State | Trigger | What renders | Key props |
|---|---|---|---|
| None | no entries, or data entries read and then cleared | — no tag | ST:9-10 |
| Unread data | data entries past the read seq, no legality | `● {n} notices`, `--fact`, hairline 55%, dot | A3; ST:11-12 |
| Read data | sheet opened since the latest entry | `{n} notices`, `--fg-locked` on `--border`, no dot | A4; ST:13 |
| Not legal, unread | any legality entry, unseen set (F11) | `● Not legal`, text `--fg` (H5), danger border + tint, danger dot | A5; ST:14-17 |
| Not legal, read | legality set unchanged since last open | `Not legal`, same ink, no dot | A5 #49; RA F14, F11 |
| Not legal, no chip | never analyzed | tag after the pill, in the chip's slot | A5 #51; ST:14 |
| New entry after read | a later publish touches the deck | dot returns | H§3:100; ST:41 |
| Phone yield | 390, range chip + tag exceed one line | range chip drops its name (`face={false}`), row stays one line | A1 #6–7; RA F18 |

---

## D · Contradictions between design files

1. **`Not legal` ink.** H§1 `HANDOFF.md:26` and P13 `:60` / P39 `:62` draw the text `--danger` with no plate;
   `READINESS-audit.md:22-24` (H5) rules text `--fg`, red on border and tint only. H5 wins.
2. **Contrast figure.** `READINESS.md:22` quotes ~3.1:1 for `--danger` text; `READINESS-audit.md:135` (F17)
   computes 4.19–4.40 on `--bg` and assigns the 3.1 to the read tag's `--fg-locked`.
3. **Group order and label.** `HANDOFF.md:66-67` says "the findings row's order" but draws *Two-card combos*
   second (`Notices Sheet.dc.html:95`); `READINESS-audit.md:126` (F8): follow `FINDING_ORDER` and the shipped label.
4. **Date form.** `HANDOFF.md:81` `21 Sept`, "formatDeckDate's form"; `READINESS-audit.md:128` (F10):
   `formatShortDeckDate`, `21 Sep`.
5. **Legality foot line scope.** `HANDOFF.md:90-91` places it in the "legality only, no analysis" case;
   `Notices Sheet.dc.html:123,126` and `The 99 - Deck Notices.dc.html:174` draw it under the last legality group in
   every variant, including `legalChip` and `all`.
6. **Row metrics inside NS.** `Notices Sheet.dc.html:121` (drawn: flex, 7px, min 36) vs `:139` (unused grid
   `rowStyle`: 8px, min 44). H§2:73 agrees with `:121`.
7. **Overview withheld.** `HANDOFF.md:133-134` and P13 `:145-151` withhold the overview on an illegal deck;
   `READINESS-audit.md:15-18` (H3) keeps a SAVED overview shown with a warning. Outside this table's surfaces except
   that the foot note slot (B8 #178) follows H4.
