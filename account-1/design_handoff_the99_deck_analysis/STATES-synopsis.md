# The synopsis slot, and the verdict — state matrix

> **Every verdict on every surface draws the crown and the name.** The five states below differ in
> their prose slot alone; their verdict column is the same component throughout, and state 5 draws it
> with all five rungs hollow.

## The rule above all five

**The verdict column is identical in four of the five states.** It is counted from the decklist and
does not depend on a generation, so a missing, stale or refused sentence never takes the figures
down with it. The fifth state is the deck that has not been read at all, and there the verdict — not
the prose — is what is missing.

**No state reserves space for prose that is not there.** No paragraph-shaped placeholder, no shimmer,
no dummy lines. **No state ever renders a partial sentence**: the precedent is
`commander_support.prose`, where a row failing the accept contract stores nothing.

## The five

| # | State | Prose slot | Verdict | Action | Tone |
|---|---|---|---|---|---|
| 1 | **Present** | The sentence, `--fg-body` 15.5px | as computed | none | ordinary |
| 2 | **Never generated** | One line, `--fg-faint`: *No summary has been written for this deck yet.* | as computed | `Write one` + *about five seconds* | ordinary |
| 3 | **Stale** | The old sentence, demoted to `--fg-faint`, under an `out of date` tag carrying *7 of 99 cards have changed since it was written* | as computed, marked **recounted just now** | `Write it again` + *written against 92 of these 99* | `--warning` on the tag only |
| 4 | **Refused** | No sentence. `not written` tag + *We wrote a summary and it did not check out against your list, so we are not showing it. Nothing about your deck changed.* | as computed | `Try again` + *2 of 3 claims failed checking* | `--danger` on the tag only |
| 5 | **Not yet read** | *We have not finished reading this deck. The mix below is counted from your list and is true now; the bracket needs one pass over all 99.* | **`—`** in `--border-strong` with an **all-hollow crown**, denominator `— of 99 read` | none | in-flight |

### State 3 — why the stale sentence stays on screen

Hiding it costs the player a true description of 92 of their 99 cards in order to avoid being wrong
about seven, and they can see the seven. It is demoted, tagged, and dated with its own denominator.

**The verdict beside it is explicitly marked current.** Figures recount on every edit; only the prose
goes stale. The one thing this state must not do is let a reader think the numbers are as old as the
sentence.

### State 4 — why the refusal is stated

State 2's *no summary yet* would be a lie: a player who pressed a button is owed the outcome. The
count of failed claims is what makes the refusal credible rather than a shrug.

**`--danger` is on the tag and nowhere else.** Not the border, not the button, not the text. A red
block for a service that will work in a minute is a fire alarm for a delay. **Retry is a button,
never automatic** — a silent retry loop is how a wait becomes a bill.

### State 5 — unfinished, not broken

Print what is known, dash what is not: the shipped in-flight treatment of the role cell, reused. The
em dash is the numerator and **the denominator is still drawn**, so the slot reads as not-yet rather
than as nought. The mix needs no index run and is simply true.

## The verdict's own states

| State | Face | Sub-line | Action |
|---|---|---|---|
| **Range, undeclared** | `1–2` display 800/32px in `--bracket-1`, the name beside it, the crown under it with rung 2 at 40% | *1 and 5 are yours to declare.* | `Say which this is`, neutral outline, **permanently skippable** |
| **Range, declared** | `1 Exhibition` + a neutral `your call` pill; the crown fills one rung solid | *Your cards permit 1 or 2. You said Exhibition.* | `change this`, dashed-underline mono |
| **Single bracket** | `4 Optimized` + a four-rung crown in `--bracket-4` | the cards that rule out 1–3 — counts, no `of 99` | none |
| **Violation** *(Round 2)* | declared bracket + name + `over` tag, its crown beside *cards reach 4* | reserved | reserved |

**All four are the same box, the same height and the same crown.** A range takes the face, the name and the crown a single bracket takes — no dashed
border, no warning ink, no *incomplete* — because it is a finished answer to the question the cards
can answer. The chip carries `1–2` out to the deck list unrounded.
