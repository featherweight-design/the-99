# Epic Run Briefing — Printings, set names, and automated catalog ingest

Feature-specific facts for `epic-run`. Run mechanics live in the skill; repo
conventions live in `AGENTS.md`. Neither is restated here.

## Source of truth (read in this order)

1. `docs/superpowers/plans/2026-07-27-printings-sets-and-catalog-ingest.md` — the execution
   plan. Phases 1–6, three PRs, gates. **Follow its order exactly.** It doubles as the eng
   spec for this epic; there is no separate spec document, by decision 2026-07-27.
2. Issues [#84](https://github.com/HartiganHM/the-99/issues/84) (wrong printing art) and
   [#86](https://github.com/HartiganHM/the-99/issues/86) (raw set codes, no set search).
   [#17](https://github.com/HartiganHM/the-99/issues/17) was closed into #86 on 2026-07-27.
3. `docs/superpowers/specs/2026-07-27-collection-filter-panel-design.md` — design spec for
   the Phase 6 filter panel (#86's visible half). Eight locked decisions; the rest is
   Design's call.
4. `design/design_handoff_the99_collection_filter/` — **does not exist yet.** Handed off to
   Design 2026-07-27. Phase 6 is blocked until it lands with a READINESS verdict.
5. `docs/superpowers/design-tables/collection.md:389-406` — the filter row's current
   property table. Phase 6 must not break it.

## Current state (verified 2026-07-27)

**Databases** — Neon project `misty-rain-01681654`, three branches. The MCP default is
`production`, so **always pass `branchId` explicitly**.

| Branch | ID | Role |
|---|---|---|
| `production` | `br-noisy-violet-a6vw4ess` | https://the-99.dev |
| `staging` | `br-polished-pond-a6e63y0b` | https://staging.the-99.dev |
| `local-dev` | `br-patient-hall-a6nbonvo` | local work |

Production measured at **57MB, 34,745 cards**. Phase 2 adds an estimated 40–60MB.

**GitHub Actions — nothing exists yet.** Verified via `gh api`: the repo has **zero** Actions
secrets and **zero** Actions variables. The environments that show up (`Production`,
`Preview – the-99-staging`, `copilot`, …) are Vercel-created deployment environments, not the
`staging`/`production` environments Phase 3 needs. Hugh is placing these on 2026-07-27:

| Name | Kind | Scope | Value |
|---|---|---|---|
| `CATALOG_DATABASE_URL` | secret | Environment `staging` | staging branch pooled connection string |
| `CATALOG_DATABASE_URL` | secret | Environment `production` | production branch pooled connection string |
| `CATALOG_REFRESH_ENABLED` | variable | repo | `true` |

**Re-verify all three at kickoff** with `gh api repos/HartiganHM/the-99/actions/variables` and
the per-environment secrets endpoint. A missing `CATALOG_REFRESH_ENABLED` at Phase 3 merge
means oracle refresh silently stops, because that PR deletes the Vercel cron.

**Existing cron being retired** — `vercel.json` runs `/api/cron/scryfall-refresh` weekly at
`maxDuration = 300`, guarded by `CRON_SECRET`. Phase 3 deletes the route, the guard and the
`vercel.json` crons block. `CRON_SECRET` can be removed from Vercel after that PR deploys.

**Migrations** apply automatically on every Vercel **production** build via `vercel-build` →
`scripts/vercel-migrate.ts`. Preview deploys skip them. Confirm with `GET /api/health` (200 =
schema matches or is ahead, 503 = pending).

**Scryfall API** requires **both** `User-Agent` and `Accept: application/json`. Omitting
`Accept` returns 400. `src/lib/scryfall/seed.ts` currently sends only `User-Agent` — it works
for bulk file downloads but any new `/sets` or `/cards/collection` call must send both.

**Collection data** — `data/the-vault.csv`, 2,934 rows, is the real collection and the fixture
for the Phase 4 seed script. It is checked in. Expected post-Phase-4 result: **2,821 imported,
113 skipped by design, 0 unmatched.**

## Hard pause points — stop and ask

- **Phase 6.** Do not start without `design/design_handoff_the99_collection_filter/` present
  and carrying a Green or Yellow READINESS verdict. An Orange verdict returns to Design; it is
  never landed as-is.
- **Deleting or resetting any Neon branch.** Never in scope for this epic.
- **Any deviation from the plan's key shape.** `(user_id, oracle_id, set_code,
  collector_number, finish)` was chosen over a `scryfall_id` key for a documented reason
  (§3.4 — non-ManaBox exports carry no Scryfall ID). If implementation pressure suggests
  changing it, stop and ask rather than re-deciding.
- Standard skill defaults otherwise, **except** the production-migration pause below.

## Notify-and-proceed

- **Production migration (Phase 4's `0008`) — pre-authorized 2026-07-27.** This overrides the
  skill's default hard pause on production migrations. Before merging the PR: run the
  migration against the `staging` branch, confirm `GET https://staging.the-99.dev/api/health`
  returns 200, and re-import `data/the-vault.csv` there via `pnpm db:seed:collection` with the
  three counts matching the expected values above. Post that evidence, then merge. The
  migration is additive-then-destructive (`foil` is dropped), so capture a row count for
  `collection_items` before and after.
- **First `catalog-refresh` workflow run.** Dispatch against `staging` first, confirm the
  `$GITHUB_STEP_SUMMARY` counts look sane and the branch size grew as estimated, then dispatch
  against `production`. No approval needed between the two if staging was clean.
- **Re-importing the collection on production.** Hugh is the only user; there is no other
  data to lose. Run `pnpm db:seed:collection` against production once Phase 4/5 deploys,
  report the three counts.

## Done means

1. Phases 1–5 merged at the full Copilot bar, deployed, and validated on
   **https://staging.the-99.dev** — not merely CI-green.
2. `sets`, `printings` and `skipped_printings` populated on both `staging` and `production`;
   row counts reported.
3. `collection_items` carries `scryfall_id`, `collector_number` and `finish`; the collection
   re-imported on both branches; **102 of the 103 previously-collapsed rows now distinct**
   (Safewright Cavalry ECL 191 stays merged — that is correct, see plan §2).
4. Collection art shows the **owned** printing. Spot-check the Arcane Signet from #84 and at
   least one double-faced card, since DFC images were the plan's worst near-miss.
5. `catalog-refresh` workflow green on all three triggers — schedule (verify the cron
   expression, do not wait a month), `release: published`, and `workflow_dispatch`.
6. The Vercel cron, its route and `CRON_SECRET` handling are gone, with oracle refresh proven
   to still run from Actions.
7. `pnpm db:seed:collection` documented in `AGENTS.md` under Commands.
8. #84 and #86 closed — **each with its own `Closes` keyword**, since GitHub binds only the
   first `#N` in a list.
9. Phase 6 either merged (if the handoff landed in time) or left as a single open issue with
   the design dependency named.
10. Final report via the `feature-run-report` skill. Not free-form.
