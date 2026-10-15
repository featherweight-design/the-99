# The 99 — Foil treatment (design handoff, R1)

`design/design_handoff_the99_foil_treatment/` · 2026-10-15 · visual-system addendum · mirrors `design_handoff_the99_deck_printings/`.
Voice: Kitchen Table. Theme drawn: Kaldheim (First Frost), with all six on every surface board.

**Status: R1 approved (Hugh, LGTM, 2026-10-15).**

**Source of truth:** `docs/superpowers/design-briefs/2026-10-15-foil-treatment.md` on branch `brief/foil-treatment` (not on main yet).
Fixture: Avengers Assemble Collector's Edition (MSC), 100 cards, all foil.

Canvas: `The 99 - Foil Treatment (R1).dc.html` (the calls) plus nine boards: `R1 - States`, `R1 - Motion`, `R1 - Tokens`,
and a desktop and a phone board each for the deck Card view, the Collection grid and the precon open view. Open them with
`support.js` beside them. The same canvas is live as a Design artifact in account 2. Card art is drawn as plates (frame, art
window, text box), not Scryfall images; card names on the MSC boards are placeholders (G1).

**No About entry, no `ABOUT_VERSION` bump.** Cosmetic, per the card-captions ruling (brief §About entry).

---

## The design in one paragraph

A foil copy gets a still, angled rainbow film over its art. It is drawn by the ring span every art tile already has (the 1px
inner edge), as two pseudo-elements: `::before` is the film, `::after` is a band of light that sits off the tile. Nothing moves
on its own. On a desktop with a fine pointer, hovering the tile or focusing it from the keyboard sends the band across once
(640ms). Phones are static. The film waits for the art and fades in with it. Reduced motion keeps it still; reduced
transparency swaps it for a solid 2px edge; forced colours drop it. Words on the tile do not change.

## The calls (brief §Open, in order)

1. **Static or animated: static.** A fixed film at 115°. A full Collector's Edition grid is 100 tiles at once, and 100 tiles
   moving is a lot; a still film is already unmissable there. Its only movement is arriving with the art (`art-in`, 300ms).
