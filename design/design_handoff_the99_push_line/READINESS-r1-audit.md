# Readiness audit — the push line and the upgrade path (Round 4 of 5)

**Verdict: 🟠 Orange.** Audited 2026-09-21 against `main`, every claim checked against the shipped
source. Design self-assessed 🟢 Green on the path and 🟡 Yellow on the line.

**The round answers both of the brief's open calls, and answers them well.** What holds it back is
narrower and was not visible from the drawings: three delta shapes have REACHABLE sub-states whose
drawn sentence is false, and the fact-mark placement rule rests on a premise about the shipped
build that is not true.

## What it got right, and it is the hard part

**Placement — called, not deferred.** One atom, two densities, three hosts: the quick-add row, the
Consider tile and the top-off row. Explicitly NOT the analysis tab, not the commit bar, and not
`/commanders/[slug]` — with the correct reason, that there is no deck and no profile there for
`bracketDelta` to read. That was the round's biggest question and it is settled.

**The `kind: "none"` hole — closed.** Rather than making `none` speak, the round adds a sixth union
member, `inert`, for a candidate that completes a combo and moves the bracket by nothing. That is
the right instinct: the union exists so the shapes do not blur, and `none` stays a drawn absence.

**The upgrade path is Green.** Candidates never a pick, both `blocked` shapes drawn (the count and
the all-commander combo), `items: []` drawn, and no chip for 4 or 5 — which matches
`upgradePath(profile, target: 1 | 2 | 3)` exactly. Nothing here needs Design again.

## Back to Design

1. **The fact marks are placed against a convention the app does not have.** The rule is stated
   three times as "per the shipped card row": marks on the line ABOVE the name, led by the
   ownership dot. No shipped surface does that — `/collection`'s row and tile draw them inline
   after the name, and the decklist row draws them inline after the count with the dot on the same
   line. **The question:** does Round 4 relocate Round 1's shipped marks onto a new line across
   every surface, or do these three hosts keep the inline placement? Bundled with it: the Consider
   tile losing its mana pips and its overlay ownership dot is a change to a shipped Add-panel
   surface, and needs owning as one.

   Related and mechanical: the round says five fact marks travel with the card "here as
   everywhere". **Three ship** — `CARD_FACTS` is `gameChanger`, `massLandDenial`, `extraTurns`.
   The lemniscate and drawn-up are Round 2 design and unbuilt, which silently couples this round
   to PR 4's mark work.

2. **`inert` has three reachable shapes and two sentences.** The pair covers a deck already at the
   top and a deck at `[3]` with no coverage. It does not cover `to === [4]`: a deck whose existing
   combo is already assembled reads `[4]`, and a candidate completing a SECOND, unreachable combo
   lands in `inert` there. Neither string is true — one claims the deck permits Optimized or cEDH,
   the other that Upgraded still permits it. A third second-clause is owed, or a rule that
   collapses the case.

3. **`inert` sits after `ruleless`, which re-opens the silence this round exists to close.** The
   canonical combo piece IS a tutor. On that add the reader gets the tutor sentence — ending "and
   yours can't, yet" — with the combo they just completed unmentioned. That is the §6 silence with
   words over it. Design flagged it to push on; it needs a ruling.

4. **`ruleless`'s closing clause is false whenever the deck already assembles.** Any tutor added to
   a deck reading `[4]` or `[4,5]` returns `ruleless` unchanged, and "yours can't, yet" asserts an
   absence that is not there. A second form, or drop the clause.

5. **`unquantified` is false at bracket 4.** Its `bracket` is `to[0]`, so a `[4,5]` deck taking an
   extra-turn card prints a sentence about Optimized's rule on chaining. Brackets 4 and 5 state no
   extra-turn rule at all — the clause is true at 2 and 3 only.

6. **The `counts` limit names the wrong bracket at low readings.** `limit` is the bracket-3 figure
   always, so a deck losing Exhibition on its FIRST Game Changer reads "your 1st game changer, and
   Upgraded allows 3" while the limit that actually bit was Core's nought. Engineering can carry
   the binding bracket's limit; the sentence is Design's.

