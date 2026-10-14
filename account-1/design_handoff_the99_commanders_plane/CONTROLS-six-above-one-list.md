# §7 — six above one list at 375px

The brief's one open question, recorded in full because the canvas can only show the outcome. Read
with `README.md` decisions 1 and 2, and with `design_handoff_the99_discovery/CONTROLS-four-above-one-list.md`,
which this extends rather than replaces.

**The answer: they can coexist, no restructure is needed, and the reason is that the count is
four.**

---

## The six, as the brief lists them

| Thing | Axis | Is it a control? |
|---|---|---|
| Scope | which commanders exist | **yes** — tier 1 |
| `Score against` | which cards count | **yes** — tier 3 |
| Colour pips | which are shown | **yes** — tier 2 |
| Sort | the order | **yes** — tier 4 |
| Join mode | *what the pips mean* | **no** — an attribute of the pips |
| Search | which are shown | **yes** — tier 2, and it displaces a statement |

Two of the six do not add a row, and for different reasons.

## Why the join mode is not a control

**It has no meaning without a pip.** `filterByColors` returns every result unchanged on an empty
selection, so with no colour lit there is nothing for a join mode to join. It is not disabled in
that state — it is **absent**, which is the strongest possible statement that it belongs to
something else.

**It does not add an axis.** Scope, colours, `Score against` and sort each answer a different
question. The join mode answers *no* question; it changes the answer the pips already gave. A
control that modifies another control's meaning is a modifier, and modifiers live inside their
parent.

So it renders inside the pip wrapper, behind a hairline, at 20px against the wrapper's 16px pips —
subordinate by geometry, and unmistakably not a sixth pip because it is type rather than a swatch.

**At 375px it cannot fit inside the wrapper** and becomes a peer row at the shipped 38px halves,
because a 20px control is not a touch target. Its conditional presence is what keeps the tiering
legible there: it appears in the same interaction that already produced the chip row, so the stack
only grows for a player who engaged the filter.

## Why search does not add a row

The mobile bar's fourth row is `WindowCount | sort trigger`. `WindowCount` says
**"25 shown · 3,301 more below"** (`filter-bar.tsx:420-427`, `reveal-control.tsx:150-157`) — R3
described this row as saying `ranks 26–50 of 3,100`, which is `revealBand`, a different string in a
different place. The correction matters, because `WindowCount` is a *statement* and the row can hold
a control instead.

A 38px field and a 38px trigger make exactly the 44px row the count and trigger made, so the
substitution is free in height. **What it is not is free in content**, and R3's claim that "the
window count keeps its words on the line beneath" is wrong twice over: the figures differ (shown +
remaining, versus matches + pool), and **the bar has no line beneath that row** to put anything on.

**Design's position: the reveal count is not relocated, it is already stated where it is acted on.**
`RevealControl` prints "25 shown · 3,301 more below" and its button inside the `<ul>`, at the point
the player reaches the end of the window. The bar saying it a second time, above a list the player
has not scrolled yet, is the redundancy — so the drawn bar drops it.

