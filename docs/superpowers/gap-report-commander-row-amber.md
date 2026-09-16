# The three amber figures, measured — commander row R1

`design/design_handoff_the99_commander_row/READINESS.md` §2 names three figures R1 derived
and did not measure, and assigns each to engineering. All three are now measured. To be
folded into the readiness doc as errata with PR 4a, not sent back to Design — none of them
moves a drawing.

## A · Longest stored sentence — the desktop budget holds with ZERO margin

`max(length(prose))` over production's `commander_support`:

| | value |
|---|---|
| sentences | 3,341 of 3,342 |
| longest | **190** |
| mean | 148 (matches the handoff's figure exactly) |
| p95 | 171 |
| over the desktop budget (≈190 chars, 2 lines at 760px) | **0** |
| over the phone budget (≈176 chars, 4 lines at 330px) | **75** — 2.2% |

**Desktop is exactly met and not exceeded.** The longest sentence in the catalogue is 190
characters against a 190-character budget, which is a coincidence worth distrusting rather
than celebrating: the budget was derived from a character estimate, and characters are a
proxy for a measure that depends on glyph widths. A 190-character sentence of wide glyphs
will wrap to three lines where the estimate says two.

**The phone budget is exceeded by 75 commanders.** The handoff's own instruction covers it —
*"the measure moves, not the design: widen to the row's full `1fr` before adding a third
line"* — so this is an eng decision inside a ruling that already exists, not a Design
question. Two honest options, to be decided when the sentence block is built and measured in
a browser rather than in characters:

1. Widen the phone measure toward the row's full `1fr`, which the handoff prefers.
2. Accept a clamp on 2.2% of rows, which is what the current drawing does.

Either way the clamp must stay — a sentence that overflows its block silently is worse than
one that is visibly cut, and `-webkit-line-clamp` forces an atomic box, so nothing may be
placed after the sentence inside the same element.

## B · Mechanic tags per commander after classification — 93.1% reach the cap

`eligibleMechanics` over all 3,279 local-dev rows, the real classifier and the real 0.5%
floor:

| eligible mechanic tags | commanders | share |
|---|---|---|
| 0 | 116 | 3.5% |
| 1 | 50 | 1.5% |
| 2 | 59 | 1.8% |
| **3 or more** | **3,054** | **93.1%** |

The handoff's worry was the opposite case: *"if commanders commonly land on one mechanic tag
the line is thinner than drawn."* They do not. **The three-name form is the normal form**,
the one- and two-name forms together cover 3.3%, and the cap binds on nine rows in ten — so
the drawing is right and `GAP_NAME_CAP` is doing real work rather than guarding a rare tail.

The 116 at zero is the `noMechanics` population, and it matches the spec's figure of 118
within the two commanders the index has gained since.

## C · `Nothing new` frequency on `/commanders` — reader-dependent, and it can be the majority

Measured on both local-dev fixture accounts, through the real `loadCommanderRankings` and the
real `loadDiscovery`:

| account | built decks | played tag slugs | `/commanders` `allPlayed` | `/discover` `allPlayed` |
|---|---|---|---|---|
| 1 | 18 | 215 | 151 of 237 — **64%** | 67% |
| 2 | 34 | 43 | 5% | 5% |

**More decks does not mean more coverage** — it depends on whether *those* commanders are
tag-rich, which is why the two accounts invert despite account 2 having twice the decks.

The handoff's contingency reads: *"if it is the majority, §4's rejected 'celebrate it' option
stays rejected for the same reason, harder."* It **is** the majority for account 1, so that
rejection is now load-bearing rather than precautionary. Recorded as confirmation of a
ruling, not as a new question.

What this does raise, and what belongs to Product rather than to this PR: on a reader like
account 1, two thirds of rows spend their gap line saying the reader already plays everything.
The line is never empty by design — ruling D2 — so nothing is broken. But "how often does the
gap line tell you something" has no single answer, and the 0.5% floor pushes it toward
`allPlayed` deliberately (it takes the median eligible tag count from 33 to 9). Worth a look
once the row has been lived with, which is where the spec already defers the second stored
sentence.
