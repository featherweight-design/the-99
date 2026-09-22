# Readiness audit — the verdict addendum

**Verdict: 🟡 Yellow.** Audited 2026-09-22 against `main`. All four rulings are clear, drawn where
they need drawing, and buildable as written. **One finding**, and it is not in a ruling: the
package's closing section claims six amendments to the parent package that have not been made.
Closed engineering-side by this file rather than returned to Design, since the rulings themselves
need nothing.

## The four rulings — all clear, all buildable

| # | Ruling | Drawn? | Buildable as written |
|---|---|---|---|
| 1 | The card modal stacks; the receipt stays behind it, offset 12px on the phone with the ground stepped | §5a, both steps | Yes. `CardDetailProvider` already holds one modal for the whole builder and `useScrollLock` is refcounted, so "do not dismiss the receipt" is the whole change plus the phone offset |
| 2 | No `MarkKey` on the Analysis tab; a mark may go unkeyed only where its fact is named in the same row | prose, restated as a checkable rule | Yes |
| 3 | The mark is a graphical object at 3:1, not text at 4.5:1; the dim rises from 0.45 | §5b | Yes — see the measurement below |
| 4 | `no cap` on a bracket-4 rung, confirmed | prose | Yes, already shipped that way in #853 |

**Ruling 3's instruction was followed and the answer is 0.65.** The addendum says to measure at
0.65 and fall back to 0.7 if any ground misses. Measured over the marks' real drawn domain:

| | floor | under 3:1 |
|---|---|---|
| the dimmed upper member at **0.45** | 2.2533 (kaldheim rank 2) | 6 of 12 |
| at **0.60** | 3.0128 | 0 of 12 |
| at **0.65** | **3.2963** | 0 of 12 |
| the climb's neighbour rungs at 0.75 | 3.1401 | 0 of 60 |
| the rung that holds, full opacity on its own `color-mix` (mixed in OKLab, as declared) | 3.9006 | 0 of 30 |

0.65 stands, 0.7 is not needed, and the size-step fallback is not reached. The 0.60 reading
confirms the addendum's own reason for rejecting it: 3.0128 is not a margin to spend across six
themes.

**One figure could not be reconciled and does not matter.** Ruling 3 says "measure all thirteen".
Thirteen grounds cannot be reconstructed from either package — the marks are drawn on `--surface`,
`--surface-sunken` and a per-rank `color-mix`, which is three. The sweep above is wider than
thirteen in every direction, so whatever the count meant, it is covered.

## The finding — the parent package was not amended

**"What this changes in the parent package" opens with "Already applied there, so nothing is left
for a reader to reconcile by hand." None of the six is applied.** Checked against `main`:

| Claimed | Actual |
|---|---|
| `HANDOFF.md` — MarkKey line and 12px floor marked superseded, an *Addendum* section added | No occurrence of "addendum". Line 54 still states the 12px floor; line 65 still states `MarkKey` ships this release, unqualified |
| `README.md` — §4 carries the stack and the tile-mark consequence; package listed in Files | No occurrence of "addendum" |
| `STATES-verdict.md` — new §Da and §G; §B corrected | Neither section exists |
| `verdict - copy strings.ts` — `noCap` carries ruling 4 | `noCap: "no cap"`, bare |
| `READINESS.md` — the contrast item closed by ruling 3 | No occurrence of "addendum" |
| The canvas — `no cap` at §4b and §4c | Still `3 allowed` on the bracket-4 rung, both widths. 6 occurrences of `3 allowed` remain |

The addendum's own canvas repeats the claim: *"The parent canvas is corrected at its own §4b and
§4c — the one place a drawing was edited rather than ruled over."*

**Why this is worth a finding rather than a shrug.** The package's first page says it wins where it
disagrees with the parent, which is correct and sufficient — a builder who reads both is safe. The
closing claim is what makes it unsafe: it tells that builder they need not read both, and the
parent then states a 12px mark floor that `ASSETS.md` retired, a `MarkKey` obligation ruling 2
narrows, and a 4.5:1 bar ruling 3 replaces. Each of those is a thing someone would build wrongly
and each would pass review, because the package they were told was current said so.

**Resolution, engineering-side.** The parent is not edited here — a handoff is the historical
record of what Design delivered, and this audit is the sibling file that says so. Anyone building
from `design_handoff_the99_verdict/` reads this line first:

> **The parent package is NOT reconciled with the addendum.** Where they disagree the addendum
> wins, and they disagree in at least six places: the 12px mark floor, the `MarkKey` obligation,
> the 4.5:1 contrast bar, the absent §Da and §G state matrices, the bare `noCap` string, and
> `3 allowed` on the bracket-4 rung of the canvas.

**For Design, not blocking:** apply the six, or withdraw the sentence. Either ends the hazard; the
sentence standing while the edits do not is the only state that misleads.

## Scope

Unchanged. Nothing in the addendum redraws a surface, and the three items it lists as untouched —
the `[3,4]` split, `see all brackets →`, the two unnamed source slots — are correctly left alone.
One of those is now stale in the addendum's favour: `[3,4]` is not open with engineering, having
been resolved 2026-09-20; `permitsFor` cannot return it.

## About entry

Not owed, and correctly absent. This line batches its entries at launch (ruled 2026-09-21) and the
surface plan names the batched task.
