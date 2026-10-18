# Gap report · Discovery R2·8 · the ? and its panel and sheet

Table: `docs/superpowers/design-tables/discovery-r2-8-help.md` (148 rows, 18 states). Verified 2026-10-17 by design-review Agent 2 against `src/components/help/`, `src/lib/about/help-panel.ts`, `screen-for-path.ts`, `caption.ts`, `src/lib/discovery/entry-targets.ts`, `src/components/decks/builder-screen.ts` and the shell, nav and builder-shell edits.

**Verdict: 0 visual gaps, 0 state gaps.** All 18 states are reachable.

## Settled

- Row 58, the search icon: the shared `SearchIcon` at 16px, per the #1660 redraw (Hugh's bug batch A item 1), as recorded in `gap-report-discovery-r2-6a.md`.
- Row 62, the clear ✕: `SearchField` keeps it in place with `visibility: hidden` while the field is empty, so the field's width does not move. It is not visible, so it reads as not drawn.

- **Row 61 (input type), on touch only.** The search draws at 15px as drawn wherever a fine pointer is present, and at 16px under `hover: none` (`touch:text-base`). Below 16px, iOS Safari zooms the page when the field takes focus. This is the same rule R2·6a's Reference search ships under, so it is a deliberate platform deviation and not a gap. The desktop measurement is unchanged.

## Notes outside the table

- Focus look: the shared field draws its accent border and ring while focused, even when empty. The table draws no focus state.
- Show me's "in view" is read as registered and drawn on the page. Show me scrolls the control into view before the halo.
- A spaces-only query keeps the resting border and shows no ✕, the same as the Reference.
- Loading and error states (not drawn) keep the head, search and footer with an empty body; an error retries on the next open.
