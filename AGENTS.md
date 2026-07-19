<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# The 99 — repo conventions

MTG Commander companion: upload a collection CSV, get commander recommendations, build decks from what you own. Next.js 16 (App Router, server actions), React 19, Tailwind 4, Drizzle ORM on Neon Postgres, Clerk auth, Vitest.

## Commands

- `npm run dev` / `npm run build` — build needs `DATABASE_URL` to exist but runs no queries; a stub works: `DATABASE_URL="postgres://stub:stub@localhost/stub" npm run build`
- `npm run typecheck` · `npm run lint` · `npm test`
- `npm run db:generate` / `db:migrate` / `db:seed` (Drizzle Kit; seed pulls the Scryfall catalog)

## Workflow

- All work happens in worktrees under `.worktrees/<branch>`; copy `.env` from the repo root into a new worktree before running the app. The main checkout stays clean on `main`.
- Pre-push gate, every push: `npm run typecheck && npm run lint && npm test` plus the stub-DB build, then `git fetch origin && git rebase origin/main`.
- Stage files by name — never `git add -A` (`.env` and other untracked files must stay untracked).
- PR reviews follow the Copilot policy in the user-level `~/.claude/CLAUDE.md`. This repo merges via **squash**.

## Design pipeline

- UI work is gated on design handoffs in `design/design_handoff_the99_*` — no UI until the handoff exists and has a READINESS verdict. Backend/API/DB work may proceed without one.
- Every UI PR passes the design-review skill (property-table enumerate → verify → confirm) before `gh pr create`. Mobile + desktop parity ships in the same PR.
- Pipeline state lives in `docs/superpowers/design-pipeline-status.md`; plans in `docs/superpowers/plans/`; gap reports in `docs/superpowers/gap-report-*.md`.
