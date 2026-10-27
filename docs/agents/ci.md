# Ci (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

- **CI test selection** (`scripts/ci-select.mjs`, rules in `scripts/lib/ci-select.mjs`). A PR's tests are `vitest related` UNION the
  *always set*, which is COMPUTED: every test file whose source mentions `node:fs`, `child_process`,
  `process.cwd()`, `import.meta.url` or the like. The graph alone skipped 10 to 28 tree-reading guards
  in 23 of the last 25 merged PRs, because those guards read files instead of importing them. The FULL
  suite runs when the lockfile, a vitest/tsconfig/eslint/next config, `.nvmrc`, `vitest.setup.ts`,
  `ci.yml`, the selector or package.json dependency fields (or its `test` script) change, when vitest
  cannot read the import graph (a syntax error), under the `ci:full` PR label, and ALWAYS on a push to
  main, which is the net under a selection miss. A test that reads the tree through a helper module,
  never naming `fs` or a path API itself, is invisible to the always set: have the test file mention it.
  The `select` job feeds `test`, which shards the selected files (`vitest run <files> --shard i/N`, N
  from `SHARD_SIZE` 170 per shard, at most 6), and `checks` is red unless `select` succeeded.
  `CI selector calibration` (dispatch-only) breaks one file at a time (`scripts/ci-calibration-cases.json`),
  runs the whole suite, and fails a leg when a test went red that the selector did not choose; run it after
  changing the rules. First run, 2026-10-13: 22 legs; 15 clean, 4 hit the unreadable-graph fallback, and 3 reported one missed tuning test each that did not recur when those three legs were re-run (0 missed).

- `pnpm check:scryfall` validates Scryfall's bulk-data contract (index shape + first entry's required fields) without touching a database. The `Upstream contract checks` workflow runs it daily at 07:00, two hours ahead of the daily catalog refresh, so an upstream shape change is known before the ingest that would fail on it.

- `pnpm check:spellbook` validates Spellbook's contract without a database — the index shape,
  a real parse, and the `card_count` versus deduped-`uses` relationship. It runs daily in
  `Upstream contract checks` for the same reason the Scryfall and ManaPool checks do: the
  ingest is weekly, so a silent shape change would sit unnoticed for days.

  One tension is deliberate and worth knowing: it asserts against the LIVE feed rather than a
  fixture, so it can fail for an upstream change that is correct and expected. That is the
  point — a fixture-only check passes forever over a feed that has moved.

- `pnpm.overrides` in `package.json` pins seven transitive packages to their patched versions.
  They are overrides rather than dependency bumps because not one of the seven is declared here.
  Two rules learned from the round that added them: an override can force a version the PARENT
  never tested against, so it has to be exercised, not assumed — forcing `brace-expansion@5`
  broke ESLint outright (`minimatch@3.1.5` calls `expand` as a function and 5.x changed its
  export shape), and the `esbuild` pin rewires `drizzle-kit` from 0.18.20 across several
  breaking 0.x boundaries on a path CI never runs, so `pnpm db:generate` and `drizzle-kit check`
  are the proof for that one and both pass.

## The Node version

- **`.nvmrc` is the one pin: an exact, patched release** (`24.22.1`, 2026-10-27). Every workflow job that runs
  node sets it up with `actions/setup-node` and `node-version-file: .nvmrc`; no workflow names a version of its
  own. `scripts/lib/node-version-pin.test.mts` (in `pnpm test`) fails on a bare major, a release below the
  patched floor, a `node-version:` key, a `setup-node` step that does not read `.nvmrc`, or a job that runs node,
  pnpm or npx without setting it up (the runner's own node is whatever its image carries).
- **Why exact, not `24`.** A bare major lets setup-node take whatever the runner has CACHED: on 2026-10-27 CI ran
  24.21.0 ("Found in cache … node/24.21.0") a week after 24.22.1 shipped the October security release (TLS
  hostname-check bypasses, a Brotli decompression RCE, the compromised eMudhra intermediates dropped). An exact
  version the cache does not hold is downloaded. The cost is that the next patch is a deliberate bump: change
  `.nvmrc` and raise `PATCHED_FLOOR` in the test when a security release lands.
- **Vercel runs a MAJOR, not a patch.** `engines.node` is `24.x` (the same major as `.nvmrc`, which the test pins).
  Vercel accepts only majors and rolls patches out itself, so no setting can demand 24.22.1 there; a `>=` range
  only adds a warning that the build will jump majors on its own, and a floor above what Vercel has rolled out
  would refuse the build. Read what a deployment actually runs from its logs: `src/instrumentation.ts` logs
  `[runtime] node vX.Y.Z` once per server start, never in a response
  (`vercel logs -p the-99 --since 1h -q "[runtime]"`, `-p the-99-staging` for staging, or the dashboard's Logs with that text). Below the patched
  floor, redeploy; Vercel's own rollout is the fix.
