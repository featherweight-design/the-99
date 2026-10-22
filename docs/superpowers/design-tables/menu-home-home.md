# Design Property Table — Home B and What's new (menu+Home R1)

Source: `design/design_handoff_the99_menu_home/` — `Home-Directions.dc.html` (direction B frames only: "B · 390", "B · 1300"), `Home-States.dc.html` (all eight frames), `Feed-Kinds.dc.html` (rules + kinds table), `README.md`, `READINESS.md`, `STATES-menu-home.md`. All three boards share one stylesheet (identical lines 1–527). Direction A is not recorded.

The feed item row (all six kinds, unseen/seen, card image, combo mark, trade face, spare-request slot) is in the companion file **`menu-home-feed-item.md`**. This file holds the page: shell slots, section order, header, welcome strip, lead story, resume, What's new container states (head, grouping, footer, quiet line, inline opt-in), Friends, Commitments, first-run row, and State Coverage.

Conventions:
- Fonts are drawn by family name. Map: `'Cinzel'` = display face, `'IBM Plex Sans'` = body face, `'IBM Plex Mono'` = mono face (the app's existing font tokens for these families).
- `font: W S/L F` shorthand is expanded. "inherit" = not set on the element.
- Mobile = 390 phone frame (`.ph`); Desktop = 1300 frame (`.dk`, 62px rail + `.main`).
- Copy is not a property: string slots are named, not their text. Every string is a `/copy-review` placeholder.
- No `:hover` / `:focus` / `@media` rule exists anywhere in the three boards. Hover and focus are **unspecified** (shipped behaviour of each reused element applies).
- Orange dashed outline (`.new`: `outline:1.5px dashed rgba(207,135,69,.8); outline-offset:3px; border-radius:8px`) and blue dashed outline (`.later`, with a `later round` tag) are board annotations, NOT shipped styling. The blue fold line (`.fold`, `top:770px` = 844 less the tab bar) is an annotation.

---

## Section order

### Home B — normal day / busy / empty states

| Property | Mobile | Desktop |
|---|---|---|
| Container | `.hb` single column | `.hb` two columns: `.cl` (main, flex 1) + `.cr` (316px) |
| 1 | Welcome-credits strip (`.ws`) — when shown | `.cl` 1: Welcome-credits strip — when shown |
| 2 | Lead story (`.ld`) — when an unseen item exists | `.cl` 2: Lead story |
| 3 | Pick up where you left off (`.blk`) | `.cl` 3: Pick up where you left off |
| 4 | What's new (`.blk`, NEW) | `.cl` 4: What's new |
| 5 | Friends (`.blk.fsx`) | `.cr` 1: **Commitments** |
| 6 | Commitments (`.blk`) | `.cr` 2: **Friends** |
| Note | Friends precedes Commitments on the phone | Commitments precedes Friends in the 316 column ("as shipped") |
| Ready to build | — (leaves Home; "its job is For you's") | — (leaves Home) |
| Header (`.hh`) | Above `.hb`, unchanged from shipped | Above `.hb`, unchanged from shipped |
| Arrivals banner precon half | — (retires into the feed, G6); About's line stays as shipped | same |

### First-run Home

| Property | Mobile | Desktop |
|---|---|---|
| Container | `.frp` | `.frp`, `max-width:760px` |
| 1 | `.frhd` (step kicker, h1) | `.frhd` (step kicker, h1, `.frpl` lock line) |
| 2 | `.abl` About line | `.abl` |
| 3 | `.frws` welcome strip | `.frws` |
| 4 | `.frst`: step 1 card `.s1`, `.lst` 2, `.lst` 3, `.frw` Add your friends, **`.frw.new` Choose your news (NEW, last)** | same |
| Feed / lead | — (no feed before cards) | — |

---

## Shell slots touched by Home

### Tab bar Home slot badge (`.tbar .t .bdg`) — clears on a Home visit

| Property | Mobile | Desktop (`.rail .bdg`) |
|---|---|---|
| position | absolute | absolute |
| top | 3px | 2px (touch rail: 4px) |
| left | calc(50% + 4px) | calc(50% + 3px) (touch rail: calc(50% + 5px)) |
| min-width | 16px | 16px |
| height | 16px | 16px |
| padding | 0 4px | 0 4px |
| border-radius | 999px | 999px |
| background | var(--accent) | var(--accent) |
| color | #14110E | #14110E |
| font | 600 9.5px/16px 'IBM Plex Mono' | same |
| text-align | center | center |
| letter-spacing | 0 | 0 |
| box-shadow | 0 0 0 2px var(--surface-rail) | 0 0 0 2px var(--surface-rail) |
| Content slot | unseen feed item count | same |
| Conditional | normal day `3`, busy `8`; absent in both empty states | busy `8` |

---

## Header (`header.hh`) — shipped, unchanged

### Container

| Property | Mobile | Desktop |
|---|---|---|
| padding | 14px 16px 0 | 22px 26px 0 |
| display | flex | flex |
| flex-direction | column | row |
| align-items | — | flex-end |
| gap | — | 16px |

### `.tx`

| Property | Mobile | Desktop |
|---|---|---|
| flex | — | 1 |

### Kicker `.kk` (slot: card count · read age)

| Property | Mobile | Desktop |
|---|---|---|
| margin | 0 0 6px | 0 0 7px |
| font | 400 10px 'IBM Plex Mono' | same |
| letter-spacing | .16em | .18em |
| text-transform | uppercase | uppercase |
| color | var(--fg-faint) | var(--fg-faint) |

### Title `h1`

| Property | Mobile | Desktop |
|---|---|---|
| margin | 0 | 0 |
| font | 700 23px/1.15 'Cinzel' | 700 28px/1 'Cinzel' |
| color | var(--fg) | var(--fg) |

### Buttons row `.bt`

| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| gap | 8px | 8px |
| margin-top | 12px | 0 |
| children flex | 1 | none |

### Primary `.bp` (slot: New deck)

| Property | Mobile | Desktop |
|---|---|---|
| display | flex, center/center | same |
| height | 44px | 32px |
| border-radius | 10px | 8px |
| background | var(--fg) | var(--fg) |
| color | var(--bg) | var(--bg) |
| font | 500 14px 'IBM Plex Sans' | 500 12.5px 'IBM Plex Sans' |
| padding | 0 16px | 0 14px |
| white-space | nowrap | nowrap |

### Ghost `.bg` (slot: Update collection, with icon)

| Property | Mobile | Desktop |
|---|---|---|
| display | flex, center/center | same |
| gap | 8px | 8px |
| height | 44px | 32px |
| border-radius | 10px | 8px |
| border | 1px solid var(--border-strong) | same |
| color | var(--fg) | var(--fg) |
| font | 400 14px 'IBM Plex Sans' | 400 12.5px 'IBM Plex Sans' |
| padding | 0 14px | 0 14px |
| Icon | svg 14×14, viewBox 0 0 20 20, stroke currentColor, stroke-width 1.6, round caps/joins; paths `M16.5 10a6.5 6.5 0 1 1-2.1-4.8` and `M16.8 3.4v3.2h-3.2` | same |

---

## Body (`.hb`)

| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| flex-direction | column | row |
| gap | 12px | 20px |
| padding | 14px 16px 16px | 20px 26px 26px |
| align-items | — | flex-start |
| `.cl` | — | flex:1; min-width:0; flex column; gap 11px |
| `.cr` | — | width 316px; flex none; flex column; gap 11px |
| `.blk` (each section) | flex column, gap 12px | flex column, gap 11px |

### Section heading `h2.sh` (shared by every section head)

| Property | Mobile | Desktop |
|---|---|---|
| margin | 0 | 0 |
| font | 400 10px 'IBM Plex Mono' | same |
| letter-spacing | .14em | .14em |
| text-transform | uppercase | uppercase |
| color | var(--fg-faint) | var(--fg-faint) |
| display | flex | flex |
| align-items | baseline | baseline |
| gap | 8px | 8px |
| `em` (count / qualifier) | font-style normal; color var(--fg-locked); letter-spacing .14em; text-transform lowercase | same |
| `.r` (right link) | margin-left auto; text-transform none; letter-spacing 0; font 400 12.5px 'IBM Plex Sans'; color var(--fg-muted); display flex; align-items center; gap 4px | same |
| `.r i` (chevron `›`) | font-style normal; color var(--fg-faint); font-size 15px; line-height 1 | same |
| Per-section margin-top | Pick up: 6px (inline); Commitments: 4px (inline); others 0 | same |

---

## Welcome-credits strip (`.ws`) — placement

### Placement

| Property | Mobile | Desktop |
|---|---|---|
| Position | First child of `.hb`, above the lead story | First child of `.cl`, above the lead story (main column only) |
| Shown | normal day, nothing chosen, first run (`.frws`) | normal day (B 1300), nothing chosen 1300, first run 1300 |
| Hidden | busy feed ("credits used"), empty nothing new | busy 1300 |
| Contents slots | bold credit count + expiry sentence + underlined "Where credits work" link; dismiss ✕ | same |

### Container

| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | center | center |
| gap | 12px | 12px |
| min-height | 52px | 52px |
| padding | 7px 4px 7px 12px | 7px 4px 7px 12px |
| border-radius | 12px | 12px |
| border | 1px solid var(--accent-shadow) | same |
| background | var(--surface) | var(--surface) |
| font-size / line-height | 13.5px / 1.45 | same |
| color | var(--fg-body) | var(--fg-body) |

### Mark `.wsm` and `.wsm i` (diamond with count)

| Property | Mobile | Desktop |
|---|---|---|
| `.wsm` | flex none; 30×30; flex center | same |
| `i` size | 22×22 | 22×22 |
| `i` transform | rotate(45deg) | rotate(45deg) |
| `i` border | 1.5px solid var(--accent) | same |
| `i` background | color-mix(in srgb, var(--accent) 12%, var(--surface)) | same |
| `i` border-radius | 3px | 3px |
| `i b` | transform rotate(-45deg); font 700 11px 'Cinzel'; color var(--accent) | same |

### Text `.wst` and dismiss `.wsx`

| Property | Mobile | Desktop |
|---|---|---|
| `.wst` | flex 1; min-width 0 | same |
| `.wst b` | color var(--fg); font-weight 600 | same |
| `.wst u` | color var(--fg); text-decoration-color rgba(207,135,69,.55); text-underline-offset 3px; white-space nowrap | same |
| `.wsx` size | 44×44 | 32×32 |
| `.wsx` margin-right | — | 4px |
| `.wsx` | flex none; flex center; color var(--fg-faint); font-size 13px | same |

---

## Lead story (`section.ld`, NEW)

### Container

| Property | Mobile | Desktop |
|---|---|---|
| position | relative | relative |
| overflow | hidden | hidden |
| border-radius | 14px | 14px |
| border | 1px solid var(--accent) | same |
| background | var(--surface-rail) | var(--surface-rail) |
| display | flex | flex |
| gap | 16px | 28px |
| padding | 16px 16px 16px 14px | 20px 24px 20px 26px |
| align-items | — (stretch; card sits at top) | center |
| width | full column (358px) | full `.cl` width |
| children (not `.blur`) | position relative | same |

### Backdrop `.blur`

| Property | Mobile | Desktop |
|---|---|---|
| position | absolute | absolute |
| inset | -40px | -40px |
| display | flex | flex |
| opacity | .28 | .28 |
| filter | blur(34px) saturate(1.25) | same |
| pointer-events | none | none |
| img | flex 1; min-width 0; height 100%; object-fit cover | same |
| Image source | the lead card's ART CROP (one image) | same |

### Card wrapper `.lc` (the tilt)

| Property | Mobile | Desktop |
|---|---|---|
| flex | none | none |
| width | 96px | 120px |
| height | 134px | 168px |
| transform | rotate(-4deg) | rotate(-4deg) |
| margin | 6px 2px 0 4px | 0 |
| position | relative | relative |

### Card image `.lc .cardimg`

| Property | Mobile | Desktop |
|---|---|---|
| display | block | block |
| width × height | 96 × 134 | 120 × 168 |
| aspect | card shape (≈63:88) | same |
| object-fit | cover | cover |
| border-radius | 5px | 6px |
| box-shadow | 0 10px 24px rgba(0,0,0,.6) | same |
| Source | full card image (never the art crop) | same |

### Friend face `.lc .fa`

| Property | Mobile | Desktop |
|---|---|---|
| position | absolute | absolute |
| right | -10px | -10px |
| bottom | -8px | -8px |
| width × height | 36 × 36 | 36 × 36 |
| border-radius | 10px | 10px |
| overflow | hidden | hidden |
| border | 2px solid var(--surface-rail) | same |
| transform | rotate(4deg) (cancels the card's tilt) | same |
| img | 100% × 100%; object-fit cover; display block | same |
| Conditional | only when a friend is the news (trade match, spare request) | same |

### Text column `.lt`

| Property | Mobile | Desktop |
|---|---|---|
| flex | 1 | 1 |
| min-width | 0 | 0 |
| display | flex column | same |
| gap | 6px | 6px |

### Kicker `.lk` (slot: kind name) + age `small`

| Property | Mobile | Desktop |
|---|---|---|
| display | flex; align-items center | same |
| gap | 8px | 8px |
| font | 500 10px 'IBM Plex Mono' | same |
| letter-spacing | .14em | .14em |
| text-transform | uppercase | uppercase |
| color | var(--accent-text) | var(--accent-text) |
| `small` | margin-left auto; letter-spacing 0; text-transform none; font-size 10.5px; color var(--fg-muted) | same |
| Unseen diamond | — (the lead never draws `.un`) | — |

### Title `h3` / line `p`

| Property | Mobile | Desktop |
|---|---|---|
| h3 margin | 0 | 0 |
| h3 font | 700 18px/1.25 'Cinzel' | 700 22px/1.25 'Cinzel' |
| h3 color | var(--fg) (inherited) | same |
| p font-size / line-height | 13px / 1.5 | 13.5px / 1.5 |
| p color | var(--fg-body) | var(--fg-body) |
| p max-width | — | 640px |

### Actions `.la` and button `.ba`

| Property | Mobile | Desktop |
|---|---|---|
| `.la` | display flex; gap 8px; margin-top 6px; flex-wrap wrap | same |
| `.ba` display | inline-flex, center/center | same |
| `.ba` height | 40px | 36px |
| `.ba` padding | 0 16px | 0 16px |
| `.ba` border-radius | 8px | 8px |
| `.ba` background | var(--accent) | var(--accent) |
| `.ba` color | var(--bg) | var(--bg) |
| `.ba` font | 600 13.5px 'IBM Plex Sans' | 600 13px 'IBM Plex Sans' |
| `.ba` white-space | nowrap | nowrap |
| Slot (trade match) | one `.ba` naming the friend's spares | same |
| Slot (spare request, LATER ROUND) | `.ba` Yes + `.bg` No (`height:40px` inline), wrapped `display:flex;gap:8px` | same; drawn Yes 36px vs No 40px (inline 40 overrides `.dk .bg` 32) — build the slot only |

---

## Pick up where you left off (`.blk`) — shipped, unchanged

| Property | Mobile | Desktop |
|---|---|---|
| Heading | `.sh`, margin-top 6px; `em` qualifier slot | same |
| Decks shown | 2 | 4 |
| `.rrs` | flex column; gap 12px | flex row; flex-wrap wrap; gap 12px |
| `.rr` | relative; flex; height 72px; align center; overflow hidden; radius 12px; border 1px solid var(--border); bg var(--surface-inset); padding 4px 10px 4px 0 | + flex 1 1 calc(50% - 6px); padding-right 18px |
| `.pa` art | absolute left/top/bottom 0; width 99px; img 100%×100% object-fit cover; `::after` linear-gradient(90deg, transparent 55%, var(--surface-inset)) | same |
| `.rt` | relative; flex 1; min-width 0; flex column; gap 4px; padding-left 108px | padding-left 116px |
| `.l1 b` (deck name) | 600 14.5px/1.2 'Cinzel'; var(--fg); ellipsis nowrap | same |
| `.l1 small` (last touched) | margin-left auto; flex none; 10.5px 'IBM Plex Mono'; var(--fg-locked) | same |
| `.l2` | flex; center; gap 14px; height 22px | same |
| `.pill` | flex none; height 19px; padding 0 7px; radius 5px; 10px 'IBM Plex Mono' | same |
| Pill: To buy | color var(--accent); bg color-mix(in srgb,var(--accent) 18%,var(--bg)); border 1px solid color-mix(in srgb,var(--accent) 45%,transparent) | same |
| Pill: Draft | color var(--fg-body); bg color-mix(… var(--fg-body) 14%, var(--bg)); border 1px **dashed** color-mix(… var(--fg-body) 45%, transparent) | same |
| Pill: Complete | color var(--success); bg color-mix(… var(--success) 18%, var(--bg)); border 1px solid color-mix(… var(--success) 45%, transparent) | same |
| `.l2 .c` (commander) | 10.5px 'IBM Plex Mono'; var(--fg-body); ellipsis | same |
| `.l3 .bar` | flex 1; height 3px; radius 2px; bg var(--border-strong); fill `i` radius 2px, color = status color | same |
| `.l3 small` | 10.5px 'IBM Plex Mono'; var(--fg-faint) | same |
| `.more` | flex; center; gap 10px | same |
| `.more small` (N more decks) | 10.5px 'IBM Plex Mono'; var(--fg-faint) | same |
| `.more .bg` (All N decks) | margin-left auto; height 44px; font-size 13px; padding 0 12px | margin-left 0; height 32px; font-size 12.5px |

---

## What's new (`section.blk`, NEW) — container and states

### Head `h2.sh`

| Property | Mobile | Desktop |
|---|---|---|
| Base | `.sh` (see above) | same |
| `em` count slot ("· N new") | shown when unseen > 0 (normal: 1, busy: 8) | busy: 8 |
| `em` when nothing new | — (absent) | n/a (not drawn) |
| `.r` "Choose what shows ›" | shown whenever ≥1 kind is on; links to Settings | same |
| `.r` in nothing-chosen state | — (absent; head is the title alone) | — |

### Feed container `.fd`

| Property | Mobile | Desktop |
|---|---|---|
| border-radius | 14px | 14px |
| border | 1px solid var(--border) | same |
| background | var(--surface-inset) | var(--surface-inset) |
| display | flex column | same |
| overflow | hidden | hidden |
| width | 358px (column) | `.cl` width |
| Children | `.fday` labels, `.fi` rows, `.fdf` footer — OR `.fq` — OR `.su` | same |

### Day label `.fday` (slots: Today / Earlier this week)

| Property | Mobile | Desktop |
|---|---|---|
| padding | 9px 14px 0 | 9px 14px 0 (no desktop override; rows pad 16px) |
| font | 500 9px 'IBM Plex Mono' | same |
| letter-spacing | .14em | .14em |
| text-transform | uppercase | uppercase |
| color | var(--fg-locked) | var(--fg-locked) |
| `.fday + .fi` | border-top 0 | same |
| `.fi + .fday` | border-top 1px solid var(--border); margin-top 0 | same |
| Conditional | only when the shown list holds BOTH groups | same |

### Footer `.fdf` (slots: "N more this week" + "Show all N")

| Property | Mobile | Desktop |
|---|---|---|
| display | flex; center; space-between | same |
| gap | 10px | 10px |
| padding | 4px 6px 4px 14px | same |
| border-top | 1px solid var(--border) | same |
| `small` | 10.5px 'IBM Plex Mono'; var(--fg-faint) | same |
| `span` (press) | min-height 44px; flex center; padding 0 10px; 500 13px 'IBM Plex Sans'; var(--fg) | min-height 36px |
| Conditional | only when total > 5 (busy: 5 shown, "Show all 9") | same |

### Quiet line `.fq` (kinds on, nothing new)

| Property | Mobile | Desktop |
|---|---|---|
| padding | 14px | 14px |
| display | flex column | same |
| gap | 6px | 6px |
| p font-size / line-height | 13px / 1.55 | same |
| p color | var(--fg-body) | same |
| p b | color var(--fg) (bold lead "Nothing new since …"; then names the kinds that are on) | same |
| Desktop | — | not drawn; same rules apply |

### Inline opt-in `.su` (nothing chosen)

| Property | Mobile | Desktop |
|---|---|---|
| padding | 14px | 14px |
| display | flex column | same |
| gap | 4px | 4px |
| `h3` | margin 0; 700 17px 'Cinzel' | same |
| `> p` | 13px/1.55; var(--fg-muted); margin-bottom 6px | same |
| `.cks` | block (one column) | display grid; grid-template-columns 1fr 1fr; column-gap 24px |
| `.cks .ck:nth-child(2)` | — | border-top 0 |
| Checkbox count | 6 (New sets, New precons, Price drops on your wishlist, Trade matches, Friends asking for your spares, Combos you can make) | same, 3 rows × 2 |
| All boxes | unchecked (every kind starts off) | same |

#### Checkbox row `.ck`

| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | flex-start | flex-start |
| gap | 12px | 12px |
| min-height | 44px | 44px |
| padding | 8px 0 | 8px 0 |
| `.ck + .ck` | border-top 1px solid var(--border) | same (except item 2) |
| `.ct` | flex 1; min-width 0; flex column; gap 2px | same |
| `.ct b` (kind name) | 500 14px 'IBM Plex Sans'; var(--fg) | same |
| `.ct span` (one-line description) | 12.5px/1.45; var(--fg-muted) | same |

#### Box `.box`

| Property | Mobile | Desktop |
|---|---|---|
| flex | none | none |
| width × height | 20 × 20 | 20 × 20 |
| border-radius | 5px | 5px |
| border | 1.5px solid var(--border-dashed) | same |
| background | var(--surface-sunken) | same |
| display | flex center | same |
| margin-top | 1px | 1px |
| `.box.on` | background var(--accent); border-color var(--accent) | same |
| `.box.on::after` (tick) | content ''; 9×5; border-left 2px solid var(--bg); border-bottom 2px solid var(--bg); transform rotate(-45deg) translate(1px,-1px) | same |

#### Save row `.sv` and foot

| Property | Mobile | Desktop |
|---|---|---|
| `.sv` | display flex; gap 8px; margin-top 8px | same |
| `.sv > *` | flex 1 (full width) | flex none |
| Button | `.bp` "Show these": 44px, radius 10, 500 14px, bg var(--fg), color var(--bg), padding 0 16px | `.bp`: 32px, radius 8, 12.5px, padding 0 14px |
| `.foot` | font 10.5px/1.5 'IBM Plex Mono'; var(--fg-faint); margin-top 8px (in-app-only line) | same |

---

## Friends (`section.blk.fsx`) — shipped, unchanged

| Property | Mobile | Desktop |
|---|---|---|
| Heading | `.sh` + count span (`letter-spacing:.08em`, "· N") + `.r` "All friends ›" | same |
| Tonight's table `.tc` | first child under the heading when a table is open (busy state) | same |
| `ul` | margin 0; padding 0; list-style none; flex; justify space-between | same |
| `li` | width 56px; flex column; center; gap 6px | width 52px |
| Face `.face` | 40×40; radius 10px; flex center; overflow hidden; border 1px solid var(--border-strong); bg var(--surface-raised); color var(--fg-body); font 500 12px 'IBM Plex Mono'; img cover | same |
| `li small` (name) | 11.5px; var(--fg-body); max-width 50px; ellipsis nowrap | same |
| Empty slot `.es` | 40×40; radius 10px; border 1.5px dashed var(--border-dashed) | same |
| Add `.ad` | height 44px; radius 10px; border 1px solid var(--border-strong); flex center; 14px; var(--fg) | height 32px; align-self flex-start; padding 0 14px; 12.5px; radius 8px |

### Tonight's table `.tc` (busy state only)

| Property | Mobile | Desktop |
|---|---|---|
| Container | relative; overflow hidden; radius 14px; border 1px solid var(--accent); bg var(--surface-rail); padding 14px; flex column; gap 10px | same |
| `.blur` | as lead (two art images side by side) | same |
| `.k` | 500 10.5px 'IBM Plex Mono'; .14em; uppercase; var(--accent-text) | same |
| `h3` | margin 0; 700 18px 'Cinzel' | same |
| `.fc` faces | flex gap 6px; each face 30×30 radius 8px | same |
| `p` | 13.5px/1.55; var(--fg-body); `b` var(--fg) | same |
| `.ba` | width 100%; 44px; radius 8; 600 14px; padding 0 20px | width 100% |

---

## Commitments (`section.blk`) — shipped, unchanged

| Property | Mobile | Desktop |
|---|---|---|
| Heading | `.sh`, margin-top 4px | same |
| `.cm` | flex column; gap 11px; radius 14px; border 1px solid var(--border); bg var(--surface-inset); padding 14px | same |
| `.r` row | flex; space-between; align baseline; 13px; var(--fg-body) | same |
| `.r span:last-child` | 13px 'IBM Plex Mono' | same |
| Figure colors | Cards in use: var(--accent-text); Spoken for twice: var(--danger); To buy: var(--fg) | same |
| `.bb` | grid 1fr 1fr; gap 8px; margin-top 2px | same |
| `.bb span` | height 44px; flex center; radius 8px; border 1px solid var(--border-strong); 12.5px; var(--fg) | height 32px |

---

## First-run Home — "Choose your news" row (`.frw.new`, NEW)

### Placement

| Property | Mobile | Desktop |
|---|---|---|
| Position | last child of `.frst`, directly after "Add your friends" `.frw` | same |
| `.frst` | flex column; gap 11px; padding 16px 16px 20px | padding 16px 28px 28px |
| Target | Settings (What's new on Home) | same |

### Row `.frw`

| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | center | center |
| gap | 12px | 12px |
| min-height | 56px | 56px |
| padding | 12px 15px | 12px 15px |
| border-radius | 14px | 14px |
| border | 1px solid var(--border-strong) | same |
| background | var(--surface-rail) | same |

### Mark `.sl` (differs from Add your friends)

| Property | Mobile | Desktop |
|---|---|---|
| width × height | 22 × 22 | 22 × 22 |
| flex | none | none |
| border-radius | 6px | 6px |
| border | 1.5px **solid** var(--accent-shadow) (inline override of `dashed var(--border-dashed)`) | same |
| display | flex center | same |
| Content | 6×6 diamond: background var(--accent); transform rotate(45deg) (Add your friends shows `+` instead: 300 14px/1 'IBM Plex Sans', var(--fg-muted)) | same |

### Text and chevron

| Property | Mobile | Desktop |
|---|---|---|
| `.tx` | flex 1; min-width 0; flex column; gap 3px | same |
| `.tx b` (title slot) | 600 15px 'Cinzel'; var(--fg) | same |
| `.tx span` (line slot) | 12px; var(--fg-muted) | same |
| `.ch` | text `›`; color var(--fg-faint) | same |

### Other first-run elements (shipped, unchanged; recorded for context)

| Property | Mobile | Desktop |
|---|---|---|
| `.frhd` padding | 16px 16px 0 | 26px 28px 0 |
| `.frpl` lock line | — (not drawn at 390) | margin 12px 0 0; flex center gap 8px; 12.5px; var(--fg-muted); lock svg 9×12 viewBox 0 0 11 14 (`M2.5 6V4a3 3 0 0 1 6 0v2` stroke 1.4 + rect x .5 y 6 10×7.5 rx 1.5 filled), color var(--fg-locked) |
| `.abl`, `.frws` margins | 14px 16px 0 / 8px 16px 0 | left/right 28px |

---

## State Coverage

### Home states

| State | Trigger | What renders |
|---|---|---|
| First run | No collection yet | Shipped checklist (`.frp`); new `.frw.new` "Choose your news" row LAST in `.frst` → Settings. No feed, no lead. Tab bar lock brackets Commanders + Decks (Friends open). Welcome strip in `.frws`. |
| A normal day | ≥1 kind on; ≥1 unseen item | Welcome strip (if credits) → lead story (first unseen by priority) → Pick up (2 decks / 4 desktop) → What's new (head "· N new", "Choose what shows ›"; rows, no day labels when only one group; no footer when ≤5) → Friends → Commitments (desktop: Commitments, Friends in `.cr`). Home badge shows unseen count. |
| A busy feed | Many items, incl. one waiting on you | Lead = the waiting-on-you item (spare request; Yes/No = later round). What's new: five rows grouped `Today` / `Earlier this week`, footer "N more this week · Show all N". Friends badge (`2`) on the Friends slot. Tonight's table heads Friends when a table is open. Welcome strip absent (credits used). |
| Empty: nothing new | ≥1 kind on; zero items in window | No lead, no badge. What's new head without `em` count, with "Choose what shows ›"; `.fd` holds one `.fq` quiet line naming the kinds that are on. |
| Empty: nothing chosen | Every kind off (default) | No lead, no badge. What's new head = title only (no count, no `.r`). `.fd` holds `.su`: title, line, six unchecked boxes (one column / two columns desktop), "Show these" `.bp`, in-app-only foot. Shown ONLY while every kind is off; after Show these, switches live in Settings alone. |
| Welcome credits | Welcome lot live / dismissed / used | `.ws` first in `.hb`/`.cl` above the lead; absent when used or dismissed. |
| Friends switch off | `SOCIAL_FRIENDS_ENABLED` off | Not drawn on Home boards (menu: four slots). Unspecified for Home's Friends block. |

### What's new list rules (Feed-Kinds "Rules")

| Rule | Value |
|---|---|
| Order | waiting on you first, then newest |
| Kept | fourteen days |
| Shown | five, then "Show all N" (footer) |
| Grouping | "Today" / "Earlier this week" labels only once the list holds both |
| Unseen → seen | first Home visit after arrival (on the Friends page, when it is answered) |
| Kinds off | not written for the account at all; no backfill when turned on |
| Read | per request on Home, never inside the cached Home payload (or the feed generation joins the `cachePageForUser` key) |

### Lead-story selection rule

| Property | Value |
|---|---|
| Candidate set | unseen items only |
| Priority | waiting on you › trade match › combo › price drop › precon › set (first unseen by this order) |
| Once seen | drops into the list |
| No unseen item | no lead (empty states draw none) |
| Duplicate | the lead item is NOT repeated in the list (normal day: Colin's trade match leads, list starts at price drop; busy: Peter's request leads, list has no spare request row) |

### Drawn inconsistencies (record, do not invent)

| Item | Note |
|---|---|
| Busy `Today` group order | drawn 6h, yesterday, 5h — not newest-first as the rule states; follow the rule |
| `em` count vs badge | normal day head "· 1 new" while Home badge `3`; busy both `8`. Count source = unseen feed items (README call 8) |
| Normal-day caption "What's new (3 more)" | the frame draws three rows and no footer |
| Busy lead Yes/No heights (desktop) | Yes 36px, No 40px (inline). Later-round slot only |
