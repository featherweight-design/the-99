# Design table: Cart v2 PR 8, the chassis frame, search and sort

Sources (design files only): `design/design_handoff_the99_all_decks_cart_v2/` README.md, STATES-all-decks-cart-v2.md, design-tables/all-decks-cart-v2.md, `all-decks-cart-v2 · copy strings.ts` (key names only), Controls.dc.html (A2 Sort 1300, B2 Sort 390, D no match 390, chassis in A1/C1/C2), By-Card-Deck.dc.html (A/B By card, C/D By deck), Loading.dc.html (reading dot only).
Values are read from the canvases' inline CSS classes (`.chs .r1 .fld .trg .hair .chips .chip .rln .pop .sht2 .scr .emp`). Copy: each element names its copy key/slot, never its text. "—" = not drawn / not specified. Frames list mobile = 390 phone, desktop = 1300 (chassis shows from 1000px up, phone layout below 1000px per design-table).

Token palette on the board (for reference, all via CSS vars): `--bg --surface-raised --surface-sunken --elevated --border --border-strong --border-dashed --fg --fg-body --fg-muted --fg-faint --fg-locked --accent --accent-text --fact`.

## 1. Chassis frame (`.chs`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Component | `FilterChassis` between view row (`.vrow`) and list; inside `data-cart-controls` | same |
| display / direction | flex, column | flex, column |
| gap between rows 1, 2, 3 | 8 | 8 |
| Rows | 3: row 1 `.r1` (controls), row 2 `.chips`, row 3 `.rln` | 3, same |
| Placement | inside the pinned controls block (see 1a) | inside right column `section` (flex column, gap 14, min-width 0, position relative) under `.vrow`; `.vrow` and `.chs` sit in a flex column wrapper with gap 12 |
| Pinning | pinned with the switch row while the list scrolls (D5) | — (sticky applies to By friend panel headers only, not the chassis) |
| Replaces | `ListHead` (row 3 replaces it) | `ListHead` |

### 1a. Pinned wrapper (phone only)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Wrapper margin | 0 -16px (bleeds past `.cg` 16px side padding) | — |
| Wrapper padding | 10px 16px 12px | — |
| Border | top 1px solid `--border`, bottom 1px solid `--border` | — |
| Background | `--bg` | — |
| Inner | flex column, gap 12: `.vrow` then `.chs` | flex column, gap 12 (same inner) |
| Page grid above it | `.cg` grid 1 col, gap 12, padding 12px 16px | `.cg` grid `280px minmax(0,1fr)`, gap 24, padding 18px 22px |

## 2. Row 1 (`.r1`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| display / align | flex, align-items center | flex, align-items center |
| gap | 8 | 8 |
| max-width | — | 100% (inline) |
| Children, in order | search field (`.fld`), sort button (`.trg.ic`), Filters button (`.trg`, out of scope beyond its slot) | search field, Friend trigger, Owned trigger (both out of scope), hairline (`.hair`), Sort trigger |
| Hairline `.hair` | — (absent) | width 1, height 22, bg `--border-strong`, flex none, margin 0 2px |

## 3. Search field (`.fld`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| display / align | flex, align-items center | flex, align-items center |
| flex | 1 (fills), min-width 0 | 1 (fills), min-width 0 |
| height | 44 | 34 |
| gap | 8 | 8 |
| padding | 0 11px | 0 11px |
| border | 1px solid `--border-strong` | 1px solid `--border-strong` |
| radius | 8 | 8 |
| background | `--surface-sunken` | `--surface-sunken` |
| font | 13px 'IBM Plex Sans' | 13px 'IBM Plex Sans' |
| color (empty / placeholder) | `--fg-faint` | `--fg-faint` |
| white-space / overflow | nowrap / hidden | nowrap / hidden |
| Leading icon | search glyph, svg 15×15, viewBox 20, stroke currentColor 1.6, round caps | same |
| Placeholder copy | `filters.search` (aria: `filters.searchAria`) | same |
| Focus / hover | — | — |

### 3a. Search field, searched (`.fld.on`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Border color | `--accent` | `--accent` |
| Text color | `--fg` (typed value in a span, color `--fg`) | `--fg` |
| Clear affordance | `✕` span `.xx`: margin-left auto, color `--fg-muted`, font-size 12 | same |
| Field size / layout | unchanged from rest (height 44) | unchanged (height 34) |

## 4. Sort trigger

