# Life tracker addendum: What's what (account 1, 2026-11-22)

Canvas (Design type): https://claude.ai/artifact/Kued8EctgsJGbEcsa7TKnp (Main, Tablet, Phone). design-assets: account-1/design_handoff_the99_life_tracker_whats_what/ (3290941).
Status: **APPROVED by Hugh 2026-11-22** (overlay; faces the foot, no ↻; "What's what", copy reviewed during the build).

Players don't always know what the strip's icons and the panel's controls mean. This draws a guide that labels each
control in place over the board, shown once the first time the tracker opens on a device and kept in the Menu (⋯).
Every frame is the shipped tracker (`src/components/tracker/`, main 4c987a8) bundled and rendered at the real viewport,
with the guide drawn over it from the real controls' rects (`scratch-gen/overlay.html`). Fixtures: four seats, you
(Chris) play Sai; Colin Ghalta, Peter Giada, Max Gisa. The spine keeps the shipped SunIcon/MoonIcon.

Builds on: the life tracker handoff (strip, panels, Menu M1), Discovery R1 (the moment bubble's surface and halo,
arrival +600 ms) and Discovery R3 (the tour's 66% spotlight scrim, inert board, bare ✕ + Esc).

## Calls

1. **In place, over the board (option A).** A 66% scrim over the whole tracker with a cutout around each control,
   ringed in the halo (2px accent at 75%, 6px at 20%). Each label is the R1 bubble surface: `--elevated`, 1px
   `--border-strong`, radius 10, shadow `0 12 30` at 45%, the 6px accent diamond, the name in `--fg` semibold, one line
   in `--fg-body` (14/13px tablet, 13/12px phone). A 1.5px accent leader at 80% runs from the label's nearest edge to the
   cutout and ends in a 3px dot. All at once, one screen, no steps. Option B (an icon list in a modal) is drawn on Main
   for comparison only.
2. **What it labels.** Round, Monarch, Initiative, Day and night, Dice, Undo, Menu; on the foot panel (yours): Life (the
   − and + halves, both lit, one label), End turn (wherever it shows), your sheet (the chevron), the badge row when it
   has any badge. The header card: "What's what" / "Every panel works like yours. Tap anywhere to go back to the game."
3. **Once, on first open.** When play first appears (after Start, once the first-player roll has landed) +600 ms. A
   per-device flag in local storage (the tracker keeps nothing on the server). Spent once shown; resume, Rematch and
   later games never show it again.
4. **Then from the Menu.** A first row, **What's what**, above Back to the table, in the shipped row (44px circle with a
   ? icon, name, line "What each button and badge does."). It takes the Menu's open focus. Pressing it closes the Menu
   and opens the guide. No ? joins the strip.
5. **Closing.** Bare ✕ on the header card (44px), a tap anywhere, Esc. The board is inert while it shows (lit controls
   too), so a closing tap never changes a life total. In 200 ms fade (`--motion-ease-out`), out 140 ms
   (`--motion-exit-quick`); reduced motion: no fade.
6. **Placement.** Faces the screen's foot, as Setup and the Menu do. Strip labels sit on the side away from the foot
   panel: a row above the strip on a tablet; two columns either side of the phone's column, alternating. The foot
   panel's labels sit inside it. Labels never cover their own control or another's cutout.

## Decided (Hugh, 2026-11-22)

- **Q1 · Overlay** (option A). B stays on Main for the record only; don't build it.
- **Q2 · Faces the screen's foot.** No ↻ to turn it to the far edge.
- **Q3 · "What's what".** Every line in `copy strings.ts` is a placeholder that goes through `/copy-review` during the
  build. Keep it plain and informational, not clever.

## Not drawn

Every layout (L1–L5, upright tablet, 5–6 seats); the rule in call 6 places them. A partner panel (the halves stay
one Life label). Desktop (classed as a tablet; same as T1).

## Boards

| Board | What |
|---|---|
| Main | A (chosen) vs B mid-game on iPad, the six calls, the decisions |
| Tablet | T1 first open (round 1), T2 the Menu with What's what, T3 from the Menu mid-game (badges) |
| Phone | P1 first open, P2 the Menu |

Files: `*.dc.html` + `canvas.json` (open with the handoff's `../support.js`), `STATES.md`, `READINESS.md`, `art/ww-*.webp` (2×), `copy strings.ts`,
`scratch-gen/` (reference only, never import): `build.mjs` + `entry.tsx` bundle the shipped `PlaySurface`, `css.mjs`
compiles `globals.css`, `shot.mjs` + `mkspecs.py` (positions and copy) take the frames, `overlay.html` draws the
guide, `menu.js` the Menu row, `modal.js` option B.