**That is a deletion of shipped content, and it is blocker 6, not a free substitution.** If the
count is wanted in both places, the row cannot hold search and the phone needs a fifth row (+48px on
every state, including the default, which would make §7's answer +48px rather than +0px).

So the row that said `Fit ↓ · fixed`, then `WindowCount`, now holds `search | sort`. Third
repurposing, third time it has not grown.

## The measured stack at 375px

| Row | Cost |
|---|---|
| Title + subtitle | ~66px |
| Scope · 38px halves | 44px |
| Colour pips + `N/M` | 34px |
| `Score against` + label | 60px |
| **Search + sort · one row** | **44px** |
| Gaps between rows · 4 × 10px | 40px |
| | |
| **Before the first row** | **288px** |
| Shipped discovery, same rows | 288px |
| **Difference** | **0px** |

**Zero.** A 38px search field and a 38px sort trigger make exactly the row the shipped count and
trigger made, so the count moving into the field buys the row for nothing. R1 quoted +6px and R2
+8px; both counted the two sides on different bases.

**The basis, stated once and used in every table in this handoff:** row heights include their own
padding; the totals count **gaps between rows only** and exclude the gap before the first list row,
on both sides. With colours lit the modifier row
adds more; the full worst-case measurement is below, and it is the answer §7 actually asked for.

**Nothing new becomes sticky.** Unchanged from the discovery ruling and now load-bearing: five
stacked controls pinned at 375px would leave under half the viewport for the list, and the list is
the surface. Scrolling continues to put the whole block away together, in one order, in one place.

## Reading order, desktop

    search → colours (+ mode) → score against → order

Narrow, then narrow coarsely, then choose which cards count, then choose the order. Search leads
because it is the precise instrument and the pips are the coarse one; a player who arrives with a
name expects the field first.

**That order has a cost in shipped geometry, and R2 does not decide it.** R1 put search at the
leading edge and disclosed the shift; a move in geometry the gap report protects is not Design’s to
disclose away. Both placements are drawn side by side in canvas A5 and costed here. **Hugh picks.**

### Option 1 — leading edge

    search → colours (+ mode) → score against → order

- **For:** reading order is *narrow → score → order*, the precise instrument leads the coarse one,
  and the field sits nearest the sentence that explains it.
- **Cost:** the pip wrapper and `Score against` **move right 292px**. No declared value changes —
  not a padding, not a font-size, not a colour, and nothing about `ScoreAgainst`'s own geometry,
  which the gap report lists as required-to-preserve under rules 1, 8 and 15. But shipped
  x-positions move, and that region is exactly what those rules cover.

### Option 2 — trailing edge, before the sort trigger

    colours (+ mode) → score against → search → order

- **For:** **every shipped x-position is preserved.** Nothing in the protected region moves by a
  pixel, at any width.
- **Cost:** a narrowing control lands *after* the scoring control, so the bar no longer reads
  *narrow → score → order* — the one thing that order is for. The field also sits furthest from the
  exclusion line it explains.

**Identical at 375px.** The phone stacks one control per row, so search takes its own row either
way and the measurements below are unaffected by the pick. Every other state in this handoff is
drawn at the leading edge; if Hugh takes option 2, the only redraw is the desktop bar’s order.

---

## The worst reachable state at 375px

The default stack answers §7 for a player who has touched nothing. **That is not the question §7
asks.** Canvas **A4** draws this state as a 343px frame, with the two suppressed elements struck
through in place; the table below is that frame, measured. It is the phone with everything the
player can turn on: a query, two pips lit, `Exactly`,
the chips, and a report above the first row. The shipped column is the same state on the shipped
bar. Gaps between rows are counted on both sides — 10px, and 8px between the pip row and its chips.

| Row | Shipped | Drawn |
|---|---|---|
| Title + subtitle | 66 | 66 |
| Scope | 44 | 44 |
| Pips + count | 34 | 34 |
| Modifier label + row | — | 65 |
| — exact note · suppressed | — | **0** |
| Colour chips | 34 | 34 |
| `Score against` + label | 60 | 60 |
| Search + sort | 44 | 44 |
| The one report · aside | — | 88 |
| — exclusion line · suppressed | — | **0** |
| Rows, summed | **282** | **435** |
| Gaps between rows | 48 | 68 |
| **Before the first row** | **330** | **503** |
| | | **+173** |
| *As R1 drew it* | *330* | *605* |

**`revealBand` is not in this table, and R3 was wrong to count it.** It is a prop of
`RevealControl`, rendered *inside* the `<ul>` after the sliced items and only when more remain
(`discovery-view.tsx:316-333`) — it is never above the first row. R3 counted it on both sides, so
the difference was right and both absolutes were 40px too high. **503px against 330px**, and the
visible-rows claim moves from about two and a half to **about three**.



**The two zeroed rows are R2’s one-report rule** (`STATES-search-and-exclusions.md` §4): at 375px
the aside outranks the exclusion line, and the exact note is suppressed whenever a report already
names the mode. It takes 102px off the R1 stack. Desktop renders both — it has the width.

The aside is 88px, not R2's 72px: the mobile drawing carries `excluded.joinAlso`'s identity clause
in full, which is what the key emits.

**503px still leaves about three rows of list on an 812px phone.** The modifier argument
survives the measurement; whether the number is acceptable does not follow from it. Two ways out,
and Design will not pick between them unprompted:

- **(a) Accept it.** Every row in that state is something the player turned on, the bar is not
  sticky, and one scroll puts the whole block away. The player who has five controls active is the
  player who wants to see what they did.
- **(b) The phone gets a disclosure for tier 2 only** — pips, mode and chips behind one summary row,
  with search and everything else staying put. Costs ~130px, and reintroduces for one tier on one
  width exactly what §7’s answer rejected for the bar.

**Hugh’s call**, and the reason R2 is Orange rather than Green on §7.

---

## Rejected structures

### 1. A filter sheet

The obvious answer, and the one the brief names first. Four of five controls go behind a trigger.

Rejected because **the player cannot see which control changed the list** — the failure the
discovery handoff already refused, and materially worse here: §4.3 promises that when a search
excludes a named commander, the list *names the control and offers the correction*. Every one of
those corrections is a one-tap fix on a control a sheet would put two taps away, behind a layer
that has to be opened to be understood.

A sheet also has to summarise itself — "3 filters active" — and that summary is a fifth thing above
the list, carrying less information than the four controls it replaced.

### 2. A collapsed summary row

Reads well at rest and badly in use. The row states what is active and expands to change it; so
every correction becomes expand-then-act, and the exclusion sentences read as instructions to go
and find something.

It also cannot show a *mode*. `Green · Black` in a summary is true under both join modes, and the
whole point of §4.2 is that those two are different lists.

### 3. Join mode as a sixth pip

Forbidden by §4.2 by name, and it fails structurally: a swatch that is not a colour, in a row of
five that are. The row's vocabulary is hue. The same failure a `C` pip for colourless would have.

### 4. Join mode as a third `Score against` segment

Mixes the colour axis into the collection axis — ruling 1's rejected three-tab strip, again — and
touches shipped geometry the gap report lists as required-to-preserve. Two must-nots for one
placement.

### 5. Search in the app shell

A global field cannot narrow *this list in place*, and §4.3 rules that it must. It would also
promise results across decks and collection, which is a different feature with a different scope
of index.

---

## What must not happen

- **The modifier must not become visible with no colours lit.** It would be a control for nothing,
  and at 375px it would cost a row for nothing.
- **Search must not gain a scope of its own.** No "search all commanders" mode that leaves the
  plane — §4.3 says it narrows in place, and the escape offer in the no-match state is spelling
  help, not a jump.
- **The exclusion line must not become a third control.** It is a receipt. Corrections live in the
  states that name a specific excluded row, where there is one obvious thing to fix.
- **Nothing above the list may animate the list.** Third statement of the same rule; at 3,326 rows
  the reason is only stronger.
- **No seventh thing.** The bar is at its limit. A tag filter (#159) does not fit here and needs its
  own composition.
