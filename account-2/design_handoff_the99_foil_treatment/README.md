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
It builds on R1 (audited GREEN, handoff #1776; the build is #1784) and closes R1's G4. The tilt was added at Hugh's
request after the first draft (2026-10-15): subtle, on hover on desktop and on press and move on a phone.

Canvas: `The 99 - Foil Treatment (R2).dc.html` (the calls, a live follow specimen, intensity, timing, locks, sizes and the
CSS) plus `R2 - Details-Desktop`, `R2 - Details-Phone`, `R2 - Zoom`, `R2 - Preview` (hover preview, peeks, precons),
`R2 - Motion` (every movement, looping) and `R2 - States`. Same canvas artifact as R1, below R1's boards. On the
desktop boards, hover the first large card and move across it: it tilts, and the light and the film follow.

**No About entry, no bump, no strings.** Cosmetic (brief §About entry).

### The design in one paragraph

Card details, the zoom, the hover preview and the peeks carry R1's film over a foil copy's own art. On the two large
faces (the details face and the zoom card) the film is R1's, at 80% strength and spread 1.5 times wider. **Every card**
in details and the zoom tilts up to 6° toward where you point (Hugh, 2026-10-15: subtle tilt, yes; smoothed against
his reference app the same day): the side under the pointer lifts toward you, a sliver of card edge shows on the far
sides, and a soft light sits under the pointer. On a foil card the film drifts with it. Three registered, transitioned
values drive all of it, so it glides rather than steps. Desktop tilts on hover. A phone tilts once you press
and hold the card for 300ms and then move your finger, so a quick drag still pages and moves the sheet; the zoom, which
has no swipe, tilts on any press and move. During a flip the tilt eases flat and waits. The mid-size views (the hover
preview, the phone peek, the desktop neighbour plate) keep R1's tile film, still, with no tilt. The face itself is drawn
exactly as today and never waits: only the film carries an arrival mark.

### The calls (brief §Open, in order)

1. **Intensity at size.** R1’s film, at 80% strength and spread one and a half times wider. Same stops and colours, so a tile and its details read as one material. The wider spread keeps a 264 to 372px face from reading as stripes, and the lower strength keeps pale art from washing out.
2. **Motion at size.** The film follows the tilt: it slides toward the pointer or finger, up to a quarter of the card’s width each way, and a soft light follows with it. Keyboard focus plays R1’s one 640ms sweep instead. Nothing loops.
3. **Tilt (Hugh, 2026-10-15: yes, subtle; smoothed against his reference app).** Every card in details and the zoom tilts up to 6° toward where you point: the side under the pointer lifts toward you, and a sliver of card edge shows along the far sides, as a card does in hand. A soft light sits under the pointer. One set of eased values drives the tilt, the edge, the light and the film, so they move as one and never step. During a flip the tilt settles flat and waits.
4. **The phone.** Press and hold the card, then move your finger: it tilts the same way. A drag on the card already pages or moves the sheet, so the tilt waits for a 300ms hold inside the 10px swipe slop, then the swipe stands down. In the zoom, which has no swipe, a press and move tilts at once, and a tap still closes. Plus R1’s one band when a card lands. Device tilt stays out (permission prompt).
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

/* The tilt, on every card in details and the zoom. The host is a box OUTSIDE the one that turns for a
   flip (desktop art box, phone card, a wrapper round card-zoom-card). JS writes the TARGET values: --tilt-x /
   --tilt-y (0..1) on pointermove and --tilt-lift: 1 while a fine pointer hovers or after a phone hold. The
   three are registered, so the transition interpolates the VALUES and everything built from them (the
   rotation, the edge, the light, the film) eases together. data-turning holds it flat during a flip. */
@property --tilt-x { syntax: "<number>"; inherits: true; initial-value: .5; }
@property --tilt-y { syntax: "<number>"; inherits: true; initial-value: .5; }
@property --tilt-lift { syntax: "<number>"; inherits: true; initial-value: 0; }

@media (prefers-reduced-motion: no-preference) {
  [data-tilt] {
    --tilt-ease: cubic-bezier(.22, 1, .36, 1);
    --card-shadow: 0 24px 50px rgb(0 0 0 / .55);  /* each host's existing shadow moves here */
    transform: perspective(1000px)
      rotateX(calc((var(--tilt-y) - .5) * 12deg))
      rotateY(calc((.5 - var(--tilt-x)) * 12deg));
    /* the card edge on the far sides, a 1px light rim, then the card's own drop shadow */
    box-shadow:
      calc((var(--tilt-x) - .5) * -6px) calc((var(--tilt-y) - .5) * -6px) 0 0 rgb(205 210 218 / calc(var(--tilt-lift) * .9)),
      0 0 0 1px rgb(255 255 255 / calc(var(--tilt-lift) * .22)),
      var(--card-shadow);
    transition: --tilt-x 600ms var(--tilt-ease), --tilt-y 600ms var(--tilt-ease), --tilt-lift 600ms var(--tilt-ease);
  }
  [data-tilt][data-tilting] { transition-duration: 300ms; }
  [data-tilt][data-turning] { --tilt-x: .5; --tilt-y: .5; --tilt-lift: 0; transition-duration: 300ms; }

  /* The light: every card, as strong as the lift. */
  [data-tilt] [data-glare] {
    position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: var(--tilt-lift);
    background: radial-gradient(circle at calc(var(--tilt-x) * 100%) calc(var(--tilt-y) * 100%),
      rgb(255 255 255 / .20), rgb(255 255 255 / .06) 40%, rgb(255 255 255 / 0) 72%);
  }

  /* A foil film drifts against the pointer on the same vars. */
  [data-tilt] [data-foil-size="large"]::before { transform: translateX(calc((var(--tilt-x) - .5) * -33.333%)); }
}
@media (prefers-reduced-transparency: reduce), (forced-colors: active) { [data-glare] { display: none; } }

/* Desktop: R1's band plays on keyboard focus only here; hover has the tilt. */
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  :is(a, button):hover:not(:focus-visible) [data-foil-size="large"]::after { animation: none; }
}

