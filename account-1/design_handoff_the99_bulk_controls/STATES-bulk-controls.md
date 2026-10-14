# STATES — the bulk controls

Eleven states of the pair. They share one namespace (`b1`–`b11`) and none of them belongs to the
list's own twenty states in `design_handoff_the99_top_off/STATES-top-off.md`, which are untouched.

Every state is drawn on the canvas, Surface 2, in this order.

---

**b1 · the ordinary pair.** 12 open, 23 sleevable, a collection fill two creatures short, a best
fill that buys four.
```
[ Select 12 from my collection  ]  2 creatures short of recommendations
[ Select the 12 this deck needs ]  4 to buy · $18.40
```
Both faces carry the same count: both fills take every open slot. The notes are the only
difference, which is the whole of the design.

**b2 · the collection concedes nothing.** The sleevable pool closes every gap the recommendations report.
Left note: `matches every recommendation`. The slot is filled, never emptied — a blank beside one
control and a figure beside the other reads as a missing figure.

**b3 · the two fills are the same set.** The best fill buys nothing, so the pools produce identical
rows. **The second control is absent** and the survivor reads
`matches every recommendation · nothing to buy`. Absent, not disabled; the clause exists so the
absence is not read as a bug.

**b4 · the price read degraded.** Four to buy, no figure for any of them: `4 to buy`. The figure
leaves, the count stands. No dash, no `$0.00`, no "price unavailable".

**b5 · some copies priced.** A figure stands as soon as one copy is priced. The total is of what is
priced; the count is of what will be bought.

**b6 · no mix to measure against.** `basis === "none"`, or no composition at all:
`no recommendation for this commander`. The fill still runs; what is missing is the standard.

**b7 · short on more than two axes.** `short on 3 types · creatures worst at 4`. One axis prints
itself; two print as a pair; three or more collapse to a count plus the worst.

**b8 · a large number.** 47 open slots: `9 creatures and 4 lands short of recommendations` /
`19 to buy · $214.80`. Nothing is capped or abbreviated, and the 232px button column is sized
against this face.

**b9 · nothing to sleeve.** Zero sleevable candidates, either because the player owns none or
because every copy is in another deck. **The collection control is absent**; the remaining control
keeps its own label, because renaming it `Select 12` would hide that every one is a purchase. The
strip's shipped door note already says which zero this is.

**b10 · after a press.** Twelve rows selected. **Neither control takes a pressed state** — the player
can deselect by hand a moment later. Pressing the other swaps the selection wholesale. The truth is
where it always is: the head's selected count and the commit bar.

**b11 · at the cap, mid-selection.** A hand-made selection already fills the slots. Both notes
yield to `replaces your 12 selections` in `--fg-faint`: that is the whole of what pressing would do
while the selection is in the way. The figures return when the selection is cleared or reduced.

---

## In flight and refusal — both shipped, both unchanged

- **A commit in flight** disables both controls (`1px --border`, `--fg-locked`), exactly as it
  disables the head's other controls today. Nothing is hidden and nothing moves.
- **A refused commit** touches neither control: the selections are preserved and the refusal plate is the
  commit row's, unchanged.
- **Undoing a landed pass** is the ledger's, a rule and a box away — `Undo these 12` in
  `provenance-line.tsx`. This handoff draws no reversal of its own and adds no second way back.
