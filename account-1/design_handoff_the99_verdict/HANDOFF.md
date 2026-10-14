# The verdict — handoff package (R1, Round 2 of 5)

**Canvas:** `The 99 - The Verdict.dc.html`. **Turn 4 is the adopted design** (sections 4a–4c);
Turns 3, 2 and 1 below it are the exploration, kept for the audit trail and superseded wherever
they disagree. `theme` switches amonkhet / kamigawa in Tweaks.

**Brief:** `docs/superpowers/design-briefs/2026-09-20-the-verdict.md` on `docs/round-2-brief`
(PR #760). **Frame:** `design_handoff_the99_deck_analysis/` (Round 0, Yellow) — nothing in its §2
is redrawn. **Marks:** Round 1's three glyphs, plus two new ones defined here.

---

## The tab, top to bottom

| Block | What it does | Opens? |
|---|---|---|
| **The verdict** | The bracket, its mark, one sentence saying why, and the population line in its foot | no |
| **Where you sit, and what moves you** | Three rungs — the bracket below, yours, the one above | no |
| **What is in this deck** | Five findings, each with its count and its cards | **yes — a modal** |
| *How we make these decisions* | Collapsed provenance, four plain rows | expands in place |
| Recommended mix, the ledger | Round 0, unchanged | — |

**One rule governs the whole tab: the climb states, the findings open.** Nothing in the climb is
interactive except `see all brackets`; every count that has cards behind it lives in the findings.

## What changed from the brief's shape, and why

**The standing limits table is deleted.** Four rules × three brackets duplicated what the climb
already says, and on a bracket-4 deck the rules for 1 and 2 are noise. The full rule set is now one
reference sheet behind **`see all brackets →`** in the climb's foot — the only place all four
rules and three brackets appear together, read by anyone arguing a specific figure.

**The climb shows three rungs, not five.** The bracket below with *what would take you down*, yours
with its findings, the one above with either *already allowed* or the declare split. Rungs a deck is
nowhere near are not drawn, which removes the repeated *ruled out — 2 game changers* copy by
construction rather than by editing.

**Receipts open a modal, not an inline row.** One chrome, two bodies: a tile grid for a card list,
and a combo body carrying the pair, what it produces, mana, and Spellbook's steps full width.

**Tutors moved out of the climb into the findings**, where they are a fifth count with a **`no
limit`** chip. A tutor is a fact about the deck; it was never a rung.

## ⚠ Open with engineering: the 3-or-4 split

`permits` is typed as `[1,2] · [2] · [3] · [3,4] · [4,5]` and `slotDeck` is merged. **The canvas
is drawn without `[3,4]`**, on the reading that 1–2 and 4–5 are the only pairs sharing card limits,
so those are the only two splits intent can produce. A deck at 3 with a two-card infinite reads
**`3`**, with the combo reported as a finding that does not move the answer. **This needs a spec
amendment**; the user is taking it to engineering.

## The five fact marks

Round 1's three, plus two adopted here. One ink (`--fact`), bare, and a rule worth keeping: **solid for a card on a list, stroked for a behaviour that loops.**

| | Mark | Fact |
|---|---|---|
| solid | bolt | Game changer |
| solid | peak stripped | Mass land denial |
| stroked | turn again | Extra turns |
| stroked | **lemniscate — new** | Two-card infinite |
| solid | **drawn up — new** | Tutors |

**`MarkKey` gains two entries and the key ships in the same release** — for the surfaces that need
it. **Superseded by `design_handoff_the99_verdict_addendum/` §2: the Analysis tab draws no key**, because every
glyph here is named in words within its own row. The rule, restated so it can be checked: *a fact
mark may be drawn without a key only where its fact is named in words in the same row.*

**The 12px floor is superseded** by the 2026-09-21 ruling that `CARD_FACT_MARK_PX` is 16 on every
surface and is not a prop (`gap-report-deck-climb.md`, gap 3).

## Three things most likely to get broken in build

1. **Do not make the climb's figures open.** They are plain text now. Two things opening the same
   receipt is how the duplication came back last time.
2. **Do not give a zero a rail or an underline.** An affordance onto nothing is worse than none.
3. **Do not drop the bracket mark at 390.** The rungs carry it at 22 / 26px, both above Round 0's
   20px floor. A numeral-only rung was tried and rejected.

---

## Addendum, 2026-09-22

`design_handoff_the99_verdict_addendum/` rules on four calls raised during build (#851, #853) and **wins over this
file and over the canvas wherever they disagree**:

1. **The card modal stacks; the receipt stays behind it.** Depth stops at two. Drawn in the addendum's §5a.
2. **No MarkKey on the Analysis tab** — see the restated rule above.
3. **The bracket mark is a graphical object held to 3:1**, not 4.5. Rank 1's 4.4768 passes; the
   range's dim rises from 0.45 to **0.65**. Drawn in the addendum's §5b.
4. **`no cap` on a bracket-4 rung, confirmed.** The canvas was wrong and is corrected at §4b, §4c.
