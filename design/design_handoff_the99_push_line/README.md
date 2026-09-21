# The 99 — The push line and the upgrade path (design handoff · R1, Round 4 of 5)

> **Start with `HANDOFF.md`.** This file is the long-form argument: why each object is shaped the
> way it is, and what was tried and dropped on the way.

**Source of truth:** `docs/superpowers/design-briefs/2026-09-20-the-push-line.md` on `main`.
Spec §6.1a–c, §7.2, §11.1 as amended 2026-09-20 (the boundary ruling). **Contract verified
against `src/lib/bracket/delta.ts`, `upgrade.ts` and `rules.ts` on `main`** — every shape drawn
here exists today, and the one addition is named as an addition.

**Frame:** Round 0 (`design_handoff_the99_deck_analysis/`). **Chrome:** Round 2
(`design_handoff_the99_verdict/`) and Round 3 (`design_handoff_the99_declaration/`), both carried
and neither redrawn. **Hosts:** `design_handoff_the99_add_panel/` (quick add + Consider) and
`design_handoff_the99_top_off/` (the candidate list) — the push line is drawn *into* their shipped
rows, and no row geometry changes.

**File:** `The 99 - The Push Line.dc.html` — canvas (pan/zoom). Tweaks: `theme`
(amonkhet · kamigawa), `showRejected`. Every colour is a `var()`.

---

## 1 · Two objects, and the placement call

**The push line is a property of a candidate card. The upgrade path is a property of a target.**
That sentence decides both placements and most of the rest.

### The push line goes on the candidate, on every surface that can commit one

Round 0 placed *deck analysis*; it never placed this. The brief names two add surfaces and asks
whether the treatment travels. **It travels — as one slot with two densities.**

| Host | Density | Why |
|---|---|---|
| **Quick add, result row** | the **sentence** | the row has the width, and quick add is where a player adds exactly one card on purpose — the event the push line previews |
| **Consider, tile** | **the shape's name + its mark**, ≤3 words | 168px cannot hold a sentence, and a wrapped one makes six tiles of ragged height. The full sentence prints in the card's own detail modal, which the art and the name already open (`CardDetailTrigger`) |
| **Top-off, candidate row** | the **sentence**, on a second line | 38 rows, and almost all of them are silent — which is what makes the slot legible rather than noisy here |

**`/commanders/[slug]` is not a third host**, and the reason is arithmetic rather than taste: the
synergy rows toggle a selection a Build link carries into deck *creation*, so there is no deck and
no profile for `bracketDelta` to evaluate against.

**It is not on the analysis tab, and it does not link there.** The tab's whole authority is that it
describes the deck the player has; the link would promise an explanation of a change that has not
happened. **And it does not persist after the add** (§4.5): the card is in the deck, and the verdict
block is the record. No toast, no afterglow, no tab badge.

### The upgrade path opens from the climb's lower rung

Round 2's climb already draws the bracket below under *To downgrade your deck*, with one sentence
of reason. **The upgrade path is that rung's full answer**, so it is a disclosure on the rung rather
than a fifth block on the tab — which also means **the rungs are the target selector** and no new
control can invent a target the rules do not offer. `target` is `1 | 2 | 3`; the chips only ever
show brackets below this deck's reading.

## 2 · One rule orders the five sentences: a mark means movement

`moves`, and a `counts` that moved, draw bracket marks either side of an arrow. **A fact draws
none** — `unquantified`, `ruleless` and the new `inert` are inked `--fact` under a mono label
saying what kind of fact it is (*Reported, not scored* / *A fact, not a limit* / *A combo, and no
change*). A reader can tell "this changes your bracket" from "this is true and changes nothing"
without finishing either sentence.

**Round 2's five fact marks travel with the card, here as everywhere** — bolt, stripped peak, turn again, **the lemniscate** and drawn up, bare and in `--fact` at 16×16. **On a row or a tile they take their own line above the name, led by the ownership dot** (the shipped card-row convention); in prose — the atom's sentence, the path's candidate lists — they follow the name inline. A card carries every mark true of it (Underworld Breach is bolt *and* knot; a loop combo's halves are knot *and* turn again) and a card that fires no rule carries none — the atom's own rule, applied to the glyphs.

