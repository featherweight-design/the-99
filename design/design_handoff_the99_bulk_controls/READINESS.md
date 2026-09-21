# READINESS — the bulk controls (R1)

**Self-assessed: 🟡 Yellow.** The locked decision is drawn and the four open calls are made. Two
things are genuinely open and one is a dependency Design cannot close alone.

## Green — settled and drawn

- The pair's shape, weight, geometry and column widths at both widths.
- The two labels and all eleven concession states, including both zeroes, the degraded price, the
  unmeasurable mix, the large number and the at-cap yield.
- The 390px answer: nothing new is pinned; the commit bar's measured geometry is unchanged.
- No new token, hex, motion class, modal, tray, toast or confirm step. No reversal drawn — the
  ledger's per-pass undo is the way back and is not duplicated.
- The probe hooks (`data-bulk-fill`, `data-bulk-concession`) and the pre-press assertion §7 asks
  for.

## Yellow — open, and named in the gap report

0. **R2's two additions are Design-proposed scope.** The verb rename (*tick* → *select*) moves nine
   shipped strings outside the pair, and the card mark on the candidate row needs the two joined
   bracket flags on the candidate payload. Both are argued in the README; either can be dropped
   without touching the pair.

1. **"Recommendations" as the public noun for the measured composition.** Chosen without sight of the analysis tab's
   shipped wording. One string if Rounds 0–3 say otherwise.
2. **Type gaps, not role gaps.** `fitSkeleton` measures the ten type axes; `planFill` fills
   against `ROLE_TARGETS`, and `fit.ts` refuses by name to mix measured averages with asserted
   constants. **A fill can close every type gap and still leave a role gap**, and the left-hand note
   would not say so. If that is what players feel, the fix is a second line, never a blended figure.
3. **Which function "the real fill" is.** The brief says both controls run it; `planFill` fills a
   whole deck from role targets, and this pair fills N open slots from a ranked pool. Eng's call.
   Design's only requirement: the note and the press read **one** plan.

## Red — none

Nothing here is blocked. No schema change is asked for, no new data dependency beyond figures
computable from a plan the press already has to build.

## What the audit should check against the brief

- §3's locked part: **both concessions legible before either press** — drawn, and true for a screen
  reader as well as a sighted one (the concession is in each button's accessible name).
- §4's untouchables: nothing in that table is redrawn anywhere on the canvas.
- §6: no clear control, no analysis-tab real estate, no Add panel, no About entries.

---

# ENG AUDIT — 2026-09-20

**Verdict: 🟢 Green to build.** The three Yellow items are all eng's to close, and Design said so
for two of them. Nothing returns to Design.

## Green — checked against the brief, not taken on trust

- **§3's locked part holds.** Both concessions are legible before either press, and the
  concession is in each button's ACCESSIBLE NAME (`collectionAria`, `bestAria`) rather than only
  in a sibling note. A note read after the choice on a linear pass is a note that arrived too
  late, and the copy block says so in its own header.
- **§4's untouchables are untouched.** `b3` and `b9` drop a control by ABSENCE rather than
  drawing a disabled twin, and the reversal is left to `provenance-line.tsx`'s per-pass undo with
  no second way back. That matters more than it looks: a duplicate undo here is exactly the
  control this sub-project deleted two revisions ago.
- **§6 is respected.** No clear control, no analysis-tab real estate, no Add panel, no About
  entries.
- **The degraded paths are drawn** — `b4` keeps the count and drops the figure, `b6` says the
  standard is missing rather than claiming a zero. Both match `price.ts` and `basis: "none"` as
  they actually behave.

## Yellow 0 — R2's two additions: DROPPED, both

The verb rename (*tick* → *select*) and the card mark on the candidate row are Design-proposed
scope outside the locked decision.

- **The rename is real and is not this round's.** `top-off.ts` carries the verb in 74 places, and
  the player-visible ones are the participle (`12 of 12 slots ticked`) rather than the action, so
  the pair saying *Select* beside a head saying *ticked* is a mild mismatch and not an
  incoherence. Renaming nine shipped strings inside a PR whose subject is two new controls is the
  scope growth §7 warns about, and it drags `check:copy-drift` and every design table quoting
  those strings along with it. **Follow-up, with the About batch.**
- **The card mark needs a payload change** — two joined bracket flags on the candidate row — for
  an ornament outside the pair. Dropped.

Neither touches the pair, exactly as the readiness doc says.

## Yellow 1 — "recommendations": KEPT

Chosen without sight of the analysis tab's wording, and it turns out to agree with shipped copy
already: `about.ts:403` describes the mix strip's target as *"the second figure is the
recommendation"*. The analysis tab has no shipped copy module yet, so there is nothing to
contradict. If Rounds 0–3 land another noun, these five strings follow it and nothing else does,
as the block's own comment provides for.

## Yellow 2 — type gaps versus role gaps: RESOLVED BY THE SPEC, not by a compromise

Design's premise is true TODAY and stops being true in this same sub-project. `fit.ts` refuses by
name to mix measured averages with asserted constants **because the four role targets were
asserted**; spec §2.5 makes them measured, derived by the same pipeline as the type targets, and
Task 10 puts `SkeletonFit.roles` on the fit beside `SkeletonFit.types`.

So by the time the pair ships, both axes are measured and either can be reported.

**The rule, honouring Design's constraint that it is never a blended figure:** the note reports
the worst gap on ONE axis at a time — roles where any role gap exists, types otherwise. The
strings already take a noun (`gapOne(n, type)` reads correctly as *"2 ramp short of
recommendations"*), so only `gapMany`'s literal *types* needs a role-parallel sibling. **Eng adds
that one string in-pattern rather than asking for a round**, and it is marked as eng's in the copy
module so the next reader does not attribute it to Design.

## Yellow 3 — which function is "the real fill": ANSWERED

`planFill`, with the `slots` and `pool` arguments Task 13 already specifies. One plan is built,
the note is computed from it, and the press commits the same plan — which is Design's only stated
requirement. The pair never builds one plan to describe and another to apply.

## What eng owes back

- The one role-parallel `gapMany` string, written in-pattern and attributed to eng.
- `data-bulk-fill` and `data-bulk-concession` on both controls, and a `probe:last-slots` case
  asserting the concession is readable BEFORE the press. A check that only reads post-press state
  would pass a build that reveals the cost too late, which is the one thing §3 locks.
