# Combo awareness — handoff package (R1)

**Canvas:** `The 99 - Combo Awareness.dc.html` — two turns, newest at top.
**Turn 2 (`2a`)** is the card-modal addendum. **Turn 1** is the naming question (`1a`/`1b`/`1c`,
adopted `1b`) and every state on every host at both widths.

**Source of truth:** §4.3 and §4.3b of
`docs/superpowers/specs/2026-09-19-deck-analysis-foundation-design.md` on `main`.
**Structural sibling:** `design_handoff_the99_card_mark/` — same problem shape, marks on shipped
surfaces. Round 1's `--fact` ink and size ladder govern; **Round 2's lemniscate is used, not
redrawn.**
**Self-assessed:** 🟡 Yellow — see `READINESS.md`. Two of the seven dependencies are eng questions,
not blockers on the drawings.

## The design in one line

One mark, one sentence, and the mark moves down to lead it: a fact mark **with** a sentence leaves
the name line for the host's secondary line, a mark **without** one stays where Round 1 put it, and
one glyph is never drawn twice on a row.

## The three states

| # | State | Sentence | Where it lives | Population |
|---|---|---|---|---|
| 1 | both halves owned, unassembled | `with {partner} — you own both` | `/collection` row + tile | 77 of 2,805 |
| 2 | one away, you own the missing card | `completes with {partner}` | Add panel, Last-31 | ~4 per deck |
| 3 | one away, you'd buy it | `completes with {partner}` | Add panel, Last-31 | ~37 per deck |

States 2 and 3 are the **same mark and the same string**. The difference is the shipped
`OwnershipDot` and the shipped `BuyTag`, both untouched.

## What is in this folder

| File | What it is |
|---|---|
| `The 99 - Combo Awareness.dc.html` | The canvas. `2a` is the modal addendum; Turn 1 carries the naming options and all host drawings. `theme` switches amonkhet / kamigawa in Tweaks. |
| `README.md` | The five calls, host by host, the two named yields, the engineering ledger, and what was refused. **Start here.** |
| `ADDENDUM-modal-block.md` | The card-modal block in full — placement, scope line, the three partner states, density and disclosure, the tooltip link out, and **Hugh's open question for engineering**. |
| `STATES-combo-awareness.md` | Seven state matrices — collection row, collection tile, Consider tile, quick-add row, Last-31 row, card modal, key — at 390px and desktop. |
| `combo-awareness · copy strings.ts` | Every string, with reasoning and the refused alternates inline. Two row sentences, the modal block, the bound. |
| `READINESS.md` | Seven dependencies, the open items Design is carrying, and the contrast note. |
| `brand/` | The brand sheet, for token names and theme values. Reference only — not reopened. |

## Reading order for engineering

1. `README.md` §A–§D — what the mark says and where the clause goes.
2. `STATES-combo-awareness.md` — the matrices you implement against.
3. `ADDENDUM-modal-block.md` — the modal, and **the question at its foot that wants your answer**.
4. `READINESS.md` — dependencies in order.
5. `combo-awareness · copy strings.ts` — copy in, verbatim.

## The four things most likely to get broken in build

1. **Do not draw the mark twice.** When a clause is present the lemniscate leaves the name line.
   A `CardFactMark` that renders the full fixed order regardless will put two lemniscates on one
   row, which reads as two combos.
2. **The clause never turns `--warning` and never enters the availability slot.** Boxed means
   *about your copies*; bare means *about the card*. The combo is not a spending fact.
3. **No count, anywhere.** Not in a heading, not as `+1` after a partner name, not on a deck tile.
   Detection excludes template-gated variants **by design**, so a number is the first false claim
   on the surface. `+8 more` is legal because it describes what is hidden, not what exists.
4. **The join must apply all three of §4.3b's rules.** Template prerequisites excluded,
   `mustBeCommander` matched, and the commander read from `decks.commander_oracle_id` /
   `partner_oracle_id` rather than `deck_cards`. Two of the three prevent a false *completes*, and
   a false *completes* is the one failure this design cannot survive.

## Open for the reviewer

**Hugh's question, at the foot of `ADDENDUM-modal-block.md`, wants an engineering answer before
the modal block is built:** should `you don't own it` partners appear in the block at all, or only
what is in the deck and what you own? Both versions are drawn. The cut is a filter on the
ordering's tail — no relayout, no new copy, one extra clause in the caveat. Design's read is that
Hugh is probably right and it should be measured on a real 14-partner card first.

Second, smaller: the mark's column position is no longer stable down a list (name line for a bare
fact, secondary line for a state). Deliberate, argued in `README.md` gap 1, and reversible for the
cost of repeating the glyph.
