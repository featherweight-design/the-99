# Design Brief — The declaration (Round 3 of 5)

**Date:** 2026-09-20 · **Branch:** `docs/round-3-brief` (open as a PR; on `main` once merged)
**Spec:** `docs/superpowers/specs/2026-09-19-deck-analysis-foundation-design.md` §6.1a, §6.1b,
§7.2, §11.1 — **as amended on branch `feat/combo-decides`**, which is where §6.1b's current text
lives until it merges. Read that branch's copy, not `main`'s.
**Frame:** `design/design_handoff_the99_deck_analysis/` (Round 0) · **Verdict:**
`design/design_handoff_the99_verdict/` (Round 2)

**Verified against the shipped contract**, `src/lib/bracket/types.ts` and `slot.ts`, at
`ec4c1aea` plus the amendment on `feat/combo-decides`.

Round 2 was a **report**. This round is an **interaction with stored state** — the first thing
on this surface the player can change, and the first thing the app remembers.

---

## §1 A ruling landed since Round 2 was drawn, and it changes this round's shape

**Only 1/2 and 4/5 are ever ranges.** Ruled 2026-09-20, amending the spec.

Round 2 was drawn against a world where a deck holding a two-card infinite could read `3 or 4`.
That range is **gone**. The 3-vs-4 boundary now **resolves**: a deck reaches 4 when its tutors
can cover every piece of one combo — one tutor finding both halves, or two each finding a
different one — and stays at 3 when it would have to draw into it.

The reason is this round's subject rather than Round 2's: *"if we start splitting 2/3/4 then
we're asking too much of the player and the ranking starts to seem indecisive."* A range is what
the app draws when **the rules hand the question to the player**, and nothing else.

**Two consequences for what you draw:**

1. **There are exactly two declaration questions**, not three. *"Your cards permit 1 or 2 —
   which is this?"* and *"4 or 5?"* Every other deck has a single bracket and nothing to answer.
2. **Round 2's ringed `≈` may now be homeless.** It meant *not knowable from a list*, and it was
   drawn for the `3 or 4` reading. Whether it survives as the mark for the lean's reasoning, or
   retires, is yours to call — §5.

## §2 The lean is no longer advice on a range. It is the reason for a verdict

`BracketLean` is shipped (`types.ts:48-57`) and its meaning changed with the ruling:

```ts
{ likely: 3 | 4, reason: "reachable" | "drawOnly",
  receipts: { combo: ComboRef; tutors: CardRef[] }[] }
```

- **`reachable`** — the deck's tutors cover a whole combo. It slotted at **4**, and this is why.
- **`drawOnly`** — they do not. It stayed at **3**, and this is why.

**This is the one verdict on the surface that moved on a judgement rather than a count**, which
is exactly why §2.2 demands its cards. Every tutor behind it is in `receipts`. A reader who
disagrees must be able to see what the app read — and then overrule it, which is §3.

**The threshold is the combo's own piece count, never a tutor count.** No copy may imply "you
have too many tutors": that figure is a fact the app reports and never a limit (§2.1), and it is
the clause WotC deleted in October 2025.

## §3 What this round draws

### 3.1 The question, and the answer
*"Your cards permit 1 or 2 — which is this?"* Round 0 drew two labelled CTAs under *"Pick one so
pods know what to expect"*; Round 2 drew the undeclared state as a ringed `?` and a sentence and
routed the declaration here. **Reconcile those two**: the box has survived three rounds at one
size and the declaration belongs in its sub-line rather than as a new shape.

`declared` is **never inferred and never defaulted** (`types.ts:63`). A null means the player has
not answered, and the surface shows the range.

**"Permanently skippable" was Round 0's word, and NOTHING PERSISTS IT.** `decks.declared_bracket`
is the only stored state and its null already means *not answered*, so a skip returns to exactly
the state the reader skipped from and the block asks again on the next load. There is no third
value, on the deck row or anywhere else.

**This is an open call and §4.5 is where it gets made**, because the two ways out cost different
things. Either a skip is *persisted* — a second stored value, which is a migration and a new
state on the verdict for every round after this one to draw — or the requirement is *relaxed*, and
the block stays askable but quiet enough that being asked again is not a nag. **Design picks
which, and engineering builds it; do not assume the first.**

### 3.2 Correcting the lean
A reader who disagrees with *"we think this is a 4"* overrules it, and their correction is stored
as `declared` — the same field, the same mechanism. There is no separate "the lean was wrong"
state, and the app never argues back.

### 3.3 Drift — the state no round has drawn
`declaredOutsidePermits` is shipped (`types.ts:66-68`) and **has no treatment in any round so
far.** A declaration outside the permitted range is reported and **never corrected, overridden or
inferred**: *"this deck has moved past what you said it was."*

This is the app's own best argument — it is what a recorded declaration buys that a computed
number cannot — and it is the state most likely to be read as a scolding. It must not be.

### 3.4 What a declaration is worth
Spec §6.1a: *"the ask is the feature, not a fallback."* A declared bracket joins the set of things
this app records from a player over time, beside results, versions and notes. Pod comparison then
has four declarations and four permitted ranges rather than four computed figures.

## §4 Open for Design to call

1. **The declaration's shape in the verdict block's sub-line** — replacing the ringed `?`, not
   adding a shape beside it. Both widths.
2. **The lean's presentation, now that it explains a verdict rather than proposing one.** Where
   the receipts sit, and how a tutor list reads without implying a tutor count matters.
3. **The drift state** — §3.3. A report, never a reprimand, and never an offer to "fix" it.
4. **Whether the ringed `≈` survives the ruling**, and what it means if it does.
5. **The skip** — and first, whether it persists at all (§3.1). Today nothing stores one, so
   "permanently skippable" is a requirement no shipped state can satisfy. Persisting it buys a
   migration and a state every later round must draw; relaxing it means the block may be asked
   again, and must be quiet enough that this is not a nag. Then: what the block looks like once
   skipped.

## §5 Locked, and not open

- **Only 1/2 and 4/5 are ranges** (§1). The 3-vs-4 boundary resolves and is not re-litigated here.
- **A range is a finished answer**, in the same box as a single bracket (Round 0).
- **Never a single power number; nothing blended** (§2.2). The lean is not a score: it resolves
  nothing continuous, spans no decks and shows every card behind it.
- **`declared` is never inferred, never defaulted, never corrected by the app.**
- **No tutor gate.** Tutors are a fact and never a limit.
- **Every denominator is the live list count.**
- WotC's bracket names verbatim; rules text quoted rather than paraphrased.
- **The push line and the upgrade path are Round 4's.**
- Mobile and desktop ship together.

## §6 What engineering has ready

All of it. `slotDeck` returns `permits`, `declared`, `declaredOutsidePermits` and `lean` today;
the amendment on `feat/combo-decides` changes what `lean` MEANS and not its shape.

**The column already exists** — `decks.declared_bracket` (`schema.ts:303`), with a check
constraint pinning it to 1–5 or null, and the profile loader already reads it. **Only the write
action is missing**, and it is small. Nothing here needs a migration, unless §3.1's skip call goes
the persisted way — which is the one thing in this round that would.

**One hole this round does not own, recorded so it is not drawn by accident:** with the boundary
resolving, adding a card that completes a combo to a deck that cannot tutor for it moves the
bracket by nothing, so the push check is silent about it. **Round 4 owns that sentence.**

## §7 Sequence

Round 3 lands, is audited against this brief, and Round 4 (the push line and the upgrade path) is
briefed against it. Rounds 2 and 3 are expected to **build together** — they share one panel, and
this round writes the state that changes what Round 2's verdict block draws.
