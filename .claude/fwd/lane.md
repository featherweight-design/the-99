# The 99: lane rules

- First reply: confirm the brief and give your context size.
- Before auditing or building: `git fetch origin` and rebase. A fresh lane once audited a five-day-old checkout.
- Worktrees live under `.worktrees/<branch>`, never on `main`, and never run `gh pr merge --delete-branch` from a worktree. Copy `.env` into a new worktree.
- Scratch DB: name it `scratch-<task>`, 0.25 CU, from local-dev. Pass its URL explicitly to every script, never through `.env`. List it at close for the orchestrator to delete.
- A fork that needs a ruling: report it with options and a recommendation, keep working on the parts every option shares, and never invent UI the boards don't draw.
- At a rotation or account switch: reach a safe point (pushed; not mid-merge, mid-migration or mid-paid-run), then write `~/.claude/projects/-Users-huey-Projects-the-99/boards/handoffs/<lane>-<line>.md`: what's merged, what's open and where it stands, the exact next step, scratch branches, and what a fresh session would get wrong.
- If the orchestrator's "don't merge" arrives after you've merged, report the true state; don't revert without being told.