Every atom wears the same 9px mono label, **`IF YOU ADD THIS`** — one slot, one label, five bodies.
The label form is Round 2's (*What other players say*, *How we determined this bracket*).

**Range-to-range grammar, never a slot.** The sentence says *what your cards permit* and names
brackets, so it stays true when either side is one bracket or two — including the case that breaks
any *from N to M* phrasing: `[1,2] → [2]`, where Core is on both sides. `Violation.bracket` is
never printed as a numeral; the rule is stated and the number stays in the mark.

Drawn transitions: `[1,2] → [4,5]` (mass land denial), `[1,2] → [2]` (an extra turn at the one
bracket that counts them), `[3] → [4,5]` (a completed loop, and a fourth Game Changer). Together
they exercise every one/two combination the grammar can meet; `[3] → [4]` cannot happen today and
is not drawn.

## 3 · `counts` — two clauses, and the count leads

1. **The count.** *That would be your 4th game changer, and Upgraded allows 3.*
2. **The consequence**, with the marks. *It moves what your cards permit from Upgraded to Optimized
   or cEDH.*
3. **The evidence, only when `combos` is non-empty** — a third line in `--fact` under *Combo
   changes*: *Completes Underworld Breach + Brain Freeze.*

The count leads because it is the only thing here a player can act on, and because `delta.ts`
routes a Game Changer through `counts` even when it moves for exactly that reason. **When it does
not move, clause 2 is absent** and nothing replaces it — no *your bracket stays at Upgraded*.

**Rejected: one line.** *Your 4th game changer of 3 allowed moves you from Upgraded to Optimized or
cEDH* — four figures and two claims in a breath, and *4 of 3* prints a fraction a reader will try to
satisfy.

## 4 · The silence, answered — a sixth shape

**Adding a card that completes a combo to a deck that cannot tutor for it moves the bracket by
nothing, and silence there is the worst reading available**: the player will next be asked at a pod
what is in the deck, and the answer includes a two-card infinite the app watched them assemble
without a word.

So it speaks, as a fact and never as a consequence — two clauses: the event, then why the verdict is
unmoved.

> This completes **Heliod, Sun-Crowned** + **Walking Ballista**, a two-card infinite. **It doesn't
> change your bracket** — this deck already permits Optimized or cEDH, and there is no lower
> bracket left for it to rule out.

The second clause has two forms, and which prints is decidable from data the client holds: *already
at the top* when `to` is `[4,5]`; *nothing in this deck searches for either half* when the deck
sits at 3 and coverage is absent.

**It is a sixth shape, not a field on `none`:** `{ kind: "inert"; fact: "combo"; combos: ComboRef[];
to: Bracket[] }`, with precedence after `ruleless` and before `none`. A speaking `none` would be a
shape that reads alike and means differently, which is the thing `delta.ts`'s own header says the
union exists to prevent. **This is the round's one data-shape change.**

**`none` stays silent, and is drawn as an absence.** A *nothing changes* line on 38 rows trains a
reader to skip the slot, and then they miss the one row that moved their bracket. The atom's value
is that its presence is information.

## 5 · The upgrade path reads; it does not act

Per item: a mono rule label, the requirement at its own cardinality, and the candidates as card
names on the dotted underline that opens a card everywhere else in the app.

- **No tick boxes.** A checklist claims the app is tracking progress toward a target the player
  never set — and because `upgradePath` lists a card under every rule it violates, overlapping items
  would make a counter that cannot be right.
- **No remove control.** It would be the only write on a surface built to report, with no undo, next
  to five names the reader has not finished.
- **Cardinality picks the phrasing.** `candidates > removeCount` → *any 2 of these 5*;
  `candidates === removeCount` → the cards are named and the *any* is dropped, because *any 1 of
  these 1* dresses a certainty as a choice. **Naming a forced card is not the app choosing** — the
  rules chose.
