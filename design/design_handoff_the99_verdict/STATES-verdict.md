# The verdict surface — state matrices

## A · The verdict block — three readings drawn, one deferred

| `permits` | Face | Sub-line | Glyph |
|---|---|---|---|
| `[1,2]` | `Exhibition or Core` + Split chip | nothing pushes past Core; which of the two is yours to say | ringed `?`, `--bracket-1` |
| `[2]` / `[3]` | the single name + its chip | the rule that ruled the one below out | none |
| `[4,5]` | `Optimized or cEDH` + Split chip | bracket 3 only permits up to three game changers; which of the two is how you play it | ringed `?`, `--bracket-4` |
| `[3,4]` | **not drawn** | pending the spec amendment — a deck at 3 with a combo reads `3` | — |

All are the same box, height and mark. **No violation state**; Round 0's reserved card is discarded.
The in-flight case is unchanged from Round 0: em-dash numerator, denominator still drawn.

## B · A climb rung — three roles

| Role | Ground | Label | Body |
|---|---|---|---|
| **below** | `--surface-sunken` on `--border` | `to drop to here` | what to cut, naming the cards or the count |
| **yours** | `color-mix(bracket 12%)` on a solid bracket border | `where your cards are` / `your cards` | the findings that reach it, with `n allowed` or `no cap` |
| **above** | `--border`, or dashed bracket ink at 4–5 | `already allowed` / `to claim this` | *nothing rules it out*, or the ringed `?` declare line |

Mark sizes: 28px neighbours / 36px yours at desktop; **22px / 26px at 390** — both above the 20px
floor, so the mark is always drawn. Nothing in a rung is interactive.

## C · A finding — three states

| State | Desktop tile | 390 row |
|---|---|---|
| **empty** | dimmed mark, `0`, *nothing in the list*, no control | one 40px line, no rail |
| **present** | mark, count, names truncated with `+n`, `see the cards` | mark + count + name line + a right-aligned 44px rail |
| **not a limit** *(tutors)* | as present, plus a `no limit` chip on the title line | same |

Marks: bolt, peak stripped, turn again, lemniscate, drawn up. One ink; solid for a card on a list,
stroked for a behaviour that loops.

## D · The receipt modal — one chrome, two bodies

| | Header | Body | Foot |
|---|---|---|---|
| **card list** | glyph · name · count · close | tile grid, names under each | — |
| **combo** | same | the pair, tags, mana needed, in-deck; **steps full width below** | *assembled in this list* + `Commander Spellbook ↗` |

On the phone: the same sheet full width, tiles two per row.

## E · The population line — two states

| State | Drawing |
|---|---|
| **present** | *Of the {declared} {commander} decks that declared a bracket, {n} said {name}.* |
| **absent** | *EDHREC has no declared brackets for {commander}* — one of 27. **Never a zero.** |

Both below a hairline in the verdict block's foot, under **What other players say**.

## F · How we make these decisions — two states

| State | Drawing |
|---|---|
| **collapsed** *(default)* | one 10px mono line, `--fg-faint`, dotted `--border-dashed` underline + `▾` |
| **open** | a lead sentence, four rows (source, then what it misses), a closing *why we tell you this* line |

Local state, never persisted. Never a badge, never a tooltip.
