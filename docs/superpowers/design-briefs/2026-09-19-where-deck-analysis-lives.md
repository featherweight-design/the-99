# Design Brief — Where deck analysis lives (Round 0 of 5)

**Spec:** `docs/superpowers/specs/2026-09-19-deck-analysis-foundation-design.md` on branch
`spec/deck-analysis-foundation`. Not merged. §11.1 defines the five rounds; this brief is
Round 0 only.

**Verified against the branch at `ea00e8c8` on 2026-09-19**, rebased on `origin/main`. Every
`file:line` below was read on that commit, not recalled — three of them were inherited from the
September 12 brief below and had drifted by 60–100 lines, so do not trust a line number in an
older brief without re-reading it.

This round asks one question: **what does a player meet when they open deck analysis, and how
does it sit with what the deck page already carries?** It asks for no component designs. The
four rounds that follow draw the pieces; this one decides whether they compose.

---

## §1 What is coming, so the frame can hold it

Five rounds, in §11.1. Round 0 does not design any of them — it decides where they sit.

| | round | what it draws |
|---|---|---|
| 0 | **this brief** | the frame, and the synopsis's slot |
| 1 | the card mark | Game Changer / mass land denial / extra turn, on a card row and in a card modal |
| 2 | the verdict | a permitted bracket range, a limits table, violations, a population line |
| 3 | the declaration | *"your cards permit 1 or 2 — which is this?"*, a lean, and drift |
| 4 | acting on it | the push line at the moment of an add; the upgrade path |
| — | the skeleton fit | **held back** — its own brief once real output exists |

## §2 The deck page is already crowded, and this is the constraint

Before adding anything, this is what the page holds:

- `src/lib/decks/builder-view.ts:14` — **four** views, `deck | consider | games | versions`,
  rendered by `builder-tabs.tsx:89` `BuilderTabs`. The September 12 brief below says three;
  `versions` shipped after it.
- `builder-shell.tsx:949` — the **`RoleCounterStrip`**: five cells (`mix.ts:11` `ROLE_ORDER` —
  ramp, draw, removal, wipes, land) each stating a count against a target, headed by the line
  **`"EDHREC averages"`** (`mix.ts:89`).
- `builder-shell.tsx:1023` — the `GamesPanel`.
- Deck versioning adds a **six-cell what-changed strip** on top of that.
- The four-figures block (`docs/superpowers/design-briefs/2026-09-12-what-this-deck-is.md`) is
  briefed and unbuilt.

That brief already named this problem and left it open: *"One strip of small figures is mounted
today — roles, measured against targets — and a second is specified and coming… Design should
say how a reader tells the three apart at a glance once all three are on the page, or fold
them."*

**Deck analysis would be the fourth.** Round 0 is where that gets answered rather than deferred
again.

## §3 The thing the strip already claims

`RECOMMENDED_MIX` (`mix.ts:50`) is `ramp 10, draw 10, removal 8, wipes 3, land 37`, and
`RECOMMENDED_MIX_SOURCE_LINE` tells the reader those are **"EDHREC averages"**.

**Nothing derives them from EDHREC.** They are asserted constants, duplicated from
`ROLE_TARGETS` (`roles.ts:4`) and `landTarget()` (`deck-size.ts:14`).

The spec measures what that line claims: EDHREC publishes a real average deck per commander,
and the corpus mean is **35.3 lands against the flat 37**, ranging **30–47**. So the analysis
work does not add a new claim to this page — **it makes an existing claim true**, and the true
version disagrees with the drawn one.

That is relevant to Round 0 because it decides whether analysis is *a new block beside the
strip* or *the thing the strip becomes*.

## §4 The synopsis, and why it belongs at the top

The opener is a narrative summary: *"you've finished the deck — here is what it does."*
deckcheck's version of the same idea, for the motivating deck:

> *"Kratos and Atreus form a God-matters experience deck that accelerates value through
> proliferate and attack triggers… The deck also carries a backup damage combo with Toralf and
> Blasphemous Act, as well as an alternate win via The Locust God and Purphoros. Extra combat
> spells like Aggravated Assault and World at War grant additional attack steps, while draw
> doublers like Teferi's Ageless Insight multiply Atreus's output."*