- **The combo item never says "remove".** *Either half breaks it* states the requirement at the
  combo's cardinality; *remove any 1 of these 2* would read as if the pair were interchangeable with
  the counts above.
- **The overlap is stated once, in the foot** (*two of these five are also the combo*). Cheaper than
  de-duplicating items, which would hide a rule.

## 6 · `blocked`, without a scold or a dead end

Three things carry it:

1. **The cuttable candidates are still listed** — the block is still useful for the part of the
   target that removals *can* answer.
2. **The commander is drawn in the list on a dashed edge**, labelled *your commander*, rather than
   omitted. `upgradePath` excludes it from `candidates`; showing why the count is short beats a
   sentence about an invisible card.
3. **The nearest reachable target is named and one tap away.** `upgradePath` is callable per target,
   so the exit is derived rather than a consolation prize.

*It would take a different commander* is the plainest true statement available and is not advice.
**No `--danger`, no warning glyph, no *impossible*, no *sorry*.**

**`items: []`** is drawn too: *Nothing would have to go. Your cards already sit inside Core —
whether this deck is Exhibition or Core is yours to say*, which hands the reader to the declaration,
the only thing left that can answer it.

## Notes for engineering

- **One data-shape change: the `inert` member of `BracketDelta`** (§4), with `to` carried so the
  client picks the second clause without re-deriving the slot. `delta.test.ts:77-85` currently
  records this case as unreachable-by-construction; it is reachable as a non-move whenever the deck
  already holds a combo or already reads `[4,5]`.
- **`counts` carries `to` and no `from`**, so the client decides *moved* by comparing `to` with the
  profile's own `permits`. Either ship `from` on `counts` or guarantee the profile the row was
  rendered against is the one the delta was computed from — **do not let the row compare against a
  re-fetched profile.**
- **`CandidateFacts.completesCombos` must arrive with oracle ids and image uris**, like every other
  `ComboRef` in the analysis surfaces — the sentence names both halves and the names open cards.
- **A tutor add can never move the range today**, because reaches are precomputed over the combos
  the deck already holds and a candidate contributes none. That is what makes `ruleless` safe to
  print as "no limit" — **and it is exactly why the copy says *tutors reach your bracket only when
  they can find every piece of a combo this deck already holds*** rather than "tutors don't
  matter". If reaches ever become candidate-aware, this sentence needs a move clause.
- **The push line runs per row, so it must stay cheap.** `bracketDelta` is pure and per-candidate;
  the quick-add list is ≤10 rows, Consider is a grid, and top-off is up to 38. No fetch per row.
- **The Consider tile's three-word clause is a separate string per shape**, not a truncation of the
  sentence. See the copy file.
- **The upgrade path is a disclosure on the climb's lower rung** — `aria-expanded`/`aria-controls`,
  the shipped `CoverageDisclosure` contract, local state, never persisted, and it does not move
  focus.
- **Target chips are the brackets below the deck's reading, and nothing else.** A deck reading
  `[1,2]` shows one chip (Exhibition) or none.
- **Live region, on an add:** the verdict block's existing region already announces the new reading
  after re-analysis. **The push line itself is not announced on hover or focus of a row**; it is part
  of the row's accessible description (`aria-describedby` → the atom), so a screen reader meets it
  when it meets the row and never as an interruption.
- **The About entry belongs to this surface's release**, with the `ABOUT_VERSION` bump.

## Files
- `The 99 - The Push Line.dc.html` — the canvas, sections 1a–1g.
- `HANDOFF.md` — settled decisions and build guardrails. Start here.
- `README.md` — this file.
- `STATES-push-line.md` — the atom's states, the path's states, and the host matrix.
- `push-line · copy strings.ts` — every string, with reasoning inline.
- `READINESS.md` — self-assessment, what was called rather than asked, the engineering list.
- `brand/` — brand sheet, for self-containment. Not a colour source; tokens are.
