# Gap report: Social R2 PR 8a, friends with a spare in the stand-ins modal

Property table: `docs/superpowers/design-tables/social-r2-spares-modal.md` (Agent 1, design files only). Agent 2
(verify) checked every row against `friend-spares.tsx`, the `StandInsSheet` function, `face.tsx`, `spareCopy` and
`ModalChrome`, under the engineering calls d9 approved (most spares first, the title empty while a read is out, a
failed read counted as none, the shipped `ModalChrome` surface at 640, Intl "and" for several pods, the board's dashed
`.grp.new` outline an annotation).

**VERDICT: 3 visual gaps, 0 state gaps.** All nine states are reachable: switch off, both reads loading, spares in
with stand-ins loading, stand-ins in with spares loading, O1, O2/S3, O3, a failed spares read, and a failed stand-ins
read with spares.

## Gaps

1. Foot line top margin 12px vs `.nt`'s 4px.
2. Foot line height 1.55 vs `.nt`'s 1.5.
3. Space above the section head: the sheet body's gap, 12px at phone and 14px from md, vs the board's 12px.
4. (Not counted) G7's commander image focus on the face: `Face` has no focus, and nothing in `src/` implements one.

## Resolution (author, after Agent 2)

1. **FIXED**: `mt-[4px]`. (`.mfoot`, 12px / 1.55, is a different class on the board; the foot line is `p.nt`, read
   from both R3 boards.)
2. **FIXED**: `leading-[1.5]`.
3. **Kept.** The gap is the stand-ins sheet's own between every block (the Replacing box, the lead, the groups), so the
   section sits in the shipped rhythm; a section-only override would make it the one block spaced differently.
4. **Out of scope.** Focus is app-wide (every `Face`, R1's included) and no reader of it exists; it is a follow-up for
   the face component, not this modal.

Agent 3 (confirm) is the author's re-check of items 1 and 2: FIXED. 0 gaps remain in scope.
