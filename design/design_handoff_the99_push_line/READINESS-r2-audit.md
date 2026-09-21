# Readiness audit — the push line and the upgrade path, R2 (Round 4 of 5)

**Verdict: 🟡 Yellow.** Audited 2026-09-21 against `main`. **Five of the six R1 items are answered
cleanly**, the top-off premise is properly re-made, and the precedence flip arrived with a general
rule worth keeping: *an event outranks a standing count.* Yellow for one new uncovered `counts`
sub-state, one over-claiming `inert` clause, a README that contradicts the rest of the package, and
a copy module that does not compile.

## A correction I owe, first

**R1 was wrong about the Consider tile, and the error propagated into this package.**

R1 said `/collection`'s row **and tile** draw the marks inline after the name. That is true of the
row only. The tile puts them on the meta line ABOVE the name — `card-tile-caption.tsx` says so in
its own header, *"The meta line carries the marks that used to sit on the illustration; the name
line closes the tile"* — and the grid view imports no cost pips at all, where the rows view does.

So the tile treatment this round draws — ownership mark leading, fact marks after, one line above
the name, no pips on the art — **is `/collection`'s tile convention, not a third one.** The
conformity claim is correct. The product owner has separately confirmed the tile changes were
requested, for exactly that conformity, and they are an amendment to the shipped Add-panel tile
rather than a finding.

**And R1's placement finding stands for the two ROW hosts**, where Design's answer is also right:
Round 4 had no authority to move Round 1's shipped inline placement to suit a fourth surface.
Inline on the rows, line-above on the tile, is each host's own shipped convention.

## The six items

| # | Status |
|---|---|
| 1 placement | **Answered.** Reverted in full for the rows; the tile keeps its (correct) convention. |
| 1b five marks | **Answered by ruling** — all five stay, at 16px. Three ship today, so this is a real SEQUENCING dependency on Round 2's two unbuilt glyphs, recorded as such. |
| 1c the tile | **Answered by ruling** — requested for conformity, named as an Add-panel amendment. |
| 2 `inert` at `[4]` | **Answered.** Third clause written, and the state is reachable. |
| 3 precedence | **Answered**, with a general rule. See the side effect below. |
| 4 `ruleless` with coverage | **Answered in copy**, unfunded in the contract — the branch reads a coverage flag the union does not carry. |
| 5 `unquantified` at 4–5 | **Answered.** Second form, branching on a field the union already carries. |
| 6 `counts` limit | **Partially** — see below. |

## Still open, all resolvable here

1. **`counts` has no sentence when the binding bracket is 4 or 5.** The fix covers 1–3, but the
   game-changer limit is defined for those three only, so a `[4,5]` deck adding a Game Changer has
   no clause. Resolve by the same form Design wrote one union member over for `unquantified` at
   4–5: the count, then that no bracket above Upgraded limits them.
2. **`inert` at `[3]` claims more than the system computes.** *"Nothing in this deck searches for
   either half"* asserts reach for the candidate's own combo, which is never computed — coverage is
   read from the tutors already present. Say what is known instead.
3. **The stated precedence silently swaps `ruleless` and `unquantified`** relative to the shipped
   order, so a card that is both an extra-turn card and a tutor reads one way today and the other
   under the new list. Read as a transcription slip: the shipped order stands, because the
   extra-turn reading is the more specific fact and tutors are never counted against anything.
4. **README §2 reverts both owner rulings**, using R1's wrong tile premise — it says three marks
   rather than five, and the tile back as it ships. The handoff, the state matrix, the copy file
   and the canvas all say otherwise, so precedence settles it: the README is stale and gets
   rewritten from the corrected premise above.
5. **The copy module does not compile.** It imports four helpers from a module that does not
   exist; `nameList` is not exported; `numberWord` and `ordinal` exist nowhere in the tree; and
   every call passes a single bracket to a function that takes an array — for one bracket the
   name lookup is the right call.
6. **Three contract additions, two listed.** `counts` needs `from`, the binding bracket and its
   limit; `inert` is the new member; and `ruleless` needs the coverage flag its second form reads.
7. The tile clause is capped at three words and two of its own strings are four and five.

## The round is larger than it bills

It describes itself as *one union member in a pure function, plus copy*. Nothing in production
builds a `DeckProfile` or a `CandidateFacts` yet. Threading a profile into the builder shell and
the top-off list, and producing per-candidate facts — including a combo diff, not a field lookup —
for a pool of **262 candidates on the average commander, 423 at the widest and 480 for a pair**,
is a PR of its own, ahead of any atom.

The top-off premise itself is correctly re-made at those figures, and both arguments that rested
on the old "38 rows" are re-argued rather than quietly kept.

## Coverage

Fourteen atom states with their marks and labels, eight path states, a six-row host matrix with
three explicit `none` hosts, non-states enumerated with reasons, per-part 390 geometry and an
explicit stacking rule. Gaps are the consequences of the items above: no state for `counts` where
the binding bracket states no limit, and one branch reading a field the union does not carry.

## Notes for the plan

- **The facts payload is a PR of its own, before the atom.**
- **`inert`, `from`/`bindingBracket`/`limit` on `counts`, and the coverage flag are pure and
  unit-testable — land them together**, not inside the UI PR.
- **Ship the copy module's helpers first**; every string in the file depends on them, and the
  ordinal needs a locale decision.
- **PR 9 still depends on PR 4**, and the coverage disclosure still has to move out of the
  commanders folder before the path can host on the climb's rung.
- **The five-mark ruling couples the push line to Round 2's two unbuilt glyphs.** Either land after
  them, or ship three and add two at call sites that already exist.
- A probe is owed: the atom on one row of a windowed list, the 390 clause stacking, the tile clamp,
  the disclosure's scroll reset, and that the tile's mark line matches `/collection`'s grid tile
  rather than resembling it.
