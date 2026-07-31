# Gap Report — Printing Picker (#105)

Source of truth: `docs/superpowers/design-tables/collection.md` §`Component: Printing Picker (#105)`,
derived from `design/design_handoff_the99_printing_picker/README.md` (R3, 🟢 Green).
Produced by the design-review skill, Agent 2 (verify).

## IMPLEMENTED

Verified row-by-row against the property table; all matched unless listed under GAPS.

- Set field, desktop collapsed — bg/border/radius/padding/margin, label + value lines, both hint variants [card-modal.tsx:581]
- Set row, mobile — 62px min-height, 40×56 thumb, expanded top-only radius [card-modal.tsx:621]
- Region container — mobile continuation panel (dashed, `-mt-px`, 14px) vs desktop block (24px top rule) [printing-region.tsx:232]
- Region intro + reset link, gated on a stored pick [printing-region.tsx:238]
- Tile grid — 3 columns, gap 12 / md:16, 16px top margin [printing-region.tsx:332]
- Tile art — 63:88, radius 10, inset shadow, identity-gradient fallback, all four outline states at offset 3 [printing-region.tsx:428]
- Tile badge — 21px picked / 19px shown-now / 19px dormant, exact fills and glyphs [printing-region.tsx:459]
- Tile caption — set name, `entryMeta` with the collector number omitted on a bare import, badge line [printing-region.tsx:486]
- Foil sheen gradient, clipped to the art radius [printing-region.tsx:448]
- Dormant note — fill, border, radius, diamond, forget link [printing-region.tsx:258]
- Overflow affordances past 12 — search, finish chips (etched folded into foil), set headers, release-desc grouping [printing-region.tsx:286]
- Mobile compact art header — 72px art, name beside it, `aria-hidden` with the h3 retained [card-modal.tsx:234]
- Copy — every rendered string resolves through `printingPickerCopy.printing`, verbatim
- Accessibility — radiogroup semantics, decision-10 nothing-checked, roving tabindex, non-wrapping arrows, Home/End, dormant excluded from navigation, Escape collapse-then-close with focus return, exactly one live region

## GAPS — all closed in f69eda3, confirmed 0 remaining by Agent 3

1. Foil sheen has no `pointer-events: none`, so the overlay can swallow pointer events on the art — printing-region.tsx:449
2. Tiles fall below the ≥100×140 floor on a 375px viewport (≈94×131) — the table's "~101px tiles" note assumes ~26px less chrome than the modal actually has — printing-region.tsx:332
3. `"Set"` and the `▾`/`▴` chevrons are inline literals, against "no string literals in the components" — card-modal.tsx:541, 591, 648
4. `role="radiogroup"` and the `aria-controls` target id sit on an inner div rather than the region container — printing-region.tsx:321
5. On an empty search the id disappears entirely, leaving the expanded trigger's `aria-controls` dangling — printing-region.tsx:305
6. `compactArt` counts `card.printings.length` while the region's overflow counts entries including the dormant tile, so at exactly 12 owned printings plus a dormant pick the region overflows but the header does not compact — card-modal.tsx:136

## DEFERRED

None.

## FOR DESIGN TO RATIFY

- **The dormant tile bypasses the search box and the finish chips.** The design table binds the
  dormant tile and its note to one condition (row 2217 — a stored pick the collection no longer
  contains) and says nothing about how it behaves under the overflow filters. It owns no finishes
  and matches no query, so every narrowing would drop it and strand the dormant note above a grid
  the tile had vanished from. Eng resolved it by exempting the tile from both predicates and
  counting it inside every finish chip, so a chip label still equals the tiles it reveals. This is
  an eng reading of row 2217, not an explicit Design ruling — please confirm or overrule.

## DEVIATIONS FROM THE PLAN (ratified in implementation)

- **Tier 0 lives in `primaryPrinting`, not `resolveImageUri`.** The spec's literal instruction to make
  `preferredImageUri` the first arm of `resolveImageUri` is wrong for this codebase: `resolveImageUri`
  runs once per printing row to compute *that row's* own art, so a tier-0 arm there would paint every
  tile in the picker with the chosen printing's image. `resolveImageUri` keeps its three shipped tiers
  and the preference is applied where the card's representative printing is selected. Behaviour at the
  card level is identical; the picker is correct only this way.
