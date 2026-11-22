# Coin faces (R2, account 1, 2026-11-22)

Hugh's review of R1: the addendum LGTM; the coin's faces are only text next to very 3D dice. He asked for Magic-adjacent
imagery on heads and tails, with HEADS / TAILS still curving along the bottom, and a few options to choose from.
Status: **three options drawn for Hugh's pick.** No PR (review first).

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
