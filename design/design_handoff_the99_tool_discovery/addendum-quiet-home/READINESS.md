# Readiness Review · Quiet Home (Finding the tools addendum R1)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-23 (cold read, against `origin/main` at 1871a0a; this branch is not behind main)
**Related ticket(s):** Design PR #3269; addendum to `design_handoff_the99_tool_discovery` (R8 placement of What's new, PRs #3255 and #3263)
**Plan PR target:** `docs/superpowers/plans/` (one small PR: two components and their tests)

## Summary

A layout-only change to two shipped components. `scratch-gen/proposal.diff` dry-run applies cleanly to current main; no data,
copy, route, flag or schema change; every input (`tables`, `logGames`, `feed.lead`, `feed`) is already a `Dashboard` prop. It
is buildable as drawn. Four eng-side clarifications for the plan, none needing Design. This replaces the earlier
self-audit (Green) at this path: the difference is that two existing tests will fail, not merely need additions.

## Per-dimension findings

### 🗺️ Scope clarity

- ✅ Boundary, the count rule, the two settled questions (Q1 A, Q2 A), non-goals (arrivals banner, welcome credits, signature ask not counted) and the seen-but-out-of-scope 392px cap are all stated.
- ✅ Another lane is building R12 on `HomeSearchPanel`; R12's files are `home-search-panel` and the tools surfaces, not the `Dashboard` column wiring. Low conflict risk; whichever merges second rebases (the `dashboard.tsx` hunks are the rail condition and one new line).

### 🎭 State coverage

- ✅ Quiet, one card, busy, nothing-new, dismissed-in-visit and below-1180 are tabulated in `STATES.md`; 1300 and 1180 drawn.
- 🟡 Rail-empty (quiet, `commitments === null`, no `friends`) is "not drawn". Reachable (availability read fails and Friends is off). The rail is then absent and the main column takes the full width.
- ✅ Phone unchanged by construction (`order-1`/`order-2` untouched; `compact={false}` is the same class set as `compact="rail"` below 1180).

### 🔌 Data contract

- ✅ No new read. `heads = tables.length + (logGames.length > 0 ? 1 : 0) + (lead ? 1 : 0)` uses props already on `Dashboard` (dashboard.tsx lines 146-152); `quiet` needs `feed`, so a Home without direction B is untouched.
- ✅ Decided from server props at load; no client state.

### 🧱 Codebase fit

- ✅ `FeedItemRow` already takes `compact={false}` (wide layout from `md`); the only new API is `WhatsNew`'s `wide` prop. No new token, string or component.
- ✅ Heading id `home-whats-new`, `data-whats-new` and `data-dismiss-scope` are unchanged, so the dismiss scope (`div[data-dismiss-scope]` wraps both columns) and the lead's focus handoff keep working in DOM order lead, decks, What's new.
- 🟡 Existing test `dashboard-feed.test.tsx` "draws What's new directly under the lead and before the decks (G16)" renders a lead-only Home (heads = 1, so quiet) and asserts What's new sits inside the 316px rail. It fails after this change; it must be rewritten, not just joined by new cases.
- 🟡 Two dashboard.tsx comments go stale (props doc at lines 54-55, column comment at lines 265-268 "What's new ... Friends, Commitments"): update with the build.

### ♿ Cross-cutting

- ✅ Accessibility: reading order improves (What's new follows the decks rather than trailing the whole main column); focus handoff holds (above).
- ✅ Performance: no extra work; one element renders in one place.
- ✅ Analytics: `feed_show_all` and the other feed events are unchanged; nothing new to record.

### ⏰ Drift from reality

- ✅ `dashboard.tsx` and `whats-new.tsx` last changed in #3261 and #3255, both in the proposal's base; the patch applies with no offset trouble. Files, props and class names it names all exist.
- ✅ No migration. No flag (rides the existing direction B `feed`).

### 📝 Decision log

- ✅ Q1 and Q2 settled with the declined alternatives named (`Main.dc.html`). Approved by Hugh 2026-11-24 per the handoff.

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

- Item 1: Rewrite the G16 placement test in `dashboard-feed.test.tsx` for a busy Home (two heading cards, What's new in the rail, order below 1180), and add cases: no cards (quiet, in the main column after the resume block, `wide` rows), exactly one card (lead only; one table; game to log only), two tables, and rail-not-drawn when quiet with no Commitments and no Friends. `whats-new.test.tsx` gets one `wide` case (rows lack the `max-[1179px]` rail classes).
- Item 2: Rail-empty at 1180+: follow the drawn quiet pattern (What's new fills the main column, wide rows, no extra cap); the search panel keeps its own 720px cap. The plan records this as the decision.
- Item 3: `heads` counts each open table, one for any number of games to log, one for the lead, exactly as `README.md`; a held spare-request receipt that displaces the lead into the rows does not change the count (the count is read from props before the hold).
- Item 4: Refresh the two stale comments in `dashboard.tsx` named above.

## Decisions inherited

- Q1 A: quiet What's new goes under Pick up where you left off (not above the decks).
- Q2 A: quiet means fewer than two heading cards (tables each, game to log, lead).
- Decided on load; dismissing the lead or the log card in a visit does not move What's new.
- Below 1180 unchanged; busy days (two or more) unchanged; no new or changed copy; no About entry.

## Build footprint

`src/components/home/dashboard.tsx`, `src/components/home/whats-new.tsx`, `src/components/home/dashboard-feed.test.tsx`, `src/components/home/whats-new.test.tsx` (and `dashboard.test.tsx` only if a case there asserts the rail with a lead). No migration.
