# PR 4's doc surface, inventoried by grep — not by reading

Done while blocked on #700 round 3. The point is to know PR 4's real size before opening it,
because an unaccounted 600-line property table is how a PR crosses the size gate by surprise.

## Only ONE property table is in scope

`check:copy-drift` reads `docs/superpowers/design-tables/*.md` and nothing else — merged
plans and point-in-time reports are records of their date, and `design/` handoffs are
somebody else's document (pr-review: findings on a handoff are not findings). So:

- **`docs/superpowers/design-tables/discovery-rows.md` — 631 lines, IN SCOPE.** The commander
  row's property table, and it describes the retired composition in detail.
- `deck-import.md` and `add-panel-addendum.md` also match "not in your collection" — **out of
  scope.** Those are other features using the same phrase for their own surfaces. Retiring
  `discoverCopy.row.notOwned` does not retire the phrase from the corpus, which is why the
  drift risk is narrower than a bare grep suggests.
- The `design/design_handoff_the99_commander_row/` files quote it too and are **not edited** —
  reference material, and the R1 canvas is the record of what Design decided.

## What in `discovery-rows.md` describes surface that is going away

Section headings, from its own structure. Fourteen of the twenty-four sections are about
slots this PR deletes:

| Section | Fate |
|---|---|
| Container context — row shell | **keep** — the shell is unchanged |
| Container context — evidence column (grid col 3) | delete — the column goes |
| Container context — fit column (grid col 4) | rewrite — becomes the figures slot |
| Justification slot (fit) — wrapper, label, overlap track, track fill, sentence | **delete all five** |
| Justification slot (novelty) — wrapper, label, sentence | **delete all three** |
| Ranking figure (fit) — numerator, unit, layout, column label, full-width track | delete four, keep the Fit chip's own |
| Ranking figure (novelty) — numerator, unit, track, floor note | **delete all four** |
| Ownership pip | keep the pip, delete the ownership reading |
| Ownership clause | **delete** — ruling D1 cuts it |
| Price slot | **keep, unchanged** |

Plus the copy-key mapping table around lines 505–520, which names `justify.floorNote`,
`justify.floorNoteShort`, `overlapShort`, `ownedShort`/`unownedShort` — every one retired.

## The approach, decided now rather than mid-PR

**Replace the row-composition sections wholesale** with the handoff's §A–F five-state table,
rather than editing twenty-four sections row by row. The property tables ARE the spec someone
implements from, so a table half-describing two compositions is worse than either. The
sections that still hold — row shell, art wash, pips, price slot — are kept verbatim.

## Size consequence, stated before opening

PR 4 was already going to be large, and this is ~200 more lines of prose churn on top. It is
**prose, which the size gate excludes from its runtime-line count** — so it will not push the
gate over on its own, but it is real review surface and real time.

This does not change the decision to merge 4a and 4b: the deletions are what make the
additions reviewable. It does mean PR 4 should open with its own size accounting in the body,
so the reviewer knows the shape before reading.

## Two strings that are NOT retired, and were nearly assumed to be

- `discoveryCopy.untagged.heading` / `.body` — the `No tag data` note. It **survives** and
  becomes the gap slot's third occupant. The handoff records it in the reuse manifest, not the
  retirement list.
- `commandersCopy.row.fitDenominator` / `fitDenominatorMeasurable` — reused unchanged, which
  is what makes the `40/40` ruling need no new string.
