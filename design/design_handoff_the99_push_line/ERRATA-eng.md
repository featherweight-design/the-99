# Errata — the push line and the card note (Round 4)

Engineering notes on the drop. Design's own files are not edited here: a handoff is the
historical record of what was delivered, and rewriting one inside an engineering PR destroys the
only evidence of what was handed over. The package stays the artefact; this file is the
instruction.

Every defect below was found by `READINESS-r3-audit.md`, which recorded them and then had nowhere
to put the fix — `/copy-review` cannot reach these strings, because none of them has been
transcribed into `src/` yet. So they are a **carried note on the PR that transcribes each
module**, fixed in the same commit as the transcription rather than swept afterwards.

| module | destination | the PR that carries it |
|---|---|---|
| `push-line - copy strings.ts` | `src/lib/copy/bracket-delta.ts`, `src/lib/copy/upgrade-path.ts` | **PR 8b** |
| `card-note - copy strings.ts` | `src/lib/copy/card-note.ts`, `src/lib/copy/verdict.ts` | whichever PR draws the card note |

Both modules carry defect 2. Defects 1 and 3 are the card-note module's.

---

## 1 · The copy is British, in 28 places

`analyse`, `analysed`, `reanalyse`. Counted across the package excluding `READINESS-r3-audit.md`
itself, which quotes them while reporting them:

| file | occurrences |
|---|---|
| `README.md` | 8 |
| `The 99 - The Card Note and the Verdict.dc.html` | 8 |
| `card-note - copy strings.ts` | 5 |
| `STATES-card-note.md` | 3 |
| `HANDOFF.md` | 2 |
| `READINESS.md` | 2 |

**Three of them are strings the package marks production-final**, and those are the three that
reach a player:

```
eyebrow:   "This deck has not been analysed"
action:    "Analyse this deck"
reanalyse: "Analyse again"
```

US English is a standing rule for this project. The app has not shipped the verb yet —
`src/lib/copy/decks-builder.ts` carries only the neutral noun, `analysis: "Analysis"` — so this
round is where the verb enters the product, and it enters wrong. Every occurrence becomes
`analyze` / `analyzed`, **and the key `reanalyse` renames with it**, or the module ships a British
identifier over an American string.

`src/lib/copy/deck-analysis.ts` already shipped the American forms for the same two controls
(`analyze: "Analyze this deck"`, `again: "Analyze again"`), which is the spelling to match.

## 2 · Neither copy module compiles: `@/lib/copy/shared` does not exist

`card-note - copy strings.ts:20`

```ts
import { bracketPhrase, nameList, ordinal } from "@/lib/copy/shared";
```

`push-line - copy strings.ts:19`

```ts
import { bracketPhrase, nameList, numberWord, ordinal } from "@/lib/copy/shared";
```

There is no `src/lib/copy/shared.ts`. All four helpers live in **`src/lib/copy/deck-analysis.ts`**
— `bracketPhrase`, `nameList`, `numberWord` and `ordinal`, each already exported — and shipped
copy modules import each other **relatively** rather than through the `@/` alias, which exists but
is not the convention in this directory. Both imports become:

```ts
import { bracketPhrase, nameList, numberWord, ordinal } from "./deck-analysis";
```

dropping `numberWord` in the card-note module, which does not use it.

This is the second consecutive round to hand over a copy module that does not compile, which is
worth naming as a pattern rather than fixing quietly: a copy module is the one artefact
engineering transcribes rather than reads, so a broken import surfaces at the end of a build
instead of the start.

## 3 · `21 Sept` must be `21 Sep`

The committed card note's provenance line reads *determined for v4 · all 99 · 21 Sept*, in four
places: `STATES-card-note.md:53`, `README.md:142`, and the canvas at line 377 (twice in one span).

**Only the month abbreviation is wrong, and it is one character.** The day-month order is the
app's own convention, not a British idiom creeping in — the shipped version stamp reads
`v7 · 2 Aug`.

The stamp is not hand-written in any case: `formatDeckDate` composes it and passes `en-US`
**for exactly this reason**, saying so in its own header — *"`en-US` rather than `en-GB`, for the
reason the game log gives: en-GB abbreviates September as `Sept`."* So the fix is not to retype
the string with one fewer letter; it is to draw the stamp through `formatDeckDate` and let the
formatter own the abbreviation.

Also on this: `src/lib/price.ts` formatting with `en-GB` is **not** the same inconsistency. It
asks for `month: "long"` and `weekday: "long"`, which render identically in both locales. The
locale only bites on the short month, which is the one thing that file never asks for.

---

## One defect recorded here and not carried into `src/`

**A subject-verb agreement error in a canvas section heading.** `The 99 - The Card Note and the
Verdict.dc.html:111` reads *"the two registers that makes"* — `make`, not `makes`. It is a heading
on the canvas rather than a shipping string, so no transcription fixes it and nothing in `src/`
will ever carry it. Recorded so a reader quoting that heading into a later document does not
inherit it.
