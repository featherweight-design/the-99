# The 99 — The declaration (design handoff · R2, Round 3 of 5)

> **Start with `HANDOFF.md`.** This file is the long-form argument: why each state is shaped the
> way it is, and what was tried and dropped on the way.

**Source of truth:** `docs/superpowers/design-briefs/2026-09-20-the-declaration.md` on
`docs/round-3-brief` (PR #764). Spec §6.1a, §6.1b, §7.2, §11.1 **as amended on
`feat/combo-decides`**. Contract verified against `src/lib/bracket/types.ts` on that branch.

**Frame:** Round 0 (`design/design_handoff_the99_deck_analysis/`). **Block:** Round 2
(`design/design_handoff_the99_verdict/`, PR #763) and its R1 audit. Round 2's §2 composition —
the box, its size, the climb, the findings, the modal chrome, the population line — is carried,
not redrawn.

**File:** `The 99 - The Declaration.dc.html` — canvas (pan/zoom). Tweaks: `theme`
(amonkhet · kamigawa), `demoState` (1a's live card). Every colour is a `var()`.

**1a's card is live.** Click a chip, click `change`, click `skip this`. This round is an
interaction, and an interaction argued in static frames is an assertion.

---

## R3 — what changed from R2

**The parenthesised bracket numbers are gone** (§3). R2 spelled *Optimized (4)* in every face and
sentence; the mark beside each one already draws the numeral, so the suffix printed the number
twice in one object. Names alone everywhere, and the number spelled only in the reasoning
modal's heading — the one bracket reference with no mark beside it. The climb's label column
returns to Round 2's 186px with it.

## R2 — what changed from R1

**Drift was drawn impossibly, and the correction is load-bearing.** R1 showed *you said Upgraded
(3)*. Nobody can say 3: only 1/2 and 4/5 are ever offered. A declaration is always 1, 2, 4 or 5,
so **drift is always a deck crossing out of the range it was declared inside** — `1|2 → [4,5]`
or `4|5 → [1,2]`, and nothing else. R1's second entrance dies with it: *a reader overruled the
lean* means declaring 5 where the lean said 4, and both sit inside `[4,5]`. That is a
declaration, not drift, and it can never set the flag. **One cause, one sentence, no
`driftVoice`.**

And the sequence is now the copy's premise: the player edits, commits, re-analyses; the app
re-reads the cards. So the sentence reads *your last changes moved this deck past that* — it
credits the player with the movement, which is true, and is what keeps the state from scolding.
**The app re-read the deck. It did not re-declare it.**

Also in R2: the declared state resolves the face to the declared bracket's own chip; `change`
sits inline at the end of its sentence; the split pill is labelled `split`; *Why this resolved
here* is now **How we determined this bracket**; the receipts show card art at 100×140 under
**How we determined bracket 4**; the overview is drawn at the length its column can hold. (R2
also added a name + number convention to every string — reverted in R3, above.)

## 1 · The ask replaces the question mark

Round 0 drew two labelled CTAs under *"Pick one so pods know what to expect"*. Round 2 drew the
undeclared state as a ringed `?` and routed the declaration here. The reconciliation keeps
**Round 0's words and Round 2's place**.

**The chips carry the bracket marks.** They are the only pressable thing on the surface that
does, which is what stops them reading as a second verdict: the verdict's mark is 36px and inert,
the chip's is 22px inside a control. 38px tall at desktop, **44px and half-width each at 390**,
where the skip drops to its own line rather than becoming a third button.

**The ringed `?` goes.** A question mark beside a question labels a thing that is already
speaking — and the moment the player answers it has to become *something*, which is how a second
glyph gets invented.

**Option B is drawn and rejected** in 1a: the two bracket names underlined inside the sentence. A
17px target in a wrapping line, the dotted underline already means *opens a card*, and it is the
only reading where a player can answer by accident.

## 2 · Answering resolves the face

A declared deck stops drawing a split: the title becomes *Optimized* and the pill becomes
that bracket's chip. The permitted range is still a fact and does not vanish — it moves into the
description line (*Your cards permit Optimized or cEDH*), which is also where a later
drift shows it moving. A **skipped** deck keeps the split, because the question is genuinely
still open; it is simply never asked again.

## 3 · The name, because the mark carries the number

R2 spelled *Optimized (4)* in every face and sentence. It is redundant: the mark beside each one
already draws the numeral, so the parenthesis printed the number twice in a single object. The
label is the **name alone**.

**The one place a number is spelled is the reasoning modal's heading** — *How we determined
bracket 4*, with *Optimized* beside it — because a heading is the only bracket reference on this
surface that carries no mark.

## 4 · The lean explains a verdict rather than proposing one

- **`reachable`** — the tutors cover a whole combo, and it slotted at **Optimized or cEDH**.
- **`drawOnly`** — they do not, and it stayed at **Upgraded**, with no declaration question.

Both read under one 9px mono label, **`HOW WE DETERMINED THIS BRACKET`** — the same label form
as *What other players say*, and a phrase a reader would use to ask for the thing. **The ringed
`≈` is retired** (§4.4): the boundary it was drawn for now resolves, and calling the lean
approximate would undercut the one reading whose working we can show in full.

### The receipts, and the sentence nobody may write

`see the reasoning` opens **Round 2's modal chrome with a third body**, titled *How we determined
bracket 4*. The combo's two halves are tiles at **100×140** — Round 2's thumbnail was a locator;
here the card *is* the evidence, and a reader checking our working should not have to open
anything to read a type line. Under each, a `found by` slot lists the tutors that find **that
half**.

**Grouped, never a set, never a total.** A flat list of five cards under a combo invites exactly
the reading the rules deleted in October 2025 — that a quantity of tutors is itself the problem.
Grouped by half, the only figure the eye can take is *two halves, both covered*. No count in the
body, and **no fraction in the header**: a `2 of 2` prints a numerator a reader can try to lower.

The `drawOnly` body is the same layout with `found by` reading *nothing in this deck searches
for it* — an empty slot would read as a clean deck.

**The modal carries no declare control.** A reader who rejects the reasoning closes it and
answers in the sub-line: same field, same mechanism.

## 5 · Drift

`declaredOutsidePermits` is the app's best argument for recording a declaration at all — it is
what a computed number cannot buy — and it is the state most likely to read as a scolding.

It is drawn as **a movement**: the declared bracket's mark, an arrow, the permitted marks, under
small labels (*you said* / *your cards now permit*). Then the sentence, then *Your declaration
stands as you left it.*

- **Nothing red.** No `--danger`, no warning glyph, no toast, no badge on the tab.
- **No "fix", no "update my declaration".** The analysis is automated; the declaration is not.
- **No *outdated*, *no longer*, *should*.** Two facts, then stop.

## 6 · The skip

Permanent, per deck, stored. One faint line and `say which`, which stays because volunteering
later is not the same as being asked. **No re-ask** on the next analysis, re-import or version.
Both answered states are shorter than the ask: the question occupies the block once and then
gets out of the way for the life of the deck.

## 7 · Three edits to Round 2's drawing

Drawn in 1e so they are not discovered in build:

1. **The climb's 4–5 rung loses its ringed `?`** and points at the answer. One ask per surface.
2. **The combo figure reads `reachable`** where it read `no cap`.
3. **The rung labels carry numbers**, which widened the label column 186 → 200px.

The *to drop to here* rung keeps the R1 audit's ruled wording — *Upgraded allows 3 game
changers — you have 5* — which states the limit and never the action.

## Notes for engineering

- **The write path is the round's one new mechanism.** `declared` is a column and a server
  action; the skip is **also stored state**, not a session dismissal — it must survive reload,
  re-analysis and re-import.
- **Never default or infer `declared`**, including from `lean.likely` and including after a
  re-analysis that moves the range.
- **`lean.receipts[].tutors` must arrive per combo piece**, not as one array for the combo. The
  modal groups by half and cannot do it from a flat list without re-deriving coverage on the
  client. **This is the one data-shape change this round adds.**
- `ComboRef` and `CardRef` must carry oracle ids and image uris — now at card size, not
  thumbnail size.
- **Live region:** `Analysis ready. Your cards permit Optimized or cEDH. Your tutors can
  find both halves of one combo, which puts this past Upgraded. Which of the two this is, is
  yours to say.` On a drifted deck: `Analysis ready. You said Core. Your last changes moved
  this deck past that — it now permits Optimized or cEDH.`
- **The overview wants a longer generator budget** — two paragraphs, not two sentences. Drawn at
  length in 1e; the column is 740px and was carrying a caption.
- **The About entry belongs to this surface's release**, with the `ABOUT_VERSION` bump.

## Files
- `The 99 - The Declaration.dc.html` — the canvas. 1a's card is live.
- `HANDOFF.md` — settled decisions and build guardrails. Start here.
- `README.md` — this file.
- `STATES-declaration.md` — the state matrices.
- `declaration - copy strings.ts` — every string, with reasoning inline.
- `READINESS.md` — self-assessment, what was called rather than asked, the engineering list.
- `brand/` — brand sheet, for self-containment. Not a colour source; tokens are.
