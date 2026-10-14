# R4 — readiness

`design/design_handoff_the99_linkout/` · 2026-09-06

**Verdict: 🟡 Yellow — buildable now, with two facts to confirm against files this package cannot
read.** Nothing in the three closed decisions is at risk; both items are verification, not design.

Canvas: `The 99 - Decks · Shopping Strip Link-Out (R4).dc.html` · reasons:
`LINKOUT-R4-README.md` · contract: `shopping-strip-linkout · copy strings.ts`.

## Drawn against the three closed decisions

| Decision | Where it is drawn |
|---|---|
| **1 · The action is on the Shopping filter surface** | **In the strip, not beside it** — canvas item 1, third placement, with the other two drawn and rejected. Measured cost: desktop `40px → 69px`, phone `52px → 96px`. Nothing shipped inside the strip moves. |
| **2 · The list you buy is the list on screen** | Canvas item 5 — the six-row basket ledger. One selector, three consumers, `href` derived at click. |
| **3 · The Export link stays, retargeted** | Canvas item 5b — visually byte-identical to R3, payload only. |

## Blocking nothing, but confirm before merge

1. **Does `external-link.tsx` ship R3's anatomy?** Specifically the underline at
   `color-mix(--accent-hover 45%, transparent)`, offset 3px, and hover moving ink *and* underline
   *and* glyph to `--fg`. **If yes, this pass adds no code to the component.** If the shipped
   underline differs, R3's spec wins and the component is the thing that changes — not this
   placement.
2. **The strip's real padding and radius.** Drawn as `11px 15px` / `r9` from the addendum canvas.
   The 9px gap above the link is load-bearing: the focus ring overlaps it by 2px instead of pushing
   the provenance line. If the shipped padding is tighter, keep **9px** for the gap and let the box
   grow.

## Open, non-blocking — worth one look in place

- **The phone strip at 96px, under the pills.** It is three lines and a 44px row inside the
  `GroupToggle` container. I believe it balances; it is the one measurement in this pass I would
  rather see on a device than in a drawing. If it reads tall, the fix is the strip's vertical
  padding, **not** the 44px row and not the link.
- **The none-priced strip is the only shipped behaviour change.** A state that previously rendered
  nothing now renders two lines. Small, but it is a new appearance rather than a new element inside
  an existing one — worth naming in QA rather than discovering.
- **One contrast re-measure for the ledger.** R3's six-theme table was measured on `#1E1A15`; the
  strip's ground is `#14110E`. Every ratio improves, so nothing is gated on it — but the two themes
  R3 recorded at the margin should have their real numbers written down on this ground.
- **`Buy these at Mana Pool ↗` at the desktop strip's narrowest.** 24 characters plus the glyph on
  the leading edge, with the total on the trailing edge. Below the builder's min-width the link
  should wrap before *at Mana Pool* rather than compress the total — same ruling as the card
  modal's row, and it is inherited rather than restated.

## Not carried, and not to be re-opened

Everything in R4-README §6, plus: the strip's placement under the pills, its suppression rule, the
total's derivation, `builder-spine.tsx:391`, the buy tag's exclusion from linking, and the Decklist
tab.

**R1 → R4 status:** R1/R2 are the record only. **R3 remains the spec** for the primitive, the export
footer and the card modal. R4 amends *where the deck-level link lives* and nothing about *what it
looks like*.
