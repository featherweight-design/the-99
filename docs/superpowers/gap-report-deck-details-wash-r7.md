# Gap report — deck details wash, R7

Verify pass run against `docs/superpowers/design-tables/deck-details-wash.md` plus the R7 drop
(`design/design_handoff_the99_deck_details_wash/`), over the shipped spine components.

**Verdict: 0 outstanding gaps.** One visual gap was found and fixed in this branch; seven rows are
recorded below as deliberate deviations awaiting Design's ratification; one item is copy wording and
belongs to `/copy-review`.

## Fixed in this branch

1. `src/components/decks/spine-desktop.tsx:240,242` — over-99 trim paragraph — `font-size` and
   `margin-top` — canvas state 03 (line 212) draws `11.5px` / `6px`; the shipped code carried
   `12.5px` / `8px` with no divergence recorded anywhere in the handoff. Now matches the canvas.
   This row had never been reached before: the property table does not cover it, and until this
   round no account had an over-99 deck for the browser walk to land on.

   The mobile paragraph keeps its `12px`. No canvas frame draws the mobile over-99 state, so that
   value is unspecified rather than wrong.

2. R7 ruling 3a — the trim paragraph's bold lead no longer takes the status token and inherits the
   paragraph's `var(--fg-body)`, at both widths. Verified in jsdom and on the real surface.

## Deliberate deviations — the mobile rename trigger's size and alignment

Made at the user's direction without a Design round-trip: on the phone the pencil was the only
chrome inside the band, and a bordered fill outweighed the 20px title beside it. The 44px target is
untouched; only the box that drew it is gone. Design should ratify or overturn.

| Table row | Table says | Ships as |
|---|---|---|
| §C7 background | `var(--surface-sunken)` (decision 13) | none |
| §C7 border | `1px solid var(--border-strong)` | none |
| §C7 border-radius | `8px` | none |
| §C7 font-size | `15px` | `17px` |
| §C7 shadow | silent | `COVER_INK_SHADOW` |
| §C6 align-items | `flex-start` | `center` |
| §C6 row contents | title + trigger | a 44px `aria-hidden` spacer, then title, then trigger |

The spacer exists because the row centres its children together: without a counterweight the title
sits half a trigger's width left of the band's centre.

**Correction, made while recording this in the handoff:** the fill's removal contradicts nothing.
The handoff's conflict 5 withdrew decision 13's "opaque fill" outright, and only the summary bullet
still carries the old wording — which is where this table's `§C7 background` row came from. The
size, the spacer and the alignment are the rows Design has genuinely not ruled on.

Unchanged and still matching: the 44×44 target, `var(--fg)` ink, and the always-visible opacity that
§E requires because the phone has no hover.

## Copy item — for `/copy-review`, not Design

The R7 canvas's state 03 sets `trimLead:'Cut five cards'`. The shipped key is
`overCopy.trim.lead`, which renders `'Five over the ninety-nine.'` Wording only; every key the two
surfaces call exists with matching arity, so there is no structural gap.
