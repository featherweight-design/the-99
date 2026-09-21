# The declaration — state matrices

**Naming rule, everywhere in this package:** a bracket is written **by name alone** — *Optimized*,
*Core* — because every face, chip, pill and rung that names one is drawn beside its mark, and the
mark is the numeral. **The one place a number is spelled is the reasoning modal's heading**
(*How we determined bracket 4*), which is the only bracket reference on the surface with no mark
beside it.

## A · The sub-line — four readings, one box

**A declaration is made on a version.** Version 1's answer is a complete, permanently true record
about version 1. A later analysis creates a later version with its own reading, and the block
never revisits the earlier answer — so no reading here quotes the player back to themselves.

| `permits` | `declared` (this version) | Face + pill | Sub-line |
|---|---|---|---|
| `[1,2]` | `null` | *Exhibition or Core* · split pill, labelled `split` | lead + chips **Exhibition** / **Core** |
| `[4,5]` | `null` | *Optimized or cEDH* · split pill, labelled `split` | lead + chips **Optimized** / **cEDH** |
| `[1,2]` / `[4,5]` | set | **the declared bracket alone** · single chip | *Declared **Optimized** for this version.* `change` inline |
| `[2]` / `[3]` / `[4]` | — | the single bracket | **no declaration line** — a single bracket is not a question |

**There is no skip and no skipped reading.** A player who says nothing leaves the version
unanswered, and the ask stays on the versions that have a range. `change` exists only while the
version is current, and it edits *this version's* answer — it never asks the player to revise a
statement.

**Answering resolves the face.** The split pill becomes the declared bracket's chip and the title
becomes that bracket; the permitted range moves into the description line.

## B · The ask — two widths

| | Chip |
|---|---|
| **desktop** | 38px tall, auto width, mark 22px + name |
| **390** | **44px tall**, `flex:1` each, mark 24px + name |

Two chips are the entire control — no skip, no third affordance, and no selected state (the
answer replaces the row).

## C · The lean — two readings, one shape

Label above both: **`HOW WE DETERMINED THIS BRACKET`**, 9px mono, `--fg-disabled` — the same
label form as *What other players say*. **No glyph.** The ringed `≈` is retired.

| `lean.reason` | Verdict it explains | Sentence ends | Control |
|---|---|---|---|
| `reachable` | `[4,5]` | *…puts this past Upgraded.* | `see the reasoning` |
| `drawOnly` | `[3]` | *…keeps this at Upgraded.* | `see the reasoning` |

## D · The reasoning modal — Round 2's chrome, a third body

| | Header | Body | Foot |
|---|---|---|---|
| **reachable** | lemniscate · **How we determined bracket 4** · qualifier *Optimized · both halves findable* · close | threshold in words; one tile per half at **100×140** card art; **found by** stacked under each | *assembled in this list* + `Commander Spellbook ↗`, above the tutors-are-not-a-limit line |
| **drawOnly** | same, **How we determined bracket 3** · *Upgraded · neither half findable* | same layout; **found by** reads *nothing in this deck searches for it* | same |

No count in either body, no `2 of 2` in the header, no declare control in the modal.

## E · A later version reads differently

**Replaces R4's drift matrix.** `declaredOutsidePermits` was drawn as a standing statement the
deck had outgrown. Per version there is no such statement: the block states **what this version
reads as, and what the last one read as.**

| this version | last version | drawn |
|---|---|---|
| single mark (`[2]` `[3]` `[4]`) | a range, declared | mark row + *This version reads as **Upgraded**. Version 1 read as Optimized or cEDH and was declared cEDH.* |
| a range (`[1,2]` `[4,5]`) | any, declared | the same row with a split on this version's side, *This version permits …*, **followed by the ordinary ask** for this version |

**One row, one sentence, no control.**

- **No `you said`, no `your last changes`, no `change what you said`.** The first put words in
  the player's mouth about a deck they have since edited; the last asked them to revise something
  that was true when they wrote it.
- **Direction is gone.** R4 needed *moved past* / *brought inside* because a claim about the deck
  can be wrong in one direction. A comparison of two readings is directionless: **one sentence
  covers a deck tuned up and a deck tuned down.**
- **Cardinality is the only axis left.** A range *permits*; a single bracket *reads as* — in the
  sentence and in the mark label. The `split` pill appears only where there are two marks.
- **The arrow is time.** *version 1 → this version*. Never flipped, rotated or recoloured.
- **A range on this version is asked**, whichever way the deck moved. Nothing is re-asked;
  a new question is asked, about a version that has never answered one.
- **A single mark still carries the lean** (`leanFor` fires iff `permits.length === 1`), except
  `[2]`, which has no lean reason. Order: description, lean, version row.

**Open in the spec, not here:** whether `declaredOutsidePermits` needs to exist at all. Per
version it is the observation that `v(n)` reads differently from `v(n-1)`, computable at analysis
time with nothing stored.

## F · What the surface never draws

- A declaration the player did not make, including one inferred from the lean or carried forward
  from an earlier version.
- **Any sentence that quotes the player** — *you said*, *your changes*, *you declared* in the
  second person.
- A skip control, or a "not declared, and we will leave it there" reading.
- A "fix", "update my declaration" or "change what you said" control.
- A tutor count in the lean or its receipts.
- A ringed `?` or a ringed `≈`, anywhere on the tab.
- A bracket name without its mark, except the reasoning modal's heading.
- A version row whose arrow, colour or geometry changes with the direction of the change.
- The ask and the lean in one card — the ask needs a range, the lean needs a single bracket.
