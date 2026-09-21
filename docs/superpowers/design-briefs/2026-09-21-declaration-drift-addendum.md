# Round 3 follow-up — drift, re-drawn

**Where:** `design/design_handoff_the99_declaration/` on `main` (merged as #773). The audit is
`READINESS-r1-audit.md` beside the handoff; Design's own self-assessment is `READINESS.md`.
Round 3's brief is `docs/superpowers/design-briefs/2026-09-20-the-declaration.md`.

**Verdict: 🟠 Orange on one item.** Everything else in the round was resolved by engineering and
is recorded in that audit — you do not need to redraw any of it.

> **SUPERSEDED IN PART, 2026-09-21.** Hugh ruled directly to Design after this was written, and
> two of his rulings change what is being asked for here. **The "you said X / change what you
> said" framing is dropped entirely** — a declaration now travels with the VERSION it was made
> for (*Version 1: 4/5 split, chose 4*), so there is no stale claim for a drift row to reconcile
> and §2's third row largely dissolves with it. **And there is no skip** — a declaration may be
> left unanswered but not dismissed, so §4's skip caveat is moot and the skip control comes out
> of every drawn state. What still stands is the narrow half: **the permitted side can be a
> single bracket** (`[2]`, `[3]`, `[4]`), and §E's split-pill has no reading for one. Read §3
> item 1 as the live ask; items 2 and 3 are withdrawn.

## §1 What changed underneath the round

A ruling landed on 2026-09-20, after you drew R3: **the 3-vs-4 boundary resolves rather than
widens.** `permitsFor` now returns exactly one of `[1,2]`, `[2]`, `[3]`, `[4]`, `[4,5]`. `[3,4]`
no longer exists anywhere.

## §2 The problem

`STATES-declaration.md` §E says drift has **two shapes and no others** — `1|2 → [4,5]` and
`4|5 → [1,2]` — and R2 deleted `driftVoice` on that premise. The state is computed as plain set
membership (`declaredOutsidePermits`), so against the ruling above **three more shapes are
reachable, each one edit away**:

| declared | permits | why it happens | what it breaks |
|---|---|---|---|
| `1` | `[2]` | one extra-turn card added to a Bracket-1 deck | the permitted side is a **single mark**, not a split — undrawn |
| `1|2` | `[4]` | the commoner upward drift now the boundary resolves | §E draws only the `[4,5]` variant |
| `4|5` | `[3]` or `[2]` | **the player tuned the deck DOWN** | the line says *"moved this deck **past** that"* — false |

That third row is the real one. The sentence is factually wrong in that direction, and the
state's whole posture — credit the player with the movement, never scold — was written for a deck
that got stronger.

## §3 What to draw

1. **The drift row with a single bracket on the permitted side.** §E's split-pill treatment has
   no reading for one mark.
2. **The downward sentence.** A deck that moved *out of* its declared range by getting tighter.
   Same posture question: this is a player who did deliberate work, and the line should read like
   it.
3. Confirm whether the two directions share one row treatment or need two.

## §4 Not open

The ask, the declared and skipped READINGS, the lean, the reasoning modal and the climb are all
drawn and settled — R3 is otherwise complete as a set of pictures. Only 1/2 and 4/5 are ever
ranges. Both widths, as always.

**One caveat on the skip, so nobody reads "settled" too widely:** the skipped *treatment* is
drawn and needs nothing from Design. What a permanent skip is STORED as is still open — Round 3's
brief §3.1 and §4.5 leave it so, and the audit confirms there is no state for it: `declared` is a
nullable integer with a 1–5 check constraint, and null already means "not asked", so it cannot
also mean "asked and declined". That is an engineering and spec decision (it is the one thing in
this round that would need a migration), not a redraw — it is named here only so the addendum is
not read as closing it.

## §5 One thing the audit already fixed, so you do not redraw it

Frames **1e** and **1f** compose the ask and the lean together. Those cannot co-occur: the ask
needs a permitted *range*, and the lean only ever fires on a *single* bracket. Engineering reads
that as two states rather than one composition — no redraw needed unless you disagree.
