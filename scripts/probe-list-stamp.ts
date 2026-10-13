// probe:list-stamp — the reader's data stamp against a real Postgres (Performance PR 6).
//
// Home and `/decks` cache their whole payload keyed on `user_data_stamps.stamp`, and the only
// thing that moves it is the `user_data_touch` constraint trigger. So every guarantee those two
// pages make about freshness is a fact about what a transaction did, which no unit test here can
// reach. This proves five:
//
//   1. EVERY per-user table the pages read carries the trigger, deferred to commit, with the
//      owner column that table actually has. The set is COMPUTED (`list-cache-tables.mjs`),
//      the same set `check:list-cache` reads, so a table the pages start reading is checked the
//      day they do.
//   2. An INSERT, an UPDATE and a DELETE on each of those tables moves the stamp, on this run's
//      own fixture rows: a trigger that is present and wrong fails here, not in `check`.
//   3. A rolled-back write moves nothing, and a write of many rows moves it once.
//   4. NO DEADLOCK THROUGH THE STAMP. Two transactions for one reader lock two rows in opposite
//      order; with the stamp taken at commit both finish. Then the COUNTERFACTUAL: the same
//      interleaving with the trigger forced immediate (`set constraints ... immediate`) must
//      deadlock, or the first half proves nothing about the deferral.
//   5. What it costs: a collection replace and a commit at the pulled account's real sizes,
//      median of 3. `--timing` runs that section alone, which is how the figure is taken on a
//      database the migration has not reached yet.
//
// It writes a fixture under a per-run user_id and deletes it in a `finally`, reading the pulled
// account's collection and largest deck only to size the fixture. Refused on production and
// staging; point it at `local-dev` or a scratch branch.
//
// Run: `pnpm probe:list-stamp` (or `pnpm probe:list-stamp --timing`)
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig, type PoolClient } from "@neondatabase/serverless";
import ws from "ws";
import { tablesRead } from "./lib/list-cache-tables.mjs";
import { replaceCollection } from "../src/lib/collection/import";
import { commitVersion } from "../src/lib/decks/versions";
import type { PendingItem } from "../src/lib/collection/pending";
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL, max: 4 });
const TIMING_ONLY = process.argv.includes("--timing");
const USER = `probe-list-stamp-${Date.now()}`;
const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";

let failures = 0;
const check = (label: string, ok: boolean, detail: string) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
};

const one = async <T>(text: string, params: unknown[] = []) =>
  (await pool.query(text, params)).rows[0] as T;

const stamp = async () =>
  Number((await one<{ stamp: string } | undefined>(
    "select stamp from user_data_stamps where user_id = $1", [USER],
  ))?.stamp ?? 0);

