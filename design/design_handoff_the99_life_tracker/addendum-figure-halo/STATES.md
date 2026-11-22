# States · the ±N halo

One component (`Panel` in `src/components/tracker/panel.tsx`) draws every seat on phone, tablet and desktop, in every
seat turn, so every row holds on every device.

## The figure

| State | Figure | Halo | Board |
|---|---|---|---|
| No pending change | none | none | — |
| First step of a run (tap, or a hold's first step) | fades in, 150 ms, rising 4 px | the figure's `::before`; fades in with it | Motion, in |
| Later steps (tap or hold repeat) | text changes in place (−1, −2, −3; −10, −20) | resizes with the text; no replay | Seats |
| Pending loss | `--critical-fg` | 60% `--bg` pool, feathered | Seats, Main |
| Pending gain | `--success` | same halo | Seats, gains |
| A run that crosses zero (−2 then +3 → +1) | ink swaps with the sign | same halo throughout | rule only |
| The save (2 s idle) | the held `aria-hidden` copy drifts 6 px up and fades over 400 ms | fades with it | Motion, out |
| A tap during the fade | the fading copy is replaced at once by the new figure | the new figure's halo | rule only |
| Reduced motion | shows at once, clears at the save | shows and clears with it | Motion, reduced |
| Over dark art | 2.6 to 4.5:1 now (Sai's bright thopters fail at 390) | barely visible against the art; 4.38:1 or better | Seats, zooms |
| Over light art (Clavileño) | under 3:1 now | holds it at 3:1 or better | Main, Seats |
| Over any art (white plate, active seat) | 1.85:1 now | 3.55:1 worst, all six themes | Contrast |
| Seat turned (sideways, upside down) | turns with the seat (shipped) | turns with it | Seats |
| Seat out (flipped) | no figure (the half is disabled) | none | — |
| Partner pair (split art) | unchanged position | same halo; may straddle the seam, which it darkens like any art | rule only |
| Panel without art (radial ground) | unchanged | sits on `--elevated` / `--surface`; near invisible | rule only |

## Unchanged

| Part | State |
|---|---|
| Life total | `--fg` with its shipped shadow; no halo (3.53:1 worst over white, 4.58:1 or better over real art) |
| Press wash | 10% `--accent` over the half only while pressed, 80 ms in, 200 ms out |
| Number tick and nudge | every step, shipped |
| Hold timing | 480 ms, then every 380 ms |
| Commit window | 2 s (`COMMIT_MS`) |
