# Life tracker · more commander art in the shelf (account 1, 2026-11-24)

Hugh: "The life tracker on mobile should show more of the commander image in the shelf when possible."

On a phone, `DamageTab` (src/components/tracker/sheet.tsx) draws each commander damage card with a 56 px art strip; on a
sideways seat the card is tall and the rest of it is empty. iPad and desktop already use `DamageArt` (art fills the card
under a fade).

- **A · taller strip.** The strip is 104 px; name and steppers stay on the plain card. `scratch-gen/proposal-A.diff`.
- **B · art fills the card (recommended).** `ArtStrip` covers the whole card (`min-h-[176px]`) under a top and bottom fade;
  the player name sits over the head, each commander's name and stepper over the foot. Partner split is a faint
  `--fg` 18% line. Same card as the iPad. `scratch-gen/proposal-B.diff`.

Canvas: https://claude.ai/artifact/Q7CZ4x9U7KCws3PrPGsVtq (Main, Phone).
Boards: `Main.dc.html` (problem, A vs B on sideways and upright seats, recommendation, Q1), `Phone.dc.html` (2, 3, 4 and 6 seats).

Render: see `scratch-gen/` (build.mjs, css.mjs, shot.mjs with specs-shelf.json, gen.py canvas|repo). Same recipe as the
badge fit handoff.
