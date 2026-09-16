# The commander row — states matrix (R1)

One component, two routes, two widths. The commander throughout is **Glarb, Calamity's Augur** — the
spec's own reported row — with **Kenrith, the Returned King** where a second name is needed. All
sentences, counts and prices are fixtures; reproduce the shape of the string, never the value.

The row is three slots stacked under one art band: **sentence**, **gap line**, **figures**. Every
state below is one of those slots changing its occupant. **No state adds, moves or reorders a slot.**

---

## A · The five states

| # | State | Condition | Sentence slot | Gap slot | Figures slot |
|---|---|---|---|---|---|
| 1 | **Full** | `prose` present, mechanic set non-empty with unplayed members | the stored sentence | `None of your decks play Proliferate, Infect or Landfall.` | Fit chip · deck count · price |
| 2 | **No sentence** | `prose is null` — one commander in the catalogue | **unmounts.** No placeholder, no reserved height, nothing synthesised and nothing truncated into the gap | unchanged | unchanged |
| 3 | **No tags** | **mechanic** set empty after classification — includes a commander whose every tag is a creature type | unchanged | the shipped `No tag data` note, in the slot the line would occupy | unchanged |
| 4 | **Nothing new** | mechanic set non-empty, **every member already played** | unchanged | `You already play every mechanic this commander leans on.` | unchanged |
| 5 | **Unpriced** | `price.kind === "absent"` | unchanged | unchanged | the price figure **unmounts**; the deck count stays; no dash, no zero, no reason given |

State 3's condition is a **redefinition** of the spec's (`commander_support.tags` empty → *mechanic*
tags empty). It is the change that keeps state 4 honest: see INDEX §D.

## B · The slots are independent, so the states multiply — and all of it is drawn

| | Full gap | Nothing new | No tag data |
|---|---|---|---|
| **sentence present** | 1 | 4 | 3 |
| **sentence absent** | 2 | 2 + 4 | 2 + 3 |

× `Unpriced`, which removes one figure from the foot line in all six. **No combination needs a
ruling**, because no slot reads another: the sentence is the commander's, the gap line is the
reader's, the figures are the catalogue's. That independence is the composition's load-bearing idea,
and it is why five states cost one branch each rather than a matrix.

## C · What does NOT change

| Surface | Ruling |
|---|---|
| `ArtWash` / the band | **Unchanged**, and `labelAtPx` drops to one value — one row, one block. |
| The Fit chip | **Unchanged**, both sizes, both denominator forms. `40/40` needs no new string. |
| `IdentityPips` | Unchanged. |
| `PriceSlot` | Unchanged — its dot, its source label, its absent rule. |
| Commander Details | **Untouched.** It already prints this sentence (`why-section.tsx`) and this figure; the row is catching up to it, not the reverse. |
| The lane filters, orders and result lines | Unchanged. The row stops printing the floor note; the header still states the floor once. |
| `Pull it`, the decklist row, every other surface's marker | Untouched. |

## D · The rules the matrix is generated from

1. **Nothing on the row may be read off ownership.** One component, two populations. This cut
   `not in your collection`, and any state that reintroduces a lane-specific line reopens it.
2. **The gap line always draws something.** Its slot is never empty and never a placeholder — one of
   three occupants, always.
3. **A figure with no reading is omitted, never zeroed.** Price, deck count and `fitSynergy`'s
   denominator all follow it.
4. **The row prints the denominator it was given.** Never a bare `40/100`.
5. **No creature type reaches the reader.** An unclassifiable label is excluded; a thinner sentence is
   cheaper than a wrong one.
6. **The sentence is the commander's and the gap line is the reader's.** Neither may borrow the
   other's subject, which is why the nearest-deck clause cannot come back in either slot.
7. **Two sentences, three figures, and no table.** Any figure that is only interesting after the
   decision to investigate belongs on Commander Details.
8. **One treatment on both sorts.** No accent run, no per-sort emphasis, no reordering — the row
   cannot tell you which sort produced it, and that is deliberate.
9. **Height varies with the sentence and with nothing else.** Not with the sort, not with the lane,
   not with the state of the gap slot.
10. **No motion, on any of it.**

## E · Copy, per state

| State | String |
|---|---|
| Sentence | `commander_support.prose` — **stored, never edited at the call site** |
| Gap, three names | `None of your decks play {a}, {b} or {c}.` |
| Gap, two names | `None of your decks play {a} or {b}.` |
| Gap, one name | `None of your decks play {a}.` |
| Gap, nothing new | `You already play every mechanic this commander leans on.` |
| Gap, no mechanic tags | shipped `discoveryCopy.untagged` — heading + body, unchanged |
| Fit | shipped `commandersCopy.row.fitDenominator` / `fitDenominatorMeasurable` |
| Deck count | shipped `discoverCopy.row.popularity` |
| Price | shipped `discoveryCopy.price` |
| No sentence | **no state, no string** |
| Unpriced | **no state, no string** |

## F · Aria

The row's accessible name was `{name} · not in your collection · {justification}`. Both trailing
clauses go: the first is cut, the second was a spoken paraphrase of a sentence that is now read aloud
as written.

| Element | Spoken |
|---|---|
| Row link | `{name} · Fit {score} of {measurableTotal}` — `explainedCopy.score.scoreAria`, unchanged |
| Sentence | **read as written.** Not `aria-hidden`: the tag sentence was hidden because the link restated it, and nothing restates this. |
| Gap line | read as written, in all three of its forms |
| Fit chip | figure and denominator stay `aria-hidden`; the link's name carries the reading, as today |
| Deck count | read as written |
| Price | `priceCopy.aria` / `notStockedAria`, unchanged |
| Identity pips | decorative, unchanged |

**Nothing is announced.** The row has no control on it — the disclosure trigger retired with the tag
list, and with it the row's `"use client"` boundary.
