# Gap report: source picker and limit box restore (item 8)

Boards: `design/design_handoff_the99_small_items_4/Other-Decks.dc.html` (`.pbt`, `.pop`, `.sh2`, `.gr`, `.scrim2`, `.lim`), `design/design_handoff_the99_suggested_changes_v2/Intake.dc.html` (`.lim`, `.box`, `.cv`).

Enumerate and verify ran as one audit pass (board CSS against `pull-control.tsx`, `tuning-limits-box.tsx`, `filter-panel.tsx`, `anchored-panel.ts`, `sheet.tsx`). Confirm pass: 12 of 12 fixed, 0 gaps remain.

| # | Element | Property | Board | Was | Now |
|---|---|---|---|---|---|
| 1 | Pull trigger | label to chevron gap | 6 | 8 | 6 |
| 2 | Pull trigger, open | border | --accent | --border-strong | --accent |
| 3 | Popover | radius | 12 | 10 | 12 |
| 4 | Popover | shadow | 0 18px 44px .55 | 0 22px 50px .6 | board |
| 5 | Popover | gap below trigger | 6 | 4 (>=640px) | 6 |
| 6 | Sheet | top radius | 18 | 16 | 18 |
| 7 | Sheet | background | --surface | --surface-rail | --surface |
| 8 | Sheet | shadow | 0 -18px 44px .5 | 0 -20px 50px .5 | board |
| 9 | Sheet | scrim | rgba(8,6,4,.45) | --bg 72% | board |
| 10 | Sheet | insets | 8 / grabber / 12, 16 sides, 28 bottom | 9 / 4 + 14, 16, 16 | board |
| 11 | Sheet | first focus | the list's radio | the head's card name | the checked radio |
| 12 | Set field | gap, chevron ink | 6, --fg-faint | 8, --fg | 6, --fg-faint |

All overrides are picker-local; `ANCHORED_PANEL_CLASS` and `sheet.tsx`'s defaults are unchanged for their other callers.

## Kept on purpose (ruled 2026-10-30 by the orchestrator)

- Cap input stays 16px on phones (14px at md with a fine pointer): the board's 14px would let iOS Safari zoom on focus (#2036). Logged as Design errata.
- Cap placeholder stays `var(--fg-placeholder)`: the board's `#6E6654` is that token's fallback, and the token carries the #1763 contrast fix.
- "Include my other decks" keeps copy-review's #2413 wording.
- The Set field's open-state accent border and chosen-set chips stay: the board does not draw those states.
