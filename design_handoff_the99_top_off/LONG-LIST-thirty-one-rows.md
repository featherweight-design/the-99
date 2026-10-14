# Thirty-eight rows at 390px, and why there is no inner scroller

The one thing in #360 that departs from standing convention: **a fill can place up to 31 cards at
once**, so the review list is the longest thing this product has ever asked a player to read on a
phone before committing. The brief's words for the failure to avoid are exactly right — *a scroll
trap* — and it is worth being precise about what the trap actually is, because the obvious fix
causes it.

## The trap is the box, not the length

The instinct with a long list on a small screen is to put it in a fixed-height scrolling box, so
that the thing after it stays reachable. That produces all four of these at once:

1. **Two scroll surfaces, one gesture.** A flick inside the box scrolls the box; a flick two pixels
   outside it scrolls the page. At 390px the box is nearly the width of the viewport, so the player
   cannot see which one they are addressing until it moves.
2. **A hidden bottom.** A box scrolled to its middle has content above and below the fold with no
   edge to say so. Thirty-eight rows in a 300px well is a list whose length is unknowable.
3. **Scroll chaining.** Reaching the box's end hands the gesture to the page, so the commit row
   jumps past the player at the exact moment they were slowing down to read it.
4. **A trapped primary.** If the commit sits *below* the box it is unreachable until the box is
   exhausted; if it sits *above*, the count it carries is scrolled away from the rows that changed
   it.

None of those are length problems. They are all the box.

## The call

> **The list is the page. One scroll surface, no fixed heights, no nesting.**
> **The commit takes the quick-add dock's bottom slot, and quick-add stands down while it is open.**

All 38 rows render in the document flow, in the strip, where the two buttons used to be. The page
scrolls, as it already does past a 95-row decklist — **this product's players already scroll long
card lists on this exact route**, and the review list is shorter than the decklist it sits above.

### The commit's home — R1 assumed a bar that is not on this route

R1 said "the sticky bar `Build this deck` already ships". **It does not ship here.** It lives at
`commanders/detail.tsx:417-434`, it is **a link, not a commit**, it carries no counts and no money,
and it is not on the builder. And the builder's bottom-pinned slot is **already occupied** by the
quick-add dock (`builder-shell.tsx:968-982`), in the same scroll column as the strip. So R1 refused
two pinned elements at 390px and then leaned on a phantom one — the audit is right, and there are
only three honest options.

| Option | Verdict |
|---|---|
| **Stack both bars** | **No.** Two pinned bars is ~150px of a 390×844 viewport, and it puts a text field — and the keyboard it summons — directly under a 27-card commit. It is also the exact thing this file refuses one section above. |
| **Unpinned commit at the list's end** | **No.** The live count and the money are the *whole argument* for a review step. Scrolling 38 rows to find out what you are about to spend is the shipped defect in slow motion, and it reintroduces "the primary is below the list" — the fourth failure named above. |
| **Retire quick-add while the list is open** | **Yes.** |

**Why the swap is the right one and not merely the last one left:** the dock and the list are **the
same job** — putting a card into an open slot. The dock does it one card at a time, by name, blind
to synergy and to price. The list does it deliberately, with the ranking, the availability and the
money in view. **A player who has opened the list has chosen the better tool for the job the dock
does**, so the dock is not competing for the slot; it has been superseded for as long as the list is
up.

**The swap is legible, not silent.** The dock collapses to one mono line — `Quick-add is back when
you close the list` — inside the commit bar, for as long as the bar is up. The affordance is
**accounted for rather than vanished**, and the bar's height stays close to the dock's, so the
page's scrollable area barely changes when the list opens. Closing or cancelling restores the dock
in place, **query and focus intact**; the dock is collapsed, never unmounted.

**§13's promise holds.** That state — candidates exhausted — has no list open, so quick-add is
exactly where it ships, and the sentence promising it stays true.

So the bar carries the primary, the Cancel, **the live count and the money**, and the state of the
selection is never scrolled away from the button that commits it — without a row being unreachable
and without a second pinned element.

## What that buys, and what it costs

| | |
|---|---|
| **Buys** | One gesture with one meaning. A real page end. A primary that is always visible and always current. The list's true length, readable by scrolling as far as the rows go. No chaining, no nested overflow, no `overscroll-behavior` guesswork, no scrollbar inside a 390px viewport. |
| **Costs** | To reach the decklist below, a player scrolls past up to 38 rows. |

That cost is real and it is bounded, which is the whole reason this is acceptable: **the list can
never be longer than 99 − built**, so the worst case is 31 slots' worth of candidates on a deck the
player just built and has not yet read. And there is a one-tap way past it that already exists —
**`Close the list` in the strip's own head**, which collapses the whole thing back to one 44px door.
The list is opt-in, opt-out, and closed by default.

## The row at 390px

The desktop row is one 40px line: box, dot, name, type, buy tag, synergy, inclusion. That does not
fit 390px without truncating a name like *Metallurgic Summonings* or dropping a figure.

**So the phone row goes to 52px and two lines**, exactly as the tuning card's pair does:

```
[ ✓ ]  ● Shark Typhoon
       +34   29%   buy $6.10
```

- **Line 1:** the 7px ownership dot and the full card name. The name never truncates — it is the
  only thing on the row a player cannot reconstruct from the others.
- **Line 2:** signed synergy, unsigned inclusion, buy tag. Mono 10px, the product's floor.
- **Box:** 26px, in a 52px row whose full width is the label. The **target is the row**, not the
  box, which is what makes 38 of them tappable one-handed.

**The buy tag keeps its figure at both widths.** The card-surfaces pass collapses `buy $12.40` to a
bare `$` on the All tab, and that call was right *there*: it bought name width on a list of cards
already committed to, where **whether** to buy is the only live question. Here the figure **is** the
question — this is the surface where the player decides to spend $31.90 on a Cyclonic Rift — so it
keeps its width, and the row breaks to a second line to pay for it. Same atom, same ink, same
hairline, uncollapsed.

## What is not done about the length

- **No virtualisation.** 38 rows is not a virtualisation problem, and a windowed list breaks
  find-in-page, breaks tab order, and cannot be printed or read by a screen reader in one pass.
- **No pagination, no "show more", no cap-at-N + disclosure.** Every one of them hides part of a
  ranking from a player who is spending 31 slots by it. `SHELF_CAP` exists for shelves the player
  is browsing; this is a list they are choosing from.
- **No search or filter inside the list.** A filter over 38 rows is a control that exists to
  service a problem the ordering already solves, and the first thing anyone would filter by is
  ownership — which is the thing this whole pass deleted.
- **No sticky list head.** The selection head scrolls away and the commit bar carries the counts
  instead. **This is the same rule the commit's home is decided by**: one pinned element at 390px,
  whichever it is.
- **No jump-to-top.** The page has a scrollbar and the strip head is one flick away; a floating
  affordance over a list of decisions is a target in the way.

## The desktop side of the same constraint

At 940px the list is 38 rows of 40px plus a head and a commit row — around 1,700px, so it exceeds
one screen there too, and the same rule applies for the same reason: **the page scrolls, the list
does not.** The commit row is not sticky at desktop (there is no bar to take, and the dock is a phone construct); it sits
at the list's end, under a `1px --border` rule, and the selection head at the top carries the same
counts so the figure is legible from either end. Both ends of a long list state the count with its
denominator; nothing in the middle needs to.
