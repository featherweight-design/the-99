# STATES: the read (R1)

These extend `../STATES-help-me-choose.md`. Every frame is drawn at 900 and 390. `scene` is the prop on `Help Me Choose Read.dc.html`.

## Rows changed in the R1 table

| Id | Was | Now |
|---|---|---|
| 2a | `blank`, words box first, Find commanders | **7a.** The box is last, as Anything else? |
| 2b | `matched`, words → 4 chips | **Retired.** Text never becomes chips |
| 3a | `leftover`, Not used + offer | **Retired.** There's no offer. Text starts the read on submit |
| 3b | `reading` | **7d.** Same panel, re-keyed, with steps |
| 3c | `read`, deeper chip + Still not used | **7g / 7h.** Reasons, no chips added |
| 3d | `failed` | **7f** |
| 3e | `emptyread`, nothing to add | **7j**, nothing fits |
| 3f / 3g | `spent` / `paused` on the results | **7c** on the form, **7l** on the results |
| 4c / 4d / 4e | card via words | **Open.** The card answer needs a picker (Q1) |

## New rows

| Id | Scene | Form | Your answers / You wrote | Read panel | Results |
|---|---|---|---|---|---|
| 7a | `formEmpty` | box empty, `optional`, no pill, no line | — | — | — |
| 7b | `formFilled` | Ask A, accent edge, `46 / 800`, `1 credit` pill, `creditsCopy.first` | — | — | — |
| 7c | `formSpent` | Ask A, `--border-strong` edge, spent caption, plain button, `extra.spentLine` | — | — | — |
| 7d | `reading` | — | none · Ask A | Reading… · steps (1 now, 2 next) · hairline `1 credit` Reading… · Stop | free order at 0.45, best fits too |
| 7e | `stopped` | — | same | `stopped` tag (muted) · Try again `1 credit` | free order at 1 |
| 7f | `failed` | — | same | `didn’t finish` tag (danger) · Try again `1 credit` | free order |
| 7g | `askA` | — | none · Ask A | `done` · 3,445 / 36 · `1 credit used · 8 of 10 left` | 10 with reasons, no deck named · rest in free order |
| 7h | `askB` | — | none · Ask B | `done` · 3,445 / 38 | 10 with reasons naming Omnath / Teval · no Omnath row |
| 7i | `black` | — | `exactly Black` · Ask A | `done` · 268 / 34 · "Your colors held" | 10 mono-black with reasons |
| 7j | `nothing` | — | `colors Colorless` · Ask B | "Nothing fits what you wrote", no tag · Change answers link · `No credit used · …` | free order, full strength |
| 7k | `nodecks` | — | none · Ask B | `done` · 3,467 / 37 · "no decks yet" sentence · `4 of 5 left` | 10 with Landfall-only reasons |
| 7l | `unread` | — | none · Ask A | "What you wrote wasn’t read" · disabled `0 left` Read it · bare `creditsCopy.standing` | free order |
| 7m | (no frame) | — | — | 7g with line `No credit used · you asked this already` | the stored result |
| 7n | (no frame) | 7c with `creditsCopy.paused` / `ownerShare` as the line | — | 7l with the same | — |

## Credit line, by allowance (replaces R1's)

| Allowance | Form, box filled | Results panel |
|---|---|---|
| ≥ 1 left | pill `1 credit` · `creditsCopy.first` | read runs; done: `read.doneLine(standing)` |
| 0 left | no pill · `extra.spentLine` (one line) | 7l: `0 left` · `creditsCopy.standing` |
| owner's share used | no pill · `creditsCopy.ownerShare` | 7l with `Paused` pill |
| app paused | no pill · `creditsCopy.paused` (widened) | 7l with `Paused` pill |
| box empty | no pill, no line | no panel |

Precedence is unchanged: paused, then owner share, then spent. There's still no motion anywhere.
