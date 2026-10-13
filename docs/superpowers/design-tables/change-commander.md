# Design Property Table — Change commander (door and sheet, PR 3)

Sources: `design/design_handoff_the99_change_commander/` — `HANDOFF.md` (§1 R1 superseded by the R3 section, §2, §3, R3), `STATES-change-commander.md`, `READINESS-audit.md` (F-corrections, H rulings override), `READINESS.md`, `change-commander - copy strings.ts` (keys only), `Change Commander Sheet.dc.html`, `Deck Page 1300.dc.html` / `Deck Page 390.dc.html` (`controls="joined"`), `The 99 - Change Commander.dc.html` (R3-A…R3-E prose).

Conventions: Mobile = below 768px (`md:`), Desktop = 768px and up. `—` = explicitly absent. A property the design does not state is omitted. Copy is out of scope: each text element records the copy KEY it renders (`changeCommanderCopy.*`, abbreviated from its top level: `door.*`, `sheet.*`, `confirm.*`). "Source" names where the value was read; where HANDOFF and the canvas disagree the ruling source is named.

Scope excludes HANDOFF §4 (after the swap: header band, pending banner, review page, discard).

---

## 0 · Superseded (recorded, not built)

| Item | Status | Source |
|---|---|---|
| HANDOFF §1 R1 door: `GhostButton` first in the action row (desktop h 32, px 14, sans 12.5/600; phone min-h 44, px 9, mono 11; ⇄ mono 12 `--fg-faint`, gap 7 / 6) | SUPERSEDED by R3-E. The action row stays as shipped (*Update from a list · Export · Commit as v1*); no fourth button | HANDOFF §1 banner, R3; README "Tried and dropped" |
| R2-A (two separate plates on the art) | SUPERSEDED by R3-E (joined) | README; canvas R3-E |
| R2-B (*Edit deck ▾* menu, `door.menu`) | Dropped; not built | README; READINESS-audit §1 4.1 |
| HANDOFF §2.2 "With no deck data: `no deck data` `--fg-faint`, not a button" | Not drawn: H2 revisited hides candidates under `MIN_CANDIDATE_DECKS` (N = 20) before ranking, so a no-data row cannot occur | READINESS-audit H2 revisited, F10 |
| Mana value as a mono figure (`mv 5 · …`) | Dropped for `CostPips` | README; R3-A |
| HANDOFF §3 failed line "above the actions" | SUPERSEDED: danger line sits BELOW the actions | HANDOFF R3; R3-D |

---

## 1 · The door — joined plate on the commander art (R3-E)

### 1.1 Plate container