/** Runs `write`, commits, and returns how far the stamp moved. */
const moved = async (write: (c: PoolClient) => Promise<unknown>) => {
  const before = await stamp();
  const c = await pool.connect();
  try {
    await c.query("begin");
    await write(c);
    await c.query("commit");
  } catch (error) {
    await c.query("rollback").catch(() => {});
    throw error;
  } finally {
    c.release();
  }
  return (await stamp()) - before;
};

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function main() {
  const { branch } = await one<{ branch: string | null }>(
    "select current_setting('neon.branch_id', true) as branch",
  );
  if (!branch || branch === PRODUCTION || branch === STAGING) {
    throw new Error(`refusing branch ${branch ?? "(unknown)"}; point DATABASE_URL at local-dev or a scratch branch`);
  }

  // The fixture's sizes come from the account with the largest collection: on a `pull:staging`
  // copy that is the real one, so the timings are for a collection and a deck that get played.
  const source = await one<{ user_id: string; n: string }>(
    "select user_id, count(*) as n from collection_items group by user_id order by count(*) desc limit 1",
  );
  if (!source) throw new Error("no collection to size the fixture from");
  const items: PendingItem[] = (await pool.query(
    `select oracle_id, set_code, collector_number, finish, scryfall_id, condition, quantity
       from collection_items where user_id = $1`, [source.user_id],
  )).rows.map((r) => ({
    oracleId: r.oracle_id, setCode: r.set_code, collectorNumber: r.collector_number,
    finish: r.finish, scryfallId: r.scryfall_id, condition: r.condition, quantity: r.quantity,
  }));
  const template = await one<{ id: string; commander_oracle_id: string; n: string }>(
    `select d.id, d.commander_oracle_id, count(*) as n from decks d join deck_cards c on c.deck_id = d.id
      where d.user_id = $1 group by d.id order by count(*) desc limit 1`, [source.user_id],
  );
  if (!template) throw new Error("the sizing account has no deck");
  console.log(`branch ${branch} · fixture ${USER} · ${items.length} collection rows · a ${template.n}-row deck`);

  // Inside the `try`, so a failure between the two inserts still reaches the cleanup below.
  try {
    const deck = await one<{ id: string }>(
      `insert into decks (user_id, name, commander_oracle_id) values ($1, 'probe list stamp', $2) returning id`,
      [USER, template.commander_oracle_id],
    );
    const other = await one<{ id: string }>(
      `insert into decks (user_id, name, commander_oracle_id) values ($1, 'probe list stamp 2', $2) returning id`,
      [USER, template.commander_oracle_id],
    );
    await pool.query(
      `insert into deck_cards (deck_id, oracle_id, quantity)
         select $1, oracle_id, quantity from deck_cards where deck_id = $2`, [deck.id, template.id],
    );

    // ---- 5. Timing ------------------------------------------------------------------------
    const replaceMs: number[] = [];
    const commitMs: number[] = [];
    for (let i = 0; i < 3; i++) {
      let t = performance.now();
      await replaceCollection(USER, items);
      replaceMs.push(performance.now() - t);
      t = performance.now();
      await commitVersion(deck.id, null, undefined, undefined, process.env);
      commitMs.push(performance.now() - t);
    }
    console.log(`TIME  collection replace (${items.length} rows): median ${median(replaceMs).toFixed(0)}ms of ${replaceMs.map((x) => x.toFixed(0)).join(", ")}`);
    console.log(`TIME  commit (${template.n} rows): median ${median(commitMs).toFixed(0)}ms of ${commitMs.map((x) => x.toFixed(0)).join(", ")}`);
    if (TIMING_ONLY) return;

    // ---- 1. Every table the pages read carries the trigger ------------------------------------
    const { perUser } = tablesRead();
    const triggers = new Map<string, { deferrable: boolean; deferred: boolean; enabled: string; arg: string }>(
      (await pool.query(
        `select c.relname, t.tgdeferrable, t.tginitdeferred, t.tgenabled,
                substring(pg_get_triggerdef(t.oid) from 'user_data_touch\\(''([a-z_]+)''\\)') as args
           from pg_trigger t join pg_class c on c.oid = t.tgrelid
          where t.tgname = 'user_data_touch'`,
      )).rows.map((r) => [r.relname, {
        deferrable: r.tgdeferrable, deferred: r.tginitdeferred, enabled: r.tgenabled,
        arg: String(r.args),
      }]),
    );
    for (const table of perUser) {
      const t = triggers.get(table.name);
      check(
        `trigger on ${table.name}`,
        !!t && t.deferrable && t.deferred && t.enabled === "O" && t.arg === table.owner,
        t ? `deferred ${t.deferred}, enabled ${t.enabled}, keyed on ${t.arg} (the table's owner column is ${table.owner})` : "missing",
      );
    }

    // ---- 2. Insert, update and delete on each, on this run's own rows -------------------------
    const card = (await pool.query(
      `select oracle_id from deck_cards where deck_id = $1 order by oracle_id limit 1`, [deck.id],
    )).rows[0].oracle_id as string;
    const version = (await one<{ id: string }>(
      `select id from deck_versions where deck_id = $1 order by number desc limit 1`, [deck.id],
    )).id;
    // A card the committed version does not hold, so inserting it is an insert and not a clash.
    const spare = (await one<{ oracle_id: string }>(
      `select oracle_id from cards where oracle_id not in (select oracle_id from deck_version_cards where version_id = $1)
        order by oracle_id limit 1`, [version],
    )).oracle_id;
    // One writer per table: an insert of a fixture row, and the column an update can touch
    // without changing what the row means. The update is a no-op on purpose: a row trigger
    // fires on it all the same, and nothing here should depend on what the value was.
    const rows: Record<string, { insert: string; key: string; touch: string }> = {
      decks: { insert: `insert into decks (user_id, name, commander_oracle_id) values ($U, 'probe list stamp 3', '${template.commander_oracle_id}')`, key: `user_id = $U and name = 'probe list stamp 3'`, touch: "name = name" },
      deck_cards: { insert: `insert into deck_cards (deck_id, oracle_id) values ('${other.id}', '${card}')`, key: `deck_id = '${other.id}'`, touch: "quantity = quantity" },
      deck_folders: { insert: `insert into deck_folders (user_id, name) values ($U, 'probe')`, key: "user_id = $U", touch: "name = name" },
      deck_games: { insert: `insert into deck_games (deck_id, user_id, result, pod_size) values ('${other.id}', $U, 'win', 4)`, key: "user_id = $U", touch: "result = result" },
      deck_unresolved_rows: { insert: `insert into deck_unresolved_rows (deck_id, raw_name, source_line) values ('${other.id}', 'Probe Card', 1)`, key: `deck_id = '${other.id}'`, touch: "raw_name = raw_name" },
      deck_versions: { insert: `insert into deck_versions (deck_id, number, commander_oracle_id) values ('${other.id}', 1, '${template.commander_oracle_id}')`, key: `deck_id = '${other.id}'`, touch: "note = note" },
      deck_version_cards: { insert: `insert into deck_version_cards (version_id, oracle_id, quantity) values ('${version}', '${spare}', 1)`, key: `version_id = '${version}' and oracle_id = '${spare}'`, touch: "quantity = quantity" },
      deck_profiles: { insert: `insert into deck_profiles (deck_id, user_id, fingerprint, catalog, profile, permits) values ('${other.id}', $U, 'probe', 'probe', '{}'::jsonb, '{3}')`, key: "user_id = $U", touch: "fingerprint = fingerprint" },
      deck_proxies: { insert: `insert into deck_proxies (deck_id, oracle_id) values ('${deck.id}', '${card}')`, key: `deck_id = '${deck.id}'`, touch: "oracle_id = oracle_id" },
      deck_locks: { insert: `insert into deck_locks (deck_id, oracle_id) values ('${deck.id}', '${card}')`, key: `deck_id = '${deck.id}'`, touch: "oracle_id = oracle_id" },
      pull_releases: { insert: `insert into pull_releases (user_id, source_deck_id, oracle_id, asking_deck_id) values ($U, '${deck.id}', '${card}', '${other.id}')`, key: "user_id = $U", touch: "copies = copies" },
      card_assignments: { insert: `insert into card_assignments (user_id, oracle_id, deck_id) values ($U, '${card}', '${deck.id}')`, key: "user_id = $U", touch: "copies = copies" },
      collection_items: { insert: `insert into collection_items (user_id, oracle_id, quantity, set_code, collector_number) values ($U, '${card}', 1, 'probe', 'probe')`, key: "user_id = $U and set_code = 'probe'", touch: "quantity = quantity" },
      card_art_preferences: { insert: `insert into card_art_preferences (user_id, oracle_id, set_code) values ($U, '${card}', 'probe')`, key: "user_id = $U", touch: "set_code = set_code" },
      csv_uploads: { insert: `insert into csv_uploads (user_id, filename, row_count, unmatched_count, preview_payload) values ($U, 'probe.csv', 0, 0, '{}'::jsonb)`, key: "user_id = $U", touch: "filename = filename" },
      commander_scores: { insert: `insert into commander_scores (user_id, oracle_id, slug, score, fit_pool, fit_roles, synergy_state, receipts, color_pool_size, role_counts) values ($U, '${card}', 'probe', 0, 0, 0, 'absent', '', 0, '{}'::jsonb)`, key: "user_id = $U", touch: "slug = slug" },
    };
    for (const table of perUser) {
      const w = rows[table.name];
      if (!w) { check(`writes on ${table.name}`, false, "no fixture writer for a table the pages read; add one"); continue; }
      // The reader's id is a bind parameter where a statement names it, and absent where it does
      // not: a deck-keyed row is found by its deck, and a parameter no placeholder takes is refused.
      const run = (c: PoolClient, text: string) =>
        text.includes("$U") ? c.query(text.replaceAll("$U", "$1"), [USER]) : c.query(text);
      const events: [string, (c: PoolClient) => Promise<unknown>][] = [
        ["insert", (c) => run(c, w.insert)],
        ["update", (c) => run(c, `update ${table.name} set ${w.touch} where ${w.key}`)],
        ["delete", (c) => run(c, `delete from ${table.name} where ${w.key}`)],
      ];
      for (const [event, write] of events) {
        let step: number | string;
        try {
          step = await moved(write);
        } catch (error) {
          step = error instanceof Error ? error.message : String(error);
        }
        check(`${event} on ${table.name}`, step === 1, `stamp moved ${step}`);
      }
    }

    // ---- 3. A rollback moves nothing; many rows move it once ---------------------------------
    const before = await stamp();
    const c = await pool.connect();
    try {
      await c.query("begin");
      await c.query("update decks set name = name where user_id = $1", [USER]);
      await c.query("rollback");
    } finally {
      c.release();
    }
    check("a rolled-back write", (await stamp()) === before, `stamp moved ${(await stamp()) - before}`);
    const bulk = await moved((c) => c.query("update collection_items set quantity = quantity where user_id = $1", [USER]));
    check(`an update of all ${items.length} collection rows`, bulk === 1, `stamp moved ${bulk}`);

    // ---- 4. No deadlock through the stamp, and the counterfactual that it would ---------------
    const interleave = async (immediate: boolean) => {
      const a = await pool.connect();
      const b = await pool.connect();
      try {
        for (const x of [a, b]) {
          await x.query("begin");
          await x.query("set local lock_timeout = '10s'");
          if (immediate) await x.query("set constraints user_data_touch immediate");
        }
        // A locks the first deck. B locks the second, then (per statement) wants the stamp A
        // already holds. A then wants B's deck: with the stamp taken per statement that is a
        // cycle through the stamp and nothing else. Taken at commit, B holds no stamp, commits,
        // and A goes on.
        await a.query("update decks set name = name where id = $1", [deck.id]);
        const bStatement = b.query("update decks set name = name where id = $1", [other.id]);
        await new Promise((r) => setTimeout(r, 300));
        const aStatement = a.query("update decks set name = name where id = $1", [other.id]);
        const results = await Promise.allSettled([
          aStatement.then(() => a.query("commit")),
          bStatement.then(() => new Promise((r) => setTimeout(r, 300))).then(() => b.query("commit")),
        ]);
        const errors = results.filter((r) => r.status === "rejected")
          .map((r) => String((r as PromiseRejectedResult).reason?.message ?? r));
        for (const x of [a, b]) await x.query("rollback").catch(() => {});
        return errors;
      } finally {
        a.release();
        b.release();
      }
    };
    const deferred = await interleave(false);
    check("two transactions for one reader, rows locked in opposite order, stamp at commit",
      deferred.length === 0, deferred.length ? deferred.join("; ") : "both committed");
    const immediate = await interleave(true);
    check("the same interleaving with the stamp taken per statement (counterfactual)",
      immediate.some((e) => /deadlock/i.test(e)), immediate.length ? immediate.join("; ") : "both committed, so the first check proved nothing");
  } finally {
    // Decks cascade to every deck-keyed row; the rest are keyed on the fixture user.
    for (const table of ["decks", "deck_folders", "pull_releases", "card_assignments", "collection_items",
      "card_art_preferences", "csv_uploads", "commander_scores", "deck_profiles", "deck_games", "user_data_stamps"]) {
      await pool.query(`delete from ${table} where user_id = $1`, [USER]).catch((error) => {
        console.warn(`cleanup of ${table} failed: ${error instanceof Error ? error.message : error}`);
      });
    }
  }
}

main()
  .then(() => {
    console.log(failures ? `\n${failures} check(s) failed.` : TIMING_ONLY ? "\nTimings taken." : "\nAll checks passed.");
    process.exitCode = failures ? 1 : 0;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
