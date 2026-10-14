# The verdict, addendum — four rulings (R1, Round 2 of 5)

**Canvas:** `The 99 - Verdict Addendum.dc.html` — §5a the sheet stack, §5b the mark's ink.
**Parent package:** `design_handoff_the99_verdict/`. **This package is newer than that one and
wins where they disagree** — than its files and than its drawings.

Raised during build of the verdict head and the climb (#851, #853), after
`gap-report-deck-verdict.md` and `gap-report-deck-climb.md` resolved everything else without
Design. **No surface is redrawn.** One canvas correction and one new canvas section are named below;
everything else here is a ruling against the existing package.

Read with the parent's `HANDOFF.md`. Two of the four rulings are prose only; two are drawn here.

---

## 1 · The receipt modal stays behind the card modal

**Ruling: the card modal stacks. The receipt does not close.** Dismissing the card modal returns to
the receipt; dismissing the receipt returns to the tab. Two dismissals, two landings, in the order
they were opened.

**Why.** The receipt is a *set*, and the reader opened it to read the set. Someone checking five
game changers taps a second card roughly as often as they tap a first; closing the receipt on the
first tap makes that five separate openings — ten taps to read five cards — and, worse, it throws
away the reader's place in a list they had not finished. **The receipt is where you are standing.
A card is a thing you pick up and put back.**

**The phone problem, and the fix.** Two full-width sheets with identical chrome give a reader no way
to predict what a dismissal does, and that is the real objection. So the card sheet **does not fill
the same rectangle**: it sits 12px lower, leaving a visible strip of the receipt's own chrome above
it, and the receipt's ground darkens one step behind it. The reader can see the thing they will land
on before they dismiss. Drawn in **§5a**.

**Depth stops at two, and this is a hard rule.** Nothing inside the card modal opens a third sheet —
no related-card link, no jump to another combo. The `Commander Spellbook ↗` link in the combo foot
is not a third sheet; it leaves the app, which is a different action and reads as one.

**Applies to both bodies.** Tapping either half of a combo pair stacks the same way. The combo body's
two card plates are card tiles and behave as card tiles.

**Engineering:** the card modal is already a shipped component mounted from several surfaces; this
ruling is about **not** dismissing the receipt on tile activation, plus the offset and ground-step on
the phone. Back-navigation must pop one level, not the stack — a hardware back or swipe-dismiss on
the card sheet returns to the receipt.

---

## 2 · The Analysis tab draws no MarkKey

**Ruling: no key on this tab. `MarkKey` still gains its two entries and still ships in this
release** — for the surfaces that need it. Analysis is not one of them.

**Why this is not a climbdown from the handoff's rule.** The rule is *a glyph without its gloss is
the retired deck-status design*. On this tab **every glyph has its gloss**: each finding names its
fact in words a few pixels from the mark, and after `gap-report-deck-climb.md` gap 3 so does every
figure on a climb rung. A key here would restate, in one block, five labels that are already written
five times. That is not a gloss; it is a second copy.

**The rule, restated so it can be checked:**

> A fact mark may be drawn without a key **only where its fact is named in words within the same
> row**. Anywhere a mark rides something other than its own fact name — a bare card name, a count
> alone, a card tile — the key is owed on that surface.

**What that implies, and it is the part worth acting on.** Earlier turns drew fact marks beside
*card names* (Turn 3 §3b, and the receipt's tile grid). A mark on a bare card name fails the rule as
restated. Either that mark is dropped, or the surface carrying it owes the key. **Recommendation:
drop it** — inside a receipt whose header already reads *Game changers · 5*, every card in the grid
is a game changer, and a mark repeated on all five members of a homogeneous set carries no
information. The marks earn their place in the findings block, where five different facts sit side
by side and the glyph is what distinguishes them.

---

## 3 · The bracket mark is a graphical object, held to 3:1

This is one ruling and it answers both halves, because both halves were being measured against the
wrong threshold.

**Ruling: the bracket mark is not text. It is held to 3:1 (WCAG 1.4.11 non-text contrast), not
4.5:1. The 4.5 gate belongs to the bracket's *name*, which is always beside it in full-opacity body
ink.**

**Why the question was unanswerable as posed.** Chasing 4.5 across grounds is whack-a-mole by
construction: a one-step lightening of `#8A857C` buys `--surface` and loses `--surface-raised`,
and the next ground added in Round 3 restarts the game. The reason the mark does not need 4.5 is
structural rather than convenient — **the mark is never the sole carrier of its meaning.** `Core`,
`Upgraded`, `Optimized or cEDH` are written next to it every time it appears, at full opacity, and
*those* strings are what must clear 4.5:1. A reader who cannot resolve the diamond has lost nothing
but decoration. That is the definition of a graphical object.

**So, concretely:**

| | Reading | Gate | Verdict |
|---|---|---|---|
| rank 1 on `--surface`, kaldheim | 4.4768 | 3.0 | **passes.** No hex change, no ground allowlist to maintain. |
| rank 5 at `opacity: 0.45` | 3.98–4.09 | 3.0 | **passes.** |
| rank 2 at `opacity: 0.45` | 2.25–2.31 | 3.0 | **fails.** Fix below. |

**The dim is raised to `opacity: 0.65`.** 0.45 was chosen to mean *this is the unlit half of the
range*, and that meaning survives a smaller step. On amonkhet `--surface`, rank 2 composited at
0.65 reads ≈3.36 against ≈2.30 at 0.45 — clear of 3.0 with real margin, where 0.6 lands at ≈3.07 and
is too thin to spend across six themes and thirteen grounds. **Engineering measures all thirteen at
0.65; if any miss, go to 0.7 and no further.**

**If 0.7 also misses on some ground, the dim is not the tool.** The fallback is already drawn: the
range's two marks differ in size as well as opacity in the chip, so the upper mark draws at **full
opacity, one size step down**. Do not invent a third differentiator, and do not tint.

**Not covered by this ruling, and still 4.5:** every bracket name, every count, every allowance,
every sentence. The contrast gate's recorded scope should say so.

---

## 4 · `no cap` on a bracket-4 rung — confirmed

**Confirmed. The shipped reading is correct and the canvas was wrong.** `3 allowed` is bracket 3's
allowance; printing it beside a bracket-4 figure states a limit that does not apply to the rung it
is drawn on. The round's own sentence settles it, as the gap report says: *"Four and five have no
card limits between them."*

**The parent canvas is corrected** — `no cap` now, at both widths, in its §4b and §4c. This is the
one place a drawing was edited rather than ruled over.

**One tightening, optional and not a blocker.** On a rung at bracket 4 or 5, *every* figure reads
`no cap`, because the bracket caps nothing — which makes the phrase redundant per figure and turns
a per-figure slot into a property of the rung. Cleaner: **leave the per-figure allowance slot empty
at brackets 4 and 5, and let the rung say it once** — the `where your cards are` label line already
has room. Worth doing if the findings work is not already closed; `no cap` per figure is correct
either way and ships fine as-is.

---

## What this changes in the parent package

Already applied there, so nothing is left for a reader to reconcile by hand:

- `HANDOFF.md` — the MarkKey line and the 12px mark floor marked superseded; an *Addendum* section pointing here.
- `README.md` — §4 carries the stack and the tile-mark consequence; this package listed in Files.
- `STATES-verdict.md` — new **§Da** (the two-level sheet stack) and **§G** (one gate, two thresholds); §B corrected to `ASSETS.md` mark sizes and the allowance slot's two forms.
- `verdict - copy strings.ts` — `noCap` carries ruling 4 and the unshipped tightening; two distinct close labels, since a phone reader can see both sheets at once.
- `READINESS.md` — the contrast item closed by ruling 3; the gate's scope note recorded as new work.
- The canvas — `no cap` at §4b and §4c, and the Turn 5 drawings moved here.

## Files

- `The 99 - Verdict Addendum.dc.html` — §5a and §5b.
- `HANDOFF.md` — this file. The four rulings.
- `brand/` — brand sheet, for self-containment. Not a colour source; tokens are.

## What this addendum does not touch

The `[3,4]` split, still open with engineering. `see all brackets →` remaining undrawn until the
reference sheet exists — correct, and it is the handoff's own second guardrail. The two unnamed
source slots in the provenance panel, still owed real names from code.
