# Readiness audit: foil treatment R1

2026-10-15, audited by engineering (session the-99-32) on the handoff rebased onto `main` (`457e5dcb6`). This was
done independently of the handoff's own READINESS.md: every claim below was read off the README, the states doc and
the canvases, then checked against `main`.

## Verdict: GREEN

Every lock in the brief (`docs/superpowers/design-briefs/2026-10-15-foil-treatment.md`) holds, and every open call is
answered. Each remaining gap is either engineering's to resolve or a small ruling logged below. No gap needs Design.

## Locks

| Lock | Handoff | Holds |
|---|---|---|
| Only copies actually foil | `data-foil` is set only from owned finishes. Never on suggestions or tokens, nor on a printing that merely exists in foil (README §The calls 6, §Where each surface reads) | yes |
| The deck-tile rule | "owns at least one copy of the printing the tile draws and every owned copy of it is foil". Foil plus etched counts as mixed, with no film. The brief said "pinned printing", and the handoff widens that to the drawn printing (G5) | yes, ruled below |
| No new downloads | gradients only, no image | yes |
| No per-tile JS loop, filter or backdrop-filter | one CSS block. The sweep is `transform` on `::after` and plays only on the hovered tile, fine pointer only | yes |
| Reduced motion means static | the fade and the sweep exist only under `prefers-reduced-motion: no-preference` | yes |
| Reduced transparency and forced colors | reduced transparency: the film and band go, and the ring becomes `inset 0 0 0 2px var(--fg-muted)`. Forced colors: hidden | yes |
| 200 tiles | argued in the README, not shown, which a canvas cannot do. Proved at build with `measure:load` on a large grid, before and after | engineering |
| Waits for the art; none on no-art tiles | hidden while `img:not([src])` or `data-arrival="pending"`, and no `data-foil` without art. One hole: G2 | yes, G2 below |
| Corner matte | the film is the ring span's `::before`/`::after` with `border-radius: inherit` | yes |

## Open calls (brief §Open)

| # | Call | Answer |
|---|---|---|
| 1 | Static or animated | static film at 115°, arriving with the art (`art-in`, 300ms) |
| 2 | Hover and tilt | one `::after` sweep on `:hover` or `:focus-visible`, 640ms, fine pointer; no tilt, no pointer-following |
| 3 | Phone | static only |
| 4 | Intensity per theme | one recipe for all six themes (all six are dark chrome, which is verified in `globals.css`); the reduced-transparency fallback is the 2px `--fg-muted` edge |
| 5 | Etched | a cooler, flatter silver film with the same sweep (G6) |
| 6 | Mixed finish | no film, no partial |
| 7 | Large views | not this round (G4) |

## States and themes

Every state the brief listed is drawn at both widths, except where a width cannot have it. Hover does not exist on a
phone. No-art, "no longer foil-only" and art-failed are drawn at desktop alone, and they are width-independent rules.

The six themes (amonkhet, kamigawa, ixalan, phyrexia, eldraine, kaldheim) appear as a foil-beside-plain strip on all six
surface boards, Deck, Collection and Precon at desktop and phone, and their hex values match `globals.css` exactly.
Every other state is drawn in Kaldheim. That is enough: the film paints on the card art, which is the same in every
theme. The one themed value, the reduced-transparency edge, is `--fg-muted`, which all six themes declare.

The Collector's Edition grid is drawn as one screenful (18 tiles at 1300, 4 at 390), not as 100 tiles. The rest of the
100 is the same tile repeated, and the cost is measured, not drawn.

## Tokens and components

- **Existing on `main`:** `--motion-fade` (300ms), `--motion-ease`, `--motion-duration` (320ms, ×2 = 640ms), `--fg-muted`
  in all six themes, `@keyframes art-in`, `data-arrival` `pending`/`in`/`done`, and the ring span on every tile.
- **New:**
  - the `data-foil="foil" | "etched"` attribute;
  - `@keyframes foil-sweep`;
  - the CSS block;
  - a `failed` arrival value (G2).

  No new component, and no copy (`foil-treatment · copy strings.ts` exports `{}`).
- **CSS order:** the block must be unlayered so its reduced-transparency `box-shadow` beats the ring's Tailwind
  `shadow-[…]` utility. Tailwind 4 utilities are layered.

## Gaps and rulings

Rulings are logged here because Hugh is away. Each has one defensible answer.

- **G1, the placeholder fixture.** Engineering: the build proves against the real Avengers Assemble CE deck on
  staging.
- **G2, art that fails to load.** Engineering:
  - `armArtArrival` marks an errored image `in`, so the film would paint over bare ground.
  - **Ruling:** no film on art that failed. The arrival mark gains `failed` on an `error` event, and the CSS hides the
    film for it.
- **G3, leaving mid-sweep snaps.** Accepted as drawn.
- **G4, large views.** A follow-up, outside this line.
- **G5, the drawn printing rather than only the pin.** **Ruling: accept.**
  - The tile shows the drawn printing, so foil should describe that printing.
  - A deck with no pick then behaves as Collection does.
  - A CE start pins every card, so Hugh's case does not change.
- **G6, etched.** **Ruling: keep.** It is one CSS rule, and staging has 0 etched rows, so it costs nothing until a copy
  exists. Dropping it would draw an etched copy as plain foil, which the brief ruled out.
- **G7, light themes.** Not applicable: there are none.
- **G8, no grid cue for a mixed tile.** **Ruling: none.** The brief locks the sheen to copies that are all foil. The
  count stays in card details (`×3 · 1 foil`).
- **A reduced-motion edge** (found in this audit). Under reduced motion `main` does not hide `pending` art, but the
  handoff hides the film while art is `pending` under any motion preference. So a landed image whose queued release is
  still pending shows briefly without its film. Engineering: scope the film's pending rule to
  `prefers-reduced-motion: no-preference`, matching the art.

## About

None: the change is cosmetic (the brief's decision, and the card-captions precedent).
