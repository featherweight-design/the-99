# Readiness · A2 (self-assessed): Yellow until Hugh rules on call 4

The flow reuses R2d's components as they are. The new work is the gate, the Apply write and reading runs from the deck page.

- **G16 · The gate.** The button needs three things:
  - the deck's precon origin (`readDeckOriginAndStart`)
  - no committed version after v0 (for a linked deck, no committed version at all)
  - a list that still matches v0 (no changes since v0)

  Read on the deck page's loader, so the button paints with the header.
- **G17 · Apply.** A new server action. As one undoable change, it sets the deck's 99 to the result's list, and for a run led by the alternate it also sets the commander (the box's commander goes into the 99). It sits beside Suggested changes v2's apply and returns what the toast's Undo needs. The write is checked against the gate in the same transaction.
- **G18 · Runs from the deck page.** Read `readUpgrades` by the deck's precon, so History is the same list on the precon page and the deck page.
- R2d's G1, G9, G10 and G12 stand. G15 (I own this precon) doesn't apply here, because the deck already exists and its cards are already counted.
- **Open for Hugh:** call 4, hiding the button while the deck has changes since v0.
