# Readiness: App loader on the installed desktop app (addendum R1)

**Verdict: Green.** Approved by Hugh 2026-11-15. One small UI PR (S): no migration, no new copy, no switch (the loader is
gated already; a switch only if engineering sees a plausible regression). Extends `../READINESS.md` (D3, Green); checked
against `origin/main` and the shipped loader (`launch-loader.tsx`, `launch-detect.ts`, `globals.css` § App loader).

## For engineering

- **Gate.** `LAUNCH_DETECT` drops the `(pointer: coarse) and (max-width: 767px)` line. Standalone, first load of the session,
  signed in, normal motion stay exactly as they are. Update the head script's doc comment and `launch-detect.test.ts` (a
  desktop standalone window and a tablet now qualify).
- **Landing, by media query (no JS measuring).** Replace the literal landing in `@keyframes ll-lift` with variables:
  - phone (default): `--ll-land-x: 66.75px; --ll-land-y: 24.75px; --ll-land-s: 0.156`, and `ll-num` as shipped.
  - `@media (min-width: 768px)` (the breakpoint that draws the rail): `--ll-land-x: calc(var(--rail-w) / 2 - 0.5px)`
    (30.5 on the 62 px rail, 43.5 on the 88 px touch rail, both measured on the rendered `NavRail`), `--ll-land-y: 20px`
    (16px under `touch-short`, whose rail padding is 10), `--ll-land-s: 0.1897`, and the numeral settle off (`.ll-num`
    keeps `transform: none`): `icon.svg` is the rail-62 lockup, so the flyer's numeral already sits on the rail's.
- **Card and start.** Unchanged: `--ll-cx` / `--ll-cy` centre the 260×363 card and the 128 px icon on any window. The card does
  not scale with the window (Hugh's approval of R1's call 2).
- **Home.** Unchanged: the ground covers rail and main, `ll-page` lifts `<main>` only, so the rail does not move.
- **Tests.** Unit-test the gate (standalone × width × pointer × flag × reduced motion). Don't test the timeline.
- **About.** No entry.

## Calls taken (R1, approved)

1. Straight flight into the rail lockup, same easing and window (1216–1472 ms), no numeral settle.
2. Card fixed at 260×363 at every window size.
3. Start from the 128 px icon, centred, as on the phone.
4. Rail arrives with Home (ground fade 1408–1664 ms); only `<main>` rises.
5. Tablet (touch, `md` and up) follows desktop, landing in the 88 px rail's lockup.
