# The declaration — state matrices

**Naming rule, everywhere in this package:** a bracket is written **by name alone** — *Optimized*,
*Core* — because every face, chip, pill and rung that names one is drawn beside its mark, and the
mark is the numeral. **The one place a number is spelled is the reasoning modal's heading**
(*How we determined bracket 4*), which is the only bracket reference on the surface with no mark
beside it.

## A · The sub-line — five readings, one box

| `permits` | `declared` | `declaredOutsidePermits` | Face + pill | Sub-line |
|---|---|---|---|---|
| `[1,2]` | `null` | — | *Exhibition or Core* · split pill, labelled `split` | lead + chips **Exhibition** / **Core** + `skip this` |
| `[4,5]` | `null` | — | *Optimized or cEDH* · split pill, labelled `split` | lead + chips **Optimized** / **cEDH** + `skip this` |
| `[1,2]` / `[4,5]` | set, inside | `false` | **the declared bracket alone** — *Optimized* · single chip | *You said Optimized. That is what this deck says at a table.* `change` **inline** |
| `[1,2]` / `[4,5]` | `null`, skipped | — | the split face stays | *Not declared. The range stands on its own, and we will leave it there.* `say which` inline |
| `[4,5]` | `2` (or `1`) | `true` | the split face stays | declared mark → permitted marks, labelled; one sentence; *Your declaration stands as you left it.* `change what you said` inline |
| `[2]` / `[3]` | — | `false` | the single bracket | **no declaration line at all** — a single bracket is not a question |

**Answering resolves the face.** A declared deck stops drawing a split: the title line becomes
the declared bracket and the pill becomes its chip. The permitted range does not vanish — it
moves into the description line (*Your cards permit Optimized or cEDH*), which is also
where a later drift shows it moving.

**A skipped deck keeps the split**, because the question is genuinely still open. It is simply
never asked again.

## B · The ask — two widths

| | Chip | Skip |
|---|---|---|
| **desktop** | 38px tall, auto width, mark 22px + name | same row, text weight, dotted underline |
| **390** | **44px tall**, `flex:1` each, mark 24px + name | its own line, 32px row, text weight |

No selected-chip state: the answer replaces the row. Hover is `--elevated` with the bracket ink
on the border.

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

## E · Drift — one cause, one sentence

A declaration is only ever 1, 2, 4 or 5, so drift is always **a deck crossing out of the range it
was declared inside**. Two shapes exist and no others:

| Declared | `permits` after re-analysis | Drawn |
|---|---|---|
| `1` or `2` | `[4,5]` | declared mark → 4/5 split, labelled *you said* / *your cards now permit* |
| `4` or `5` | `[1,2]` | the same, mirrored |

**Sentence:** *You said Core. Your last changes moved this deck past that — it now permits
Optimized or cEDH.* Then *Your declaration stands as you left it.* and
`change what you said`.

**The cause is always the player's own re-analysed edit.** Edit → commit → re-analyse → the app
re-reads the cards. The copy credits the player with the movement because the player caused it.

**Retired from R1:** the *reader overruled the lean* entrance. Declaring 5 where the lean said 4
is a declaration inside `[4,5]`, not drift — it can never set this flag. The `driftVoice` tweak
is gone with it.

## F · What the surface never draws

- A declaration the player did not make, including one inferred from the lean or from a
  re-analysis that moved the range.
- A re-ask after a skip, in any state, at any later analysis.
- A "fix" / "update my declaration" control anywhere.
- A tutor count in the lean or its receipts.
- A ringed `?` or a ringed `≈`, anywhere on the tab.
- A bracket name without its number, outside a chip or mark.
