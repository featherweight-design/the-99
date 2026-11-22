# Life tracker addendum: the ±N over any art (account 1, 2026-11-22)

Canvas (Design type): https://claude.ai/artifact/C4YLoNSi9tsrx7oMb7krdV (Main, Seats, Motion, Contrast).
Status: **Approved by Hugh** (2026-11-22, "This LGTM"), halo at 60% as drawn.

When a player taps or holds their life, a green +N or red −N fades in beside the total, holds for the 2 s commit window
and drifts away at the save (the Nudge press, `ADDENDUM-life-press.md`). #3191 moved the loss ink from `--danger` to
the lighter `--critical-fg`, which clears 4.5:1 on every flat ground, but over light commander art the figure still fell
under 3:1: Clavileño measured 2.7 to 2.9:1 at the iPad (1180×820) and phone (390) widths. Re-measured here on both
printings Hugh supplied, the showcase printing at your seat reaches 2.45:1, and even Sai's dark art dips to 2.61:1 on
its bright thopters at 390. This addendum puts a soft halo
of the theme's own ground under the figure so it reads over any art. Nothing else on the panel changes.

Every frame is the shipped tracker (`src/components/tracker/`, main 14f9519, with #3191's `--critical-fg` loss ink
applied) bundled and run in a browser at the real viewport, with this addendum's change patched in (the whole change is
`scratch-gen/proposal.diff`, which also carries #3191's one-token ink swap so it applies to main). Every contrast figure is measured on the rendered pixels behind the figure (method below).
Fixtures: four seats on `tablet-4-around` / `phone-4-around`: you (Chris), Colin on Ghalta, Peter on Ghoulcaller Gisa,
Dee. Clavileño is the light art: its showcase printing at your near edge (upright) and its extended-art printing at
Dee's end (sideways), cropped from the card images Hugh uploaded. Sai and Gisa are the dark seats.

## Calls

1. **A halo under the figure, on gains and losses alike.** The pending ±N and its fading copy each draw a `::before`
   behind their glyphs: 1 px in from the figure's top and bottom, 3 px past its sides, fully rounded, filled
   `color-mix(in srgb, var(--bg) 60%, transparent)` with `box-shadow: 0 0 10px 7px` in the same mix, so it is flat
   under the glyphs and feathers out about 17 px past them. Existing tokens only: `--bg` for the halo, `--success` (gain)
   and `--critical-fg` (loss) for the inks. No new token, no hex. +N and −N carry the same halo.
2. **It holds 3:1 over any art.** Over a pure white commander art on the brightest panel state (your active seat, art at
   72%), in all six themes, gain and loss, phone and tablet, the figure's worst pixel is **3.55:1** (now 1.85:1). White is
   the brightest pixel art can put behind the figure, so no real art does worse. 60% is the lightest mix that keeps a
   margin (56% measured 3.50, 62% 3.76). Over real art every seat measured, on every device, is **4.38:1 or better**
(now 2.45). Over dark art the halo sinks into the art and is barely visible.
3. **It fades with the figure.** The halo is the figure's own pseudo-element, so it takes the figure's 150 ms rise-in,
   holds while pending, rides the 400 ms drift-and-fade at the save, and is gone with it. Nothing new animates, nothing is
   held after the save, and the 10% press wash (only while pressed) is untouched. Reduced motion: figure and halo show at
   once and clear at once, as the figure does today.
4. **The life total needs nothing new.** The total (`--fg`, 60 px and up, with its shipped `0 2px 12–14px rgba(0,0,0,.6)`
   shadow) measures 3.53:1 or better at its worst pixel even over the white plate at your active seat (Kaldheim; 4.3 to
   4.6 elsewhere), above 3:1 for large text, and 4.58:1 or better over every real art measured. No change.

### Phone, tablet and desktop

One component and one class string draw every seat on every device and in every turn of the seat (upright, sideways,
upside down), so parity is automatic. The Seats board draws phone 390×844 (upright and sideways seats), iPad landscape
1180×820 and portrait 820×1180, and a 1440×900 desktop window (classed as a tablet).

## Options considered (Main board)

| Option | Clavileño, upright, worst pixel | Why not / why |
|---|---|---|
| Now (#3191 ink) | 2.45 | Under 3:1 over light art |
| A · text shadow (`0 0 3px`, `0 1px 2px`, `0 0 8px` in `--bg`) | 2.53 | Darkens only around the strokes; the art between strokes stays, so it can't promise every pixel, and it smears 18 px mono |
| **B · halo (drawn)** | **4.64** | Soft, local, gone with the figure; holds 3:1 over white |
| C · chip (78% `--bg` pill, hard edge) | 5.50 | Reads, but as a badge: a new object in the panel, against the press's light feel |

## Motion

| Part | When | What | Source |
|---|---|---|---|
| Figure + halo in | first step of a run | opacity 0 → 1, rise 4 px, 150 ms ease-out | shipped `life-pending-in` |
| Pending | until 2 s idle | held; a new step changes the text in place and the halo resizes with it | shipped |
| Figure + halo out | the save | opacity 1 → 0, drift 6 px up, 400 ms ease-out | shipped `life-pending-out` |
| A tap during the fade | | the fading copy is replaced at once by the new figure, with its own halo | shipped |
| Reduced motion | | both show and clear at once; the wash stays | `motion-safe:` gating |

## How the contrast is measured

`scratch-gen/measure.mjs`: press each seat (three taps), hide only the glyphs (`color: transparent`, so the halo and the
total's own shadow stay), screenshot the figure's box, and score its computed ink against every pixel there with WCAG 2
relative luminance. Reported: worst pixel, 5th percentile, median, and the share under 3:1. The total is scored the same
way against `--fg`. The white plate is a 626×457 pure white image used as a commander art.

## Boards

| Board | What |
|---|---|
| Main | The worst seat now and drawn (upright and sideways), the three treatments on the same pixels, the five calls |
| Seats | iPad landscape with Clavileño upright and sideways, iPad portrait, phone upright and sideways seats, desktop, four gains, the white plate; zooms with measured contrast |
| Motion | Fade-in frames (0–150 ms), fade-out frames (0–400 ms), reduced motion, timing (on the white plate, where the halo shows best) |
| Contrast | Per seat, per screen: ±N now and drawn, pixels under 3:1, the total; the six-theme white plate sweep |

Files: `*.dc.html` + `canvas.json` (open with the handoff's `../support.js`), `art/lf-*.webp` (2×), `STATES.md`,
`READINESS.md`, `scratch-gen/` (reference only, never import: `build.mjs` bundles the shipped `PlaySurface` with stubs,
`css.mjs` compiles `globals.css`, `measure.mjs` takes the frames and the numbers, `motion.mjs` the paused fade frames,
`prep.py` the crops, `gen.py` the boards, `data.json` every measurement).
