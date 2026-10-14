# The 99 — The verdict (design handoff · R1, Round 2 of 5)

> **Start with `HANDOFF.md`, then `design_handoff_the99_verdict_addendum/`.** This file is the long-form
> argument: why each block is shaped the way it is, and what was tried and dropped on the way.
>
> **The addendum is newer than everything here and than the drawings.** Four calls raised during
> build (#851, #853) are ruled there: the card modal stacks over the receipt, the Analysis tab draws
> no MarkKey, the bracket mark is a graphical object held to 3:1 with the range's dim at 0.65, and
> `no cap` on a bracket-4 rung is confirmed. Where it and this file disagree, it wins.

**Source of truth:** `docs/superpowers/design-briefs/2026-09-20-the-verdict.md` on
`docs/round-2-brief` (PR #760). Spec: `docs/superpowers/specs/2026-09-19-deck-analysis-foundation-design.md`
§6.1a, §6.2, §6.3, §6.3a, §6.4, §6.5, §11.1.

**Frame:** Round 0's `design_handoff_the99_deck_analysis/`. Its §2 is untouched — the tab and its
position, the relocated mix strip, the verdict block's box, the Filigree mark in 2e Ignition, the
20px floor, the live denominator.

**File:** `The 99 - The Verdict.dc.html` — canvas (pan/zoom), `theme` prop: amonkhet · kamigawa.
Every colour is a `var()`. Adopted design is **Turn 4**; Turns 3–1 are history.

**Drawn on three real decks** so the composition could be judged rather than asserted:
**HD · Soldiers** (Myrel, mono-white) at 2, **HD · Tovolar** (Gruul) at 3, **HD · Yuriko** (Dimir)
at 4 or 5. Both widths, all three.

---

## 1 · The verdict block

Round 0's box, unchanged in surface, height and mark. Four readings, and the only part that differs
is the sub-line:

| `permits` | Sub-line | Glyph |
|---|---|---|
| `[1,2]` | intent, at the bottom — *which of the two this is, is yours to say* | ringed `?`, `--bracket-1` |
| `[2]` / `[3]` | the rule that ruled the one below out | none |
| `[4,5]` | intent, at the top — *which one this is, is how you play it* | ringed `?`, `--bracket-4` |
| *(`[3,4]`)* | **not drawn** — see the open question in `HANDOFF.md` | — |

**Round 0's reserved violation card is discarded.** A violating deck does not need a fourth shape:
the block prints a bracket and a reason, and the cards live in the findings. A deck past all three
limited brackets gets exactly the type, ink and mark a `1 or 2` deck gets — nothing dashed, nothing
red, no *over* tag.

### The population line

In the block's foot, below a hairline, under **What other players say**.

- **Never an input to the verdict.** Feeding it in makes the reading a popularity contest.
- **The denominator is inside the sentence** — *of the 9,730 Yuriko decks that declared a bracket,
  3,884 said Optimized*. Never a bare figure: only ~22.4% of decks declare one.
- **The 27 commanders with no counts report absent**, never zero. A zero reads as *nobody plays this*.

## 2 · Where you sit, and what moves you

Three rungs. The bracket below answers *what would take you down*; yours carries the findings that
put you there; the one above is either **already allowed** (nothing rules it out) or, at 4–5, the
declare split.

**Why three and not five.** At bracket 4 the rules for 1 and 2 are noise, and five rungs on a deck
past three of them produced three near-identical *ruled out* lines. Drawing only the neighbours
removes that by construction, and it makes the block **shorter on a high-bracket deck than a low
one**, which is the opposite of what the five-rung version did.

**Nothing in the climb opens.** Allowances read `3 allowed` and `no cap` in `--fg-faint` beside
the figure. The foot carries one link, `see all brackets →`, which is where the full rule set went.

**At 390 the bracket mark stays on every rung** — 22px on the neighbours, 26px on yours, both above
the 20px floor — and the findings indent to sit under it. The rung is the one place the mark is
doing work rather than decorating; dropping to a bare numeral there was tried and rejected.

## 3 · What is in this deck

Five findings, each a count, its cards, and a control. **Tiles at desktop (five across), rows at
390** — a 390 tile is 168px and cannot hold two card names; a 1120px row holds four. One component,
one breakpoint.

| Finding | Mark | Note |
|---|---|---|
| Game changers | bolt | Wizards' list |
| Mass land denial | peak stripped | |
| Extra turns | turn again | |
| Two-card infinites | lemniscate | |
| Tutors | drawn up | **`no limit`** chip — the clause was deleted in October 2025 |

**A zero has no control.** Nothing behind it, so no rail, no underline, no rally — a quiet line that
reports and gets out of the way. Soldiers draws three of them and the tab still reads in one screen.

**On the phone the action is a rail**: right-aligned under the card names, 44px tall, with a `→`
rather than a caret, because it opens a modal and a caret promises an expand.

## 4 · The receipt modal

One chrome — glyph, name, count, close; a foot; two bodies.

**A card list** is a grid of tiles. **A combo** is the pair, the tags, mana needed, and **the steps
full width beneath the cards** — prose wants a measure, and four numbered steps in a 340px column is
not one. The foot reads *assembled in this list* and stops: *intentional* is not inferable and is
deliberately ignored, so the app never appears to have answered that half.

**Rejected:** an inline row disclosure (had to fit names into a 172px cell), and a tooltip (does not
exist on touch, and both widths ship together).

**A tile tap opens the card modal, and the receipt stays behind it** — two dismissals, two landings,
in the order they were opened. On the phone the card sheet is offset 44px with the receipt's header
visible above it, so the reader can see where a dismissal lands; depth stops at two. Ruled in
`design_handoff_the99_verdict_addendum/` §1, drawn in the addendum's §5a. **The fact marks come off the tiles**: inside a
receipt headed *Game changers · 5*, a mark on all five members of a homogeneous set carries no
information (§2).

## 5 · How we make these decisions

Collapsed by default, one 10px mono line under the findings; expands in place. Four rows, one per
finding, each saying **where the answer comes from** and, underneath, **what it misses and why**,
naming the card.

The first draft printed the raw coverage strings — *2 sources*, *no misses among the 56*, *known
miss* — which are notes to ourselves, not sentences, and the reviewer needed several passes to
decode them. **Game changers is included precisely because it has no caveat**: it is the contrast
that makes the other three legible. A closing line says why the panel exists at all — *if someone at
the table disagrees with your bracket, the argument is usually about one of these four.*

**Every outside source is named and linked** — the Commander Format Panel's bracket rules, Scryfall,
Commander Spellbook — in the app's out-of-app treatment (`--accent`, solid underline, `↗`),
distinct from the dotted underline that opens a card. **Two slots are drawn unnamed**: the two
mass-land-denial lists and the extra-turn cross-check. Inventing a citation is worse than showing
the gap.

**A disclosure, not a tooltip, and not a badge.** A badge that always says the same thing trains
readers to skip it; a tooltip does not exist on touch. State is local and never persisted — this is
read once, mid-argument.

## Notes for engineering

- **`Violation.cards` / `ComboRef` must arrive with oracle ids and image uris**, not names. The
  modal renders card tiles and the client must never string-match a name.
- **The findings block needs tutors**, which is not a `BracketLimitReport` field — it is in
  `UnquantifiedFacts`. Same shape as the other four at the surface.
- **`counted: false` still matters** even without the table: it is why an extra-turn figure at
  bracket 2 or 3 prints `no cap` rather than an allowance.
- **Source names and URLs ship from code** with the coverage strings, including the two unnamed slots.
- **Population is nullable, not zeroed.**
- **Live region:** `Analysis ready. Your cards permit 4 or 5. Five game changers put this past Upgraded.`
- **The About entry belongs to this surface's release**, with the `ABOUT_VERSION` bump.

## Files
- `The 99 - The Verdict.dc.html` — the canvas. **Turn 4 is the design.**
- `HANDOFF.md` — settled decisions and build guardrails. Start here.
- `design_handoff_the99_verdict_addendum/` — **four rulings from build, newer than every other file and than the canvas.** Read second.
- `README.md` — this file.
- `STATES-verdict.md` — the state matrices.
- `verdict · copy strings.ts` — every string, with reasoning inline.
- `READINESS.md` — self-assessment, what was called rather than asked, the engineering list.
- `brand/` — brand sheet, for self-containment. Not a colour source; tokens are.
