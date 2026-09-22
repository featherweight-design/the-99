# Gap report: the upgrade path (PR 9)

Design-review for Round 4's §B, states u1–u8, against `docs/superpowers/design-tables/upgrade-path.md`.

## Rulings applied before verifying

The table's §4 lists 22 contradictions and gaps in the package. This is how each one that bears on
the build was settled, all of them engineering's to settle:

- **C4, the marks.** Only sanctioned sizes are drawn: the full form at 26px where the canvas draws
  24 or 26, and the chip form at 22px where it draws 18 or 20. The canvas's hand-drawn marks are
  off-set, and the corrected ones live in a superseded file.
- **C1, the copy module.** Transcribed to `src/lib/copy/upgrade-path.ts` with `ERRATA-eng.md` §2
  applied (`./deck-analysis`, not `@/lib/copy/shared`), `BRACKET_NAMES[target]` in place of
  `bracketPhrase(bracket)` for a single bracket, and `overlap` capitalized.
- **C3, what a heading counts.** Copies to lose plus one per combo, derived in `thingsToGo`.
- **C7, the combo sentence.** `forbidden` at 1 and 2, where two-card combos are not allowed at all;
  `assembled` at 3, the only reason `upgradePath` lists a combo there.
- **C8, the produces tag.** Draws `combo.produces[0]`, Spellbook's own first feature.
- **C11, the blocked item's bold sentence.** A new key, `countRule.canComeOut(n)`.
- **C13, the nearest line.** The whole sentence is the link: one key cannot split into a plain half
  and a linked half.
- **C16, which targets.** Every bracket below the reading's FLOOR, nearest first, never 4 or 5.
  u6's own example (a `[1,2]` deck targeting 2) is therefore unreachable from the lower rung. The
  branch is built and unit-tested, and nothing draws it today.
- **C20, the rung caption.** `To downgrade your deck` replaces `to drop to here`.
- **`CoverageDisclosure` is not reused**, although two audits say it should move out of the
  commanders folder for this. Its copy, its count and its cap are all about role coverage, and
  none of them describe a path. The trigger is a plain disclosure button with `aria-expanded` and
  `aria-controls`.
- **The chips** are `aria-pressed` buttons in a named group. The package specifies no keyboard
  model, and three buttons are reachable without roving focus.

## Verify pass

6 visual gaps, 0 state gaps. All six were real and all six are fixed:

1. **The fact marks were mounted bare.** Every mark is now wrapped in `FactTooltip` and the combo
   glyph is `ComboMark`, naming the card's partner. This also failed `fact-mark-parity.test.ts`,
   which requires every mount to carry its hover.
2. **Forced names drew at 400 and 12.5px inside a 600, 13px sentence.** They take the sentence's
   weight and size now.
3. **Forced names' marks** sit in their own wrapper, 5px from the name, 4px apart, and nudged -3px
   to the baseline.
4. **The combo pair row** gained its 5px top margin on desktop.
5. **The satisfied panel** takes its own 15px by 17px padding.
6. **The blocked panel** takes its own 12px gap on desktop.

## Confirm pass

Each of the six was checked against the code after the fix. The desktop contact sheet at Core
shows gaps 2 and 3, and `fact-mark-parity.test.ts` passes. `probe:upgrade-path` passes at both
widths after the fixes. 0 gaps remain.

## Not photographed

u6 cannot be reached from the rung (see C16). u8, both halves of a combo in the command zone, is
covered by `upgrade-path.test.tsx`. The contact sheet carries no fixture for it.