2. **Hover and tilt on desktop: hover sweep, no tilt.** `:hover` or `:focus-visible` on the tile's press (`a` or `button`)
   plays one sweep of `::after`, `transform` only, then rests. No pointer-following (it needs a pointermove handler) and no
   3D tilt (it changes the tile's box and fights the shipped hover border). Only the tile under the pointer animates.
3. **Phones: static only.** No hover exists. A sweep on scroll into view needs a watcher per tile or a second motion keyed
   to arrival, and device tilt needs iOS's motion permission prompt. The film alone reads at 115px (Collection 3-up).
4. **Intensity per theme: one recipe, all six.** All six themes are dark chrome; there is no light theme in `globals.css`.
   The film paints on the card art, which is identical in every theme, so only the frame around it changes. Each surface
   board shows the six side by side at real size. **Reduced-transparency fallback: the film and band go, and the ring span's
   inner edge becomes `inset 0 0 0 2px var(--fg-muted)`**, opaque, using an existing token.
5. **Etched: drawn differently.** A cooler, flatter silver film with no colour, and the same sweep. Staging holds 0 etched
   copies, so it is one CSS rule to keep or drop (G6).
6. **Mixed finishes: no sheen.** One rule everywhere: **a tile gets the film when the player owns at least one copy of the
   printing the tile draws and every owned copy of it is foil** (etched counts as its own finish: every copy etched gives
   `etched`; foil plus etched is mixed, no film). That agrees with Engineering's deck rule and with the precon read's
   `printedFoil` (`foil === quantity`). A partial film (a corner or strip) was considered and dropped: it would be a third
   look that has to be learned, for a state card details already spells out (`×3 · 1 foil` in the printing list).
7. **Large views: not this round.** Card details, the zoom and the hover preview stay as on main. A sheen at full size wants
   a richer drawing (real foil has structure across the frame and the art), and none of those surfaces is in the paint
   budget's worst case. Follow-up G4.

Also decided:
- **Tokens: none.** `token_printing_holdings` records no finish, and the lock forbids "this printing exists in foil". If a
  finish is ever recorded, the token tile's ring span takes `data-foil` by the same rule. `R1 - Tokens` shows the tile unchanged.
- **Precon box tiles on `/precons`: none.** A box is not a copy.
- **Basic land tiles in a precon** (the dashed tile at the foot of Lands) take the film when their printing is foil.

## Where each surface reads "foil"

| Surface | Component | Sets `data-foil` when |
|---|---|---|
| Deck Card view | `decks/deck-card-tile.tsx` | the deck's resolved printing (pick → Collection pick → default) is owned, and every owned copy of it is foil (or etched) |
| Collection grid | `collection/grid-view.tsx` | the printing the tile draws has `finishes` with only `foil` (or only `etched`) above zero |
| Precon open view | `decks/read-only-card-tile.tsx` | `card.printedFoil` (already `foil > 0 && foil === quantity`) |
| Tokens | `decks/token-tile.tsx` | never, this round |
| Suggestions | `suggestion-tile.tsx` | never (locked) |

The deck read is Engineering's: a finish read beside `selectCollectionRows` in `lib/decks/printings.ts`, no schema change.
**Departure:** the brief says "pinned printing". R1 widens it to the printing the tile actually draws, so a deck with no pick
behaves like Collection. A CE start pins every card, so the fixture is unchanged either way.

## The CSS

One block in `globals.css`, beside the art-arrival rules. The ring span is unchanged except for the attribute:
`<span aria-hidden data-foil={finish ?? undefined} className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25)]" />`.
No filter, no backdrop-filter, no blend mode, no mask, no `will-change`, no image.

```css
/* Foil treatment (handoff R1). The ring span over a tile's art carries data-foil="foil" | "etched"
   when every owned copy of the printing it draws has that finish. Two pseudo-elements, gradients only. */
[data-foil] { overflow: hidden; }
[data-foil]::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit;
}
[data-foil="foil"]::before {
  background: linear-gradient(115deg,
    rgb(255 255 255 / 0) 8%, rgb(255 110 180 / .16) 22%, rgb(255 220 120 / .16) 32%,
    rgb(255 255 255 / .26) 39%, rgb(130 240 210 / .16) 47%, rgb(120 170 255 / .16) 60%,
    rgb(200 130 255 / .14) 74%, rgb(255 255 255 / 0) 90%);
}
[data-foil="etched"]::before {
  background: linear-gradient(115deg,
    rgb(214 226 240 / 0) 12%, rgb(214 226 240 / .10) 30%, rgb(236 243 250 / .22) 42%,
    rgb(214 226 240 / .10) 54%, rgb(214 226 240 / 0) 74%);
}

/* The film waits for the art: never over the sunken ground of a tile still loading. */
img:not([src]) ~ [data-foil],
img[data-arrival="pending"] ~ [data-foil] { opacity: 0; }

@media (prefers-reduced-motion: no-preference) {
  img[data-arrival="in"] ~ [data-foil] { animation: art-in var(--motion-fade) var(--motion-ease); }
}

/* The band exists only where it can play: a fine pointer, motion welcome. Phones never draw it. */
@keyframes foil-sweep { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  [data-foil]::after {
    content: ""; position: absolute; inset: 0; border-radius: inherit; transform: translateX(-100%);
    background: linear-gradient(105deg, rgb(255 255 255 / 0) 30%, rgb(255 255 255 / .42) 50%, rgb(255 255 255 / 0) 70%);
  }
  :is(a, button):is(:hover, :focus-visible) [data-foil]::after {
    animation: foil-sweep calc(var(--motion-duration) * 2) var(--motion-ease);
  }
}

@media (prefers-reduced-transparency: reduce) {
  [data-foil]::before, [data-foil]::after { display: none; }
  [data-foil] { box-shadow: inset 0 0 0 2px var(--fg-muted); }
}

@media (forced-colors: active) {
  [data-foil]::before, [data-foil]::after { display: none; }
}
```

`foil-sweep` and `.anim-*`: the sweep only exists under `prefers-reduced-motion: no-preference`, so it needs no entry in the
reduced-motion list; add a comment there pointing at this block so the list stays the one place to look.
`check:tokens` sees only `--motion-*` and `--fg-muted`, all declared. No hex enters a component.

## Timing (live motion can't show on a still canvas)

| Moment | What moves | Duration | Delay | Curve | Tokens |
|---|---|---|---|---|---|
| Art lands | ring span `opacity` 0→1, with the img | 300ms | 0 | ease-in-out | `--motion-fade`, `--motion-ease` (the art's own `art-in`) |
| Art still loading | held at `opacity: 0` | — | — | — | `img:not([src])`, `data-arrival="pending"` |
| Hover or keyboard focus | `::after` `transform` −100% → 100% | 640ms | 0 (pointer feedback takes no beat) | ease-in-out | `calc(var(--motion-duration) * 2)`, `--motion-ease` |
| Pointer leaves mid-sweep | the band drops back off the tile | instant | — | — | no reverse |
| Reduced motion | nothing; the film appears with the art | — | — | — | — |

`R1 - Motion` plays each one on a loop (2.6s), plus a row where a pointer crosses six CE tiles and only the tile under it moves.

## The locks

| Lock | How R1 meets it |
|---|---|
| Only real foil copies | `data-foil` from owned finishes only (table above). Never a suggestion, an unowned commander or a draft you don't hold. |
| No new image downloads | Two gradients. |
| On the ring span | `data-foil` on that span; its `::before` and `::after`. No new element. |
| Radius ≥ 3.1% of the tile width | The span inherits the clip (`rounded-[inherit]`, inside the art box's `overflow: hidden`). Shell 9/10px and art foot `max(9px, 3.4cqw)`: 5.0% of a 181px desktop tile, 5.2% of the 173px phone deck tile, 7.8% of the 115px Collection tile. |
| No per-tile JS loop, no per-tile filter/backdrop-filter | None. CSS only; the arrival reuses the existing `data-arrival` mark. |
| Reduced motion static; RT and FC handled | See the CSS. |
| 200 tiles smooth | At rest the film is a static gradient rasterised with its tile: no layer, no animation. Phones never create `::after`. On desktop only a hovered tile animates, `transform` only, and is promoted only while it runs. Engineering proves it with `pnpm measure:load` on deployed staging, slow profile, Collection and a CE deck, before and after. |
| No change to what a tile says | No string added or moved. |
| No About entry | None. |

## States (`R1 - States`, `STATES-foil-treatment.md`)

Foil at rest · foil hovered · etched at rest · etched hovered · mixed (plain) · art arriving (no film) · art landing (film fades
with it) · no art (`no art on file`, no film) · no longer foil-only (plain) · art failed (G2) · reduced motion · reduced
transparency · forced colours · token (plain). Phone repeats the six that differ there.

## Gaps and open points

- **G1 Placeholder fixture.** The MSC card list and art weren't reachable from this environment, so the CE boards use staples
  and `[MSC creature X]` names over drawn plates. The film's alphas were tuned on those plates (dark art windows, pale text
  boxes). Check on real art in the build PR's contact sheet, especially very pale full-art and borderless printings.
- **G2 Art that fails to load.** `armArtArrival` marks an errored image `in`, so the film would paint on the bare ground.
  Proposed: mark it `failed` instead and add `img[data-arrival="failed"] ~ [data-foil] { opacity: 0 }`. One attribute value,
  no new listener. Engineering's call.
- **G3 Leaving mid-sweep** snaps the band off rather than reversing it. Accepted: reversing needs a transition with a
  second state, and the band is 42% white at its peak for 640ms.
- **G4 Large views** (card details, zoom, hover preview) are a follow-up with their own drawing.
- **G5 The deck rule's read.** Needs finishes beside `selectCollectionRows`; the "drawn printing, not only the pin" widening
  above is a departure from the brief and Hugh may prefer "pinned only".
- **G6 Etched** can't be seen on real data (0 rows on staging). Keep or drop at audit.
- **G7 Brief's "light and dark themes".** All six themes are dark; drawn all six anyway.
- **G8 Mixed tiles show nothing on the grid.** The foil count lives in card details only. If Hugh wants a grid cue for mixed,
  it's a word or a mark, not a partial film (call 6).

## Files

| File | Holds |
|---|---|
| `The 99 - Foil Treatment (R1).dc.html` | **Start here.** The calls, a specimen row, the locks, the timing |
| `R1 - Deck-Desktop.dc.html`, `R1 - Deck-Phone.dc.html` | A CE deck's Card view, six themes, preferences |
| `R1 - Collection-Desktop.dc.html`, `R1 - Collection-Phone.dc.html` | The common case (1 in 20 foil), mixed, six themes, preferences |
| `R1 - Precon-Desktop.dc.html`, `R1 - Precon-Phone.dc.html` | Avengers Assemble CE and regular edition, basic land tile, six themes, preferences |
| `R1 - States.dc.html` | Every state, desktop and phone sizes |
| `R1 - Motion.dc.html` | Live loops of the arrival and the sweep |
| `R1 - Tokens.dc.html` | Token tiles, unchanged |
| `STATES-foil-treatment.md`, `READINESS.md`, `foil-treatment · copy strings.ts` | R1 |
| `brand/` | The locked brand sheet. `support.js` is the canvas runtime, not production code |

**Sequencing.** One PR: the CSS block, `data-foil` on three ring spans (deck, Collection, precon read-only; the token span
untouched), the deck finish read, and `measure:load` tables in the body. Phone and desktop ship together. No new tokens,
no new dependencies, no new strings.


---

## R2 · Large views (addendum, 2026-10-15)

**Status: R2 drawn, waiting on Hugh's audit.** Nothing here goes to main until he approves.

**Source of truth:** `docs/superpowers/design-briefs/2026-10-15-foil-large-views.md` on branch `brief/foil-large-views`.
It builds on R1 (audited GREEN, handoff #1776; the build is #1784) and closes R1's G4.

Canvas: `The 99 - Foil Treatment (R2).dc.html` (the calls, a live follow specimen, intensity, timing, locks, sizes and the
CSS) plus `R2 - Details-Desktop`, `R2 - Details-Phone`, `R2 - Zoom`, `R2 - Preview` (hover preview, peeks, precons),
`R2 - Motion` (every movement, looping) and `R2 - States`. Same canvas artifact as R1, below R1's boards. On the
desktop boards, hover the first large card and move across it: the film follows.

**No About entry, no bump, no strings.** Cosmetic (brief §About entry).

### The design in one paragraph

Card details, the zoom, the hover preview and the peeks carry R1's film over a foil copy's own art. On the two large
faces (the details face and the zoom card) the film is R1's, at 80% strength and spread 1.5 times wider. On desktop it
slides toward the pointer, up to a quarter of the card each way, and eases home when the pointer leaves; keyboard focus
plays R1's one sweep instead. On a phone it is still, with one band of light when a card lands. The mid-size views (the
hover preview, the phone peek, the desktop neighbour plate) keep R1's tile film, still. The face itself is drawn exactly
as today and never waits: only the film carries an arrival mark.

### The calls (brief §Open, in order)

1. **Intensity at size.** R1’s film, at 80% strength and spread one and a half times wider. Same stops and colours, so a tile and its details read as one material. The wider spread keeps a 264 to 372px face from reading as stripes, and the lower strength keeps pale art from washing out.
2. **Motion at size.** Desktop: the film follows the pointer across the face, up to a quarter of the card’s width each way, and eases home when the pointer leaves. Keyboard focus plays R1’s one 640ms sweep. Nothing loops.
3. **Tilt on desktop.** No tilt. A tilt and the flip are both rotations of the same card, and the zoom adds its own perspective. The moving film is what reads as foil, and it composes with the flip for free.
4. **The phone.** A still film, plus one R1 sweep when a card lands: details opening, a swipe settling, the zoom opening. No drag-follow. Device tilt stays out, because it needs the motion permission prompt.
5. **Arrival on a background face.** The face never waits; only the film does. One preloaded Image marks the FILM span (the arming ArtLayer already uses). Cached art, which covers most opens, is marked done and the film is there at once. A cold open fades the film in over 300ms when the bytes land.
6. **Precons in details.** Details keeps the card’s own resolution. Showing the box’s printing changes what details names, which is more than a cosmetic round should move. If you own the Collector’s Edition, your MSC copies resolve and carry the film anyway.
7. **The peek and the hover preview.** Both get R1’s tile film, still, with no motion. The peek is mid-size and partly off screen; the preview already moves with the pointer, so a moving film on it is noise.
8. **The flip.** The film rides both faces through the turn. Each face carries its own film and hides its own back, so the film turns with the card stock and the back is foil the moment it shows.
9. **A mixed holding in details.** No film, the same rule as tiles: every owned copy of the shown printing is foil, or nothing. The picker’s finish filter is a way of finding a printing, not a statement about the face.

### Where details reads "foil"

Details already resolves the printing it shows; the film reads that same printing.

| Opened from | Shown printing | Film when |
|---|---|---|
| A deck | the deck's held pick, else the Collection pick (`deckPrintingPicks`, `withDeckPick`) | every owned copy of it is foil (or etched) and the face is its own image |
| The Collection | the card's preference, else the first printing with art | that printing's `finishes` hold only `foil` (or only `etched`) |
| A precon's open view | the card's own resolution, unchanged (call 6) | as above; an unowned card never |
| A pick in the picker | the picked printing | the film follows the pick, as R1's `cardArt` does on tiles |
| A suggestion, a commander page, any card not held | | never |

The face is "its own image" only when it comes from `resolved.imageUri` of a held printing. A face drawn from another
printing or the oracle-level picture (`identityGradient` fallback included) gets no film.

### The CSS (proposed; R1's block stays as built)

```css
/* Foil, large views (R2). A large film is any [data-foil] with data-foil-size="large": the
   details face(s) and the zoom card. The peek, the neighbour plate and the hover preview keep R1's
   tile film. R1's reduced-transparency and forced-colors rules already cover every [data-foil]. */
[data-foil-size="large"]::before { inset: 0 -25%; opacity: .8; }

/* A background face has no <img> to wait on, so the FILM carries its own arrival mark (armArtArrival
   on a preloaded Image of the face's URL). The face itself is never held. */
[data-foil][data-arrival="pending"], [data-foil][data-arrival="failed"] { opacity: 0; }
@media (prefers-reduced-motion: no-preference) {
  [data-foil][data-arrival="in"] { animation: art-in var(--motion-fade) var(--motion-ease); }
}

/* Desktop: the film follows the pointer. --foil-x (0..1) is written on pointermove by the art box. */
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  [data-foil-size="large"]::before {
    transform: translateX(calc((var(--foil-x, .5) - .5) * 33.333%));
    transition: transform var(--motion-duration) var(--motion-ease);
  }
  :hover > [data-foil-size="large"]::before { transition-duration: var(--motion-quick); }
  /* R1's band plays on keyboard focus only here; hover has the follow. */
  :is(a, button):hover:not(:focus-visible) [data-foil-size="large"]::after { animation: none; }
}

/* Phone: one band when a card lands (the element mounts), after the card's own entry. */
@media (hover: none) and (prefers-reduced-motion: no-preference) {
  [data-foil][data-foil-size="large"]::after {
    content: ""; position: absolute; inset: 0; border-radius: inherit;
    background: linear-gradient(105deg, rgb(255 255 255 / 0) 30%, rgb(255 255 255 / .42) 50%, rgb(255 255 255 / 0) 70%);
    animation: foil-sweep calc(var(--motion-duration) * 2) var(--motion-ease) var(--motion-duration) both;
  }
}

/* The peek's art is an ArtLayer div, not an <img>: R1's hold reads the mark on any sibling. */
[data-arrival="pending"] ~ [data-foil], [data-arrival="failed"] ~ [data-foil] { opacity: 0; }
```

**The markup.** One film span per face, inside the face box, so it turns with the card:

- **Details, single-faced:** the art box (`modal-art-desktop`, and the phone card) gets a child
  `<span data-foil="foil" data-foil-size="large" class="pointer-events-none absolute inset-0 rounded-[inherit]">`.
- **Two-faced:** `CardFaces` draws one film span inside each face div. Both sides hide their backs, so the film rides the
  turn with no timing of its own.
- **The zoom card:** the same, on `card-zoom-card` (or inside each zoom face).
- **The follow:** the art box's existing zoom button (stretched over the art) writes `--foil-x` on `pointermove` (offsetX ÷
  width) and removes it on `pointerleave`, only for a fine pointer under no-preference. No rAF, nothing while idle.
- **The arrival mark:** one preloaded `Image` of the face's URL, armed with `armArtArrival`, marks the film span (`pending`,
  `in`, `done`, `failed`). Cached art is `done` at once, so most opens show the film with the face.
