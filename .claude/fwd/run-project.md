# The 99: run-project rules

## Standing subagent grant (HUGH TO CONFIRM)

The user grants the orchestrator standing permission to dispatch subagents for the run-project §1 subagent work, without asking each time: audits, research and pipeline maps, plan and spec builder-checks, pre-open and plan reviews, read-only data measurement, and drafting docs that a lane then PRs. This is in addition to the existing pr-review §10b pre-open grant in AGENTS.md. Paid model calls, writes, and anything that starts new work still need the user's yes.

## Lanes

- Lane cap (HUGH TO CONFIRM): `maxLanes` 4. The 99 ran 6 at once on 2026-10-27/28, and the overhead (relays, migration-number collisions, rotations) showed. 3–4 is the sweet spot.
- Model mix: Opus for multi-PR lines (a feature line, a design-handoff build, anything with migrations or money). Sonnet for bounded single-PR tasks (a perf fix, a copy fix, a config pin).
- Rotate at about 300k context at a PR boundary, with a handoff in `boards/handoffs/`. Ask each lane for its context size when it starts and at each merge.
- Two lanes touching the same files: tell each one about the other's branch, agree who rebases, and number migrations and the plan's "product calls" so they don't collide. Check `origin/main` for the migration number right before a merge.

## What goes to a lane in The 99

Anything that owns a PR through Copilot review rounds (often 3–9 rounds over hours), CI, a staging sync or workflow dispatch, or a production copy job. Everything else is a subagent.

## Spend

Every paid run has a hard dollar cap enforced in code and a dry run first, and it needs the user's approval with cause, alternatives and an estimate. Use the Batch API and copy-from-staging patterns where they fit.
