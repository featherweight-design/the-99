# READINESS — The rail head is the mark (R1)

**Self-assessed: 🟢 Green. One thing to sign off, nothing blocking.**

Two files, one new variant, one string. No token, route, data or layout dependency; no new
component; no motion. The mark it renders is already in the codebase and already locked in the
brand sheet.

## Not blocking

- **`<Crowned99>` exists** and `nav.tsx` already imports it for the wide rail and
  `MobileHeader`. This adds a third variant beside `"rail"` and `"mobile-header"`.
- **Colours are tokens** — crown `--accent`, numerals `--fg` — so all six themes are covered
  without a per-theme value. The canvas is drawn in the slate theme because that is what the
  reported screenshot shows.
- **Locked chrome is unaffected.** First-run dims nav items; the head was never part of that and
  still is not.
- **Nothing below the head moves** except a 4px start offset. Five items, 38px, 4px gaps, avatar
  pinned bottom.

## One thing to sign off

1. **23px numerals against the brand sheet's 24px crown-drop floor.** Read here as governing the
   numerals *alone* (the fallback mark), not the numerals *with* the crown — at 23px, with gaps
   derived correctly, the three diamonds resolve. If the floor is read literally instead, the
   answer is **1b (crown only)**, not smaller numerals: below ~20px the digits start to fill in at
   Cinzel 900's weight. Reverse this and nothing else in the handoff changes.

## Called, not asked

2. **The head is not a route.** Making it one is a nav change (Home's slot) dressed as a logo fix;
   drawn as 1c and declined.
3. **`RailDiamond` stays retired.** The refresh's rule — mark once, at the top, never per row —
   is untouched. This handoff only replaces what the head draws.
4. **Rotation arithmetic is spec, not incidental.** `CHROME-rail-mark.md` carries `gap = air +
   0.207 × (w₁ + w₂)`; the same mistake will otherwise reappear wherever the crown is rebuilt at a
   new size.

## Verify after build

- Head measures 32.5×39 in the 62px rail (crown row 12 + 4 + 23), nav block 13px lower than today; three visibly separate diamonds at 100% zoom.
- Screen reader announces **The 99** once, before the Primary nav landmark.
- Accent-only crown: switch themes and confirm the numerals stay `--fg` in all six.
