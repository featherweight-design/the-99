# Errata — combo awareness (R1)

Engineering notes on the drop. `READINESS.md` is Design's document and is not edited here.

**This package belongs to sub-project 3 (combos and `almostIncluded`), which is not sub-project
1's to audit.** It is moved off `main` so the checkout stays clean; its readiness audit belongs to
whoever owns that sub-project. One item is recorded here because it is about sub-project 1's own
asset and is cheap to state.

## The lemniscate is 16px, not 12px

The package describes *"Round 2's lemniscate at 12px"* and refers to a *"12px glyph floor Round 1
set"*. Both are superseded.

`CARD_FACT_MARK_PX = 16`, and `card-fact-mark.tsx` says so in its own header:

> *"ONE SIZE, EVERYWHERE. The mark is 16x16 on every surface that draws it, and the size is not a
> prop — a per-mount figure is a per-mount drift, and the set shipped at 12, 13, 14 and 16 across
> six mounts, so the same fact read as a different mark depending on which list a player was
> looking at. Ruled by Hugh, 2026-09-21. This supersedes the handoff's 12px floor."*

**Three files carry the old figure, not four**, and the distinction matters because one of them
is already right:

| file | the glyph figure it states |
|---|---|
| `READINESS.md` | 12px, twice — the `ComboClause` line and a "12px glyph floor" attributed to Round 1 |
| `README.md` | 12px, in the glyph spec table and the engineering list |
| `STATES-combo-awareness.md` | *"12px on every host. 16px in the modal block."* — the host figure is stale, the modal one is right |
| `ADDENDUM-modal-block.md` | **16px, correct.** Its other `12px` hits are a font size and a border radius, not the glyph |

An earlier version of this errata listed all four. Corrected after review — an errata that is
itself inaccurate is worse than none, because it is what a reader checks the package against.

**What it changes is not obvious and should not be assumed.** The package sets a 9.5px mono clause
against a 12px glyph and argues the ratio; at 16px that argument needs re-making rather than
re-scaling, and the row heights it implies may move. That is a Design call, not an eng one.

**`READINESS.md` has no cross-reference to this file**, so a reader skimming readiness meets the
stale figure with nothing beside it. Design's files are not edited here, so the note lives on this
side; anyone touching that package should add the pointer.

**The Round 2 dependency itself is sound.** The lemniscate ships with Round 2's verdict block and
this round draws with it rather than defining it, which is the right seam — only the figure is
stale.

## Its data dependency is sub-project 1's, and half of it has landed

Item 3 asks for `{state, partnerName, partnerOracleId}` on three payloads. The combo payload
widening merged as **#820** — `spellbook_variants` now carries the mana, the steps and the
prerequisites, and `ComboRef` carries them on both the assembled and the near-miss reads. The
partner-name shape this package asks for is a different widening and is not yet built.
