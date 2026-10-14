# READINESS — The card mark (R1)

**Self-assessed: 🟢 Green, with one dependency, and it is a data dependency rather than a design
gate.** All four questions §5 leaves open are called. The form was settled with the user across
three rounds of exploration on the canvas; `3d` is the adopted option.

## Read from source, not inferred

The brief was read in full on `main`, and six components at `main`: `ui/card-tile-caption.tsx`,
`collection/grid-view.tsx`, `collection/rows-view.tsx`, `decks/decklist-row.tsx`,
`cards/card-modal.tsx`, `ui/cost-pips.tsx`. Round 0's `HANDOFF.md` supplied the bracket mark's
geometry and palette. **Every geometry figure is quoted from the component that ships it. Where a
component and this handoff disagree, the component wins.**

`design_handoff_the99_card_captions/` is cited for the fixed caption height, the one-slot rule and
call D (nothing on the art). `design_handoff_the99_deck_analysis/` is cited for the bracket mark.
**Neither is reopened.**

## The four calls, all called

| # | Question | Called |
|---|---|---|
| A | The mark itself | **Three solid glyphs — bolt, peak stripped, turn again — bare, in one shared `--fact` ink, with a static glow.** |
| B | Where it appears / does not | **Decklist row, collection row, collection tile, modal, and the key.** Not the art, not a deck tile or band, not Home. |
| C | The modal | **One block, `In the bracket rules`, glyph + the fact's name per line.** No provenance — Round 2 owns it. |
| D | The empty case | **Absence is the design.** No reserved space anywhere. |

## §3's measurement, done before the build

`CONTRAST-the-card-mark.md` has both halves.

- **Contrast:** four grounds × two themes, **weakest 6.7:1** against a 3:1 non-text floor and a
  4.5:1 text floor. The glow is stated as decoration and carries nothing.
- **Distinguishability — the half that actually retired the deck-status marks:** measured against
  seven neighbouring marks. Two independent axes separate the card mark from all of them at once —
  it is **the only uncontained mark** and **the only cool ink** on these surfaces.

## Dependency — the browse list's two joined flags

§4 asks Design whether the mark belongs on collection tiles. **It does**, so the browse list payload
needs `mass_land_denial` and `extra_turn` joined in, with the payload-ceiling arithmetic done in the
Tier B build. `game_changer` already rides the card row everywhere.

**The slip is clean and partial, not blocking.** If the widening lands late, the tile and both
`/collection` views ship with the bolt alone; the other two glyphs arrive later at call sites that
already exist. No form, ink, size, placement or string changes. The decklist row and the modal are
unaffected either way — both read `bracketFlags`, which §4 says is wired.

**What must not happen** is the tile shipping a *different* mark from the row while flags are
partial. One vocabulary on every surface or the vocabulary is worthless.

## Called, not asked — flagged for the record

1. **`#8FA6BE` is a new token and the one thing worth eyeballing in build.** It is theme-independent
   by design (like the WUBRG pips and Round 0's Ignition ramp), and cool because every status ink in
   both themes is warm. **Kaldheim is the check** — the app's only cool accent and the nearest
   neighbour to the ink. Marks and accent elements never sit adjacent, so the risk is tonal, not
   confusable.
2. **No container is a semantic decision, not a stylistic one.** *Boxed means about your copies;
   bare means about the card.* Eng should not "tidy" the mark into the shipped slot box — that
   erases the distinction in one edit and makes it a fourth sibling of `$`, `P` and `short 1`.
3. **One ink for all three, never three inks.** The colour says *a bracket fact is present*; the
   glyph says which. Tinting each fact separately would make colour a carrier and reintroduce
   exactly the six-theme hue problem Round 0 ruled out.
4. **The glow is `filter: drop-shadow`, outside the box model.** It must not become a `box-shadow`,
   a plate, a ring or a pulse. It costs no layout and animates never.
5. **The glyphs are solid, and that is load-bearing.** Mass silhouettes hold at 12px and throw the
   glow off a clean edge; outline versions scatter it through their own gaps and read as blur. Do
   not convert them to strokes to "match" other iconography.
6. **The mark does not grow any row or caption.** Phone decklist row stays 44/52px, desktop 34px,
   both tile captions their fixed heights. `hasMetaLine` gains no clause.
7. **Nothing yields on the tile.** `SET · rarity` keeps its rarity at both widths and the
   availability chip does not outrank the mark. Both yield rules the earlier word-based direction
   needed are **deleted** — if either reappears in build, something has gone wrong with the sizes.
8. **The count moved to the tile's name line.** That is the ordering rule, not an overflow fix:
   copies first, mark last, on every surface.
9. **The tooltip is an enhancement and must not be mistaken for the gloss.** It is absent on touch
   by design. If the key slips and the tooltip ships, the mark is unglossed on every phone — which
   is the retired deck-status design. Key first, tooltip second.
10. **The key must ship in the same release as the marks.** A glyph without its gloss is the retired
   design. All five entries, always, never filtered to what is on screen.
11. **Absence draws nothing at any size** — no dash, no placeholder, no reserved width. §2's
    detection is partial, so a drawn absence would read as a cleared check.
11. **Provenance is Round 2's and this round must not seed it.** The modal block has a heading and
    three possible lines; no slot is reserved, because reserving one designs it.

## The engineering list, in dependency order

| # | Change | Blocked |
|---|---|---|
| 1 | `--fact: #8FA6BE` in all six themes | no |
| 2 | `CardFactMark` — three inline SVGs, size from caller, glow via `filter` | after 1 |
| 3 | `MarkKey` — three entries added | after 2 |
| 3b | Tooltip on `CardFactMark` — positioned element, pointer-fine only | after 2 |
| 4 | `decklist-row.tsx` — inline after the count, both widths | after 2 |
| 5 | `card-modal.tsx` — one block between oracle text and `AvailabilityDetail` | after 2 |
| 6 | `collection/rows-view.tsx` — after the name; one aria clause | after 2, **and the payload** |
| 7 | `collection/grid-view.tsx` — meta line after the chip; count to the name line | after 2, **and the payload** |
| 8 | Browse list payload widened with the two joined flags | no — Tier B |
| 9 | *Severable:* Consider tiles and Add-panel search rows | after 2 |

Items 1–5 are unblocked today and are the whole of the brief's core ask for the deck surfaces.
**Items 6 and 7 should land together** — one collection in two views; shipping the row without the
tile leaves card view the one place in the app where a Game Changer is invisible.

## Not blocking

- **Contrast.** Weakest 6.7:1 against a 3:1 floor. One new token, theme-independent.
- **Legibility floors.** 12px solid glyph at the smallest, on a solid caption plate, never over art.
- **Tap targets.** None added. The mark takes no focus, no tap and no `title`; the hover tooltip is
  a positioned element on pointer-fine devices only.
- **Tooltip copy.** Three sentences, Kitchen Table, each naming its fact and stopping — no
  threshold, no count, no judgement, no provenance.
- **Zero net motion.** Nothing transitions; the glow is a static shadow.
- **Copy.** Three quoted names and one heading. **No new visible words are invented anywhere**, and
  the same three strings serve the key, the modal and every accessible name.
- **Six themes.** One theme-independent ink, drawn on the canvas in both live themes.
- **Density.** Zero added height everywhere; ~18px of width on marked rows only, and on the tile the
  meta line got *shorter* than the earlier direction because the count moved down.
- **The bracket mark.** Four simultaneous axes of difference, drawn together on the one surface that
  carries both.
