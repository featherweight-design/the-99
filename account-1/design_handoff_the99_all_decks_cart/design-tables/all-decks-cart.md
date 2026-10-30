# Design table: Shopping for all decks (R1)

**Commit to `docs/superpowers/design-tables/all-decks-cart.md`.** Mobile = 390, desktop = 900, from `md` up. Values not listed are as shipped (`price-strip.tsx`, `buy-tag.tsx`, `shopping-key.tsx`, `got-it-confirm.tsx`, `got-it-receipt.tsx`, `deck-card.tsx`, Consider's shelf header).

## Component: CartEntry (the /decks line)

| Property | Mobile | Desktop |
|---|---|---|
| position | under the New deck / Import row, above ShelfTrigger | under the header rule, above ShelfLine |
| box | min-h 56, radius 10, 1px `--border-strong`, `--surface`, pad 9 14 | same |
| label | `entry.label`, 14 / 500 `--fg` | same |
| figure | mono 11 `--fg-muted`, `entry.figure` | same |
| chevron | `›` 18 `--fg-muted` | same |
| target | the whole box is one link to `/decks/shopping` | same |
| absent | `shopping.byDeck.size === 0` | same |

## Change: DeckCard detail figure

| Property | Value |
|---|---|
| when | `detail` is the To-buy figure (`detailToBuy` / `detailToBuyNoPrice`) |
| element | a second `Link` raised over the cover link (`relative z-10`), as `data-notice-link` (F19) |
| href | `/decks/shopping?deck=<id>` |
| ink | unchanged (`--fg-faint`), no underline at rest. Hover: `--accent` underline |
| a11y | `tabIndex=-1`, `aria-hidden`. The cover link's name already says the figure, and the cart is reachable from the entry line |

## Component: CartPage layout

| Property | Mobile | Desktop |
|---|---|---|
| header | back mono 11 `--fg-faint` · h1 display 22 / 700 · sub mono 11 `--fg-faint` · pad 16 16 12, rule below | pad 20 22 16 |
| grid | one column: selections / list / checkout, gap 14, pad 14 16 | `280px minmax(0,1fr)`, areas `selections list / checkout list`, gap 14 24, pad 18 22 |
| checkout | docked: `position: sticky; bottom: 0`, full bleed, pad 10 16 16, `--surface-rail`, top 1px `--border-strong` | `position: sticky; top: 18px` under the selections |

## Component: DeckSelect

| Property | Mobile | Desktop |
|---|---|---|
| card | radius 12, 1px `--border`, `--surface`, pad 2 14 4 | same |
| head | mono 10 / .14em uppercase `--fg-faint`, `selections.headPhone` / `selections.head`, h 44 | same |
| fold | the head is the toggle; folded by default; `▾ / ▴` 12 `--fg-muted` | not folded |
| Select all / Deselect all | 13 `--accent`, h 44, at the head's right; shown when there are 2+ decks (phone: when open) | same |
| row | min-h 44, pad 11 0 10, top 1px `--border`; the whole row is the checkbox's label | same |
| box | 18 × 18, radius 4. On: `--accent` fill, `✓` 12 / 700 `--bg`. Off: 1.5px `--border-strong` | same |
| name | 13 / 1.4, full deck name, wraps. On `--fg`, off `--fg-muted` | same |
| figure | mono 11, `selections.figure`. On `--fg-body`, off `--fg-locked` | same |
| note | `selections.note`, 11.5 `--fg-faint`, under the rows | same |
| order | roll-up copies, descending; ties by deck name | same |
| state | view state, this visit only (Q1). Reset on leaving `/decks/shopping` | same |

## Component: ViewSwitch

| Property | Mobile | Desktop |
|---|---|---|
| shape | segmented, 2px pad, radius 9, 1px `--border-strong` | same |
| segment | h 40 (44 with pad), 0 13, radius 7, 13. On: `--elevated` / 600 `--fg`. Off: `--fg-muted` | h 32 |
| hidden | one deck, or none selected | same |
| beside it | ShoppingKey's buy item alone (no ⇄: swap tools are per deck) | same |

## Component: CartLine (by card)

| Property | Mobile | Desktop |
|---|---|---|
| row | pad 11 0, top 1px `--border`, flex, gap 12, align start | same |
| name | 14 / 1.4 `--fg`, wraps | same |
| commander tag | mono 9.5 / .1em uppercase `--fg-faint`, after the name | same |
| decks | mono 11 / 1.5 `--fg-muted`, `list.decks`, deck short names (gap G1), wraps | same |
| owned | mono 10.5 `--fg-faint`, `list.owned`, only when owned > 0 | same |
| added | mono 10.5 `--fg-faint`, `list.addedThisVisit`, after a part-way press | same |
| tag | BuyTag `row`, `press`, `reserveSlot` true; figure = the line's total (each deck's copy at its own pick) | same |
| order | commanders, then decks on the line descending, then name A–Z | same |
| held | shipped held slot, dashed 1px `--border-dashed`, radius 9, pad 11 12, `gotItCopy.slot.held` + `list.added` mono 10.5 `--fg-faint`; until the visit ends | same |

