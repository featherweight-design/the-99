# Gap report — deck details wash

Design source: `design/design_handoff_the99_deck_details_wash`
Property table: `docs/superpowers/design-tables/deck-details-wash.md`
Plan: `docs/superpowers/plans/2026-09-08-deck-details-wash.md`

The verify pass returned twelve findings against the committed property
table. Ten were real and are fixed; two were wrong about the table and are
dismissed with reasons. The confirm pass then found one more instance of an
already-fixed class, which is also fixed. The report closes with the
divergences and the open questions the PR carries.

## Fixed

1. **Desktop status chip geometry (§B8).** `StatusPillBadge`'s `className`
   prop replaces its default class outright and `statusPillStyle` carries no
   geometry, so the chip rendered with neither. Mono 11px, `border-radius: 6px`,
   `padding: 3px 8px` are now restated at the call site.
   `src/components/decks/spine-desktop.tsx`

2. **Mobile status chip geometry (§C8).** Same cause. Mono 10px,
   `border-radius: 6px`, `padding: 3px 7px`, and no text-shadow — the chip
   carries its own opaque plate.
   `src/components/decks/spine-mobile.tsx`

3. **Mobile title shadow (§C6).** Drew `INK_SHADOW`
   (`0 1px 3px rgba(0,0,0,.6)`); the table asks for
   `0 1px 4px rgba(0,0,0,0.85)`. Type over the middle of a photograph is drawn
   against the brightest pixel the crop can put there, not against a portrait's
   flat stop, so the two bands do not share a shadow.

4. **Mobile subtitle shadow (§C8/§C10).** Same value, applied only on the
   wash. Below the divider the row sits on flat ground, takes `--fg-muted`, and
   carries no shadow.

5. **The deeper shadow becomes one exported constant.** `COVER_INK_SHADOW` in
   `src/components/ui/art-wash.tsx`, beside `INK_SHADOW`.

6. **Mobile Save button while saving (§F).** Keyed off `canSave`, which a
   request in flight also clears, so Saving drew as the elevated plate §F
   reserves for Disabled-Save. Now accent at `opacity: 0.6` while pending.

7. **Desktop Save button while saving (§F).** Same defect, same fix, via an
   `inert` boolean (`!canSave && !saving`).

8. **Desktop Save hover.** Gains `var(--accent-hover)`.

9. **Commander hero band clip (§D).** The `aspect-ratio: 1.6/1` band did not
   clip its wash. `overflow: hidden` added.
   `src/components/commanders/detail.tsx`

10. **Commander hero ink shadow** (found by the confirm pass, same class as
    item 5). The hero's name and type line hard-coded the identical literal.
    Both now read `COVER_INK_SHADOW`.

## Dismissed — the finding was wrong about the table

11. **"The mobile rename field's border should vary by state."** §C9 line 246
    fixes it at `border: 1px solid var(--accent)` — one value, no state
    variation. The desktop field varies; the mobile one does not. No change.

12. **"The mobile error row must not be added, it causes reflow."** §C9 line
    251 states the meta row moves below the divider while editing — one row of
    shift, explicitly accepted, and notes that zero reflow is a desktop-only
    claim. No change.

## Divergences from the table — deliberate, recorded here

13. **Desktop band takes `min-height: 168`, not `height: 168` +
    `overflow: hidden` (§B1).** An over-99 deck renders its trim paragraph
    inside this band. Clipping would hide copy rather than art, so the header
    grows for that one state instead. The wash itself still declares 168px, so
    the art is unaffected.

14. **A commander with no `art_crop` draws its identity gradient in the
    ambient layer only (§G line 346 asks for both layers at `opacity: 1`).** The
    sharp layer is a 230px masked copy of the same source; with a gradient
    rather than a photograph it compresses the identical ramp into a narrower
    box and adds a visible seam at the mask edge, for no readability gain. One
    layer is the honest drawing of the same intent.

## Not built — the table says so

15. **No commander (§G line 355) is UNREACHABLE.** `deck.commander_oracle_id`
    is `NOT NULL` (`src/db/schema.ts:185`) and the read never returns a deck
    without one (`src/lib/decks/read.ts:142`). No code was written for the
    state; the table itself marks it unreachable.

## Verification

- `pnpm typecheck` · `pnpm lint` · `pnpm test` — 261 files, 3731 tests, green.
- `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build` — green.
- `node scripts/probe-deck-header.mjs` — a real browser walk at 390×844 and
  1280×800, signed in against the local Clerk dev instance: art URL, band
  height, scrim count, title shadow presence per breakpoint, one bar colour per
  status, the over-99 clamp, and all four rename exits. 0 failures.

  No account here owns a deck past 99, so the clamp was walked by temporarily
  raising one row on a junk probe deck (74 → 105 built) and restoring it
  immediately after. Both edits are recorded in commit `27647ac`.

## Open questions carried by the PR

- `COVER_PLATE` versus `var(--bg)` as the band ground — a Design question this
  plan does not answer.
- Rename has no undo: blur commits, so an accidental commit stands. Design's
  own open item 1.
- Three over-99 presentation choices kept from the shipped build rather than
  redrawn: the `+N` figure stays in the count row, the trim line stays under
  the owned line, and the built figure still recolours to `var(--warning)`
  past 99.
- The rename trigger's accessible name narrowed from
  `Rename deck: ${deck.name}` to a bare `Rename deck`.

VERDICT: 0 gaps remain.
