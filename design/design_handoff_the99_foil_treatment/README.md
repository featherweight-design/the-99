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
