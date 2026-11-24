# Readiness Review · Quiet Home (Finding the tools addendum R1)

**Verdict:** 🟢 Green
**Audited:** 2026-11-24 (against `origin/main` at 1871a0a)
**Related:** addendum to `design_handoff_the99_tool_discovery` (R8 placement of What's new)

## Summary

Layout-only change to two shipped components; `scratch-gen/proposal.diff` applies cleanly to main. No data, copy, route
or flag changes. Every state it names is decided from props `Dashboard` already receives (`tables`, `logGames`,
`feed.lead`).

## Findings

- ✅ Scope: desktop and tablet landscape (from 1180). Below 1180 unchanged by construction (`order` classes unchanged).
- ✅ Data: no new reads. `heads` uses `tables`, `logGames`, `lead`, all already in props.
- ✅ Components: `FeedItemRow` already supports `compact={false}` (the wide layout below 1180); `WhatsNew` gains a `wide` prop.
- ✅ Copy: none new; no em dashes.
- ✅ Focus: the lead's ✕ hands focus to What's new's first row (`nextDismiss`); that still works with What's new in the main column (DOM order: lead, decks, What's new).
- 🟡 Tests: `dashboard.test.tsx` and `dashboard-feed.test.tsx` should gain quiet / one-card / busy placement cases.
