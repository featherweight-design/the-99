# READINESS · History in local time (R1, #2986)

**Verdict: Green.** R1 approved by Hugh 2026-11-18. Display-only change to `history-view.ts`, `history-list.tsx`, the revert confirm's `when` and the history copy, plus a `tz` cookie for the server render; no schema change.

- Q1 Weekday headings for 2 to 6 days ago (`Monday · Nov 16`). Ruled as drawn.
- Q2 Older rows show the clock time, not relative days. Ruled as drawn.
- Q3 Other UTC date helpers (collection head `last updated`, date-figure, tuning note dates, decks/format, format/when) are out of scope: follow-up issue.
- Q4 Copy is DRAFT: run /copy-review on `revertedBy`, `weekday`, `justNow`, `minAgo` before shipping.
- No hydration warning: zone from the `tz` cookie (validated with `validTimeZone`); without it, render the time slot and headings after mount; 12/24 h is the browser locale's.
- Tests pin America/Denver with an entry at 06:40Z (Yesterday, 11:40 PM), a DST change and another-year date.
