# Feature flags live only in the database (plan, lane 9b, 2026-10-31)

Approved by Hugh, routed by the-99-orchestrator. **Risky** (flag resolution).

**Rulings (the orchestrator as Hugh's proxy, 2026-10-31):**

- `killed` as a third, app-only value that beats every row: approved.
- The rename as a shim plus batched PRs: approved.
- The admin kill control: a Design item, yes. PR 3 waits for its handoff. Every other PR proceeds. Every code PR gets one Copilot round, once the budget resets on 11-01, or a Claude review under the budget-stop rule.

## Goal

A flag is decided by `flag_overrides` alone. Today `resolve.ts:60 decide()` puts the Vercel env behind the rows:

1. env `off` (the kill switch);
2. the account's row;
3. ALL_FEATURES;
4. the group's row;
5. the app-wide row;
6. the env value.

A `plumbing` flag skips rungs 2–4 and takes the app row alone (`resolve.ts:69`). ALL_FEATURES raises only the flags in `ALL_FEATURES_RAISES`. Both stay as they are. Of the survivors, `LIST_CACHE`, `NAV_STALL_LOG`, `PUBLIC_PAGES`, `RATE_LIMIT` and `SCAN_LAB` are plumbing.

After this work:

- The **app-wide row** is each flag's default.
- A **killed** app-wide row is its kill switch.
- The env layer is gone, and the `*_ENABLED` vars are deleted from Vercel.
- "Switches" is renamed "feature flags" in code, admin copy, docs and guards.

## Scope: the flags that survive the retirement in flight

`LIST_CACHE`, `NAV_STALL_LOG`, `RATE_LIMIT`, `OVERVIEW_V2`, `PAYMENTS`, `WELCOME_CREDITS`, `PUBLIC_PAGES`, `PUSH`, `ANNOUNCEMENTS`, `FEEDBACK`, `FLYER_TRIAL`, `SCAN_LAB`, `SUGGESTED_CHANGES_V2`, plus the reserved `ALL_FEATURES` row.

- PR 1 starts only after the retirement has merged, so the registry, `flag_overrides_switch_check` and `about-pages.ts` hold survivors only.
- The retirement is lane 58's: the `chore/retire-flags-*` and `retire-g3-*` branches.
- PR 1 re-reads `registry.ts` on main and stops if a non-survivor is still listed.
- `SUGGESTED_CHANGES_V2` today `needs: TUNING_ENABLED`, a flag being retired. The retirement owns that edge. This plan assumes it is gone or re-pointed.

## What prod holds today (SELECT, 2026-10-31)

- No row anywhere has the value `off`.
- Of the survivors, only `PUSH`, `RATE_LIMIT` and `SUGGESTED_CHANGES_V2` have an app row, all `on`.
- `PAYMENTS` and `WELCOME_CREDITS` have only a group row.
- `LIST_CACHE`, `NAV_STALL_LOG`, `OVERVIEW_V2`, `PAYMENTS`, `WELCOME_CREDITS`, `PUBLIC_PAGES`, `ANNOUNCEMENTS`, `FEEDBACK`, `FLYER_TRIAL` and `SCAN_LAB` are decided by the **env alone** for everyone outside a group. So they need seeding, or turning the env layer off changes what production serves.

## Kill-switch semantics: the one ruling this plan needs

A plain `off` app row cannot be both the default and the kill switch:

- A default-off flag with a group or users raised above it is the beta shape, and two survivors use it today: `PAYMENTS` and `WELCOME_CREDITS` are off for everyone through the env and on for one group.
- A kill must beat those user rows, and ALL_FEATURES too, as env `off` does now.

**Recommended:** the app row's `value` gains a third state, `killed`.

| App row | Meaning |
|---|---|
| `on` | The default is on. Account, ALL_FEATURES and group rows can still turn it off for someone. |
| `off` | The default is off. Account, ALL_FEATURES and group rows can raise it. |
| `killed` | Off for everyone. It beats every other row. It is the only state that does. |
| no row | The registry's compiled `fallback` (see failure mode). A seeded flag always has a row. |

- `killed` is legal only on `scope = 'app'`. A CHECK constraint enforces that.
- New order:
  1. app `killed`;
  2. the account's row;
  3. ALL_FEATURES;
  4. the group's row, where `off` still wins if two apply (plumbing flags still skip 2–4);
  5. the app row;
  6. the registry fallback.

Rejected alternatives:

- **A separate `killed` boolean column.** It adds a second field to keep consistent with `value`, and the admin then has two controls for one decision.
- **"App `off` beats everything."** It removes the beta shape that `PAYMENTS` and `WELCOME_CREDITS` rely on once their env default becomes an app `off` row.

## Failure mode

The DB read fails, or a flag has no row:

- Today `snapshot.ts:56-60` serves the env alone when the read fails. With no env there must be a compiled answer.
- Each registry entry gains `fallback: "on" | "off"`.
- The fallback is **off** for every `model` and `feature` flag, and for `PAYMENTS` and `WELCOME_CREDITS`: never spend or charge on a guess.
- It is **on** only for plumbing whose off state is worse than a stale read: `RATE_LIMIT` and `LIST_CACHE`. PR 1 confirms each one against its flag function.
- `resolveSwitchEnvStrict` keeps throwing on a failed read. Scripts and the push-flush cron want to fail loudly, not guess.
- The 30-second snapshot memo (`SNAPSHOT_TTL_MS`) stays, so a kill takes effect within 30 s per instance. That matches today's override latency, and the admin's existing note covers it.

## Seeding: no human reads a Vercel value

The values seeded are the ones production is serving at the moment of the deploy:

- `scripts/vercel-migrate.ts` already runs during each production build, with production's env loaded (`docs/agents/ops.md:150`).
- PR 1 adds a seed step after the migrations: for each survivor with no app row, insert one whose value is the env's current resolution.
  - The value is what the flag's own function decides from the env with no rows: `off` maps to `off`, and anything else maps to `on`. PR 1 reads each survivor's flag function for its unset default rather than assuming unset is off.
  - `note` is "seeded from env 2026-11-xx", and `updated_by` is "seed".
- The step is idempotent: it never overwrites an existing app row.
- It logs one line per flag (name, value, inserted or kept) into the build log. Verify with `vercel inspect <url> --logs`.
- It runs in **both** Vercel projects (production and staging, each against its own branch) because both run `vercel-migrate`.
- `local-dev` and scratch branches are seeded by `pnpm db:migrate` running the same step locally, from `.env`.
- After deploy: SELECT the app rows on production and staging, and diff them against the build-log lines.
- An env `off` today becomes `off`, not `killed`. No survivor is killed now; `killed` is for future emergencies.

## How a flag resolves without a request

| Caller | Today | After |
|---|---|---|
| Pages, layouts, actions, routes (≈ 130 files) | `requestSwitchEnv(userId)`: proxy `x-switches` bits, else `resolveSwitchEnv` | Unchanged call. The base env layer is dropped inside `src/lib/switches/` |
| `src/proxy.ts`, signed-out | binds raw `process.env` | resolves the **app-wide** rows (snapshot, no user) |
| Cron `push-flush` | `resolveSwitchEnvStrict(userId)` per reader | unchanged |
| Crons `account-sweep`, `invite-sweep`, `announcements` | decide no flag | unchanged |
| `scripts/announcements-test-fire.ts`, `probe-friend-decks.mts` | `resolve*SwitchEnv(userId)` | unchanged; they already read the DB |
| `scripts/eval/lib/synopsis-app.mts` and probes that pass `process.env` | env | `resolveSwitchEnvStrict(null)` (app-wide), or an explicit object (`{ OVERVIEW_V2_ENABLED: "true" }`) where the eval pins an arm. The pinned form is how an eval forces a flag on a branch where it is off |

- A `null` user resolves the app rows and the fallback, with no account, group or ALL_FEATURES rows.
- Flag functions keep taking an env-shaped object until the rename PRs. That object becomes the resolver's output only, never `process.env`.
- `check:switch-reads` is tightened in PR 2: `process.env` may not reach a flag function anywhere, `scripts/` included, except through the resolver.

## Migration and rollback

The DB change is in PR 1. It is additive, with one migration:

- `flag_overrides.value` CHECK widens to `on|off|killed`.
- A new CHECK enforces `value <> 'killed' OR scope = 'app'`.
- Number: provisional; take main's newest + 1 at merge.
- Rollback SQL, in the PR body:
  - `UPDATE flag_overrides SET value='off' WHERE value='killed'`;
  - then restore the old CHECK.
- Seeded rows need no rollback. With the env still layered behind them in PR 1, a row that matches the env changes nothing served.

The env vars outlive the code that reads them by at least seven days:

- **PR 1:** rows are seeded and `killed` exists, but the env stays in the resolver, below the app row and above the fallback. Production behavior is identical. Rollback: revert.
- **PR 2:** the env layer is removed. Rollback: revert PR 2, which works because the vars are still set in Vercel.
- **Var deletion:** Hugh deletes the `*_ENABLED` vars himself, in both projects, only after PR 2 has run in production for seven days with no flag incident. The orchestrator lists the names. Until then, deleting one is the only way to break PR 2's rollback, so the plan says when, not how.
- If a kill is needed between PR 1 and PR 2, set env `off` (still honored) **and** the app row to `killed`. Either alone works.

## PR boundaries

Every PR stays under ~20 files and ~800 lines, with no stacking: each opens after the last merges.

1. **Kill state, fallback and seed** (risky: DB, migration).
   - The migration; `resolve.ts` handles `killed` and the fallback.
   - `registry.ts` gains the `fallback` field, and `vercel-migrate.ts` gets the seed step.
   - Tests: resolve order with `killed` beating ALL_FEATURES, user and group rows on a feature or model flag, and the app row on a plumbing flag; idempotent seeding.
   - About 10 files.
2. **Drop the env layer** (risky: flag resolution).
   - `resolve.ts`, `snapshot.ts` (the failure path now serves the fallback) and `request.ts` stop reading `process.env`.
   - The signed-out branch of `proxy.ts` resolves app rows.
   - `synopsis-app.mts` and the probes that pass `process.env` change.
   - The `check:switch-reads` tightening.
   - About 15–20 files. If probes push it over, they split into PR 2b.
3. **Admin: show and set `killed`** (UI).
   - The app row's existing value control gains a third option, plus a row marker in the list.
   - **Needs a Design handoff** before build (design-pipeline rule). The admin boards do not draw a kill state today. A prompt goes to Design once this plan is approved.
   - Copy through `/copy-review`.
   - Until it ships, a kill is a SQL write by Hugh or the orchestrator, documented in `docs/agents/switches.md`.
4. **Hugh deletes the vars** (no PR): seven days after PR 2, from the list the orchestrator sends.
5. **Rename, part 1: the core.**
   - `src/lib/switches/` becomes `src/lib/flags/`.
   - `requestSwitchEnv` becomes `requestFlags`, `resolveSwitchEnv*` becomes `resolveFlags*`, and `SWITCHES` becomes `FLAGS`.
   - The old names stay as re-exports in a `src/lib/switches/index.ts` shim, so callers keep compiling.
   - `check:switch-reads` becomes `check:flag-reads` in package.json and CI, and AGENTS.md's rule line is updated.
   - `docs/agents/switches.md` becomes `feature-flags.md`, with the index entry.
   - About 15 files.
6. **Rename, parts 2 to 8: the callers**, about 20 files a PR by directory: actions, pages and layouts, routes and cron, lib, components, scripts and probes.
   - The 143 files that call the resolver are mechanical import and identifier swaps.
   - Each PR is a Claude review on green CI. A rename touches no logic, so it is not risky, and each PR body says so with `## Risk: not risky`.
7. **Rename, final.**
   - Delete the shim.
   - Admin routes `/admin/switches*` become `/admin/flags*`, with a redirect from the old path.
   - Admin component and rule files. The admin copy readers SEE already moved (Hugh, 2026-11-01): the nav tab, the list
     title and back link, the column head and the lines in `src/lib/copy/admin.ts` and `switchCopy` say "Feature flags" or
     "flag". What is left here is code names only (`adminCopy.switches`, `switchCopy` and the like).
   - `about-pages.ts` `switch:` keys become `flag:`.
   - About 20 files.
8. **Optional: rename the DB column.** `flag_overrides.switch` becomes `flag` (risky: migration).
   - It needs an expand-and-contract: add the column, dual-write, backfill, switch reads, drop.
   - That is two PRs for a name only.
   - **Recommended: leave the column as `switch`**, with a schema comment pointing at the rename.

## A fork for the orchestrator or Hugh

- **The rename's PR count.** The ~20-file cap makes the caller rename 6–7 PRs (§6). That is about a dozen PRs in all.
- The alternative is one mechanical PR of ~160 files under a cap exception: `sed`-only, typecheck as proof, no logic.
- **Recommended:** the shim and batches. It honors the cap and lets any batch be reverted alone.
- The ruling changes only §5–§7. PRs 1–3 are the same either way.

## Close-out checks

- No `process.env.*_ENABLED` read under `src/` or `scripts/`; `check:flag-reads` fails one.
- `vercel env ls` on both projects shows no `*_ENABLED` var.
- Every survivor has exactly one app row on production and staging.
- Pressing the admin's `killed` on a feature flag held on by ALL_FEATURES (`PUSH`, say) turns it off for that account within 30 s. This is a browser probe on local-dev, never production.
- `docs/agents/feature-flags.md` describes the new order, `killed`, the fallback and the no-request path. No doc still says "switch".
