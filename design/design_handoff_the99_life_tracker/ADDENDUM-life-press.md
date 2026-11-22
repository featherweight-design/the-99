# Life tracker addendum: life press = Nudge

Requested by Hugh 2026-11-22: the life halves' press (on main, an 18% accent block held for the whole 2 s window)
isn't right. He compared six options across all six themes on `press-test/life.html` and picked **5 · Nudge**, with
the ±N fading away at save. This replaces addendum R2's cue A (the held half). The strip press is in
ADDENDUM-press-parity.md.

## Nudge, control by control

| | Nudge (the target) | On main now (`panel.tsx`) |
|---|---|---|
| Half, while the finger is down | `--accent` at 10% over the half, in over 80 ms, out over 200 ms. Only while pressed; nothing is held through the 2 s window. Glyph stays `--fg-muted`. | 18% accent block and accent glyph from pointerdown, held until the save, 120 ms fade. |
| Number, each step | Ticks (opacity .7 to 1, 120 ms ease-out) and nudges: a gain starts 5 px above rest, a loss 5 px below, settling over 180 ms ease-out. Every tap and every hold step plays it again. | Ticks once, at the save. |
| ±N while pending | Fades in over 150 ms, rising 4 px. Ink `--success` for a gain, `--danger` for a loss. | Accent ink, no motion. |
| ±N at the save (2 s) | Fades out over 400 ms ease-out, drifting 6 px up. A tap during the fade replaces it at once with the new ±N. | Vanishes. |
| Panel | Nothing. No tint, no pulse (R2's removal stands). Nothing else moves at the save. | Same. |
| Hold to step by ten | Starts after 480 ms, then every 380 ms (P1 values, as tried on the test page). | 450 ms, then 280 ms. |

Reduced motion: no nudge, tick or ±N fades (the ±N just shows and clears); the pressed wash stays, as it is state.
Works on every theme from the theme tokens alone (`--accent`, `--success`, `--danger`, `--fg-muted`).
