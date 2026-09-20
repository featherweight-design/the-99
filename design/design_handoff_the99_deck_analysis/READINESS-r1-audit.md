# Readiness audit — Deck analysis, Round 0 (the frame)

**Verdict: 🟡 Yellow.** Audited 2026-09-19 at R1 (the package's own label; Round 0 of 5)
against `docs/superpowers/design-briefs/2026-09-19-where-deck-analysis-lives.md`, the spec
(`docs/superpowers/specs/2026-09-19-deck-analysis-foundation-design.md` §2, §6.1a, §6.3a, §6.5)
and the plan's walkthrough ratifications.

Audited by an agent that did not write the brief, the spec or the plan.

**All five §5 questions are answered, with the rejected options drawn rather than asserted. No
§6 lock is broken.** What is outstanding is one partial on the denominator lock that engineering
closes using Design's own already-written strings, a set of doc-sync conflicts the handoff itself
half-names, and the four §6a deltas — which appear nowhere in the package, correctly, because
§6a says "none changes Round 0's questions" and the frame's extension rule accommodates them.

**Nothing here is a design decision, so no Design prompt is owed.** Another round would re-sync
prose and settle nothing. Design self-assessed amber with nothing red; this audit agrees and
names what amber costs engineering.

---

## The five §5 questions

| # | Question | Status | Evidence |
|---|---|---|---|
| a | Where analysis lives | **Answered** — the **second** tab, `deck · analysis · consider · games · versions`. A section is drawn as option `1b` and rejected on a measurement; a route is rejected on the user's own ruling and independently, because it is the one builder destination that takes the deck off screen | `FRAME-where-analysis-lives.md:3-5`, `:8-28`, `:30-39`, `:41-45`; `README.md:38` |
| b | How the strips and the analysis coexist | **Answered** — `RoleCounterStrip` moves whole and unmodified into the tab; the fold is **by comparator, one line per block** (the bracket rules · EDHREC averages · nothing); the what-changed strip deliberately stays in Versions; canvas section F draws all four claimants on one deck | `FRAME:51-53`, `:57-66`, `:68`, `:70-73`; `README.md:81-89` |
| c | The synopsis's slot and its three absent states | **Answered and exceeded** — five states (present · never generated · stale · refused · not yet read). No state reserves space for prose that is not there; no state renders a partial sentence | `STATES-synopsis.md:14-16`, `:20-26`, `:29-50` |
| d | What a player sees before any data exists | **Answered** — no empty state for the whole tab, because there is always the mix and always a denominator. The unread verdict is an em-dash numerator with the denominator still drawn (`— of 99 read`), reusing the shipped in-flight role-cell treatment | `README.md:157-160`; `STATES-synopsis.md:26`, `:46-50`; `FRAME:94` |
| e | The altitude question | **Answered** — one chip at two altitudes (the deck band's badge row, the deck tile's meta line), the range travelling unrounded; a deck that has not been read draws no chip at all; **Home gets nothing** | `README.md:163-172`; `HANDOFF.md:21` |

## The four §6 locks

| Lock | Status | Evidence, and how engineering closes it |
|---|---|---|
| A verdict is a **range**, not always a number | **Satisfied** | All four verdict states are the same box, the same height and the same mark — "no dashed border, no warning ink, no *incomplete*", because a range is a finished answer (`STATES-synopsis.md:54-62`). The canvas draws `Cards permit 1 or 2`, `permit 3` and `permit 4 or 5` |
| Every figure carries its **denominator** | **Partial — engineering-resolvable** | The climb prints each barometer's blocking count with no allowance beside it (`× game changers 6 × mass land denial 1 × extra turns 2 × two-card combos 2`). `README.md:137-139` argues that the denominator on a limit *is* the limit, and the owner asked for the "allowed, but…" lines to go. **Close it with Design's own strings, already written**: `receipts.allowance` → `none at Exhibition` / `3 at Upgraded` (`deck-analysis - copy strings.ts:65-66`), one span per barometer in the existing wrap row. No redraw |
| No figure is ever **blended into a score** | **Satisfied, explicitly** | A summary score, a grade, a gauge and a threat index are rejected outright, with deckcheck's Threat Index refused by name — "a blended figure is easier to read and impossible to check" (`FRAME:87-89`; `README.md:148-149`, `:404-407`) |
| **Mobile and desktop ship together** | **Satisfied** | Canvas section B is the 390px deck page and Analysis tab; phone geometry is specified from `spine-mobile.tsx` throughout (`README.md:205`, `:299`, `:487-499`). Four phone items stay on the handoff's own punch list (`HANDOFF.md:46-49`) and are engineering's to massage |

## The four §6a deltas

The addendum postdates the round, and none of its four deltas appears anywhere in the package.
**That is the expected result, not a gap.** §6a states "none changes Round 0's questions", and
the frame carries an explicit extension rule: *"a future claim costs a block with its own
comparator line, which is why this frame does not need revisiting when the fifth one arrives"*
(`FRAME:64-66`).

| Delta | Status | How it lands |
|---|---|---|
| 1 · The push line speaks **range-to-range** | **Round 4's, not precluded** | The frame already makes a range a first-class face at every altitude — the chip travels unrounded (`README.md:167-169`) and the verdict box is identical for a range and a single (`STATES-synopsis.md:61`), so a range-to-range sentence needs no new treatment. **One thing Round 4's brief must carry:** the push line's moment is an *add*, which is the Consider tab, and Round 0's altitude answer covers only the deck tile and the deck band. Not precluded — unplaced |
| 2 · The upgrade path hands a **candidate set, never a pick** | **Round 4's, not precluded** | A new block with its own comparator line, per `FRAME:64-66`. No Round 0 ruling constrains a four-card candidate list or a plainly-stated blocked case |
| 3 · The B3 **infinite-turns loop state** | **Accommodated** | The output shape is drawn — the canvas already renders `Cards permit 4 or 5` with an `extra turns` barometer on the rung. What Round 2 adds is the named-combo receipt inside that row, which is a `flex-wrap` list and holds it |
| 4 · The three **fixed detection sentences** | **Open for Round 2, correctly** | Round 0 draws no provenance slot, and §6a assigns that slot to Round 2 by name. This also answers Round 1's own open question at `2026-09-19-the-card-mark.md:63` — provenance waits |

## Receipts beside claims — the §2.2 / CRISPI test

**The room exists. The cards do not yet, and that is Round 2's.** The tab is sized for a verdict
and its receipts (`FRAME:10-12`), and the climb lets a reader watch the range being produced
rather than being told it (`README.md:139-141`).

But **no named card appears anywhere in the package** — every receipt is a barometer count, and
the deck's own Game Changers are never listed. The spec carries `FlaggedCardRef` arrays for
exactly this, Round 1 designs the mark that marks them in a list, and Round 2 owns the limits
table. **The finding to carry forward rather than act on now: Round 2's brief must require the
counts to open to their cards**, or the feature ships the shape §2.2 was written against — a
bracket carried to a table with three other people, with no way to show the cards behind it.

## Errata — all engineering-resolvable

Errata 5 and the last two rows of 4 came out of the review round on this PR rather than the audit.

1. **The allowance is missing from the climb's barometers.** The denominator lock's partial, above.
   Restore `receipts.allowance` beside each count.
2. **Tutors fell off the final climb.** `README.md:120` still specifies a dashed tutor row tagged
   `not a gate`; the shipped climb draws four barometers and no tutors, and tutors survive only in
   the `1b` study. Spec §2.1 says the count is still drawn. Draw it as an **adjacent fact line
   beneath the climb, never a rung** — a rung would imply the gate §2.1 says does not exist.
3. **The population line has no reservation** (spec §6.3a, "reported beside the verdict", carrying
   the 22.4%-declare denominator). The brief's own round table assigns it to Round 2, so this is a
   note for that brief rather than a Round 0 gap.
4. **The `HANDOFF.md`-wins precedence note covers only `README.md`.** `STATES-synopsis.md` and the
   copy file drifted too and are not covered by it. **Ruling for engineering: `HANDOFF.md` wins,
   then the canvas, then everything else.** Build the shipped copy from `HANDOFF.md` plus the
   canvas, not from `deck-analysis - copy strings.ts` as delivered. The conflicts:

   | Conflict | `HANDOFF.md` / canvas | The other file |
   |---|---|---|
   | Verdict label | `Your bracket` (`HANDOFF.md:18`, canvas) | `Bracket — your cards permit` (`copy strings.ts:43`) |
   | The big numeral | removed as a duplicate (`HANDOFF.md:18`) | `1–2` display 800/32px (`STATES-synopsis.md:56`) |
   | The range chip | one Split chip, `1 / 2 Split` (`HANDOFF.md:17`, canvas) | `1–2 Exhibition or Core` (`copy strings.ts:33-34`) |
   | The ladder footer | the "allowed, but…" lines are gone; rows above the verdict draw nothing (canvas) | `agreement` / `aboveWhatYouBuilt` (`copy strings.ts:69-70`; `README.md:141`, `:152`) |
   | Mark vocabulary | one diamond, ornamented by rank; the five-rung crown was rejected (`README.md:225-236`) | "crown" / "rungs" throughout `STATES-synopsis.md` and `READINESS.md` |
   | Numeral kerning on `4` | `dx="-0.9"` (`HANDOFF.md:15`) | `dx="-1.8"` (`README.md:294`) |
   | The mark's floor | "the floor is 20px, and it is a hard one" (`README.md:256`) | `floor 24px` in the variants table (`README.md:290`) |
   | Palette | **DECIDED: 2e Ignition** (`README.md:345`, `HANDOFF.md:16`) | "currently drawn in 2a" (`:311`); "II + 2b is the pairing" (`:196-198`) |
   | The undeclared range's action | **two labelled CTAs**, `Bracket 1` / `Bracket 2`, under *"Pick one so pods know what to expect"* (`HANDOFF.md:18`, canvas) | "one neutral outline button" (`README.md:202`, `:211`, `:589`); one generic `declare` plus a skip label (`copy strings.ts:51`) |
   | Which brackets are offered | the two that survive the deck's receipts — the drawn case offers 1 **or 2** | `undeclared` hard-codes 1 and 5 (`copy strings.ts:47`), which reads as suppressing a valid `Core` declaration and misdescribes the 4/5 range |

5. **Two denominators are hard-coded to 99, against the frame's own live-list ruling.** The frame is
   explicit that every figure reads the live deck and *"every denominator is the live count — `of 62`
   on a 62-card pile, never a hard 99"* (`FRAME:75-84`). But state 5 says *"the bracket needs one pass
   over all 99"* with a `— of 99 read` denominator (`STATES-synopsis.md:26`), and the copy file
   hard-codes the same figure (`copy strings.ts:105`). A 62-card pile would be told its bracket needs
   a pass over 99 cards. **Both take the live total as a parameter**, and the canvas's own examples
   read as examples rather than as the rule. Found by review, not by this audit.
6. **The copy file uses `—` escapes** (`:43`, `:47`, `:56`, `:114`, `:121`) plus literal em
   dashes in its comments. Run it through `copy-review` for the em-dash rule before any of it
   lands in `src/lib/copy/`.
7. **The handoff's own punch list is carried as-is** (`HANDOFF.md:44-56`): the phone header order,
   deck tiles taking the named chip rather than the bare mark, Home's resume row (not mocked),
   colour-board tiles still on the one-line footer, the real `Yuriko, the Tiger's Shadow` clip at
   160px in a 130px box, and the README doc sync. The five Cinzel "content clipped" findings are
   measured false positives and stay ignored; the Yuriko one is real.

## Source grounding — spot-checked, and it holds

`builder-view.ts:14` is four views and nothing writes `?tab=`; `RoleCounterStrip` is mounted at
`builder-shell.tsx:949`; `RECOMMENDED_MIX_SOURCE_LINE` renders at `role-counter-strip.tsx:91`.
Design read the branch rather than recalling it.

## Round 1

**Clear to fire.** `2026-09-19-the-card-mark.md:5-6` states it depends on Round 0 only existing,
and nothing in this audit blocks it. Two lines the prompt must add:

1. **The bracket mark vocabulary is now adopted** — Filigree (one diamond, ornament by rank),
   palette **2e Ignition** constant across all six themes, and a **20px floor** below which the
   numeral ships alone. Round 1's three card marks must read as legibly *not* that mark on a row
   that can carry both.
2. **Its §5.3 question is already answered by §6a delta 4** — provenance waits for Round 2, whose
   three detection sentences are fixed constants shipping from code.
