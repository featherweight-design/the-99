# Switches (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

- **Feature switches resolve per reader** (admin plan PR 4, brief `2026-10-11-admin-ui.md`). Each `*_ENABLED`
  variable keeps its meaning and is the default; `flag_overrides` holds overrides on top of it, app-wide, per group
  (`flag_groups`, one group per account in `flag_group_members`) or per account. Per switch: the variable set to the
  literal `off` wins outright (the KILL SWITCH: no override can raise it, so a bad override is always beaten by a
  redeploy), then the account's override, then its group's (OFF wins if two apply), then app-wide, then the variable.
  A `plumbing` switch (`LIST_CACHE_ENABLED`, `RATE_LIMIT_ENABLED`, `LABEL_ROLE_COUNTS_ENABLED`, the role basis
  scores are counted by; `ABOUT_SHEET_ENABLED` was one until About visual PR 6b retired it with the sheet)
  takes the app-wide override alone. A compound switch names its parent as `needs`
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
  `envForPageBasis` (the environment's kill switch) and the model stand-ins' settings readers (`intake/stub.ts`,
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
