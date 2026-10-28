# List cache (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

- **Home and `/decks` cache their whole payload per reader, keyed on a stamp the DATABASE
  moves** (Performance PR 6). `user_data_stamps` holds one counter per reader, and every
  per-user table those two pages read carries the `user_data_touch` constraint trigger, which
  bumps it at COMMIT. `cachePageForUser` (`src/lib/cache/page-cache.ts`) reads the stamp fresh
  on every request and puts it in the key, beside the catalog generation, the deployment, the
  switches and, for Home, the UTC date the Ready-to-build pair rotates on. So a write
  invalidates the pages by construction, whoever wrote it: an action, an `after()`, the render
  path's own score write, a job or a script. Nothing has to remember to call anything, which
  is the point: the tag approach had eleven actions writing those tables without clearing it.

  **Deferred to commit, because an immediate stamp can deadlock.** A per-statement trigger
  takes the reader's stamp row at the first statement and holds it, so two transactions for
  one reader that also lock two rows in opposite order form a cycle through the stamp. At
  commit it is the last lock a transaction takes, and nothing in this schema is deferrable, so
  a transaction waiting on a stamp waits on one that is already committing.
  `probe:list-stamp` shows both halves: the interleaving commits with the shipped trigger and
  deadlocks with `set constraints ... immediate`.

  A degraded ranking is served and never stored (`store: false`), because it recomputes on
  every visit by design. A stamp that cannot be read (a preview deploy runs no migrations)
  renders uncached rather than wrong.

  **It ships behind `LIST_CACHE_ENABLED`** (Hugh, 2026-09-27): `'true'` on staging, unset on
  production until he has watched it. Off means OFF: `cachePageForUser` reads no stamp, stores
  nothing and runs the page exactly as before the cache existed. The triggers run either way.

  **The runbook, and its ORDER is the point:**

  - **A cached page looks stale:** turn `LIST_CACHE_ENABLED` off (a redeploy), or Vercel
    Instant Rollback to the deployment before the cache. Nothing in the database changes.
  - **Writes are failing on a `user_data_touch` trigger:** FIRST turn the cache off or roll back,
    THEN run `pnpm list-stamp:triggers disable` against that database. Never the other way
    round: disabling the triggers while cached code is live freezes every reader's stamp, and
    every cached page is served stale after the writes that should have retired it.
  - **Never drop `user_data_stamps` while the triggers exist.** Every write to a table carrying a `user_data_touch` trigger (`pnpm list-stamp:triggers` reads the live set)
    would then fail on the missing table.
  - **Permanent removal is a follow-up migration**: drop every `user_data_touch` trigger (read the live set, never a count), then the function,
    then the table. `list-stamp:triggers` is the emergency lever, not the way out.
  - **Coming back:** `list-stamp:triggers enable`, then a deploy with the switch on. A stamp that
    sat still while writes landed says nothing about them, and a new deployment starts every
    reader on a fresh miss (the deployment is in the key).

## From AGENTS.md (moved 2026-10-28)

The rule-form bullets `AGENTS.md` carried for this area until 2026-10-28, verbatim. Where they and the text above differ in wording, both are current.

- **Home and `/decks` cache their whole payload per reader**, keyed on `user_data_stamps`, which every per-user table they read bumps at COMMIT through a deferred `user_data_touch` constraint trigger (`cachePageForUser`, `src/lib/cache/page-cache.ts`; behind `LIST_CACHE_ENABLED`, staging on, production unset). A degraded ranking is served and never stored. **Runbook, and its ORDER is the point:** a cached page looks stale: turn `LIST_CACHE_ENABLED` off (a redeploy) or Vercel Instant Rollback. Writes failing on a `user_data_touch` trigger: FIRST turn the cache off or roll back, THEN run `pnpm list-stamp:triggers disable`; never the other way round, or every cached page is served stale. Never drop `user_data_stamps` while the triggers exist. Permanent removal is a follow-up migration: drop every trigger (read the live set), then the function, then the table. Coming back: `list-stamp:triggers enable`, then a deploy with the switch on.
- `pnpm list-stamp:triggers disable|enable` takes every `user_data_touch` trigger out of the
  write path, or puts it back, in ONE transaction. It takes every table lock up front in
  one `lock table` statement under a 5s `statement_timeout`, so the app's writes wait at most ~5s
  once, and a busy database rolls the whole run back. A per-table `lock_timeout` would not do
  that: each table could wait its own 5s while the tables already locked stayed blocked. It reads the triggers the database actually
  has, not a list, and reads them back afterwards. The target is NAMED, the `pull:staging` rule:
  `STAMP_TARGET_URL` and `STAMP_TARGET_BRANCH`, and a branch that does not match what the
  database reports stops the run before anything is altered. Rehearsed on a branch of staging
  migrated to 0073: a wrong branch refused, `disable` took all sixteen and `probe:list-stamp`
  then failed 66 checks, `enable` put them back and it passed. The runbook above says WHEN.
