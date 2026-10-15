# Design Property Table — Foil treatment

Source: `design/design_handoff_the99_foil_treatment/` (README.md, STATES-foil-treatment.md, INDEX.md, READINESS.md,
READINESS-r1-audit.md, `foil-treatment · copy strings.ts`). The audit's rulings amend the handoff and are folded in below,
each marked **(audit)**.

**Mobile vs Desktop is a capability split, not a width breakpoint.** "Desktop" means
`(hover: hover) and (pointer: fine)`; "Mobile" means any device that does not match it (phones, touch). No width media
query is involved anywhere in this design. Rules that apply under every capability are written in both columns.

## Component: Ring span (the art tile's existing overlay span)

### Element: the span itself

| Property | Mobile | Desktop |
|---|---|---|
| Element | the existing ring span; no new element | same |
| Markup | `<span aria-hidden data-foil={finish ?? undefined} className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25)]" />` | same |
| `data-foil` values | `"foil"` \| `"etched"`; attribute absent otherwise | same |
| `overflow` (when `[data-foil]`) | `hidden` | `hidden` |
| Border radius | inherits the art clip (`rounded-[inherit]`, inside the art box's `overflow: hidden`) | same |
| Radius check (lock ≥ 3.1% of tile width) | 5.2% of 173px phone deck tile; 7.8% of 115px Collection 3-up tile | 5.0% of 181px desktop tile |
| Shell / art-foot radius quoted | shell 9/10px, art foot `max(9px, 3.4cqw)` | same |
| Filter / backdrop-filter / blend mode / mask / `will-change` / image | — (explicitly none) | — (explicitly none) |
| New tokens | — (none) | — (none) |
| Strings on the tile | unchanged; no string added or moved | same |
| CSS location | one block in `globals.css`, beside the art-arrival rules | same |
| CSS layering | **(audit)** block must be UNLAYERED so its reduced-transparency `box-shadow` beats the Tailwind `shadow-[…]` utility (Tailwind 4 utilities are layered) | same |

### Element: `::before` (the film)

| Property | Mobile | Desktop |
|---|---|---|
| `content` | `""` | `""` |
| `position` | `absolute` | `absolute` |
| `inset` | `0` | `0` |
| `border-radius` | `inherit` | `inherit` |
| Background, `data-foil="foil"` | `linear-gradient(115deg, rgb(255 255 255 / 0) 8%, rgb(255 110 180 / .16) 22%, rgb(255 220 120 / .16) 32%, rgb(255 255 255 / .26) 39%, rgb(130 240 210 / .16) 47%, rgb(120 170 255 / .16) 60%, rgb(200 130 255 / .14) 74%, rgb(255 255 255 / 0) 90%)` | same |
| Background, `data-foil="etched"` | `linear-gradient(115deg, rgb(214 226 240 / 0) 12%, rgb(214 226 240 / .10) 30%, rgb(236 243 250 / .22) 42%, rgb(214 226 240 / .10) 54%, rgb(214 226 240 / 0) 74%)` | same |
| Motion at rest | none (static; no layer, rasterised with its tile) | none |
| Per-theme variation | none; one recipe in all six themes (amonkhet, kamigawa, ixalan, phyrexia, eldraine, kaldheim) | same |
| Etched kept | **(audit G6)** yes, keep | yes |

### Element: `::after` (the band)

| Property | Mobile | Desktop |
|---|---|---|
| Exists | — (never drawn; phones never create `::after`) | only under `@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)` |
| `content` | — | `""` |
| `position` | — | `absolute` |
| `inset` | — | `0` |
| `border-radius` | — | `inherit` |
| Resting `transform` | — | `translateX(-100%)` (off the tile) |
| Background | — | `linear-gradient(105deg, rgb(255 255 255 / 0) 30%, rgb(255 255 255 / .42) 50%, rgb(255 255 255 / 0) 70%)` |
| Trigger | — | `:is(a, button):is(:hover, :focus-visible) [data-foil]::after` (the tile's press) |
| Animation | — | `foil-sweep calc(var(--motion-duration) * 2) var(--motion-ease)` |
| Keyframes | — | `@keyframes foil-sweep { from { transform: translateX(-100%); } to { transform: translateX(100%); } }` |
| Duration | — | 640ms (`--motion-duration` 320ms × 2) |
| Delay | — | 0 |
| Curve | — | ease-in-out (`--motion-ease`) |
| Iterations | — | one sweep, then rests |
| Animated property | — | `transform` only |
| Pointer leaves mid-sweep | — | band drops back off the tile instantly; no reverse (G3 accepted) |
| Tilt / pointer-following | — | — (explicitly none) |
| Scope | — | only the tile under the pointer (or focused) animates |
| Reduced-motion list | — | no entry needed; add a comment in the reduced-motion list pointing at this block |

### Element: opacity hold and fade-in (on `[data-foil]`, keyed off the sibling img)

| Property | Mobile | Desktop |
|---|---|---|
| Hold while art not requested | `img:not([src]) ~ [data-foil] { opacity: 0 }` | same |
| Hold while art pending | `img[data-arrival="pending"] ~ [data-foil] { opacity: 0 }`, under either motion preference (the audit's no-preference scope was reversed at build; see the audit) | same |
| Hold on failed art | **(audit G2)** `img[data-arrival="failed"] ~ [data-foil] { opacity: 0 }`; `armArtArrival` marks an errored image `failed` (was `in`) | same |
| Fade-in on landing | `@media (prefers-reduced-motion: no-preference) { img[data-arrival="in"] ~ [data-foil] { animation: art-in var(--motion-fade) var(--motion-ease); } }` | same |
| Fade duration / curve | 300ms (`--motion-fade`), ease-in-out (`--motion-ease`), delay 0; the art's own `art-in` | same |
| `data-arrival="done"` | film at once, no fade | same |
| No mark (art the server drew, before hydration) | film held at `opacity: 0` until the image is armed (set at build, after round 1 of review) | same |
| Reduced motion | no fade; film appears with the art | same |

### Element: reduced transparency / forced colors

| Property | Mobile | Desktop |
|---|---|---|
| `prefers-reduced-transparency: reduce`, pseudo-elements | `[data-foil]::before, [data-foil]::after { display: none; }` | same |
| `prefers-reduced-transparency: reduce`, span edge | `[data-foil] { box-shadow: inset 0 0 0 2px var(--fg-muted); }` (opaque, existing token) | same |
| `forced-colors: active` | `[data-foil]::before, [data-foil]::after { display: none; }`; system frame; art stays | same |

## Component: Surfaces that set `data-foil`

| Surface | Component | Sets `data-foil` when | Mobile | Desktop |
|---|---|---|---|---|
| Deck Card view | `decks/deck-card-tile.tsx` | the deck's resolved (drawn) printing (pick → Collection pick → default) is owned, and every owned copy of it is foil (or every one etched). **(audit G5)** drawn printing, not only the pin, accepted | film | film + band |
| Collection grid | `collection/grid-view.tsx` | the printing the tile draws has `finishes` with only `foil` (or only `etched`) above zero | film | film + band |
| Precon open view | `decks/read-only-card-tile.tsx` | `card.printedFoil` (`foil > 0 && foil === quantity`) | film | film + band |
| Precon basic land tile (dashed tile at foot of Lands) | `decks/read-only-card-tile.tsx` | its printing is foil | film | film + band |
| Tokens | `decks/token-tile.tsx` | never this round (`token_printing_holdings` records no finish); span untouched | plain | plain |
| Suggestions | `suggestion-tile.tsx` | never (locked) | plain | plain |
| Precon box tiles on `/precons` | — | never (a box is not a copy) | plain | plain |
| Card details, zoom, hover preview | — | out of scope (G4); built in R2, below | as main | as main |

### Rules shared by every surface

| Rule | Value |
|---|---|
| Only real copies | from OWNED finishes only; never a suggestion, an unowned commander, a draft the player does not hold, or a printing that merely exists in foil |
| Owned at least one | the player owns at least one copy of the drawn printing |
| All-foil | every owned copy foil → `"foil"`; every owned copy etched → `"etched"` |
| Mixed | foil + nonfoil, or foil + etched → no `data-foil`; no partial film |
| Grid cue for mixed | **(audit G8)** none; the count stays in card details (`×3 · 1 foil`) |
| Only over art | no img (`no art on file`) → do not set `data-foil` |
| Deck finish read | a finish read beside `selectCollectionRows` in `lib/decks/printings.ts`; no schema change |

## Copy

| Key | Value |
|---|---|
| `foilTreatmentCopy` | `{}` (no strings). Existing foil words untouched: `collection.ts` `entryQtyAllFoil` / `entryQtyMixed`; `precons.ts` `open.edition.foil` / `collectorNote` |

## About

| Property | Value |
|---|---|
| About entry | — (none; cosmetic, card-captions precedent) |
| `ABOUT_VERSION` bump | — (none) |

## State Coverage — Foil treatment

| State | Triggering condition | Component rendered | Key props required |
|---|---|---|---|
| 1 Foil at rest | every owned copy of the drawn printing is foil | ring span `::before` foil film (both capabilities) | `data-foil="foil"` |
| 2 Foil hovered / focused | state 1 + `:is(a,button):is(:hover,:focus-visible)`, fine pointer + hover, motion welcome | film + one 640ms `::after` band (desktop); n/a on mobile | `data-foil="foil"`, press is `a` or `button` |
| 3 Etched at rest | every owned copy etched | silver `::before` film | `data-foil="etched"` |
| 4 Etched hovered / focused | state 3 + as state 2 | silver film + band (desktop); n/a on mobile | `data-foil="etched"` |
| 5 Mixed finishes | `×3 · 1 foil`; foil + etched; a deck pin owned in both | plain tile | no `data-foil` |
| 6 Art arriving | `img:not([src])`, or `data-arrival="pending"` (held under either motion preference) | no film, sunken ground | `data-foil` set, film at `opacity: 0` |
| 7 Art landing | `data-arrival="in"`, reduced-motion no-preference | film fades in with the art, 300ms | `data-foil`, img `data-arrival="in"` |
| 8 Art cached / painted before hydration | `data-arrival="done"` once armed; no mark before hydration | film at once when `done`; held while unmarked | `data-foil` |
| 9 No art | no img (`no art on file`) | plain text tile | `data-foil` NOT set |
| 10 Art failed | img `error` event | no film (audit G2) | img `data-arrival="failed"` |
| 11 No longer foil-only | pin no longer foil-only, or no owned copy of the drawn printing | plain | no `data-foil` |
| 12 Reduced motion | `prefers-reduced-motion: reduce` | film, no fade, no band (both) | `data-foil` |
| 13 Reduced transparency | `prefers-reduced-transparency: reduce` | no film or band; solid `inset 0 0 0 2px var(--fg-muted)` edge | `data-foil` |
| 14 Forced colors | `forced-colors: active` | no film or band; system frame; art stays | `data-foil` |
| 15 Token tile | always, this round | plain | `token-tile.tsx` span untouched |
| 16 Suggestion tile, precon box tile | always | plain | no `data-foil` |
| 17 Card details, zoom, hover preview | always (G4, out of scope) | as main | — |
| Themes | any of the six | identical film; only the frame changes | — |

## R2 · Large views, PR 1: the film on the large and mid views (no tilt)

Source: README §R2 (the CSS, the markup, "Where details reads foil"), `STATES-foil-large-views.md`, `READINESS-r2-audit.md`
(PR 1 owns G8, G9, G10, G15 and the first half of G17). Plan: `docs/superpowers/plans/2026-10-15-foil-large-views.md`.
The tilt (`data-tilt`, `@property`, the glare, the hover rule that plays no band on a large film) is PR 2's.

### Component: `FoilFilm` (`components/ui/foil-film.tsx`), the film over a background face

| Property | Mobile | Desktop |
|---|---|---|
| Element | `<span aria-hidden data-foil={finish} data-foil-size="large" className="pointer-events-none absolute inset-0 rounded-[inherit]" />` | same |
| Where | inside each face: `CardFaces`' front and back divs; the one-faced art box (`modal-art-mobile`, `modal-art-desktop`) and `card-zoom-card` | same |
| Turns with the card | the span is a child of the face, which hides its own back (`backface-visibility: hidden`) | same |
| `::before` | R1's stops at `opacity: .8`, `inset: 0 -25%` (1.5x spread, clipped by the span's `overflow: hidden`) | same |
| Arrival mark | on the SPAN only: one `new Image()` of the face's own URL, `armArtArrival(span, image, null)` in a layout effect; no queue (G8) | same |
| Pending / failed | `[data-foil][data-arrival="pending"\|"failed"] { opacity: 0 }`, under either motion preference | same |
| In | `art-in`, 300ms, under no-preference; reduced motion appears unfaded | same |
| Done / unmarked | drawn at once | same |
| The face | never carries `data-arrival`, never drawn through `ArtLayer`; computed opacity 1 in every film state (`probe:foil-film`) | same |
| Cleanup | the effect's cleanup removes the Image's listeners and the mark, on unmount and on a new URL | same |
| Band | one `foil-sweep` once the film's own mark reads `in` or `done` (never while held), delay `--motion-duration`, under `(hover: none)` and no-preference | none in PR 1 (R1's band needs a hovered `a`/`button` ancestor, and the face is not inside one); the focus band is PR 2's (G6) |
| Reduced transparency / forced colors | R1's rules: no film; a 2px `--fg-muted` ring under reduced transparency | same |

### What details reads as foil (G9)

| Face | Film when | Read from |
|---|---|---|
| Front | the shown printing's own art (`hasOwnArt`, `imageUri`) and every copy held of it one foil finish | `faceFilm(resolvedPrinting(preview), "front")`, never `preview.foil`, which a pick does not recompute |
| Back | as the front, and the back art is that printing's own (`hasOwnBack`, `backImageUri`) | `faceFilm(resolved, "back")` |
| A pick | follows the pick at once | the same `resolved` the face draws |
| Mixed holding, unowned card, suggestion, token, oracle-level or representative art | never | `soleFoilFinish` is undefined, or `hasOwnArt` is false |
| A precon's open view | the card's own resolution (call 6) | unchanged |

### Mid views: R1's tile film, still (G10)

| Surface | Markup | Arrival | Finish from |
|---|---|---|---|
| Hover preview (`hover-preview.tsx`, desktop only) | `FoilFilm` with no `data-foil-size`, inside the preview box | its own preload, no queue (the box has no `<img>` and no list) | `usePreviewRow(imageUri, foil)` / `PreviewButton foil`: `collection/rows-view.tsx` and `decks/decklist-row.tsx`; every other caller passes none |
| Phone peek, desktop neighbor plate | `<span data-foil data-foil-still>` AFTER the `ArtLayer` div, one parent | the layer's own mark, through `[data-arrival="pending"\|"failed"] ~ [data-foil] { opacity: 0 }` and `[data-arrival="in"] ~ [data-foil]` fading with it | `SiblingCard.foil`: the provider's `plate()` reads `faceFilm` off the printing it draws (the deck's pick included); a `viewPrintings` override draws none; the Collection and deck lists pass their own `.foil` |
| Still | `[data-foil-still]` plays no band on hover or focus | | |

### State coverage, R2 PR 1

| STATES row | Built here | How |
|---|---|---|
| 1 Shown printing all foil, own art | film | `faceFilm` front, large |
| 3 Etched | silver film | `data-foil="etched"` |
| 4 Mixed | plain | `soleFoilFinish` undefined |
| 5 Picked a plain printing | film leaves with the face | read off `resolved`, not `preview.foil` |
| 6 Another printing's or oracle art | plain | `hasOwnArt` false |
| 7 Unowned | plain | `finishes: {}` |
| 8 Precon open view | own resolution | unchanged |
| 9 Cold open | film held, 300ms fade on landing | the span's mark |
| 10 Face failed | film held | `failed` |
| 11 Two-faced, flipped | film on each face, rides the turn | one span per face |
| 12 Zoom (desktop) | as 1 | `card-zoom-card`; no phone zoom exists (G5) |
| 13 Hover preview | tile film, still | `FoilFilm`, no size |
| 14 Peek, neighbor plate | tile film, still | `data-foil-still` after the `ArtLayer` |
| 15 to 17 Reduced motion, transparency, forced colors | as R1 | R1's rules cover every `[data-foil]` |
| 18 Token | plain | no finish recorded |
| 1b, 1c, 1d, 2, phone hold, tilt | not built here | PR 2, below |


## R2 · Large views, PR 2: the tilt

Source: README §R2 (the CSS, the markup, Timing), `STATES-foil-large-views.md` 1b to 1d, 2, 12, 15 to 17, `READINESS-r2-audit.md`
(PR 2 owns G1 to G7, G11 to G14 and the tilt's half of G17). Hosts: `modal-art-desktop-tilt` and `modal-art-mobile-tilt`
(inner boxes round the art alone, G1 and G2) and `card-zoom-tilt`; helpers in `components/cards/card-tilt.ts`; the phone
hold is `useCardSheetGestures`' (`tiltRef`). The drop shadow is `var(--card-shadow)` outside the motion query (G3).

### State coverage, R2 PR 2

| STATES row | Built here | How |
|---|---|---|
| 1b Hovered or held | tilt, edge, light, film travel | `liftTilt` writes `--tilt-x`, `--tilt-y`, `--tilt-lift` |
| 1c A quick drag on the phone | pages or moves the sheet | the hold's timer is cleared once an axis locks |
| 1d A flip while tilted | eases flat, resumes on the next move | `dropTilt` on the press, `data-turning` until the settle |
| 2 Keyboard focus | R1 band, once | the `:has(> button:focus-visible)` rule |
| 12 Zoom | tilts on press and move, a tap closes | `card-zoom-tilt` (no phone zoom, G5) |
| 15 to 17 | reduced motion: no tilt, shadow kept, no hold; transparency and forced colors: no light | no-preference; `[data-glare]` hidden |
| Phone caption "No hover, no tilt." | not built | a canvas slip (G14) |
