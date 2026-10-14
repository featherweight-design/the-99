# READINESS — printed name (R2)

## The one real dependency

**1 · The spec was not in the tree when this was drawn.**
`docs/superpowers/specs/2026-09-09-printed-name-design.md` had not landed. This pass is drawn
against the four locked decisions as the covering note states them, and the §6 items below are
**assumptions, flagged rather than answered silently**. Where the spec and this handoff disagree,
the spec wins and the drawings are what to correct.

## §6 — what this pass had to assume

Each of these is an open item the covering note left to Design. R1 takes a position so the drawing
can exist; none of them is a ruling, and each names what would change if the spec differs.

| Assumed | If the spec differs |
|---|---|
| **The printed name is used verbatim, not normalised.** No case folding, no suffix stripping, no de-duplication against the oracle name. | A normaliser changes nothing visual; it changes which cards hit the *printed* state at all. |
| **Comparison for "is there a printed name" is exact string equality** against the oracle name. | A looser test (punctuation- or case-insensitive) shrinks the printed population and makes the control state even more dominant. No drawing changes. |
| ~~A two-faced card's printed name is the whole `//` string.~~ **Closed in R2: front face alone on rows and tiles, full `printed // printed` in the modal title.** The `//` mark stays driven by the `layout` column (card-surfaces ruling 6). | If the spec wants the whole string on rows, it needs somewhere to put it — a 96px row block and a 132px caption cannot hold one, and locked 3 forbids the second line. |
| **The commander's name on `/commanders/[id]` is out of scope.** The covering note names two surfaces. | If the commander header is in scope it inherits the modal's line spec unchanged; it is the same header shape. |
| **Deck import and the unresolved row are out of scope** — they match on oracle names before a printing exists. | If import should echo the printed name, that is a new surface, not an addendum. |
| **Search matches on the oracle name.** Nothing here changes matching. | If search must also match printed names, that is a query change with no visual consequence on these surfaces. |

## Cleared, with the reason

- ~~No new query, no new prop.~~ **R2: false for the deck route.** `lib/decks/read.ts:196-254` is
  oracle-only, so the deck row and tile need a printing join — real work, and the audit confirmed
  it. **The modal and both collection surfaces remain free**, since they already resolve a printing
  to show the art. Locked 1 still keeps the shape cheap: one join, no new prop threading.
- **No new token and no new hex.** `--fg-body`, `--fg-faint`, `--fg-muted` and the theme's own
  display face. Measured: the oracle line is 8.77:1 on `--surface` in all six themes, the label
  3.37–4.59:1 at the `--fg-faint` floor of 3:1 — the same ratios card-surfaces cleared.
- **Six themes.** Nothing hue-dependent is introduced. The one per-theme check is the display face
  against Plex Sans at 22–29px over 13.5px; Cormorant Garamond and Trirong are the two that could
  read as one voice, and at 600 they do not. Drawn in all six on the canvas.
- **Zero net motion.** The oracle line is present or absent at render — it never appears, expands or
  fades.
- **Card-surfaces reconciles, with one sanctioned exception.** The `$` collapse, the 40px track,
  the 32px/44px tile `✕` target and the 44/52px phone row heights are all held. **R2 amends one
  thing in that handoff's territory: the deck tile's `✕` moves from the caption line to the art
  block's top-left corner** (README call 3, flagged below). R1 also claimed a two-line caption clamp
  was held — there is none in the tree to hold.

## What I want eyes on

**1 · The ✕ moving off the deck tile's caption line is the one thing here I cannot sanction alone.**
It is card-surfaces' geometry, it touches every tile in every deck grid whether or not the card has
a printed name, and it is the difference between a 94px caption and a 132px one. **Tiles stay
equal-height either way** — the control moves into a corner of a fixed-ratio art block, so no height
changes anywhere. If it is refused, the single-line ladder still stands and the deck tile simply
clips `Battle of Olympus` at both widths. **Worth a look at a full deck grid before deciding**,
since it is the change with the widest blast radius in R2 and the only one visible on ordinary
cards.

**2 · Sixteen characters is a short name, and it is the tile — not the row — that has them.**
R3 re-derived the geometry after the audit caught R1 subtracting the row's fixed spend twice: the
desktop row holds **174px / ~27 characters**, not 96px, and no row clips `Battle of Olympus`. The
deck tile caption holds **93–94px / ~16 characters** and does. **Everything the ✕ move buys back
lands on the one surface that needs it** — which is a better argument for call 3 than the one R2
made, and the reason I want it sanctioned rather than dropped.

**3 · Two-faced cards now have a ruling, but no fixture.** Front face on rows and tiles, both faces
in the modal. I could not find a real Secret Lair printing that renames one face of a modal card, so
the rule is drawn from the geometry rather than from a case in the data. **If eng can name one, it
is worth a row in the QA pass** — particularly the half-renamed case, where the modal shows
`Battle of Olympus // Aftermath` and the row shows only the first half.

**4 · R1 asserted things it had not checked, and one of them was its own arithmetic.** The clamp,
the absent tooltip and the `#467` branch were inferred from the card-surfaces handoff rather than
read from the tree. Worse, the 96px desktop figure the whole finding rested on was a double
subtraction that a measurement of R1's own drawing would have caught. **Two rules going forward: no
claim about shipped code without a file and line number, and no derived figure that the drawing
beside it does not measure.**
