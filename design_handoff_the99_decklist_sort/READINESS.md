# Readiness — ordering the deck list, R1

## What this round is

One control, one surface, eight variants. The brief said the placement was the whole question and
it was right: the menu is a mount of a shipped component with four props, and everything that took
thought was the row it lands in.

**Green, with one copy call I want a second opinion on and one figure I want re-measured in the
browser.**

---

## Against §2's seven locked decisions

| # | Locked | Drawn as locked |
|---|---|---|
| 1 | Three keys: Name, Price, Mana value | ✓ — §4's panels, §6's table, the copy block |
| 2 | Direction is re-pick, not a toggle | ✓ — no asc/desc affordance anywhere; `nextDeckSortState` is `/collection`'s function renamed |
| 3 | Each key names its own two directions; only the chosen row is hinted | ✓ — §4 draws the hint on exactly one row per panel; `buildDeckSortOptions` hangs it on `k === key` |
| 4 | Price under `Shopping` only | ✓ — two rows under All, three under Shopping; **absent, not disabled** (decision 11) |
| 5 | Sorting inside the grouping, which stays | ✓ — and it is the argument for the placement (decision 1) rather than a footnote |
| 6 | One sort per filter; `All` falls back and remembers | ✓ — STATES §5; the trigger reads `Name · A–Z` with nothing hinting at the parked order (decision 12) |
| 7 | #629's order becomes the `Price · Highest` default | ✓ — `DECK_DEFAULT_SORT_DIRECTION.price = "desc"`, with the deploy consequence stated in the copy file |

None reopened. Decision 12 is the piece §2.6 explicitly hands Design (*how* the trigger reads under
`All`), and decision 13 is the piece §5 hands Design (the wording).

---

## The one thing I want a second opinion on

**`Curve up` / `Curve down` for mana value — and R1's argument for it no longer holds.**

The original case was collision: the shipped `Cheapest to cast` sitting two 44px rows above a
`Price · Cheapest`. Two *cheapests* in one three-row menu, one meaning mana and one meaning money,
was the exact collision PR #629's own rename was made to prevent. **Review then replaced the money
words — `Price` is now `Lowest` / `Highest` — and the collision went with them.** So the shipped
string is available again, and the curve pair stands on one argument instead of two.

What is left in its favour: it abbreviates a sentence this same deck already shows on its diff
(*the curve goes up* / *the curve comes down*), and it is the only pair that says nothing about
money at all on a surface that also totals dollars.

What is against it: *up* does not intrinsically say *cheap first* — it says so only once you know
the curve chart's x-axis. Mitigated by the key always being in the label
(`Mana value · Curve up`, never a bare `Curve up`) and by the chosen row's accessible name
carrying the whole order.

**The two candidates I would put in front of review, in order:**

1. `Curve up` / `Curve down` — as drawn.
2. `Cheapest to cast` / **a US reverse that is not a coinage**. This is the shipped string and the
   better half of the pair by some distance; the blocker is the other half. `Dearest to cast` is
   the word just retired, `Priciest to cast` is an invention, and `Most to cast` does not parse.
   If review has the reverse, take this one.

`Low first` / `High first` remains the safe fallback. It is duller, and now that `Price` reads
`Lowest` / `Highest` it is also *too close to it* — two keys naming their extremes with the same
two words, 44px apart, is a milder version of the problem this whole decision exists to avoid.

## The figures, and which one is actually tight

**Corrected during review: the desktop widest state is the tighter margin, not the looser one.**
R1's first pass printed `953 of 1008 — 55 spare` under D1. That was computed rather than measured,
and budgeted against the frame's *border* box rather than its content box — wrong by 53px, and the
frame wrapped in the canvas. Measured: lane 170 + auto 429 + rule 1 + arrangement 356 + five 10px
gaps = **1006 of 1008. Two pixels.**

So decision 8 — *neither the trigger nor the view well yields, because neither has to* — rests on
**2px at desktop and 13px at 390px**. I still believe it, because both figures are real and neither
is a projection. But it is worth saying plainly that this row is full, and that the next control
anyone adds to it does not fit.

**Two fallbacks, both one token, neither needed at the measured figures:**

- **390px:** drop `By role`'s idle `px-[6px]` to zero. The refresh already established it can
  afford this — it carries no border at that width either — and it returns 12px.
- **Desktop:** the hairline plus its gap is 11px, and the row's `md:` gap could go 10 → 9 for 5
  more. The hairline is the better of the two to spend, since decision 5 already treats it as a
  separator rather than a child.

**Still to re-measure in a browser: the 390px arrangement line at 345 of 358.** Its three governing
widths (`Name · A–Z` 110, `Price · Highest` 120, `Clear auto · 40` 134) are computed from the
shipped type stack at the shipped sizes rather than read off a render, and a 4% font-metric
difference on the trigger closes the gap. The desktop line is now measured; this one is not.

---

## Open for Hugh, not for me

**The review reference's Ascending / Descending group.** A comparable control shared in review puts
the three keys and a separate direction pair in one menu, divided. It is a good control, and taking
it would reopen two locked decisions at once — §2.2 (direction is re-pick, no new affordance) and
§2.3 (each key names its own two directions) — in a component `/collection` shares.

The trade is legible enough to decide on the spot: **six labels become two**, the mana-value
question above disappears entirely, and `A–Z` disappears with it. My read is that §2.3 is the more
valuable of the two decisions and `A–Z` is the proof of it, so R1 draws the ruled shape — but the
reference's own trigger independently matches decision 7, which is some evidence its authors
thought about the same row we did. Drawn and argued in the canvas's §6b; **not decided here.**

---

## What I would cut if the round has to shrink

- **§3's counter-example frame** (the loose row, drawn wrong, in `--danger`). It is the clearest
  thing in the handoff and also the most redundant — decision 2 and STATES both state the rule in
  words. Cut last.
- **D2 and D4.** They differ from D1 and D3 only by the auto cluster's absence, which is a shipped
  behaviour nobody is being asked to review. Kept because the brief asked for the pair explicitly,
  and because D2 is the only frame that shows the hairline declining to render.
- **Nothing else.** Eight variants is four cells short of what the prompt asked for, and the four
  it drops (the auto cluster's own seven states) are already Green in another folder.

## What I did not draw, and would not

- **Keyboard-walk frames.** `filter-panel.tsx`'s model is unchanged and already tested: roving
  `aria-activedescendant` with no wrap, DOM focus on the listbox, `Escape` dismissing without
  undoing. No new pattern, so nothing a walk would settle.
- **Pending / in-flight.** A client-side reorder of a list already in memory. No request, so no
  pending trigger, no held announcement. This is the first sort control in the app with no
  in-flight state and it is worth saying so once.
- **A degraded price state.** `price.ts:168-190` already ships fail-quiet — no live figure sorts
  last and equal, name then id as the tiebreak. An unreadable table produces no strip, not a broken
  order.

---

## What this hands engineering

One mount, four props (`selectionMode`, `widthPx`, `desktopRowMinPx`, `showCounts`), one copy block,
three pure helpers with no UI imports, **one structural change to `group-toggle.tsx`** (three
children into one `flex-none` span, plus the hairline) and **two one-line fixes in
`filter-panel.tsx`** that also improve `/collection`.

No new component. No new token. No schema change. No new breakpoint — `md:` is the only one this
row has ever used and it stays.

The one thing that is **not** costed here is the sort itself: `grouping.ts:210`/`:227` sorts
alphabetically inside each group and `decklist.tsx:366` sorts by price, and making those two take a
key and a direction is eng's call on shape. Design's only constraint on it is decision 10 — the
order applies within the groups, never across them.
