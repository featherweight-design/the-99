# Addendum: App loader on the installed desktop app (R1)

**Approved by Hugh 2026-11-15** ("this looks awesome"). Canvas: https://claude.ai/artifact/HdoDDv7E662BN6DdM2GeCf. Brief:
`docs/superpowers/design-briefs/2026-11-15-desktop-app-loader.md` (branch `brief/desktop-app-loader`). Extends the D3 handoff in
this folder's parent (`../README.md`, READINESS Green); where this addendum is silent, D3 and the shipped code stand.

Boards mirror D3's: a playable board at real speed and 4× slower, the keyframe frames, the reduced-motion cut, Home in two other
saved themes, plus a 4× close-up of the landing, a large window and a tablet. Home under the overlay is the real shipped shell
(`NavRail` + `Dashboard`, rendered from `src/` at each window size), not a mock.

## What stays exactly as D3 (locked by the brief)

The gates (installed app, first document load of a session, signed in, normal motion), the mark, the card, the flip, the crown
lights, the glow and bloom, the 1.66 s timeline, Low Sun always, Home rendering underneath, no copy, no switch.

## The calls

1. **Landing: straight into the rail's `rail-62` lockup, with no numeral settle.** The flyer leaves the card at 1216 ms and lands at
   1472 ms on the rail lockup's crown centre, **(30.5, 20)** in the 62 px rail (measured on the rendered `NavRail`), at scale
   **0.1897** (rail-62 draws the crown at 0.813 px per icon unit, 6 / 7.381; the launch mark is 4.285 px per unit at scale 1).
   `icon.svg` *is* the rail-62 lockup (marks.tsx says so, and `icon.test.ts` pins it), so at that scale the flyer's crown and
   numeral sit exactly on the rail's own: the phone's settle (numeral 76.3 px down and 1.2×, for `mobile-header`) is not used on
   desktop. Same easing as the phone (`cubic-bezier(.65,0,.35,1)`); the path is a straight line from the card to the rail's
   top-left. It is a longer trip than the phone's (about 670 px at 1280 × 800) in the same 256 ms; boards `d-f1360` and the 4×
   close-ups show it arriving. The flyer fades 1504 to 1616 ms over the real lockup (boards `d-z1520` and `d-z1660` are
   indistinguishable).
2. **Window sizes: the card stays 260 × 363, centred on the window, at every size.** It is the mark, not layout: the 128 px icon
   it grows from is fixed, and a 1.35× card at 1920 × 1080 (row "Not recommended") reads as a splash screen rather than a card
   being dealt. At 768 wide (the smallest window that draws the rail) the 363 px card still fits a 560 px-tall window.
3. **The start: the 128 px icon, centred, as on the phone.** A desktop window opens plain (at most the manifest's `#14110E`,
   board `d-window`); the loader's first paint is the icon on that same ground, crown centre 33 px above the window's centre. The
   first frame never jumps whether the browser filled the window or not, and the timeline is unchanged from 0 ms.
4. **Home fade-up: the shipped `ll-page` as is.** The ground (covering rail and main) clears 1408 to 1664 ms; `<main>` rises 10 px
   beside the rail; the rail does not move, so the lockup the mark landed on stays put. The rail appears with Home, at the same
   moment as everything else: no early rail, which would draw its lockup beside the flying mark twice.
5. **Tablet follows desktop.** A coarse pointer at `md` and up draws the 88 px labelled rail (`hover: none`), so the landing is
   that rail's lockup: crown centre **(43.5, 20)**, same scale (boards `t-*`, 1180 × 820). The phone keeps its header landing.

## For engineering (sketch; READINESS after approval)

- `launch-detect.ts`: drop the `(pointer: coarse) and (max-width: 767px)` gate. Everything else in the head script stays.
- `globals.css`: the landing becomes CSS variables set by media query, no JS measuring: phone `--ll-land-x: 66.75px;
  --ll-land-y: 24.75px; --ll-land-s: .156` plus the numeral settle; `@media (min-width: 768px)` `--ll-land-x: calc(var(--rail-w) / 2
  - .5px); --ll-land-y: 20px; --ll-land-s: .1897` and `ll-num` to `none` (rail 62: 30.5; touch rail 88: 43.5). `touch-short`
  (≤ 460 px tall) moves the rail's padding to 10 px: crown centre y 16.
- `--ll-cx` / `--ll-cy` already centre the card on any window. Nothing else changes.

## Copy

None.
