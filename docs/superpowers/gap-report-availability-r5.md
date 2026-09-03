# Gap report — card availability, R5 close-out

`design/design_handoff_the99_availability/R5-README.md` · verified against commit `a105b6d` on
`design/r4-availability` · 2026-09-02

**Verdict: 0 gaps.** Enumerate → verify per the design-review skill. Agent 3 was not run, because
Agent 2 flagged nothing for it to re-check.

## What was enumerated

R5 §1 is the only item in this run with drawn properties: the colour-identity pips on a
`/collection` dense row, which measured 67px on phone and 81px on desktop at five pips against
tracks of 40px and 54px. Everything else R5 ratified is prose, a formula or a copy key, and is
verified by the test suite rather than by a property table.

The pip properties are not in `docs/superpowers/design-tables/card-availability.md`, because a
colour pip is not an availability element — it shares a row with one. The table below is the record.

| Property | Mobile | Desktop | Result |
|---|---|---|---|
| Pip size | 11px | 13px | MATCH |
| Step, 1–3 pips | 14px | 17px | MATCH |
| `margin-left`, 4–5 pips | −5px, first pip 0 | −5px, first pip 0 | MATCH |
| Shingled five-pip width | 35px against a 40px track | 45px against a 54px track | fits |
| Shadow order | outset first, inset second | same | MATCH |
| Either shadow conditional on count | no | no | MATCH |
| Inset rim | `rgba(0,0,0,0.35)` | same | MATCH |
| z-order | descending left to right | same | MATCH |
| Grid template | unchanged | unchanged | MATCH |
| Row height | unchanged | unchanged | MATCH |
| `color-pip.tsx` | untouched | untouched | MATCH |

## The one deliberate deviation

R5 §1 asks for a new custom property, `--pip-ring`, declared on the row: `--surface` at rest, the
hover background on hover. The implementation reuses `--row-bg`, which the row already declares at
`rows-view.tsx:59` for the availability marker's seam, and which carries exactly those two values.

Verified rather than assumed: `--row-bg` is declared on the row element itself, is `var(--surface)`
at rest, and swaps to `var(--surface-raised)` on hover — the same token the row's own
`hover:bg-[…]` uses on that line. The hover swap is the failure R5 singles out as "the only way to
get this wrong", since a pinned `--surface` paints a visible hairline on hover at four-plus pips.

Two names for one value would let the ring and the seam drift apart on a surface where they sit
2px from each other. Recorded as MATCH-BY-EQUIVALENT.

## Not verified here

R5's remaining items are prose amendments, applied in the same commit and listed in its message.
Two rows of the design table are marked contested rather than amended, because both are queued to
Design and neither is eng's to settle: §3.1's decklist placement (tracker rank 4) and 15.10's
`listbox`-versus-checkbox-group role (#242).

Copy wording went to `/copy-review`, not to Design. One finding: `overAriaCountOnly` said "the
lists that include it" where every sibling on this surface says "finished lists", which reads as
though unfinished brews count toward an over-committed state. They do not.
