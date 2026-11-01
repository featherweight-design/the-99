# Switches (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

- **Feature switches resolve per reader** (admin plan PR 4, brief `2026-10-11-admin-ui.md`). Each `*_ENABLED`
  variable keeps its meaning and is the default; `flag_overrides` holds overrides on top of it, app-wide, per group
  (`flag_groups`, one group per account in `flag_group_members`) or per account. Per switch: the variable set to the
  literal `off` wins outright (the KILL SWITCH: no override can raise it, so a bad override is always beaten by a
  redeploy), then the account's override, then its group's (OFF wins if two apply), then app-wide, then the variable.
  A `plumbing` switch (`LIST_CACHE_ENABLED`, `RATE_LIMIT_ENABLED`; `ABOUT_SHEET_ENABLED` was one until About
  visual PR 6b retired it with the sheet, and `LABEL_ROLE_COUNTS_ENABLED`, the role basis, until #2567 retired it)
  takes the app-wide override alone. `MODEL_CALLS_ENABLED` (plumbing) is the model-call kill switch and the one switch
  ON BY DEFAULT: on while unset, off for `false` or `off`. As for every switch, only `off` is the hard stop no override
  raises; `false` is a soft off an app-wide On row overrides (an app-wide Off row resolves to `false`). For a hard stop
  set the variable to `off`, or use the app-wide Off row without a deploy. It gates the runs reserved through
  `reserveModelCall` (player runs and the Overview rewrite) and, through `/api/health`, the background jobs: health
  reports `modelCalls: "on" | "off"` (`healthModelCalls`, `src/lib/health/model-calls.ts`: a strict read held 30s per
  instance; a failed read reports "off", logs `health: model-calls read failed; reporting off`, and is not held). The
  gate (`scripts/lib/model-calls-gate.mjs`) asks PRODUCTION's health (`MODEL_CALLS_HEALTH_URL`, default
  `https://the-99.dev/api/health`, empty counts as unset, even for a staging-catalog job) before a job spends: "off"
  skips with exit 0; anything it cannot confirm (unreachable, not JSON, no field) sends nothing and exits NON-ZERO, so
  the run goes red. Each script reads it before requiring `ANTHROPIC_API_KEY`, so a paused run needs no key, except
  `db:build:labels`, which needs the key to collect. Gated: `check:tuning`, `db:build:prose` (not `--dry-run`),
  `db:build:labels` (before each wave's submit, after every paid batch is collected; paused returns
  `EXIT_CALLS_PAUSED` 76, which ends `card-labels.yml`'s loop green with the resume hint) and
  `db:build:precon-overviews` (a live run, after the no-model readings and not-current marks, before tokens are
  counted or a batch submitted; not `--collect`).
  **A deliberate exception to per-reader resolution:** `reserveModelCall` and `/api/health` resolve this switch
  app-wide with no user (`resolveSwitchEnvStrict(null)`), not from `requestSwitchEnv(userId)`. It is plumbing, so no
  account's override applies, and health is public and must carry no user data. The registry marks it `defaultOn`
  so `switchBits` encodes it the way its flag function reads it. Off, `reserveModelCall` refuses every new run, system
  origin included, as `paused` (no row, no charge). It FAILS CLOSED, unlike every other switch read: the reservation
  reads the overrides fresh (`resolveSwitchEnvStrict`), and a read that fails refuses as `paused`, so a database failure
  never lets calls through under an app-wide Off row. `readAllowance` reports `paused` for display only (through the
  memo, the environment deciding on a failed read), which every panel draws as it draws the owner's share, with
  `creditsCopy.paused`. A compound switch names its parent as `needs`
  in the registry, and a switch is tagged `model` exactly when turning it on can let a reader spend (the Analysis
  tab and Swap tools are parents of spending switches); `src/lib/switches/flags.test.ts` holds both to the flag
  functions. An app-wide override still flips one without a deploy, so its readers
  are handed the resolved env too, and a cache whose payload depends on it carries it in its key:
  `discoveryKey` and `commanderRankingsKey` take the basis, the stored scores' `writer_version` carries it
  (`scoreWriterVersion(env)`), and `cachePageForUser` keys on every switch. The registry
  (`src/lib/switches/registry.ts`) is the closed set the table is checked against, and `registry.test.ts` fails when
  `src/` reads a variable it does not name. `resolveSwitchEnv(userId)` reads the overrides through a 30-second
  per-instance memo (an admin write, `src/lib/admin/switch-writes.ts`, commits and then clears its own instance's
  memo; the proxy's memo, which feeds every page's switches, catches up within the 30 seconds), falls back to the
  environment alone when the read fails, and returns an env-shaped object every
  flag function takes as it takes `process.env`; parents stay checked inside the flag functions, so a child override
  never raises its parent. Every page, layout, action and route handler decides a switch from
  `requestSwitchEnv(userId)` (a page that decides switches outside its load resolves once and passes the env in), and
  `cachePageForUser` puts every resolved switch in its key and hands the load that same env.
  **Every flag function, and every reader under `src/` that decides a switch, REQUIRES its `env`**, so leaving it out
  does not compile: the profile store (`StoredProfileDeps.env`, built by
  `requestProfileDeps(env)`), and the role basis, synopsis, discovery and About readers. The claim model
  (`loadAvailability`, `loadDeckBuyRows`) decides no switch and takes no env. A script, a probe or
  an eval has no signed-in reader and passes `process.env` itself, saying so. The proxy keys About's cookie on the
  reader's resolved entries, so a flip retires exactly the readers it changes. `check:list-cache` knows the two
  override tables reach a cached page through its key alone, and fails if any loader but `page-cache.ts` and the
  resolver it goes through (`src/lib/switches/request.ts`) reads them.
  What still compiles is `fooEnabled(process.env)`, so `pnpm check:switch-reads` (`scripts/lib/switch-reads.mjs`, in
  CI and inside `pnpm test`) fails any code under `src/` that hands the `process.env` OBJECT on (an argument, a
  spread or copy, a `?? process.env` fallback, a variable, a prop), outside `src/lib/switches/`, tests and its
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

## From AGENTS.md (moved 2026-10-28)

The rule-form bullets `AGENTS.md` carried for this area until 2026-10-28, verbatim. Where they and the text above differ in wording, both are current.

- **Feature switches resolve per reader.** Each `*_ENABLED` variable is the default; `flag_overrides` sits on top (app-wide, per group, per account). Order: the variable set to the literal `off` wins outright (the KILL SWITCH, which no override can raise), then account, then group (OFF wins), then app-wide, then the variable. A `plumbing` switch takes the app-wide override alone; a compound switch names its parent as `needs`. The registry is `src/lib/switches/registry.ts`. Every page, layout, action and route handler decides a switch from `requestSwitchEnv(userId)`, and every flag function and reader REQUIRES its `env`; scripts, probes and evals pass `process.env` themselves. `pnpm check:switch-reads` fails any code under `src/` that hands the `process.env` object on, outside `src/lib/switches/`, tests and its `ALLOWED` list. A cache whose payload depends on a switch carries it in its key.