## Resolved without Design

- **`counts` has no `from`** — true, and cheaper than billed. `from` is already computed inside
  `bracketDelta` and carried on `moves`; add the field rather than taking Design's alternative of
  guaranteeing the row's profile is the delta's.
- **Image uris on `completesCombos`** — `ComboRef.cards` is `CardRef = { oracleId, name }`, and
  the profile is a cached document, so it must NOT gain art. Resolve at the draw, exactly as the
  plan already rules for the reasoning modal. Oracle ids are already there.
- **`upgradePath.countRule` hardcodes "Upgraded"** while `target` is 1–3. Template on
  `BRACKET_NAMES[target]`. (`extraTurns` naming Exhibition is correct — that item only exists at
  target 1.)
- **The copy module is re-invented rather than imported.** `bracketRange.name` restates
  `bracketPhrase`, `joinNames` restates `nameList`, both shipped in `src/lib/copy/deck-analysis.ts`
  last night. `numberWord` exists nowhere and is used four times; ordinals have no formatter.
- **Em dashes in roughly eleven shipping strings.** This feature line's own shipped copy module has
  none in strings. Sweep before landing, and move the quotations in the tables in the same PR or
  `check:copy-drift` reports them.
- **`rungLabel` replaces Round 2's `to drop to here`.** Correctly flagged, and consequential: PR 4
  builds Round 2 first, so the replacement lands there or the drift check fires on Round 2's
  tables.
- Small: the tile clause is capped at three words and two of its own strings are four and five;
  two strings are placed by no state; one quotation inside the handoff has drifted from the copy
  file.

## One measured premise is wrong, and it carries an argument

The round costs top-off at "up to 38 rows, almost all silent", and rests both its legibility
argument and its no-fetch-per-row cost argument on that. `listLastSlotsCandidates` returns the
whole ranked pool: **262 candidates for the average commander, 423 at the widest, 480 for a pair.**
That is the same premise Round 0's long-list note was corrected on. Neither argument is refuted by
the true figure, but both have to be re-made against it, and the facts payload sized for it.

## Coverage

Strong, and the best-documented of the line so far: twelve atom states with their marks and labels,
eight path states, a six-row host matrix with three explicit `none` hosts, and non-states
enumerated WITH REASONS — no loading atom because the delta is synchronous, no error atom because a
failed profile has no tab, no stale atom because the row re-renders with the deck. Both widths are
drawn, with a dedicated 390 section and per-part phone geometry.

The gaps are the consequences of the blockers above: no state for `inert` at `[4]`, none for
`ruleless` with coverage present, none for `unquantified` at 4.

## Notes for the plan

**The dependency graph is wrong in the plan and needs correcting.** PR 9 (the path) depends on PR 4,
because the path is a disclosure on the climb's lower rung, which PR 4 builds — and
`CoverageDisclosure` has to move out of `components/commanders/`. PR 8 (the line) does NOT depend
on PR 4 for the tab, but DOES depend on Round 2's two unbuilt marks if the placement rule survives,
which is currently invisible.

**`inert` plus `from` on `counts` is pure, unit-testable and UI-free — it belongs beside PR 2**,
not inside PR 8.

**Split PR 8**: three hosts, two densities, a server-side `CandidateFacts` payload and a copy module
is over the size bar. Suggested: the union change and copy first; then the atom and one host; then
the remaining hosts at both widths.

**Fixed figures already ruled, not to be re-specified:** the fact mark is 16px and **not a prop**,
and every mount wraps it in `FactTooltip` — a bare mark is the defect reported on `/collection`.

**A probe is owed.** None of this is provable in jsdom: the atom on one row of a windowed list, the
390 clause stacking, the tile's clamp, the disclosure's scroll reset.

**No About entry here** — this line batches its entries at launch.
