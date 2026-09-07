# DENSITY — four hundred pixels

The composition risk in this handoff, recorded in full because the canvas can only show the outcome.
Read with `README.md` calls 3 and 4.

## The box

| | Desktop | Phone |
|---|---|---|
| row width | **~400px** — desktop groups are a two-column grid (`decklist.tsx`, `gridTemplateColumns: "1fr 1fr"`) | **~358px** |
| row height | 34px | 44px, or 52px with a meta line |
| padding | 9px both sides | 8px left / 4px right |
| gap | 10px | 9px |
| furniture, worst case | **~273px** (brief's measurement) | **~288px** |

Desktop buys ~42px more than phone, not a window's worth. **That is the fact the whole cluster turns
on**, and it is why four separately-specified tickets would each have spent the same pixels.

## The desktop ledger

| | |
|---|---|
| row box | 400px |
| less padding 9 + 9 | 382px |
| furniture today | −273px |
| pip track 40 + gap 10 | **−50px** |
| two-faced `//` + gap, when present | −17px |
| **left for the card name** | **42–59px** |

Seven characters is not a card name. Two things stop that being a failure.

**First, the worst case is a $1,000 card you do not own** — a long name, a four-digit price and a
marker at once. It is rare, and every one of those three is itself conditional.

**Second, `flex-auto` already handles it.** `decklist-row.tsx`'s own comment records the bug:
`flex-1` is basis-0, so the name gets only what the marker has not claimed and a 390px
over-committed row renders `A ◆◆ short 1 — also in Atraxa Superfriends` with the card it describes
gone. `flex-auto` bases the name on its own text, so a row too narrow for both shrinks the halves
in proportion. **The name loses its tail; it does not vanish.** The full name still reaches the
reader through the row's accessible name and the modal.

## The one thing Design is asking Product for

**Drop the price from the buy tag on the All tab. Keep it on Shopping, where it is the point.**

The reason is the brief's own. Ruling 1 drops the buy tag, the price and the auto tag from the card
view tile because *those are shopping affordances and shopping has its own view*. **That argument
does not stop at the tile.** On the All tab the price is a number nobody is currently spending, and
it is ~40px of the tightest 400px in the app. Dropping it returns the worst case to roughly where it
stands today, which means #350 ships costing the name nothing.

**Amendment 5 put the price there (#281), so this is a re-open and not an oversight** — which is
exactly why it is an ask rather than a ruling.

### The fallback, specified

If Product says no, the track narrows and nothing else changes:

| | Ask granted | Fallback |
|---|---|---|
| track | 40px | **34px** (`card-search-row`'s shipped figure) |
| pip | 12px | **11px** |
| numeral | 8px | **7.5px** |
| shingle from | three | **two** |
| cap | five slots | **four slots** — a five-plus-symbol cost overflows to `+N` one symbol sooner |
| phone | unchanged | **unchanged** |

The fallback is worse in one specific way worth naming: at four slots, a five-colour cost like
`{W}{U}{B}{R}{G}` draws three pips and a `+2`, which loses two of the five colours a player is
checking. **The ask exists to avoid exactly that**, not to save pixels in the abstract.

## Phone: zero horizontal cost, and the heights change only at group edges

Pips land on the meta line, so the primary row is untouched: **nothing is displaced at 358px.** The
cost is vertical — 44px becomes 52px on every row whose card has a mana cost.

**And that is not every row.** A land has no mana cost; `CostPips` returns `null` on an empty symbol
list; no pips means no meta line. Those rows stay 44px. In a typical 99 that is ~38 rows.

Two heights in one list would be drift — except that **lands are their own group under *By type* and
carry the `land` role under *By role*.** So the height changes at a group boundary under both
groupings and never inside a group. The reader sees two blocks of consistent rows.

**Measured scroll cost:** ~61 rows × 8px ≈ **488px** of extra scroll on a 99-card deck.

**Corrected against refresh R2:** R1 called that "about 1.3 phone viewports", measured against the
full viewport. R2's chrome spends 52px on the tab bar plus a 14px home indicator, so the list region
is smaller and the honest figure is **about 1.5 scrolls of the list region**.

**It does not flip the trade, and the reason is that the trade was never about total scroll.** The
cost of the meta line is *per row and constant* — more rows below the fold does not make any single
row worse to read. What would flip it is the meta line pushing rows-per-screen below a scanning
floor, and it does not: in a ~700px list region a 52px row lands **13 per screen against 15** at
44px. Losing two rows per screen is not a flip, and the ~38 land rows stay at 44px and 15 per screen.

Accepted, at the corrected figure: the alternative is a cost the player has to open a modal to read,
on the surface where they are deciding what to cut.

## The recommendation, in one table

| | Desktop 400px | Phone 358px |
|---|---|---|
| height | **34px**, unchanged | **44px** no meta line / **52px** with one |
| radius | 7px | 7px |
| cost pips | 12px, gap 3, **fixed 40px track**, right-aligned, between name and slot | 13px, gap 3, **on the meta line**, left-aligned, no track |
| shingle | from three, −5px | never |
| cap | five slots, then `+N` | none |
| what yields | **the card name**, by `flex-auto`, in proportion | **nothing** |
| what is displaced | the buy tag's price, if Product agrees | nothing |
| meta line holds | — | pips (All) · pips + `edhrec N%` (Shopping) |

## What must not happen

- **The track must not become flexible.** A track that shrinks puts adjacent rows' pips on different
  vertical lines, which is the failure `card-search-row`'s fixed slot exists to prevent, and it
  makes the whole column unscannable — which is the only reason to draw pips in a list at all.
- **The pips must not move right of the marker or the buy tag.** Both are conditional and variable,
  so pips after them land at a different x on every row.
- **The pips must not shrink below 11px.** The 8px numeral inside a 12px circle is already at the
  floor; `ColorPips` bottoms out at 11px and it carries no numeral.
- **The phone meta line must not take a third fact.** Pips and the view's own figure. Nothing else.
- **The row must not grow past 52px on phone.** That height is borrowed from a variant that already
  ships; a third height would be new density, not adopted density.
- **The desktop row must not grow past 34px.** A 12px pip fits a 34px row with 7px padding twice
  over. If a figure ever does not fit, the figure is wrong, not the row.
- **The meta line must not be added to a row that has no cost to put on it.** Lands staying at 44px
  is what keeps the height change at group boundaries, and it is what keeps the rows-per-screen
  figure above from being an average nobody experiences.