## Component: CartDeckGroup (by deck)

| Property | Mobile | Desktop |
|---|---|---|
| header | Consider's shelf header: min-h 52, the box (as DeckSelect), name 14 / 500, figure mono 11, chevron | same |
| fold | folded, except the `?deck=` deck | same |
| rows | indent 28, as CartLine without the decks line; `list.also` mono 10.5 `--fg-muted` for other selected decks; tag figure = this deck's copy | same |
| foot | mono 10.5 `--fg-faint`, the rest as a count | same |

## Component: CartCheckout

| Property | Mobile | Desktop |
|---|---|---|
| box | PriceStrip's: radius 9, 1px `--border`, `--surface-sunken`, pad 10 13 0, gap 5 | same |
| figure | mono 14 / 600 `--fg`; `pricedClause` when priced < total; dropped at 0 priced and on a failed read | same |
| copies | 12.5 `--fg-body`, `checkout.copiesLine` | same |
| provenance | PriceStrip's line; on a failed read `checkout.unread` in the first slot | same |
| link | `ExternalLink` `exportLinkOutCopy.shopping`, 44 row; absent with nothing selected | same |
| sends | 11.5 / 1.5 `--fg-faint`, `checkout.sends`, pad-bottom 12 | same |

## Component: BackBand

| Property | Value |
|---|---|
| when | `visibilitychange` → visible after the link was pressed, once per visit |
| box | radius 10, 1px `--border-strong`, `--surface-rail`, pad 10 4 10 14 |
| copy | `back.title` 13.5 / 600 `--fg`; `back.body` 12.5 `--fg-body` |
| dismiss | ✕ 44 × 44 `--fg-muted` |

## Change: GotItConfirm on a cart line

| Property | Mobile | Desktop |
|---|---|---|
| new block | after the name: label `confirm.forDecks` (MONO_LABEL), a sunken list (radius 9, pad 2 12), rows min-h 36, deck name 13 `--fg-body` + `confirm.needsEach` mono 11 `--fg-muted`; the owned fact under it | same |
| stepper preset | the line's quantity, capped at `MARK_BOUGHT_MAX` | same |
| need line | `confirm.need` replaces `gotItCopy.confirm.need` | same |
| read again | `confirm.readAgain`, 12 `--fg-muted`, under the stepper | same |
| write | one press, one id, every deck on the line (gap G2) | same |

## Change: GotItReceipt on a cart press

| Property | Value |
|---|---|
| placement | the cart's toast slot: desktop bottom-right 22, w 380; phone above the dock |
| body | `receipt.covered` / `still` / `stillMany`, from the roll-up read after the write |
| actions | History · Undo, as shipped |