| Property | Mobile (390): ⇅ button `.trg.ic` | Desktop (1300): `Sort · <current> ▾` `.trg` |
|---|---|---|
| Rendered | always (below 1000px) | always (≥1000px), after the hairline, right of Owned |
| flex | none | none |
| height | 44 | 34 |
| width | 44 | auto |
| display / align | flex, center | flex, align-items center |
| justify | center | — |
| padding | 0 | 0 11px |
| gap | 7 | 7 |
| border | 1px solid `--border-strong` | 1px solid `--border-strong` |
| radius | 8 | 8 |
| font | 500 12px 'IBM Plex Mono' | 500 12px 'IBM Plex Mono' |
| color | `--fg-body` | `--fg-body` |
| white-space | nowrap | nowrap |
| Content | icon only: two-arrow ⇅ svg 18×18, viewBox 20, stroke currentColor 1.5, round caps/joins (paths: `M6.5 4v12M3.5 7l3-3 3 3`, `M13.5 16V4M10.5 13l3 3 3-3`) | label slot `sort.label` + " · " + current option (one of `sort.byCard`/`byDeck`/`byFriend`) + caret `▾` |
| Caret `<i>` | — | font-style normal, color `--fg-faint`, font-size 10 |
| Open state (`.trg.open`) | border-color `--accent`, box-shadow 0 0 0 3px rgba(207,135,69,.18) | same |
| "On" state (`.trg.on`, filter engaged) | — (not used for Sort) | — (not used for Sort; Sort is never empty) |
| Wait state (`.trg.wait`) | — | — (Sort has no reading state; works from first paint) |
| Current value | the sheet's selected row; no value shown on the button | shows current; default = first option of the view |
| Per-view options | By card: 5 (Most decks default, Price high first, Price low first, Most spare, Name); By deck: 3 (Largest first default, Cost high first, Name); By friend: 3 (Most spare default, Most cards, Name). Sort is per view; one view's options are never offered in another | same |
| Hover / focus | — | — |

## 5. Desktop sort menu, open (`.pop`, Controls A2)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Rendered | — (phone uses the sheet, section 6) | anchored popover, opens from the Sort trigger |
| position / z-index | — | absolute / 30 |
| Placement in frame | — | left 676, top 92 (board coordinates, within the right-column section) |
| width | — | 220 (inline override; base `.pop` is 248) |
| background | — | `--surface-raised` |
| border | — | 1px solid `--border-strong` |
| radius | — | 12 |
| box-shadow | — | 0 18px 40px rgba(0,0,0,.55) |
| padding | — | 8 |
| Header `.ph2` | — | font 10px 'IBM Plex Mono', letter-spacing .12em, uppercase, color `--fg-faint`, padding 6px 8px 8px; copy slot `sort.label` |
| Item `.it` | — | flex, align-items center, gap 10, min-height 38, padding 0 8, radius 8, font 13.5px 'IBM Plex Sans', color `--fg` |
| Item count | — | one per option of the current view (5 in A2, By card) |
| Selected item `.it.on` | — | background `--elevated` |
| Radio `.rad` | — | 16×16, radius 50%, border 1.5px solid `--border-dashed`, flex none |
| Radio selected | — | border 5px solid `--accent` (filled-ring radio; no check glyph) |
| Item trailing `small` | — | not used in Sort (base style: margin-left auto, mono 11, `--fg-muted`) |
| Separator `.sep2` | — | not used in Sort |
| Trigger while open | — | `.trg.open` (section 4) |
| Hover / focus on item | — | — |

