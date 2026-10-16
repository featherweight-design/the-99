# Design Property Table: Card scan, the review (PR 4)

Source: `design/design_handoff_the99_card_scan/` (R1, READINESS 🟢 2026-10-16). Values are from the CSS and markup inside
`R1 - Review-Phone.dc.html` (R3, R4, L1–L4) and `R1 - Desktop.dc.html` (the W2/W3 list under the webcam panel; the
desktop sheet overrides `.dsh …`). The handoff's own `design-tables/card-scan.md` is quoted where it disagrees with the
drawn CSS; the drawn CSS wins and the row says so. Plan: `docs/superpowers/plans/2026-10-16-card-scan.md` PR 4.

Scope: the review list (L1), the name press and the fix region (L2), Normal's printing step (L3), the receipt (L4), and
list folding (R3 Fast ×2, R4 Normal "already on the list"). V6 **None of these** and L2 **Search for it instead** both
open search by name (plan, audit resolution). Out: everything in the viewfinder (D6, D7, V1–V9, R1, R2, the tray),
W4/W6 (PR 5).

Mobile = phone 390×844, the Add cards sheet full screen (`.sh`). Desktop = 1300, the 480px side sheet (`.dsh`).

**Almost everything here is the SHIPPED Add cards list** (`add-cards-sheet.tsx`, `printing-region.tsx`,
`added-receipt.tsx` per the handoff's own CSS comments). The boards redraw it, so rows marked *shipped* are a check
that nothing moved, not a spec for new work. The new elements are the scanned line's name press, the fix region, the
scan photo, the "On the list" tile mark and `Search for it instead`.

## Colour legend (hex as drawn → Kamigawa token, from `globals.css`)

| Hex | Token |
|---|---|
| `#FF4D9A` | `var(--accent)` |
| `#D33E7E` | `var(--accent-strong)` |
| `#6FA368` | `var(--success)` |
| `#E0913C` | `var(--warning)` |
| `#E6E8F0` | `var(--fg)` |
| `#B1B6C7` | `var(--fg-body)` |
| `#959AAD` | `var(--fg-muted)` |
| `#6F7486` | `var(--fg-faint)` |
| `#7D8294` | `var(--fg-placeholder)` |
| `#606476` | `var(--fg-locked)` (desktop "newest first") |
| `#0E0F14` | `var(--bg)` (line fill, accent button text) |
| `#12141B` | `var(--surface-rail)` (sheet foot, combined notice) |
| `#16181F` | `var(--surface)` (sheet) |
| `#101219` | `var(--surface-sunken)` (search field, Scan press, thumb backing) |
| `#20222A` | `var(--elevated)` (close ✕) |
| `#181C26` | `var(--border)` (line, region rule, notice) |
| `#262A35` | `var(--border-strong)` (chip, Foil, stepper, foot rule, secondary buttons) |
| `#343843` | `var(--border-dashed)` |
| `#2A241C` | no token: the scan photo's backing (camera-feed warm brown) |
| `rgba(111,163,104,.14)` | `--success` at 14% (receipt tick disc) |

## Component: Add cards sheet (frame, shipped)

### Sheet

| Property | Mobile | Desktop |
|---|---|---|
| position | absolute, inset 0 (full screen) | absolute right 0, top/bottom 0, width 480px |
| background | `var(--surface)` | `var(--surface)` |
| border | — | left 1px `var(--border-strong)` |
| box-shadow | — | `-24px 0 60px rgba(0,0,0,.45)` |
| layout | flex column | flex column |
| role / aria-label | `dialog`, "Add cards" (`collectionEditCopy.add.title`) | same |

### Head (`.shh`)

| Property | Mobile | Desktop |
|---|---|---|
| padding | 16px 18px 12px | 20px 22px 14px |
| gap | 12px | 12px |
| title font | 700 19px Chakra Petch | 700 21px Chakra Petch |
| ✕ size | 44×44, radius 10px | 34×34, radius 8px |
| ✕ colours | bg `var(--elevated)`, fg `var(--fg-muted)`, 14px | same, 13px |
| ✕ aria-label | `add.closeAria` | same |
| L4 | search row is NOT drawn on the receipt (head + body only) | — (L4 not drawn on desktop) |

### Search row (`.srow`) — unchanged by PR 4, drawn on R3, R4, L1–L3

| Property | Mobile | Desktop |
|---|---|---|
| padding | 0 18px | 0 22px |
| gap | 8px | 8px |
| field | flex 1, height 48px, radius 8px, bg `var(--surface-sunken)`, 1px `var(--border-strong)`, padding 0 14px, gap 10px, 16px `var(--fg-placeholder)` | height 46px, 14px |
| placeholder | `add.searchPlaceholder` | same |
| Scan press | PR 3 (built); still drawn beside the search on every review frame | same |

### Body (`.sb`)

| Property | Mobile | Desktop |
|---|---|---|
| padding | 12px 18px | 12px 22px (W2/W3 inline `padding-top:10px`) |
| layout | flex column, gap 10px, overflow hidden, flex 1 | same |

### List head (`.lh`)

| Property | Mobile | Desktop |
|---|---|---|
| layout | flex, align baseline, gap 10px, padding-top 6px | same |
| text | `add.listHeading(k)` | same |
| font | 10px IBM Plex Mono, letter-spacing .14em, uppercase, `var(--fg-faint)` | same |
| "newest first" | NOT drawn on the phone (L1, R3, R4) | `add.newestFirst`, margin-left auto, letter-spacing 0, no transform, `var(--fg-locked)` (W2) |

### Lines list (`.lines`)

| Property | Mobile | Desktop |
|---|---|---|
| layout | flex column, gap 8px, no list style | same |
| order | newest first (L1: the batch in scan order reversed) | newest first |

## Component: List line (`.ln`, shipped, with the scanned-line name press)

### Line container

| Property | Mobile | Desktop |
|---|---|---|
| layout | flex column, gap 10px | same |
| radius | 10px | 10px |
| border | 1px `var(--border)` | same |
| background | `var(--bg)` | same |
| padding | 12px | 12px |
| open (`.ln.on`, L2/L3) | border-color `var(--accent)` | same (W-desktop open line not drawn) |

### Top row (`.lt`)

| Property | Mobile | Desktop |
|---|---|---|
| layout | flex, align flex-start, gap 12px | same |
| thumb | 30×42, radius 4px, bg `var(--surface-sunken)`, img cover | same |
| name column (`.lnm`) | flex column, gap 6px, flex 1, min-width 0 | gap 4px (inline on W2) |
| ✕ (`.lx`) | 44×44, margin -8px -8px 0 0, transparent, `var(--fg-faint)`, 13px | 28×28, margin 0 |
| ✕ aria-label | `add.removeLineAria(card)` | same |

### Name press (`.cardb`) — NEW on scanned lines

| Property | Mobile | Desktop |
|---|---|---|
| element | `button`, `aria-expanded` false / true when the fix is open (L2) | `button`, no `aria-expanded` drawn |
| display | inline-flex, align center, gap 6px, align-self flex-start, max-width 100% | same |
| min-height | 24px (drawn) — handoff table says 44px | same |
| border / bg / padding | 0 / transparent / 0 | same |
| font | 600 14px IBM Plex Sans, `var(--fg)`, text-align left | same |
| decoration | none drawn — handoff table says "underlined dotted `fg-faint`" | none drawn |
| chevron (`.cv`) | `▾`, aria-hidden, `var(--fg-faint)`, 11px, flex none | same |
| shown on | scanned lines only (`source: "scan"`); a search pick keeps the plain name | same |
| hover/focus | not drawn | not drawn |

### Printing chip (`.chip`, shipped)

| Property | Mobile | Desktop |
|---|---|---|
| size | height 32px, padding 0 10px, radius 7px | height 24px, padding 0 8px, radius 6px |
| border | 1px `var(--border-strong)` | same |
| font | 11.5px IBM Plex Mono, `var(--fg-body)` | 11px |
| text | `SET · #N ▾` (▾ aria-hidden) | same |
| needs a printing (`.chip.need`, L3) | span (not button), 1px DASHED `var(--warning)`, `var(--warning)` text, `add.choosePrinting` | — |

### Controls row (`.lc`, shipped)

| Property | Mobile | Desktop |
|---|---|---|
| layout | flex, wrap, align center, gap 8px | same |
| Foil (`.fo`) | height 44px, padding 0 14px, radius 999px, 1px `var(--border-strong)`, `var(--fg-muted)` 12.5px, gap 6px, `◆` aria-hidden + `add.foil`, `aria-pressed` | height 28px, padding 0 10px, 12px |
| stepper (`.st`) | height 44px, 1px `var(--border-strong)`, radius 9px; − / + cells 44×44 `var(--fg-muted)`; count 36px wide, 400 16px, side rules `var(--border-strong)`, line-height 44px | height 28px, radius 7px; cells 28×28; count 30px wide, 13px, line-height 28px |
| holdings note (`.own`) | below the controls row, as a sibling of `.lc` | inside `.lc`, margin-left auto |
| note colours | 11px `var(--fg-faint)`; `.own.up` `var(--success)` | same |
| note text | `add.newToYou` / `add.owned(have, after)` | same |

## Component: Fix region (L2) — NEW

Opens in place inside the line (`.ln.on`) when the name press is pressed; the other lines fold (`.col`, below).

### Region (`.reg.new` — `.new` is the board's "new element" dashed outline, not a style)

| Property | Mobile | Desktop |
|---|---|---|
| role / aria-label | `group`, "Which card was it?" | not drawn |
| layout | flex column, gap 12px | — |
| border-top | 1px `var(--border)` | — |
| padding-top | 12px | — |

### Question (`.q`)

| Property | Mobile | Desktop |
|---|---|---|
| layout | flex, align center, gap 10px, margin 0 | — |
| font | 13.5px, `var(--fg-muted)` | — |
| text | `scan.fix.question` | — |

### Scan photo (`.photo`)

| Property | Mobile | Desktop |
|---|---|---|
| size | 44×62 (handoff table says 44×60) | — |
| radius | 5px | — |
| background | drawn `#2A241C` (no token); ships `var(--surface-sunken)` (settled in the gap report) | — |
| overflow | hidden, position relative, flex none | — |
| img | absolute, 120%×120%, left -6%, top -4%, cover, rotate(-4deg), filter blur(.6px) brightness(.8) saturate(.8) | — |
| alt | `scan.fix.yourScan` | — |
| note | the filters and rotation simulate a camera frame on a catalog image; the real photo is the scan's own frame | — |

### Tiles (`.tiles` + `.pt`, the shipped printing tile)

| Property | Mobile | Desktop |
|---|---|---|
| container | flex, gap 10px, overflow hidden, `role="radiogroup"` | — |
| tile | button, width 96px, flex none, column, transparent, padding 0, left, `var(--fg)`, `role="radio"`, `aria-checked` | — |
| art (`.a`) | 96px wide, aspect 63/88, radius 10px, inset 0 0 0 1px rgba(0,0,0,.35) | — |
| ticked (`.pt.on .a`) | outline 2px `var(--accent)`, offset 3px | — |
| tick badge (`.bd`) | top 8, right 8, 21×21, radius 5px, bg `var(--accent)`, `var(--bg)` ✓ 11px, aria-hidden | — |
| name (`.t1`) | margin-top 7px, 12px, line-height 1.3; 600 when ticked | — |
| "On the list" (`.t3`, ticked tile only) | margin-top 3px, flex gap 5px, 9.5px IBM Plex Mono, .14em, uppercase, `var(--accent)`; 7×7 `var(--accent)` diamond (rotate 45deg) before; text `scan.fix.onList` | — |
| count | three: the current card (ticked, first) then the two other closest | — |
| behaviour | one press swaps the line's card; the printing goes back to the first (caption) | — |

### Search for it instead (`.tx`)

| Property | Mobile | Desktop |
|---|---|---|
| element | button, border 0, transparent, padding 0, text-align left | — |
| font | 13.5px `var(--accent)` | — |
| min-height | 44px | — |
| text | `scan.fix.search` | — |
| action | opens search by name (plan) | — |

## Component: Folded line (`.col`, shipped printing-step fold)

Drawn on L2 and L3 (phone) and W3 (desktop, while a not-sure pick is open).

| Property | Mobile | Desktop |
|---|---|---|
| layout | flex, align center, gap 12px | same |
| radius / border / bg | 10px / 1px `var(--border)` / `var(--bg)` | same |
| padding | 12px | 10px 12px |
| thumb | 30×42 (`.th`) | same |
| name (`.n`) | flex 1, min-width 0, 600 14px, nowrap, ellipsis | same |
| printing (`.p`) | 11px IBM Plex Mono, `var(--fg-body)`, `SET · #N` | same |
| printing unchosen (L3) | `var(--warning)`, drawn "printing to choose"; ships `add.choosePrinting` (settled in the gap report: no new copy) | — |
| count (`.q`) | 13px `var(--fg-muted)`, `×N` | same |

## Component: Normal's printing step (L3, shipped)

| Property | Mobile | Desktop |
|---|---|---|
| open line | `.ln.on`, chip is `.chip.need` (`add.choosePrinting`) | — |
| after-printing line | 12.5px `var(--fg-muted)` (inline), `add.afterPrinting`; replaces the controls row | — |
| region | `.reg` (no `.new`), `role="group"` aria-label `add.choose.regionLabel` | — |
| question | `add.choose.introPhone(k)` | (desktop: `add.choose.intro(k)`, not drawn) |
| tiles | `.pt` as above, no tick; `.t1` set name + code 10.5px IBM Plex Mono `var(--fg-faint)`; `.t2` `#N` margin-top 2px 10.5px Mono `var(--fg-faint)` | — |
| order | first card opens; the rest fold with "printing to choose" | — |
| foot summary | `add.needsPrinting(card)` replaces the lines/copies count | — |
| Save | `.sv.off` opacity .4, `aria-disabled="true"`, label still `add.save(c)` | — |

## Component: Combined notice (R4, shipped)

| Property | Mobile | Desktop |
|---|---|---|
| element | `p.note`, `role="status"`, margin 0, above the list head | — |
| layout | flex, align center, gap 10px | — |
| radius / border / bg | 8px / 1px `var(--border)` / `var(--surface-rail)` | — |
| padding | 10px 12px | — |
| font | 13px `var(--fg-body)` | — |
| tick | `✓` `var(--success)`, aria-hidden | — |
| text | `add.combined(card, q)` | — |
| pulse | caption names "the shipped … line and pulse"; no pulse drawn | — |

## Component: Sheet foot (`.sf`, shipped)

| Property | Mobile | Desktop |
|---|---|---|
| border-top | 1px `var(--border-strong)` | same |
| background | `var(--surface-rail)` | same |
| padding | 12px 18px 16px | 14px 22px 18px |
| layout | flex, align center, gap 12px, flex none | same |
| summary (`.s`) | flex 1, 12px `var(--fg-muted)`, `add.summary(lines, copies)` | same |
| Save (`.sv`) | height 46px, padding 0 22px, radius 10px, bg `var(--accent)`, `var(--bg)`, 600 15px, `add.save(c)` | height 40px, radius 8px, 14px |
| Save held (`.sv.off`) | opacity .4, `aria-disabled` | same |

## Component: Receipt (L4, shipped `added-receipt.tsx`)

| Property | Mobile | Desktop |
|---|---|---|
| container | `.rcpt`, `role="status"`, flex column, align flex-start, gap 8px, padding 18px 0 | — |
| tick | 40×40 circle, bg `rgba(111,163,104,.14)`, `var(--success)` ✓ 18px, aria-hidden | — |
| title | h4, margin-top 4px, 700 21px Chakra Petch, `add.savedTitle(c)` | — |
| body | 14px `var(--fg-body)`, `add.savedBody(k)` | — |
| counts | 13px IBM Plex Mono `var(--fg-muted)`, `add.countsAfter(from, to)` | — |
| History link | 14px, underline offset 3px, min-height 44px, flex align center, `var(--accent)`, `add.seeInHistory` | — |
| buttons (`.bt`) | flex column, gap 8px, width 100%, margin-top 8px | — |
| Add more (`.b2`) | min-height 44px, radius 8px, 1px `var(--border-strong)`, transparent, `var(--fg)` 14px, `add.addMore` | — |
| Done (`.b1`) | min-height 44px, radius 8px, bg `var(--accent)`, `var(--bg)` 600 14px, `add.done` | — |
| foot | none (no `.sf` on L4) | — |

## State Coverage — the review

| State | Triggering condition | Component rendered | Key props / copy |
|---|---|---|---|
| L1 Review | `Review N` pressed in the viewfinder | Add cards sheet, list of shipped lines, newest first; name is a press on `source: "scan"` lines | `add.listHeading`, `add.summary`, `add.save`, `add.newToYou` / `add.owned`, `add.removeLineAria`, `add.foil` |
| L1 search-pick line | line added by search, not scan | shipped line, name NOT a press | no `source: "scan"` |
| L2 Fix a card | name press on a scanned line | line `.on`, fix region with the scan photo, the scan's top three (current ticked, first), `Search for it instead`; other lines fold | line keeps the scan's frame + top three; `scan.fix.question`, `scan.fix.yourScan`, `scan.fix.onList`, `scan.fix.search`; `aria-expanded=true` |
| L2 swap | a different tile pressed | line takes that card; printing resets to the first | — |
| L2 Search instead | `Search for it instead` | search by name (none of the three match) | `scan.fix.search` |
| V6 None of these | viewfinder not-sure panel, `None of these` | search by name | `scan.view.noneOfThese` (PR 3 drew the press; PR 4 wires it) |
| L3 Printing step, Normal | Normal mode, lines without a printing | first line open with the shipped printing tiles, rest folded "printing to choose", Save held | `add.choosePrinting`, `add.afterPrinting`, `add.choose.introPhone`, `add.choose.regionLabel`, `add.needsPrinting(card)`, Save `aria-disabled` |
| R3 Copies, Fast | the same card added twice in Fast | one line ×2 with the holdings note | `add.owned(have, after)` |
| R4 Copies, Normal | same printing chosen for two lines | the lines fold into one, combined notice above the list | `add.combined(card, q)` |
| R4 different printing | a different printing chosen | stays its own line | — |
| L4 Saved | Save | shipped receipt; one History entry for the batch; Revert takes it all back | `add.savedTitle`, `add.savedBody`, `add.countsAfter`, `add.seeInHistory`, `add.addMore`, `add.done` |
| W2/W3 desktop list | webcam panel open on desktop | the sheet's list under the panel is the review; folds while a pick is open (W3) | `add.newestFirst` shown on desktop |
