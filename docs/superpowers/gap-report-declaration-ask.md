# Gap report: the declaration ask (PR 5)

Design-review for Round 3 §A and §B, against `docs/superpowers/design-tables/declaration-surface.md`.
Section E and states S7–S10 are PR 7's and were not verified here.

## Verify pass

Six visual gaps and one state gap.

**Gaps 1–6 are the face pill, and they are Round 2's rather than this round's.** Gap spacing (7 vs
8), right padding (11 vs 12 and 13), the `/` between the two marks, and the type of the `Split`
label and the single chip's name. That markup shipped in #851 and was verified there against Round
2's own handoff, which is the package that owns the verdict's chrome. The declaration canvas
redraws that chrome to set its own content inside it, and the table's own C7 already records that
the canvas is not consistent with what ships for the face (32/34/30px marks against the shipped
26/36). Taking Round 3's redrawing of Round 2's pill would re-open a verified surface on the
authority of a package that is not about it. Not changed. If Design means the pill to move, that
is a Round 2 erratum.

**Gap 7 was real, and is fixed.** Pressing `change` re-asked the range in the section but left
the face on the answer: the declared bracket's single chip and the `permitsBelow` description
stayed above the chips. The table (S2/S3) says the reading returns to the ask. `changing` moved
from `DeclarationSection` into `VerdictBlock`, where the face is drawn, and the section is handed
the reading it should draw. `declaration.test.tsx` asserts the range's face, the split pill and
the absence of the `permitsBelow` line after the press.

## Confirm pass

Gap 7: FIXED. Gaps 1–6: carried, reason above. 0 gaps remain in this PR's scope.

## Found by the contact sheet and the copy pass, not by the table

- **A refused CHANGE drew no notice.** The alert lived in the ask, and a refused change puts the
  previous answer back, which renders the answered line instead. The reader would have seen their
  old choice return with no word about why. The notice now draws in both.
- **The refusal sentence was false in that same case.** `Nothing was declared` is untrue when the
  previous answer stands. It is the house form now, `That did not save. Try again.`, which is true
  either way.

## Not drawn, deliberately

- Frames 1e and 1f: the ask and the lean in one card. `leanFor` fires only on a single bracket and
  the ask only on a range, so the composition is not a producible state.
- The skip, in every place the package still mentions one. There is no skip.
- A focus style is not specified anywhere in the package. Both controls take the app's standard
  `focus-visible` outline rather than none.