/* Phone: one band when a card lands (the element mounts), after the card's own entry. */
@media (hover: none) and (prefers-reduced-motion: no-preference) {
  [data-foil][data-foil-size="large"]::after {
    content: ""; position: absolute; inset: 0; border-radius: inherit;
    background: linear-gradient(105deg, rgb(255 255 255 / 0) 30%, rgb(255 255 255 / .42) 50%, rgb(255 255 255 / 0) 70%);
    animation: foil-sweep calc(var(--motion-duration) * 2) var(--motion-ease) var(--motion-duration) both;
  }
  [data-tilt][data-tilting] { --card-shadow: 0 34px 70px rgb(0 0 0 / .7); }  /* the lift after a hold */
}

/* The peek's art is an ArtLayer div, not an <img>: R1's hold reads the mark on any sibling. */
[data-arrival="pending"] ~ [data-foil], [data-arrival="failed"] ~ [data-foil] { opacity: 0; }
```

**The markup.**

- **The tilt host** is a box OUTSIDE the one that turns for a flip, so the two transforms compose: the desktop art box
  (`modal-art-desktop`, whose child `turningArt` turns), the phone card (or an inner wrapper if its entry animation
  already owns `transform`), and a new wrapper round `card-zoom-card` (which turns itself). It carries `data-tilt`.
- **The light:** one `<span data-glare>` per face, on every card, after the film span.
- **The film:** one `<span data-foil="foil" data-foil-size="large">` per face, inside the face, so it turns with the card.
  `CardFaces` draws one in each face.
- **Desktop, fine pointer, no-preference:** `pointerenter` sets `data-tilting` and `--tilt-lift: 1`; `pointermove` writes
  `--tilt-x` and `--tilt-y` (offset ÷ size); `pointerleave` removes them all. The host's existing drop shadow moves into
  `--card-shadow`, because the edge is drawn in the same `box-shadow`. Listeners sit on the host (the zoom trigger stretched over
  the art passes through). No rAF, nothing while idle.
- **Phone details card:** `card-sheet-gesture` gains a hold: a press that stays inside `SWIPE.lockPx` (10px) for 300ms is
  picked up. It captures the pointer, marks itself `dead` for paging and the sheet, sets `data-tilting`, and writes the
  vars on move. The release removes them and swallows the click, so the zoom does not open. A press that moves first
  stays a swipe, exactly as today.
- **Phone zoom:** a press that moves past 10px tilts at once; a tap without movement still closes.
- **The flip:** the existing turn handlers set `data-turning` on the host from the press to `onTurnSettled` /
  `onArtTurnSettled`; the CSS pins the vars to centre meanwhile.
- **The arrival mark:** one preloaded `Image` of the face's URL, armed with `armArtArrival`, marks the film span (`pending`,
  `in`, `done`, `failed`). Cached art is `done` at once, so most opens show the film with the face.
- **The hover preview:** `usePreviewRow(imageUri, finish)` carries the finish (Collection rows know it); the preview box
  draws a tile-size film span with the same arrival mark. No tilt (it already rides the pointer). `synopsis-text` and
  `token-makers` pass none.
- **The peek and the neighbour plate:** `SiblingCard` gains the finish; the `ArtLayer` gets a tile-size film span after it.

### Timing (live motion can't show on a still canvas)

| Motion | Value | Notes |
|---|---|---|
| Tilt, following | 300ms · cubic-bezier(.22, 1, .36, 1) (ease out) | Each pointermove writes `--tilt-x` / `--tilt-y` (0 to 1). They are registered with `@property` and TRANSITIONED, so every value built from them glides: a moving target is chased, never stepped to. No rAF loop. |
| Tilt, release | 600ms · same ease out | Pointer leaves or finger lifts: the vars return to .5 and `--tilt-lift` to 0; the card settles flat and the edge and light fade with it. |
| Tilt, range | ±6° on each axis · perspective 1000px | rotateY((.5 − x) × 12°), rotateX((y − .5) × 12°): the side under the pointer lifts toward you (measured off Hugh’s reference: about 6° at that perspective). |
| Card edge | up to 3px · card-stock grey · fades in with the lift | An offset shadow on the far sides, (x − .5) × −6px and (y − .5) × −6px, plus a 1px light rim at 22%. At rest: none. |
| Light | radial white 20% → 6% at 40% → 0 at 72% | Centred on the pointer; its opacity is `--tilt-lift`, so it fades in and out with the tilt. Every card. |
| Film travel (foil) | ±25% of the card’s width | translateX((x − .5) × −33.3%) of a film 150% wide: it drifts against the pointer, a parallax against the light. Same eased vars. |
| Phone pick-up | hold 300ms within 10px (the swipe’s `lockPx`) | Then the card lifts (shadow 0 24 50 → 0 34 70, 200ms) and follows the finger; swipe and sheet stand down; the release opens nothing. |
| Phone zoom | press and move past 10px | Tilts at once; a tap without movement still closes the zoom. |
| During a flip | tilt settles flat, 300ms | Held flat until the turn settles (`onTurnSettled`), then resumes on the next move. |
| Keyboard focus, desktop | 640ms (2 × --motion-duration) · once | R1’s band, unchanged. No tilt from the keyboard. |
| Card lands, phone | 640ms · delay 320ms (--motion-duration) · once | Plays on mount (details opens, a swipe settles, the zoom opens), after the card’s own entry. |
| Cold face arrives | opacity 0→1 · 300ms (--motion-fade) | The film only. The face itself is drawn as before, unfaded. |
| Reduced motion | no motion | No tilt, no light, no follow, no sweep, no fade. The film still draws, centred. |

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
| Reduced motion is static | The tilt, the light, the follow, the sweeps and the fade all sit under no-preference. The film still draws, centred. |
| Reduced transparency and forced colours | R1’s rules cover every `[data-foil]`: a 2px `--fg-muted` ring, and no film. The light is dropped under both; the tilt stays. |
| No change to what details says | No strings. The finish line, the picker captions and the zoom caption are untouched. |
| No per-frame JavaScript | Three registered custom properties written on pointer events on one element; the browser transitions them. A 300ms hold timer on the phone. Nothing runs while idle. |
| No About entry | None, no bump. |

### Gaps and open points (R2)

- **R2-G1 Placeholder fixture.** As R1's G1: plates, not Scryfall art. The two-faced specimen uses Valki, God of Lies
  (`KHM 114`) as a stand-in. Check the 80% strength on real pale full-art and borderless faces in the build's contact sheet.
- **R2-G2 The brief's sizes.** Details is 264px wide on desktop (brief: 300 to 360) and the zoom is capped at 372 × 520
  (brief: close to the viewport height). The calls hold at either size; if the zoom ever grows past about 500px wide,
  re-check the strength.
- **R2-G3 Precon asymmetry.** An unowned Collector's Edition shows the film on its open-view tile (R1: the edition is foil)
  and none in details opened from it (your own copy decides). Accepted under call 6; drawn on `R2 - Preview`.
- **R2-G4 Tilt is for every card, not only foil.** Hugh's ask was to bring the cards to life, so a plain card tilts and
  catches the light too; only a foil card's film moves. If tilt should be foil-only, it is one condition on `data-tilt`.
- **R2-G9 The phone hold is new.** Nothing in the app is press-and-hold today, so no one will find it by accident; it is a
  quiet reward rather than a feature. A hold with no move does nothing visible but the lift. No About entry (cosmetic).
- **R2-G10 The tilt's 6°.** Measured off Hugh's reference screens at perspective 1000px. Engineering can expose it as one
  constant (`12deg` is the full swing) to tune on a real device.
- **R2-G11 `@property` and one new easing curve.** The smoothness comes from registering `--tilt-x`, `--tilt-y` and
  `--tilt-lift` so the browser interpolates them (Safari 16.4+, Firefox 128+, Chrome). Where it is missing the values
  step, and the tilt still works, only less smoothly. The follow uses an ease-out curve (`cubic-bezier(.22, 1, .36, 1)`),
  kept local to the tilt as `--tilt-ease` rather than added to the motion tokens, whose shared ease is in-out.
- **R2-G5 The phone band replays on a remount.** A swipe or a pick that remounts the card replays its one band. A pick
  to another foil printing is a new card in hand, so that reads right; a re-render that does not remount plays nothing.
- **R2-G6 A cold face that arrives late.** The phone band waits 320ms; if the bytes take longer, the band plays while the
  film is still held and is not seen. Accepted: the film still fades in.
- **R2-G7 Light themes.** The brief asks for a light theme; there is none (R1's G7). All six dark themes are drawn.
- **R2-G8 The finish on the preview and the peek.** Each needs its finish passed beside its art; that is engineering's
  plumbing, with no schema change (`BrowsePrinting.finishes`, the deck's finish read from #1784).
