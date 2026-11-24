# READINESS · shelf art · 🟡 Yellow (R1, awaiting Hugh on Q1)

- Q1: A (taller strip) or B (art fills the card, recommended). Green once Hugh picks.
- Change is local to `DamageTab` in `src/components/tracker/sheet.tsx`, phone path only; `DamageArt` (tablet, desktop) is untouched. No copy changes.
- B: check contrast of the disabled − at 0 and the commander name over light art; the fade is 88% black at the foot.
- Tests: `sheet.test.tsx` cases read by role/name, not layout; none should change. Re-run the tracker tests in CI.
- `scratch-gen/proposal-*.diff` are working drafts that render the boards, not shipped code.
