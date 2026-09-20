# Design Brief — The verdict (Round 2 of 5)

**Date:** 2026-09-20 · **Branch:** `docs/round-2-brief` (open as a PR; on `main` once merged)
**Spec:** `docs/superpowers/specs/2026-09-19-deck-analysis-foundation-design.md` (on `main`)
§6.1a, §6.2, §6.3, §6.3a, §6.4, §6.5, §11.1
**Frame:** `design/design_handoff_the99_deck_analysis/` (Round 0, merged in PR #753, audited Yellow)
**Mark:** `design/design_handoff_the99_card_mark/` (Round 1, PR #759, audited Yellow)

**Verified against `origin/main` at `c19de358`.** Every type quoted below was read from
`src/lib/bracket/types.ts` on that commit, not recalled. The whole data contract is **built and
merged** — this round draws a surface for values that already exist.

This round asks: **what does the Rule 0 conversation look like as a reading?**

---

## §1 The one sentence this round is organised around

A bracket is not a score the app keeps. It is **a thing a player says out loud to three other
people before a game starts**, and the moment anyone disagrees, the only useful answer is *which
cards*. That is the whole reason §2.2 forbids a blended figure: a number is easier to read and
impossible to check, and every figure on this surface exists so it can be checked.

**So the load-bearing requirement of this round, carried forward from Round 0's audit: every count
opens to its cards.** Round 0 drew the receipts as barometer counts — `× game changers 6`,
`× mass land denial 1` — and **no named card appears anywhere in that package.** If Round 2 draws
counts that do not open, the feature ships the exact shape it was written against.

## §2 What is already drawn, and must not be redrawn

Round 0 settled the frame. Work inside it.

- **Analysis is the second tab** (`deck · analysis · consider · games · versions`); the
  `RoleCounterStrip` moved into it. This round adds no tab and moves no strip.
- **The verdict block exists**, at the top of the tab, in four states that are all **the same box,
  the same height and the same mark** — range undeclared, range declared, single bracket, and a
  violation state that Round 0 **reserved without drawing**: section D's fourth card, dashed, no
  copy. *"If Round 2 decides a violation belongs somewhere other than the verdict block, that card
  is discarded and nothing else moves."* That decision is yours.
- **The climb** is how the verdict is reached: five rungs, each listing the barometers that reach
  it, the deck's bracket being the furthest rung.
- **The bracket mark** is Filigree — one diamond ornamented by rank, palette 2e Ignition, constant
  in all six themes, a hard 20px floor below which the numeral ships alone. **Adopted. Not open.**
- **The fact marks** are Round 1's three glyphs — bolt, stripped peak, turn again — one ink, no
  container, 12px floor. A card named as a receipt in this round is a card that may carry one.
- **Analysis reads the live list**, so every denominator here is the live count — `of 62` on a
  62-card pile, never a hard 99.

## §3 Three things Round 0 left for this round, named so they are not missed

Its audit (`READINESS-r1-audit.md`) carries these as errata pointing here.

1. **The allowances are missing from the climb's barometers.** A count prints with no limit beside
   it. Design's own strings exist — `none at Exhibition`, `3 at Upgraded` — and want a home.
2. **Tutors fell off the final climb.** §2.1 says the count is still drawn, and **WotC deleted the
   tutor clause outright in October 2025**, so it is a fact and never a gate. Engineering's reading
   is an adjacent fact line beneath the climb, never a rung — a rung would imply a rule that does
   not exist. Confirm or redraw.
3. **The population line has no reservation.** §4 below.

## §4 The five things this round draws

### 4.1 The permitted range, and why it is a finished answer

`permits` is one of `[1,2] · [2] · [3] · [3,4] · [4,5]`. Round 0 already ruled a range takes the
same box as a single bracket — no dashed border, no warning ink, no *incomplete*.

Three different reasons produce a range, and **a reader who cannot tell them apart has been handed
a shrug**:

| the deck's cards | permits | why it is open |
|---|---|---|
| violate nothing | `[1, 2]` | **intent** — is this built to show something off, or to play? |
| violate B3's limits | `[4, 5]` | **intent** — are you playing this competitively? |
| a two-card infinite, nothing else at B3 | `[3, 4]` | **an unknowable** — nothing in a decklist says which turn a combo lands |

The first two are a question for the player. The third is a limit of what anyone can compute, and
WotC's own gloss — *turn-six-or-later closers are acceptable* — is quotable beside it.

**Do not draw the lean.** Where `permits` is `[3,4]` the app states a likely end with its
receipts, and that is **Round 3's**, along with the declaration itself. Round 2 draws the range in
its **unanswered** state and stops there. §11.1 is explicit that Round 2 can ship that way.

### 4.2 The limits table — three brackets, four rules

**The hardest call in this round: a full limits table that informs without grading.** Density is
the risk. It must not become a report card.

`BracketLimitReport` exists, per bracket, for brackets 1–3 only (§6.4 — B4 and B5 have no
restrictions other than the banned list, so there is nothing to tabulate). Four rules each:

| | B1 Exhibition | B2 Core | B3 Upgraded |
|---|---|---|---|
| Game Changers | 0 | 0 | ≤ 3 |
| Mass land denial | none | none | none |
| Extra-turn cards | **none at all** | low quantities; not chained or looped | low quantities; not chained or looped |
| Two-card infinite combos | none intentional | none intentional | **early-game** none |

**Three cells behave unlike the others, and the drawing has to carry the difference:**

- **Extra turns are counted at B1 and NOT counted at B2/B3.** B1 forbids them outright, so one
  `Time Warp` violates. B2 and B3 say *"low quantities… not chained in succession or looped"* —
  two conditions, one of them uncountable. There the figure is **reported with no verdict
  attached** (`counted: false`), and only a demonstrable loop violates. deckcheck reads "low
  quantities" as max 3 and enforces it; **that is not ours, because a number WotC did not write
  is a number we would have to defend.**
- **B3's combo cell never violates.** `policy: "earlyGameOnly"` — it **widens the range** instead.
- **The B3 loop state**, added after Round 0 went out: a deck whose assembled combo produces
  infinite turns violates B3's extra-turn clause outright and reads **`4 or 5`**, with the combo
  named as the receipt on the extra-turns row. Distinct from the generic two-card-infinite case,
  which only widens to `3 or 4`. **Single-card turn loops are not detected** — Nexus of Fate alone.
  **That caveat is not in the shipped contract yet:** `COMBO_DETECTION.basis` reads *"Spellbook's
  index, excluding template-gated variants"* and `DetectionCoverage` carries no field for it, so
  engineering owes the string before this slot can quote it. Draw the slot as though it will be
  there — §6.5's whole rule is that the verdict states what it could not see.

### 4.3 Violations, with their receipts

`Violation` carries `cards: CardRef[]` and, where the receipt is a combo, `combos: ComboRef[]` —
*"receipts, never a count alone: a figure the reader cannot check is an assertion."*

Where violations live is **your call**, and Round 0 reserved a card for one answer without
committing to it.

One rule from the spec that shapes the copy: **"intentional" is not inferable and is deliberately
ignored.** Every combo clause in the rules says *intentional*. Whether a player meant to include a
combo is a fact about them, not the deck — so the app reads every assembled two-card infinite as
present, says which cards form it, and **must not appear to have answered the other half.**

### 4.4 The population line, and its denominator

`population` is EDHREC's distribution of **self-declared** brackets for decks with this commander,
present on 3,252 of 3,279 commanders. It is what turns a fact about a deck into the Rule 0
conversation:

> *"Bracket 3 — where 5,055 of the 11,848 Ur-Dragon decks that declared one also sit."*

**Three rules on it, because it is easy to misuse:**

- It is **never an input to the verdict.** Feeding it in would make the reading a popularity
  contest — §2.2 with a crowd instead of a formula.
- **Only 22.4% of decks declare a bracket.** The counts sum to about a fifth of `deck_count`, so
  **the denominator is not optional** — a reader shown "5,055 decks" who believes it is out of
  50,478 has been misled by us.
- The **27 commanders with no counts report absent, not zero.**

### 4.5 The three detection statements

**All three detections are partial, including combos**, and §6.5 is emphatic about why a binary
badge would be worse than nothing: a field that always says the same thing trains readers to skip
it. The strings are **fixed constants shipping from code** — this round designs **the slot they
occupy, not the words**:

```
massLandDenial  2 sources  "22 of 24 on a curated set"  known misses: Wave of Vitriol, Cataclysm
extraTurn       2 sources  "no misses among the 56 cards whose text mentions one"
twoCardCombos   1 source   "Spellbook's index, excluding template-gated variants"
```

**Read off the shipped constants, not the spec.** `src/lib/bracket/oracle-rules.ts` is the source
of truth and the spec's §6.5 sketch is stale against it: mass land denial is **22 of 24 with TWO
known misses**, and the code carries a note recording that an earlier version named one and left
the other unaccounted for — which is exactly the failure a provenance line exists to prevent. **The
slot must hold a miss LIST, not a single name.**

This is **provenance rather than a badge**, and its job is to answer *which* fact was uncertain at
the moment someone disputes a verdict. It is also the one place on this surface that admits the
app can be wrong, so burying it defeats it and shouting it defeats the verdict.

## §5 Open for Design to call

1. **How dense the limits table can be before it grades.** Three brackets × four rules, with the
   deck's own figures in it. Is it a table, three blocks, or something that opens?
2. **Where a violation lives** — in the verdict block (Round 0's reserved card), on the limits
   table's own row, or both. And what a deck violating all three brackets looks like without
   reading as a failure.
3. **How a count opens to its cards.** The one non-negotiable of this round. Inline, a disclosure,
   the card modal, a list — but a count that cannot be opened is not a receipt.
4. **The three reasons a range is open, told apart.** §4.1.
5. **The detection statements' slot.** §4.5.
6. **The population line's placement**, with its denominator inseparable from its figure.

## §6 Locked, and not open

- **Never a single power number**, and no figure blended into a score (§2.2).
- **A verdict is a range**, and a range is a finished answer, in the same box as a single bracket
  (Round 0).
- **Every figure carries its denominator** (§2.2), and on this tab every denominator is the **live**
  list.
- **The bracket names are WotC's vocabulary, verbatim** — Exhibition, Core, Upgraded, Optimized,
  cEDH — and must not be reworded.
- **The rules text is quoted, not paraphrased.** The table is our reading; the quote is the rule.
- **No tutor gate.** The clause was deleted in October 2025. Tutors are a fact and never a limit.
- **No expected game length.** It is an outcome, not a deck property, and any estimate would be an
  invented weight wearing a turn number.
- **The lean and the declaration are Round 3's.** The push line and the upgrade path are Round 4's.
- **The bracket mark and the fact marks are adopted** (Rounds 0 and 1).
- **Mobile and desktop ship together.**

## §7 What engineering has ready

**All of it.** `slotDeck(profile): BracketVerdict` is merged (#757) and pure, with
`BracketLimitReport`, `Violation`, `UnquantifiedFacts` and `DetectionCoverage` typed in
`src/lib/bracket/types.ts`. `population` is on `ProfileBrackets`. The three fact flags and the
combo index are ingested (#749, #752). Nothing in this round waits on data.

What is **not** built is the surface: the loader payload, the route, and what groups with what —
Tier B, which is what this handoff releases.

## §8 Sequence

Round 2 lands, is audited against this brief, and Round 3 (the declaration) is briefed against it.
Rounds 2 and 3 are expected to **build together**, because they share one panel and Round 3 writes
stored state that changes what Round 2's verdict block draws.

**The About entry belongs to the round that ships the deck-analysis surface** — not to Round 1's
marks, and not to any Tier A PR. It is a named task in that plan, with the `ABOUT_VERSION` bump.
Recorded here because "backend only, so no entry" is exactly the reasoning that let the
post-import summary reach `main` with none.
