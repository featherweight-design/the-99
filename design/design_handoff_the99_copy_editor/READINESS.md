# Readiness Review — On-page copy editor

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-24
**Plan PR target:** TBD (opens after this handoff PR merges)

## Summary
Every requested state is delivered at phone and desktop, the five locked points are each mapped to the design,
and the four open questions are settled (A). Yellow because the mechanism is engineering's to choose: how
visible text is mapped to a copy key on staging, and how the server-side submit reuses the copy sheet import.

## Per-dimension findings
- ✅ Scope: admin + staging only, visible text only, one tray to one PR; hidden text left to the post-submit review.
- ✅ States: 12 states × 2 widths (`STATES.md`).
- ✅ Rules: the live errors are the import's own refusals (`docs/agents/copy-sheet.md`), so client and server agree.
- 🟡 Data: text to key matching (templates, plurals, a text shared by two keys) needs a plan; Q1 sets the UI for the shared case.
- 🟡 Submit: needs a server path that runs validate + land and opens the PR on staging with a GitHub token; the import today runs from a checkout.
- ✅ Codebase fit: app tokens only; the staging dot reuses the admin head chip's `--warning`.
- ✅ Copy: `copy strings.ts`, no em dashes or exclamation marks in the UI's own strings.
