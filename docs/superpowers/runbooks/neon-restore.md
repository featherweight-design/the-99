# Runbook: restoring the production database from Neon

**Applies to:** the `production` branch of the `the-99` Neon project.
**Last drilled:** 2026-11-24 (snapshot restore, multi-step, drill branch deleted afterwards; see the drill log).
**Repeat the drill:** every 6 months. The next one is due by 2027-05-24.

This runbook has never been run for a real incident. It is written from one drill, and anything the drill did not exercise is marked as such. Branches are named, not numbered: fetch any branch ID you need with `neon branches list` and never paste an ID, endpoint or connection string into a doc, an issue or a chat.

---

## When to use this

Use a restore when the data in production is wrong or gone: a bad backfill, a delete that matched too much, a script pointed at the wrong branch. A restore moves the data back in time, so everything written after the restore point is lost unless you copy it out first.

Do not use a restore for a schema problem. If a migration shipped something broken but the rows are fine, roll the schema forward with a corrective migration instead. A restore would throw away every row written since the restore point to fix a problem that is not in the rows. If you are unsure which it is, read production first (see below) and compare it with the last known good state before you touch anything.

---

## 1. Stop writes first

Restoring while the app is still writing gives you a database that is wrong again within minutes, and any write that lands after the restore point is lost either way. Stop the writers before you start.

- **Model calls.** `MODEL_CALLS_ENABLED` is the model-call kill switch (`docs/agents/feature-flags.md`). To stop it without a deploy, set its app-wide row to Killed in the admin. To stop it with the database unreachable, set the `MODEL_CALLS_ENABLED` variable to `off` or `false` on the `the-99` Vercel project and redeploy. Confirm with `GET /api/health`: its `modelCalls` field should read `"off"`. The background jobs read that field through `scripts/lib/model-calls-gate.mjs` and skip when it is off.
- **Crons.** The only cron pause in the code is `STAGING_CRONS` (`cronPausedHere` in `src/lib/cron/staging-pause.ts`), and it applies to the staging project only: production, local and an unset label always run the crons. There is no production flag. If the crons must stop on production, disable them in the Vercel project's cron settings, and re-enable them when the restore is finished. I have not verified that step in a drill.
- **Everything else.** Tell the owner before starting. Players can still write decks, collections and preferences while the app is up, so decide whether to put the app in a maintenance state.

Agent guards block `run_sql` writes on production and require its read-only compute. Any agent helping with a restore reads production only, and never writes to it.

---

## 2. Instant restore (within the last 24 hours)

Use this when the bad write happened in the last 24 hours and you can name the time just before it. It is point-in-time restore on the root branch, which `production` is.

1. In the Neon console, open the `the-99` project, then the `production` branch, then Backup & Restore.
2. Pick the restore point (a time before the damage). Neon shows what it will do before it does it. Read that panel.
3. Neon keeps the state production had just before the restore as a new branch named `production_old_<timestamp>`. That branch is your way back and your source for anything written after the restore point, so do not delete it until the incident is closed.
4. Preview first. Before confirming, use the console's preview of the restore point, or check it on a branch, and look at the rows you care about. Do not restore a time you have not looked at.

Warning: the big Restore button at the top of Backup & Restore restores production from history and overwrites it. It is the point-in-time restore, and it is the one that hurts if you meant to inspect first.

---

## 3. Snapshot restore (older than 24 hours)

Neon takes a daily snapshot of production at 11:00 UTC and deletes it after 7 days. Past the 24-hour window, a snapshot is the only way back, so the oldest recoverable state is about a week old.

Use the multi-step restore so you can look at the data before anything changes:

1. In Backup & Restore on the `production` branch, find the snapshot you want and open its Restore menu.
2. Choose **Multi-step restore**. Neon creates a new branch named like `branch_from_snapshot_<date>` and leaves production alone. The drill's branch was ready within a few seconds of the click.
3. Inspect the new branch with read-only queries: table counts, the rows that were damaged, a few real decks and collections. Compare it with production.
4. Only when it is the state you want, switch over (see the next section for what that changes).

Warning: the other choice in the same menu, **One-step restore**, swaps the snapshot's data into production directly. Per the console it keeps the branch name and the connection string but changes the branch ID. Use it only when you have already decided, and then follow the next section.

---

## 4. If the branch ID changes

Several things in this repo and its settings key on production's branch ID, not its name. After any real restore that replaced production, run `neon branches list`, confirm the ID of `production`, and update each of these if it moved:

- **Agent guards.** The scripts that fail closed on a target compare the database's `neon.branch_id` with a named value (`PULL_TARGET_BRANCH`, `RESTAMP_TARGET_BRANCH`, `PRECON_OVERVIEW_TARGET_BRANCH`, `CATALOG_COPY_TARGET_BRANCH`, `RECONCILE_READONLY_OK`, `MEASURE_BRANCH` and the others in `docs/agents/`). `assertScratchBranch` (`scripts/lib/scratch-branch.mjs`) refuses production, staging and local-dev by `neon.branch_id`. A stale ID in any of them either refuses a correct run or, worse, stops protecting production.
- **The scratch-branch workflow.** Scratch branches are made from local-dev, not production, so they do not move. Check that the refuse list in `assertScratchBranch` still names production's current ID.
- **Vercel environment.** Re-check the production environment variables on the `the-99` project. The name and connection string should be unchanged after a one-step restore, but confirm that the app reads the restored data, not an old branch, and redeploy if a variable changed.
- **Dashboard secrets keyed on production's branch ID.** Any GitHub environment secret or dashboard setting that records the branch ID needs the new one. The owner sets rotated secrets by hand, so give them the console steps and do not script it.

Then prove it the way a deploy is proven: the domain serves the deployment you expect, and a request that reads the database works.

---

## 5. Drill log

### 2026-11-24, snapshot restore, multi-step

**Where:** Neon console, project `the-99`, branch `production`, Backup & Restore. Daily snapshots at 11:00 UTC, deleted after 7 days.

**What was done:** restored the newest snapshot, about 17 hours old, from the snapshot row's Restore menu with **Multi-step restore**. Neon created a branch named like `branch_from_snapshot_<date>` and left production alone.

**Timing:** the new branch was ready within a few seconds of the click. No stopwatch was kept for the checks that followed, so there is no figure for how long inspection takes. The next drill must time each step.

**Read-only checks, drill branch against production:**

| Check | Result |
|---|---|
| Public tables | 138 on both |
| Decks, cards, user preferences, model calls, collection items | counts matched |
| Printings | 3 rows higher on production, written after the snapshot |

The printings difference is expected: production keeps moving after the snapshot is taken.

**Cleanup:** the drill branch was deleted afterwards. Production and staging were untouched. The drill used reads only, and the agent guards stayed in force throughout.

**Not exercised:** instant (point-in-time) restore, one-step restore, switching production over to a restored branch, the branch ID change, and pausing production crons.

---

## 6. Repeat the drill every 6 months

A restore path nobody has used is a guess. Every 6 months:

1. Run the multi-step snapshot restore on the newest snapshot, as above, and compare counts with production.
2. Time each step with a stopwatch and add the figures to the drill log.
3. Delete the drill branch when done, and confirm with `neon branches list` that only the expected branches remain.
4. Update the "Last drilled" date at the top and add a dated entry to the log.
