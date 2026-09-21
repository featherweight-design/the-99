# Readiness audit — the declaration (Round 3 of 5)

**Verdict: 🟠 Orange.** One genuine design call is missing; everything else in the package is
eng-resolvable. Audited 2026-09-20 against `main` at the time of writing, with every claim below
checked against the shipped source rather than against Design's self-assessment.

Design self-assessed 🟡 Yellow. The gap between that and this verdict is a single item — drift
turns out to have more shapes than the two drawn, and one of them makes the round's only drift
sentence factually wrong. Design could not have seen it from the handoff: it is a property of
`permitsFor`, which was amended in #765 after this round was drawn.

## The one thing that goes back to Design

**Drift has more than two shapes, and one of them contradicts the sentence.**

`STATES-declaration.md` §E asserts two shapes and no others — `1|2 → [4,5]` and `4|5 → [1,2]`.
The state is computed as plain set membership:

```ts
// src/lib/bracket/slot.ts:130
declaredOutsidePermits: b.declared !== null && !permits.includes(b.declared),
```

and `permitsFor` (`src/lib/bracket/rules.ts:79-90`) returns `[1,2] | [2] | [3] | [4] | [4,5]`.
Three reachable shapes are undrawn, each one edit away:

- **declared `1`, permits `[2]`** — a Bracket-1 deck adds one extra-turn card
  (`EXTRA_TURN_LIMIT_BRACKET_1 = 0`). The permitted side is a SINGLE mark, not a split.
- **declared `1|2`, permits `[4]`** — with the 3-vs-4 boundary resolving rather than widening,
  this is the commoner upward drift; §E draws only the `[4,5]` variant.
- **declared `4|5`, permits `[3]` or `[2]`** — the player tunes the deck DOWN. The line reads
  "Your last changes moved this deck **past** that", which is false in this direction, and the
  state's whole posture (credit the player with the movement, never scold) has to be re-derived
  for a move backwards.

R2 deleted `driftVoice` on the premise that only the two symmetric shapes exist. The premise does
not hold. **The question for Design:** what does the drift row draw when the permitted side is a
single bracket, and what is the sentence when the deck has moved DOWN out of its declared range?

## Resolved without Design

Each of these is named here so the plan carries it; none needs a design round.

1. **`permits: [4]` is missing from the sub-line matrix.** A single bracket is not a question, so
   `[4]` draws no declaration line, identically to `[3]`. Extending the existing row settles it.
2. **The lean is drawn on a verdict it can never explain.** §C pairs `reachable` with `[4,5]`;
   `leanFor` (`slot.ts:160-163`) returns null unless `permits.length === 1`, and `reachable` means
   `permits[0] === 4`. The consequence is larger than the cell: frames **1e** and **1f** compose
   the ask and the lean together, and the ask needs a RANGE while the lean needs a SINGLE — so the
   round's flagship frame is a state the code cannot produce. Corrected by reading the verdict
   column as `[4]` and splitting the live region into two announcements that never co-occur.
3. **`lean.receipts[].tutors` is the wrong shape** — Design is right that it is flat per combo
   (`bracket/types.ts:56`) where the modal groups by piece. Design's stated reason is wrong, and
   the correction makes this cheaper than billed: the profile ALREADY carries the association
   (`ComboReach.reaches: { tutor, combo, piece }`, `profile/types.ts:161-166`) and `leanFor`
   deliberately discards `piece` when it dedupes. A projection, not a re-derivation.
4. **`lean.receipts` does not say which combo decided the verdict.** `slot.ts:166` maps EVERY
   combo in the deck, including ones no tutor reaches, while the modal draws exactly one. Resolve
   by marking the deciding `variantId`, reusing `comboLandsEarly`'s per-combo predicate rather
   than writing a second copy of it.
5. **A combo half covered by the COMMANDER has no copy.** A piece counts as covered when a tutor
   finds it or it sits in the command zone (`rules.ts:120-131`), and the reach builder skips
   commander pieces by construction — so a commander-combo deck slots `reachable` with zero tutors
   on that half and the modal prints "nothing in this deck searches for it" under a header saying
   both halves are findable. A third `found by` reading is owed; `ComboRef.usesCommander` already
   flags it.
6. **`CardRef` carries no image uri, and must not grow one.** The profile is a cached document
   keyed on a fingerprint, so widening it would bake printing art into every cached profile.
   Resolve at the draw, in the modal's own loader, honouring the owned-printing preference the
   deck surfaces already apply.
7. **`declared.permitsBelow`'s trailing clause is false for `[1,2]`.** "the two have no card
   limits between them" is true of 4/5 and false of 1/2 — Exhibition and Core differ by exactly
   the extra-turn limit. Make the clause conditional on the range.
8. **Every new user-facing string uses em dashes**, which this repo swept out of shipping copy.
   Rewriting them is mechanical, but the quoted strings in `STATES`/`HANDOFF`/`README` move in the
   same PR or `pnpm check:copy-drift` reports the tables as drift.

## Claims that did not hold

Recorded so the next round does not re-litigate them.

| Design's claim | What the code says |
|---|---|
| The contract comment still reads "Only when `permits` is `[3,4]`" | Already amended on `main` and on `feat/combo-decides` — `types.ts:62-66`, merged as #765. Design read an older commit. |
| `permits` is still typed with `[3,4]` in the union | No such union exists on either branch; `permits: Bracket[]`. |
| Deriving tutors-per-piece client-side means re-running coverage | The association is already on the profile; see item 3. |
| `ComboRef`/`CardRef` carry image uris | `CardRef = { oracleId, name }`. No image uri anywhere in the profile types. |

## Coverage

Both widths are drawn for the ask, all four sub-line readings, and the lean. Missing: the
reasoning modal at 390 (prose only — "two tiles stack"), the `drawOnly` modal body at either
width (prose only), `permits: [4]`, the drift shapes above, and the command-zone half.

**No loading, error or refused state appears anywhere in the package.** Round 0 drew five synopsis
states including stale and refused. The sub-line and the lean are drawn only against a ready
analysis, which is inherited from Round 2 — but the DECLARATION'S WRITE is new to this round and
has no in-flight, failed or optimistic reading, so an implementer would have to invent one.

## Ordering

**Round 2 is design-complete and entirely unbuilt.** No component under `src/components/decks/`
matches `analys|bracket|verdict|declar`, and there is no analysis route. Round 3 is a third body
in Round 2's modal chrome, a sub-line in Round 2's verdict block, and three edits to Round 2's
climb — so none of the UI can start before Round 2's block, modal chrome and `deckAnalysisCopy`
exist. The copy file imports `BRACKET_NAMES` and `deckAnalysisCopy.brackets`, neither of which
exists yet; that is expected, and it is a hard dependency.

Two pieces are NOT blocked that way and can land first: the reshaped `lean.receipts` with the
deciding-combo rule (items 3 and 4 — pure, unit-testable, no UI), and the declaration's write path
(the column, the action, its refusal rules).

## Already in place — do not re-plan

- `decks.declared_bracket`, with its `between 1 and 5` check constraint and its never-infer note.
  Only the write path is owed.
- `BracketVerdict.declared` and `.declaredOutsidePermits`, computed.
- `comboReach.reaches` already carrying `{ tutor, combo, piece }`.

## About

READINESS item 11 asks for an About entry and an `ABOUT_VERSION` bump in this round. Deferred, with
a reason: a multi-round feature line writes its About entries once at launch. Five rounds each
bumping the version would put `/about` in front of every account five times for one feature.
