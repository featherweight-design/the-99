# Design Brief — The push line and the upgrade path (Round 4 of 5)

**Date:** 2026-09-20 · **Branch:** `docs/round-4-brief` (open as a PR; on `main` once merged)
**Spec:** `docs/superpowers/specs/2026-09-19-deck-analysis-foundation-design.md` §6.1a–c, §7.2,
§11.1, **as amended 2026-09-20** (the boundary ruling, below).
**Frame:** `design/design_handoff_the99_deck_analysis/` (Round 0) ·
**Verdict:** `design/design_handoff_the99_verdict/` (Round 2) ·
**Declaration:** `design/design_handoff_the99_declaration/` (Round 3, on branch
`design/declaration-r3` / PR #773 until it merges — read the branch, and read
`READINESS-r1-audit.md` beside it)

**Verified against the shipped contract** — `src/lib/bracket/delta.ts`, `upgrade.ts`, `rules.ts`
and `types.ts` on `main` at the time of writing. Every shape quoted below exists today.

Rounds 2 and 3 **report and record**. This round is the first that answers *"what should I do?"*
— once at the moment of an add, and once as a standing path out.

---

## §1 The two things this round draws

**The push line** — one sentence, at the moment a player considers adding a card, saying what
that card would do to this deck's bracket. It is a *preview of a change*, drawn before any change
exists.

**The upgrade path** — a standing answer to *"what has to leave for this deck to sit at bracket
N?"* Not a preview; a list the player works through.

They share a subject and nothing else. The push line is transient, singular and tied to a
candidate card; the upgrade path is persistent, plural and tied to a target. **Design should
expect them to be two different objects on the screen**, and this brief does not assume where
either lives — see §4.

---

## §2 The boundary ruling makes one of Round 0's own examples impossible

Round 0's engineering addendum (§6a item 1) fixed the push line's grammar as **range-to-range**,
with the worked example *"moves you from 3 to 3-or-4"*.

**That example can no longer happen.** On 2026-09-20 the 3-vs-4 boundary was ruled to RESOLVE
rather than widen, and `permitsFor` (`src/lib/bracket/rules.ts:79-90`) now returns exactly one of:

```
[1,2] | [2] | [3] | [4] | [4,5]
```

`[3,4]` is gone. A deck whose tutors can assemble a combo reads `[4]`, full stop.

**What survives is the range-to-range GRAMMAR, not that example.** `from` and `to` on
`BracketDelta` are both `Bracket[]` (`delta.ts:43-46`), so the sentence still has to render a
range on either side — `[1,2] → [2]` and `[3] → [4]` are both real, and the second is a single
mark on both sides. **Design should draw a push line that reads correctly when either side is one
bracket or two**, which Round 3's sub-line had to learn the hard way.

---

## §3 What engineering has ready, exactly

Both verdicts are built, pure and unit-tested. Neither needs a database at draw time.

### 3.1 `bracketDelta(profile, candidate) → BracketDelta` — five shapes, never blurred

```ts
| { kind: "moves";        from: Bracket[]; to: Bracket[]; rule: Violation }
| { kind: "counts";       rule: "gameChangers"; now: number; limit: number;
                          to: Bracket[]; combos: ComboRef[] }
| { kind: "unquantified"; rule: "extraTurns"; now: number; bracket: Bracket }
| { kind: "ruleless";     fact: "tutors"; now: number }
| { kind: "none" }
```

They read alike in prose and mean different things, which is why they are a union. **Each needs
its own sentence**, and `counts` needs two clauses rather than one: a fourth Game Changer both
counts against a limit AND moves the range, and `combos` carries the evidence for the half the
count does not explain (Underworld Breach is the case — a Game Changer that also completes a
combo).

`unquantified` is the shape the app reports and **refuses to score**: an extra-turn card at a
bracket that does not count them. It is never a move. `ruleless` is tutors, and only tutors — no
bracket limit says "too many" — but note the 2026-09-20 wrinkle: **a tutor can now decide the
3-vs-4 boundary by covering a combo**, which is a different thing from being counted. A sentence
that says tutors don't matter would now be wrong.

### 3.2 `upgradePath(profile, target) → UpgradePath` — candidates, never a pick

```ts
target: 1 | 2 | 3            // there is no "upgrade" to 4 or 5
items: UpgradeItem[]         // empty means the deck already satisfies the target
blocked: boolean             // some violation cannot be cleared by removals alone
```

An item is either a count to clear — `{ rule, removeCount, candidates: CardRef[] }`, *"remove any
1 of these 4"*, every candidate named and **no pick made by the app** — or the combo shape,
`{ rule: "twoCardCombos", combos: [{ combo, candidates }] }`, where at least one piece of each
combo has to go.

`blocked` is the state where the offending card is the commander: it cannot be cut, so the target
is unreachable by removals. **It reads as blocked, stated plainly** — this is a fixed ruling from
Round 0's addendum, not open.

---

## §4 Open for Design to call

1. **Where the push line lives, and whether it is the Consider tab's.** Round 0 answered the
   altitude question — deck analysis lives on its own tab — but it **never placed the push line**.
   It fires at the moment of an add, and adds happen on the deck's Add panel, in the top-off list,
   and on `/commanders/[slug]`'s synergy rows. Is the push line one treatment that travels to all
   three, a treatment on the analysis tab that the add surfaces link to, or something that only
   exists on one of them? *This is the round's biggest call.*
2. **Whether the upgrade path is a list, a checklist, or a set of rows that act.** The app names
   candidates and refuses to choose. Does the player tick them off, remove from here, or read and
   go elsewhere? A control that removes would put a write on this surface, which nothing else on
   the analysis tab does.
3. **How `blocked` is drawn** without reading as a scold or a dead end.
4. **The `counts` two-clause sentence** — one line or two, and which clause leads.
5. **Whether the push line persists after the add**, or is replaced by the verdict changing
   underneath it.

## §5 Locked, and not open

- **The app never picks.** `upgradePath` hands candidate sets; the copy may not resolve them.
- **Range-to-range grammar**, correct with one or two brackets on either side (§2).
- **No tutor gate.** Tutors are a fact and never a limit — but see §3.1 on the boundary.
- **`unquantified` is never a move**, and extra turns are reported unscored where unscored.
- WotC's bracket names verbatim; rules text quoted rather than paraphrased.
- Mobile and desktop ship together.

## §6 One hole this round owns

Recorded in Round 3's brief and handed here: **adding a card that completes a combo, to a deck
that cannot tutor for it, moves the bracket by nothing.** `bracketDelta` returns `kind: "none"`
and the push line is silent — while the player has, in plain fact, just put a two-card combo in
their deck.

A silence that follows a real event is the worst reading available. **Round 4 owes that
sentence**: either a push line that speaks for `none` when the candidate completed a combo, or a
ruling that silence is right here and why.

## §7 One dependency, and one that is NOT a dependency

**Round 2 is design-complete and entirely unbuilt**, and Round 3 sits inside its chrome — so both
are ahead of this round in the build queue. Round 4's DESIGN does not wait on either.

**Round 3's open Design question — drift's undrawn shapes — does not block this round.** It is a
question about a declared bracket falling outside `permits`, and nothing here reads `declared`.
