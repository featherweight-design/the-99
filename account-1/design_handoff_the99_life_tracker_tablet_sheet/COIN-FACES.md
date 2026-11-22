# Coin faces (R2, account 1, 2026-11-22)

Hugh's review of R1: the addendum LGTM; the coin's faces are only text next to very 3D dice. He asked for Magic-adjacent
imagery on heads and tails, with HEADS / TAILS still curving along the bottom, and a few options to choose from.
Status: **R3, four options drawn for Hugh's pick** (R2 below is superseded). No PR (review first).

Board: `Faces.dc.html` (canvas page "Coin faces · three options (R2)"). The toss, timing, size and reduced motion from
the Coin board are unchanged; only the two faces are redrawn. Each face is one SVG on a 100×100 box over the shipped
`.coin-face` metal: a reeded edge, an inner ring, the emblem engraved in `color-mix(in oklab, var(--accent) 34%, black)`
with a light lip, and the word in Cinzel 700 on the bottom arc (`scratch-gen/coins/faces.mjs`).

| Option | Heads | Tails | Source |
|---|---|---|---|
| A · Day and night | Sun | Moon and two stars | shipped `SunIcon` / `MoonIcon` (tracker icons) |
| B · The crowned 99 | CrownDiamonds over a Cinzel 900 99 | XCIX seal | brand marks (`ui/crown.tsx`, `marks.tsx`) |
| C · Mana | W U B R G as enamel pips | {C} | `public/mana/*.svg` |

No card art: none can be fetched here, and a printing per face would need rights. Renders: `art/ts-F-*.webp`.

## R3 (same day)

Hugh on R2: centre the emblems; HEADS / TAILS touched the ring above; make day and night more Magic-specific; mana pips
without colour, and larger. Changes (`scratch-gen/coins/faces2.mjs`, board `Faces.dc.html` now R3, renders `art/ts-G-*`):

- Every emblem is centred at (50, 50) in an inner ring of r 35; the word has its own band (baseline r 43, Cinzel 700 at
  6.4), clear of the ring.
- Glyphs are Magic's symbols as drawn by the `mana-font` package (1.18.0, `svg/`; symbols (c) Wizards of the Coast).
  A build adds only the glyphs it uses to the app's icons; never import from `design/`.

| Option | Heads | Tails |
|---|---|---|
| A · Day and night | `dfc-day` (Midnight Hunt day marker) | `dfc-night` |
| B · Spark and planeswalker | `dfc-spark` (Origins front) | `dfc-ignite` (planeswalker back) |
| C · Mana, struck pips | W U B R G as discs cut in the metal, symbol standing, pip 23% of the coin | one {C} pip |
| D · Mana, bare symbols | the five symbols engraved, no discs, 21% each | {C} alone |
