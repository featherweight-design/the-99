# Foil treatment: build plan

Handoff: `design/design_handoff_the99_foil_treatment/` (R1, audited GREEN in `READINESS-r1-audit.md`, merged as
#1776). Brief: `docs/superpowers/design-briefs/2026-10-15-foil-treatment.md`.

## Boundaries

One PR, as the handoff's sequencing asks: the change is a CSS block, one attribute on three ring spans and one finish
read, about 20 files with tests. Phone and desktop ship together (the same components draw both).

## Tasks

1. **The CSS block** from the handoff's README §The CSS, unlayered in `globals.css` straight after the art-arrival
   rules, with a comment in the reduced-motion list pointing at it (the band is only ever defined under
   `no-preference`).
2. **A `failed` arrival** (audit ruling G2). `armArtArrival` marks an image that errors `failed` instead of `in`, and
   one already complete with no width (broken before it was armed) `failed` instead of `done`. The CSS keeps the film
   off a `failed` image. In a list the release still waits its turn in the arrival queue.
3. **The pending rule under no-preference** (audit's reduced-motion edge). With reduced motion the art draws as it
   lands, so the film does too; a tile whose art has no source holds the film under either preference.
4. **Collection grid** (`collection/grid-view.tsx`). `BrowseCard.foil` is the drawn printing's finish when every
   copy held of it is foil (or etched), set in `cardArt` beside the art so a pick moves both; absent otherwise, so the
   wire carries nothing for a plain card. The fields batch's `art` carries it with the caption.
5. **Precon open view** (`decks/read-only-card-tile.tsx`): `card.printedFoil`.
6. **Deck Card view** (`decks/deck-card-tile.tsx`). `DeckPrinting.foil` from the printing the deck draws (the deck's
   held pick, else the Collection's: audit ruling G5, "the drawn printing" over "the pin"), owned sources only,
   threaded onto `DeckDetailCard.foil`. Tokens and suggestions never carry it.
7. **Only over art.** Every surface sets `data-foil` only when the card has an image, so no film lies over the
   identity plate or the no-art plate.
8. **Proof.** Component and unit tests for every wiring step, each mutation-checked; `pnpm probe:foil-film` for what
   the CSS draws, state by state, in a real browser against the built stylesheet; `pnpm measure:load` on deployed
   staging, slow profile, Collection and a foil-holding deck, before (on main) and after (once the merge deploys
   to staging, since the harness measures `staging.the-99.dev` alone).

## Rulings carried from the audit

G1 build against the real Avengers Assemble CE deck (fixture for the after measurement where the account holds it);
G2 no film on failed art; G3 accepted; G4 large views are a follow-up; G5 the drawn printing; G6 etched kept; G8 no
grid cue for a mixed holding.

## Not owed

No About entry (cosmetic, the handoff's own lock). No new strings, tokens or dependencies. No Design round.
