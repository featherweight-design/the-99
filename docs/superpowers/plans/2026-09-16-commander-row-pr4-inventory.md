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

## Size consequence, and where this rewrite actually lands

**The table rewrite goes in its own doc-only PR, not in PR 4.** Superseding this section's
earlier conclusion, which assumed it rode along: doc-only PRs merge in one round by policy, so
moving ~200 lines of prose out of PR 4 buys a smaller review surface for one cheap round. A
property table is a spec, so it legitimately precedes the code it specifies — and correcting a
table early is safe, because `check:copy-drift` only fails on tables quoting strings the code
has STOPPED emitting, never on tables describing code not yet written.

That is consistent with, not contrary to, the decision to build the row as ONE PR rather than
4a + 4b. Two separate calls: the row's CODE is not split, and the TABLE is not part of it.

## Two strings that are NOT retired, and were nearly assumed to be

- `discoveryCopy.untagged.heading` / `.body` — the `No tag data` note. It **survives** and
  becomes the gap slot's third occupant. The handoff records it in the reuse manifest, not the
  retirement list.
- `commandersCopy.row.fitDenominator` / `fitDenominatorMeasurable` — reused unchanged, which
  is what makes the `40/40` ruling need no new string.