- **The hover preview:** `usePreviewRow(imageUri, finish)` carries the finish (Collection rows know it); the preview box
  draws a tile-size film span with the same arrival mark. `synopsis-text` and `token-makers` pass none.
- **The peek and the neighbour plate:** `SiblingCard` gains the finish; the `ArtLayer` gets a tile-size film span after it.

### Timing (live motion can't show on a still canvas)

| Motion | Value | Notes |
|---|---|---|
| Follow, pointer over the face | transform · 200ms (--motion-quick) · --motion-ease | Each pointermove writes `--foil-x` (0 to 1) on the art box; the film eases toward it. No rAF loop. |
| Return, pointer leaves | transform · 320ms (--motion-duration) · --motion-ease | `--foil-x` is removed; the film settles back to centre. |
| Travel | ±25% of the card’s width | translateX((x − .5) × 33.3%) of a film 150% wide. |
| Keyboard focus, desktop | 640ms (2 × --motion-duration) · once | R1’s band, unchanged. Hover never plays it on a large view; the follow replaces it. |
| Card lands, phone | 640ms · delay 320ms (--motion-duration) · once | Plays on mount (details opens, a swipe settles, the zoom opens), after the card’s own entry. |
| Cold face arrives | opacity 0→1 · 300ms (--motion-fade) | The film only. The face itself is drawn as before, unfaded. |
| Flip | none of its own | The film rides `anim-card-turn`. |
| Pick a plain printing | none | The film leaves with the old face, at once. |
| Reduced motion | no motion | Film still, centred. No follow, no sweep, no fade. |

