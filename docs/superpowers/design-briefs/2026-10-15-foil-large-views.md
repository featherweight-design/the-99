# Brief: the foil film in the large views

2026-10-15. This follows the R1 foil treatment (`design/design_handoff_the99_foil_treatment/`, audited GREEN and merged
as #1776; the build is #1784). R1 put a still film over the art of TILES and left the large views as its G4 follow-up:
card details' main faces, the zoom, the hover preview and the phone peek. Hugh wants those now.

This is cosmetic, so it gets no About entry (decided below). It builds on R1's decisions rather than reopening them.

## What R1 shipped (the starting point)

- **The film:** a static 115° gradient on a `::before` over the art. Foil is iridescent: pink, gold, white, mint, blue
  and violet stops at 0.14 to 0.26 alpha. Etched is a cooler, flatter silver band at 0.10 to 0.22. It is CSS only, with
  no filter, no blend mode and no image.
- **The band:** a white `::after` that sweeps once (640ms, `--motion-ease`) on hover or keyboard focus. It exists only
  under `(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)`, so phones never draw it.
- **Arrival:** the film waits for the art. It is held at `opacity: 0` while the img has no source, has no arrival mark
  yet (before hydration), is `pending`, or `failed`. It fades in with the art's own `art-in` (300ms) under
  no-preference.
- **Reduced transparency:** the gradient gives way to a 2px inset ring in `--fg-muted`. **Forced colors:** no film.
- **Rules:** only real copies (never "this printing exists in foil"), only over the printing's own art (never a
  representative's or the oracle-level picture), and mixed holdings draw nothing on a tile (G8).

## The large surfaces, as built

All four live in `components/cards/card-modal.tsx` unless noted.

| Surface | How the art is drawn | Size |
|---|---|---|
| Card details, main face (front and back) | A CSS `background-image` on the face box (`frontStyle` / `backStyle`), which turns for a flip. It is not an `<img>`, so it carries **no `data-arrival` mark** | about 300 to 360px wide on desktop, the band's `--card-w` on a phone |
| The zoom | A layer inside the details dialog, never a dialog of its own. It draws the shown face large, with a wash behind it (`zoomWashStyle`) and a caption naming the printing | close to the viewport height |
| The hover preview | `ui/preview-button.tsx`, used by Collection rows, read rows, coverage and the benchmark ledger: a floating card on pointer rest | about 250px |
| The phone peek | The neighbors either side of the phone carousel (`PhoneHero`), at 236/320 of the card's width, drawn with `ArtLayer` | partial, at the band's edges |

**Earlier ruling, which binds this brief:** art the reader asked for shows instantly. The details face is drawn as a
background exactly so it never waits on a fade, and the film must not delay it either. The film may arrive with or
after the art, never hold it back. (R1's arrival hold works on an `<img>`'s mark. A background has no mark, so the large
views need their own answer: see open question 5.)

## How card details knows the copy is foil

R1's tile rules carry over. Details needs them for the printing it is SHOWING, which can differ from the tile's.

- **From a deck:** the deck's held pick, else the Collection's pick (R1's G5, "the drawn printing"). Foil when every
  owned copy of that printing is foil (or etched), and only over its own art. This is the same chain details already
  uses to choose the face (`deckPrintingPicks`, `withDeckPick`).
- **From the Collection:** the printing the card resolves to (its preference, else the first with art), using that
  printing's `finishes`. Details already holds every owned printing with its finish counts (`BrowsePrinting.finishes`,
  e.g. `{nonfoil: 3, foil: 1}`).
- **From a precon's open view:** the edition shown. A Collector's Edition card is foil (`printedFoil`, 100 of 100 on
  every MSC CE box). Today the precon view opens details on the card, not on the box's printing; whether details shows
  the box's printing and its finish is open question 6.
- **Unowned cards** (a suggestion, a commander page, a card you do not hold): never.

**The picker.** Details' printing picker (`printing-region.tsx`) already lists owned printings with their finish line
(`×3 · 1 foil`, `×2 foil`) and filters by finish (all, foil, nonfoil; etched counts as foil). A printing held in both
finishes is ONE tile there, as it is on the grid. Picking a printing moves the face, and the film has to follow the
pick, as R1's `cardArt` already does on tiles.

## Open for Design

1. **Intensity at size.** R1's alphas were tuned for a 115 to 181px tile. At 300px and up, the same gradient may read
   as a wash over the art. Keep R1's film, scale it down, or draw a richer large-size film (more stops, a second layer)?
   The zoom is the largest drawing in the app.
2. **Motion at size.** Desktop can afford more on one large card than on a 200-tile grid. Options: R1's one-shot band
   on hover; a band that follows the pointer across the face; a slow loop while details is open (one element, so cheap).
3. **Tilt on desktop.** A slight 3D tilt toward the pointer, with the film shifting angle, as a foil reads in hand. Only
   one card is open, so a per-element transform is affordable, but the face also turns for a flip (row 4.10's turn).
   Does tilt compose with the flip, or pause during it? And how does it end when the pointer leaves?
4. **The phone.** No hover. Static film only, a band on open, or a band that follows the sheet's drag (direct
   manipulation, which reduced motion still allows)? Device tilt needs iOS's motion permission prompt, which R1 ruled
   out for tiles. Rule it in or out here.
5. **Arrival on a background face.** The face has no `data-arrival`. Either the film draws at once with the face
   (simplest, and correct for cached art, which is most opens after a tile press), or it waits for the face's bytes
   with its own small fade. Either way the face itself must not wait.
6. **Precons in details.** Show the box's printing and its foil on details opened from a CE's open view, or keep
   details on the card's own resolution there?
7. **The peek and the hover preview.** These are mid-size. Do they get the film at all, R1's tile film, or the large
   one? The peek is drawn by `ArtLayer` and the preview by its own img.
8. **The flip.** The back face of a foil double-faced printing is foil too. Does the film ride both faces through the
   turn, or appear on the face once it settles?
9. **A mixed holding in details.** The tile draws nothing for a mixed holding. Details shows one printing, and the
   finish line says `×3 · 1 foil`. Film, no film, or a film only while the picker's finish filter is set to foil?

## Locked (do not reopen)

- **Only real copies, only over that printing's own art.** These are R1's rules, carried over.
- **No new image downloads.** CSS over the art already loaded.
- **The face never waits for the film.** Art the reader asked for shows instantly.
- **Reduced motion is static.** Any band, loop or tilt stops; the film still draws.
- **Reduced transparency and forced colors** follow R1: the inset ring, and no film.
- **No change to what details says.** The finish line, the picker captions and the zoom caption stay as they are.
- **No per-frame JavaScript.** A pointer-following band or tilt may set CSS custom properties on pointer events, but
  never runs a rAF loop while idle.

## States to draw

- Details from a deck: a foil card at rest, desktop and phone, on a dark and a light theme.
- The same card hovered on desktop (the band, tilt or follow, whichever is chosen).
- An etched card in details.
- A mixed holding (`×3 · 1 foil`) in details.
- Picking a plain printing of a foil card: the film leaves with the face.
- The zoom on a foil card, both faces of a double-faced foil printing, and the turn between them.
- The hover preview of a foil card (Collection rows).
- The phone peek, with a foil neighbor.
- A CE card from a precon's open view, if open question 6 says details shows the box.
- Reduced motion: static.
- Reduced transparency: the ring.
- Forced colors: no film.
- A face with no art of its own (a representative's or the oracle-level picture): no film.
- A cold open where the face's bytes are still arriving (open question 5).

## About entry

**None.** This restyles views the reader already knows. It is the card-captions case on record (Hugh, 2026-09-15), the
same call R1 made. Hugh may overrule.
