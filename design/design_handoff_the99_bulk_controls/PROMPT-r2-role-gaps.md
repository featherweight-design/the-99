# Design prompt — bulk controls R2: the role gap is now measurable

**For:** Design, on `design_handoff_the99_bulk_controls`
**From:** Eng, 2026-09-21
**Branch the handoff is on:** `design/bulk-controls-handoff`
**Status:** R1 audited 🟢 Green to build. This is not a re-audit. One of R1's own Yellow items
rested on a premise that has since changed, and the decision it deferred is now open on different
terms.

---

## 1 · What changed underneath Yellow item 2

R1 wrote:

> **Type gaps, not role gaps.** `fitSkeleton` measures the ten type axes; `planFill` fills
> against `ROLE_TARGETS`, and `fit.ts` refuses by name to mix measured averages with asserted
> constants. **A fill can close every type gap and still leave a role gap**, and the left-hand
> note would not say so. If that is what players feel, the fix is a second line, never a blended
> figure.

The observation is still exactly right. **Both of its stated reasons have gone.**

- **The four role targets are measured now.** Ramp, draw, removal and wipes are derived per
  commander, per pair and per identity/count bucket, from the same EDHREC index the ten type
  targets come from (#780). `ROLE_TARGETS` survives only as the fallback when a commander's
  chain reaches nothing, and anything resting on it is flagged as such.
- **`fit.ts`'s refusal has been retired** (#782). Its rule — "NO FUNCTIONAL ROLES APPEAR HERE,
  and that is structural" — existed because the four were asserted while the types were
  measured. That reason ended, so the rule ended with it. What replaced it is narrower: a role
  target may travel only with a `measured` flag beside it.

So the blocker R1 named — laundering asserted numbers through measured credibility — no longer
exists. A role gap can be stated with exactly the authority a type gap has, and `planFill`
already returns both in one list.

**Design's own instinct in R1 still holds and we are not asking you to overturn it:** a blended
figure is wrong. The question is whether the second line R1 named should now be drawn.

## 2 · Why this is worth your time rather than ours to decide

A type gap describes the deck's **shape**. A role gap describes **what the deck can do**.

> `3 creatures short of recommendations`
> `4 removal short of recommendations`

Our read is that the second is the more actionable concession for a player choosing between the
two fills — but which concession a player wants before pressing is a design judgement about what
the control is for, not an engineering one. It is also a **space** question: the note sits beside
a 232px button column, and two lines where there was one changes the pair's vertical rhythm in
every one of b1–b11.

**What we need from you:** whether the left-hand note carries a role line, and if so, what it
does when both a role gap and a type gap exist. Nothing else in the handoff moves.

## 3 · A state the handoff does not have

`planFill` now reports **`measured: false`** when a commander's chain fell through to the
asserted baseline. That is distinct from b6.

- **b6** is *no composition at all* — `no recommendation for this commander`.
- The new case is *targets exist but are the asserted defaults*. A deck can have **measured
  types and asserted roles**, because the two chains resolve independently: a commander indexed
  before the role pass carries a composition and no role figures.

Drawing the word "recommendations" from asserted floors would overclaim — the note would tell a
player their deck is measured against real decklists when it is being measured against four
constants nobody counted. This needs either its own note or an explicit ruling that it folds
into b6.

## 4 · Two smaller notes on the copy

1. **`gapMany` switches grammar mid-family.**
   `2 creatures short of recommendations` versus `short on 3 types · creatures worst at 4`.
   Same fact class, two sentence shapes. And `worst at 4` is ambiguous — a reader cannot tell
   whether 4 is the shortfall or the count. Something like
   `3 types short · creatures by 4` keeps the family's shape and removes the ambiguity. Your call
   on the wording; we are only reporting that the two read as different kinds of statement.

2. **Yellow item 1 is still open and is not ours to close.** "Recommendations" as the public noun
   for the measured composition was chosen without sight of the analysis tab's wording. That is
   one ruling across two features and should be made once, by you, with both surfaces in view.

## 5 · What eng has closed since R1 — no action needed

- **Yellow item 3, "which function the real fill is":** it is `planFill`, which now takes
  `slots` and `pool` arguments added for this pair specifically. Both controls run the one plan,
  which was Design's only stated requirement.
- **Yellow item 2's mechanics:** `planFill` returns `shortfalls` as a typed list carrying both
  kinds — `{ kind: "role", role }` and `{ kind: "type", type }` — so whichever way §2 is ruled,
  the data is already there and no new read is needed.

## 6 · What we are not asking for

No new token, no motion, no modal, no reversal, no analysis-tab real estate, no Add panel, and
no About entry — the line batches those at launch. §4's untouchables stay untouched. If the
answer to §2 is "no role line", say so and the handoff stands as built.
