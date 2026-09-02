# Gap report — Theme system, Phase 0

**Scope:** the ten surfaces that retire the crab/kaiju character layer and adopt the shared
`Crown` mark. Verified against `design/design_handoff_the99_themes/` (README decisions 6–8,
the canvas `SURFACES` map, and the canvas §G mobile rules).

**Verdict: 0 gaps. Ready to ship.**

## Conflicts resolved

Two places in the handoff disagree about the crown's geometry, and the disagreement had to be
settled before anything could be built.

**Crown sizes — canvas over README.** README decision 6 describes the crown as the mark
`completion-reveal.tsx:78–80` "already draws in brass at 9/13/9px", and calls the loud tone
"`--accent` at 2×". The canvas §G mobile rules instead state, normatively: *"The crown does not
resize. 8/12px quiet and 13/19px loud at both widths."* The canvas's own renderer constants
(`crownSm`, `crownLg`, `crownGap`) match its prose exactly.

Shipped: the canvas values. README's 9/13/9 is a citation of the hand-rolled crown this phase
*replaces*, offered as evidence that the mark was already present — not a specification of the
new one. "At 2×" is a loose adjective in the same sentence; the drawn ratio is ~1.6×. Two
agreeing sources, one of them machine-checkable, beat one descriptive aside.

**Wrapper margin.** The canvas applies a uniform `margin-bottom: 14px` under the crown on every
surface that draws one. Adopted verbatim on the six surfaces where the crown owns its own
vertical spacing. Two surfaces deliberately carry no margin because a neighbour already owns
the gap: the loading screen (its heading has `mt-[24px]`) and the collection review screen
(a horizontal strip with `gap-[12px]`).

## Deliberate deviations

**The pulse keeps its existing keyframes.** The canvas draws `crownPulse` with an opacity floor
of 0.30; the app's shipped `dots` keyframe floors at 0.25. README decision 7 says the crown
absorbs `LoaderDots` with *"same keyframes, same stagger"* — so the existing 0.25 is the
specified behaviour, and the canvas value is a redraw, not a change request.

**`CardFan` is retained on the decks index and the builder empty state.** Both surfaces now
show a card fan above a crown. The handoff's surface table lists neither the fan as kept nor as
retired — it addresses only the character layer, and the fan is not part of it. Removing a mark
the handoff never asked to remove would be an unratified design call, so it stays. Two marks on
one surface is a legitimate question for design; it is raised, not silently answered.

## Verification

- Every crown-geometry row and every per-surface tone assignment checked against the
  implementation, row by row.
- Residue sweep for `kaiju`, `crab`, `LoaderDots`, `anim-bob`, `anim-breathe`,
  `--kaiju-body`, `--celebrate-top`, `--celebrate-bottom` across `src/`. All remaining hits are
  inside `src/components/character/` (kept in git as dead code, per plan) or are comments that
  deliberately narrate what was retired and why.
- Six stale comments that still named the crab or the kaiju were rewritten in the same pass,
  including three outside the ten surfaces.
- `pnpm typecheck && pnpm lint && pnpm test` green (1381 tests); stub-DB production build green.
