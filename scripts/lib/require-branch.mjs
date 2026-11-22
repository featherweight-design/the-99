// A script that WRITES (or spends against rows it will write) names its database branch on the command line and
// refuses to run when the database it actually reached is another one. `DATABASE_URL` alone never decides the target:
// `requireEnv` loads the worktree's `.env` over an exported value, and on 2026-11-21 a judged-labels pass meant for a
// scratch branch wrote 371 rows to local-dev that way.
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

/** The `--branch=br-...` value from `argv`, or null. */
export function branchFlag(argv = process.argv) {
  return argv.find((a) => a.startsWith("--branch="))?.slice("--branch=".length) || null;
}

/**
 * Throws unless `--branch=` is given and `connectionString` reaches exactly that branch (the database's own
 * `neon.branch_id`). Call it before any write or paid call; returns the branch id.
 */
export async function requireBranch(connectionString, what, argv = process.argv) {
  const wanted = branchFlag(argv);
  if (!wanted) throw new Error(`${what} needs --branch=<br-id>: it names the database it may write, and DATABASE_URL alone never decides that.`);
  if (!connectionString) throw new Error(`${what}: no database URL to check against --branch=${wanted}.`);
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString, max: 1 });
  try {
    const { rows } = await pool.query("select current_setting('neon.branch_id', true) as branch");
    const reached = rows[0]?.branch ?? null;
    if (reached !== wanted) throw new Error(`${what} refuses: --branch=${wanted} but the database reached is ${reached ?? "unknown"}. Fix DATABASE_URL (a worktree .env overrides an exported one).`);
    return reached;
  } finally {
    await pool.end();
  }
}
