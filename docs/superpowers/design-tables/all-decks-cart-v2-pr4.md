# Design table: Cart v2 PR 4, By card's row facts

Sources (design files only): `design/design_handoff_the99_all_decks_cart_v2/` README.md (calls 1, 2, 3; G1, G6), STATES-all-decks-cart-v2.md (Row rest, Row +N open), design-tables/all-decks-cart-v2.md (Row desktop, Row phone), Row.dc.html (C1 +2 opened 1300, C2 +3 opened 390), By-Card-Deck.dc.html (A By card 1300, B By card 390), and addendum R2 (#2331, branch `design-handoff-all-decks-cart-v2-r2`) `addendum-r2/README.md` ruling 3 and `R2-Long-Name.dc.html` (A 1300, B 390). Where the addendum and v2 disagree, the addendum wins.
Values are read from the canvases' inline CSS classes (`.colh .nrw .cn .nm2 .cmd .fv .mo .dl .prw .f .spc .sgp .act .cut`). Copy: each element names its copy key, never its text (wording is /copy-review's). "—" = not drawn. Mobile = 390, desktop = 1300; the board draws only those two. The columns start at `xl` (1280), not the cart's `md`: measured signed in (62px rail), the list is 616px at 1000 and 640 at 1024, where the spare and own headings overflow their 87 to 96px columns; at 1280 it is 896 (855 with the 88px touch rail and a 15px scrollbar) and every heading fits. Below `xl` a row draws the phone's labelled lines.

## 1. Column header (`.colh`), By card

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Rendered | — (no header; facts carry labels) | once, above the list box; never scrolls (R2 §2) |
| display | — | grid |
| grid-template-columns | — | `minmax(0,1.15fr) minmax(0,1.55fr) minmax(0,1.1fr) minmax(0,1.15fr) 100px` |
| column-gap | — | 18 |
| padding | — | 0 14px 7px |
| border-bottom | — | 1px solid `--border-strong` |
| font | — | IBM Plex Mono 9.5 |
| letter-spacing | — | .12em |
| text-transform | — | uppercase |
| color | — | `--fg-faint` |
| white-space | — | nowrap |
| Cells | — | `columns.card`, `columns.need`, `columns.spares`, `columns.own`, empty (actions) |
| Last cell | — | text-align right |

## 2. Row (`.nrw` desktop, `.prw.bare` phone)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| display | flex | grid, the header's columns |
| column gap | 12 | 18 |
| align-items | flex-start | center; start when a list is opened (C1) |
| padding | 12px 0 (bare: no sides outside a panel) | 12px 14px |
| min-height | — | 64 |
| border-top | 1px solid `--border`; none on the first row | same |
| Facts column | `.l`: flex column, gap 4, flex 1, min-width 0 | each fact its own grid cell |

## 3. Name cell (`.cn`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| layout | flex column, gap 3, min-width 0 | same |
| Name `.nm2` | the shipped `CardDetailTrigger` | same |
| Name font | IBM Plex Sans 400 14/1.4 | same |
| Name color | `--fg` | same |
| Name underline | 1px dotted `--border-strong` | same |
| Name wrap | one line: nowrap, overflow hidden, ellipsis, max-width 100%, align-self flex-start | same |
| Commander label `.cmd` | `list.commander`, mono 9.5, .1em, uppercase, `--fg-faint`, under the name | same |

## 4. Fact line (`.prw .f`, `.fv`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Phone line | grid `44px minmax(0,1fr)`, align-items baseline | — |
| Label `em` | `facts.need` / `facts.spare` / `facts.own`; mono 9.5, .1em, uppercase, `--fg-faint` | — (the column header names it) |
| Value `.fv` | flex, align-items baseline, gap 7, min-width 0, nowrap | same |
| Value font | mono 11.5/1.5, `--fg-body` | same |
| Count `b` | mono 13, weight 600, `--fg`, flex none | same |
| Names `.nms` | min-width 0, overflow hidden, ellipsis | same |
| Own fact `.fv.dim` | values `--fg-muted`; count weight 500 `--fg-body` | same |
| Own prefix | `facts.in`, flex none, before the names | same |
| Lines shown | need always; spare only with a friend's spare; own only when owned | need, spare, own cells; an empty cell when absent |
| A line never wraps | yes | yes |

