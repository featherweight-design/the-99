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
| **R2: buy tag collapses to `$` on All** | **+44px** |
| pip track 40 + gap 10 | **−50px** |
| two-faced `//` + gap, when present | −17px |
| **left for the card name** | **86–103px** |

**R1 landed this row at 42–59px and called it survivable. R2's collapse makes it comfortable.**
~86–103px is roughly fourteen characters at 13.5px — not every card name, but no longer a number
that needs defending.

**And the worst case changed shape.** R1's was a $1,000 card you do not own: a long name, a
four-digit price and a marker at once. **A four-digit price cannot appear on the All tab any more**,
so the worst case is now a card you own two of and owe a copy of — a quantity, a marker and a `$`.

**`flex-auto` is still what carries it.** `decklist-row.tsx`'s own comment records the bug:
`flex-1` is basis-0, so the name gets only what the marker has not claimed and a 390px
over-committed row renders `A ◆◆ short 1 — also in Atraxa Superfriends` with the card it describes
gone. `flex-auto` bases the name on its own text, so a row too narrow for both shrinks the halves
in proportion. **The name loses its tail; it does not vanish.** The full name still reaches the
reader through the row's accessible name and the modal.

## Answered — R2 call 1: the tag collapses, it does not leave

R1 asked Product to drop the price from the buy tag on the All tab. **Product said no, and was
right:** seeing which cards still need buying while browsing the whole deck is the point of the tag.

**Where R1's argument went wrong**, because it is the kind of mistake that recurs: R1 read the tag
as a shopping *affordance* on the strength of ruling 1 calling it one **on the tile**, then applied
that reading to the row. A tile is a picture of a card; a row is a line in a list you are working
through. On the row the tag is a shopping **fact**, and this handoff's own test is that facts stay.

**Adopted instead — the counter-proposal:**

> **All tab: `buy $12.40` collapses to a bare `$` in the same chip skin.**
> **Shopping: the full tag, unchanged.**

| | Width | On |
|---|---|---|
| `buy $12.40` | ~62px | Shopping |
| `$` | ~18px | All, and the card view tile |
| **returned** | **~44px** | more than the ~40px the ask was chasing |

The chip, its `--warning` ink, its `--accent-shadow` hairline, its radius and its position are
untouched — only the word and the figure go. The signal survives because **whether** to buy is a
glyph and **how much** is a number, and only the second needs the width.

### The fallback is withdrawn

**The 40px track ships.** R1 specified a 34px / 11px / cap-four fallback for a refusal; the collapse
returns more width than the ask would have, so it is not needed. It is recorded as rejected in
`README.md` rather than kept warm — **a fallback nobody is going to take is a second spec to keep in
sync.**

The cost R1 named for that fallback is worth remembering as the reason it is good news it is gone:
at four slots a five-colour cost drew three pips and a `+2`, losing two of the five colours a player
is checking.

### Scope, so eng does not over-apply it

The collapse is a property of **`decklist-row.tsx` under `filter === "all"`**. `update-diff-row.tsx`
keeps its full `BuyTag`: different surface, desktop width, no tab, and nothing there was tight.

### Sold-out

Accepted as an edge case on Product's call, and it holds up — a card with no price collapses to the
same `$`, so *sold out* only reads on Shopping. It is rare, and a sold-out card is still a card the
player has to buy eventually. **One constraint: the chip must not restyle itself for it.** A second
glyph meaning *unpurchasable* would put two marks in a slot R1 spent a ruling keeping to one, and it
would make the app loudest about the state the player can do least about.

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
| what is displaced | the buy tag's word and figure on the All tab (collapsed to `$`) | nothing |
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
