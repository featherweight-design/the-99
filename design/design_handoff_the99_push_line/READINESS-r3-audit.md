# Readiness audit — the card note and the verdict, R3 (Round 4 of 5)

**Verdict: 🟢 Green.** Audited 2026-09-21 against `main`. The amendment's withdrawal of the
per-add premise is right and the replacement is better scoped than what it replaces. **Nothing
here needs Design.** Four of the package's own six open items close against shipped code or a
measurement that already exists, and the two that remain are accepted rather than open.

Two copy defects have to be fixed before any of it lands, and one of them is in strings the
package calls production-final. Both are engineering's, via `/copy-review` rather than a redraw.

## The premise withdrawal is correct

A per-add sentence about the deck's standing could only recompute what the ruling says is not
recomputed, or quote a reading from four edits ago as current. Withdrawing it and keeping §5,
§4.2–§4.4 and `bracketDelta`'s five sentences as the *verdict's* vocabulary is the right cut —
the corrections in the superseded canvas are still the right copy wherever a determined verdict
explains itself, and keeping that file in the folder for that reason is the right call too.

## Four of the six open items close now

**Item 2 — "auto-analyse on tab open is rejected on a guess… nobody has a measured run time."**
Somebody does. `pnpm measure:profile-cost` against **staging, over all 20 real decks**:

| | |
|---|---|
| median cold build | **630ms** |
| slowest | **1.8–2.2s**, varying with compute warmth |
| fastest | 559ms |
| head read alone | ~120ms |

**A full pass is not free**, so the rejection stands — now on a number rather than on a guess.
The figure is already recorded in `schema.ts`'s own comment on the version snapshot, and it is
what settled the profile's fetch shape in the Tier B plan: on demand when the tab is pressed,
never on every deck visit.

The design argument survives the measurement independently, and is the stronger half: even a free
pass would remove the player's ability to compare a verdict against the edits made since, which
is what §1f exists to give them.

**Item 3 — "the changed-card diff needs a stored snapshot."** It has one.
`deck_version_cards` stores the card list at commit and `versionCards()` reads it; the draft-vs-
version diff is already built and probed (`probe:draft`). The stale block keeps its best line.

**Item 4 — "commit-time determination assumes commit is already snapshotting."** It is, via the
same table. Item 4 does not grow and §1e's *committed never goes stale* stands as drawn.

**Item 5 — "ordinals need a formatter."** Shipped. `ordinal` in `src/lib/copy/deck-analysis.ts`,
with the teens taking `th`. Locale is still unspecified project-wide, as it is for money, and
that is unchanged by this round.

## Two that stay open, and neither is a gap in the round

**Item 1 — the note's best clause needs Round 3 to ship.** Round 3 is now sub-project 1's to
build (Hugh, 2026-09-21), so it is a sequencing fact rather than a dependency on another team.
Until PR 5 lands the note ships in its undeclared form, which is drawn and deliberately plain.

**Item 6 — the detections' false-positive rate is unmeasured.** True, and the register is built to
survive it: the hedge sits on the detection (*we read this as*) and the rules clause is flat in
every row. The package's own remedy is the right one — if the rate is noticeable the answer is a
better detection, not a stronger hedge.

**Item 7 — nothing announces the card note.** Accepted, as at R2. A legend for a usually-absent
slot is worse than the absence.

## §C, §D and the thirteen rulings — read, and one finding

The verdict states read consistently and the rulings hold against the shipped contract. Ruling 13
carries `Marks 16px`, which is the shipped figure rather than the handoff's retired 12px floor, so
Design has absorbed that ruling correctly.

**`21 Sept` should be `21 Sep`.** v3's provenance line — *determined for v4 · all 99 · 21 Sept* —
uses the abbreviation this codebase deliberately switched locales to avoid.
`formatDeckDate` composes its own string and passes `en-US` **for exactly this reason**, and says
so in its header: *"`en-US` rather than `en-GB`, for the reason the game log gives: en-GB
abbreviates September as `Sept`."* The existing version stamp reads `v7 · 2 Aug`.

**Two corrections I owe on that finding**, because my first reading of it was wrong twice.

The day-month ORDER is not a British idiom creeping in — it is the app's own deliberate
convention, and `21 Sept` matches the shipped `v7 · 2 Aug` stamp exactly. Only the month
abbreviation is wrong, and it is one character.

And `price.ts` formatting with `en-GB` is **not** the inconsistency it looks like. It asks for
`month: "long"` and `weekday: "long"`, and those render identically in both locales — `September`,
`Monday`. The locale only bites on the SHORT month, which is the one thing that file never asks
for. No defect there; the two files disagree about a parameter neither of them uses.

## Two copy defects, and they must not ship

**1 · THE COPY IS BRITISH, IN 28 PLACES.** `analyse`, `analysed`, `reanalyse` — including three
strings the package marks production-final:

```
eyebrow:   "This deck has not been analysed"
action:    "Analyse this deck"
reanalyse: "Analyse again"
```

Hugh is in the US and US English is a standing rule for this project. The app has not shipped the
verb yet — `decks-builder.ts` carries only the neutral noun, `analysis: "Analysis"` — so this
round is where the verb enters the product, and it enters wrong. Every occurrence becomes
`analyze` / `analyzed`, and the key `reanalyse` renames with it.

**2 · THE COPY MODULE DOES NOT COMPILE.** `card-note - copy strings.ts` opens with

```ts
import { bracketPhrase, nameList, ordinal } from "@/lib/copy/shared";
```

There is no `src/lib/copy/shared`. All three helpers live in `src/lib/copy/deck-analysis.ts`, and
shipped copy modules import each other **relatively** (`../bracket/rules`) rather than through the
`@/` alias, which exists but is not the convention here. The import is
`from "./deck-analysis"`.

**This is the second consecutive round to hand over a copy module that does not compile** — R2's
audit found the same class of defect. It is mechanical every time, and it is worth naming as a
pattern rather than fixing quietly: a copy module is the one artefact engineering transcribes
rather than reads, so a broken import is discovered at the end of a build instead of the start.

## One copy call this audit makes

**`about two seconds` stays.** The median is 630ms, so the label over-states the typical case by
roughly threefold — but the slowest real deck takes 1.8–2.2s, and a control that promises one
second and takes two has broken a promise, where one that promises two and takes half a second
has not. Under-promising on a figure with this much spread is the right direction.

Recorded as a decision rather than left as an inherited string, because the number now has a
measurement behind it and the next reader should not have to re-derive that it was deliberate.

## Engineering list — unchanged, with sizes confirmed

Items 1, 2, 3, 5 and 6 stand as sized. Item 4 is smaller than the package allows for: the
snapshot exists, so only `determinedAt`, `determinedCardCount` and the diff read are new.

**Not in the list, confirmed against the tree:** no `bracketDelta` on any add surface, no per-edit
computation, no change to Round 1's marks (which are now fixed at 16px and not a prop), and no new
token, glyph or colour.

## Clear to build

PRs 8b and 9 may start. What they carry from this pass: the US English fix, the corrected import,
`21 Sep` through `formatDeckDate` rather than a hand-written date, the confirmed snapshot, and
`ordinal` as already shipped rather than as owed.

**This audit was first issued Green on a partial read** — the readiness doc, the engineering list,
the gaps and §A/§B — and §C, §D and the rulings were read afterwards, on Hugh asking for a
re-assessment. The verdict does not change, and the one finding that pass produced is a
one-character copy fix. Recording the order anyway: a Green issued over unread sections is a Green
about the sections that were read.
