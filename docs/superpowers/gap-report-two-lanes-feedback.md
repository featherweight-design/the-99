# Gap report — two-lane feedback pass

Verified against `docs/superpowers/design-tables/commanders-discover.md`, the table this
surface was built to (it accompanies `design/design_handoff_the99_commanders_discover`, R4,
Green). Mobile 390px, desktop 1280px.

Two other tables in that directory, `discovery-controls.md` and `discovery-empties.md`,
describe the pre-two-lane filter bar and page header. They are superseded and were not used.
A first verification pass run against them returned 43 findings that were almost entirely
era artefacts, which is worth recording so the next audit does not repeat it.

## Approved divergences from the table

These are product-owner decisions taken after the table was written, and are not gaps.

1. The `/discover` scope control is deleted. Its two values became order values, so the
   discover order list reads `Best fit · Something new · Popularity · Name · Recently
   released`. Affordances the table describes as switching scope now link to the other lane.
2. The mobile filter sheet no longer duplicates the sort control.
3. The colour control's hint line is removed.
4. The chip row no longer collapses to a `+N` overflow chip.
5. The "no filters, nothing to clear" string is removed.
6. The row hover CTA pill is removed; the whole row is the link.
7. Discover rows are inset from the page edge.
8. Zero states are vertically centred in the region rather than top-aligned.
9. A pending skeleton holds the space during a search lookup.

## Gap introduced by this branch, and fixed in it

**Exclusion line inset twice.** Inseting the rows (item 2) gave the list region its own
horizontal padding, which then applied on top of the padding `ExclusionLine` set on its own
root. The receipt sat at 28px from the viewport edge on mobile and 68px on desktop while
every row it describes sat at 14px and 34px, and its leading diamond no longer aligned with
the end-of-ranking diamond it was built to match. `sm:pt-[14px]` doubled the same way.
`ExclusionLine` has one call site and the region owns the inset, so the fix is to remove the
padding from the line. Fixed in `caf6d4c`.

## Pre-existing gaps, not addressed here

Every item below predates this branch: each one shipped with PR #435 and none is touched by
the twelve feedback items. They are recorded rather than fixed because clearing them is a
larger piece of work than the feedback pass they would be riding in on, and several need a
ruling rather than an edit.

### A drawn state is not drawn

1. The desktop colour-match selected segment is grey (`--elevated` with a `--border-strong`
   outline), where the table specifies a brass fill with a `#14110E` label. This is the most
   visible single divergence in the rack.
2. The order trigger's caret is `--accent` at rest where the table sets `--fg-faint`, so
   every trigger reads as an active state.
3. `filterCopy.match.disabledHint` does not exist, so the sheet's greyed colour-match
   explainer never renders. The table names the key; nothing supplies it.
4. The sheet footer's Clear calls `filterCopy.chips.clear` ("Clear") where the table
   specifies `filterCopy.chips.clearAll` ("Clear all filters"). Both keys exist.
5. `commandersCopy.row.roleCounter` is never called; `role-chips.tsx` hard-codes its labels
   and its `count/target` figure.
6. The search field is filled `--surface-sunken`, the same fill as the rack it sits in. The
   table draws it darker, at `--bg`, so it has ground contrast.
7. The art bleed is 203px at both widths via `ArtWash band={148}`, against 470px desktop and
   268px mobile with two named gradients.
8. Three hover states are unimplemented: the unlit pip's opacity lift, the unselected
   colour-match tint, and the chip dismiss brightening.
9. The sheet footer's primary and Clear are about 44px and unsized rather than 48px.
10. The colour chip collapses to `colour.collapsed(n)` on desktop, where the table wants the
    joined colour names.

### Geometry and token

11. Control-row gap 14px against 10px, and `flex-wrap` where the table says nowrap.
12. Pip wrapper gap 8px against 10px, pip-to-pip 8px against 5px, right padding 16px
    against 10px.
13. The order menu's selected row uses `--elevated-hover`, darker than the unselected rows'
    ground, instead of `--elevated`; its marker is 6px against 7px.
14. Result line 11px flat against 11/11.5px, `--fg-muted` against `--fg-body`, and its aside
    is not colour-separated from the sentence.
15. Sheet radius 16px against 22px, handle 36px against 38px, header count `--fg-body`
    against `--fg-faint`, header `items-baseline` against centre.
16. Discover row padding 24/26px against 13/22px, gap 20px against 14px, rank `--fg-faint`
    against `--fg-body`, identity pips 8px at both widths, ratio track `--elevated` against
    `--border`, popularity and novelty `--fg-body` against `--fg-muted`, the not-owned line
    12.5px `--fg-faint` against 11.5px `--fg-muted`.
17. Role chips `rounded-full` against 6px, `--border-strong` against `--border`, 11px
    desktop against 10px, letter-spacing .05em against .08em.
18. Legend letter-spacing 0.12em against .14em, on both the rack availability legend and the
    sheet section legend.

### Sub-pixel and single-step

19. Search 12.5px against 13px desktop, gap 9px against 8px, mobile padding 10px against
    12px, clear disc 24px against 22px and `--fg-faint` against `--fg-body`.
20. Order trigger 12px against 12.5px, padding 12px against 13px, phone icon radius 8px
    against 10px, label always `--fg`; menu row padding 12px against 11px, gap 10px
    against 9px.
21. Chip row gap 8/6px against 7/7px; Clear 10.5px against 11px, `p-0` against 0 6px/0 4px.
22. Filters button 13px against 13.5px; badge 11px against 10.5px, and its padding.
23. The mobile selected colour-match segment is missing font-weight 600.
24. Zero-state button group `mt-6` against 4px on mobile; body max-width applied only from
    `sm:`.
25. On the greyed colour match the `--surface-sunken` fill lands on the segments rather than
    the wrapper.

### Needs a ruling rather than an edit

26. The table's Mobile and Desktop columns are a 1024px split, but the page header, the zero
    state and the discover row all split at Tailwind's `sm:` 640px. Only the rack and sheet
    honour 1024px, so 640px to 1023px draws the desktop header and rows above the phone
    rack. `sm:` is the codebase's convention everywhere else, so this is a question about
    which breakpoint the table meant rather than a defect with an obvious fix.
27. Dismissing the colour chip resets `match` to `contains`. The table's rule that the mode
    survives its colours is scoped to un-lighting pips, so the chip path may be intended.
28. The lane carries three `aria-live` regions (result line, the view's re-rank and reveal
    announcer, and the sheet's own debounced announcer) against the table's one-per-screen
    rule. Each is documented in code as covering an event the others cannot describe, and
    two of them postdate the table.

## Copy findings

The copy pass over both lanes ran in this branch and is reported in the PR body. Its three
`DEFECT` findings and its one proposal against a merged lock are engineering and design
items respectively, not copy edits, and are listed there rather than here.