### Sizes, as built

The brief's sizes differ from the code in two places; the boards draw what is built.

| View | Size | Notes |
|---|---|---|
| Details face, desktop | 264 × 369 | Brief says 300 to 360. Built: `min(264px, …)` in `card-modal.tsx`. Drawn at 264. |
| Details card, phone | up to 320 × 447 | `--card-w`, smaller on short screens or a stacked sheet. |
| Zoom, desktop | 372 × 520 | Brief says close to viewport height. Built: `--zoom-w-md`, capped at 372. |
| Zoom, phone | 318 × 444 | `--zoom-w`. |
| Hover preview | 252 × 352 | `hover-preview.tsx`, desktop only. |
| Phone peek | 236 × 330 | 0.7375 of `--card-w`; about 23px shows at each edge. |
| Desktop neighbour plate | small | `NeighborPlate`, the desktop carousel’s neighbour; treated as a peek. |

### The locks

| Lock | How R2 holds it |
|---|---|
| Only real copies, only over that printing’s own art | Film only when every owned copy of the SHOWN printing is foil (or etched) and the face is that printing’s own image. Representative or oracle-level art, unowned cards and suggestions: never. |
| No new image downloads | Gradients only. The film’s arrival mark reuses the face’s own URL, which the browser already fetches for the face. |
| The face never waits for the film | The face stays a CSS background drawn at once. Only the film span carries an arrival mark. |
| Reduced motion is static | The follow, the sweeps and the fade all sit under no-preference. The film still draws, centred. |
| Reduced transparency and forced colours | R1’s rules already cover every `[data-foil]`: a 2px `--fg-muted` ring, and no film. |
| No change to what details says | No strings. The finish line, the picker captions and the zoom caption are untouched. |
| No per-frame JavaScript | One custom property per pointermove on one element; a CSS transition does the rest. Nothing runs while idle. |
| No About entry | None, no bump. |