## 5. Spare fact (`.spc`, By card)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| layout | flex, align-items center, gap 8, min-width 0 | same |
| Glyph press `.sgp` | 26×20, radius 6, 1px `--border-strong` | 30×26, radius 6, 1px `--border-strong` |
| Glyph | shipped spare glyph with its requested / accepted mark | same |
| Then | count (all friends' spare copies) and friend names, with the pill | same |

## 6. The pill (`.mo`, `.mo.lt`, R2 `.mo.word`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| height | 19 | 19 |
| padding | 0 6px (`more`: 0 7px) | same |
| radius | 5 | 5 |
| border | 1px solid `--border-strong` | same |
| font | mono 10.5, weight 500 | same |
| color | `--fg-body`; `less` `--fg-muted` | same |
| hit | coarse pointer 44px (`TOUCH_HIT`) | same |
| Words | `facts.more(rest)` / `facts.moreName` / `facts.less` | same |

## 7. Fit rule (call 2, G6, R2 ruling 3)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Whole names first | drop whole names from the end until they fit beside the pill | same |
| First name too wide | cut that one name with an ellipsis (`.nms.cut`: flex 0 1 auto) | same |
| `+N` | names left out | same |
| `more` | only the end of a cut name hidden, nothing after it | same |
| Never | cut a name mid-name otherwise | same |
| Measuring | one `ResizeObserver` per list | same |
| Accessible name | always every name in full | same |
| Applies to | need, own, By card's friend names | same |

## 8. Opened list (`.dl`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Trigger | the pill; it then reads `less` and folds the list | same |
| Head | the names give way to `facts.forDecks(n)` (`for 4 decks`) | same |
| Placement | under the value, in the fact line's second column | under the value, in the cell |
| display | grid `minmax(0,1fr) auto` | same |
| gaps | column 14, row 3 | same |
| margin-top | 4 | 4 |
| padding | 8px 10px | same |
| radius | 8 | 8 |
| background | `--surface-sunken` | same |
| font | mono 11.5/1.5, `--fg-body` | same |
| Counts | `--fg-muted`, right-aligned | same |
| Long names | wrap; never truncated | same |
| Not | a modal or a sheet | same |

## 9. Action stack (`.act`), By card

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| layout | column, align-items flex-end | same |
| gap | 10 | 7 |
| Contents | the shipped `BuyTag` alone (no Ask in By card, call 3) | same |
| Tag height | 22 | 20 |

## State coverage, By card rows

| State | Triggering condition | Rendered | Key inputs |
|---|---|---|---|
| Row, rest | a selected line | name, need, spare when a friend has one, own when owned, tag | `SelectedLine`, `usePageSpares().byCard` |
| Row, +N | names wider than the cell | `+N` pill | measured widths |
| Row, `more` | one name, cut | `more` pill | measured widths |
| Row, opened | the pill pressed | head, `less`, the inline list | — |
| Own, names | `ownFact` (`lib/decks/cart`): every deck holding a copy is named and their copies sum to `owned` (the selected decks on the line that hold some, then `inUseIn`) | `in` + names | `CartLine.heldBy`, `CartPayload.holders`, the line's `held` |
| Own, fallback (G1), all elsewhere | the names do not account for every copy, and `heldElsewhere` equals `owned` | `in other decks`, no pill | — |
| Own, fallback (G1), some on the line | the names do not account for every copy, and a deck on the line holds some (`heldElsewhere` below `owned`) | `· N in other decks` (N = `heldElsewhere`; nothing when it is 0), no pill | — |
| Nothing owned | `owned` 0 | no own line (phone), empty cell (desktop) | — |
| Held slot (S3) | bought this visit, gone from the read | the shipped slot, no facts | unchanged |

## Verification (design-review, 2026-10-28)

Verify pass (row by row against `cart-facts.tsx`, `cart-columns.tsx`, `CartCardLine` in `cart-line.tsx`, `ByCardList` / `ByCardColumns` in `cart-view.tsx`): every row MATCH but five, and every state REACHABLE (the five are listed below). The build was also rendered at 1300 and 390 in a real browser on fixtures (a 43-character deck name included), which drew `+N` after whole names, the long first name cut with `+2`, the lone long name cut with `more`, the opened list under the fact, and no horizontal scroll at either width.

| # | Gap | Result |
|---|---|---|
| 1 | `more` pill padding 0 7px (was 0 6px) | Fixed |
| 2 | Action stack: the tag's row 22 (phone) / 20 (desktop), was the tag's own height | Fixed: the shipped tag centred in a 22 / `md:` 20px row |
| 3 | Header's last cell text-align right | Fixed (empty cell, cosmetic) |
| 4 | Glyph press on desktop 30×26 | Matches in effect: the shipped press is 26 tall and about 30 wide (7 + 16 glyph + 7 + border) |
| 5 | Glyph press on the phone 26×20 | **Open.** The cart uses the shipped `OtherWaysPress` at its one-line size (26px tall at every width, the deck row's), so the spare line is 26 tall where the board draws 20. A 20px press would be a new size of a part the deck rows share; the addendum's ruling 4 sets the precedent that shipped parts are used as they are. The cart's own non-one-line press (36px) was the alternative, and is further off. |

Decided where the boards are silent (not gaps):
- The open own list's head reads `facts.inDecks(n)` and the open friend list's `facts.fromFriends(n)`, the need list's `for N decks` in their own facts' words.
- Friend names in the spare fact are ordered most spares first, then by name.
- The own fact's count is every copy owned (`owned`); its names are where EVERY copy is in use (`ownHoldings`: the selected decks on the line that hold some, in the selections' order, then `inUseIn`). They are drawn only when every deck is named and the copies sum to `owned`; otherwise the fact falls back to the shipped row's facts, never naming some decks and not others: `in other decks` when other decks hold every copy, else `· N in other decks` (`list.ownedSome`'s tail).
- The pill's coarse-pointer hit is 44px across but only 2px past the pill above and below, so stacked facts' pills (about 23.5px apart) have disjoint targets; measured on a coarse pointer at 390, 60 of 60 taps on visible pills land on their own pill and no other control in the row loses a tap.
- The column header keeps the list box's scrollbar gutter (`scrollbar-gutter: stable` on both), so a classic scrollbar narrows the header's grid and the rows' alike. Checked in a browser with a forced 15px scrollbar: the header's columns and the row's land on the same x, and both right edges at the same x.
- The phone labels stay on desktop as `sr-only`, so each cell names itself to a screen reader; the column header is `aria-hidden`.
