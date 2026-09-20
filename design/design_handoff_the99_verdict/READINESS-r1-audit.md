# Readiness audit — The verdict, Round 2

**Verdict: 🟡 Yellow.** Audited 2026-09-20 at R1 against
`docs/superpowers/design-briefs/2026-09-20-the-verdict.md` (merged, PR #760), the Round 0 and
Round 1 packages and their audits, the **shipped contract** (`src/lib/bracket/*`,
`src/lib/profile/types.ts`, `src/lib/spellbook/combo-features.ts`) and spec §2.1, §2.2, §6.1a–§6.5.

Audited by an agent that wrote neither the brief nor the handoff.

**The load-bearing requirement of this round is satisfied, emphatically — this is the first
package in the line to name a card.** All six §5 calls are made and every rejected option is
drawn rather than asserted. No Design prompt is owed. Round 3 is clear to brief.

---

## §1 — does every count open to its cards?

**Satisfied.** The requirement Round 0's audit carried forward is closed.

The findings block draws `5 Game changers · Rhystic Study, Cyclonic Rift, +3 · see the cards`,
opening a modal of named tiles; the combo body carries the pair, what it produces, its mana, and
Spellbook's four steps. A zero has **no control, no rail and no underline**. One governing rule
states it: *"the climb states, the findings open."*

The `"intentional" is not inferable` ruling holds — the modal foot stops at *assembled*.

## The six §5 calls

| # | Call | Status |
|---|---|---|
| 1 | Limits table density | **Answered by deletion, and argued.** The standing table goes as a duplicate of the climb; the full four-rules × three-brackets set becomes a reference sheet behind one `see all brackets →`. Three replacements were drawn before the pick |
| 2 | Where a violation lives | **Answered** — Round 0's reserved card is **discarded**. A violation is a finding, not a verdict state: a deck past all three limited brackets draws the same type, ink and mark as a `1 or 2` deck. Nothing dashed, nothing red, no *over* tag |
| 3 | How a count opens | **Answered** — a modal, one chrome and two bodies. Inline disclosure and tooltip are drawn *and* rejected on measurements (a 172px cell; no touch) |
| 4 | Three reasons a range is open | **Answered, and since overtaken by a ruling** — see §2 below |
| 5 | Detection statements' slot | **Answered** — a collapsed disclosure under the findings; four rows, a lead, a closing *why*. Never a badge, never a tooltip |
| 6 | Population line placement | **Answered** — verdict block foot, under *What other players say*, denominator inside the sentence |

## The §6 locks

Every lock holds. Two are partial and both are engineering's to close:

- **Every denominator is the live list** — **partial.** Two copy strings hard-code *"the 99"*.
  On a 62-card pile both are false. **This is Round 0's erratum 5 recurring**, and both take the
  live total as a parameter exactly as Round 0's `writtenAgainst` already does.
- **Rules text quoted, not paraphrased** — **partial and self-declared.** Design states the
  fragments were transcribed from the brief rather than from Wizards, and that quote and reading
  are separate constants so it is a swap. Check both against the published rules before build.

Satisfied outright: never a single power number and nothing blended; a range is a finished answer
in the same box as a single bracket; WotC's names verbatim; **no tutor gate** (tutors are a fifth
*finding* with a `no limit` chip); no expected game length; the lean and declaration held for
Round 3; Round 0's and Round 1's marks adopted rather than redrawn; mobile and desktop together.

## §2 — the `3 or 4` range, and the ruling that settled it

Round 2 was drawn **without** the `[3, 4]` reading, and asked for a spec amendment. The shipped
`permitsFor` returned `[3, 4]`, so at audit time the package contradicted merged code, and this
document's first draft ruled that `[3,4]` should stand until an amendment landed.

**That was overturned the same day, and Design was right.** Ruled 2026-09-20: **only 1/2 and 4/5
are ever ranges.** Those two are questions the rules hand to the player; the 3-vs-4 boundary is a
question about the deck, and *"if we start splitting 2/3/4 then we're asking too much of the
player and the ranking starts to seem indecisive."*

The boundary now resolves on tutor **coverage** — a deck reaches 4 when its tutors cover every
piece of one combo — with the threshold being the combo's own piece count rather than any number
we chose. Spec §6.1a, §6.3 and §6.1b are amended and `permitsFor`, `slotDeck` and `bracketDelta`
follow. **Nothing in this package needs redrawing**; §1a's `[3,4]` study becomes history rather
than a fallback, and the ringed `≈` it introduced may now be homeless — carried to Round 3's brief
as an open call.