## 6. Phone Sort sheet, open (`.scr` + `.sht2`, Controls B2)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Rendered | sheet over the page, opened by the ⇅ button | — |
| Scrim `.scr` | position absolute, inset 0, background rgba(8,6,4,.62), z-index 28 | — |
| Sheet `.sht2` position | absolute, left 0, right 0, bottom 0, z-index 29 | — |
| Sheet radius | 18px 18px 0 0 | — |
| Sheet border | top 1px solid `--border-strong` | — |
| Sheet background | `--surface-raised` | — |
| Sheet padding | 10px 18px 26px | — |
| Sheet layout | flex column, gap 14 | — |
| Grab `.grab` | 38×4, radius 2, background `--border-dashed`, align-self center | — |
| Header `.hd` | flex, align-items baseline, justify space-between | — |
| Header title `b` | font 700 18px 'Cinzel', serif; color `--fg`; copy slot `sort.label` | — |
| Sub-line `small` (right of title) | font 11px 'IBM Plex Mono'; color `--fg-muted`; renders the current view's name (By card in B2); copy: the shipped view-switch label, no key in the v2 strings | — |
| List wrapper | `.pop` reset inline: position static, width auto, border 0, box-shadow none, background transparent, padding 0 | — |
| Row `.it` | flex, align-items center, gap 10, min-height 48, padding 0 8, radius 8, font-size 15px (family 'IBM Plex Sans'), color `--fg` | — |
| Row count | one per option of the current view (5 in B2) | — |
| Selected row `.it.on` | background `--elevated` | — |
| Selected marker | `.rad` 16×16 radius 50%; selected = border 5px solid `--accent`; unselected = border 1.5px solid `--border-dashed`. Source draws a ring radio, not a check glyph | — |
| Dismiss | — (no close button drawn; scrim + grab) | — |
| Page behind | frame shows chassis row 1 with ⇅ button in `.trg.ic.open` state, list rows behind scrim | — |
| Hover / focus | — | — |

## 7. Row 2 (`.chips`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| display / align | flex, align-items center | flex, align-items center |
| gap | 6 | 6 |
| min-height | 22 | 22 |
| white-space / overflow | nowrap / hidden | nowrap / hidden |
| Always rendered | yes; never collapses (row 2 prints NO FILTERS ON) | yes |

### 7a. NO FILTERS ON (`.none`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| font | 10px/14px 'IBM Plex Mono' | 10px/14px 'IBM Plex Mono' |
| letter-spacing | .12em | .12em |
| text-transform | uppercase | uppercase |
| color | `--fg-faint` | `--fg-faint` |
| Shown when | no filter and no search on | same |
| Copy | `chassisCopy` NO FILTERS ON (reused unchanged) | same |

### 7b. Chip (`.chip`) incl. search chip

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| display / align | inline-flex, align-items center | inline-flex, align-items center |
| gap | 6 | 6 |
| padding | 3px 8px | 3px 8px |
| border | 1px solid `--border-strong` | 1px solid `--border-strong` |
| radius | 7 | 7 |
| background | `--bg` | `--bg` |
| font | 11px/14px 'IBM Plex Mono' | 11px/14px 'IBM Plex Mono' |
| color | `--fg-body` | `--fg-body` |
| white-space | nowrap | nowrap |
| Search chip content | the typed query in curly double quotes, then `✕` (span color `--fg-muted`); no `<em>` label | same |
| Filter chip content (for ordering only) | `<em>` label (`filters.chipFriend`/`chipOwned`; em: font-style normal, color `--fg-muted`) then value then `✕` | same |
| Order | filter chips first, search chip last (D, C2) | Friend chip first (C1); search chip order as mobile |
| `✕` | color `--fg-muted`; drops that one filter | same |
| Hover / focus | — | — |

### 7c. Clear all (`.ca`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| font | 12px 'IBM Plex Sans' | 12px 'IBM Plex Sans' |
| color | `--accent-text` | `--accent-text` |
| margin-left | 4 | 4 |
| Position | after the last chip | after the last chip |
| Rendered | when any chip is present | when any chip is present |
| Copy | `chassisCopy` Clear all (reused unchanged) | same |

## 8. Row 3, the result line (`.rln`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| display / align | flex, align-items center | flex, align-items center |
| justify-content | space-between | space-between |
| gap | 10 | 10 |
| font | 11px 'IBM Plex Mono' | 11px 'IBM Plex Mono' |
| color | `--fg-muted` | `--fg-muted` |
| Children | sentence span (left); reading cluster (right edge, only while reading) | same |
| Replaces | `ListHead` (`list.headByCard`/`headByDeck`/`headByFriend` retired) | same |

### 8a. Sentence per view and state

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| By card, rest | copy `result.byCard` (lines, with-spare count); `result.byCardNoSpare` when no spare | same |
| By deck, rest | copy `result.byDeck` (decks, copies) | same |
| By friend, rest | copy `result.byFriend` (friends, spares) | same |
| Filtered / searched (any view) | copy `result.filtered` (shown of total cards), e.g. no-match 0 of 48; C1 desktop frame draws a longer filtered sentence ("6 of 48 cards · Chris has a spare") not present in the v2 strings, wording is /copy-review's | same |
| By friend filtered | counts friends and cards that remain (C2 frame: one friend, one card), `result.byFriend` shape | — |
| By friend reading | `result.readingByFriend` sentence alone, no dot cluster | same |
| By card / By deck reading | sentence plus the reading cluster (8b) | same |