**It is a narration of facts the app computes, not free prose.** The Toralf combo, the
Locust God line, the extra-combat spells — every one is a field in the profile the spec builds
(§5). A model supplies sentences; code supplies the facts and verifies them (§2.4).

**Its content is not this round.** How long, what it may claim, its accept contract and its
cost all belong to a later sub-project. What Round 0 needs is its **slot** and its **absent
states** — because a generated sentence can be missing, stale, or refused, and the reader must
never see a half-written one.

`commander_support.prose` is the precedent: one generated sentence per commander, hash-gated,
and **a row that fails the accept contract stores nothing and renders with no paragraph** —
the state the design draws, never a truncated sentence nobody wrote.

## §5 What Design is being asked to call — open

1. **Where does deck analysis live?** A **fifth** tab beside
   `deck | consider | games | versions`, a section within one of them, or a route of its own.
   Five tabs is the part worth weighing — the tab row is already at four, and this brief has no
   opinion about whether that is a ceiling.
2. **How do the strips and the analysis coexist?** §2's unanswered question, now with a fourth
   claimant. Fold, stack, or separate — and if fold, which becomes which.
3. **The synopsis's slot and its three absent states** — never generated, stale against the
   current decklist, refused by the accept contract. §4.
4. **What a player sees before any of this has data.** Composition lands after an index run
   (spec §4A.8); a synopsis needs a generation. The surface must read as unfinished-but-working
   rather than broken.
5. **The altitude question.** Does anything from this surface belong on the decks list or Home,
   or does analysis stay on the deck?

## §6 Locked, and not open for this round

From the spec's own rulings — these are settled and the frame should assume them:

- **A verdict is a range, not always a number** (§6.1a). Brackets 1 and 5 are declared by the
  player, never inferred, so some decks read *"permits 1 or 2"* until answered.
- **Every figure carries its denominator**, and no figure is ever blended into a score (§2.2).
  The design must have room for receipts beside claims.
- **Mobile and desktop ship together**, as always.

---

## §6a Engineering addendum — 2026-09-19, after the implementation plan

The implementation plan (`docs/superpowers/plans/2026-09-19-deck-analysis-foundation.md`, same
branch) and its product walkthrough settled four things the spec's sketches predate. Rounds 2–4
draw against THESE, not the spec's earlier shapes; none changes Round 0's questions.

1. **The push line speaks range-to-range.** "What would adding this card do" can answer
   *"moves you from 3 to 3-or-4"* — a range on either side, because a combo piece's honest
   effect is widening, not a number. The spec's single-number sketch is superseded (plan,
   Task 18).
2. **The downgrade path hands a candidate set, never a pick.** *"Remove any 1 of these 4"*
   with all four named — the app does not choose. A rule that cannot be cleared by removals
   (the offending card is the commander) reads as blocked, stated plainly (plan, Task 19).
3. **The bracket-3 limits table gains a loop state.** A deck whose assembled combo produces
   infinite turns violates bracket 3's extra-turn clause outright — it reads *4-or-5*, with
   the combo named as the receipt on the extra-turns row. Distinct from the generic
   two-card-infinite case, which only widens to *3-or-4*. Single-card turn loops (Nexus of
   Fate alone) are NOT detected, and the detection statement says so (plan, R3).
4. **The three detection sentences are fixed constants**, one per fact, e.g. mass land
   denial: *"23 of 24 on a curated set; known miss: Wave of Vitriol."* Round 2 designs the
   slot they occupy; the words ship from code.

## §7 Sequence

Round 0 lands, is audited against this brief, and then rounds 1–4 are briefed against the frame
it establishes. Round 1 is deliberately small and unblocks 2 and 4 — its brief is already
written and queued (`2026-09-19-the-card-mark.md`, same directory); it fires the moment Round
0's audit lands. The skeleton-fit brief stays held back until a widened index run has produced
real output to draw against (spec §11.1); engineering emits it mid-epic, unprompted, once that
data exists.
