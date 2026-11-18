# Flip between decks + custom deck order — R3

Canvas: https://claude.ai/artifact/J1fqAViFdGh9ET3sqKZiWU (R3 row at the bottom: R3Main, R3A, R3E, R3F, R3G, R3Arrange). Same render recipe as r2 (scratch-gen here replaces r2's render.tsx and proposal.diff).

Hugh's R2 feedback (2026-11-18): A is best, but make desktop consistent (drop the desktop crumb/hover card); try placements closer to the thumbs or under the commander image without eating the viewing area; Arrange centred on desktop? how in a folder, or All decks only?

## The strip (one markup, both widths)
`‹ All decks` (folder name inside a folder) on the left; `2 of 5` + two ghost squares on the right (44px phone, 36px desktop). Plain tooltip `Next deck · <name> (→)`. ←/→ on desktop as before.

## Placements (Q1)
- A1 above the art (+52 / +48px).
- **A2 under the art (rec):** phone = first row of `data-spine-under-band`, above the bar (+44px); desktop = row under the band (+48px).
- A3 in the count row (+0): hairline + `2 of 5 ‹ ›` after `99 / 99`; no back link.
- A4 floating pill bottom right (phone above the add bar, desktop corner); covers row ends.

## Arrange (Q2)
Desktop: centred 720px column, Cancel/Done on its heading. In a folder: menu row `Arrange <folder>…` with the folder's count; lists only its decks; one saved order (folder's decks swap among themselves, others keep their places). Rec: allow in folders.
