# The 99 — The push line and the upgrade path (design handoff · R2, Round 4 of 5)

> **Start with `HANDOFF.md`.** This file is the long-form argument. `READINESS.md` carries the
> point-by-point response to the R1 audit.

**Revised against the R1 audit (PR #793).** Six findings, all corrected rather than argued, plus
one premise re-made. **Placement, the `inert` union member, and the whole upgrade path are
unchanged** — the audit confirmed those, and this revision does not reopen them.

**Source of truth:** `docs/superpowers/design-briefs/2026-09-20-the-push-line.md` on `main`.
Spec §6.1a–c, §7.2, §11.1 as amended 2026-09-20. Contract verified against
`src/lib/bracket/delta.ts`, `upgrade.ts`, `rules.ts`. **Mark placement read from
`design_handoff_the99_card_mark/READINESS.md`, which is the authority this round should have read
the first time.**

**Frame:** Round 0 (`design_handoff_the99_deck_analysis/`). **Chrome:** Round 2
(`design_handoff_the99_verdict/`) and Round 3 (`design_handoff_the99_declaration/`). **Marks:**
Round 1 (`design_handoff_the99_card_mark/`). **Hosts:** `design_handoff_the99_add_panel/` and
`design_handoff_the99_top_off/`. **None of them is reopened, amended or redrawn.**

**File:** `The 99 - The Push Line.dc.html` — canvas (pan/zoom). Sections 1a–1g plus 2a (the marks)
and 2b (the top-off premise). Tweaks: `theme`, `showRejected`.

---

## 1 · Two objects, and the placement call

**The push line is a property of a candidate card. The upgrade path is a property of a target.**
That sentence decides both placements.

### The push line goes on the candidate, on every surface that can commit one

| Host | Density | Why |
|---|---|---|
| **Quick add, result row** | the **sentence** | the row has the width, and quick add is where a player adds exactly one card on purpose |
| **Consider, tile** | **a clause**, ≤3 words | 168px cannot hold a sentence; the full sentence prints in the card detail modal, which the art and the name already open |
| **Top-off, candidate row** | the **sentence**, on a second line | a marked row is rare in any screenful, so the slot reads as a flag rather than as furniture (see §7) |

**`/commanders/[slug]` is not a third host**, and the reason is arithmetic: its synergy rows carry
a selection into deck *creation*, so there is no deck and no profile for `bracketDelta` to evaluate
against.

**Not on the analysis tab, and no link to it.** The tab's authority is that it describes the deck
the player has; the link would promise an explanation of a change that has not happened. **And it
does not persist after the add** (§4.5).

### The upgrade path opens from the climb's lower rung

Round 2's climb already draws the bracket below under *To downgrade your deck*. **The upgrade path
is that rung's full answer**, so it is a disclosure on the rung rather than a fifth block — which
makes **the rungs the target selector** and stops any control inventing a target the rules do not
offer. `target` is `1 | 2 | 3`.

## 2 · The marks are Round 1's, and this round moves nothing

**R1's largest error.** It placed the fact marks on a line above the name, "per the shipped card
row", three times. No shipped surface does that: `/collection`'s row and tile draw them inline
after the name, and the decklist row draws them inline after the count, under Round 1's stated
ordering rule *copies first, mark last, on every surface*.

**These three hosts keep the inline placement**, and the correction is not a compromise: relocating
a shipped mark on three surfaces to suit a fourth is a Round 1 amendment, and nothing here
justifies opening one.

**Three marks, not five.** Bolt, stripped peak and turn again ship. The lemniscate and drawn-up are
Round 2 design and unbuilt, so **a combo piece and a tutor carry no mark on these surfaces** — the
sentence says what they are. If Round 2 ships them, they appear in the same inline slot for free.

**The Consider tile is back as it ships**, mana pips and art ownership dot included. This round
adds one clause above the Add and touches nothing else on any shipped surface.

## 3 · One rule orders the sentences: a mark means movement

`moves`, and a `counts` that moved, draw bracket marks either side of an arrow. **A fact draws
none** and is inked `--fact` under a label naming the kind of fact. Every atom wears the same 9px
mono label, **`IF YOU ADD THIS`**.

**Range-to-range grammar, never a slot.** The sentence says *what your cards permit* and names
brackets, so it stays true with one or two brackets on either side — including `[1,2] → [2]`,
where Core is on both sides. `Violation.bracket` is never printed as a numeral.

## 4 · `counts` — two clauses, the count leads, and it names the bracket that bit

1. **The count**, with the **binding bracket** and its figure: *That would be your 1st game
   changer, and Exhibition allows none.*
2. **The consequence**, with the marks — omitted entirely when nothing moved.
3. **The evidence**, only when `combos` is non-empty: a third `--fact` line under *Combo changes*.

**Audit 6.** Quoting Upgraded's 3 unconditionally told a deck losing Exhibition a true fact about
the wrong bracket. `bindingBracket` is the lowest bracket in `from` whose limit the new count
breaks; when nothing moves, it is the lowest bracket in the deck's current reading. *allows none*
rather than *allows 0*, matching the upgrade path's phrasing for the same rule.

## 5 · The two fact shapes each gained a second form

Both had one sentence doing the work of two, and each was false on one side of the deck's own
reading. **Which form prints is decidable from `to` and the profile the row already holds.**

- **`unquantified`** (audit 5). Form A names the chaining rule at binding bracket 2 or 3. **Form B
  applies at 4 or 5, where no extra-turn rule exists**: *Neither Optimized nor cEDH has a rule
  about extra turns.* The closing clause is identical in both — the shape's meaning never changed,
  only the rule it cited.
- **`ruleless`** (audit 4). Form A keeps *and yours can't, yet*. **Form B applies when coverage is
  present**: *What your tutors can already find is counted in this deck's bracket, and one more
  doesn't add to it.* Dropping the clause was the other option and is worse — it would say nothing
  about the one way tutors do reach a bracket, which is the reconciliation 2026-09-20 requires.

## 6 · The silence, answered — three clauses, and it speaks first

**Adding a card that completes a combo to a deck that cannot tutor for it moves the bracket by
nothing, and silence there is the worst reading available**: the player will next be asked at a pod
what is in the deck, and the answer includes a two-card infinite the app watched them assemble
without a word.

**Three second-clauses** (audit 2), chosen from `to`:

| `to` | The clause |
|---|---|
| `[4,5]` | this deck already permits Optimized or cEDH, and there's no lower bracket left for it to rule out |
| `[3]` | nothing in this deck searches for either half, so Upgraded still permits it as a late-game finish |
| `[4]` | a combo you can already assemble is what sets this deck's bracket, and one you can't assemble doesn't add to it |

The third is new. Both older clauses were **false** there: one claims a `[4,5]` reading, the other
claims Upgraded still permits a deck that has already left it.

**And it now outranks `ruleless`** (audit 3). The canonical piece *is* a tutor, so the old order
returned the tutor sentence on the exact add this round exists to speak for. The rule behind the
flip: **an event outranks a standing count.** Full order: `moves`, `counts`, `inert`, `ruleless`,
`unquantified`, `none`.

**It remains a sixth shape, not a field on `none`** — `{ kind: "inert"; fact: "combo"; combos;
to }`. `none` stays silent and draws nothing.

## 7 · The top-off premise, re-made

R1 costed the list at *up to 38 rows*, which is the number of cards a player is **adding**, not the
number the list **draws**: 262 for the average commander, 423 at the widest, 480 for a pair.

- **Legibility.** The unit is the **viewport, not the list**. A reader meets ten to fourteen rows at
  a time, of which the marked ones are a handful — and that ratio is a property of the *rules*, not
  the pool. A larger pool improves it. **What would break it is a filter that concentrates them**;
  none exists today.
- **Cost.** `bracketDelta` is **pure and synchronous over data the page already holds**, true at
  480 as at 38. **What 480 changes is where it may be called**: compute inside the windowed row,
  memoized by `(oracleId, profileVersion)`. An eager map over the pool is 480 pure calls per
  keystroke.

## 8 · The upgrade path reads; it does not act

- **No tick boxes**, **no remove control** — the path is derived, and a write here would be the
  tab's only one.
- **Cardinality picks the phrasing**: *any 2 of these 5*; the cards are named when
  `candidates === removeCount`. **Naming a forced card is the rules choosing, not us.**
- **The combo item never says "remove"** — *Either half breaks it*.
- **The overlap is stated once, in the foot.**
- **`blocked`** lists what can come out, draws the commander on a dashed edge, and names the
  nearest reachable target. No `--danger`, no *impossible*.

## Files
- `The 99 - The Push Line.dc.html` — the canvas: 1a–1g, 2a (the marks), 2b (the premise).
- `HANDOFF.md` — settled decisions and build guardrails. Start here.
- `READINESS.md` — the audit response, the engineering list, the open items.
- `STATES-push-line.md` — 14 atom states, 8 path states, the host matrix.
- `push-line - copy strings.ts` — every string, with the audit reasoning inline.
- `brand/` — brand sheet, for self-containment. Not a colour source; tokens are.
