# Gap report — Type ▾ on the shared FilterPanel (#100)

Property table: `docs/superpowers/design-tables/collection-filter-panel.md` (follow-up spec, lines 656–690).
Implementation: `src/components/ui/filter-panel.tsx`, `src/components/collection/filter-bar.tsx`,
`src/lib/collection/type-filter.ts`, `src/lib/copy/collection.ts`.

## Verify pass — 8 findings

| # | Gap | Disposition |
|---|-----|-------------|
| 1 | Type popover width 340px; design says 300px, and the width also feeds the viewport-overflow math | Fixed |
| 2 | Scroll-cue gradient rendered unconditionally, including on a list that does not overflow | Fixed |
| 3 | `footerStatus={false}` honoured on the desktop popover only — the mobile sheet still showed "N cards" | Fixed |
| 4 | With no search field the options listbox was unreachable by Tab (`tabIndex` -1, absent from the focus trap) | Fixed |
| 5 | Space/Enter with no active row fell through and scrolled the page behind the panel | Fixed |
| 6 | Design draws ~14 card types; the app ships 7 | Deferred — design/product question, escalated on #100 |
| 7 | Sort ▾ pill chrome differs from the drawn filter button by 1–2px on mobile | Deferred — resolves when Sort ▾ converts |
| 8 | Sort ▾ still a native `<select>` | Deferred — Sort is specced as a separate `role="menu"`, and the drawn option list silently drops the shipping rarity/color sorts. Three options posted on #100, awaiting a Design answer |

Each of the five fixes is mutation-proved: the guarding test was confirmed to fail when the fix is
reverted, in `src/components/ui/filter-panel.test.tsx`.

## Confirm pass

All five re-checked against the implementation.

**VERDICT: 0 gaps remain.**

The three deferred items are called out in the PR description; none of them is a regression against
what shipped before this change.
