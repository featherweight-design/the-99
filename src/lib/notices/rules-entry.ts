/**
 * The deploy's bracket-rules entry (deck notices plan D8): when this build's
 * `BRACKET_RULES_VERSION` is above the highest version the log holds, write one `rules` entry
 * saying what moved, in words. Called by `scripts/vercel-migrate.ts` after the migrations have
 * applied, and NEVER the reason a build fails: that script once stopped every production deploy for
 * five hours, so everything here is bounded by a statement timeout and an overall deadline, every
 * failure is one warn line, and the build's exit code does not depend on it.
 */
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

import { BRACKET_RULES_VERSION, RULES_CHANGES } from "../bracket/rules-version";
import { CATALOG_INGEST_LOCK } from "../catalog/ingest-lock";

/** The two statements the entry needs, injectable so the non-fatal contract is unit-testable. */
export type RulesEntryDb = {
  highestLogged: () => Promise<number>;
  insert: (version: number, detail: Record<string, unknown>) => Promise<void>;
  close: () => Promise<void>;
};

export type RulesEntryOutcome = "unchanged" | "written" | "failed";

const DEADLINE_MS = 10_000;

/** A client with a 5s statement timeout on the migration database. */
export function neonRulesEntryDb(databaseUrl: string): RulesEntryDb {
  // As `src/db/index.ts` does: `vercel-migrate.ts` imports this module and never `src/db`, so without
  // it the pool has no WebSocket on a Node runtime that lacks a global one, and every deploy's entry
  // would fail into the warn line unseen.
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5_000 });
  const query = async (text: string, params: unknown[] = []) => {
    const client = await pool.connect();
    try {
      await client.query("set statement_timeout = '5s'");
      return await client.query(text, params);
    } finally {
      client.release();
    }
  };
  return {
    highestLogged: async () => {
      const r = await query(
        "select coalesce(max((detail->>'rulesVersion')::int), 1) as v from deck_data_changes where kind = 'rules'",
      );
      return Number(r.rows[0]?.v ?? 1);
    },
    insert: async (version, detail) => {
      // Under the `catalog-ingest` lock, taken by the same statement before the entry's `seq` is allocated: every other
      // writer of the log holds it for its whole run, and a precon Overview's check mark (`checked_seen_seq`) is the log
      // head read under it, which is only a watermark if no entry can be uncommitted beside a higher one. The statement
      // timeout bounds the wait: an ingest running through a deploy skips the entry, and the next deploy writes it
      // (`highestLogged`).
      await query(
        `insert into deck_data_changes (kind, direction, oracle_ids, detail)
         select 'rules', 'moved', '{}', $1::jsonb from (select pg_advisory_xact_lock(hashtextextended($2, 0))) held
         on conflict do nothing`,
        [JSON.stringify({ ...detail, rulesVersion: String(version) }), CATALOG_INGEST_LOCK],
      );
    },
    close: () => pool.end(),
  };
}

/**
 * Writes the entry when one is owed. Resolves, never rejects. Version 1 is the rules as they stood
 * when the log was created, so it writes nothing and opens no connection.
 */
export async function recordRulesVersion(
  open: () => RulesEntryDb,
  version: number = BRACKET_RULES_VERSION,
  deadlineMs: number = DEADLINE_MS,
  changes: Readonly<Record<number, { rule: string; reads: string }>> = RULES_CHANGES,
): Promise<RulesEntryOutcome> {
  if (version <= 1) return "unchanged";
  let db: RulesEntryDb | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const work = (async (): Promise<RulesEntryOutcome> => {
      db = open();
      if ((await db.highestLogged()) >= version) return "unchanged";
      // A version with no words is REFUSED rather than logged: logged, it would count as written and
      // no later deploy would retry it, while every reader got a notice with nothing to say. The
      // refusal is the warn line below, and `rules-version.test.ts` fails CI before it can ship.
      const change = changes[version];
      if (!change) throw new Error(`no RULES_CHANGES row for version ${version}`);
      await db.insert(version, { rule: change.rule, reads: change.reads });
      return "written";
    })();
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`no answer in ${deadlineMs}ms`)), deadlineMs);
    });
    return await Promise.race([work, deadline]);
  } catch (error) {
    console.warn(
      `deck notices: bracket rules entry for version ${version} not written; the build continues: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return "failed";
  } finally {
    if (timer) clearTimeout(timer);
    // NOT awaited: `pool.end()` settles only once every checked-out client is released, so a query
    // stalled mid-flight would hold it past the deadline and hang the build it exists to protect.
    // The caller exits the process as soon as this resolves, which ends the pool either way.
    void (db as RulesEntryDb | null)?.close().catch(() => undefined);
  }
}

/**
 * The migration script's last step: the exit code is the migration's, always. The entry runs only
 * after a migration that SUCCEEDED, and anything it does, a throw included, is swallowed here, so
 * `vercel-build`'s `&& next build` runs exactly when it did before.
 */
export async function finishMigration(
  status: number | null,
  record: () => Promise<unknown>,
): Promise<number> {
  if (status !== 0) return status ?? 1;
  try {
    await record();
  } catch (error) {
    console.warn(`deck notices: bracket rules entry step threw; the build continues: ${String(error)}`);
  }
  return 0;
}
