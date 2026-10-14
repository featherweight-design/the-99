# The 99 — The declaration (design handoff · R6, Round 3 of 5)

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

## R6 — what changed from R5

**Two items, one of them a correction to R5's own mechanism sentence.**

**A declaration lives on the draft.** The analysis reads `deck_cards`, the live commander columns
and `decks.declaredBracket` in one snapshot, so *"a re-analysis produces a later version with its
own reading"* — R5's phrasing, in this file and in HANDOFF — was wrong. **A re-analysis produces
no version at all.** What R5 got right is that a declaration is about exactly one deck state;
what it got wrong is which. The draft holds it, and the commit copies it into a version.

That produces the state the audit found, reachable pre-commit on every declared deck:

- **The ask returns** when the draft's reading moves outside what is declared on it — with the
  superseded answer stated once, faint, at 22px, passive (*Core was declared, and this deck has
  since moved out of it*). **Not a comparison row:** §E compares two committed readings that
  nobody can still edit, and a draft is one moving reading. A diff there would invent a second
  one, and `versionChange.line` would print a version number with no value.
- **The wording follows the stage:** *Declared **Optimized**.* on a draft; *Declared **Optimized**
  for version 2.* once committed. One string, one conditional clause.
- **On a single-bracket draft** (declared Core, draft reads `[4]`) the line stands alone — no
  chips, because 4 is not a choice.
- **At commit,** copy the declaration into the version only if it is inside that version's
  permits; otherwise the version records no declaration.

**Rank 5's mark is reissued.** `bracket-5-cedh.svg` was `bracket-4-optimized.svg` with a 5 in it,
all ten paths byte-identical. Rank 5 now joins rank 4's four studs into a **third closed ring** —
same points, same weight, footprint unchanged — so the silhouettes differ at 22px, where the
numeral is already gone. §3b draws the set at three demonstration sizes — 40 / 28 / 22. **Ship
sizes are the asset contract's: full mark 26 / 36 / 44, chip 22.** R9 closed both 22px chip
collisions: rank 2's chip is the ring alone at radius 16.5, rank 3's ticks became spokes.

## R5 — what changed from R4

**A declaration belongs to the version it was made on**, and that single move retires most of
what the last three rounds argued about. Version 1 read as a range and a bracket was chosen for
it; that record is complete and permanently true about version 1. A re-analysis produces a later
version with its own reading, and the block's whole job is to state both.

- **The app no longer quotes the player.** *You said X*, *your last changes*, *change what you
  said* — all withdrawn. The first put words in a player's mouth about a deck they have since
  edited; the last asked them to revise something that was true when they wrote it. The declared
  reading is now a statement of record: *Declared **Optimized** for this version.*
- **The changed-reading state has no control**, because nothing is being corrected.
- **Direction dissolved rather than being solved.** R4 needed *moved past* / *brought inside*
  because a claim about the deck can be false in one direction. A comparison of two readings
  cannot be, so **one sentence covers a deck tuned up and a deck tuned down**.
- **A later version with a range is asked** — not re-asked. It has never answered a question.
- **There is no skip.** Two chips are the whole control, and saying nothing leaves the version
  unanswered. **The permanent-skip state, its copy and its migration are withdrawn**; a nullable
  `declared` per version is sufficient.

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

## 5 · When a later **committed** version reads differently

Drawn as **a diff between two versions**: version 1's mark, an arrow, this version's mark or
marks, under small labels (*version 1* / *this version*). Then one sentence — *This version reads
as **Upgraded**. Version 1 read as Optimized or cEDH and was declared cEDH.* — and nothing else.

- **No control.** Nothing is being corrected, so there is nothing to press.
- **No direction, no second person, nothing red.** No `--danger`, warning glyph, toast or badge;
  no directional or recoloured arrow; no *outdated*, *no longer*, *should*.
- **Cardinality picks one verb:** a range *permits*, a single bracket *reads as*.
- **If this version has a range, the ordinary ask follows underneath it.**

## 6 · Unanswered, never skipped

There is no skip control — two chips are the whole row. A player who says nothing leaves the
version unanswered, and the ask stays on versions that have a range. The declared reading is
shorter than the ask, which is the point: the question occupies the block once per version, then
states its answer as a fact and stops.

## 7 · Three edits to Round 2's drawing

Drawn in 1e so they are not discovered in build:

1. **The climb's 4–5 rung loses its ringed `?`** and points at the answer. One ask per surface.
2. **The combo figure reads `reachable`** where it read `no cap`.
3. **The rung labels carry numbers**, which widened the label column 186 → 200px.

The *to drop to here* rung keeps the R1 audit's ruled wording — *Upgraded allows 3 game
changers — you have 5* — which states the limit and never the action.

## Notes for engineering

- **The write path is the round's one new mechanism**, and it writes to the **draft**:
  `decks.declaredBracket`, as today. The commit copies it into the version — and **only when it
  is inside that version's permits.** A later analysis never rewrites it. No skip state is needed
  or wanted.
- **Never default or infer `declared`**, including from `lean.likely`, from an earlier version's
  answer, or after a re-analysis that changes the reading.
- **`declaredOutsidePermits` may not need to exist.** Per version it is the observation that
  `v(n)` reads differently from `v(n-1)` — computable at analysis time with nothing stored.
- **`lean.receipts[].tutors` must arrive per combo piece**, not as one array for the combo. The
  modal groups by half and cannot do it from a flat list without re-deriving coverage on the
  client. **This is the one data-shape change this round adds.**
- `ComboRef` and `CardRef` must carry oracle ids and image uris — now at card size, not
  thumbnail size.
- **Live region:** `Analysis ready. Your cards permit Optimized or cEDH. Your tutors can find
  both halves of one combo, which puts this past Upgraded. Which of the two this is, is yours to
  say.` On a version that reads differently: `Analysis ready. This version reads as Upgraded.
  Version 1 read as Optimized or cEDH and was declared cEDH.`
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
