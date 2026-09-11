# Design Brief — One filter chassis

**Workshop:** 2026-09-11, Hugh + agent. No ticket — scoped from a direct request ("consistent
filters throughout the app"). This brief is the source of truth the Claude Design handoff prompt
points at.

**Verified against `origin/main` at `a461112` on 2026-09-11.** Every `file:line` below was read on
that commit, not recalled.

The app ships three filter surfaces that were designed independently and look it. They disagree on
chassis, on where the controls sit, on what a colour selector looks like, and on whether filtering
costs you horizontal room. This brief asks for one chassis that all three mount.

---

## §1 The three surfaces, as they stand

| Surface | Chassis | Dimensions | Colour control |
|---|---|---|---|
| `/commanders` | Horizontal rack, mobile sheet — `src/components/commanders/rack/filter-rack.tsx:37` | search, colour, availability, order | `rack/colour-control.tsx:27` |
| `/decks` | **Desktop sidebar column** + mobile sheet — `src/components/decks/deck-filter-column.tsx:135`, `deck-filter-sheet.tsx:114` | search, status, colour, played-window, sort | `deck-filter-column.tsx:107` (`ColourSwatch`) |
| `/collection` | Horizontal bar — `src/components/collection/filter-bar.tsx:58` | search, Type, Set, Color, Sort, view toggle | `collection/color-pip.tsx:5` |

**Three colour controls for one concept.** That is the clearest evidence the surfaces were never
designed as a system.

**The `/decks` sidebar is the layout cost.** It is the only surface that spends horizontal room on
filtering, and it spends it on the surface whose content — deck art — most wants the width.

---

## §2 Decisions locked in the workshop

1. **A new chassis, drawn for all three.** Not an adoption of the collection bar or the commanders
   rack. Both were considered and rejected: the bar is a working answer but was drawn for a
   different surface's dimensions, and the rack trades away the horizontal room `/decks` needs.
2. **Shared chassis and shared controls; per-surface dimensions.** The three surfaces genuinely
   filter different things — status and played-window are deck-only, Type is collection-only. The
   consistency being bought is the frame, the control vocabulary, the panel behaviour and the sort
   affordance, not a forced-identical dimension set.
3. **Set filtering comes to `/commanders`.** The one dimension being added rather than rearranged.
4. **The `/decks` sidebar goes.** The width it returns belongs to deck art. See the sibling brief
   `2026-09-11-one-commander-image.md`, which spends it.
5. **Real mana symbols replace the abstract swatches.** The Mana font / Scryfall symbol SVGs, not a
   custom-drawn glyph set. Recognisability beat bespoke: these are the symbols the player already
   reads on the cards in their hand.

## §3 What Design is being asked to call — open

- **§3.1 The chassis itself.** Where the frame sits relative to content, how a dimension opens, what
  an active filter looks like at rest, and how the whole thing collapses on a phone. This is the
  substance of the handoff.
- **§3.2 Density at five dimensions.** `/decks` carries the most (search, status, colour,
  played-window, sort). If the chassis reads well there it reads everywhere; the brief asks Design to
  draw `/decks` first and prove the others against it.
- **§3.3 Result and clear affordances.** `/commanders` has `rack/result-line.tsx`; the other two do
  not state their result count the same way. One answer, applied three times.
- **§3.4 Whether sort belongs in the chassis at all.** Sort is not a filter. All three currently mix
  them. Design may separate them or keep them together, but the same answer has to hold on all three.

---

## §4 Constraint — the symbol glyphs have a shipped precedent, and it is not a font

The set-collections handoff (`design/design_handoff_the99_set_collections/`, 🟢 Green, audited
2026-09-11) hit exactly this problem with set icons and its readiness audit settled it:
`svgs.scryfall.io/sets/*.svg` is a bare `<path>` with no `fill`, so it renders black on every theme.
The resolution recorded in `docs/superpowers/readiness-set-collections.md` finding 1 is `mask-image`
with a token background.

**Mana symbols inherit that ruling.** Design should draw the pips as token-coloured masks, not as
inline art with baked fills, or they will be black in all six themes. The colour a pip carries is a
`var(--*)` value like every other ink in the app.

---

## §5 Dependency — set collections is already extracting the colour filter

`docs/superpowers/readiness-set-collections.md` finding 2 records that `filter-bar.tsx` builds the
desktop pip row inline and the mobile Color panel separately, and that the set-collections build
must extract a parameterised colour control to mount it on a second surface.

**That build goes first.** It is Green and planned (`docs/superpowers/plans/2026-09-11-set-collections.md`)
while this brief is not yet drawn. The extraction it performs is the first shared control; this
chassis then adopts and replaces it rather than racing it. Design does not need to design around
this — it is an engineering sequencing note — but the extracted control is the thing Design's colour
treatment lands on.

---

## §6 Out of scope

**`src/components/ui/cost-pips.tsx` is not in this handoff.** It draws mana cost on decklist rows and
card rows as coloured circles with numerals, and it is being worked in a separate track. Whether the
cost pips adopt the same symbol glyphs is a real question and a good one — it is deferred so the two
tracks do not collide on one file. Design should draw the filter pips as if that answer will
eventually be yes, so the two can converge without a redraw.
