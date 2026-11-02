# Switches (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

> **Superseded in part (2026-11-02):** the variable no longer decides any switch except `MODEL_CALLS_ENABLED`; see
> "The env layer is gone" below. This paragraph keeps the history of the env-layer design.

- **Feature switches resolve per reader** (admin plan PR 4, brief `2026-10-11-admin-ui.md`). Each `*_ENABLED`
  variable keeps its meaning and is the default; `flag_overrides` holds overrides on top of it, app-wide, per group
  (`flag_groups`, one group per account in `flag_group_members`) or per account. Per switch: the variable set to the
  literal `off` wins outright (the KILL SWITCH: no override can raise it, so a bad override is always beaten by a
  redeploy), then the account's override, then its group's (OFF wins if two apply), then app-wide, then the variable.
  A `plumbing` switch (`LIST_CACHE_ENABLED`, `RATE_LIMIT_ENABLED`; `ABOUT_SHEET_ENABLED` was one until About
  visual PR 6b retired it with the sheet, and `LABEL_ROLE_COUNTS_ENABLED`, the role basis, until #2567 retired it)
  takes the app-wide override alone. `MODEL_CALLS_ENABLED` (plumbing) is the model-call kill switch and the one switch
  ON BY DEFAULT: on while unset, off for `false` or `off`. Both are hard stops above every row (`envStops`,
  `resolve.ts`): no override raises either, an app-wide On row included. To stop it without a deploy, set the
  app-wide row to Killed. It gates the runs reserved through
  `reserveModelCall` (player runs and the Overview rewrite) and, through `/api/health`, the background jobs: health
  reports `modelCalls: "on" | "off"` (`healthModelCalls`, `src/lib/health/model-calls.ts`: a strict read held 30s per
  instance; a failed read reports "off", logs `health: model-calls read failed; reporting off`, and is not held). The
  gate (`scripts/lib/model-calls-gate.mjs`) asks PRODUCTION's health (`MODEL_CALLS_HEALTH_URL`, default
  `https://the-99.dev/api/health`, empty counts as unset, even for a staging-catalog job) before a job spends: "off"
  skips with exit 0; anything it cannot confirm (unreachable, not JSON, no field) sends nothing and exits NON-ZERO, so
  the run goes red. Each script reads it before requiring `ANTHROPIC_API_KEY`, so a paused run needs no key, except
  `db:build:labels`, which needs the key to collect. A verdict is never held across slow work: each spend point reads it fresh. Gated: `check:tuning`,
  `db:build:prose` (not `--dry-run`; re-read every minute during the run, stopping before the next commander),
  `db:build:labels` (before each wave's submit, after every paid batch is collected; paused returns
  `EXIT_CALLS_PAUSED` 76, which ends `card-labels.yml`'s loop green with the resume hint) and
  `db:build:precon-overviews` (a live run: read fresh before the first token count and again before EVERY batch,
  first answers and repairs, via `runBuild`'s `beforeSend`; the no-model readings and not-current marks run
  either way; not `--collect`).
  **A deliberate exception to per-reader resolution:** `reserveModelCall` and `/api/health` resolve this switch
  app-wide with no user (`resolveFlagsStrict(null)`), not from `requestFlags(userId)`. It is plumbing, so no
  account's override applies, and health is public and must carry no user data. The registry marks it `defaultOn`
  so `switchBits` encodes it the way its flag function reads it. Off, `reserveModelCall` refuses every new run, system
  origin included, as `paused` (no row, no charge). It FAILS CLOSED, unlike every other switch read: the reservation
  reads the overrides fresh (`resolveFlagsStrict`), and a read that fails refuses as `paused`, so a database failure
  never lets calls through under an app-wide Off row. `readAllowance` reports `paused` for display only (through the
  memo, the environment deciding on a failed read), which every panel draws as it draws the owner's share, with
  `creditsCopy.paused`. A compound switch names its parent as `needs`
  in the registry, and a switch is tagged `model` exactly when turning it on changes what a reader can spend
  (Overview v2 and Suggested changes v2); `src/lib/flags/flags.test.ts` holds both to the flag
  functions. An app-wide override still flips one without a deploy, so its readers
  are handed the resolved env too, and a cache whose payload depends on it carries it in its key:
  `discoveryKey` and `commanderRankingsKey` take the basis, the stored scores' `writer_version` carries it
  (`scoreWriterVersion(env)`), and `cachePageForUser` keys on every switch. The registry
  (`src/lib/flags/registry.ts`) is the closed set the table is checked against, and `registry.test.ts` fails when
  `src/` reads a variable it does not name. `resolveFlags(userId)` reads the overrides through a 30-second
  per-instance memo (an admin write, `src/lib/admin/switch-writes.ts`, commits and then clears its own instance's
  memo; the proxy's memo, which feeds every page's switches, catches up within the 30 seconds), serves each switch's
  compiled fallback when the read fails (it served the environment alone until flags-in-DB PR 2), and returns an env-shaped object every
  flag function takes as it takes `process.env`; parents stay checked inside the flag functions, so a child override
  never raises its parent. Every page, layout, action and route handler decides a switch from
  `requestFlags(userId)` (a page that decides switches outside its load resolves once and passes the env in), and
  `cachePageForUser` puts every resolved switch in its key and hands the load that same env.
  **Every flag function, and every reader under `src/` that decides a switch, REQUIRES its `env`**, so leaving it out
  does not compile: the profile store (`StoredProfileDeps.env`, built by
  `requestProfileDeps(env)`), and the role basis, synopsis, discovery and About readers. The claim model
  (`loadAvailability`, `loadDeckBuyRows`) decides no switch and takes no env. A script, a probe or
  an eval has no signed-in reader and passes `process.env` itself, saying so. The proxy keys About's cookie on the
  reader's resolved entries, so a flip retires exactly the readers it changes. `check:list-cache` knows the two
  override tables reach a cached page through its key alone, and fails if any loader but `page-cache.ts` and the
  resolver it goes through (`src/lib/flags/request.ts`) reads them.
  What still compiles is `fooEnabled(process.env)`, so `pnpm check:flag-reads` (`scripts/lib/switch-reads.mjs`, in
  CI and inside `pnpm test`) fails any code under `src/` that hands the `process.env` OBJECT on (an argument, a
  spread or copy, a `?? process.env` fallback, a variable, a prop), outside `src/lib/flags/` (and its re-export shim at `src/lib/switches/`), tests and its
  `ALLOWED` list (a file, its approved uses and a reason a reviewer can check: `src/proxy.ts`'s signed-out request).
  It also fails every PARAMETER DEFAULT of `process.env` (`env = process.env`, destructured in a parameter included)
  but the `keep` entries in `DEFAULTS_PENDING`, each of which reads the environment on purpose and says why:
  the model stand-ins' settings readers (`intake/stub.ts`,
  `stubTheReadDeps`, `swaps/fits-read-stub.ts`, `synopsis/stub.ts`), which read `NODE_ENV` and their own `*_LIVE` /
  `*_STUB*` knobs, never a registry switch. Each approved use is pinned by a FINGERPRINT with a count, never a line
  or a per-file total: `<enclosing function, method or module const>:<use>` (`clerkMiddleware():fallback`) and
  `<scope>:default:<param>`, so swapping an approved use for a new one elsewhere in the file fails, and so does a
  listed fingerprint that is gone. A member read and a destructuring read are not findings (a rest element,
  `{ ...e } = process.env`, is a copy and is one); a binding default in a variable
  (`const { env = process.env } = opts`) is a finding. It cannot see the environment reached through anything but
  `process.env` itself, or an env built by hand from member reads.

## Killing a flag from the admin (flags-in-DB plan PR 3; handoff small items 9, item 4)

- **The control**: the switch page's App-wide segment reads Not set · On · Off · Killed. Killed opens a confirm every
  time (`kill-confirm.tsx`, on the shared `ConfirmFrame`, danger action) and writes the app-wide row as `killed`, with an
  `admin_events` `override_set` row like any write. On, Off or Not set lifts it at once, no confirm (a model flag that
  rises still opens the model confirm). Group and account rows keep On / Off.
- **Under a kill** (`isKilled`: the `killed` row, or the model-call env stop): the list tags the flag KILLED and reads
  Resolved Off, killed; the page draws the kill banner, a first Killed rung deciding for everyone, and every override
  refused, killed, with On and Off held and Clear live. A group or account Set is refused (`writeOverride`); a Clear of
  one goes through.
- **The stale view**: the App-wide control sends the app row's value as its page drew it (`expected`). `writeOverride`
  refuses (`stale`) when the locked row reads otherwise, and its upsert and delete are guarded on that value, so a kill
  committed by SQL after the page was drawn is never overwritten by a write that did not see it. An app-row write with
  no `expected` (a probe or script calling `writeOverride` directly) is refused over any `killed` row, as before the control.
- **The SQL fallback**, for when the admin is unreachable:
  `insert into flag_overrides ("switch", scope, value, updated_by) values ('<NAME>', 'app', 'killed', '<who>') on conflict
  on constraint flag_overrides_target_key do update set value = 'killed', updated_by = excluded.updated_by, updated_at = now()`;
  lift it by setting the row back to `on` or `off` in SQL, or from the admin. A SQL write records no `admin_events` row.

## The env layer is gone (flags-in-DB plan PR 2, 2026-11-02)

- A switch is decided by `flag_overrides` alone: the kill (`killed`), the account, All features, the group, the
  app-wide row, then the registry's compiled fallback (`switchFallbackOn`): off, except `MODEL_CALLS_ENABLED`
  (`defaultOn`) and `RATE_LIMIT_ENABLED`, `LIST_CACHE_ENABLED` (`fallback: "on"`). A failed override read serves the
  fallbacks (`snapshot.ts`), never the deployment's variables. `resolveEnv` writes every switch's key, so no flag
  function sees a deployment value.
- **The exception, `MODEL_CALLS_ENABLED`** (orchestrator ruling, 2026-11-02): its variable at `off` or `false` stops it
  above every row (`envStops`), so a redeploy stops model spend with the database down. `switchEnvValues` reads this
  variable alone. The admin draws no env column or env rung any more (PR 3): the env stop shows as the Killed rung
  (`MODEL_CALLS_ENABLED=off` or `MODEL_CALLS_ENABLED=false`, the value as set), with its own banner, since no app-wide
  value lifts it.
- The seed still runs on each build; an unset or empty variable now seeds the switch's fallback, so a switch added
  later starts from what it would serve with no row. A variable at `off` seeds nothing and kills nothing: a kill is
  the app-wide `killed` row, written on purpose (above), lifted by setting that row back to `on` or `off`.
- The `*_ENABLED` variables other than `MODEL_CALLS_ENABLED` are read by nothing in `src/`. Hugh deletes them in both
  Vercel projects no sooner than seven days after this PR ships with no flag incident (the plan's rollback window: until
  then reverting this PR restores the env layer). Scripts and probes that pass `process.env` move in PR 2b.

## The kill state and the seed (flags-in-DB plan PR 1, 2026-11-02)

Plan `docs/superpowers/plans/2026-10-31-feature-flags-in-db.md`. Two additions; the environment still sits below the rows.

- **`killed`**: a third value, legal on the app-wide row alone (`flag_overrides_killed_scope_check`). It is a kill
  in the database: off for everyone, above the account, All features and group rows, exactly as the variable at `off`
  is (`isKilled`, `resolve.ts`). The resolved env carries the kill value `off`, so every flag function reads it as the
  env's kill. Either kill alone is enough, with one difference: a request whose override read fails is served the
  compiled fallbacks (`snapshot.ts`), so a `killed` row holds only while the read succeeds (the fallback is off for every
  switch but the model calls, the rate limit and the list cache). It takes effect within the 30-second snapshot window.
- **The seed** (`src/lib/flags/seed.ts`): after the migrations on each Vercel build (`vercel-migrate.ts`, production
  and staging, each against its own branch) and locally by `pnpm db:seed:flags` (the branch `.env` names), every switch
  with no app-wide row gets one holding what its variable serves now (`true` is on, anything else off), note
  `seeded from env <date>`, `updated_by` `seed`. A variable at `off` seeds nothing.
  One statement per switch; it never overwrites, logs `flag seed: <NAME> inserted|kept|not seeded|failed` per switch,
  and never fails the build. From then on the app-wide row, not the variable, is each switch's default: changing a
  variable no longer changes what is served, except `off`, the kill.
- **`MODEL_CALLS_ENABLED` is not seeded.** With no row it is on, and its variable still stops it with no database row:
  `off` and `false` are each a hard stop above every row, so no On row, seeded or set, can beat either.

## From AGENTS.md (moved 2026-10-28)

The rule-form bullets `AGENTS.md` carried for this area until 2026-10-28, verbatim. Where they and the text above differ in wording, both are current.

- **Feature switches resolve per reader.** Each `*_ENABLED` variable is the default; `flag_overrides` sits on top (app-wide, per group, per account). Order: the variable set to the literal `off` wins outright (the KILL SWITCH, which no override can raise), then account, then group (OFF wins), then app-wide, then the variable. A `plumbing` switch takes the app-wide override alone; a compound switch names its parent as `needs`. The registry is `src/lib/flags/registry.ts`. Every page, layout, action and route handler decides a switch from `requestFlags(userId)`, and every flag function and reader REQUIRES its `env`; scripts, probes and evals pass `process.env` themselves. `pnpm check:flag-reads` fails any code under `src/` that hands the `process.env` object on, outside `src/lib/flags/`, tests and its `ALLOWED` list. A cache whose payload depends on a switch carries it in its key.
