# Design table: Cart v2 PR 5, By deck's row facts

Sources (design files only): `design/design_handoff_the99_all_decks_cart_v2/` README.md (calls 1, 2, 3; G1, G6), design-tables/all-decks-cart-v2.md (Row desktop, Row phone), By-Card-Deck.dc.html (C By deck 1300, D By deck 390, and the board's caption), and addendum R2 (#2331) `addendum-r2/README.md` ruling 3 (B4, the long first name). Where the addendum and v2 disagree, the addendum wins.
Values are read from the canvas's inline CSS classes (`.dg .dh .bd2 .colh .nrw .cn .nm2 .cmd .fv .nms .mo .prw.bare .f .spc .sgp .act .bt2`) and from the C and D frames' markup. Copy: each element names its copy key, never its text (wording is /copy-review's). "—" = not drawn. Mobile = 390, desktop = 1300; the board draws only those two. As in PR 4 the columns start at `xl` (1280); below it a row draws the phone's labelled lines. Everything PR 4's table (`all-decks-cart-v2-pr4.md`) verified for the fact line, the pill, the fit rule, the opened list and the spare fact holds unchanged here and is not repeated: By deck draws the same `CartFact` through the same row (`CartFactsRow`).

## 1. Group (`.dg`, `.dh`), unchanged

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Header | the shipped header: select, name, figure, chevron (the board's caption: "keeps its shipped header") | same |
| border-top | 1px solid `--border` | same |
| Header min-height, gap | 52, 10 | same |
| Figure | mono 11, `--fg-body` | same |

## 2. Group body (`.bd2`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| padding-left | 0 (inline `padding-left:0`) | 28 |
| padding-bottom | 6 | 6 |
| First child | the first row | the column header |

## 3. Column header (`.dg .bd2 .colh`), By deck

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Rendered | — (no header; facts carry labels) | once per OPEN group, inside its body, above its rows; scrolls with the list |
| display | — | grid |
| grid-template-columns | — | `minmax(0,1.15fr) minmax(0,1.55fr) minmax(0,1.1fr) minmax(0,1.15fr) 100px` (By card's) |
| column-gap | — | 18 |
| padding | — | 0 0 7px (`.dg .bd2 .colh` zeroes the sides) |
| border-bottom | — | 1px solid `--border-strong` |
| font | — | IBM Plex Mono 9.5, .12em, uppercase, `--fg-faint`, nowrap |
| Cells | — | `columns.card`, `columns.needByDeck`, `columns.spares`, `columns.own`, empty (actions) |
| Last cell | — | text-align right |

## 4. Row (`.nrw` desktop, `.prw.bare` phone)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| display | flex, align-items flex-start, gap 12 | grid, the header's columns, gap 18, align-items center |
| padding | 12px 0 | 12px 0 (`.dg .bd2 .nrw` zeroes the sides) |
| min-height | — | 64 |
| border-top | 1px solid `--border`; none on the first row | 1px solid `--border` on every row, the first included (the header, not the row, is the body's first child) |
| Facts column | `.l`: flex column, gap 4 | each fact its own grid cell |
| Name cell | PR 4's (`.cn`, `.nm2`); `list.commander` under the name only when the card is THIS deck's commander | same |

## 5. Need fact, By deck (`.f` em `deck`, `.fv`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Label | `facts.deck` in the 44px gutter | — (`columns.needByDeck` names it; the label stays `sr-only`) |
| Count `b` | this deck's own copies, mono 13 600 `--fg` | same |
| `also` | `facts.also`, `--fg-muted`, after the count, before the names | same |
| Names | the OTHER selected decks that need the card, in the selections' order; the open deck never | same |
| Value color | names `--fg-body` | same |
| No other deck | the count alone: no `also`, no names, no pill (Gishath, Cultivate) | same |
| Pill, fit, opened list | PR 4's, unchanged (`+N` / `more` / `less`) | same |
| Opened head | `facts.alsoDecks(n)` | same |

## 6. Spare and own facts

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Spare | By card's: the glyph press, then every friend's spare copies and names; drawn only with a friend's spare (Heroic Intervention has a spare and no own line) | By card's, in the third column; an empty cell without |
| Spare press's card | at this deck's own copy and figure | same |
| Own | By card's: `in` + where every owned copy is in use, `.fv.dim`; drawn only when owned | same, fourth column; an empty cell when nothing is owned |
| Own fallback (G1) | from THIS deck's vantage: every copy another deck holds, on the line or off it, is elsewhere | same |

## 7. Action stack (`.act`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Contents | the shipped `BuyTag` alone (call 3: no Ask in By deck) | same |
| gap | 10 | 7 |
| Tag row | 22 | 20 |
| Tag figure | this deck's copy at this deck's own pick (`bt2` $3.60 for Gishath's commander) | same |

## State coverage, By deck rows

| State | Triggering condition | Rendered | Key inputs |
|---|---|---|---|
| Group folded | not in `open`, or unselected | the header alone, no column header | shipped |
| Group open | selected and opened (`?deck=` or the header press) | column header (desktop), the deck's rows | `deckLineOf` |
| Need, others | another selected deck needs the card | count, `also`, names, pill when they do not fit | `alsoDecks` |
| Need, alone | no other selected deck needs it | count alone | `alsoDecks` empty |
| Need, opened | the pill pressed | `also N decks`, `less`, the inline list of the other decks with their counts | — |
| Spare | a friend has a spare | the spare fact | `usePageSpares().byCard` |
| Own, named / fallback | as By card, the fallback from the deck's vantage | `in` + names, or `in other decks` / `· N in other decks` | `deckOwnFact` |
| Nothing owned | `owned` 0 | no own line (phone), empty cell (desktop) | — |

## Verification (design-review, 2026-10-28)

Verify pass, row by row against `cart-deck-group.tsx` (`CartDeckGroup`, `deckLineOf`, `alsoDecks`, `deckOwnFact`), `CartFactsRow` in `cart-line.tsx`, `CartColumns` in `cart-columns.tsx` and `CartFact` in `cart-facts.tsx`: every row MATCH after the fixes below, every state REACHABLE. Each is pinned by a test in `cart-view.test.tsx` (`By deck's row facts (v2 PR 5)`) or `cart-facts.test.tsx`.

| # | Gap found against the shipped group | Result |
|---|---|---|
| 1 | The need fact was a wrapping `also …` line in mono 10.5 `--fg-muted` under the name, with no count | Fixed: the `DECK` fact, count first, `also` then the other decks, with the pill |
| 2 | No column header in By deck | Fixed: `CartColumns view="deck"` inside each open group, `columns.needByDeck`, no side padding, no pull onto the list |
| 3 | Body padding: 28 at every width, 10 at the bottom | Fixed: 0 on a phone, 28 from `md`; 6 at the bottom |
| 4 | Rows: 11px padding, the shipped two-line row | Fixed: the v2 row (12px, 64 min at `xl`, the grid), sides 0 at `xl` |
| 5 | Desktop: the first row's top rule | Fixed: kept at `xl` (`xl:first:border-t`), as the board's header-then-row draws it |
| 6 | Own: `you own N · …` in mono 10.5 `--fg-faint` | Fixed: By card's own fact, its fallback from the deck's vantage |
| 7 | Spare: the glyph before the tag | Fixed: By card's spare fact; the stack is the tag alone |
| 8 | `also` colour | Fixed: a fact's prefix is `--fg-muted` (unchanged for `in`, whose line already is) |
| 9 | Glyph press on the phone 26×20 | **Open**, as in PR 4 (its gap 5): the shipped one-line `OtherWaysPress` is 26 tall |

Decided where the board is silent or literal markup forks (not gaps):
- Between `md` and `xl` the body keeps its 28px inset over the labelled lines; the board draws only 390 (0) and 1300 (28), and the inset follows the group header's select, which is the same from `md`.
- The board's `also` is a `.nms` (it could shrink); here it is a prefix that never shrinks, like `in`: the fit rule measures the names' slot beside it, and the only text ever cut is the first name (addendum R2, ruling 3).
- The desktop's first row keeps its top rule under the header's `--border-strong` rule: literal to the board's `.colh` + `.nrw` selectors (By card's first row has none because there the row is the box's first child).
- The opened list's head reads `facts.alsoDecks(n)` (`also 3 decks`), in the shape of `in N decks` and `for N decks`; /copy-review settles the words.
- The tag carries no I got it press in By deck, as shipped (the buy key is By card's only).
