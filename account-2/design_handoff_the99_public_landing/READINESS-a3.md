## Addendum A3 (2026-11-11): the hero at tablet widths

**A3 verdict: Green, pending Hugh's approval.** Four boards; README § Addendum A3 has the detail. Classes only, in
`landing.tsx` (`Hero`) and `hero-phone.tsx` (`HeroShot`'s box). No migration, no switch, no copy, nothing new in
`globals.css`. Checked against `origin/main` @f7f2f86.

- **768 to 1023:** the hero grid is one column; the shot (unchanged desktop box) moves under the theme switch, centred.
- **1024 to 1279:** two columns with a 40px gap and right padding; the shot box is centred and scaled with `zoom`
  (0.62 to 1199, 0.8 from 1200). Bound the 0.62 step with `max-[1200px]` (Tailwind sorts `min-[1200px]` before `lg`).
- **Unchanged:** below 768 and from 1280; the section's `md:max-xl:overflow-x-clip` from #2849 stays as a guard.
- **Reduced motion:** nothing new moves; the drift and `.anim-gentle-in` keep their shipped guards.
- **Tests and checks:** CI runs the suite. `feature-acceptance` at 768, 900, 1023, 1024, 1199, 1200, 1279 and 1300,
  signed out: document `scrollWidth` equals the viewport, and the phone frame's box lies inside the hero section. The
  design-review skill before the PR. Six themes are token-only (A3-Themes).