## The three unlike cells

- **Extra turns counted at B1, not counted at B2/B3** — **carried in the adopted turn.** The B1
  rung names the cut; the B2 rung reads `Extra turns 1 · no cap`, and the reasoning is stated,
  including the refusal of deckcheck's invented max-3.
- **B3's combo cell widens rather than violating** — **drawn only in the superseded turn**, and
  now superseded again by the ruling above: it resolves.
- **A combo producing infinite turns violates B3 outright and reads `4 or 5`** — **drawn only in
  the superseded turn**, precisely and correctly. None of the adopted turn's three decks reaches
  it, so **engineering carries it onto the climb rung and the findings block from that prose.**

## Errata engineering carries

1. **The detection figure is the stale spec's, in eleven places.** `23 of 24` with a single miss,
   where `MLD_DETECTION` says **22 of 24** with **two** — `Cataclysm` appears nowhere in the drop.
   The brief warned about this by name. **Resolution: template the sentences on the constants**
   (`basis`, `sources`, `knownMisses`) rather than swapping literals — a hand-written sentence
   holding a re-measurable figure has now desynced once *before shipping*, and the miss slot takes
   a list rather than a name.
2. **Hard-`99`** in two copy strings → the live count.
3. **Em dashes** in player-facing copy → `copy-review` before any of it lands in `src/lib/copy/`.
4. **Build the mass-land-denial glyph from Round 1's asset**, not this canvas: the adopted asset
   carries the peak plus three stroked ticks, and this canvas renders the peak 15 times and the
   ticks 3.
5. **The population line has three drawn variants against one copy constant**, and
   `BracketPopulation.deckCount` is **nullable**. Resolution: the fuller form when the count is
   present, the shorter when it is not. **The denominator is never dropped — only the total.**
6. **The canvas's own §5 answer panel is stale**, answering all six calls with Turn 1's rejected
   answers. **Precedence, matching Round 0's: `HANDOFF.md` wins, then the Turn 4 canvas sections,
   then everything else.** Do not build from the canvas header panel.
7. **Three package claims are wrong about the tree:** tutors are not in `UnquantifiedFacts` (that
   is `{ extraTurns }` only — they live at `profile.brackets.comboReach.tutors`); `--fact` is not
   "still open" but shipped in all six themes (#761); and `MarkKey` takes its entries as a prop,
   so the change is at the call site.
8. **Round 0's `bracket-5-cedh.svg` is rank 4's geometry with rank 5's numeral** — verified true
   in both files. Reissue before `BracketMark` is built from it.
9. **Two source citations are unnamed slots by design** — engineering supplies names and URLs with
   the coverage constants. Inventing one is refused, correctly.
10. **Measure the lemniscate against turn-again at the 12px floor in the build.** Both are stroked
    arcs, and that pairing was never in Round 1's seven-neighbour distinctness pass. The reasoning
    is prose and no measurement backs it — **this becomes a probe check, not a paragraph.**
11. **Data dependencies:** `Violation.cards` and `ComboRef` must arrive with oracle ids and image
    uris (the modal renders tiles — never string-match a name); `counted: false` must reach the
    client; `population` stays nullable and is never zeroed; the single-card-loop caveat string is
    still owed on `COMBO_DETECTION`.

## The ruling this round asked for

**The `to drop to here` rung states the limit and never the action.** Ruled 2026-09-20. Design
flagged its own `Cut 2 game changers, only three allowed` as one step from advice; it reads
`Upgraded allows 3 — you have 5` instead. The rung names the rule and the reader's figure and
stops. **Round 4 owns advice**, and it already ruled that the upgrade path hands a candidate set
and never a pick — two rounds writing over one seam is what this avoids.

## Scope

**Held.** No lean, no declaration interaction, no push line, no upgrade path. Round 0's frame and
Round 1's glyphs are carried rather than redrawn.

## Round 3

**Clear to be briefed**, and its brief carries four things this audit surfaced: the ruling above;
that the lean is now the REASON for a resolved verdict rather than advice on a range; that the
declaration lands in the verdict block's sub-line rather than as a new shape; and that
`declaredOutsidePermits` is shipped and undrawn in every round so far.
