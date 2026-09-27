// list-stamp-triggers — disable or re-enable every `user_data_touch` trigger, in one transaction.
//
// THE KILL SWITCH FOR FAILING WRITES, and only for that. The triggers move the reader's data stamp
// that Home and `/decks` cache on (Performance PR 6). If one of them ever makes writes fail, this
// takes all of them out of the write path at once without a deploy.
//
// ORDER MATTERS, and the script cannot check it for you:
//   1. FIRST turn the cache off: LIST_CACHE_ENABLED unset (a redeploy) or Vercel Instant Rollback.
//   2. THEN run this with `disable`.
// Disabling the triggers while cached code is live leaves the stamp frozen, so every cached page
// goes on being served after the writes that should have retired it: stale pages for every reader
// until the hour ceiling. And never drop `user_data_stamps` while the triggers exist: every write
// to the sixteen tables would then fail on the missing table. Permanent removal is a migration.
//
//   STAMP_TARGET_URL=<database> STAMP_TARGET_BRANCH=br-… pnpm list-stamp:triggers disable
//   STAMP_TARGET_URL=<database> STAMP_TARGET_BRANCH=br-… pnpm list-stamp:triggers enable
//
// The target must be NAMED: the branch the caller expects is checked against the one the database
// reports before anything is altered, so a pasted URL for some other database stops the run. The
// same rule as `pull:staging`. `enable` puts the stamp back in the write path, but a stamp that sat
// still while writes landed says nothing about them: turn the cache back on only after `enable`,
// and after a deploy (a new deployment starts every reader on a fresh miss).
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const mode = process.argv[2];
if (mode !== "disable" && mode !== "enable") {
  console.error("Usage: pnpm list-stamp:triggers disable|enable  (STAMP_TARGET_URL and STAMP_TARGET_BRANCH set)");
  process.exit(2);
}
const { STAMP_TARGET_URL, STAMP_TARGET_BRANCH } = requireEnv(["STAMP_TARGET_URL", "STAMP_TARGET_BRANCH"]);
const pool = new Pool({ connectionString: STAMP_TARGET_URL, max: 1 });

async function main() {
  const client = await pool.connect();
  try {
    const { rows: [{ branch }] } = await client.query("select current_setting('neon.branch_id', true) as branch");
    if (branch !== STAMP_TARGET_BRANCH) {
      throw new Error(`STAMP_TARGET_BRANCH is ${STAMP_TARGET_BRANCH}, but the target reports ${branch ?? "(no branch)"}. Nothing was changed.`);
    }
    // The triggers the database actually has, not a list written here: a table that gained or lost
    // one in a later migration is covered by whatever that migration left.
    const { rows } = await client.query<{ table: string; enabled: string }>(
      `select c.relname as table, t.tgenabled as enabled
         from pg_trigger t join pg_class c on c.oid = t.tgrelid
        where t.tgname = 'user_data_touch' order by c.relname`,
    );
    if (rows.length === 0) throw new Error("No user_data_touch triggers on this database. Nothing was changed.");
    await client.query("begin");
    // Each ALTER needs a SHARE ROW EXCLUSIVE lock, which writes to that table queue behind while it
    // waits and while it is held, and every lock is held to the commit. So all sixteen are taken
    // UP FRONT in one statement under ONE budget: `statement_timeout` caps the whole acquisition
    // (a `lock_timeout` would cap each table separately, up to sixteen times over). A busy
    // database fails the run and rolls back every table; the app's writes wait at most ~5s, once.
    // With the locks held, the ALTERs below wait on nothing.
    await client.query("set local statement_timeout = '5s'");
    await client.query(`lock table ${rows.map((r) => `"${r.table}"`).join(", ")} in share row exclusive mode`);
    await client.query("set local statement_timeout = 0");
    for (const { table } of rows) {
      await client.query(`alter table "${table}" ${mode} trigger user_data_touch`);
    }
    await client.query("commit");
    const { rows: after } = await client.query<{ n: string }>(
      `select count(*) as n from pg_trigger where tgname = 'user_data_touch' and tgenabled ${mode === "disable" ? "= 'D'" : "<> 'D'"}`,
    );
    console.log(`${mode}d user_data_touch on ${rows.length} tables of ${branch}: ${rows.map((r) => r.table).join(", ")}.`);
    if (Number(after[0].n) !== rows.length) {
      throw new Error(`Only ${after[0].n} of ${rows.length} triggers read back as ${mode}d.`);
    }
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