### 8b. Reading cluster (`.rd`) with trailing dot

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Rendered | only while the friends' spares read has not landed (By card and By deck result lines, Loading A/B) | same |
| Position | right edge of the line (space-between) | right edge |
| display / align | inline-flex, align-items center | same |
| gap | 7 | 7 |
| color | `--fg-faint` | `--fg-faint` |
| Dot `i` | 6×6, border-radius 50%, background `--fact`, opacity .8 | same |
| Dot position | before the text, inside the cluster | same |
| Animation | — (static dot; only skeletons animate, `anim-skeleton`) | — |
| Text copy | `result.reading` | `result.reading` |

## 9. No-match block (Controls D; `.emp`, empty-state.tsx shape)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Frame | D, 390 | — (no 1300 frame drawn; same `.emp` shape, no desktop specifics specified) |
| Placement | child of `.cg` after the pinned chassis block; the chassis stays above it (search chip, filter chip, Clear all) | — |
| Chassis above | row 1 searched (`.fld.on`, value + ✕), ⇅ button, Filters button with badge; row 2 two chips + Clear all; row 3 `result.filtered` 0 of N | — |
| display / direction | flex, column, align-items flex-start | — |
| gap | 8 | — |
| padding | 26px 22px | — |
| border | 1px dashed `--border-dashed` | — |
| radius | 12 | — |
| Background | — | — |
| Glyph | none drawn (the spare glyph `.emp .glyph` exists in CSS, color `--fact`, margin-bottom 2, used only by By friend's none states, not no-match) | — |
| Title `h3` | margin 0; font 600 15px 'IBM Plex Sans'; color `--fg`; copy `empty.noMatchTitle` | — |
| Body `p` | font-size 13px; line-height 1.55; color `--fg-body`; max-width 440; dynamic sentence naming the one fix (not in strings file) | — |
| Press `.bg` | height 44; margin-top 4; display flex, center; gap 8; border 1px solid `--border-strong`; radius 10; font 400 14px 'IBM Plex Sans'; color `--fg`; padding 0 14; white-space nowrap; copy `empty.drop(what)` | — |
| Press action | drops the one named filter (`Drop <filter>`) | — |
| Must not | an empty list with no way out | same |
| Rule | list (rows, `ColHead`) not drawn while no line matches | same |

## 10. List box below the chassis (context for no-row spacing)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Container `.lbox` | — (list follows `.cg` flow) | position relative, overflow hidden; column header `.colh` sits at its top (out of PR 8 scope except for ListHead being replaced) |
| Gap chassis to list | `.cg` gap 12 | section gap 14 |

# State Coverage

| State | Frame | Mobile (390) | Desktop (1300) |
|---|---|---|---|
| Chassis at rest | By-Card-Deck A/B (By card), C/D (By deck); Controls A2/B2 behind the menus | Row 1: search field + ⇅ (44) + Filters; row 2 `.none` NO FILTERS ON; row 3 `.rln` sentence only; pinned block with borders | Row 1: search + Friend + Owned + hairline + `Sort · Most decks ▾` (By card) / `Sort · Largest first ▾` (By deck); row 2 NO FILTERS ON; row 3 sentence |
| Searched | Controls C1 (friend filter), C2 / D (search "boots" / "greaves") | field `.fld.on` (accent border, `--fg` value, `✕`); search chip in row 2 with Clear all; row 3 `result.filtered` | same pattern; field `.fld.on`; chip row; row 3 filtered sentence |
| No-match | Controls D | `.emp` block (title, body, Drop press) under the chassis; chips (2) + Clear all; row 3 0 of N | — (not drawn; same shape) |
| Sort menu open | Controls A2 | — | `.pop` 220 wide with header `sort.label`, 5 ring-radio rows (By card), selected row `--elevated`; trigger `.trg.open` |
| Sort sheet open | Controls B2 | scrim + `.sht2`: grab, title `sort.label` + view sub-line, 5 rows at 48px; selected row `--elevated`; ⇅ button `.trg.ic.open` | — |
| Reading | Loading A/B (dot), C/D (By friend) | By card/By deck: row 3 sentence + right-aligned 6px `--fact` dot + `result.reading`; By friend: `result.readingByFriend` only; Search, Owned, Sort work from first paint | same |