### Gaps and open points (R2)

- **R2-G1 Placeholder fixture.** As R1's G1: plates, not Scryfall art. The two-faced specimen uses Valki, God of Lies
  (`KHM 114`) as a stand-in. Check the 80% strength on real pale full-art and borderless faces in the build's contact sheet.
- **R2-G2 The brief's sizes.** Details is 264px wide on desktop (brief: 300 to 360) and the zoom is capped at 372 × 520
  (brief: close to the viewport height). The calls hold at either size; if the zoom ever grows past about 500px wide,
  re-check the strength.
- **R2-G3 Precon asymmetry.** An unowned Collector's Edition shows the film on its open-view tile (R1: the edition is foil)
  and none in details opened from it (your own copy decides). Accepted under call 6; drawn on `R2 - Preview`.
- **R2-G4 Tilt.** Ruled out this round. If Hugh wants it later, it is a rotateY on an inner box that pauses while
  `anim-card-turn` runs and eases back on leave; the film already follows, so tilt would add depth, not foil.
- **R2-G5 The phone band replays on a remount.** A swipe or a pick that remounts the card replays its one band. A pick
  to another foil printing is a new card in hand, so that reads right; a re-render that does not remount plays nothing.
- **R2-G6 A cold face that arrives late.** The phone band waits 320ms; if the bytes take longer, the band plays while the
  film is still held and is not seen. Accepted: the film still fades in.
- **R2-G7 Light themes.** The brief asks for a light theme; there is none (R1's G7). All six dark themes are drawn.
- **R2-G8 The finish on the preview and the peek.** Each needs its finish passed beside its art; that is engineering's
  plumbing, with no schema change (`BrowsePrinting.finishes`, the deck's finish read from #1784).
