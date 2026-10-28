# Design table: Shopping for all decks v2

Handoff: `design/design_handoff_the99_all_decks_cart_v2/` (R1b, approved 2026-10-27). This extends `all-decks-cart.md`; anything not listed here is unchanged.

## Row (desktop)

| Property | Value |
|---|---|
| Grid, By friend | `minmax(0,1.15fr) minmax(0,1.7fr) 64px minmax(0,1.25fr) 100px`, column gap 18 |
| Grid, By card and By deck | `minmax(0,1.15fr) minmax(0,1.55fr) minmax(0,1.1fr) minmax(0,1.15fr) 100px` |
| Row | padding 12px 14px (0 inside a deck group), min height 64, rule `--border` between rows |
| Column header | once above the list, mono 9.5, letter-spacing .12em, uppercase, `--fg-faint`, rule `--border-strong` under it |
| Name | the shipped `CardDetailTrigger`, 14/1.4 `--fg`, dotted `--border-strong` underline, one line |
| Count | mono 13, weight 600, `--fg` |
| Value | mono 11.5/1.5, `--fg-body`; the own fact `--fg-muted` with its count at weight 500 `--fg-body` |
| +N / less | 19px pill, radius 5, 1px `--border-strong`, mono 10.5 weight 500; coarse pointer 44px hit (`TOUCH_HIT`) |
| Opened list | grid name / count, 3px row gap, padding 8px 10px, radius 8, `--surface-sunken`, counts `--fg-muted`, right-aligned |
| Spare press (By card, By deck) | the shipped glyph press at 30×26, radius 6, then the count and names |
| Action stack | column, right-aligned, gap 7: Ask 28px (shipped `.line` size) or `RowEnd` status, then `BuyTag` row |

## Row (phone)

| Property | Value |
|---|---|
| Row | flex, gap 12, padding 12px 14px (0 sides outside a panel) |
| Fact line | grid `44px minmax(0,1fr)`, baseline-aligned; label mono 9.5, .1em, uppercase, `--fg-faint` |
| Lines | name, then `NEED` (`DECK` in By deck), `SPARE` (By friend always; elsewhere only with a spare or while reading), `OWN` (only when owned) |
| Action stack | gap 10: Ask 36px, radius 9, 13px (min width 72); tag 22px tall |

## Friend panel

| Property | Value |
|---|---|
| Panel | 1px `--border-strong`, radius 12, `--bg`; 12px between panels |
| Header | min height 52, padding 9px 8px 9px 14px, `--elevated`; face 30 radius 8; name 15 weight 600; pods mono 11 `--fg-faint`; figure mono 11 `--fg-muted`; chevron 36×36 |
| Fold | the header is the press; folded, no rule under the header |
| Sticky | desktop only: the open panel's header sticks to the list box top |

## Chassis in the cart

The shipped `FilterChassis`, between the view row and the list, inside `data-cart-controls`.

| Slot | Desktop (≥1000) | Phone (<1000) |
|---|---|---|
| Row 1 controls | search field (fills), `Friend ▾`, `Owned ▾` | search field, then the `Filters` button with its count badge |
| Row 1 sort | `Sort · <current> ▾` past the hairline | ⇅ 44px button |
| Friend panel | anchored panel 248 wide: radio **Any friend**, rule, a checkbox row per friend (face 22, name, cards held) | sheet group: **Any friend** across both columns, then the friends in `repeat(2, minmax(0,1fr))`, 8px gap, 44px pills, the count pushed right (R1b) |
| Owned | anchored panel, three radios | segmented, 3 even |
| Row 3 | `ResultLine` with the cart's sentence; while reading, a 6px `--fact` dot and `reading friends’ spares` at its right edge | same |

## Loading

| Property | Value |
|---|---|
| Cell bar | 10px high, radius 3, `--elevated`, `anim-skeleton`; spare cell 58 wide desktop, 74 phone |
| Friend trigger | dashed border, `--fg-locked`, `reading…` |
| Skeleton panel | the panel's shape, with header bars in `--border-strong` |
