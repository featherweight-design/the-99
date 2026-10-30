# STATES — Foil treatment (R1)

Every tile surface that draws card art, by condition. "Film" is the ring span's `::before`; "band" is its `::after`.

| # | Condition | Key | Desktop | Phone |
|---|---|---|---|---|
| 1 | Every owned copy of the drawn printing is foil | `data-foil="foil"` | film | film |
| 2 | Same, hovered or keyboard-focused | `:is(a,button):is(:hover,:focus-visible)` · fine pointer | film + one 640ms band | n/a |
| 3 | Every owned copy etched | `data-foil="etched"` | silver film | silver film |
| 4 | Same, hovered | as 2 | silver film + band | n/a |
| 5 | Mixed finishes (`×3 · 1 foil`; foil + etched; a deck pin owned in both) | no `data-foil` | plain | plain |
| 6 | Art not yet requested or on its way | `img:not([src])`, `data-arrival="pending"` | no film, sunken ground | same |
| 7 | Art landing | `data-arrival="in"` | film fades in with the art, 300ms | same |
| 8 | Art cached or painted before hydration | `data-arrival="done"` / none | film at once | same |
| 9 | No art (`no art on file`) | no img; don't set `data-foil` | plain text tile | same |
| 10 | Art failed to load | today `in`; proposed `failed` (G2) | proposed: no film | same |
| 11 | Pin no longer foil-only, or no owned copy of the drawn printing | rule fails | plain | plain |
| 12 | `prefers-reduced-motion: reduce` | — | film, no fade, no band | film, no fade |
| 13 | `prefers-reduced-transparency: reduce` | — | no film; solid 2px `--fg-muted` inner edge | same |
| 14 | `forced-colors: active` | — | no film; system frame; art stays | same |
| 15 | Token tile | never this round | plain | plain |
| 16 | Suggestion tile, precon box tile | never | plain | plain |
| 17 | Card details, zoom, hover preview | out of scope (G4) | as main | as main |

Surfaces: deck Card view (`deck-card-tile.tsx`), Collection grid (`grid-view.tsx`), precon open view and its dashed basic
tile (`read-only-card-tile.tsx`). All six themes: identical film; only the frame around it changes.
