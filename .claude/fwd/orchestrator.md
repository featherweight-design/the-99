# The 99: orchestrator rules (add to the fwd `orchestrator` skill and win on conflict)

## Where things live

- Boards are local and private, never in the repo: `~/.claude/projects/-Users-huey-Projects-the-99/boards/`.
  - Ruling log: `boards/overnight-2026-10-09.md`. It's append-only. Each entry is one dated bullet saying what was decided and by whom. A call the orchestrator makes inside approved scope ends with "Decided, override if you disagree."
  - Priorities: `boards/priorities.md` (ranked list plus Candidates). The user's to-do list: `boards/hugh-todos.md`.
  - Design prompts: `boards/design-prompts-2026-10-18.md`, open prompts only. Answered ones move to `boards/design-prompts-archive-2026-10-21.md` with the PR that answered them. Small items wait under "Notes for Design, not yet sent".
  - Handoffs (lane rotations and account switches): `boards/handoffs/<lane>-<line>.md`. The orchestrator's own is `boards/handoffs/d9-orchestrator.md`.
- Never cite a boards path in anything Design or GitHub reads. Design reads GitHub only, and a pushed branch plus its PR number is enough. Before relaying a Design prompt, check every path in it with `git cat-file -e origin/<ref>:<path>`.

## Design routing (pre-launch rule, from 2026-10-27)

- Most UI changes go to Design, even small ones: placement, a new control, a sheet, a layout tweak, a loading or empty state.
- Engineering alone handles only logic, data, copy (through /copy-review), and bug fixes that restore the drawn design.
- Never add a Design item, or send a prompt, without the user's yes.
- A design handoff the user relays is already reviewed: audit it, merge it, and never ask whether it's been reviewed.
- When a lane finds a gap the boards don't draw, it stops. The orchestrator asks the user, offering "send to Design" first.

## Where feature state actually resolves

- A switch resolves per reader: the `*_ENABLED` env var (a literal `off` kills it), then `flag_overrides` (account, then group, then app-wide). The registry is `src/lib/switches/registry.ts`.
- Before saying a feature is on or off in production, read production's `flag_overrides` (a SELECT) as well as the Vercel env. The user turns lines on through app-wide overrides, so the env var alone is misleading.
- A new switch needs the user's approval before any lane builds one. Improvements to a live line ride its existing switch, or none.

## Databases

- Neon project: production, staging and local-dev branches. Production and staging are read-only for everyone (SELECT only; a hook enforces it). The sanctioned writes are the migration on deploy, and catalog or copy jobs run through workflows.
- Scratch branches are 0.25 CU, made from local-dev, and named `scratch-<task>`. A lane points the worktree's `.env` `DATABASE_URL` at the scratch branch (`env.mjs` loads `.env` over the shell, so a shell `DATABASE_URL` is ignored; `docs/probes.md`), or uses a script's own named-target variables where it has them, confirms the resolved `neon.branch_id` before the first write, and lists the branch at close. The orchestrator deletes it only after confirming its parent is local-dev.
- A probe that deletes or reseeds a whole account calls `assertScratchBranch`. Measure on staging, mutate on local-dev or scratch.

## What to verify before reporting "done"

- The PR is merged (gh), and `GET https://the-99.dev/api/health` reads ok, with applied equal to expected and the newest migration named. Staging is `staging.the-99.dev`.
- Staging deploys once a day from the `staging` branch (Staging sync, 07:41 UTC), not on every merge. Dispatch Staging sync to test a change on staging sooner.
- For the runtime Node version, check the `[runtime]` log line: `vercel logs --scope featherweight-design --project <the-99|the-99-staging> -q "[runtime]"`.

## User interaction

- One decision per AskUserQuestion turn. Long text the user must read goes in the message body, never in a preview.
- Text written in the same turn as an open question isn't visible while the question is up, so post the text, end the turn, then ask.
- Talk in product terms. Give full absolute paths for local files.
- Secrets: the user creates and sets every one by hand. Name the variable, its scope and whether it's Sensitive; never script creating or publishing one.

## Product principles to enforce in briefs

- Never hold results back. A player's request (a count, a target) is fulfilled or explicitly negotiated.
- Give a choice: a larger pool to pick N from, not a single answer or alternates per pick.
- A /copy-review breach blocks the merge, and a brief never overrides copy rules. The user's own wording counts as their ruling.