| Element | Property | Mobile | Desktop | Source |
|---|---|---|---|---|
| Plate position wrapper | position | absolute, z-index 2 | absolute, z-index 2 | Deck Page 390 / 1300 |
| | anchor | right 16px, **bottom 23px** (raised so the lower half's 44px target clears) | left 16px, bottom 14px | HANDOFF R3; READINESS eng 1 (canvas 390 still draws bottom 14: superseded) |
| | corner | bottom-right of the art band | bottom-left of the art band | READINESS eng 1 |
| | layout | flex column, align-items center | flex row, align-items center, gap 8px | Deck Page 390 / 1300 |
| Plate (`data-door="joined"`) | display | flex, flex-direction column | flex, align-items stretch | Deck Page 390 / 1300 |
| | dimensions | width 26px; height 53px (26 + 1 + 26) | height 26px; width to content | HANDOFF R3; canvas |
| | border | 1px solid `--border-strong` | 1px solid `--border-strong` | canvas |
| | border-radius | 7px | 7px | canvas |
| | background | `--bg` (opaque) | `--bg` (opaque) | canvas; R3-E prose |
| | color | `--fg` | `--fg` | canvas |
| | order of halves | ⇄ (top) over ⛶ (bottom) | ⛶ Card details │ ⇄ Change commander | HANDOFF R3 |
| Divider | element | `aria-hidden` span | `aria-hidden` span | canvas |
| | dimensions | height 1px (full width) | width 1px (full height) | canvas |
| | background | `--border-strong` | `--border-strong` | canvas; HANDOFF R3 "hairline" |

### 1.2 Card details half (`FullCardTrigger`'s existing button)

| Element | Property | Mobile | Desktop | Source |
|---|---|---|---|---|
| Half box | layout | flex, center/center | flex, align-items center, gap 6px | canvas |
| | dimensions | height 26px (visible), width 26px | height 26px (visible), padding 0 9px | canvas |
| | hit target | 44px tall | 44px tall | HANDOFF R3 |
| Glyph ⛶ | font-size | 14px | 14px | canvas |
| | line-height | 1 | 1 | canvas |
| | color | `--fg` (inherited) | `--fg` (inherited) | canvas |
| Label | text | — (icon only) | existing FullCardTrigger label ("Card details"), not a new key | canvas |
| | typography | — | mono 11px | canvas |
| Behavior | action | the shipped trigger, unchanged | the shipped trigger, unchanged | READINESS eng 1 |

### 1.3 Change commander half (new)

| Element | Property | Mobile | Desktop | Source |
|---|---|---|---|---|
| Half box | layout | flex, center/center | flex, align-items center, gap 6px | canvas |
| | dimensions | height 26px (visible), width 26px | height 26px (visible), padding 0 9px | canvas |
| | hit target | 44px tall (requires bottom inset 23 on the lower half; the ⇄ half is the upper) | 44px tall | HANDOFF R3 |
| Swap icon | element | inline SVG path (two arrows), `aria-hidden` | inline SVG path, `aria-hidden` | HANDOFF R3; canvas |
| | size | 15×15 (15–16px allowed) | 15×15 (15–16px allowed) | canvas; HANDOFF R3 |
| | viewBox | 0 0 24 24 | 0 0 24 24 | canvas |
| | paths | `M4 8h15`, `M15 4l4 4-4 4`, `M20 16H5`, `M9 12l-4 4 4 4` | same | canvas |
| | fill | none | none | canvas |
| | stroke | `currentColor` (canvas: `--fg`) | `currentColor` (canvas: `--fg`) | HANDOFF R3 |
| | stroke-width | 2 | 2 | canvas |
| | stroke-linecap / linejoin | round / round | round / round | canvas |
| | display | block, flex none, centred in its box | block, flex none | canvas; R3-E |
| Label | copy key | — (icon only) | `door.single` / pair `door.pair` | copy; canvas `doorLabel` |
| | typography | — | mono 11px | canvas |
| | color | — | `--fg` (inherited) | canvas |
| Accessible name | copy key | `door.aria` | `door.aria` (visible label also present) | copy |
| Action | press | opens the Change commander sheet (§2) | same | HANDOFF §2 |

### 1.4 Door conditional rendering

| Condition | Mobile | Desktop | Source |
|---|---|---|---|
| `CHANGE_COMMANDER_ENABLED` off | today's `FullCardTrigger` alone: no ⇄ half, no divider; size and place of the shipped trigger unchanged | same | READINESS-audit F6 |
| Deck has no commander crop | ⛶ half absent; plate renders the ⇄ half alone | same | READINESS eng 1 |
| Pair deck | label key `door.pair` (phone: icon only) | `door.pair` | canvas; STATES 2 |
| Brew with `Commit as v1` in the row | plate unchanged; action row unchanged | same | STATES 27; R3-E |
| Hover / focus | — (not specified) | — (not specified) | — |

---

## 2 · The sheet — ModalChrome shell

| Element | Property | Mobile | Desktop | Source |
|---|---|---|---|---|
| Container | component | `ModalChrome`, no `mark` | `ModalChrome` at the **700** slot (`WIDTH_CLASS`), no `mark` | HANDOFF §2 |
| Scrim | background | color-mix(in oklab, `--bg` 72%, transparent) | same | Sheet canvas |
| Sheet | position | absolute, left 0, right 0, top 52px, bottom 0 | relative, width 700px, max-height 708px | Sheet canvas `sheetBox` |
| | background | `--surface-raised` | `--surface-raised` | HANDOFF §2; canvas |
| | border | border-top 1px solid `--border-strong` | 1px solid `--border-strong` | canvas |
| | border-radius | 14px 14px 0 0 | 14px | canvas |
| | box-shadow | 0 40px 100px rgba(0,0,0,0.7) | same | canvas |
| | overflow | hidden | hidden | canvas |
| | layout | flex column | flex column | canvas |
| Header row | min-height | 43px | 43px | HANDOFF §2; canvas `headRow` |
| | padding | 0 16px 0 18px | 0 16px 0 18px | canvas |
| | layout | flex, align center, gap 10px, flex none | same | canvas |
| | border-bottom | 1px solid `--border` | same | canvas |
| Title (h2) | copy key | `sheet.title.single` / `sheet.title.pair` (unchanged in confirm) | same | copy; HANDOFF §3 |
| | typography | display (`--display`), 700, 16px, lh 1.2 | same | canvas |
| | color | `--fg` | `--fg` | canvas |
| | overflow | nowrap, ellipsis, min-width 0 | same | canvas |
| Aside | content | the deck's name (data, no key) | same | HANDOFF §2 |
| | typography | mono 11.5px | mono 11.5px | canvas |
| | color | `--fg-faint` | `--fg-faint` | canvas |
| | overflow | nowrap, ellipsis, min-width 0 | same | canvas |
| Close × | dimensions | 44×44, margin-left auto, margin-right -10px | same | canvas |
| | typography | mono 14px | mono 14px | canvas |
| | color | `--fg-faint` | `--fg-faint` | canvas |
| | behavior | × and Escape cancel (also in confirm) | same | HANDOFF §3 |
| `backLabel` | value | defaults to title → a card opened from the sheet reads `← Change commander` | same | HANDOFF §2, R3 |
| Body | padding | 16px 18px 22px | 16px 18px 22px | HANDOFF §2.1; canvas `bodyBox` |
| | layout | flex column, gap 16px, flex 1, min-height 0 | same | canvas |

### 2.A Sheet behind a stacked card (R3-C)

| Element | Property | Mobile | Desktop | Source |
|---|---|---|---|---|
| Sheet | background | `--surface-sunken` | `--surface-sunken` | Sheet canvas (`behind`) |
| | border color | border-top 1px solid `--border` | `--border` | canvas |
| Header row | opacity | 0.55 | 0.55 | canvas |
| Body | opacity | 0.35 | 0.35 | canvas |
| Card modal | component | existing `CardModal`, unchanged, `stacked`, `backLabel="Change commander"` | same | HANDOFF R3 |
| | geometry | sheet from top 96px, close control unchanged; this sheet's strip above is the way back | 820 two-column modal; close slot becomes the `← Change commander` pill | canvas R3-C prose |
| | opened by | every candidate name, the expanded names, the confirm's plates | same | HANDOFF R3, §2.3, §3 |
| | siblings (Prev/Next) | the list's names in drawn order | same | HANDOFF §2.2, R3 |
| | registration | through `ModalChrome` as `ReceiptModal` does | same | HANDOFF R3; READINESS eng 2 |

---

## 3 · List body (§2.1)

### 3.1 Lede block

| Element | Property | Mobile | Desktop | Source |
|---|---|---|---|---|
| Wrapper | layout | flex column, gap 6px | same | canvas |
| Lede | copy key | `sheet.lede.single` / `sheet.lede.pair` | same | copy |
| | typography | sans 13.5px, lh 1.55, text-wrap pretty | same | HANDOFF §2.1; canvas |
| | color | `--fg-body` | `--fg-body` | same |
| Counted note | copy key | `sheet.counted(n)` | same | copy |
| | typography | mono 10.5px, lh 1.55, text-wrap pretty | same | canvas |
| | color | `--fg-faint` | `--fg-faint` | HANDOFF §2.1 |
| | rendering | once here; no row repeats it | same | HANDOFF §2.1 |

### 3.2 Owns-none line

| Element | Property | Mobile | Desktop | Source |
|---|---|---|---|---|
| Line | copy key | `sheet.ownsNone` | same | copy |
| | typography | mono 11px | mono 11px | HANDOFF §2.1; canvas |
| | color | `--fg-muted` | `--fg-muted` | same |
| | margin | 0 | 0 | canvas |
| | rendering | only when there is no Yours group; sits above To buy | same | HANDOFF §2.1; STATES 6 |

### 3.3 Group (section)

| Element | Property | Mobile | Desktop | Source |
|---|---|---|---|---|
| Section | layout | flex column | flex column | canvas |
| | order | Yours, then To buy | same | HANDOFF §2.1 |
| | rendering | a group with no rows is not drawn | same | HANDOFF §2.1 |
| Heading row | component | `SheetGroupHeading as="h3"` (`src/components/ui/sheet-group.tsx`), the swap sheet's `StandInGroup` heading | same | Hugh's ruling, 2026-09-25 |
| | layout | flex, align baseline, space-between, gap 10px | same | canvas |
| | padding-bottom | 6px | 6px | Hugh's ruling, 2026-09-25; was 8px (canvas) |
| | border-bottom | 1px solid `--border` | same | Hugh's ruling, 2026-09-25; was `--elevated` (HANDOFF §2.1) |
| Heading (h3) | copy key | `sheet.groupYours(n)` / `sheet.groupBuy(n)`; n = whole group count | same | copy; HANDOFF §2.5 |
| | typography | mono 400, 9.5px, letter-spacing 0.12em, uppercase | same | Hugh's ruling, 2026-09-25; was 10.5px / 0.16em (HANDOFF §2.1) |
| | color | `--fg-faint` | `--fg-faint` | same |
| Right note | content | canvas: `by figure`; pair To buy: `a half to buy` (no key in the copy file) | same | canvas |
| | typography | mono 10px, white-space nowrap | same | canvas; Hugh's ruling, 2026-09-25 |
| | color | `--fg-locked` | `--fg-locked` | HANDOFF §2.1 |

### 3.4 Show all / Show fewer (both groups)

Hugh's ruling, 2026-09-25: each group draws its first 5 and takes the swap sheet's toggle. This replaces the
handoff's §2.5 `Show more` (+8, To buy only, focus to the first new row).

| Element | Property | Mobile | Desktop | Source |
|---|---|---|---|---|
| Control | component | `SheetGroupToggle` (`src/components/ui/sheet-group.tsx`), the swap sheet's `StandInGroup` toggle | same | Hugh's ruling, 2026-09-25 |
| | layout | flex, align center, gap 8px, full width, border-bottom 1px `--border` | same | swap sheet |
| | min-height | 44px | 34px | swap sheet |
| | padding-left | 68px (the rows' name column: 56px thumb + 12px gap) | same | Hugh's ruling, 2026-09-25 |
| | typography | 12.5px, weight 500 | same | swap sheet |
| | color | `--accent`; hover `--accent-hover` | same | swap sheet |
| Label | copy key | `sheet.showAll(n)`, n = whole group count; expanded: `sheet.showFewer` | same | Hugh's ruling, 2026-09-25 |
| Caret | glyph | `▾` folded, `▴` expanded, 10px, `--fg-faint`, aria-hidden | same | swap sheet |
| Behavior | press | expands the group in place; pressed again, folds it back to 5 | same | Hugh's ruling, 2026-09-25 |
| | aria | `aria-expanded` | same | swap sheet |
| | rendering | under each group longer than 5; none under a group of 5 or fewer | same | Hugh's ruling, 2026-09-25 |

### 3.5 Order and length (§2.4, §2.5)

| Rule | Value | Source |
|---|---|---|
| Sort | group(owned) → figure desc → name asc | HANDOFF §2.4 |
| Yours | every half owned (free, held, or in this deck); first 5 | HANDOFF §2.4; Hugh's ruling, 2026-09-25 (was drawn whole) |
| To buy | any half to buy (a half-owned pair sorts here whatever its figure); first 5 | HANDOFF §2.4; H1; Hugh's ruling, 2026-09-25 (was 8) |
| Price | never orders | HANDOFF §2.4 |
| Mana value | never orders, filters or groups | HANDOFF R3 |
| Minimum sample | candidates (or pairs) under `MIN_CANDIDATE_DECKS` (N = 20) indexed decks hidden before ranking | READINESS-audit H2 revisited, F10 |
| Candidate availability | read with this deck excluded; a candidate in the 99 bypasses the read | F8 |

---

## 4 · A candidate row (§2.2, R3-A)

### 4.1 Row frame

| Element | Property | Mobile | Desktop | Source |
|---|---|---|---|---|
| Row wrapper | layout | flex column | flex column | canvas |
| | border-bottom | 1px solid `--border` | same | HANDOFF §2.2 |
| Row line | layout | flex, gap 12px, align-items flex-start | same | HANDOFF §2.2; canvas |
| | padding | 11px 0 | 11px 0 | same |

### 4.2 Thumb

| Element | Property | Mobile | Desktop | Source |
|---|---|---|---|---|
| Thumb | dimensions | 56×41 | 56×41 | HANDOFF §2.2 |
| | content | art crop, background cover, center | same | canvas |
| | border-radius | 6px | 6px | HANDOFF §2.2 |
| | border | 1px solid `--border-strong` | same | HANDOFF §2.2 |
| | background (empty) | `--elevated` | `--elevated` | canvas |
| | margin-top | 1px | 1px | canvas |
| | overflow | hidden, flex none | same | canvas |
| | a11y | `aria-hidden`; presentational, not a target | same | HANDOFF §2.2 |
| Pair split | halves | 28px / 28px | 28px / 28px | HANDOFF §2.2 |
| | seam | second half border-left 1px solid `--bg` | same | same |

### 4.3 Column and half lines

| Element | Property | Mobile | Desktop | Source |
|---|---|---|---|---|
| Column | layout | flex 1, min-width 0, flex column, gap 5px | same | canvas |
| Half line (one per half) | layout | flex, wrap, align baseline, column-gap 9px, row-gap 3px, min-width 0 | same | HANDOFF §2.2; canvas |
| `+` prefix (pair's second line) | rendering | second half only | same | HANDOFF §2.2 |
| | typography | sans 13px | sans 13px | canvas |
| | color | `--fg-faint` | `--fg-faint` | same |
| | margin-right | -4px | -4px | canvas |
| Name | component | `CardDetailTrigger` (opens stacked CardModal) | same | HANDOFF §2.2 |
| | typography | sans 14px, 600, lh 1.3 | same | HANDOFF §2.2; canvas |
| | color | `--fg` | `--fg` | same |
| | underline | border-bottom 1px solid `--border-strong` | same | same |
| | min-width | 0 | 0 | canvas |
| Mark | count | exactly one per half; wraps under the name when it must | same | HANDOFF §2.2 |

### 4.4 Marks

| Element | Property | Mobile | Desktop | Source |
|---|---|---|---|---|
| Free | copy key | `sheet.free` | same | copy |
| | layout | inline-flex, align center, gap 6px, flex none | same | canvas |
| | typography | mono 10.5px | same | HANDOFF §2.2 |
| | color | `--fg-body` | `--fg-body` | same |
| Free dot | dimensions | 6×6, radius 50% | same | same |
| | background | `--success` | `--success` | same |
| Held | component | `AvailabilityMarker` row density, verbatim | same | HANDOFF §2.2 |
| | typography | mono 10.5px, flex none, set on the mount: row density sets no type and rides its host, which here is the row's sans | same | canvas; Hugh's staging walk, 2026-09-25 |
| | canvas values | mono 10.5px, `--avail-hard-fg`, gap 6, 6×6 diamond (rotate 45°) `--avail-hard`, white-space pre | same | canvas |
| To buy | component | `BuyTag variant="row"` with price | same | HANDOFF §2.2 |
| | canvas values | mono 9.5px, radius 4px, padding 1px 5px, `--warning` on color-mix(`--warning` 13%); `·` `--border-strong` padding 0 3px; price `--fg-body` | same | canvas |
| | no price | BuyTag's own absent/sold-out states | same | STATES 23 |
| In this deck | copy key | `sheet.inDeck` | same | copy |
| | typography | mono 10.5px, flex none | same | HANDOFF §2.2; canvas |
| | color | `--fg-muted`; separator `·` `--border-strong`, padding 0 4px | same | canvas |
| | rendering | replaces the availability mark | same | HANDOFF §2.2; STATES 11 |
| Claim read failed | rendering | marks absent; groups fall back to owned/unowned from the collection | same | STATES 24 |

### 4.5 Mana-value line (R3-A)

| Element | Property | Mobile | Desktop | Source |
|---|---|---|---|---|
| Line | position | between the halves and the figure line | same | HANDOFF R3 |
| | layout | flex, wrap, align center, column-gap 8px, row-gap 3px, min-height 16px | same | canvas |
| Pips | component | `CostPips` size 13, no track, uncapped | same | HANDOFF R3; READINESS eng 8 |
| | run layout | flex, align center, gap 3px, flex none | same | canvas |
| Pair separator `+` | typography | mono 11px, padding 0 3px | same | canvas |
| | color | `--fg-faint` | `--fg-faint` | canvas |
| | rendering | pair only: both halves' runs joined | same | HANDOFF R3 |
| Comparison | copy key | `sheet.manaValueRel(mv, current, currentName)` | same | copy |
| | typography | mono 11px, lh 1.4 | same | HANDOFF R3; canvas |
| | color | `--fg-muted` | `--fg-muted` | same |
| | value | `cards.cmc` (pair: summed); never parsed from the cost | same | F7 |

### 4.6 Figure line

| Element | Property | Mobile | Desktop | Source |
|---|---|---|---|---|
| Line | layout | flex, wrap, align center, space-between, column-gap 12px, row-gap 6px | same | HANDOFF §2.2; canvas |
| | margin-top | 2px | 2px | HANDOFF §2.2 |
| Figure (button) | copy key | `sheet.figure(n, of, pair)`; aria `sheet.figureAria(n, of, name)` | same | copy |
| | typography | mono 12px | mono 12px | HANDOFF §2.2 |
| | color | `--fg-body` | `--fg-body` | same |
| | layout | inline-flex, align center, gap 7px | same | canvas |
| | height | 36px (min-height) | 36px | HANDOFF §2.2 |
| | hit area | 44px via the chip's `after:` inset | same | HANDOFF §2.2 |
| | underline | text border-bottom 1px dotted `--fg-faint` | same | same |
| | cursor | pointer | pointer | canvas |
| Caret | glyph | `▾` closed / `▴` open | same | HANDOFF §2.2 |
| | font-size | 10px | 10px | same |
| | color | `--fg-faint` | `--fg-faint` | canvas |
| `no deck data` | rendering | — not drawn (H2 revisited hides such candidates) | — | READINESS-audit H2, F10 |
| Choose | copy key | `sheet.choose`; aria `sheet.chooseAria(name)` | same | copy |
| | style | ghost | ghost | HANDOFF §2.2 |
| | height | 36px (44 hit) | 36px (44 hit) | same |
| | padding | 0 14px | 0 14px | canvas |
| | margin-left | auto | auto | canvas |
| | border | 1px solid `--border-strong` | same | canvas |
| | border-radius | 8px | 8px | canvas |
| | typography | sans 12.5px, 600 | same | HANDOFF §2.2 |
| | color | `--fg` | `--fg` | canvas |
| | action | replaces the body with the confirm (§6) | same | HANDOFF §3 |
| Hover / focus | all row controls | — (not specified) | — | — |

### 4.7 Expanded figure (§2.3)

| Element | Property | Mobile | Desktop | Source |
|---|---|---|---|---|
| Plate | position | inline under the row line, inside the row wrapper | same | HANDOFF §2.3 |
| | margin | 0 0 12px 68px (indent = thumb + gap) | same | canvas; HANDOFF §2.3 |
| | padding | 11px 13px 13px | same | HANDOFF §2.3 |
| | border-radius | 9px | 9px | same |
| | background | `--surface-sunken` | same | same |
| | border | 1px solid `--border` | same | same |
| | layout | flex column, gap 9px | same | canvas |
| Caption | copy key | `sheet.expandCaption(n, short)` | same | copy |
| | typography | mono 10px, letter-spacing 0.12em, uppercase | same | HANDOFF §2.3; canvas |
| | color | `--fg-faint` | `--fg-faint` | canvas |
| Names grid | columns | repeat(2, minmax(0,1fr)) | repeat(3, minmax(0,1fr)) | HANDOFF §2.3; canvas `namesGrid` |
| | column-gap | 14px | 14px | canvas |
| Name | component | `CardDetailTrigger` | same | HANDOFF §2.3 |
| | typography | sans 12.5px, lh 1.35 | same | same; canvas |
| | color | `--fg-body` | `--fg-body` | same |
| | padding | 3px 0 | same | canvas |
| | overflow | nowrap, ellipsis | same | canvas |
| | order | alphabetical | same | HANDOFF §2.3 |
| Behavior | open | one row open at a time; opening another closes the first | same | HANDOFF §2.3; STATES 4 |

---

## 5 · Loading, failure and none states

### 5.1 Loading (3c)

| Element | Property | Mobile | Desktop | Source |
|---|---|---|---|---|
| Lede | copy key / type | `sheet.lede.*`, sans 13.5 lh 1.55 `--fg-body` | same | canvas |
| Counted note | rendering | — | — | canvas |
| Status block | role | `status` | `status` | STATES 8; canvas |
| | layout | flex column | same | canvas |
| Caption | copy key | `sheet.loading` | same | copy |
| | typography | mono 10.5px | same | canvas |
| | color | `--fg-faint` | `--fg-faint` | canvas |
| | padding-bottom / border-bottom | 6px / 1px solid `--border`, the group heading's rule it stands in for | same | Hugh's ruling, 2026-09-25; was 8px / `--elevated` (canvas) |
| Skeleton row (×4) | layout | flex, gap 12px, align flex-start | same | canvas |
| | padding | 12px 0 | same | canvas |
| | border-bottom | 1px solid `--border` | same | canvas |
| | opacity | 1, 0.8, 0.6, 0.4 | same | canvas |
| | motion | the four rows breathe together on one wrapper (`anim-skeleton`: opacity 1 to 0.55 over 1.4s, in-out, looping), over their stepped opacity; still under reduced motion | same | Hugh, 2026-10-12 |
| Skeleton thumb | dimensions / radius / bg | 56×41, 6px, `--elevated` | same | canvas |
| Skeleton text column | layout | flex 1, column, gap 9px, padding-top 3px | same | canvas |
| | bar 1 | width 52%, height 11px, radius 3px, `--elevated` | same | canvas |
| | bar 2 | width 34%, height 9px, radius 3px, `--elevated` | same | canvas |
| Skeleton button | dimensions | 76×36, radius 8px, border 1px solid `--border`, flex none | same | canvas |

### 5.2 List failure (3d, R3-D — Analysis tab 2c composition)

| Element | Property | Mobile | Desktop | Source |
|---|---|---|---|---|
| Lede | rendering | shown above (`sheet.lede.*`) | same | canvas |
| Block | role | `alert` | `alert` | canvas |
| | layout | flex column, align center, text-align center | same | canvas |
| | padding | 30px 8px 10px | same | canvas |
| Mark | element | swap-icon SVG (same paths as the door), `aria-hidden` | same | R3-D; canvas |
| | size | 56×56, viewBox 0 0 24 24 | same | HANDOFF R3; canvas |
| | stroke | `--fg-muted`, width 1.4, round caps/joins, fill none | same | canvas |
| | opacity | 0.3 | 0.3 | HANDOFF R3 |
| Heading (h3) | copy key | `sheet.failed.heading` | same | copy |
| | typography | display 700, 21px, lh 1.25, text-wrap balance | same | HANDOFF R3; canvas |
| | color | `--fg` | `--fg` | canvas |
| | margin-top | 22px | 22px | canvas |
| Body | copy key | `sheet.failed.body` | same | copy |
| | typography | sans 13.5px, lh 1.6 | same | canvas |
| | color | `--fg-body` | same | canvas |
| | margin-top / max-width | 11px / 460px | same | canvas |
| Try again | copy key | `sheet.failed.cta` | same | copy |
| | style | bone: background `--fg`, color `--bg` | same | HANDOFF R3; canvas |
| | min-height | 44px | 44px | same |
| | padding / radius | 0 22px / 8px | same | canvas |
| | typography | sans 600, 14.5px | same | canvas |
| | margin-top | 20px | 20px | canvas |

### 5.3 None (3b)

| Element | Property | Mobile | Desktop | Source |
|---|---|---|---|---|
| Lede / counted | rendering | — (not drawn in the none state) | — | canvas |
| Block | layout | flex column, gap 10px, padding 18px 0 6px | same | canvas |
| Head | copy key | `sheet.none.head(identity)` / `sheet.nonePair.head` | same | copy |
| | typography | display 700, 18px, lh 1.3 | same | canvas |
| | color | `--fg` | `--fg` | canvas |
| Body | copy key | `sheet.none.body` / `sheet.nonePair.body` | same | copy |
| | typography | sans 13.5px, lh 1.6 | same | canvas |
| | color | `--fg-muted` | `--fg-muted` | canvas |

---

## 6 · The confirm (§3, R3-B)

### 6.1 Frame and back

| Element | Property | Mobile | Desktop | Source |
|---|---|---|---|---|
| Body | rendering | replaces the list body in the same sheet; title unchanged | same | HANDOFF §3 |
| Back link | copy key | `confirm.back` | same | copy |
| | position | top of body | same | HANDOFF §3 |
| | layout | inline-flex, align-self flex-start, align center, gap 7px, min-height 32px | same | canvas |
| | typography | mono 11px | same | HANDOFF §3 |
| | color | `--fg-faint` | same | same |
| | behavior | restores the list with scroll position and the open row kept | same | HANDOFF §3 |

### 6.2 Plates

| Element | Property | Mobile | Desktop | Source |
|---|---|---|---|---|
| Plates row | layout | flex, align flex-start, justify center, gap 14px | same | HANDOFF §3; canvas |
| | padding | 4px 0 2px | same | canvas |
| Side (out / in) | layout | flex column, align center, gap 8px, min-width 0 | same | canvas |
| Side label | copy key | out: `confirm.out` / `confirm.outPair` / trade `confirm.tradeOut`; in: `confirm.in` / `confirm.inPair` / trade `confirm.tradeIn` | same | copy |
| | typography | mono 10px, letter-spacing 0.12em, uppercase | same | HANDOFF §3 |
| | color | out `--warning`; in `--success` | same | same |
| Tiles wrapper | layout | flex, gap 6px | same | HANDOFF §3; canvas |
| Tile | style | `ReceiptTile`-style full card | same | HANDOFF §3 |
| | width (single) | 104px | 120px | HANDOFF §3; canvas `tileW` |
| | width (pair side, two tiles) | 68px each | 84px each | same |
| | layout | flex column, gap 6px | same | canvas |
| Tile art | aspect-ratio | 63 / 88 | same | HANDOFF §3 |
| | border-radius | 8px | 8px | same |
| | border | 1px solid `--border-strong` | same | canvas |
| | background (empty) | `--elevated` | same | canvas |
| | action | opens the stacked CardModal | same | HANDOFF §3, R3 |
| Tile name | typography | sans 11.5px, lh 1.3, centered | same | HANDOFF §3; canvas |
| | color | `--fg-body` | same | same |
| | pair names | `shortName` | same | READINESS eng 9 |
| Pips under side | component | `CostPips` 13, runs joined by `+` for a pair; centered | same | HANDOFF R3; canvas |
| In-side comparison | copy key | `sheet.manaValueRel(…)` (in side only) | same | HANDOFF R3 |
| | typography | mono 11px, lh 1.4, centered | same | canvas |
| | color | `--fg-muted` | same | canvas |
| | layout | pips + comparison in a column, gap 4px | same | canvas |
| Glyph between | content | `→`; `⇄` for a trade | same | HANDOFF §3 |
| | typography | mono 18px | same | same |
| | color | `--fg-faint` | same | same |
| | alignment | align-self center, margin-top -30px, flex none, `aria-hidden` | same | canvas |

### 6.3 Sentence block

| Element | Property | Mobile | Desktop | Source |
|---|---|---|---|---|
| Block | layout | flex column, gap 9px | same | canvas |
| | rule | border-top 1px solid `--border`, padding-top 12px | same | HANDOFF §3; canvas |
| Sentence | copy key | `confirm.sentence` / `confirm.sentencePair` / `confirm.trade` | same | copy |
| | typography | sans 14px, lh 1.6, text-wrap pretty | same | HANDOFF §3 |
| | color | `--fg` | same | same |
| Buy line | copy key | `confirm.buy(short)` + `BuyTag` | same | copy; HANDOFF §3 |
| | rendering | only when a half is to buy; pair price = sum of halves to buy | same | HANDOFF §3; STATES 13 |
| | layout | flex, wrap, align center, gap 8px | same | canvas |
| | typography | sans 13px, lh 1.55 | same | canvas |
| | color | `--fg-body` | same | canvas |
| | BuyTag (canvas) | mono 10px, radius 4px, padding 1px 5px, `--warning` on color-mix(`--warning` 13%) | same | canvas |
| Where it lands | copy key | `confirm.lands(oldShort)` / `confirm.landsTrade` / brew `confirm.brew` | same | copy; STATES 16 |
| | typography | mono 10.5px, lh 1.6, text-wrap pretty | same | HANDOFF §3; canvas |
| | color | `--fg-faint` | same | same |

### 6.4 Actions

| Element | Property | Mobile | Desktop | Source |
|---|---|---|---|---|
| Actions row | layout | flex column (stacked), gap 8px, margin-top auto (at the sheet's foot) | flex row, align center, gap 10px, padding-top 4px | HANDOFF §3; canvas `footRow` |
| Primary | copy key | `confirm.cta(short)` / `confirm.ctaPair(a, b)`; writing `confirm.pending`; failed `confirm.failedRetry` | same | copy |
| | style | bone: background `--fg`, color `--bg` | same | HANDOFF §3; canvas |
| | min-height | 44px | 44px | same |
| | padding / radius | 0 20px / 8px | same | canvas |
| | typography | sans 600, 14px, centered | same | canvas |
| | writing state | opacity 0.6, never disabled | same | HANDOFF §3; STATES 17 |
| Secondary | copy key | `confirm.backList` | same | copy |
| | style | ghost | ghost | HANDOFF §3 |
| | min-height | 44px | 44px | canvas |
| | padding / radius | 0 18px / 8px | same | canvas |
| | border | 1px solid `--border-strong` | same | canvas |
| | typography | sans 500, 13.5px | same | canvas |
| | color | `--fg-muted` | same | canvas |
| | behavior | restores the list with scroll and the open row kept | same | HANDOFF §3 |
| Failure line | copy key | `confirm.failed(oldShort)` | same | copy |
| | position | BELOW the actions (last in the body) | same | HANDOFF R3; canvas |
| | role | `alert` | `alert` | canvas |
| | typography | mono 11px, lh 1.55 | same | HANDOFF §3; canvas |
| | color | `--danger` | same | canvas |
| | rendering | failed only; the confirm stays | same | HANDOFF §3; STATES 18 |
| On success | behavior | sheet closes; page refreshes; focus to the banner's commander line; announce `confirm.announced(nu)` | same | HANDOFF §3 |

---

## 7 · State coverage (door, list, confirm)

| # | Surface | State | Trigger | Drawn |
|---|---|---|---|---|
| 1 | Header | single commander | deck has one commander; switch on | 1a (door label `door.single`) |
| 2 | Header | pair | deck has partner commanders | 1b (`door.pair`) |
| 27 | Header | door, joined plate | switch on; brew with Commit as v1; pair; no crop → ⛶ half absent; switch off → trigger alone (F6) | R3-E |
| 3 | List | several | candidates across owned / held / in 99 / to buy | 2a |
| 4 | List | a figure open | figure pressed; one open at a time | 2b |
| 5 | List | pair deck, mixed pair | pair deck; a pair with one half to buy sorts in To buy | 2c |
| 6 | List | only unowned | no Yours rows | 3a (`sheet.ownsNone`) |
| 7 | List | none, single / pair | no candidate of exactly this identity | 3b (`sheet.none` / `sheet.nonePair`) |
| 8 | List | loading | candidates read in flight | 3c (lede + 4 skeleton rows, `role=status`) |
| 9 | List | failed | candidate read fails | 3d, R3-D |
| 10 | List | no deck data | candidate with no indexed decks — **not drawn**: hidden under `MIN_CANDIDATE_DECKS` (H2 revisited, F10) | 2a (Kaheera, superseded) |
| 11 | List | candidate in the 99 | candidate is a `deck_cards` row of this deck | 2a (Pantlaza); `sheet.inDeck` |
| 12 | List | Show all pressed | a group has more than 5 | the whole group; `Show fewer` folds it back to 5 (Hugh's ruling, 2026-09-25) |
| 25 | List | a name opened | any candidate / expanded / plate name pressed | R3-C, stacked CardModal |
| 26 | Row / confirm | mana value | always | R3-A, R3-B |
| 24 | List | claim read failed | availability read errors | marks absent; groups from collection ownership |
| 23 | List / confirm | no price for a to-buy half | price missing | BuyTag's own absent/sold-out states |
| 13 | Confirm | leaves / leads, to buy | Choose on a candidate with a half to buy | 4a (buy line) |
| 14 | Confirm | trade | Choose on a candidate in the 99 | 4b (`⇄`, trade labels) |
| 15 | Confirm | pair | pair deck | 4c (two plates a side, 68/84) |
| 16 | Confirm | brew | deck has no version | 4c (`confirm.brew`) |
| 17 | Confirm | writing | primary pressed, write in flight | `confirm.pending` at 0.6, not disabled |
| 18 | Confirm | failed | write fails | 4d, R3-D (danger line below actions; primary `confirm.failedRetry`) |

---

## Gap report (pre-PR gate, 2026-09-25)

Verified row by row against this table: about 218 of 314 property rows matched, and about 96 did
not. The 96 were grouped into 74 visual gaps (several rows per element), plus 1 state gap (27: with no commander crop the door was not drawn at all, so such a
deck could not change its commander). The confirm pass left 1 gap (33: a `className` replaced
`CostPips`' own display and gap). It is fixed, and `probe-change-commander.mjs` now asserts the run's
computed `display: flex` / `gap: 3px`; reverting the fix fails it at both widths.

**Deliberate, and not changed here:**

| Item | Design | Build | Why |
|---|---|---|---|
| 8–12 | sheet max-height 708, header padding and gap, title 16/1.2, aside 11.5 | `ModalChrome` as shipped | Shared by every sheet in the app; a change there is not this feature's to make |
| 13 | aside (the deck's name) on the phone | desktop only | The phone's 43px header cut the title to "Change c…"; approved by the-99-d9 on the verdict-lean precedent |
| 18 | `sheet.more(8)` | retired | Hugh's ruling, 2026-09-25: the swap sheet's `Show all {n}` / `Show fewer` replaces it (§3.4) |
| 59 | back link min-height 32 | 44 | The touch floor every control in the app keeps |
| 67 | a pair's price summed | summed only when both halves carry a live normal price; otherwise a tag per half | A sum over a sold-out, foil-only or unpriced half quotes a price the feed never gave |
| 5 | desktop ⇄ half named `door.aria` | named by its visible label | Label-in-name: the visible words are "Change pair" on a pair deck |
| 74 (focus) | focus moves to the banner's commander line | not in this PR | The banner line is PR 4's |

**Copy structure found here and added to the module** (sent to `/copy-review`): `sheet.groupNote`
("by figure") and `sheet.groupNotePairBuy` ("a half to buy"), which the canvas draws and the copy
file omits.
