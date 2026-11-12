# Readiness · A3 R1 (self-assessed): Green for design; G19 to G21 are for engineering

The close reuses SocialModal's bare ✕ and the marks reuse `CardFactMark`, `ComboGlyph` and `MarkKey` as they are. The new work is data on the panel and one pulse.

- **G19 · Facts on the panel's cards.** `PanelCard` (`src/lib/precons/upgrade/run.ts`) carries no facts today. Add the four card facts (the catalog's `game_changer` and the classifiers behind `CardFactMark`) for every cut, add and commander option, read with the panel.
- **G20 · Combo partners after the swaps.** For each cut and add, whether it has a two-card combo partner in the deck as it would stand after the run's swaps. That's the deck row's `comboPartner`, worked out on the swapped list rather than the box's, and kept on the stored run so a past result in History draws the marks it had.
- **G21 · The pulse when a run lands.** `useUpgradeRun` already watches a pending run. When it settles to done while the flow is closed, the precon page's entry and the deck page's band replay `useLinePulse` (twice, then still; none under reduced motion).
- **Close:** delete the `hidden … md:flex` plated ✕ in `upgrade-flow.tsx` and draw SocialModal's bare ✕ in its place at both widths, `aria-label` `Close`. Remove the intro's `Not now`, the Wait's `Back` and History's `Close` from their feet; the press on its own takes the full width on a phone.
- **Ruled:** Hugh approved R1 as drawn (2026-11-12), so calls 6 and 7 stand: a run that fails while closed opens on the intro, and tutors are marked on the swaps.
