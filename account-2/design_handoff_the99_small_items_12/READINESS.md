# Small items 12 · READINESS (R1, Design's draft for engineering's audit)

Verdict: pending Hugh's audit.

## Gaps for engineering

- **G1 · Feed-opened combo sheet.** The feed's combo press opens the combo sheet with no card under it (engineering in flight). The sheet needs the variant's steps, mana, prerequisites and both pieces' art, plus where each copy is (`spare` or `in {deck}`); no deck scope, so no Add. `CardComboSheet` takes a `card` today; the feed path needs a head variant (`.hd2`: eyebrow, title, lead, ✕) in place of `back`/`overCard`.
- **G2 · Symbols in step text.** Steps and Needs carry Spellbook symbols. `{W}`…`{G}`, generic, hybrid and Phyrexian go through `CostPips`; any symbol `CostPips` does not draw (`{T}`, `{Q}`, `{E}`, …) stays as text.
- **G3 · List semantics.** The numbered `ol` keeps `list-style: none` with drawn numerals; add `role="list"` so Safari keeps announcing it as a list. Numerals `aria-hidden`.
- **G4 · Picker over the popover.** The popover closes on a pointerdown outside it; presses inside the picker's modal must not close it. Escape closes the picker first, then the menu.
- **G5 · Saving from the menu.** Reuse Friends' save (`saveFace`) through a shared hook; after the write lands, the shell's face read (`OwnHeaderFace`) must redraw the trigger and both heads without a reload.
- **G6 · Price stamp tests.** `commander-row.test.tsx` assertions about the stamp's place (line end) change to "after the figure, inside its item". Both Discover and the Commanders list take it.

## Copy

DRAFT for `/copy-review`: the feed head's second lead sentence. Everything else is shipped strings.
